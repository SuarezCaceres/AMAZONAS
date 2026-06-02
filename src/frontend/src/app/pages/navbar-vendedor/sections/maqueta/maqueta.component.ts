import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ComboboxInputComponent } from './combobox-input/combobox-input.component';
import { MaquetaService } from '../../../../services/maqueta.service';
import { FileService } from '../../../../services/file.service';
import { MaterialService } from '../../../../services/material.service';
import { Product, ProductRequest, ProductMaterialDetail, ProductAnalysisItem } from '../../../../models/product.model';
import { Material } from '../../../../models/material.model';

export type FormTab = 'catalogo' | 'nueva';

export interface MaquetaStat {
  id: string;
  label: string;
  value: number;
  valueColor: string;
  iconColor: string;
}

export interface AnalisisStat {
  id: string;
  label: string;
  value: string | number;
  valueColor: string;
  subtext?: string;
  icon: string;
  iconColor: string;
}

export interface ProductoSinSolicitud {
  id: string;
  nombre: string;
  categoria: string;
  imagenUrl: string;
}

export interface MaquetaMaterialItem {
  nombre: string;
  cantidadSugerida: number;
  esOpcional: boolean;
  notas: string;
}

export interface NuevaMaquetaForm {
  nombre: string;
  categoria: string;
  ocasion: string;
  gradoEscolar: string;
  descripcion: string;
  caracteristicas: string;
  maquetaSeleccionada: string;
  materiales: MaquetaMaterialItem[];
  stock: number;
  materialesReciclables: boolean;
}

@Component({
  selector: 'app-maqueta',
  standalone: true,
  imports: [CommonModule, FormsModule, ComboboxInputComponent],
  templateUrl: './maqueta.component.html',
  styleUrl: './maqueta.component.css',
})
export class MaquetaComponent implements OnInit {
  private readonly maquetaService = inject(MaquetaService);
  private readonly fileService = inject(FileService);
  private readonly materialService = inject(MaterialService);

  products: Product[] = [];
  inventoryMaterials: Material[] = [];
  loading = false;
  saving = false;

  stats: MaquetaStat[] = [
    {
      id: 'configuradas',
      label: 'Maquetas Configuradas',
      value: 0,
      valueColor: '#1a2a3a',
      iconColor: '#3b82f6',
    },
    {
      id: 'disponibles',
      label: 'Maquetas Disponibles',
      value: 0,
      valueColor: '#8b5cf6',
      iconColor: '#8b5cf6',
    },
    {
      id: 'sin-configurar',
      label: 'Sin Configurar',
      value: 0,
      valueColor: '#f97316',
      iconColor: '#f97316',
    },
  ];

  analisisStats: AnalisisStat[] = [
    {
      id: 'total-solicitudes',
      label: 'Total Solicitudes',
      value: 0,
      valueColor: '#1a2a3a',
      icon: 'bar-chart',
      iconColor: '#3b82f6',
    },
    {
      id: 'productos-solicitados',
      label: 'Productos Solicitados',
      value: 0,
      valueColor: '#1a2a3a',
      icon: 'trending-up',
      iconColor: '#22c55e',
    },
    {
      id: 'categoria-popular',
      label: 'Categoría Popular',
      value: 'N/A',
      valueColor: '#8b5cf6',
      subtext: '0 solicitudes',
      icon: 'star',
      iconColor: '#8b5cf6',
    },
    {
      id: 'sin-solicitudes',
      label: 'Sin Solicitudes',
      value: 0,
      valueColor: '#f97316',
      icon: 'alert-circle',
      iconColor: '#f97316',
    },
  ];

  categorias: string[] = ['Educativa', 'Arquitectura', 'Ciencia', 'TecnologÃ­a'];

  ocasionesOptions: string[] = [
    'Feria Escolar', 'ExposiciÃ³n', 'Concurso', 'Proyecto de Clase',
    'Evento Cultural', 'DÃ­a CientÃ­fico', 'PresentaciÃ³n Final',
  ];

  gradosOptions: string[] = [
    'Inicial / Kinder', 'Primaria', 'Secundaria',
    'Bachillerato', 'Universidad', 'Posgrado',
  ];

  categoriaColorMap: Record<string, string> = {
    'Ciencia':       '#64748b',
    'Arquitectura':  '#64748b',
    'Educativo':     '#64748b',
    'Inclusivo':     '#3b82f6',
    'TecnologÃ­a':    '#64748b',
  };

  productosSinSolicitudes: ProductoSinSolicitud[] = [];
  topProductos: ProductAnalysisItem[] = [];

  getCategoriaColor(cat: string): string {
    return this.categoriaColorMap[cat] ?? '#64748b';
  }

  showForm = false;
  formTab: FormTab = 'catalogo';

  imagenFile: File | null = null;
  imagenPreviewUrl: string | null = null;

  form: NuevaMaquetaForm = {
    nombre: '',
    categoria: '',
    ocasion: '',
    gradoEscolar: '',
    descripcion: '',
    caracteristicas: '',
    maquetaSeleccionada: '',
    materiales: [],
    stock: 10,
    materialesReciclables: false
  };

  get configuradas(): number {
    return this.stats.find(s => s.id === 'configuradas')?.value ?? 0;
  }

  ngOnInit(): void {
    this.refreshAllData();
  }

  refreshAllData(): void {
    this.loading = true;

    // 1. Cargar todos los materiales para el combobox
    this.materialService.getAllMaterials().subscribe({
      next: (materials) => {
        this.inventoryMaterials = materials;
      },
      error: (err) => console.error('Error al cargar materiales:', err)
    });

    // 2. Cargar maquetas (productos)
    this.maquetaService.getProducts('', '', 0, 100).subscribe({
      next: (page) => {
        this.products = page.content;

        // Actualizar estadÃ­sticas superiores
        const total = this.products.length;
        const disponibles = this.products.filter(p => p.stock > 0).length;
        const sinConfigurar = this.products.filter(p => p.stock === 0).length;

        this.stats = this.stats.map(s => {
          if (s.id === 'configuradas') return { ...s, value: total };
          if (s.id === 'disponibles') return { ...s, value: disponibles };
          if (s.id === 'sin-configurar') return { ...s, value: sinConfigurar };
          return s;
        });

        // Actualizar categorÃ­as dinÃ¡micas para el autocompletado
        const uniqueCats = Array.from(new Set(this.products.map(p => p.categoriaNombre).filter(Boolean)));
        this.categorias = Array.from(new Set([...['Educativa', 'Arquitectura', 'Ciencia', 'TecnologÃ­a'], ...uniqueCats]));

        // 3. Cargar anÃ¡lisis de productos y calcular mÃ©tricas
        this.loadAnalysisData();
      },
      error: (err) => {
        console.error('Error al cargar maquetas:', err);
        this.loading = false;
      }
    });
  }

  loadAnalysisData(): void {
    this.maquetaService.getProductAnalysis().subscribe({
      next: (analysisItems) => {
        // 1. Total Solicitudes (Suma de todas las solicitudes)
        const totalReqs = analysisItems.reduce((sum, item) => sum + item.totalSolicitudes, 0);

        // 2. Productos solicitados (cantidad de productos con solicitudes > 0)
        const numProductsRequested = analysisItems.filter(item => item.totalSolicitudes > 0).length;

        // 3. Calcular categoría popular (la categoría con mayor suma de solicitudes)
        const categoryCounts: Record<string, number> = {};
        analysisItems.forEach(item => {
          if (item.totalSolicitudes > 0 && item.categoriaNombre) {
            categoryCounts[item.categoriaNombre] = (categoryCounts[item.categoriaNombre] || 0) + item.totalSolicitudes;
          }
        });

        let popularCategoryName = 'Ninguna';
        let popularCategoryCount = 0;
        Object.entries(categoryCounts).forEach(([cat, count]) => {
          if (count > popularCategoryCount) {
            popularCategoryCount = count;
            popularCategoryName = cat;
          }
        });

        // 4. Filtrar productos sin solicitudes (totalSolicitudes === 0)
        this.productosSinSolicitudes = analysisItems
          .filter(item => item.totalSolicitudes === 0)
          .map(item => ({
            id: item.productoId,
            nombre: item.titulo,
            categoria: item.categoriaNombre || 'Sin Categoría',
            imagenUrl: item.imageUrl
          }));

        // 5. Guardar productos con solicitudes para el Top (ordenados por totalSolicitudes desc)
        this.topProductos = analysisItems
          .filter(item => item.totalSolicitudes > 0)
          .sort((a, b) => b.totalSolicitudes - a.totalSolicitudes);

        // 6. Actualizar stats del análisis de productos
        this.analisisStats = this.analisisStats.map(stat => {
          if (stat.id === 'total-solicitudes') {
            return { ...stat, value: totalReqs };
          }
          if (stat.id === 'productos-solicitados') {
            return { ...stat, value: numProductsRequested };
          }
          if (stat.id === 'categoria-popular') {
            return {
              ...stat,
              value: popularCategoryName,
              subtext: `${popularCategoryCount} solicitudes`
            };
          }
          if (stat.id === 'sin-solicitudes') {
            return { ...stat, value: this.productosSinSolicitudes.length };
          }
          return stat;
        });

        this.loading = false;
      },
      error: (err) => {
        console.error('Error al cargar análisis de productos:', err);
        // Fallback: mostrar todos los productos como sin solicitudes
        this.productosSinSolicitudes = this.products.map(p => ({
          id: p.id,
          nombre: p.titulo,
          categoria: p.categoriaNombre || 'Sin Categoría',
          imagenUrl: p.imageUrl
        }));
        this.topProductos = [];

        this.analisisStats = this.analisisStats.map(stat => {
          if (stat.id === 'sin-solicitudes') {
            return { ...stat, value: this.productosSinSolicitudes.length };
          }
          return stat;
        });
        this.loading = false;
      }
    });
  }

  onMaquetaSeleccionadaChange(): void {
    const selectedId = this.form.maquetaSeleccionada;
    if (!selectedId) {
      this.form.nombre = '';
      this.form.categoria = '';
      this.form.ocasion = '';
      this.form.gradoEscolar = '';
      this.form.descripcion = '';
      this.form.caracteristicas = '';
      this.form.stock = 10;
      this.form.materialesReciclables = false;
      this.form.materiales = [];
      this.imagenPreviewUrl = null;
      this.imagenFile = null;
      return;
    }

    this.loading = true;
    this.maquetaService.getProductById(selectedId).subscribe({
      next: (product) => {
        this.form.nombre = product.titulo;
        this.form.categoria = product.categoriaNombre || product.categoriaId;
        this.form.ocasion = product.ocasion && product.ocasion.length > 0 ? product.ocasion[0] : '';
        this.form.gradoEscolar = product.gradoEscolar || '';
        this.form.descripcion = product.descripcion || '';
        this.form.caracteristicas = (product.caracteristicas && product.caracteristicas.length > 0)
          ? product.caracteristicas.join('\n')
          : '';
        this.form.stock = product.stock || 0;
        this.form.materialesReciclables = product.materialesReciclables || false;

        // Mapear materiales
        if (product.materialesDetalle && product.materialesDetalle.length > 0) {
          this.form.materiales = product.materialesDetalle.map((md: ProductMaterialDetail) => ({
            nombre: md.nombre,
            cantidadSugerida: md.cantidadSugerida || 1,
            esOpcional: md.esOpcional || false,
            notas: md.notas || ''
          }));
        } else {
          this.form.materiales = [];
        }

        this.imagenPreviewUrl = product.imageUrl || null;
        this.imagenFile = null;
        this.loading = false;
      },
      error: (err) => {
        console.error('Error al cargar detalle del producto del catÃ¡logo:', err);
        this.loading = false;
      }
    });
  }

  abrirForm(): void {
    this.showForm = true;
    this.formTab = 'catalogo';
  }

  onImageSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files[0]) {
      this.imagenFile = input.files[0];
      const reader = new FileReader();
      reader.onload = (e) => {
        this.imagenPreviewUrl = e.target?.result as string;
      };
      reader.readAsDataURL(input.files[0]);
    }
  }

  removeImage(): void {
    this.imagenFile = null;
    this.imagenPreviewUrl = null;
  }

  agregarMaterial(): void {
    if (!this.form.materiales) {
      this.form.materiales = [];
    }
    this.form.materiales.push({
      nombre: '',
      cantidadSugerida: 1,
      esOpcional: false,
      notas: ''
    });
  }

  eliminarMaterial(index: number): void {
    if (this.form.materiales) {
      this.form.materiales.splice(index, 1);
    }
  }

  getMaterialInfo(nombre: string): any {
    return this.inventoryMaterials.find(m => m.nombre === nombre);
  }

  getMaterialCostoCompra(nombre: string): number {
    const mat = this.getMaterialInfo(nombre);
    return mat ? mat.costoCompra : 0;
  }

  getMaterialCostoVenta(nombre: string): number {
    const mat = this.getMaterialInfo(nombre);
    return mat ? mat.costoVenta : 0;
  }

  getMaterialUnidad(nombre: string): string {
    const mat = this.getMaterialInfo(nombre);
    return mat ? mat.unidad : '';
  }

  calcularCostoTotalCompra(): number {
    if (!this.form.materiales) return 0;
    return this.form.materiales.reduce((total, m) => {
      const costo = this.getMaterialCostoCompra(m.nombre);
      return total + (costo * (m.cantidadSugerida || 0));
    }, 0);
  }

  calcularCostoTotalVenta(): number {
    if (!this.form.materiales) return 0;
    return this.form.materiales.reduce((total, m) => {
      const costo = this.getMaterialCostoVenta(m.nombre);
      return total + (costo * (m.cantidadSugerida || 0));
    }, 0);
  }

  calcularMargen(): number {
    return this.calcularCostoTotalVenta() - this.calcularCostoTotalCompra();
  }

  calcularMargenPorcentaje(): number {
    const venta = this.calcularCostoTotalVenta();
    if (venta === 0) return 0;
    return (this.calcularMargen() / venta) * 100;
  }

  cancelar(): void {
    this.showForm = false;
    this.imagenFile = null;
    this.imagenPreviewUrl = null;
    this.form = {
      nombre: '',
      categoria: '',
      ocasion: '',
      gradoEscolar: '',
      descripcion: '',
      caracteristicas: '',
      maquetaSeleccionada: '',
      materiales: [],
      stock: 10,
      materialesReciclables: false
    };
  }

  guardar(): void {
    if (!this.form.nombre || !this.form.categoria) {
      alert('Por favor completa los campos obligatorios: Nombre de la Maqueta y CategorÃ­a.');
      return;
    }

    if (this.formTab === 'nueva' && !this.imagenFile && !this.imagenPreviewUrl) {
      alert('La imagen de la maqueta es obligatoria.');
      return;
    }

    this.saving = true;

    // Subir imagen a Cloudinary si se seleccionÃ³ un archivo nuevo
    if (this.imagenFile) {
      this.fileService.uploadImage(this.imagenFile).subscribe({
        next: (res) => {
          this.procederAGuardar(res.url);
        },
        error: (err) => {
          console.error('Error al subir imagen a Cloudinary:', err);
          alert('Hubo un error al subir la imagen. Por favor, intenta de nuevo.');
          this.saving = false;
        }
      });
    } else {
      this.procederAGuardar(this.imagenPreviewUrl || '');
    }
  }

  private procederAGuardar(imageUrl: string): void {
    const materialesRequest = (this.form.materiales || [])
      .filter(m => m.nombre.trim() !== '')
      .map(m => ({
        nombre: m.nombre,
        cantidadSugerida: m.cantidadSugerida,
        esOpcional: m.esOpcional,
        notas: m.notas
      }));

    const productRequest: ProductRequest = {
      titulo: this.form.nombre,
      descripcion: this.form.descripcion,
      descripcionDetallada: this.form.descripcion,
      categoriaId: this.form.categoria,
      imageUrl: imageUrl,
      materiales: materialesRequest,
      gradoEscolar: this.form.gradoEscolar,
      ocasion: this.form.ocasion ? [this.form.ocasion] : [],
      caracteristicas: this.form.caracteristicas
        ? this.form.caracteristicas.split('\n').map((c: string) => c.trim()).filter((c: string) => c.length > 0)
        : [],
      materialesReciclables: this.form.materialesReciclables,
      stock: this.form.stock || 0
    };

    if (this.formTab === 'catalogo' && this.form.maquetaSeleccionada) {
      // Actualizar maqueta existente
      this.maquetaService.updateProduct(this.form.maquetaSeleccionada, productRequest).subscribe({
        next: () => {
          alert('Maqueta actualizada correctamente.');
          this.saving = false;
          this.cancelar();
          this.refreshAllData();
        },
        error: (err) => {
          console.error('Error al actualizar la maqueta en el backend:', err);
          alert('Hubo un error al actualizar la maqueta.');
          this.saving = false;
        }
      });
    } else {
      // Crear nueva maqueta
      this.maquetaService.createProduct(productRequest).subscribe({
        next: () => {
          alert('Maqueta creada y configurada correctamente.');
          this.saving = false;
          this.cancelar();
          this.refreshAllData();
        },
        error: (err) => {
          console.error('Error al registrar la maqueta en el backend:', err);
          alert('Hubo un error al registrar la maqueta.');
          this.saving = false;
        }
      });
    }
  }
}


