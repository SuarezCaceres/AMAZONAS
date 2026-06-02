import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

import { API_BASE_URL } from '../config/api.config';
import { CategoryResponse } from '../models/category.model';

@Injectable({ providedIn: 'root' })
export class CategoryService {

  private readonly http = inject(HttpClient);
  private readonly API_URL = API_BASE_URL;

  getCategories(): Observable<CategoryResponse[]> {
    return this.http.get<CategoryResponse[]>(`${this.API_URL}/categories`);
  }
}
