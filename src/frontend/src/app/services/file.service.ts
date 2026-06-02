import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { API_BASE_URL } from '../config/api.config';

@Injectable({
  providedIn: 'root'
})
export class FileService {
  private readonly http = inject(HttpClient);
  private readonly API_URL = `${API_BASE_URL}/admin/files`;

  /**
   * Sube un archivo de imagen al servidor backend, el cual lo almacenará en Cloudinary.
   * @param file Archivo binario de imagen seleccionado del input
   * @returns Un observable con la URL segura del archivo subido en Cloudinary
   */
  uploadImage(file: File): Observable<{ url: string }> {
    const formData = new FormData();
    formData.append('file', file);

    return this.http.post<{ url: string }>(`${this.API_URL}/upload`, formData);
  }
}
