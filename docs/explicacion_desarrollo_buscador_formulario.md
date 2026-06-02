# 📖 Explicación del Buscador Inteligente y Formulario Centrado (Modo Junior)

Esta guía detalla, paso a paso y línea por línea, cómo funciona la implementación del buscador inteligente dinámico de maquetas y la visualización centrada del formulario de personalización.

---

## 📂 Archivo 1: `buscador-inteligente.ts` (Lógica del Componente)
Este archivo se encarga de la lógica y la conexión con los datos.

### 1. Las Importaciones (Imports)
```typescript
import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Output, inject, OnDestroy, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Subject } from 'rxjs';
import { debounceTime, distinctUntilChanged, switchMap } from 'rxjs/operators';
```
* **`CommonModule` y `FormsModule`**: Necesarios para que la plantilla de Angular entienda directivas como `*ngIf`, `*ngFor` y el enlace de datos bidireccional `[(ngModel)]`.
* **`EventEmitter` y `Output`**: Permiten enviar eventos hacia el componente padre (`inicio.ts`) para notificar cuando se selecciona un producto o se abre el formulario independiente.
* **`inject`**: Es la nueva forma en Angular para inyectar servicios en componentes sin necesidad de usar constructores pesados.
* **`Subject`**: Una clase de RxJS utilizada como canal para recibir y transmitir las pulsaciones del teclado del usuario en tiempo real.
* **`debounceTime(300)`**: Espera 300 milisegundos tras la última pulsación de tecla antes de disparar la búsqueda. Evita enviar 10 consultas al servidor si el usuario escribe rápido.
* **`distinctUntilChanged()`**: Evita realizar consultas duplicadas si el término de búsqueda actual es exactamente el mismo que el anterior.
* **`switchMap()`**: Cancela automáticamente la petición HTTP de búsqueda anterior si el usuario introduce nuevos caracteres, manteniendo solo la petición activa más reciente.

---

### 2. OnInit y Extracción Dinámica de la Base de Datos
```typescript
ngOnInit(): void {
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
```
* **`Set<string>`**: Es una estructura de JavaScript que **no permite elementos duplicados**. 
* Al inicializar el componente, traemos los primeros 100 productos del servidor. Recorremos cada producto (`response.content.forEach`) y añadimos su categoría (`p.categoriaNombre`) al Set. De esta forma, si hay 50 productos de *"Arquitectura"*, la palabra *"Arquitectura"* se añade una sola vez.
* **`Array.from(catsSet)`**: Convertimos el Set de nuevo en un array limpio de strings para poder filtrarlo en la pantalla.
* **`error`**: Si el backend falla o está apagado, le definimos una lista de categorías base por defecto para que el buscador funcione de todos modos.

---

### 3. Filtrado Local e Instantáneo
```typescript
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
```
* **`toLowerCase()`**: Convertimos todo el texto a minúsculas para que la búsqueda no falle si se escriben mayúsculas.
* **`includes(limpio)`**: Verifica si el término escrito por el usuario está contenido dentro del nombre de la categoría (por ejemplo, al escribir *"arqui"*, coincidirá con *"Arquitectura"*).
* **¿Por qué local?** Porque al ejecutarse en memoria con la lista precargada, el filtrado es instantáneo y las categorías no desaparecen si la llamada HTTP del backend tarda un poco más en retornar los productos.

---

## 📂 Archivo 2: `buscador-inteligente.html` (Plantilla HTML)
```html
<!-- CATEGORIAS DINAMICAS DEL BACKEND -->
<button
  class="search-item category-item"
  *ngFor="let cat of categoriasFiltradas"
  type="button"
  (click)="buscarPorCategoria(cat)">
  <div class="item-left">
    <div class="item-icon">
      <span class="material-icons">category</span>
    </div>
    <div class="item-content">
      <h4>{{ cat }}</h4>
      <p>Ver todas las maquetas de esta categoría</p>
    </div>
  </div>
  <span class="material-icons item-arrow">arrow_forward</span>
</button>
```
* **`*ngFor="let cat of categoriasFiltradas"`**: Renderiza dinámicamente un botón por cada categoría que coincida con la búsqueda.
* **`{{ cat }}`**: Pinta de manera limpia el nombre de la categoría (ej: *"Inclusivo"*, *"Ciencia"*).

---

## 📂 Archivo 3: `buscador-inteligente.css` (Estilos)
```css
.category-item,
.product-item {
  width: 100%;
  border: none;
  background: none;
  cursor: pointer;
  text-align: left;
}
```
* **`border: none; background: none;`**: Remueve la decoración de botón gris tradicional del navegador.
* **`text-align: left;`**: Corrige el descuadre visual alineando los textos y el icono hacia la izquierda.

---

## 📂 Archivo 4: `request-form.component.html` (Formulario de Pedidos)
```html
<section class="request-page" [class.standalone-layout]="standaloneRequest">
  <div class="preview-column" *ngIf="!standaloneRequest">
    <figure class="model-preview">
      <img [src]="model.imageUrl" [alt]="model.title">
      <figcaption>{{ model.category }}</figcaption>
    </figure>
  </div>
```
* **`[class.standalone-layout]="standaloneRequest"`**: Añade condicionalmente la clase `.standalone-layout` al contenedor principal si el formulario se abrió de forma directa (desde el Inicio o el Buscador).
* **`*ngIf="!standaloneRequest"`**: Si es una solicitud independiente (`standaloneRequest` es `true`), se oculta la columna izquierda de la imagen previa del catálogo.

---

## 📂 Archivo 5: `request-form.component.css` (Estilos del Formulario Centrado)
```css
.request-page.standalone-layout {
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 40px 20px 70px;
}

.request-page.standalone-layout .form-column {
  width: 100%;
  max-width: 600px;
}
```
* **`display: flex; justify-content: center; align-items: center;`**: Distribuye el formulario como un bloque flexible y lo alinea perfectamente en el centro geométrico de la pantalla.
* **`max-width: 600px;`**: Limita el ancho horizontal del formulario en monitores de escritorio grandes, manteniendo un diseño centrado, elegante y muy limpio.

---

## 📂 Archivo Nuevo: `SearchIntentServiceImpl.java` (Backend - Inteligencia Híbrida)
Este servicio es el cerebro que analiza semánticamente lo que escribe el usuario, combinando reglas rápidas de sinónimos con la API de Gemini.

### 1. El Flujo de Clasificación Híbrida
```java
@Override
public SearchIntentResponse classifyIntent(String query) {
    ...
    // 1. Verificar Caché en memoria
    if (cacheMap.containsKey(normalizedQuery)) {
        return cacheMap.get(normalizedQuery);
    }

    // 2. Coincidencia local por sinónimos (Rápido y gratis)
    SearchIntentResponse localMatch = checkLocalRules(normalizedQuery);
    if (localMatch != null) {
        return localMatch;
    }

    // 3. Fallback a Inteligencia Artificial (Gemini API)
    return callGeminiAPI(query);
}
```
* **Caché en Memoria (`cacheMap`)**: Guarda en un mapa las consultas resueltas. Si vuelves a buscar la misma frase, no se vuelve a llamar a la API ni a procesar las reglas; se retorna al instante desde la memoria RAM.
* **Reglas Locales (`checkLocalRules`)**: Verifica palabras clave comunes. Por ejemplo, si la búsqueda contiene *"colegio"*, *"escuela"* o *"tarea"*, deduce directamente la categoría **Educativo** (95% de confianza) sin llamar a Gemini. Esto ahorra dinero en API y tiene respuesta inmediata (0ms).
* **Consulta a Gemini (`callGeminiAPI`)**: Si el texto es complejo y no entra en las reglas locales (ej: *"necesito modelos interactivos táctiles para ciegos"*), le enviamos a Gemini un prompt estricto con un formato JSON estructurado. Gemini analiza y devuelve que la categoría correspondiente es **Inclusivo** con alta confianza.

---

## 📂 Archivo Modificado: `buscador-inteligente.ts` (Frontend - Integración Semántica)
Actualizamos la tubería reactiva (RxJS pipe) para clasificar la intención antes de consultar los productos al backend.

### 1. Integración en el Pipeline de RxJS
```typescript
return this.maquetaService.classifyIntent(limpio).pipe(
  switchMap(intent => {
    this.intentResponse = intent;
    
    let catToQuery: string | undefined = undefined;
    let searchTermToQuery: string | undefined = limpio;

    // Si la confianza es alta, consultamos productos por categoría
    if (intent && intent.categoria && intent.confianza >= 50) {
      catToQuery = intent.categoria;
      searchTermToQuery = undefined;
    }

    return this.maquetaService.getProducts(catToQuery, searchTermToQuery, 0, 15);
  }),
  catchError(err => {
    this.intentResponse = null;
    return this.maquetaService.getProducts(undefined, limpio, 0, 15);
  })
);
```
* **`classifyIntent(limpio)`**: Lanza la petición al backend para entender la intención semántica de lo que escribió el usuario.
* **`intentResponse`**: Almacena el resultado para poder usarlo en la interfaz de usuario.
* **Búsqueda por Categoría**: Si la IA/reglas locales identifican una categoría con más del 50% de confianza, se realiza la consulta de productos por esa **categoría exacta** (`catToQuery`) en lugar del texto escrito por el usuario. Esto soluciona búsquedas naturales como *"quiero algo para mi clase de ciencia"* cargando directamente las maquetas de Ciencia, aunque las maquetas no contengan la frase exacta *"clase de ciencia"*.
* **`catchError`**: Si hay algún error con la API de IA o internet, el buscador pasa de forma segura al fallback tradicional, buscando por coincidencia de palabras exactas sin congelar la pantalla.

---

## 📂 Archivo Modificado: `buscador-inteligente.html` (Frontend - Plantilla de IA)
Implementamos una tarjeta (Card) de asistencia inteligente premium y dinámica que se posiciona al principio de los resultados de búsqueda.

```html
<div class="intent-card" *ngIf="intentResponse && (intentResponse.categoria || intentResponse.action === 'CUSTOMIZE')">
  <div class="intent-card-header">
    <div class="intent-card-title">
      <span class="material-icons sparkle-icon">auto_awesome</span>
      <span>Búsqueda Inteligente</span>
    </div>
    <span class="confidence-badge" [ngClass]="getConfidenceClass(intentResponse.confianza)">
      Coincidencia: {{ intentResponse.confianza }}%
    </span>
  </div>
  ...
</div>
```
* **`*ngIf="..."`**: Muestra la tarjeta de IA solo si se detectó una categoría específica o una intención clara de personalización.
* **Icono de Destello (`auto_awesome`)**: Agrega un toque visual elegante animado para señalar al usuario que el buscador ha utilizado Inteligencia Artificial.
* **Insignia de Confianza (`confidence-badge`)**: Muestra el porcentaje de confianza con colores dinámicos (verde para alta confianza, amarillo para media, gris para baja).
* **Acciones Integradas**:
  - Si se sugiere una categoría, se muestra un botón para ver todas las maquetas de esa categoría.
  - Si se detecta la intención de crear una maqueta personalizada (ej: *"quiero una maqueta personalizada"*), se muestra un botón destacado para abrir el formulario centrado al instante.

---

## 📂 Archivo Modificado: `buscador-inteligente.html` (Frontend - Estado Vacío Premium e Integración Orgánica)
Transformamos el aburrido estado de "No se encontraron resultados" con cara triste en una invitación activa y premium para diseñar una maqueta personalizada.

```html
<div class="empty-results premium-empty" *ngIf="...">
  <div class="empty-sparkle-container">
    <span class="material-icons empty-sparkle-1">auto_awesome</span>
    <span class="material-icons empty-icon-main">design_services</span>
    ...
  </div>
  <h3>¿No encuentras lo que buscas?</h3>
  <p class="empty-text-premium">
    No tenemos una maqueta prediseñada con el término "{{ searchTerm }}", pero no te preocupes: ¡podemos diseñar y fabricar una maqueta totalmente a tu medida!
  </p>
  ...
</div>
```
* **Iconos Animados Estilo IA**: Mostramos un icono central de diseño (`design_services`) rodeado de estrellas mágicas (`auto_awesome`) que flotan y brillan de forma asíncrona mediante animaciones CSS.
* **Redacción Positiva y Orgánica**: En lugar de mostrar un error o un aviso negativo, le explicamos al usuario que, como no tenemos un producto estándar que coincida con su búsqueda de `{{ searchTerm }}`, estamos listos para fabricarlo a medida.
* **Insignia Informativa y Botón de Llamada a la Acción (CTA)**:
  - Se añade un badge verde que resalta el uso de materiales eco-amigables y presupuesto sin costo.
  - El botón con degradado púrpura-índigo (`empty-customize-btn`) redirige al usuario de manera muy orgánica al formulario centrado de personalización al hacer clic, logrando una experiencia fluida y muy profesional.

