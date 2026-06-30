import { CommonModule } from '@angular/common';
import { Component, EventEmitter, OnInit, Output, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CategoryService } from '../../../../services/category.service';
import { MaquetaService } from '../../../../services/maqueta.service';
import { MaterialService } from '../../../../services/material.service';
import { AuthService } from '../../../../services/auth.service';
import { PurchaseRequestService } from '../../../../services/purchase-request.service';
import { CategoryResponse } from '../../../../models/category.model';
import { Product } from '../../../../models/product.model';
import { Material } from '../../../../models/material.model';
import { ModelItem } from '../../../data/model';

export interface CartKit {
  product: Product;
  quantity: number;
  isCustom?: boolean;
  customMaterials?: { material: Material; quantity: number }[];
}

export interface CartMaterial {
  material: Material;
  quantity: number;
}

export interface MaterialCategoryGroup {
  categoryName: string;
  materials: Material[];
  expanded: boolean;
}

@Component({
  selector: 'app-categories',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './categories.component.html',
  styleUrl: './categories.component.css'
})
export class CategoriesComponent implements OnInit {
  private readonly categoryService = inject(CategoryService);
  private readonly maquetaService = inject(MaquetaService);
  private readonly materialService = inject(MaterialService);
  private readonly authService = inject(AuthService);
  private readonly purchaseRequestService = inject(PurchaseRequestService);

  @Output() categorySelected = new EventEmitter<string>();
  @Output() modelSelected = new EventEmitter<ModelItem>();
  @Output() loginRequested = new EventEmitter<void>();
  @Output() requestSubmitted = new EventEmitter<void>();

  validationAttempted = false;
  showSuccessNotification = false;

  categories: CategoryResponse[] = [];
  allProducts: Product[] = [];
  isLoading = false;

  allMaterials: Material[] = [];
  groupedMaterials: MaterialCategoryGroup[] = [];

  // Cart State
  cartKits: CartKit[] = [];
  cartMaterials: CartMaterial[] = [];
  isServiceRequested = false;

  cartForm = {
    nombre: '',
    correo: '',
    telefono: '',
    mensaje: '',
    tipoExplicacion: 'video',
    modeloExplicacion: '',
    cantidadPersonas: 2
  };

  productQuantities: Record<string, number> = {};
  materialQuantities: Record<string, number> = {};

  // Selected filters
  selectedCategory = ''; // 'ciencia', 'arquitectura', 'educativo', 'inclusivo'
  selectedOccasion = 'Todas las ocasiones';
  selectedGrade = 'Todos los grados';
  selectKitOnly = false;

  // Filter track
  hasSearched = false;

  // Predefined options
  ocasiones: string[] = [
    'Todas las ocasiones',
    'Feria Escolar',
    'Exposición',
    'Concurso',
    'Proyecto de Clase',
    'Evento Cultural',
    'Día Científico',
    'Presentación Final'
  ];

  grados: string[] = [
    'Todos los grados',
    'Inicial / Kinder',
    'Primaria',
    'Secundaria',
    'Bachillerato',
    'Universidad',
    'Posgrado'
  ];

  explanationModels = ['Individual', 'Grupal', 'Salon'];

  // Modal State
  selectedModalProduct: Product | null = null;
  modalMaterialQuantities: Record<string, number> = {};
  modalMaterialsList: Material[] = [];

  // Dynamic counts of products per category
  counts = {
    ciencia: 6,
    arquitectura: 2,
    educativo: 2,
    inclusivo: 2
  };

  // Map category IDs to custom style metadata
  categoryMeta: Record<string, { icon: string; bgClass: string; textClass: string; borderClass: string }> = {
    'ciencia': {
      icon: 'science',
      bgClass: 'bg-ciencia',
      textClass: 'text-ciencia',
      borderClass: 'border-ciencia'
    },
    'arquitectura': {
      icon: 'architecture',
      bgClass: 'bg-arquitectura',
      textClass: 'text-arquitectura',
      borderClass: 'border-arquitectura'
    },
    'educativo': {
      icon: 'school',
      bgClass: 'bg-educativo',
      textClass: 'text-educativo',
      borderClass: 'border-educativo'
    },
    'inclusivo': {
      icon: 'favorite',
      bgClass: 'bg-inclusivo',
      textClass: 'text-inclusivo',
      borderClass: 'border-inclusivo'
    }
  };

  // Auth warning state
  showAuthError = false;

  ngOnInit(): void {
    this.isLoading = true;

    // Load categories first
    this.categoryService.getCategories().subscribe({
      next: (cats) => {
        if (cats && cats.length > 0) {
          this.categories = cats;
        } else {
          // Fallback if API returns empty
          this.categories = [
            { id: 'ciencia', nombre: 'Ciencia', descripcion: '', orden: 1 },
            { id: 'arquitectura', nombre: 'Arquitectura', descripcion: '', orden: 2 },
            { id: 'educativo', nombre: 'Educativo', descripcion: '', orden: 3 },
            { id: 'inclusivo', nombre: 'Inclusivo', descripcion: '', orden: 4 }
          ];
        }
      },
      error: (err) => {
        console.error('Error loading categories', err);
        // Fallback if API fails
        this.categories = [
          { id: 'ciencia', nombre: 'Ciencia', descripcion: '', orden: 1 },
          { id: 'arquitectura', nombre: 'Arquitectura', descripcion: '', orden: 2 },
          { id: 'educativo', nombre: 'Educativo', descripcion: '', orden: 3 },
          { id: 'inclusivo', nombre: 'Inclusivo', descripcion: '', orden: 4 }
        ];
      }
    });

    // Load Materials
    this.materialService.getAllMaterials().subscribe({
      next: (mats) => {
        this.allMaterials = mats;
        this.groupMaterials();
      },
      error: (err) => console.error('Error loading materials', err)
    });

    // Load all products to compute counts and perform client-side filtering
    this.maquetaService.getProducts('', '', 0, 100).subscribe({
      next: (pageRes) => {
        this.allProducts = pageRes.content || [];
        this.calculateCounts();
        this.extractUniqueFilters();
        this.isLoading = false;
      },
      error: (err) => {
        console.error('Error loading products for categories component', err);
        this.isLoading = false;
      }
    });

    // Pre-populate form if user logged in
    this.authService.currentUser$.subscribe(user => {
      if (user) {
        this.cartForm.nombre = user.nombre || '';
        this.cartForm.correo = user.email || '';
        this.showAuthError = false;
      }
    });
  }

  groupMaterials(): void {
    const groups: Record<string, Material[]> = {};
    this.allMaterials.forEach(material => {
      const catName = material.categoriaNombre || 'Sin Categoría';
      if (!groups[catName]) {
        groups[catName] = [];
      }
      groups[catName].push(material);
    });

    this.groupedMaterials = Object.keys(groups).map((key, index) => ({
      categoryName: key,
      materials: groups[key],
      expanded: index === 0 // expand the first group by default
    }));
  }

  calculateCounts(): void {
    const tempCounts = { ciencia: 0, arquitectura: 0, educativo: 0, inclusivo: 0 };
    this.allProducts.forEach(prod => {
      const rawCat = (prod.categoriaId || prod.categoriaNombre || '').toLowerCase();
      if (rawCat.includes('cien')) {
        tempCounts.ciencia++;
      } else if (rawCat.includes('arq')) {
        tempCounts.arquitectura++;
      } else if (rawCat.includes('incl')) {
        tempCounts.inclusivo++;
      } else {
        tempCounts.educativo++;
      }
    });

    // Merge computed counts with defaults if no products exist yet (fallback)
    this.counts = {
      ciencia: tempCounts.ciencia || 6,
      arquitectura: tempCounts.arquitectura || 2,
      educativo: tempCounts.educativo || 2,
      inclusivo: tempCounts.inclusivo || 2
    };
  }

  extractUniqueFilters(): void {
    const gradesSet = new Set<string>();
    const occasionsSet = new Set<string>();

    this.allProducts.forEach(prod => {
      if (prod.gradoEscolar && prod.gradoEscolar.trim()) {
        gradesSet.add(prod.gradoEscolar.trim());
      }
      if (prod.ocasion && prod.ocasion.length > 0) {
        prod.ocasion.forEach(oc => {
          if (oc && oc.trim()) {
            occasionsSet.add(oc.trim());
          }
        });
      }
    });

    if (gradesSet.size > 0) {
      this.grados = ['Todos los grados', ...Array.from(gradesSet).sort()];
    }
    if (occasionsSet.size > 0) {
      this.ocasiones = ['Todas las ocasiones', ...Array.from(occasionsSet).sort()];
    }
  }

  getMeta(id: string) {
    return this.categoryMeta[id.toLowerCase()] || {
      icon: 'folder',
      bgClass: 'bg-default',
      textClass: 'text-default',
      borderClass: 'border-default'
    };
  }

  getCategoryCount(id: string): number {
    const lowerId = id.toLowerCase();
    if (lowerId.includes('cien')) return this.counts.ciencia;
    if (lowerId.includes('arq')) return this.counts.arquitectura;
    if (lowerId.includes('incl')) return this.counts.inclusivo;
    return this.counts.educativo;
  }

  toggleCategory(id: string): void {
    const lowerId = id.toLowerCase();
    let normId = 'educativo';
    if (lowerId.includes('cien')) normId = 'ciencia';
    else if (lowerId.includes('arq')) normId = 'arquitectura';
    else if (lowerId.includes('incl')) normId = 'inclusivo';

    if (this.selectedCategory === normId) {
      this.selectedCategory = ''; // Deselect
    } else {
      this.selectedCategory = normId;
    }
    this.hasSearched = this.isFilterActive;
  }

  // Filters
  clearAllFilters(): void {
    this.selectedCategory = '';
    this.selectedOccasion = 'Todas las ocasiones';
    this.selectedGrade = 'Todos los grados';
    this.selectKitOnly = false;
    this.hasSearched = false;
  }
  
  removeFilter(type: string): void {
    switch(type) {
      case 'category': this.selectedCategory = ''; break;
      case 'occasion': this.selectedOccasion = 'Todas las ocasiones'; break;
      case 'grade': this.selectedGrade = 'Todos los grados'; break;
      case 'kitOnly': this.selectKitOnly = false; break;
    }
    this.hasSearched = this.isFilterActive;
  }

  onFilterChange(): void {
    this.hasSearched = this.isFilterActive;
  }

  togglePersonalKit(): void {
    this.onFilterChange();
    if (this.selectKitOnly) {
      // Force reload materials to ensure accordion is populated when checked
      this.materialService.getAllMaterials().subscribe({
        next: (mats) => {
          this.allMaterials = mats;
          this.groupMaterials();
        },
        error: (err) => console.error('Error reloading materials:', err)
      });
    }
  }

  getMaterialCategoryClass(categoryName: string): { bg: string; text: string } {
    const name = categoryName.toLowerCase().trim();
    if (name.includes('base')) {
      return { bg: '#eff6ff', text: '#2563eb' }; // Blue
    } else if (name.includes('modelado')) {
      return { bg: '#faf5ff', text: '#9333ea' }; // Purple
    } else if (name.includes('estructura')) {
      return { bg: '#fffbeb', text: '#d97706' }; // Orange
    } else if (name.includes('textura')) {
      return { bg: '#fdf2f8', text: '#db2777' }; // Pink
    } else if (name.includes('accesorio')) {
      return { bg: '#f0fdfa', text: '#0d9488' }; // Teal
    } else if (name.includes('reciclable')) {
      return { bg: '#f0fdf4', text: '#16a34a' }; // Green
    } else if (name.includes('acabado')) {
      return { bg: '#e0e7ff', text: '#4f46e5' }; // Indigo
    } else if (name.includes('adhesivo')) {
      return { bg: '#fff7ed', text: '#ea580c' }; // Orange/brown
    }
    return { bg: '#f1f5f9', text: '#475569' }; // Slate
  }

  get isFilterActive(): boolean {
    return (
      this.selectedCategory !== '' ||
      this.selectedOccasion !== 'Todas las ocasiones' ||
      this.selectedGrade !== 'Todos los grados' ||
      this.selectKitOnly
    );
  }

  private normalizeText(val: string): string {
    if (!val) return '';
    let normalized = val.toLowerCase().trim();

    normalized = normalized
      .replace(/ã³/g, 'o')
      .replace(/ã­/g, 'i')
      .replace(/ã¡/g, 'a')
      .replace(/ã©/g, 'e')
      .replace(/ãº/g, 'u')
      .replace(/ã±/g, 'n');

    normalized = normalized
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '');

    return normalized.replace(/[^a-z0-9]/g, '');
  }

  get filteredProducts(): Product[] {
    if (!this.hasSearched) return [];

    return this.allProducts.filter((prod) => {
      if (this.selectedCategory) {
        const rawCat = (prod.categoriaId || prod.categoriaNombre || '').toLowerCase();
        let mappedCat = 'educativo';
        if (rawCat.includes('cien')) mappedCat = 'ciencia';
        else if (rawCat.includes('arq')) mappedCat = 'arquitectura';
        else if (rawCat.includes('incl')) mappedCat = 'inclusivo';

        if (mappedCat !== this.selectedCategory) return false;
      }

      if (this.selectedOccasion && this.selectedOccasion !== 'Todas las ocasiones') {
        const normSelected = this.normalizeText(this.selectedOccasion);
        if (!prod.ocasion || !prod.ocasion.some(oc => this.normalizeText(oc) === normSelected)) {
          return false;
        }
      }

      if (this.selectedGrade && this.selectedGrade !== 'Todos los grados') {
        const normSelected = this.normalizeText(this.selectedGrade);
        if (!prod.gradoEscolar || this.normalizeText(prod.gradoEscolar) !== normSelected) {
          return false;
        }
      }

      if (this.selectKitOnly) {
        if (!prod.materiales || prod.materiales.length === 0) return false;
      }

      return true;
    });
  }

  selectProduct(prod: Product): void {
    const modelItem = this.mapProductToModelItem(prod);
    this.modelSelected.emit(modelItem);
  }

  private mapProductToModelItem(product: Product): ModelItem {
    let mappedCategory: 'Ciencia' | 'Arquitectura' | 'Educativo' | 'Inclusivo' = 'Educativo';
    const rawCat = (product.categoriaId || product.categoriaNombre || '').toLowerCase();
    if (rawCat.includes('cien')) {
      mappedCategory = 'Ciencia';
    } else if (rawCat.includes('arq')) {
      mappedCategory = 'Arquitectura';
    } else if (rawCat.includes('incl')) {
      mappedCategory = 'Inclusivo';
    }

    return {
      id: product.id,
      title: product.titulo,
      category: mappedCategory,
      level: product.gradoEscolar || 'Escolar',
      imageUrl: product.imageUrl || 'https://via.placeholder.com/400x300?text=' + encodeURIComponent(product.titulo),
      description: product.descripcion || '',
      materials: product.materiales || [],
      features: (product.caracteristicas && product.caracteristicas.length > 0)
        ? product.caracteristicas
        : [
          'Elaborado con materiales sostenibles',
          product.materialesReciclables ? 'Contiene materiales reciclables' : 'Diseno educativo y didactico',
          'Durabilidad garantizada',
          'Hecho a mano con atencion al detalle'
        ],
      rawProduct: product
    };
  }

  // Cart Functions
  get totalCartItems(): number {
    let count = 0;
    this.cartKits.forEach(k => count += k.quantity);
    this.cartMaterials.forEach(m => count += m.quantity);
    return count;
  }

  addKitToCart(prod: Product): void {
    const qty = this.productQuantities[prod.id] || 1;
    if (qty <= 0) return;

    const existing = this.cartKits.find(k => k.product.id === prod.id && !k.isCustom);
    if (existing) {
      existing.quantity += qty;
    } else {
      this.cartKits.push({ product: prod, quantity: qty, isCustom: false });
    }
    this.productQuantities[prod.id] = 1;
  }

  removeKitFromCart(index: number): void {
    this.cartKits.splice(index, 1);
  }

  increaseProductQty(prodId: string): void {
    const current = this.productQuantities[prodId] || 1;
    this.productQuantities[prodId] = current + 1;
  }

  decreaseProductQty(prodId: string): void {
    const current = this.productQuantities[prodId] || 1;
    if (current > 1) {
      this.productQuantities[prodId] = current - 1;
    }
  }
  
  getProductQty(prodId: string): number {
    return this.productQuantities[prodId] || 1;
  }

  // Materials logic
  toggleAccordion(group: MaterialCategoryGroup): void {
    group.expanded = !group.expanded;
  }

  getMaterialQty(matId: string): number {
    return this.materialQuantities[matId] || 0;
  }

  increaseMaterial(mat: Material): void {
    const current = this.materialQuantities[mat.id] || 0;
    this.materialQuantities[mat.id] = current + 1;
    this.syncMaterialCart(mat);
  }

  decreaseMaterial(mat: Material): void {
    const current = this.materialQuantities[mat.id] || 0;
    if (current > 0) {
      this.materialQuantities[mat.id] = current - 1;
      this.syncMaterialCart(mat);
    }
  }

  syncMaterialCart(mat: Material): void {
    const qty = this.materialQuantities[mat.id];
    const existingIndex = this.cartMaterials.findIndex(m => m.material.id === mat.id);
    
    if (qty > 0) {
      if (existingIndex >= 0) {
        this.cartMaterials[existingIndex].quantity = qty;
      } else {
        this.cartMaterials.push({ material: mat, quantity: qty });
      }
    } else {
      if (existingIndex >= 0) {
        this.cartMaterials.splice(existingIndex, 1);
      }
    }
  }

  removeMaterialFromCart(matId: string): void {
    this.materialQuantities[matId] = 0;
    this.cartMaterials = this.cartMaterials.filter(m => m.material.id !== matId);
  }

  clearCart(): void {
    this.cartKits = [];
    this.cartMaterials = [];
    this.materialQuantities = {};
    this.isServiceRequested = false;
    this.cartForm = {
      nombre: this.authService.isLoggedIn() ? (localStorage.getItem('auth_nombre') || '') : '',
      correo: this.authService.isLoggedIn() ? (localStorage.getItem('auth_email') || '') : '',
      telefono: '',
      mensaje: '',
      tipoExplicacion: 'video',
      modeloExplicacion: '',
      cantidadPersonas: 2
    };
    this.showAuthError = false;
  }

  // Personalization Modal Controls
  openCustomizeModal(product: Product): void {
    this.selectedModalProduct = product;
    this.modalMaterialQuantities = {};
    this.modalMaterialsList = [];

    // Load available materials from the materials list matching the product's materials name,
    // or from all active materials list if none matches specifically.
    if (product.materiales && product.materiales.length > 0) {
      product.materiales.forEach(matName => {
        const found = this.allMaterials.find(m => m.nombre.toLowerCase().trim() === matName.toLowerCase().trim());
        if (found) {
          this.modalMaterialsList.push(found);
          this.modalMaterialQuantities[found.id] = 0; // all materials start with 0 quantity
        } else {
          // If not in database, create temporary virtual material
          const virtualMat: Material = {
            id: 'virtual-' + Math.random().toString(36).substr(2, 9),
            nombre: matName,
            unidad: 'unidad',
            costoCompra: 0,
            costoVenta: 0,
            stockActual: 99,
            categoriaId: '',
            categoriaNombre: 'Original',
            activo: true
          };
          this.modalMaterialsList.push(virtualMat);
          this.modalMaterialQuantities[virtualMat.id] = 0; // starts with 0 quantity
        }
      });
    }

    // Add others from database if list is short to let them choose
    if (this.modalMaterialsList.length === 0) {
      this.modalMaterialsList = this.allMaterials.slice(0, 8);
      this.modalMaterialsList.forEach(m => {
        this.modalMaterialQuantities[m.id] = 0;
      });
    }
  }

  closeModal(): void {
    this.selectedModalProduct = null;
    this.modalMaterialQuantities = {};
    this.modalMaterialsList = [];
  }

  getModalMaterialQty(matId: string): number {
    return this.modalMaterialQuantities[matId] || 0;
  }

  setModalMaterialQty(matId: string, val: number): void {
    const qty = Math.max(0, val || 0);
    this.modalMaterialQuantities[matId] = qty;
  }

  increaseModalMaterial(matId: string): void {
    const current = this.modalMaterialQuantities[matId] || 0;
    this.modalMaterialQuantities[matId] = current + 1;
  }

  decreaseModalMaterial(matId: string): void {
    const current = this.modalMaterialQuantities[matId] || 0;
    if (current > 0) {
      this.modalMaterialQuantities[matId] = current - 1;
    }
  }

  addCustomKitToCart(): void {
    if (!this.selectedModalProduct) return;
    
    const selectedCustomMats: { material: Material; quantity: number }[] = [];
    this.modalMaterialsList.forEach(mat => {
      const qty = this.modalMaterialQuantities[mat.id] || 0;
      if (qty > 0) {
        selectedCustomMats.push({ material: mat, quantity: qty });
      }
    });

    this.cartKits.push({
      product: this.selectedModalProduct,
      quantity: 1,
      isCustom: true,
      customMaterials: selectedCustomMats
    });

    this.closeModal();
  }

  get isFormInvalid(): boolean {
    if (!this.cartForm.nombre || !this.cartForm.nombre.trim()) return true;
    if (!this.cartForm.correo || !this.cartForm.correo.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(this.cartForm.correo)) return true;
    if (!this.cartForm.telefono || !this.cartForm.telefono.trim()) return true;
    if (this.isServiceRequested) {
      if (!this.cartForm.modeloExplicacion) return true;
      const minQty = this.cartForm.modeloExplicacion === 'Salon' ? 10 : (this.cartForm.modeloExplicacion === 'Grupal' ? 2 : 1);
      if (!this.cartForm.cantidadPersonas || this.cartForm.cantidadPersonas < minQty) return true;
    }
    return false;
  }

  submitCart(): void {
    if (!this.authService.isLoggedIn()) {
      this.showAuthError = true;
      this.loginRequested.emit();
      return;
    }

    if (this.totalCartItems === 0) {
      alert('Tu carrito está vacío.');
      return;
    }

    this.validationAttempted = true;
    if (this.isFormInvalid) {
      // Do not allow submission if validation fails
      return;
    }

    this.isLoading = true;

    // Send requests to backend
    // Since we can have multiple kits, we can submit multiple requests or a single request with all items.
    // Let's build a unified PurchaseRequestRequest matching the service model.
    const reqBody: any = {
      clienteNombre: this.cartForm.nombre,
      clienteEmail: this.cartForm.correo,
      clienteTelefono: this.cartForm.telefono,
      mensaje: this.cartForm.mensaje,
      isKit: this.cartKits.some(k => !k.isCustom),
      isCustom: this.cartKits.some(k => k.isCustom) || this.cartMaterials.length > 0,
      solicitarExplicacion: this.isServiceRequested,
      tipoEvento: this.isServiceRequested ? this.cartForm.tipoExplicacion : undefined,
      cantidadPersonas: this.isServiceRequested ? this.cartForm.cantidadPersonas : undefined,
      kits: this.cartKits.map(k => ({
        productId: k.product.id,
        cantidad: k.quantity
      })),
      materialesCustomizados: [],
      materialesPersonales: [],
      materialesPreferidos: []
    };

    // Populate materials requested individually
    this.cartMaterials.forEach(m => {
      reqBody.materialesCustomizados.push({
        materialId: m.material.id,
        cantidad: m.quantity
      });
    });

    // Populate customized materials inside custom kits
    this.cartKits.filter(k => k.isCustom).forEach(k => {
      if (k.customMaterials) {
        k.customMaterials.forEach(cm => {
          if (cm.material.id.startsWith('virtual-')) {
            reqBody.materialesPersonales.push({
              materialName: cm.material.nombre,
              cantidad: cm.quantity,
              descripcion: 'Material para kit personalizado de ' + k.product.titulo
            });
          } else {
            reqBody.materialesCustomizados.push({
              materialId: cm.material.id,
              cantidad: cm.quantity
            });
          }
        });
      }
    });

    this.purchaseRequestService.crear(reqBody).subscribe({
      next: (response) => {
        this.isLoading = false;
        this.showSuccessNotification = true;
        this.clearCart();
        this.validationAttempted = false;
        // Wait 3 seconds to show toast notification before switching page
        setTimeout(() => {
          this.showSuccessNotification = false;
          this.requestSubmitted.emit();
        }, 3000);
      },
      error: (err) => {
        this.isLoading = false;
        console.error('Error submitting request:', err);
        alert(err?.error?.message || 'Error al procesar la solicitud. Intenta nuevamente.');
      }
    });
  }

  redirectToLogin(): void {
    this.loginRequested.emit();
  }
}

