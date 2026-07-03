import { Component, OnInit, OnDestroy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subscription } from 'rxjs';
import { MaterialService } from '../../../../services/material.service';
import { MaquetaService } from '../../../../services/maqueta.service';
import { Material, MaterialCategory, MaterialRequest } from '../../../../models/material.model';
import { Product } from '../../../../models/product.model';



interface PrecioMaqueta {
  id: string;
  maquetaId: string;
  maquetaNombre: string;
  precioCompleta: number;
  descripcion?: string;
}

@Component({
  selector: 'app-materiales',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './materiales.component.html',
  styleUrl: './materiales.component.css'
})
export class MaterialesComponent implements OnInit, OnDestroy {
  private readonly materialService = inject(MaterialService);
  private readonly maquetaService = inject(MaquetaService);

  private triggerSub?: Subscription;

  materials: Material[] = [];
  categories: MaterialCategory[] = [];
  products: Product[] = [];
  loading = false;
  saving = false;
  collapsedCategories: Record<string, boolean> = {};

  // Formulario Material
  editingId: string | null = null;
  isAdding = false;
  formData = {
    nombre: '',
    unidad: '',
    costoCompra: 0,
    costoVenta: 0,
    stockActual: 0,
    categoriaId: '',
    proveedor: '',
    activo: true
  };


  // Precios de Maquetas
  preciosMaquetas: PrecioMaqueta[] = [];
  editingPrecioId: string | null = null;
  isAddingPrecio = false;
  precioFormData = {
    maquetaId: '',
    precioCompleta: 0,
    descripcion: ''
  };

  activeTab: 'materiales' | 'kits' | 'precios' = 'materiales';

  ngOnInit(): void {
    this.loadAllData();
    this.triggerSub = this.materialService.triggerAddMaterial$.subscribe(data => {
      if (data) {
        this.isAdding = true;
        this.editingId = null;
        this.resetMaterialForm();
        this.formData.nombre = data.nombre;
        this.formData.unidad = data.unidad || '';
        this.materialService.clearTriggerAddMaterial();
      }
    });
  }

  ngOnDestroy(): void {
    if (this.triggerSub) {
      this.triggerSub.unsubscribe();
    }
  }

  loadAllData(): void {
    this.loading = true;

    // Cargar categorías del backend
    this.materialService.getAllMaterialCategories().subscribe({
      next: (categories) => {
        this.categories = categories;
      },
      error: (err) => console.error('Error al cargar categorías de materiales:', err)
    });

    // Cargar materiales del backend
    this.materialService.getAllMaterials().subscribe({
      next: (materials) => {
        this.materials = materials;
        this.loading = false;
      },
      error: (err) => {
        console.error('Error al cargar materiales:', err);
        this.loading = false;
      }
    });

    // Cargar productos del backend para asociar precios/kits
    this.maquetaService.getProducts('', '', 0, 100).subscribe({
      next: (page) => {
        this.products = page.content;
      },
      error: (err) => console.error('Error al cargar productos de maquetas:', err)
    });



    const storedPrecios = localStorage.getItem('preciosMaquetas');
    if (storedPrecios) {
      this.preciosMaquetas = JSON.parse(storedPrecios);
    }
  }

  // --- MATERIALES ---
  handleEdit(material: Material): void {
    this.editingId = material.id;
    this.isAdding = false;
    this.formData = {
      nombre: material.nombre,
      unidad: material.unidad,
      costoCompra: material.costoCompra,
      costoVenta: material.costoVenta,
      stockActual: material.stockActual,
      categoriaId: material.categoriaId,
      proveedor: material.proveedor || '',
      activo: material.activo
    };
  }

  handleSave(): void {
    if (!this.formData.nombre || !this.formData.unidad || !this.formData.categoriaId) {
      alert('Por favor, completa los campos obligatorios: Nombre, Unidad y Categoría.');
      return;
    }

    if (/\d/.test(this.formData.unidad)) {
      alert('La unidad de medida no debe contener números (ej. usa "hoja", "kg", "paquete").');
      return;
    }

    this.saving = true;
    const request: MaterialRequest = {
      nombre: this.formData.nombre,
      unidad: this.formData.unidad,
      costoCompra: this.formData.costoCompra,
      costoVenta: this.formData.costoVenta,
      stockActual: this.formData.stockActual,
      categoriaId: this.formData.categoriaId,
      proveedor: this.formData.proveedor || undefined,
      activo: this.formData.activo
    };

    if (this.editingId) {
      this.materialService.updateMaterial(this.editingId, request).subscribe({
        next: () => {
          this.saving = false;
          this.editingId = null;
          this.resetMaterialForm();
          this.loadAllData();
        },
        error: (err) => {
          console.error('Error al actualizar material:', err);
          alert('Hubo un error al actualizar el material.');
          this.saving = false;
        }
      });
    } else {
      this.materialService.createMaterial(request).subscribe({
        next: () => {
          this.saving = false;
          this.isAdding = false;
          this.resetMaterialForm();
          this.loadAllData();
        },
        error: (err) => {
          console.error('Error al crear material:', err);
          alert('Hubo un error al crear el material.');
          this.saving = false;
        }
      });
    }
  }

  handleDelete(id: string): void {
    if (confirm('¿Estás seguro de eliminar este material?')) {
      this.materialService.deleteMaterial(id).subscribe({
        next: () => {
          this.loadAllData();
        },
        error: (err) => {
          console.error('Error al eliminar material:', err);
          alert('Hubo un error al eliminar el material.');
        }
      });
    }
  }

  handleCancel(): void {
    this.editingId = null;
    this.isAdding = false;
    this.resetMaterialForm();
  }

  resetMaterialForm(): void {
    this.formData = {
      nombre: '',
      unidad: '',
      costoCompra: 0,
      costoVenta: 0,
      stockActual: 0,
      categoriaId: '',
      proveedor: '',
      activo: true
    };
  }

  // --- PRECIOS DE MAQUETAS ---
  savePrecios(updatedPrecios: PrecioMaqueta[]): void {
    this.preciosMaquetas = updatedPrecios;
    localStorage.setItem('preciosMaquetas', JSON.stringify(updatedPrecios));
  }

  handleEditPrecio(precio: PrecioMaqueta): void {
    this.editingPrecioId = precio.id;
    this.isAddingPrecio = false;
    this.precioFormData = {
      maquetaId: precio.maquetaId,
      precioCompleta: precio.precioCompleta,
      descripcion: precio.descripcion || ''
    };
  }

  handleSavePrecio(): void {
    const maqueta = this.products.find(p => p.id === this.precioFormData.maquetaId);
    if (!maqueta) {
      alert('Por favor selecciona una maqueta');
      return;
    }

    if (this.editingPrecioId) {
      const updated = this.preciosMaquetas.map(p =>
        p.id === this.editingPrecioId ? {
          id: this.editingPrecioId,
          maquetaId: this.precioFormData.maquetaId,
          maquetaNombre: maqueta.titulo,
          precioCompleta: this.precioFormData.precioCompleta,
          descripcion: this.precioFormData.descripcion
        } : p
      );
      this.savePrecios(updated);
      this.editingPrecioId = null;
    } else if (this.isAddingPrecio) {
      const existingPrecio = this.preciosMaquetas.find(p => p.maquetaId === this.precioFormData.maquetaId);
      if (existingPrecio) {
        alert('Ya existe un precio para esta maqueta. Puedes editarlo en lugar de crear uno nuevo.');
        return;
      }

      const newPrecio: PrecioMaqueta = {
        id: Date.now().toString(),
        maquetaId: this.precioFormData.maquetaId,
        maquetaNombre: maqueta.titulo,
        precioCompleta: this.precioFormData.precioCompleta,
        descripcion: this.precioFormData.descripcion
      };
      this.savePrecios([...this.preciosMaquetas, newPrecio]);
      this.isAddingPrecio = false;
    }

    this.precioFormData = { maquetaId: '', precioCompleta: 0, descripcion: '' };
  }

  handleDeletePrecio(id: string): void {
    if (confirm('¿Estás seguro de eliminar este precio de maqueta?')) {
      this.savePrecios(this.preciosMaquetas.filter(p => p.id !== id));
    }
  }

  handleCancelPrecio(): void {
    this.editingPrecioId = null;
    this.isAddingPrecio = false;
    this.precioFormData = { maquetaId: '', precioCompleta: 0, descripcion: '' };
  }

  // --- AUXILIAR / MAPPING ---
  getGroupedMaterials(): { key: string; value: Material[] }[] {
    const groups: Record<string, Material[]> = {};
    for (const material of this.materials) {
      const cat = material.categoriaNombre || 'Sin Categoría';
      if (!groups[cat]) {
        groups[cat] = [];
      }
      groups[cat].push(material);
    }
    return Object.keys(groups).map(key => ({ key, value: groups[key] }));
  }

  get totalInventoryValue(): number {
    return this.materials.reduce((sum, m) => sum + (m.costoCompra * m.stockActual), 0);
  }

  get totalCategoriesCount(): number {
    const categories = new Set(this.materials.map(m => m.categoriaNombre).filter(Boolean));
    return categories.size;
  }

  toggleCategory(categoryName: string): void {
    if (this.collapsedCategories[categoryName] === undefined) {
      this.collapsedCategories[categoryName] = false; // cambiar de colapsado (por defecto) a expandido
    } else {
      this.collapsedCategories[categoryName] = !this.collapsedCategories[categoryName];
    }
  }

  isCategoryCollapsed(categoryName: string): boolean {
    return this.collapsedCategories[categoryName] !== false;
  }
}
