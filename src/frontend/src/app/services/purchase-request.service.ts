import { Injectable, inject, signal } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { BehaviorSubject, Observable, of, tap } from 'rxjs';

import { API_BASE_URL } from '../config/api.config';
import {
  PurchaseRequestRequest,
  PurchaseRequestResponse,
  UpdateEstadoRequest,
  EstadoSolicitud,
  SolicitudParaPresupuestoResponse
} from '../models/purchase-request.model';

/**
 * PurchaseRequestService — Singleton con caché en memoria (BehaviorSubject + Signal).
 *
 * Estrategia de caché de dos niveles:
 * 1. **Redis (backend)**: La lista de "mis solicitudes" se cachea 5 min por email.
 * 2. **BehaviorSubject / Signal (frontend)**: Previene recargas HTTP al navegar
 *    entre pestañas dentro de la misma sesión Angular.
 *
 * Patrones de invalidación:
 * - `crear` y `actualizarArchivos` invalidan solo la caché del usuario actual.
 * - `actualizarEstado`, `rechazar` y `eliminar` invalidan la caché global (admin),
 *   ya que afectan lo que ven múltiples roles.
 */
@Injectable({ providedIn: 'root' })
export class PurchaseRequestService {

  private readonly http = inject(HttpClient);
  private readonly API_URL = API_BASE_URL;

  // ── Caché del usuario actual ───────────────────────────────────────────────

  /** Signal con las solicitudes del usuario autenticado. */
  readonly misSolicitudes = signal<PurchaseRequestResponse[]>([]);

  // ── Caché de la lista admin ────────────────────────────────────────────────

  /** BehaviorSubject con la lista de todas las solicitudes (vista admin). */
  private readonly _solicitudesAdmin$ = new BehaviorSubject<PurchaseRequestResponse[]>([]);

  /** Observable público de la lista admin. Los componentes se suscriben aquí. */
  readonly solicitudesAdmin$ = this._solicitudesAdmin$.asObservable();

  // ── Indicador del último estado filtrado cacheado ──────────────────────────
  private _lastEstadoCacheado: EstadoSolicitud | undefined = undefined;

  // ── Métodos ────────────────────────────────────────────────────────────────

  /**
   * Crea una solicitud e invalida la caché del usuario para que
   * el próximo `listarMisSolicitudes` recargue desde el backend.
   */
  crear(request: PurchaseRequestRequest): Observable<PurchaseRequestResponse> {
    return this.http.post<PurchaseRequestResponse>(
      `${this.API_URL}/purchase-requests`, request
    ).pipe(
      tap(() => {
        // Invalida la caché del usuario para forzar recarga
        this.misSolicitudes.set([]);
      })
    );
  }

  /**
   * Lista las solicitudes del usuario autenticado.
   * Siempre hace HTTP (el backend usa Redis como caché de 5 min).
   * El Signal `misSolicitudes` actúa como estado reactivo para los componentes.
   */
  listarMisSolicitudes(): Observable<PurchaseRequestResponse[]> {
    return this.http.get<PurchaseRequestResponse[]>(
      `${this.API_URL}/purchase-requests/my`
    ).pipe(
      tap(solicitudes => this.misSolicitudes.set(solicitudes))
    );
  }

  obtenerPorId(id: string): Observable<PurchaseRequestResponse> {
    return this.http.get<PurchaseRequestResponse>(
      `${this.API_URL}/purchase-requests/${id}`
    );
  }

  /**
   * Lista TODAS las solicitudes (vista admin).
   * - Si ya hay datos en memoria del mismo filtro de estado y `forceRefresh` es false,
   *   retorna el BehaviorSubject directamente sin HTTP.
   * - Si el filtro cambia o se solicita refresco, hace el GET al backend.
   *
   * @param estado Filtro opcional por estado.
   * @param forceRefresh Fuerza recarga desde el backend ignorando la caché.
   */
  listarTodas(estado?: EstadoSolicitud, forceRefresh = false): Observable<PurchaseRequestResponse[]> {
    const current = this._solicitudesAdmin$.getValue();
    const mismoFiltro = this._lastEstadoCacheado === estado;

    if (current.length > 0 && !forceRefresh && mismoFiltro) {
      // Caché hit: retorna observable del BehaviorSubject actual
      return of(current);
    }

    let params = new HttpParams();
    if (estado) {
      params = params.set('estado', estado);
    }

    return this.http.get<PurchaseRequestResponse[]>(
      `${this.API_URL}/admin/purchase-requests`, { params }
    ).pipe(
      tap(solicitudes => {
        this._lastEstadoCacheado = estado;
        this._solicitudesAdmin$.next(solicitudes);
      })
    );
  }

  /**
   * Actualiza el estado de una solicitud e invalida la caché admin
   * para que la lista refleje el cambio en la próxima carga.
   */
  actualizarEstado(id: string, request: UpdateEstadoRequest): Observable<PurchaseRequestResponse> {
    return this.http.put<PurchaseRequestResponse>(
      `${this.API_URL}/admin/purchase-requests/${id}/status`, request
    ).pipe(
      tap(() => this.invalidarCacheAdmin())
    );
  }

  obtenerParaPresupuesto(id: string): Observable<SolicitudParaPresupuestoResponse> {
    return this.http.get<SolicitudParaPresupuestoResponse>(
      `${this.API_URL}/admin/purchase-requests/${id}/para-presupuesto`
    );
  }

  actualizarArchivos(id: string, files: { grabacionesUrls: string[], archivosUrls: string[] }): Observable<PurchaseRequestResponse> {
    return this.http.put<PurchaseRequestResponse>(
      `${this.API_URL}/purchase-requests/${id}/files`, files
    ).pipe(
      tap(() => {
        // Invalida la caché del usuario ya que sus archivos cambiaron
        this.misSolicitudes.set([]);
      })
    );
  }

  eliminar(id: string): Observable<void> {
    return this.http.delete<void>(
      `${this.API_URL}/purchase-requests/${id}`
    ).pipe(
      tap(() => {
        this.misSolicitudes.set([]);
        this.invalidarCacheAdmin();
      })
    );
  }

  /**
   * Rechaza una solicitud e invalida la caché admin y de usuario.
   */
  rechazar(id: string, motivo: string | null): Observable<PurchaseRequestResponse> {
    return this.http.put<PurchaseRequestResponse>(
      `${this.API_URL}/admin/purchase-requests/${id}/reject`,
      { motivo }
    ).pipe(
      tap(() => this.invalidarCacheAdmin())
    );
  }

  // ── Helpers de invalidación ────────────────────────────────────────────────

  /**
   * Invalida únicamente la caché de la lista admin.
   * Se llama tras operaciones que cambian el estado de solicitudes.
   */
  invalidarCacheAdmin(): void {
    this._solicitudesAdmin$.next([]);
    this._lastEstadoCacheado = undefined;
  }

  /**
   * Invalida toda la caché (usuario + admin).
   * Útil al cerrar sesión o cambiar de cuenta.
   */
  invalidarTodaLaCache(): void {
    this.misSolicitudes.set([]);
    this.invalidarCacheAdmin();
  }
}
