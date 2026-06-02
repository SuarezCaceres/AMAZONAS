import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Output, inject, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CATEGORIES, Category, ModelItem } from '../data/model';
import { MaquetaService } from '../../services/maqueta.service';
import { Product } from '../../models/product.model';

const categoryMap: { [key in Category]: string } = {
  'Todos': '',
  'Ciencia': 'ciencia',
  'Arquitectura': 'arquitectura',
  'Educativo': 'educativo',
  'Inclusivo': 'inclusivo'
};

export function mapProductToModelItem(product: Product): ModelItem {
  let mappedCategory: Exclude<Category, 'Todos'> = 'Educativo';
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
    features: [
      'Elaborado con materiales sostenibles',
      product.materialesReciclables ? 'Contiene materiales reciclables' : 'Diseno educativo y didactico',
      'Durabilidad garantizada',
      'Stock disponible: ' + product.stock
    ],
    rawProduct: product
  };
}

@Component({
  selector: 'app-catalog',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './catalog.component.html',
  styleUrl: './catalog.component.css'
})
export class CatalogComponent implements OnInit {
  @Output() viewDetails = new EventEmitter<ModelItem>();

  private readonly maquetaService = inject(MaquetaService);

  searchTerm = '';
  selectedCategory: Category = 'Todos';
  categories = CATEGORIES;
  models: ModelItem[] = [];
  isLoading = false;

  ngOnInit(): void {
    this.loadProducts();
  }

  loadProducts(): void {
    this.isLoading = true;
    const mappedCat = categoryMap[this.selectedCategory];
    this.maquetaService.getProducts(mappedCat).subscribe({
      next: (pageRes) => {
        this.models = (pageRes.content || []).map(mapProductToModelItem);
        this.isLoading = false;
      },
      error: (err) => {
        console.error('Error loading products from backend', err);
        this.isLoading = false;
      }
    });
  }

  get filteredModels(): ModelItem[] {
    const term = this.normalize(this.searchTerm);

    return this.models.filter((model) => {
      const matchesCategory = this.selectedCategory === 'Todos' || model.category === this.selectedCategory;
      const searchableText = this.normalize(`${model.title} ${model.category} ${model.level} ${model.description}`);
      return matchesCategory && searchableText.includes(term);
    });
  }

  selectCategory(category: Category): void {
    this.selectedCategory = category;
    this.loadProducts();
  }

  showDetails(model: ModelItem): void {
    this.viewDetails.emit(model);
  }

  private normalize(value: string): string {
    return value
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '');
  }
}
