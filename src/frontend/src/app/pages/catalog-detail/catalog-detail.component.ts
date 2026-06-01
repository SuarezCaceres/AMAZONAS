import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { MODELS, ModelItem } from '../data/model';

@Component({
  selector: 'app-catalog-detail',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './catalog-detail.component.html',
  styleUrl: './catalog-detail.component.css'
})
export class CatalogDetailComponent {
  @Input({ required: true }) model!: ModelItem;
  @Output() back = new EventEmitter<void>();
  @Output() accessRequested = new EventEmitter<'comprar' | 'personalizar'>();
  @Output() relatedSelected = new EventEmitter<ModelItem>();

  get relatedModels(): ModelItem[] {
    const rawProd = this.model.rawProduct;
    if (rawProd && rawProd.relacionados && rawProd.relacionados.length > 0) {
      return rawProd.relacionados.map((item: any): ModelItem => ({
        id: item.id,
        title: item.titulo,
        category: this.model.category,
        level: this.model.level,
        imageUrl: item.imageUrl || 'https://via.placeholder.com/400x300',
        description: '',
        materials: [],
        features: []
      }));
    }

    const sameCategory = MODELS.filter((item) => item.category === this.model.category && item.id !== this.model.id);
    const otherModels = MODELS.filter((item) => item.category !== this.model.category && item.id !== this.model.id);
    return [...sameCategory, ...otherModels].slice(0, 3);
  }
}
