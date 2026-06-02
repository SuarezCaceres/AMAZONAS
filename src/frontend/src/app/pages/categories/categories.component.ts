import { CommonModule } from '@angular/common';
import { Component, EventEmitter, OnInit, Output, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CategoryService } from '../../services/category.service';
import { MaquetaService } from '../../services/maqueta.service';
import { CategoryResponse } from '../../models/category.model';
import { Product } from '../../models/product.model';
import { ModelItem } from '../data/model';

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

  @Output() categorySelected = new EventEmitter<string>();
  @Output() modelSelected = new EventEmitter<ModelItem>();

  categories: CategoryResponse[] = [];
  allProducts: Product[] = [];
  isLoading = false;

  // Selected filters
  selectedCategory = ''; // 'ciencia', 'arquitectura', 'educativo', 'inclusivo'
  selectedOccasion = 'Todas las ocasiones';
  selectedGrade = 'Todos los grados';
  selectKitOnly = false;

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

  ngOnInit(): void {
    this.isLoading = true;

    // Load categories first
    this.categoryService.getCategories().subscribe({
      next: (cats) => {
        this.categories = cats;
      },
      error: (err) => console.error('Error loading categories', err)
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
  }

  // Check if any filter is set (category selected or dropdowns/checkbox are set)
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

    // Normalize common encoding mismatches (like Latin-1 / UTF-8 mis-interpretation)
    normalized = normalized
      .replace(/ã³/g, 'o') // Ã³ -> ó -> o
      .replace(/ã­/g, 'i') // Ã­ -> í -> i
      .replace(/ã¡/g, 'a') // Ã¡ -> á -> a
      .replace(/ã©/g, 'e') // Ã© -> é -> e
      .replace(/ãº/g, 'u') // Ãº -> ú -> u
      .replace(/ã±/g, 'n'); // Ã± -> ñ -> n

    // Remove traditional Spanish accents
    normalized = normalized
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '');

    // Strip spaces and special symbols
    return normalized.replace(/[^a-z0-9]/g, '');
  }

  // Filters products dynamically based on user selections
  get filteredProducts(): Product[] {
    return this.allProducts.filter((prod) => {
      // 1. Category Filter
      if (this.selectedCategory) {
        const rawCat = (prod.categoriaId || prod.categoriaNombre || '').toLowerCase();
        let mappedCat = 'educativo';
        if (rawCat.includes('cien')) mappedCat = 'ciencia';
        else if (rawCat.includes('arq')) mappedCat = 'arquitectura';
        else if (rawCat.includes('incl')) mappedCat = 'inclusivo';

        if (mappedCat !== this.selectedCategory) return false;
      }

      // 2. Occasion Filter
      if (this.selectedOccasion && this.selectedOccasion !== 'Todas las ocasiones') {
        const normSelected = this.normalizeText(this.selectedOccasion);
        if (!prod.ocasion || !prod.ocasion.some(oc => this.normalizeText(oc) === normSelected)) {
          return false;
        }
      }

      // 3. Grade Filter
      if (this.selectedGrade && this.selectedGrade !== 'Todos los grados') {
        const normSelected = this.normalizeText(this.selectedGrade);
        if (!prod.gradoEscolar || this.normalizeText(prod.gradoEscolar) !== normSelected) {
          return false;
        }
      }

      // 4. Kit Only Filter (assumes kits have reciclables or materials listed)
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
}
