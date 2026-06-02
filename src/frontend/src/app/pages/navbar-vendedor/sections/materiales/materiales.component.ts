import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MaterialService } from '../../../../services/material.service';
import { MaquetaService } from '../../../../services/maqueta.service';
import { Material, MaterialCategory, MaterialRequest } from '../../../../models/material.model';
import { Product } from '../../../../models/product.model';

interface MaterialKit {
  materialNombre: string;
  cantidad: number;
}

interface KitCompleto {
  id: string;
  maquetaId: string;
  maquetaNombre: string;
  materiales?: MaterialKit[];
  precioTotal: number;
  descripcion?: string;
}

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
export class MaterialesComponent implements OnInit {
  private readonly materialService = inject(MaterialService);
  private readonly maquetaService = inject(MaquetaService);

  materials: Material[] = [];
  categories: MaterialCategory[] = [];
  products: Product[] = [];

  loading = false;
  saving = false;

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

  // Kits Completos
  kitsCompletos: KitCompleto[] = [];
  editingKitId: string | null = null;
  isAddingKit = false;
  kitFormData = {
    maquetaId: '',
    precioTotal: 0,
    descripcion: ''
  };
  kitMaterialesForm: MaterialKit[] = [];

  // Precios de Maquetas
  preciosMaquetas: PrecioMaqueta[] = [];
  editingPrecioId: string | null = null;
  isAddingPrecio = false;
  precioFormData = {
    maquetaId: '',
    precioCompleta: 0,
    descripcion: ''
  };

  ngOnInit(): void {
    this.loadAllData();
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

    // Cargar datos locales de Kits y Precios
    const storedKits = localStorage.getItem('kitsCompletos');
    if (storedKits) {
      this.kitsCompletos = JSON.parse(storedKits);
    }

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

  // --- KITS COMPLETOS ---
  saveKits(updatedKits: KitCompleto[]): void {
    this.kitsCompletos = updatedKits;
    localStorage.setItem('kitsCompletos', JSON.stringify(updatedKits));
  }

  handleEditKit(kit: KitCompleto): void {
    this.editingKitId = kit.id;
    this.isAddingKit = false;
    this.kitFormData = {
      maquetaId: kit.maquetaId,
      precioTotal: kit.precioTotal,
      descripcion: kit.descripcion || ''
    };
    this.kitMaterialesForm = kit.materiales || [];
  }

  handleSaveKit(): void {
    const maqueta = this.products.find(p => p.id === this.kitFormData.maquetaId);
    if (!maqueta) {
      alert('Por favor selecciona una maqueta');
      return;
    }

    if (this.editingKitId) {
      const updated = this.kitsCompletos.map(k =>
        k.id === this.editingKitId ? {
          id: this.editingKitId,
          maquetaId: this.kitFormData.maquetaId,
          maquetaNombre: maqueta.titulo,
          precioTotal: this.kitFormData.precioTotal,
          descripcion: this.kitFormData.descripcion,
          materiales: this.kitMaterialesForm
        } : k
      );
      this.saveKits(updated);
      this.editingKitId = null;
    } else if (this.isAddingKit) {
      const existingKit = this.kitsCompletos.find(k => k.maquetaId === this.kitFormData.maquetaId);
      if (existingKit) {
        alert('Ya existe un kit completo para esta maqueta. Puedes editarlo en lugar de crear uno nuevo.');
        return;
      }

      const newKit: KitCompleto = {
        id: Date.now().toString(),
        maquetaId: this.kitFormData.maquetaId,
        maquetaNombre: maqueta.titulo,
        precioTotal: this.kitFormData.precioTotal,
        descripcion: this.kitFormData.descripcion,
        materiales: this.kitMaterialesForm
      };
      this.saveKits([...this.kitsCompletos, newKit]);
      this.isAddingKit = false;
    }

    this.kitFormData = { maquetaId: '', precioTotal: 0, descripcion: '' };
    this.kitMaterialesForm = [];
  }

  handleDeleteKit(id: string): void {
    if (confirm('¿Estás seguro de eliminar este kit completo?')) {
      this.saveKits(this.kitsCompletos.filter(k => k.id !== id));
    }
  }

  handleCancelKit(): void {
    this.editingKitId = null;
    this.isAddingKit = false;
    this.kitFormData = { maquetaId: '', precioTotal: 0, descripcion: '' };
    this.kitMaterialesForm = [];
  }

  agregarMaterialKit(): void {
    this.kitMaterialesForm.push({ materialNombre: '', cantidad: 1 });
  }

  eliminarMaterialKit(index: number): void {
    this.kitMaterialesForm.splice(index, 1);
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
}
