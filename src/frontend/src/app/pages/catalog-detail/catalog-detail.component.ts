import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output, inject, OnChanges, SimpleChanges } from '@angular/core';
import { MODELS, ModelItem } from '../data/model';
import { MaquetaService } from '../../services/maqueta.service';
import { Product } from '../../models/product.model';

function mapProductToModelItemDetail(product: Product): ModelItem {
  let mappedCategory: any = 'Educativo';
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

@Component({
  selector: 'app-catalog-detail',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './catalog-detail.component.html',
  styleUrl: './catalog-detail.component.css'
})
export class CatalogDetailComponent implements OnChanges {
  @Input({ required: true }) model!: ModelItem;
  @Output() back = new EventEmitter<void>();
  @Output() accessRequested = new EventEmitter<'comprar' | 'personalizar'>();
  @Output() relatedSelected = new EventEmitter<ModelItem>();

  private readonly maquetaService = inject(MaquetaService);

  detailedModel!: ModelItem;
  isLoading = false;

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['model'] && this.model) {
      // Iniciar con el modelo actual para evitar parpadeos
      this.detailedModel = { ...this.model };
      this.loadFullProduct(this.model.id);
    }
  }

  loadFullProduct(id: string): void {
    this.isLoading = true;
    this.maquetaService.getProductById(id).subscribe({
      next: (product) => {
        this.detailedModel = mapProductToModelItemDetail(product);
        this.isLoading = false;
      },
      error: (err) => {
        console.error('Error loading product details by id', err);
        this.isLoading = false;
      }
    });
  }

  get relatedModels(): ModelItem[] {
    const currentModel = this.detailedModel || this.model;
    const rawProd = currentModel.rawProduct;
    if (rawProd && rawProd.relacionados && rawProd.relacionados.length > 0) {
      return rawProd.relacionados.map((item: any): ModelItem => ({
        id: item.id,
        title: item.titulo,
        category: currentModel.category,
        level: currentModel.level,
        imageUrl: item.imageUrl || 'https://via.placeholder.com/400x300',
        description: '',
        materials: [],
        features: []
      }));
    }

    const sameCategory = MODELS.filter((item) => item.category === currentModel.category && item.id !== currentModel.id);
    const otherModels = MODELS.filter((item) => item.category !== currentModel.category && item.id !== currentModel.id);
    return [...sameCategory, ...otherModels].slice(0, 3);
  }
}
