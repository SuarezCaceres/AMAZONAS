# Documentación — Capa de Servicios del Frontend Angular

## Estructura de Carpetas Implementada

```
src/frontend/src/app/
├── config/                              ← Configuración general de la app
│   └── api.config.ts                    ← URL base centralizada de la API (localhost:8080/api)
│
├── models/                              ← Interfaces TypeScript (contratos de datos)
│   ├── auth.model.ts                    ← Autenticación
│   ├── product.model.ts                 ← Productos / Maquetas
│   ├── material.model.ts                ← Materiales del inventario
│   ├── purchase-request.model.ts        ← Solicitudes de compra
│   └── budget.model.ts                  ← Presupuestos
│
├── services/                            ← Servicios Angular (comunicación con el API)
│   ├── auth.service.ts                  ← Endpoints de auth + gestión de sesión reactiva
│   ├── auth.interceptor.ts              ← Interceptor funcional para adjuntar token JWT
│   ├── maqueta.service.ts               ← 5 endpoints de productos
│   ├── material.service.ts              ← 6 endpoints de materiales
│   ├── purchase-request.service.ts      ← 5 endpoints de solicitudes
│   └── budget.service.ts                ← 3 endpoints de presupuestos
```

---

## ¿Por qué esta organización?

### Principio: **Un archivo de modelo y un servicio por módulo del backend**

Cada módulo del backend Spring Boot (auth, products, materials, requests, budgets) tiene su propio controller con sus DTOs. En el frontend, replicamos esa misma separación para:

1. **Mantenibilidad**: Si el equipo de backend cambia un campo en `MaterialResponse.java`, solo tocas [material.model.ts](file:///c:/Users/USER/Documents/AMAZONAS/src/frontend/src/app/models/material.model.ts) — no un archivo gigante con todos los modelos mezclados.
2. **Responsabilidad única**: Cada servicio hace UNA cosa: gestionar la comunicación HTTP con su módulo correspondiente.
3. **Imports limpios**: Los componentes Angular solo importan lo que necesitan (`import { Material } from '../models/material.model'`), no un archivo monolítico.

---

## Detalle por Archivo

---

### 📁 `models/` — Interfaces TypeScript

---

#### [auth.model.ts](file:///c:/Users/USER/Documents/AMAZONAS/src/frontend/src/app/models/auth.model.ts)

**¿Qué contiene?**
Interfaces que mapean los DTOs de autenticación del backend.

**¿Por qué se creó?**
Anteriormente todas las interfaces de auth estaban mezcladas dentro de `product.model.ts`. Se separaron para mantener la convención de un modelo por módulo.

| Interfaz | Mapea DTO del backend | Se usa en |
|----------|----------------------|-----------|
| `LoginRequest` | [LoginRequest.java](file:///c:/Users/USER/Documents/AMAZONAS/src/backend/src/main/java/com/amazonas/backend/modules/auth/dto/LoginRequest.java) | `AuthService.login()` |
| `LoginVendorRequest` | [LoginVendorRequest.java](file:///c:/Users/USER/Documents/AMAZONAS/src/backend/src/main/java/com/amazonas/backend/modules/auth/dto/LoginVendorRequest.java) | `AuthService.vendorLogin()` |
| `RegisterRequest` | [RegisterRequest.java](file:///c:/Users/USER/Documents/AMAZONAS/src/backend/src/main/java/com/amazonas/backend/modules/auth/dto/RegisterRequest.java) | `AuthService.register()` / `registerVendor()` |
| `AuthResponse` | [AuthResponse.java](file:///c:/Users/USER/Documents/AMAZONAS/src/backend/src/main/java/com/amazonas/backend/modules/auth/dto/AuthResponse.java) | Respuesta de login/registro |
| `CurrentUserResponse` | [CurrentUserResponse.java](file:///c:/Users/USER/Documents/AMAZONAS/src/backend/src/main/java/com/amazonas/backend/modules/auth/dto/CurrentUserResponse.java) | `AuthService.getVendorProfile()` |

---

#### [product.model.ts](file:///c:/Users/USER/Documents/AMAZONAS/src/frontend/src/app/models/product.model.ts)

**¿Qué contiene?**
Interfaces para productos del catálogo (maquetas).

**¿Por qué se creó?**
Es el modelo original del proyecto que mapea los endpoints públicos del catálogo y los endpoints admin de gestión de productos.

| Interfaz | Mapea DTO del backend | Se usa en |
|----------|----------------------|-----------|
| `Product` | [ProductResponse.java](file:///c:/Users/USER/Documents/AMAZONAS/src/backend/src/main/java/com/amazonas/backend/modules/products/dto/ProductResponse.java) | Respuesta de `getProducts()`, `getProductById()` |
| `RelatedProduct` | `ProductResponse.RelatedProduct` (nested class) | Propiedad `relacionados` dentro de `Product` |
| `ProductRequest` | [ProductRequest.java](file:///c:/Users/USER/Documents/AMAZONAS/src/backend/src/main/java/com/amazonas/backend/modules/products/dto/ProductRequest.java) | `createProduct()`, `updateProduct()` |
| `PageResponse<T>` | Spring Data `Page<T>` | Respuesta paginada de `getProducts()` |

---

#### [material.model.ts](file:///c:/Users/USER/Documents/AMAZONAS/src/frontend/src/app/models/material.model.ts) 🆕

**¿Qué contiene?**
Interfaces para el inventario de materiales (carton, madera, pintura, etc.).

**¿Por qué se creó?**
El `git pull` trajo un nuevo módulo `materials` con su [MaterialController.java](file:///c:/Users/USER/Documents/AMAZONAS/src/backend/src/main/java/com/amazonas/backend/modules/materials/controller/MaterialController.java) que expone 6 endpoints. Se necesitaba un modelo y servicio frontend correspondiente.

| Interfaz | Mapea DTO del backend | Se usa en |
|----------|----------------------|-----------|
| `Material` | [MaterialResponse.java](file:///c:/Users/USER/Documents/AMAZONAS/src/backend/src/main/java/com/amazonas/backend/modules/materials/dto/MaterialResponse.java) | Respuesta de `getAllMaterials()`, `getMaterialById()` |
| `MaterialRequest` | [MaterialRequest.java](file:///c:/Users/USER/Documents/AMAZONAS/src/backend/src/main/java/com/amazonas/backend/modules/materials/dto/MaterialRequest.java) | `createMaterial()`, `updateMaterial()` |
| `MaterialCategory` | [MaterialCategory.java](file:///c:/Users/USER/Documents/AMAZONAS/src/backend/src/main/java/com/amazonas/backend/modules/materials/model/MaterialCategory.java) (entidad directa) | `getAllMaterialCategories()` |

---

#### [purchase-request.model.ts](file:///c:/Users/USER/Documents/AMAZONAS/src/frontend/src/app/models/purchase-request.model.ts) 🆕

**¿Qué contiene?**
Interfaces para las solicitudes de compra, incluyendo los 3 flujos del Figma (maqueta ya hecha, kit, personalización) y todos los sub-DTOs de materiales.

**¿Por qué se creó?**
El `git pull` trajo el módulo `requests` con [PurchaseRequestController.java](file:///c:/Users/USER/Documents/AMAZONAS/src/backend/src/main/java/com/amazonas/backend/modules/requests/controller/PurchaseRequestController.java) que expone 5 endpoints. Este módulo tiene la mayor complejidad del proyecto: 11 DTOs en total.

| Interfaz | Mapea DTO del backend |
|----------|----------------------|
| `EstadoSolicitud` | [EstadoSolicitud.java](file:///c:/Users/USER/Documents/AMAZONAS/src/backend/src/main/java/com/amazonas/backend/modules/requests/enums/EstadoSolicitud.java) (enum) |
| `PurchaseRequestRequest` | [PurchaseRequestRequest.java](file:///c:/Users/USER/Documents/AMAZONAS/src/backend/src/main/java/com/amazonas/backend/modules/requests/dto/PurchaseRequestRequest.java) |
| `PurchaseRequestResponse` | [PurchaseRequestResponse.java](file:///c:/Users/USER/Documents/AMAZONAS/src/backend/src/main/java/com/amazonas/backend/modules/requests/dto/PurchaseRequestResponse.java) |
| `UpdateEstadoRequest` | [UpdateEstadoRequest.java](file:///c:/Users/USER/Documents/AMAZONAS/src/backend/src/main/java/com/amazonas/backend/modules/requests/dto/UpdateEstadoRequest.java) |
| `KitMaquetaRequest` / `Response` | Kit de maquetas (flujo 2) |
| `KitCustomizedMaterialRequest` / `Response` | Materiales del inventario seleccionados (flujo 3) |
| `KitPersonalMaterialRequest` / `Response` | Materiales libres escritos por el cliente (flujo 3) |
| `RequestPreferredMaterialRequest` / `Response` | Materiales preferidos por el cliente |

---

#### [budget.model.ts](file:///c:/Users/USER/Documents/AMAZONAS/src/frontend/src/app/models/budget.model.ts) 🆕

**¿Qué contiene?**
Interfaces para presupuestos, sus items de materiales y el servicio de explicación opcional.

**¿Por qué se creó?**
El `git pull` trajo el módulo `budgets` con [BudgetController.java](file:///c:/Users/USER/Documents/AMAZONAS/src/backend/src/main/java/com/amazonas/backend/modules/budgets/controller/BudgetController.java) que expone 3 endpoints.

| Interfaz | Mapea DTO del backend |
|----------|----------------------|
| `BudgetRequest` | [BudgetRequest.java](file:///c:/Users/USER/Documents/AMAZONAS/src/backend/src/main/java/com/amazonas/backend/modules/budgets/dto/BudgetRequest.java) |
| `BudgetResponse` | [BudgetResponse.java](file:///c:/Users/USER/Documents/AMAZONAS/src/backend/src/main/java/com/amazonas/backend/modules/budgets/dto/BudgetResponse.java) |
| `BudgetItemRequest` / `Response` | Items individuales del presupuesto |
| `BudgetExplanationServiceRequest` / `Response` | Servicio de explicación asociado |

---

### 📁 `services/` — Servicios Angular

---

#### [auth.service.ts](file:///c:/Users/USER/Documents/AMAZONAS/src/frontend/src/app/services/auth.service.ts)

**¿Qué hace?** Gestiona autenticación: registro, login y consulta de perfil.
**URL Base:** `${API_BASE_URL}/auth`
**Controller backend:** [AuthController.java](file:///c:/Users/USER/Documents/AMAZONAS/src/backend/src/main/java/com/amazonas/backend/modules/auth/controller/AuthController.java)

| Método Angular | HTTP | Ruta backend | Acceso |
|----------------|------|-------------|--------|
| `register()` | POST | `/api/auth/register` | Público |
| `registerVendor()` | POST | `/api/auth/vendor/register` | Público |
| `login()` | POST | `/api/auth/login` | Público |
| `vendorLogin()` | POST | `/api/auth/vendor/login` | Público |
| `getVendorProfile()` | GET | `/api/auth/vendor/me` | JWT |

---

#### [maqueta.service.ts](file:///c:/Users/USER/Documents/AMAZONAS/src/frontend/src/app/services/maqueta.service.ts)

**¿Qué hace?** CRUD de productos/maquetas del catálogo.
**URL Base:** `${API_BASE_URL}`
**Controller backend:** [ProductController.java](file:///c:/Users/USER/Documents/AMAZONAS/src/backend/src/main/java/com/amazonas/backend/modules/products/controller/ProductController.java)

| Método Angular | HTTP | Ruta backend | Acceso |
|----------------|------|-------------|--------|
| `getProducts()` | GET | `/api/products?category&search&page&size` | Público |
| `getProductById()` | GET | `/api/products/{id}` | Público |
| `createProduct()` | POST | `/api/admin/products` | Admin/JWT |
| `updateProduct()` | PUT | `/api/admin/products/{id}` | Admin/JWT |
| `deleteProduct()` | DELETE | `/api/admin/products/{id}` | Admin/JWT |

---

#### [material.service.ts](file:///c:/Users/USER/Documents/AMAZONAS/src/frontend/src/app/services/material.service.ts) 🆕

**¿Qué hace?** CRUD de materiales del inventario + listado de categorías de materiales.
**URL Base:** `${API_BASE_URL}/admin`
**Controller backend:** [MaterialController.java](file:///c:/Users/USER/Documents/AMAZONAS/src/backend/src/main/java/com/amazonas/backend/modules/materials/controller/MaterialController.java)

| Método Angular | HTTP | Ruta backend | Acceso |
|----------------|------|-------------|--------|
| `getAllMaterials()` | GET | `/api/admin/materials` | Admin/JWT |
| `getMaterialById()` | GET | `/api/admin/materials/{id}` | Admin/JWT |
| `createMaterial()` | POST | `/api/admin/materials` | Admin/JWT |
| `updateMaterial()` | PUT | `/api/admin/materials/{id}` | Admin/JWT |
| `deleteMaterial()` | DELETE | `/api/admin/materials/{id}` | Admin/JWT |
| `getAllMaterialCategories()` | GET | `/api/admin/material-categories` | Admin/JWT |

---

#### [purchase-request.service.ts](file:///c:/Users/USER/Documents/AMAZONAS/src/frontend/src/app/services/purchase-request.service.ts) 🆕

**¿Qué hace?** Gestión de solicitudes de compra (3 flujos: maqueta ya hecha, kit, personalización).
**URL Base:** `${API_BASE_URL}`
**Controller backend:** [PurchaseRequestController.java](file:///c:/Users/USER/Documents/AMAZONAS/src/backend/src/main/java/com/amazonas/backend/modules/requests/controller/PurchaseRequestController.java)

| Método Angular | HTTP | Ruta backend | Acceso |
|----------------|------|-------------|--------|
| `crear()` | POST | `/api/purchase-requests` | JWT (cliente) |
| `listarMisSolicitudes()` | GET | `/api/purchase-requests/my` | JWT (cliente) |
| `obtenerPorId()` | GET | `/api/purchase-requests/{id}` | JWT (cliente) |
| `listarTodas()` | GET | `/api/admin/purchase-requests?estado=X` | Admin/JWT |
| `actualizarEstado()` | PUT | `/api/admin/purchase-requests/{id}/status` | Admin/JWT |

---

#### [budget.service.ts](file:///c:/Users/USER/Documents/AMAZONAS/src/frontend/src/app/services/budget.service.ts) 🆕

**¿Qué hace?** Gestión de presupuestos asociados a solicitudes de compra.
**URL Base:** `${API_BASE_URL}`
**Controller backend:** [BudgetController.java](file:///c:/Users/USER/Documents/AMAZONAS/src/backend/src/main/java/com/amazonas/backend/modules/budgets/controller/BudgetController.java)

| Método Angular | HTTP | Ruta backend | Acceso |
|----------------|------|-------------|--------|
| `obtenerPorSolicitud()` | GET | `/api/budgets/by-request/{solicitudId}` | JWT (cliente/admin) |
| `crear()` | POST | `/api/admin/budgets` | Admin/JWT |
| `actualizar()` | PUT | `/api/admin/budgets/{id}` | Admin/JWT |

---

## Verificación Cruzada: Backend vs Frontend

### ✅ AuthController (5/5 endpoints cubiertos)

| # | Backend endpoint | Método en servicio | Estado |
|---|------------------|--------------------|--------|
| 1 | `POST /api/auth/register` | `AuthService.register()` | ✅ |
| 2 | `POST /api/auth/vendor/register` | `AuthService.registerVendor()` | ✅ |
| 3 | `POST /api/auth/login` | `AuthService.login()` | ✅ |
| 4 | `POST /api/auth/vendor/login` | `AuthService.vendorLogin()` | ✅ |
| 5 | `GET /api/auth/vendor/me` | `AuthService.getVendorProfile()` | ✅ |

### ✅ ProductController (5/5 endpoints cubiertos)

| # | Backend endpoint | Método en servicio | Estado |
|---|------------------|--------------------|--------|
| 1 | `GET /api/products` | `MaquetaService.getProducts()` | ✅ |
| 2 | `GET /api/products/{id}` | `MaquetaService.getProductById()` | ✅ |
| 3 | `POST /api/admin/products` | `MaquetaService.createProduct()` | ✅ |
| 4 | `PUT /api/admin/products/{id}` | `MaquetaService.updateProduct()` | ✅ |
| 5 | `DELETE /api/admin/products/{id}` | `MaquetaService.deleteProduct()` | ✅ |

### ✅ MaterialController (6/6 endpoints cubiertos)

| # | Backend endpoint | Método en servicio | Estado |
|---|------------------|--------------------|--------|
| 1 | `GET /api/admin/materials` | `MaterialService.getAllMaterials()` | ✅ |
| 2 | `GET /api/admin/materials/{id}` | `MaterialService.getMaterialById()` | ✅ |
| 3 | `POST /api/admin/materials` | `MaterialService.createMaterial()` | ✅ |
| 4 | `PUT /api/admin/materials/{id}` | `MaterialService.updateMaterial()` | ✅ |
| 5 | `DELETE /api/admin/materials/{id}` | `MaterialService.deleteMaterial()` | ✅ |
| 6 | `GET /api/admin/material-categories` | `MaterialService.getAllMaterialCategories()` | ✅ |

### ✅ PurchaseRequestController (5/5 endpoints cubiertos)

| # | Backend endpoint | Método en servicio | Estado |
|---|------------------|--------------------|--------|
| 1 | `POST /api/purchase-requests` | `PurchaseRequestService.crear()` | ✅ |
| 2 | `GET /api/purchase-requests/my` | `PurchaseRequestService.listarMisSolicitudes()` | ✅ |
| 3 | `GET /api/purchase-requests/{id}` | `PurchaseRequestService.obtenerPorId()` | ✅ |
| 4 | `GET /api/admin/purchase-requests` | `PurchaseRequestService.listarTodas()` | ✅ |
| 5 | `PUT /api/admin/purchase-requests/{id}/status` | `PurchaseRequestService.actualizarEstado()` | ✅ |

### ✅ BudgetController (3/3 endpoints cubiertos)

| # | Backend endpoint | Método en servicio | Estado |
|---|------------------|--------------------|--------|
| 1 | `GET /api/budgets/by-request/{solicitudId}` | `BudgetService.obtenerPorSolicitud()` | ✅ |
| 2 | `POST /api/admin/budgets` | `BudgetService.crear()` | ✅ |
| 3 | `PUT /api/admin/budgets/{id}` | `BudgetService.actualizar()` | ✅ |

---

## 3. Preparación de Integración Inmediata (Listo para Conectar)

Para facilitar la conexión del frontend y que el equipo de UI trabaje sin fricción, hemos implementado tres herramientas clave de arquitectura limpia:

### ⚙️ Configuración Centralizada de la API — [api.config.ts](file:///c:/Users/USER/Documents/AMAZONAS/src/frontend/src/app/config/api.config.ts)
Evita tener la URL de la API hardcodeada en múltiples archivos. Si la URL del servidor cambia en producción, solo se edita en este archivo:
```typescript
export const API_BASE_URL = 'http://localhost:8080/api';
```

### 🔒 Interceptor de Token JWT — [auth.interceptor.ts](file:///c:/Users/USER/Documents/AMAZONAS/src/frontend/src/app/services/auth.interceptor.ts)
Intercepta automáticamente cualquier solicitud HTTP saliente y le inyecta la cabecera `Authorization: Bearer <jwt>` si existe un token en el almacenamiento local.
* **Activado en:** `app.config.ts` usando `provideHttpClient(withInterceptors([authInterceptor]))`.
* **Beneficio:** Los desarrolladores no tienen que preocuparse por adjuntar headers de autenticación manualmente en cada llamada HTTP.

### 👥 Gestión Reactiva del Usuario — [auth.service.ts](file:///c:/Users/USER/Documents/AMAZONAS/src/frontend/src/app/services/auth.service.ts)
El servicio de autenticación ahora incluye control de estado reactivo y persistencia automática en el `localStorage`:
* `currentUser$` (Observable): Emite el usuario autenticado y su rol actual. Ideal para mostrar/ocultar botones en el Navbar (ej: ocultar la vista de Vendedor si el rol es CLIENTE).
* `saveSession(auth: AuthResponse)`: Guarda automáticamente el token, email y rol en el navegador.
* `logout()`: Borra la sesión y notifica a la aplicación para redirigir al usuario.
* `isLoggedIn()`: Devuelve si hay un usuario logueado en el momento.

---

## Resultado de la Auditoría

> [!NOTE]
> **24/24 endpoints cubiertos al 100%** — No falta ningún método en ningún servicio.

> [!IMPORTANT]
> **Patrón utilizado en todos los servicios:**
> - `@Injectable({ providedIn: 'root' })` → Singleton automático, no necesitas declararlo en ningún módulo.
> - `inject(HttpClient)` → Inyección funcional moderna de Angular v15+.
> - Cada método retorna un `Observable<T>` tipado con la interfaz correcta.
> - URL base tomada dinámicamente de `API_BASE_URL`.

> [!TIP]
> **Siguiente paso recomendado para los del front:**
> En sus componentes Angular, simplemente inyectan `AuthService` para loguear al usuario. Al recibir la respuesta exitosa, `AuthService` guarda el token, y a partir de ese momento, cualquier llamada a `MaterialService`, `PurchaseRequestService` o `BudgetService` llevará el token de forma 100% automática y transparente gracias al interceptor.
