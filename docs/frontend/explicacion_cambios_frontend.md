# Explicación de los Cambios en el Frontend (Guía para Junior Developers) 🚀

¡Hola! Si eres junior o estás conectando tus primeros componentes en este proyecto de Angular, esta guía te explicará de forma muy sencilla **qué** hicimos, **por qué** modificamos ciertos archivos y cómo te beneficia a ti a la hora de programar las pantallas de Login, Catálogo o Formularios.

---

## 1. ¿Por qué centralizamos la URL de la API? (`api.config.ts`)

### ❌ El problema de antes (Hardcoding)
En todos los servicios (`auth.service.ts`, `material.service.ts`, etc.) teníamos escrita la dirección del servidor a mano:
`'http://localhost:8080/api'`

**¿Qué pasa si mañana subimos la aplicación a Internet (producción)?**
Tendríamos que abrir cada uno de los 5 archivos de servicios y cambiar la URL a mano. Si nos olvidamos de uno, la aplicación fallará.

###  La solución
Creamos [api.config.ts](file:///c:/Users/USER/Documents/AMAZONAS/src/frontend/src/app/config/api.config.ts):
```typescript
export const API_BASE_URL = 'http://localhost:8080/api';
```
Ahora, todos los servicios importan esta constante. Si el servidor cambia de dirección, solo se cambia en **un solo lugar** y toda la aplicación se actualiza mágicamente.

---

## 2. ¿Por qué modificamos `app.config.ts`?

`app.config.ts` es el **cerebro de configuración** de tu aplicación Angular. Ahí se definen las herramientas que estarán disponibles para toda la app.

### ⚙️ El cambio que hicimos
Antes teníamos esto:
```typescript
provideHttpClient()
```
Y lo cambiamos por esto:
```typescript
provideHttpClient(withInterceptors([authInterceptor]))
```

**¿Por qué?**
Le estamos diciendo a Angular: *"Oye, activa el cliente HTTP para hacer peticiones al servidor, pero antes de que cada petición salga al internet, pásala obligatoriamente por nuestro filtro llamado `authInterceptor`"*.

---

## 3. ¿Por qué creamos el Interceptor? (`auth.interceptor.ts`)

Imagina que el backend es un club exclusivo. Para entrar a ver tu inventario o crear un presupuesto, necesitas mostrar tu credencial VIP (el **token JWT**).

* **Sin Interceptor:** En cada petición HTTP de cada servicio tendrías que escribir a mano las cabeceras de autorización (`headers: { Authorization: 'Bearer ...' }`). Es aburrido, repetitivo y si se te olvida en una sola pantalla, la API te dará un error `401 Unauthorized`.
* **Con Interceptor:** Funciona como un asistente automático. Cuando haces una petición HTTP, el interceptor se despierta, va al casillero (`localStorage`), saca el token si existe, lo pega en el sobre de la carta (los HTTP Headers) y lo envía al servidor.

**Código del interceptor:**
```typescript
const token = localStorage.getItem('auth_token');
if (token && !req.headers.has('Authorization')) {
  const authReq = req.clone({
    setHeaders: { Authorization: `Bearer ${token}` }
  });
  return next(authReq);
}
```
* **`req.clone(...)`**: Las peticiones en Angular son inmutables (no se pueden modificar directamente). Por eso, hacemos una copia ("clon") de la petición y le añadimos la cabecera `Authorization`.

---

## 4. ¿Por qué en `AuthService` usamos `tap()` en Login y Registro?

En el [auth.service.ts](file:///c:/Users/USER/Documents/AMAZONAS/src/frontend/src/app/services/auth.service.ts), verás que funciones como `login()` o `vendorLogin()` ahora terminan con un `.pipe(tap(...))`:

```typescript
login(request: LoginRequest): Observable<AuthResponse> {
  return this.http.post<AuthResponse>(`${this.API_URL}/login`, request).pipe(
    tap(response => this.saveSession(response))
  );
}
```

### 🧐 ¿Qué es `tap()` de RxJS? (Explicación didáctica)
El operador `tap` es como un **"espía"** o un "observador silencioso" en una tubería de agua. 
* Deja pasar el agua (los datos de respuesta) exactamente igual hacia el componente que se suscribió.
* Pero mientras pasa, aprovecha para hacer una acción secundaria (efecto secundario) sin alterar el flujo de datos.

### 💡 ¿Por qué lo usamos aquí?
Queremos que **el servicio guarde la sesión automáticamente en cuanto el login sea exitoso**.
Gracias a `tap(response => this.saveSession(response))`, cuando el servidor responde con el token:
1. El servicio ejecuta `saveSession()` de forma interna para guardar el token, email y rol en el `localStorage`.
2. Emite el estado a través de `currentUser$`.
3. Y finalmente le entrega la respuesta al componente para que este solo se preocupe por redirigir al usuario (ej: `this.router.navigate(['/home'])`).

### 🛠️ Beneficio para ti (Desarrollador de UI)
Al conectar el formulario de login, tu componente Angular queda súper limpio. No necesitas saber cómo se guarda el token en memoria, solo haces esto:

```typescript
// Componente de Login (catalog.component.ts o login.component.ts)
this.authService.login(datos).subscribe({
  next: (respuesta) => {
    // ¡La sesión ya se guardó sola en el localStorage gracias al tap() del servicio!
    // Tú solo te preocupas por redirigir al dashboard:
    this.router.navigate(['/dashboard']);
  },
  error: (err) => console.error("Credenciales incorrectas")
});
```

---

## 📌 Resumen para recordar

| Concepto | Lo que hace | Por qué te ayuda como junior |
|---|---|---|
| **`API_BASE_URL`** | URL centralizada en `api.config.ts`. | Si cambia el servidor, solo modificas un archivo, no cinco. |
| **`app.config.ts`** | Registra el interceptor de peticiones. | Habilita la magia de la inyección de seguridad en toda la app. |
| **`auth.interceptor.ts`** | Pega el token JWT en las cabeceras HTTP de forma invisible. | Te olvidas de programar cabeceras en cada formulario. Es automático. |
| **`tap()` en `AuthService`** | Ejecuta `saveSession()` al recibir respuesta del servidor. | Evita que olvides guardar el token en el navegador tras loguearte. |
| **`currentUser$`** | Estado reactivo del usuario logueado. | Suscríbete en el navbar para saber si mostrar el botón de "Iniciar Sesión" o el de "Cerrar Sesión". |
