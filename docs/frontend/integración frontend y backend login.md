# Documentación de Autenticación y Flujo Automático de Roles

Este documento detalla la arquitectura de conexión entre el frontend de Angular y el backend de Spring Boot, así como la lógica para la detección automática de roles sin necesidad de selección manual.

---

## 1. Arquitectura de Conexión Frontend ↔ Backend

El frontend Angular interactúa con la API REST de Spring Boot a través del protocolo HTTP. Toda la comunicación de sesión está encapsulada en [AuthService](file:///c:/Users/HP%20ELITEBOOK/Documents/amazonas%20antigravity/AMAZONAS/src/frontend/src/app/services/auth.service.ts).

```mermaid
graph TD
    A[Componente Auth HTML/TS] -->|Invoca loginAuto| B[AuthService TS]
    B -->|1. Intento: POST /api/auth/login| C[Backend: Cliente]
    B -->|2. Fallback (Si no existe Cliente): POST /api/auth/vendor/login| D[Backend: Vendedor]
    C -->|Retorna AuthResponse| B
    D -->|Retorna AuthResponse| B
    B -->|Guarda localStorage & Notifica| E[currentUser$ BehaviorSubject]
    E -->|Actualiza Vista / Redirecciona| F[App Component]
```

---

## 2. Implementación de `AuthService` (`auth.service.ts`)

[AuthService](file:///c:/Users/HP%20ELITEBOOK/Documents/amazonas%20antigravity/AMAZONAS/src/frontend/src/app/services/auth.service.ts) expone observables reactivos para controlar el estado de la sesión activa de forma centralizada.

### Métodos Clave

*   **`loginAuto(request: LoginRequest): Observable<AuthResponse>`**:
    Implementa la detección automática mediante cascada/reintento automático:
    1. Llama a `login(request)` (endpoint de Cliente: `/api/auth/login`).
    2. Si tiene éxito, emite la respuesta.
    3. Si falla y el error devuelto contiene la frase `"Usuario no encontrado"` (o `"no encontrado"`), asume que es una cuenta de Vendedor y realiza la llamada a `vendorLogin(request)` (endpoint de Vendedor: `/api/auth/vendor/login`).
    4. Si ambas fallan, o si la primera falla por una contraseña incorrecta, se propaga el error correspondiente a la interfaz.

```typescript
loginAuto(request: LoginRequest): Observable<AuthResponse> {
  return new Observable<AuthResponse>(subscriber => {
    this.login(request).subscribe({
      next: (response) => {
        subscriber.next(response);
        subscriber.complete();
      },
      error: (err) => {
        const errMsg = err?.error?.message || err?.error || '';
        if (typeof errMsg === 'string' && (errMsg.includes('Usuario no encontrado') || errMsg.includes('no encontrado'))) {
          this.vendorLogin(request).subscribe({
            next: (response) => {
              subscriber.next(response);
              subscriber.complete();
            },
            error: (vendorErr) => {
              subscriber.error(vendorErr);
            }
          });
        } else {
          subscriber.error(err);
        }
      }
    });
  });
}
```

*   **`saveSession(auth: AuthResponse): void`**:
    Guarda los datos de sesión en `localStorage`:
    *   `auth_token`: Token JWT.
    *   `auth_email`: Correo del usuario conectado.
    *   `auth_role`: Rol detectado. Si no viene explícito en `AuthResponse`, se intenta decodificar usando `getRoleFromToken()`.
    *   `auth_nombre`: Nombre de pila del usuario.

*   **`getRoleFromToken(token: string): string | null`**:
    Como respaldo, decodifica el payload en base64 del JWT sin usar librerías externas utilizando `atob()` para extraer la propiedad `role` o `roles`.

```typescript
private getRoleFromToken(token: string): string | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const payload = JSON.parse(atob(parts[1].replace(/-/g, '+').replace(/_/g, '/')));
    return payload.role || payload.roles || null;
  } catch (e) {
    console.error('Error decoding JWT token', e);
    return null;
  }
}
```

---

## 3. Conexión del Componente (`auth.ts` y `auth.html`)

### Eliminación del Selector de Rol
Se eliminó la propiedad `isVendor`, el método `toggleRole()` y el contenedor visual `.role-switch` de la vista HTML. La interfaz ahora solicita únicamente **Correo** y **Contraseña**.

### Consumo del Servicio al Iniciar Sesión
Cuando el usuario envía el formulario en la página, se ejecuta `submitLogin()` en [auth.ts](file:///c:/Users/HP%20ELITEBOOK/Documents/amazonas%20antigravity/AMAZONAS/src/frontend/src/app/pages/auth/auth.ts):

```typescript
this.authService.loginAuto(request).subscribe({
  next: (response: AuthResponse) => {
    this.isLoading = false;
    this.successMessage = `Bienvenido, ${response.nombre || response.email}.`;
    
    // Notifica al componente padre (app.ts) que el usuario se ha autenticado
    this.authenticated.emit({
      name: response.nombre || response.email,
      email: response.email,
      password: '',
      role: response.role
    });
  },
  error: (err) => {
    this.isLoading = false;
    this.errorMessage = err?.error?.message || err?.error || 'Correo o contraseña incorrectos.';
  }
});
```

---

## 4. Gestión de Redirección Automática por Rol (`app.ts`)

En el componente raíz [app.ts](file:///c:/Users/HP%20ELITEBOOK/Documents/amazonas%20antigravity/AMAZONAS/src/frontend/src/app/app.ts), al recibir el evento `authenticated` emitido por el Login, se ejecuta `completeLogin()` que redirige al usuario según el rol almacenado en `localStorage` o en el evento de éxito:

```typescript
completeLogin(user: SessionUser & { role?: string }): void {
  this.currentUser = {
    name: user.name,
    email: user.email
  };
  this.accessNotice = '';

  const role = user.role || this.authService.getUserRole();
  if (role === 'ADMIN') {
    this.page = 'vendedor';  // Carga la sección/panel del vendedor
  } else {
    this.showCatalog();      // Carga el catálogo general de clientes
  }
}
```
