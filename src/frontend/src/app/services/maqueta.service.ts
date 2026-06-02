import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

import { API_BASE_URL } from '../config/api.config';
import { Product, ProductRequest, PageResponse, ProductAnalysisItem, SearchIntentResponse } from '../models/product.model';

@Injectable({ providedIn: 'root' })
export class MaquetaService {

  private readonly http = inject(HttpClient);
  private readonly API_URL = API_BASE_URL;

  getProducts(
    category?: string,
    search?: string,
    page: number = 0,
    size: number = 12
  ): Observable<PageResponse<Product>> {

    let params = new HttpParams()
      .set('page', page.toString())
      .set('size', size.toString());

    if (category) {
      params = params.set('category', category);
    }

    if (search) {
      params = params.set('search', search);
    }

    return this.http.get<PageResponse<Product>>(`${this.API_URL}/products`, { params });
  }

  getProductById(id: string): Observable<Product> {
    return this.http.get<Product>(`${this.API_URL}/products/${id}`);
  }

  createProduct(request: ProductRequest): Observable<Product> {
    return this.http.post<Product>(`${this.API_URL}/admin/products`, request);
  }

  updateProduct(id: string, request: ProductRequest): Observable<Product> {
    return this.http.put<Product>(`${this.API_URL}/admin/products/${id}`, request);
  }

  deleteProduct(id: string): Observable<void> {
    return this.http.delete<void>(`${this.API_URL}/admin/products/${id}`);
  }

  getProductAnalysis(): Observable<ProductAnalysisItem[]> {
    return this.http.get<ProductAnalysisItem[]>(`${this.API_URL}/admin/analysis/products`);
  }

  classifyIntent(query: string): Observable<SearchIntentResponse> {
    return this.http.post<SearchIntentResponse>(`${this.API_URL}/products/classify-intent`, { query });
  }
}
