# Auditoría Técnica de Integración Frontend + Backend (AMAZONAS)

Este documento presenta una auditoría exhaustiva del proyecto, evaluando la arquitectura general, el backend en Spring Boot, el frontend en Angular, la base de datos y los aspectos de seguridad e integración.

---

## 1. Arquitectura General y Estructura

### 🔍 Hallazgos de Estructura y Código Duplicado

#### ⚠️ Duplicidad y Discrepancia de Nombres en Módulos de Backend
* **Ubicación:** 
  * [com.amazonas.backend.modules.vendor](file:///c:/Users/USER/Documents/AMAZONAS/src/backend/src/main/java/com/amazonas/backend/modules/vendor) (Servicios de Dashboard y Estadísticas)
  * [com.amazonas.backend.modules.vendors](file:///c:/Users/USER/Documents/AMAZONAS/src/backend/src/main/java/com/amazonas/backend/modules/vendors) (Entidad y Repositorio de la cuenta del Administrador)
* **Problema:** Separar en dos paquetes con nombres casi idénticos (`vendor` y `vendors`) causa confusión arquitectónica. El primero gestiona estadísticas de ventas del dashboard y el segundo la persistencia de usuarios administradores.
* **Recomendación:** Unificar en un solo módulo `vendor` o renombrar el módulo de estadísticas a `dashboard` o `stats` para diferenciar responsabilidades claramente.

#### ⚠️ Duplicidad de Enlace de Eventos (Event Binding) en Frontend
* **Ubicación:** [app.html](file:///c:/Users/USER/Documents/AMAZONAS/src/frontend/src/app/app.html#L11-L12)
* **Código Actual:**
  ```html
  (loginClicked)="showLogin()"
  (loginClicked)="requestAccess('comprar')"
  ```
* **Problema:** En el componente `<app-header>` se enlaza dos veces consecutivas el mismo evento de salida `(loginClicked)`. Angular ejecutará ambos handlers en paralelo, lo cual genera redirecciones y estados de UI conflictivos (se intenta abrir el login y paralelamente evaluar el acceso de compra).
* **Recomendación:** Mantener una sola suscripción que orqueste la llamada correspondiente o unificar los handlers.

---

## 2. Backend (Spring Boot) y Base de Datos

### 🔴 Vulnerabilidades Críticas de Seguridad (Rutas Desprotegidas)

> [!CAUTION]
> **Vulnerabilidad de Acceso a Endpoints de Administración (Falta de Control de Roles)**
> 
> * **Ubicación:** [SecurityConfig.java](file:///c:/Users/USER/Documents/AMAZONAS/src/backend/src/main/java/com/amazonas/backend/security/config/SecurityConfig.java#L35-L46)
> * **Problema:** 
>   1. La ruta `/api/admin/purchase-requests/**` está configurada como `.permitAll()`. Esto permite que **cualquier usuario no autenticado** (público general) liste todas las solicitudes de compra del negocio, altere estados de compras o acceda a información privada de clientes.
>   2. La ruta `/api/admin/files/upload` (subida de archivos a Cloudinary) está expuesta públicamente con `.permitAll()`, lo que facilita que agentes maliciosos abusen del almacenamiento y aumenten los costos de Cloudinary.
>   3. Los endpoints de `/api/admin/budgets` y `/api/admin/products` se evalúan con `.anyRequest().authenticated()`, permitiendo que **clientes ordinarios (`Role.CLIENT`)** envíen peticiones HTTP POST/PUT/DELETE para crear, modificar o borrar maquetas y presupuestos, ya que no se restringe explícitamente al rol `ADMIN`.

* **Recomendación:** Ajustar la configuración de seguridad para exigir el rol `ADMIN` en todas las rutas administrativas:
  ```java
  .requestMatchers("/api/admin/**").hasAuthority("ADMIN") // O hasRole("ADMIN") si se usa prefijo ROLE_
  ```

#### ⚠️ Inconsistencia en la Mapeación de Autoridades de Spring Security
* **Ubicación:** [User.java](file:///c:/Users/USER/Documents/AMAZONAS/src/backend/src/main/java/com/amazonas/backend/modules/users/model/User.java#L187-L192) y [Vendor.java](file:///c:/Users/USER/Documents/AMAZONAS/src/backend/src/main/java/com/amazonas/backend/modules/vendors/model/Vendor.java#L135-L140)
* **Código:**
  ```java
  @Override
  public Collection<? extends GrantedAuthority> getAuthorities() {
      return List.of(new SimpleGrantedAuthority(role.name())); // Retorna "CLIENT" o "ADMIN"
  }
  ```
* **Problema:** Spring Security, al validar roles con `.hasRole("ADMIN")`, busca la autoridad con el prefijo `ROLE_` (ej. `ROLE_ADMIN`). Al guardar únicamente `ADMIN`, el uso de `.hasRole()` fallará de forma silenciosa.
* **Recomendación:** Cambiar a `new SimpleGrantedAuthority("ROLE_" + role.name())` o en su defecto validar con `.hasAuthority("ADMIN")` en la configuración de seguridad.

---

### 🔍 Desincronización del Esquema de la Base de Datos (Flyway)

> [!WARNING]
> **Esquemas SQL de Migraciones Desactualizados**
> 
> * **Ubicación:** [V1__init_schema.sql](file:///c:/Users/USER/Documents/AMAZONAS/src/backend/src/main/resources/db/migration/V1__init_schema.sql) y [schema.sql](file:///c:/Users/USER/Documents/AMAZONAS/database/schema.sql)
> * **Problema:** Las modificaciones realizadas para soportar la recuperación de contraseñas y el bloqueo de cuentas por fuerza bruta no se agregaron a las migraciones Flyway:
>   * La tabla `users` no contiene las columnas `failed_login_attempts` (entero) ni `lock_until` (timestamp).
>   * La tabla `password_reset_tokens` no está definida en ningún archivo SQL.
>   * Dado que `spring.jpa.hibernate.ddl-auto` está configurado en `none`, cualquier inicialización de base de datos desde cero fallará al ejecutar el servidor al no encontrar estas columnas y tablas en PostgreSQL.

* **Recomendación:** Crear una nueva migración de base de datos Flyway (ej: `V2__add_auth_security_tables.sql`) con el siguiente contenido:
  ```sql
  ALTER TABLE users ADD COLUMN failed_login_attempts INT NOT NULL DEFAULT 0;
  ALTER TABLE users ADD COLUMN lock_until TIMESTAMPTZ;

  CREATE TABLE IF NOT EXISTS password_reset_tokens (
      id UUID PRIMARY KEY,
      token VARCHAR(255) NOT NULL UNIQUE,
      email VARCHAR(150) NOT NULL,
      user_type VARCHAR(50) NOT NULL,
      expiry_date TIMESTAMPTZ NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  );
  ```

---

### 🔍 Falta de Manejo Global de Excepciones

* **Problema:** El backend no cuenta con una clase anotada con `@ControllerAdvice` o métodos `@ExceptionHandler`. Ante un fallo de base de datos, violación de restricciones o error interno inesperado, Spring Boot responde con el stack trace por defecto o páginas de error genéricas que revelan detalles internos del servidor y dificultan el parseo homogéneo de errores en el frontend.
* **Recomendación:** Implementar una clase `GlobalExceptionHandler` para capturar excepciones comunes (`ResponseStatusException`, `MethodArgumentNotValidException`, `Exception`) y responder con un formato JSON unificado.

---

### 🔍 CORS Hardcodeado en Código Fuente
* **Ubicación:** [SecurityConfig.java](file:///c:/Users/USER/Documents/AMAZONAS/src/backend/src/main/java/com/amazonas/backend/security/config/SecurityConfig.java#L52-L67)
* **Problema:** Los orígenes permitidos en la configuración de CORS están escritos estáticamente en Java (`localhost:4200`, `localhost:5173`, `localhost:3000`). Esto bloqueará el consumo del API desde cualquier cliente en producción (ej. Netlify/Vercel) a menos que se recompile el backend.
* **Recomendación:** Leer los orígenes permitidos de forma dinámica utilizando la propiedad `app.frontend-url` (o una lista inyectada en `@Value` desde `application.properties`).

---

## 3. Frontend (Angular) e Integración

### ⚠️ El Frontend Ignora y Enmascara Errores del Servidor

> [!IMPORTANT]
> **Enmascaramiento de Errores Críticos (Bypass de Idempotencia y Errores)**
> 
> * **Ubicación:** [request-form.component.ts](file:///c:/Users/USER/Documents/AMAZONAS/src/frontend/src/app/pages/request-form/request-form.component.ts#L291-L300)
> * **Código en bloque de error de suscripción:**
>   ```typescript
>   error: (err) => {
>     console.error('Error al crear solicitud en el backend', err);
>     const saved = this.getSavedRequests();
>     localStorage.setItem('maquetasRequests', JSON.stringify([request, ...saved]));
>     this.successMessage = 'Solicitud enviada (modo local temporal).';
>     this.submitted.emit(request);
>   }
>   ```
> * **Problema:** Cuando el backend rechaza una solicitud de maqueta (por ejemplo, porque falla la autenticación, faltan datos o el control de idempotencia retorna un `409 Conflict` tras múltiples clics rápidos en menos de 1 minuto), el frontend intercepta el fallo y, en lugar de alertar al usuario del error real, simula un éxito guardando la petición localmente y mostrando: *"Solicitud enviada (modo local temporal)"*. El cliente asume que la compra/personalización fue registrada cuando el servidor la ha rechazado.

* **Recomendación:** Mostrar los errores explícitos del backend para que el usuario sepa que la acción falló y por qué (ej. "Espera 1 minuto antes de enviar otra solicitud idéntica" en caso de conflicto 409).

---

### ⚠️ Incompatibilidad y Errores Consola por Login Fallback
* **Ubicación:** [auth.service.ts](file:///c:/Users/USER/Documents/AMAZONAS/src/frontend/src/app/services/auth.service.ts#L52-L86)
* **Problema:** Para simplificar el login, la función `loginAuto` intenta autenticar al usuario a través del endpoint de clientes `/api/auth/login`. Si el backend responde con un error de "Usuario no encontrado" (porque la cuenta pertenece a un vendedor/administrador), la aplicación inicia una segunda petición consecutiva (fallback) hacia `/api/auth/vendor/login`. Esto genera ruido persistente en la consola del navegador mostrando solicitudes HTTP con estado `401/403` fallidas de manera intencional.
* **Recomendación:** Agregar un selector de rol simple en la vista de login (ej: "Iniciar sesión como Vendedor") para que la aplicación llame directamente al endpoint correcto, o unificar el proceso de login en el backend.

---

### ⚠️ Módulos Incompletos (Placeholders) en el Panel del Vendedor
* **Ubicación:** [navbar-vendedor.component.html](file:///c:/Users/USER/Documents/AMAZONAS/src/frontend/src/app/pages/navbar-vendedor/navbar-vendedor.component.html#L228-L266)
* **Problema:** En el panel administrativo de vendedor, las secciones de **Solicitudes**, **Presupuestos** y **Pagos** son simples bloques vacíos de HTML con el mensaje *"El módulo se construirá en el siguiente paso"*. No obstante, el backend ya expone endpoints completamente funcionales para estas operaciones.
* **Recomendación:** Crear e integrar los componentes de listado/gestión de solicitudes, creación de presupuestos de maquetas, y administración de pagos correspondientes utilizando `PurchaseRequestService` y `BudgetService`.

---

## 4. Resumen de Recomendaciones de Prioridad Alta

| Componente | Vulnerabilidad / Defecto | Gravedad | Acción Recomendada |
| :--- | :--- | :---: | :--- |
| **Backend (Seguridad)** | Rutas `/api/admin/**` desprotegidas o accesibles a todo usuario autenticado. | **ALTA (Crítica)** | Cambiar configuración en `SecurityConfig` para requerir rol `ADMIN` en todas las rutas administrativas. |
| **Base de Datos** | Esquema SQL desincronizado con JPA (sin tablas de tokens ni columnas de intentos fallidos). | **ALTA** | Generar script de migración `V2` en Flyway para crear la tabla de tokens y actualizar la tabla `users`. |
| **Frontend (UX)** | Simulaciones de éxito ante errores HTTP 409 o 400. | **MEDIA-ALTA** | Modificar `RequestFormComponent` para propagar el mensaje de error del backend en lugar de forzar éxito simulado. |
| **Backend (Seguridad)** | Endpoint de subida de archivos `/api/admin/files/upload` abierto de forma pública. | **ALTA** | Exigir autenticación y rol de administrador en `SecurityConfig`. |
| **Arquitectura** | Event bindings duplicados en `app.html` y fallback ruidoso en login. | **BAJA-MEDIA** | Remover binding sobrante en header e implementar selector explícito de login vendedor/cliente. |
