# Documentación Técnica — Correcciones de Integración Frontend ↔ Backend

> **Proyecto:** AMAZONAS  
> **Fecha:** 2026-06-01  
> **Áreas cubiertas:** Backend (Spring Boot 3 + PostgreSQL / Neon) · Frontend (Angular 17+)

---

## Índice

1. [Arquitectura general de comunicación](#1-arquitectura-general-de-comunicación)
2. [Fix 1 — Serialización Jackson y N+1 queries en Productos](#2-fix-1--serialización-jackson-y-n1-queries-en-productos)
3. [Fix 2 — Sesión colgada, token expirado y carga del catálogo](#3-fix-2--sesión-colgada-token-expirado-y-carga-del-catálogo)
4. [Fix 3 — Error UUID vs String en MaterialCategory](#4-fix-3--error-uuid-vs-string-en-materialcategory)
5. [Tabla de archivos modificados](#5-tabla-de-archivos-modificados)
6. [Referencia de endpoints consumidos](#6-referencia-de-endpoints-consumidos)

---

## 1. Arquitectura general de comunicación

```
┌──────────────────────────────────────────────────────────────┐
│  FRONTEND  (Angular 17 · localhost:4200)                     │
│                                                              │
│  CatalogComponent  CatalogDetailComponent  AuthComponent     │
│         │                  │                    │            │
│         ▼                  ▼                    ▼            │
│   MaquetaService    MaquetaService        AuthService        │
│         │                  │                    │            │
│         └──────────────────┴────────────────────┘            │
│                            │                                 │
│              ┌─────────────▼──────────────┐                  │
│              │       authInterceptor       │  ← añade JWT    │
│              │   (auth.interceptor.ts)     │    o lo omite   │
│              └─────────────┬──────────────┘                  │
└────────────────────────────┼─────────────────────────────────┘
                             │  HTTP/REST (JSON)
                             │  Authorization: Bearer <JWT>
                             ▼
┌──────────────────────────────────────────────────────────────┐
│  BACKEND  (Spring Boot 3 · localhost:8080)                   │
│                                                              │
│  JwtFilter → SecurityConfig → Controllers                    │
│                                    │                         │
│                          Services → Repositories             │
│                                    │                         │
│                            PostgreSQL (Neon)                 │
└──────────────────────────────────────────────────────────────┘
```

### Flujo de una petición paso a paso

1. Un componente Angular llama a un método de servicio (p. ej. `MaquetaService.getProducts()`).
2. `HttpClient` construye la petición HTTP.
3. El **`authInterceptor`** decide si agrega `Authorization: Bearer <token>` según la ruta.
4. Spring Boot recibe la petición. El **`JwtFilter`** lee y valida el token (si está presente).
5. **`SecurityConfig`** comprueba si la ruta requiere autenticación.
6. Si pasa, el **Controller** delega al **Service** → **Repository** → consulta a PostgreSQL.
7. La respuesta JSON sube de vuelta hasta el componente Angular.

---

## 2. Fix 1 — Serialización Jackson y N+1 queries en Productos

### Problema original

- Los campos `proveedor` y `stockActual` del material **no aparecían** en el JSON de respuesta aunque Hibernate los cargaba en SQL.
- Al cargar un producto, Hibernate lanzaba **múltiples SELECTs adicionales** (problema N+1) por cada `ProductMaterial` y su `Material` asociado.

### Causa raíz

| Síntoma | Causa raíz |
|---|---|
| `proveedor` y `stockActual` ausentes del JSON | `mapToResponseDetail()` en `ProductServiceImpl` nunca llamaba `detail.setProveedor()` ni `detail.setStockActual()`. Jackson no serializa lo que no se setea. |
| N+1 queries en Hibernate | `ProductRepository.searchProducts()` usaba `LEFT JOIN` sin `FETCH`. Hibernate lanzaba selects individuales por cada fila de materiales. |

### Archivos modificados

#### `ProductResponse.java` — DTO

Se añadieron los campos `proveedor` y `stockActual` a la clase interna `ProductMaterialDetail`:

```java
// Clase interna ProductMaterialDetail
private String proveedor;
private Integer stockActual;

public String getProveedor() { return proveedor; }
public void setProveedor(String proveedor) { this.proveedor = proveedor; }
public Integer getStockActual() { return stockActual; }
public void setStockActual(Integer stockActual) { this.stockActual = stockActual; }
```

#### `ProductServiceImpl.java` — Servicio

**Fix serialización** en `mapToResponseDetail()`:

```java
detail.setProveedor(m.getProveedor());       // NUEVO
detail.setStockActual(m.getStockActual());   // NUEVO
```

**Fix N+1** en `getProductById()`:

```java
// ANTES (causa N+1 queries):
Product product = productRepository.findById(id)
        .orElseThrow(...);

// DESPUÉS (una sola consulta con JOIN FETCH):
Product product = productRepository.findByIdWithDetails(id)
        .orElseThrow(...);
```

#### `ProductRepository.java` — Repositorio

**Fix N+1 en listado** — `searchProducts()` con `LEFT JOIN FETCH`:

```java
@Query(value = "SELECT DISTINCT p FROM Product p " +
       "LEFT JOIN FETCH p.materiales pm " +   // NUEVO: FETCH
       "LEFT JOIN FETCH pm.material m " +     // NUEVO: FETCH
       "LEFT JOIN FETCH p.categoria c " +     // NUEVO: FETCH
       "WHERE (:categoriaId IS NULL OR c.id = :categoriaId) AND ...",
       countQuery = "SELECT COUNT(DISTINCT p) FROM Product p " +
       "LEFT JOIN p.materiales pm LEFT JOIN pm.material m ...")
Page<Product> searchProducts(...);
```

**Nuevo método** para carga eficiente de un producto por ID:

```java
@Query("SELECT p FROM Product p " +
       "LEFT JOIN FETCH p.materiales pm " +
       "LEFT JOIN FETCH pm.material m " +
       "LEFT JOIN FETCH p.categoria " +
       "WHERE p.id = :id")
Optional<Product> findByIdWithDetails(@Param("id") UUID id);
```

### Resultado en el JSON tras el fix

```json
{
  "materialesDetalle": [
    {
      "materialId": "...",
      "nombre": "Cartulina",
      "unidad": "hoja",
      "costoVenta": 1500,
      "cantidadSugerida": 5,
      "esOpcional": false,
      "notas": "Preferir gruesa",
      "proveedor": "Papelería Central",
      "stockActual": 200,
      "categoriaMaterial": "Papelería"
    }
  ]
}
```

---

## 3. Fix 2 — Sesión colgada, token expirado y carga del catálogo

### Problema original

1. **Sesión "bugeada"**: Angular restauraba la sesión desde `localStorage` sin comprobar si el token había expirado → la app arrancaba como "autenticada" con un token inútil.
2. **Catálogo no cargaba**: El interceptor enviaba el token expirado incluso en rutas públicas (`GET /api/products`). El `JwtFilter` de Spring lo rechazaba con **401** aunque la ruta fuera `permitAll()`.
3. **Sin auto-logout en 401**: El frontend no limpiaba la sesión ante un 401 del backend.

### Cómo funciona la sesión (antes y después)

```
LOGIN EXITOSO
     │
     ▼
AuthService.saveSession(response)
     ├── localStorage.setItem('auth_token', token)
     ├── localStorage.setItem('auth_email', email)
     ├── localStorage.setItem('auth_role', role)
     └── localStorage.setItem('auth_nombre', nombre)

AL RECARGAR LA APP → AuthService.loadSession()
     │
     ├── ANTES: restauraba sesión sin verificar expiración  ← BUG
     │
     └── AHORA: llama a isTokenExpired(token)
              ├── Token VÁLIDO  → restaura BehaviorSubject → app autenticada ✅
              └── Token EXPIRADO → logout() → limpia storage → app sin sesión ✅
```

### Archivos modificados

#### `auth.service.ts` — 4 cambios

**1. `loadSession()` — verifica expiración al iniciar la app:**

```typescript
loadSession(): void {
  const token = this.getToken();
  const email = localStorage.getItem('auth_email');
  const role  = localStorage.getItem('auth_role');
  const nombre = localStorage.getItem('auth_nombre');

  if (token && email && role) {
    if (this.isTokenExpired(token)) {           // NUEVO
      console.warn('Token expirado. Limpiando sesión.');
      this.logout();
      return;
    }
    this.currentUserSubject.next({ id: '', nombre: nombre || '', email, role });
  }
}
```

**2. `isLoggedIn()` — verifica expiración en tiempo real:**

```typescript
isLoggedIn(): boolean {
  const token = this.getToken();
  if (!token) return false;
  if (this.isTokenExpired(token)) {   // NUEVO
    this.logout();
    return false;
  }
  return true;
}
```

**3. `logout()` — ahora también limpia `sessionStorage`:**

```typescript
logout(): void {
  localStorage.removeItem('auth_token');
  localStorage.removeItem('auth_email');
  localStorage.removeItem('auth_role');
  localStorage.removeItem('auth_nombre');
  sessionStorage.clear();               // NUEVO
  this.currentUserSubject.next(null);
}
```

**4. Nuevo método privado `isTokenExpired()`:**

```typescript
private isTokenExpired(token: string): boolean {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return true;
    const payload = JSON.parse(
      atob(parts[1].replace(/-/g, '+').replace(/_/g, '/'))
    );
    if (!payload.exp) return false;          // sin claim exp → no expira
    return Date.now() >= payload.exp * 1000; // exp en segundos → ms
  } catch {
    return true; // token malformado → tratar como expirado
  }
}
```

#### `auth.interceptor.ts` — Interceptor HTTP reescrito

El interceptor es el **único punto** donde Angular adjunta el header `Authorization` a todas las peticiones HTTP salientes. Se reescribió con tres mejoras:

**Mejora 1 — Omitir token en rutas públicas** (evita que un token vencido bloquee el catálogo):

```typescript
const PUBLIC_GET_PATTERNS = [
  /^\/api\/products(\/|$)/,
  /^\/api\/products$/,
];

function isPublicGetRequest(method: string, url: string): boolean {
  if (method.toUpperCase() !== 'GET') return false;
  try {
    const path = new URL(url).pathname;
    return PUBLIC_GET_PATTERNS.some(p => p.test(path));
  } catch { return false; }
}

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const token = localStorage.getItem('auth_token');
  const skipToken = isPublicGetRequest(req.method, req.url);  // NUEVO

  let outReq = req;
  if (token && !skipToken && !req.headers.has('Authorization')) {
    outReq = req.clone({ setHeaders: { Authorization: `Bearer ${token}` } });
  }
  // ...
};
```

**Mejora 2 — Auto-logout al recibir 401:**

```typescript
return next(outReq).pipe(
  catchError((error: HttpErrorResponse) => {
    if (error.status === 401) {
      localStorage.removeItem('auth_token');
      localStorage.removeItem('auth_email');
      localStorage.removeItem('auth_role');
      localStorage.removeItem('auth_nombre');
      sessionStorage.clear();
      if (!req.url.includes('/auth/')) {
        window.location.href = '/'; // redirige al inicio sin bucle
      }
    }
    return throwError(() => error);
  })
);
```

> **¿Por qué excluir `/auth/`?** Si el login falla por credenciales incorrectas (también devuelve 401 o 400), no queremos redirigir al inicio mientras el usuario está en el formulario.

### Flujo del interceptor (diagrama)

```
Petición HTTP saliente
         │
         ▼
¿Es GET /api/products o /api/products/**?
    ├── SÍ  → enviar SIN token (ruta pública) ──────────────────┐
    └── NO  → ¿existe token en localStorage?                    │
              ├── SÍ → añadir Authorization: Bearer <token>     │
              └── NO → enviar sin token                         │
                                                                │
         ┌──────────────────────────────────────────────────────┘
         ▼
     Backend responde
         │
     ¿Status 401?
    ├── SÍ → localStorage.clear() + sessionStorage.clear() → redirect /
    └── NO → propagar respuesta al componente Angular
```

### Limpiar sesión bloqueada manualmente

Abre la consola del navegador (F12) y ejecuta:

```javascript
localStorage.clear(); sessionStorage.clear(); location.reload();
```

Con los cambios implementados, esto ocurre **automáticamente** al detectar token expirado.

---

## 4. Fix 3 — Error UUID vs String en MaterialCategory

### Error exacto

```
ERROR: operator does not exist: uuid = character varying
Query: select mc1_0.id from material_categories mc1_0 where mc1_0.id=?
```

### Causa raíz

La tabla en PostgreSQL define la PK como `UUID`:

```sql
CREATE TABLE material_categories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    nombre VARCHAR(100) NOT NULL UNIQUE,
    ...
);
```

Pero la entidad Java tenía:

```java
@Id
@Column(length = 50)
private String id;   // ← mismatch con UUID de PostgreSQL
```

Hibernate enviaba el parámetro como `character varying`. PostgreSQL no tiene el operador `uuid = varchar` → lanzaba el error en cualquier JOIN con `materials.categoria_id`.

### Archivos modificados

#### `MaterialCategory.java` — Entidad

```java
// ANTES:
@Id
@Column(length = 50)
private String id;

// DESPUÉS:
import java.util.UUID;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;

@Id
@GeneratedValue(strategy = GenerationType.UUID)
private UUID id;
```

Se actualizaron también el constructor, getters y setters para usar `UUID`.

#### `MaterialCategoryRepository.java` — Repositorio

```java
// ANTES:
public interface MaterialCategoryRepository
        extends JpaRepository<MaterialCategory, String>

// DESPUÉS:
import java.util.UUID;
public interface MaterialCategoryRepository
        extends JpaRepository<MaterialCategory, UUID>
```

#### `MaterialServiceImpl.java` — Servicio

El `categoriaId` sigue llegando como `String` desde el JSON del cliente (UUID en formato texto). Se parsea a `UUID` en el punto de uso dentro del servicio:

```java
// ANTES (error en runtime):
materialCategoryRepository.findById(request.getCategoriaId())

// DESPUÉS (correcto):
materialCategoryRepository.findById(UUID.fromString(request.getCategoriaId()))
```

En `mapToResponse()`, se convierte de vuelta a `String` para el DTO:

```java
response.setCategoriaId(material.getCategoria().getId().toString());
```

> **Decisión de diseño:** `MaterialRequest.categoriaId` y `MaterialResponse.categoriaId` se mantienen como `String` porque el JSON siempre representa UUIDs como texto. La conversión entre `String` ↔ `UUID` ocurre solo internamente en el servicio.

---

## 5. Tabla de archivos modificados

| Archivo | Capa | Cambio principal |
|---|---|---|
| `modules/products/dto/ProductResponse.java` | Backend · DTO | Añadidos `proveedor` y `stockActual` a `ProductMaterialDetail` con getters/setters |
| `modules/products/service/impl/ProductServiceImpl.java` | Backend · Service | Mapeo de `proveedor`/`stockActual` en `mapToResponseDetail()` + uso de `findByIdWithDetails()` |
| `modules/products/repository/ProductRepository.java` | Backend · Repository | `LEFT JOIN FETCH` en `searchProducts()` + nuevo método `findByIdWithDetails()` |
| `modules/materials/model/MaterialCategory.java` | Backend · Entity | `String id` → `UUID id` con `@GeneratedValue(GenerationType.UUID)` |
| `modules/materials/repository/MaterialCategoryRepository.java` | Backend · Repository | Tipo genérico `String` → `UUID` |
| `modules/materials/service/impl/MaterialServiceImpl.java` | Backend · Service | `UUID.fromString()` al llamar `findById()` + `.toString()` en `mapToResponse()` |
| `app/services/auth.service.ts` | Frontend · Service | `isTokenExpired()` + validación en `loadSession()` + `isLoggedIn()` + `sessionStorage.clear()` en `logout()` |
| `app/services/auth.interceptor.ts` | Frontend · Interceptor | Skip token en rutas públicas + `catchError` auto-logout en 401 |

---

## 6. Referencia de endpoints consumidos

| Método | Endpoint | JWT requerido | Servicio Angular |
|---|---|---|---|
| `POST` | `/api/auth/login` | ❌ | `AuthService.login()` |
| `POST` | `/api/auth/vendor/login` | ❌ | `AuthService.vendorLogin()` |
| `POST` | `/api/auth/register` | ❌ | `AuthService.register()` |
| `GET` | `/api/products` | ❌ público | `MaquetaService.getProducts()` |
| `GET` | `/api/products/{id}` | ❌ público | `MaquetaService.getProductById()` |
| `POST` | `/api/purchase-requests` | ✅ | `PurchaseRequestService` |
| `GET` | `/api/purchase-requests` | ✅ | `PurchaseRequestService` |
| `POST` | `/api/admin/products` | ✅ VENDEDOR | `MaquetaService.createProduct()` |
| `PUT` | `/api/admin/products/{id}` | ✅ VENDEDOR | `MaquetaService.updateProduct()` |
| `DELETE` | `/api/admin/products/{id}` | ✅ VENDEDOR | `MaquetaService.deleteProduct()` |

### Configuración CORS activa en `SecurityConfig.java`

```java
configuration.setAllowedOrigins(List.of(
    "http://localhost:4200",   // Angular dev server ← el que se usa
    "http://localhost:5173",
    "http://localhost:3000"
));
configuration.setAllowedMethods(List.of("GET","POST","PUT","DELETE","OPTIONS","PATCH"));
configuration.setAllowedHeaders(List.of("Authorization","Content-Type","Cache-Control",...));
configuration.setAllowCredentials(true);
```

### Rutas públicas declaradas en `SecurityConfig`

```java
.requestMatchers("/api/auth/**").permitAll()
.requestMatchers(HttpMethod.GET, "/api/products", "/api/products/**").permitAll()
.anyRequest().authenticated()
```

> **Nota crítica:** Aunque `/api/products` es `permitAll()`, si el `JwtFilter` recibe un token
> con formato **inválido o expirado** en el header `Authorization`, puede rechazarlo con 401
> **antes** de evaluar las reglas de autorización. Por eso el interceptor Angular omite el token
> en esas rutas cuando el usuario tiene una sesión colgada.
