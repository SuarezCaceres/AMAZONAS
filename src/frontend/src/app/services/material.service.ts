import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, BehaviorSubject } from 'rxjs';

import { API_BASE_URL } from '../config/api.config';
import { Material, MaterialRequest, MaterialCategory } from '../models/material.model';

@Injectable({ providedIn: 'root' })
export class MaterialService {

  private readonly http = inject(HttpClient);
  private readonly API_URL = `${API_BASE_URL}/admin`;

  private readonly triggerAddMaterialSubject = new BehaviorSubject<{ nombre: string, unidad?: string } | null>(null);
  readonly triggerAddMaterial$ = this.triggerAddMaterialSubject.asObservable();

  triggerAddMaterial(data: { nombre: string, unidad?: string }): void {
    this.triggerAddMaterialSubject.next(data);
  }

  clearTriggerAddMaterial(): void {
    this.triggerAddMaterialSubject.next(null);
  }

  getAllMaterials(): Observable<Material[]> {
    return this.http.get<Material[]>(`${this.API_URL}/materials`);
  }

  getMaterialById(id: string): Observable<Material> {
    return this.http.get<Material>(`${this.API_URL}/materials/${id}`);
  }

  createMaterial(request: MaterialRequest): Observable<Material> {
    return this.http.post<Material>(`${this.API_URL}/materials`, request);
  }

  updateMaterial(id: string, request: MaterialRequest): Observable<Material> {
    return this.http.put<Material>(`${this.API_URL}/materials/${id}`, request);
  }

  deleteMaterial(id: string): Observable<void> {
    return this.http.delete<void>(`${this.API_URL}/materials/${id}`);
  }

  getAllMaterialCategories(): Observable<MaterialCategory[]> {
    return this.http.get<MaterialCategory[]>(`${this.API_URL}/material-categories`);
  }
}
