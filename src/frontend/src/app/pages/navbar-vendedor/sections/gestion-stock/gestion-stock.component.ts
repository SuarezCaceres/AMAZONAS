import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MaquetaService } from '../../../../services/maqueta.service';
import { Product } from '../../../../models/product.model';

@Component({
  selector: 'app-gestion-stock',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './gestion-stock.component.html',
  styleUrl: './gestion-stock.component.css'
})
export class GestionStockComponent implements OnInit {
  private readonly maquetaService = inject(MaquetaService);

  productStock: Product[] = [];
  searchTerm: string = '';
  editingId: string | null = null;
  tempStock: number = 0;

  ngOnInit(): void {
    this.loadProducts();
  }

  loadProducts(): void {
    this.maquetaService.getProducts('', '', 0, 100).subscribe({
      next: (page) => {
        this.productStock = page.content;
      },
      error: (err) => {
        console.error('Error al cargar productos desde el backend:', err);
      }
    });
  }

  handleEditStock(product: Product): void {
    this.editingId = product.id;
    this.tempStock = product.stock;
  }

  handleSaveStock(product: Product): void {
    const request = {
      titulo: product.titulo,
      descripcion: product.descripcion,
      descripcionDetallada: product.descripcionDetallada,
      categoriaId: product.categoriaId,
      imageUrl: product.imageUrl,
      materiales: product.materiales ? product.materiales.map(nombre => ({ nombre })) : [],
      gradoEscolar: product.gradoEscolar,
      ocasion: product.ocasion,
      materialesReciclables: product.materialesReciclables,
      stock: this.tempStock
    };

    this.maquetaService.updateProduct(product.id, request).subscribe({
      next: (updatedProduct) => {
        this.productStock = this.productStock.map(p =>
          p.id === product.id ? updatedProduct : p
        );
        this.editingId = null;
      },
      error: (err) => {
        console.error('Error al actualizar el stock en el backend:', err);
      }
    });
  }

  handleCancelEdit(): void {
    this.editingId = null;
    this.tempStock = 0;
  }

  displayImageUrl(product: Product): string {
    if (product.imageUrl && product.imageUrl.includes('via.placeholder.com')) {
      return "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='100' height='100' viewBox='0 0 24 24' fill='none' stroke='%239ca3af' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'><rect x='3' y='3' width='18' height='18' rx='2' ry='2'></rect><circle cx='8.5' cy='8.5' r='1.5'></circle><polyline points='21 15 16 10 5 21'></polyline></svg>";
    }
    return product.imageUrl;
  }

  handleImageError(event: Event): void {
    (event.target as HTMLImageElement).src = "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='100' height='100' viewBox='0 0 24 24' fill='none' stroke='%239ca3af' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'><rect x='3' y='3' width='18' height='18' rx='2' ry='2'></rect><circle cx='8.5' cy='8.5' r='1.5'></circle><polyline points='21 15 16 10 5 21'></polyline></svg>";
  }

  getStockStatus(stock: number) {
    if (stock === 0) {
      return { label: 'Agotado', class: 'badge-out', statusClass: 'status-out' };
    }
    if (stock < 5) {
      return { label: 'Stock Bajo', class: 'badge-low', statusClass: 'status-low' };
    }
    return { label: 'Disponible', class: 'badge-ok', statusClass: 'status-ok' };
  }

  get filteredProducts(): Product[] {
    return this.productStock.filter(p =>
      p.titulo.toLowerCase().includes(this.searchTerm.toLowerCase()) ||
      p.categoriaNombre.toLowerCase().includes(this.searchTerm.toLowerCase())
    );
  }

  get totalProducts(): number {
    return this.productStock.length;
  }

  get lowStockProductsCount(): number {
    return this.productStock.filter(p => p.stock > 0 && p.stock < 5).length;
  }

  get outOfStockProductsCount(): number {
    return this.productStock.filter(p => p.stock === 0).length;
  }
}
