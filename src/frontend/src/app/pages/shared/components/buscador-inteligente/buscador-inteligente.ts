import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Output, inject, OnDestroy, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Subject } from 'rxjs';
import { debounceTime, distinctUntilChanged, switchMap, catchError } from 'rxjs/operators';

import { ModelItem } from '../../../data/model';
import { MaquetaService } from '../../../../services/maqueta.service';
import { Product, SearchIntentResponse } from '../../../../models/product.model';

@Component({
  selector: 'app-buscador-inteligente',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule
  ],
  templateUrl: './buscador-inteligente.html',
  styleUrls: ['./buscador-inteligente.css'],
})
export class BuscadorInteligente implements OnInit, OnDestroy {

  @Output() requestAccess = new EventEmitter<'personalizar'>();
  @Output() modelSelected = new EventEmitter<ModelItem>();

  private readonly maquetaService = inject(MaquetaService);

  searchTerm = '';
  resultados: ModelItem[] = [];
  cargando = false;

  // Almacena la intención de búsqueda e IA clasificada
  intentResponse: SearchIntentResponse | null = null;

  // Listas de categorías cargadas dinámicamente desde el endpoint de productos de la base de datos
  todasCategorias: string[] = [];
  categoriasFiltradas: string[] = [];

  // Subject que emite cada vez que el usuario escribe
  private readonly busqueda$ = new Subject<string>();

  // Suscripción declarada directamente
  private readonly sub = this.busqueda$.pipe(
    debounceTime(300),
    distinctUntilChanged(),
    switchMap(termino => {
      const limpio = termino.trim();
      if (!limpio) {
        this.resultados = [];
        this.categoriasFiltradas = [];
        this.cargando = false;
        this.intentResponse = null;
        return [];
      }
      this.cargando = true;

      // Llamar al backend para clasificar la intención semántica (híbrido local + Gemini)
      return this.maquetaService.classifyIntent(limpio).pipe(
        switchMap(intent => {
          this.intentResponse = intent;
          
          let catToQuery: string | undefined = undefined;
          let searchTermToQuery: string | undefined = limpio;

          // Si se detecta una categoría de forma clara, filtramos por esa categoría directamente
          if (intent && intent.categoria && intent.confianza >= 50) {
            catToQuery = intent.categoria;
            searchTermToQuery = undefined;
          }

          return this.maquetaService.getProducts(catToQuery, searchTermToQuery, 0, 15);
        }),
        catchError(err => {
          console.error('Error al clasificar intención de búsqueda:', err);
          this.intentResponse = null;
          // Fallback a búsqueda normal por palabra clave
          return this.maquetaService.getProducts(undefined, limpio, 0, 15);
        })
      );
    })
  ).subscribe({
    next: (response) => {
      this.resultados = response.content.map(p => this.mapearProducto(p));
      this.cargando = false;
    },
    error: () => {
      this.resultados = [];
      this.cargando = false;
      this.intentResponse = null;
    }
  });

  ngOnInit(): void {
    // Consultamos las maquetas del backend para extraer dinámicamente las categorías insertadas en la BD
    this.maquetaService.getProducts(undefined, undefined, 0, 100).subscribe({
      next: (response) => {
        const catsSet = new Set<string>();
        response.content.forEach(p => {
          if (p.categoriaNombre) {
            catsSet.add(p.categoriaNombre);
          }
        });
        this.todasCategorias = Array.from(catsSet);
      },
      error: () => {
        this.todasCategorias = ['Ciencia', 'Arquitectura', 'Educativo', 'Inclusivo']; // Fallback
      }
    });
  }

  // Realiza el filtrado síncrono local de categorías de forma instantánea al escribir
  private filtrarCategoriasLocal(termino: string): void {
    const limpio = termino.trim().toLowerCase();
    if (limpio) {
      this.categoriasFiltradas = this.todasCategorias.filter(cat =>
        cat.toLowerCase().includes(limpio)
      );
    } else {
      this.categoriasFiltradas = [];
    }
  }

  buscar(): void {
    this.filtrarCategoriasLocal(this.searchTerm);
    this.busqueda$.next(this.searchTerm);
  }

  abrirDetalle(item: ModelItem): void {
    this.modelSelected.emit(item);
  }

  buscarPorCategoria(categoria: string): void {
    this.searchTerm = categoria;
    this.filtrarCategoriasLocal(categoria);
    this.busqueda$.next(categoria);
  }

  limpiarBusqueda(): void {
    this.searchTerm = '';
    this.resultados = [];
    this.categoriasFiltradas = [];
    this.cargando = false;
    this.intentResponse = null;
  }

  getConfidenceClass(confianza: number): string {
    if (confianza >= 80) return 'confidence-high';
    if (confianza >= 50) return 'confidence-medium';
    return 'confidence-low';
  }

  setBusqueda(texto: string): void {
    this.searchTerm = texto;
    this.filtrarCategoriasLocal(texto);
    this.busqueda$.next(texto);
  }

  ngOnDestroy(): void {
    this.sub.unsubscribe();
  }

  private mapearProducto(p: Product): ModelItem {
    return {
      id: p.id,
      title: p.titulo,
      category: (p.categoriaNombre ?? 'Ciencia') as any,
      level: p.gradoEscolar ?? '',
      imageUrl: p.imageUrl ?? '',
      description: p.descripcion ?? '',
      materials: p.materiales ?? [],
      features: []
    };
  }

}