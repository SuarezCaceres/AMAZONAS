import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, of, tap } from 'rxjs';

import { API_BASE_URL } from '../config/api.config';
import { BudgetRequest, BudgetResponse } from '../models/budget.model';

/**
 * BudgetService — Singleton con caché en memoria (BehaviorSubject).
 *
 * Estrategia de caché de dos niveles:
 * 1. **Redis (backend)**: Caché de 10 min en Upstash Redis. El backend no va a Neon
 *    si ya tiene el resultado cacheado.
 * 2. **BehaviorSubject (frontend)**: Caché en memoria de la sesión Angular.
 *    Si el componente ya cargó el presupuesto de una solicitud, al navegar entre
 *    pestañas y volver NO se dispara un nuevo HTTP GET.
 *
 * La caché se invalida automáticamente al crear o actualizar un presupuesto.
 */
@Injectable({ providedIn: 'root' })
export class BudgetService {

  private readonly http = inject(HttpClient);
  private readonly API_URL = API_BASE_URL;

  // Mapa en memoria: solicitudId → BudgetResponse
  // Permite cachear múltiples presupuestos simultáneamente en la misma sesión.
  private readonly _cacheMap = new Map<string, BudgetResponse>();

  // BehaviorSubject del presupuesto actualmente activo (el último cargado).
  private readonly _presupuesto$ = new BehaviorSubject<BudgetResponse | null>(null);

  // BehaviorSubject de la lista completa de presupuestos (vista admin).
  private readonly _todos$ = new BehaviorSubject<BudgetResponse[]>([]);

  /** Observable público del presupuesto activo. Los componentes se suscriben aquí. */
  readonly presupuesto$ = this._presupuesto$.asObservable();

  /** Observable público de la lista admin. */
  readonly todos$ = this._todos$.asObservable();

  /**
   * Obtiene el presupuesto de una solicitud.
   *
   * - Si el solicitudId ya está en el mapa de caché en memoria, emite el valor
   *   cacheado directamente (sin HTTP GET).
   * - Si no está en caché, hace el GET al backend (que a su vez puede servir
   *   desde Redis o desde Neon) y guarda el resultado en el mapa.
   *
   * @param solicitudId UUID de la solicitud.
   * @param forceRefresh Si es true, ignora el caché en memoria y fuerza el GET.
   */
  obtenerPorSolicitud(solicitudId: string, forceRefresh = false): Observable<BudgetResponse> {
    const cached = this._cacheMap.get(solicitudId);

    if (cached && !forceRefresh) {
      // Caché hit: actualiza el BehaviorSubject y retorna sin HTTP
      this._presupuesto$.next(cached);
      return of(cached);
    }

    // Caché miss: va al backend
    return this.http.get<BudgetResponse>(
      `${this.API_URL}/budgets/by-request/${solicitudId}`
    ).pipe(
      tap(presupuesto => {
        this._cacheMap.set(solicitudId, presupuesto);
        this._presupuesto$.next(presupuesto);
      })
    );
  }

  /**
   * Crea un presupuesto e invalida la caché en memoria para que
   * el componente recargue los datos actualizados.
   */
  crear(request: BudgetRequest): Observable<BudgetResponse> {
    return this.http.post<BudgetResponse>(
      `${this.API_URL}/admin/budgets`, request
    ).pipe(
      tap(presupuesto => {
        // Invalida la entrada específica del mapa si el solicitudId está presente
        if (request.solicitudId) {
          this._cacheMap.delete(request.solicitudId);
        }
        this._presupuesto$.next(presupuesto);
        // Invalida también la lista global
        this._todos$.next([]);
      })
    );
  }

  /**
   * Actualiza un presupuesto e invalida toda la caché para mantener consistencia.
   */
  actualizar(id: string, request: BudgetRequest): Observable<BudgetResponse> {
    return this.http.put<BudgetResponse>(
      `${this.API_URL}/admin/budgets/${id}`, request
    ).pipe(
      tap(presupuesto => {
        this.invalidarCache();
        this._presupuesto$.next(presupuesto);
      })
    );
  }

  /**
   * Lista todos los presupuestos (vista admin).
   * Si ya hay datos en memoria y no se solicita refresco, no hace HTTP.
   *
   * @param forceRefresh Fuerza recarga desde el backend.
   */
  listarTodos(forceRefresh = false): Observable<BudgetResponse[]> {
    const current = this._todos$.getValue();

    if (current.length > 0 && !forceRefresh) {
      return of(current);
    }

    return this.http.get<BudgetResponse[]>(
      `${this.API_URL}/admin/budgets`
    ).pipe(
      tap(lista => this._todos$.next(lista))
    );
  }

  /**
   * Limpia toda la caché en memoria.
   * Útil para forzar una recarga completa (e.g., al cerrar sesión).
   */
  invalidarCache(): void {
    this._cacheMap.clear();
    this._todos$.next([]);
  }
}
