import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

import { API_BASE_URL } from '../config/api.config';
import {
  PurchaseRequestRequest,
  PurchaseRequestResponse,
  UpdateEstadoRequest,
  EstadoSolicitud
} from '../models/purchase-request.model';

@Injectable({ providedIn: 'root' })
export class PurchaseRequestService {

  private readonly http = inject(HttpClient);
  private readonly API_URL = API_BASE_URL;

  crear(request: PurchaseRequestRequest): Observable<PurchaseRequestResponse> {
    return this.http.post<PurchaseRequestResponse>(
      `${this.API_URL}/purchase-requests`, request
    );
  }

  listarMisSolicitudes(): Observable<PurchaseRequestResponse[]> {
    return this.http.get<PurchaseRequestResponse[]>(
      `${this.API_URL}/purchase-requests/my`
    );
  }

  obtenerPorId(id: string): Observable<PurchaseRequestResponse> {
    return this.http.get<PurchaseRequestResponse>(
      `${this.API_URL}/purchase-requests/${id}`
    );
  }

  listarTodas(estado?: EstadoSolicitud): Observable<PurchaseRequestResponse[]> {
    let params = new HttpParams();
    if (estado) {
      params = params.set('estado', estado);
    }
    return this.http.get<PurchaseRequestResponse[]>(
      `${this.API_URL}/admin/purchase-requests`, { params }
    );
  }

  actualizarEstado(id: string, request: UpdateEstadoRequest): Observable<PurchaseRequestResponse> {
    return this.http.put<PurchaseRequestResponse>(
      `${this.API_URL}/admin/purchase-requests/${id}/status`, request
    );
  }
}
