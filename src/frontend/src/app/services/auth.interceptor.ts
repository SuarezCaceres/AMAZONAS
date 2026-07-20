import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, throwError, from, switchMap, of } from 'rxjs';
import { ClerkService } from './clerk.service';

// Rutas públicas que NO deben llevar el token en la cabecera.
// Si el backend recibe un token expirado/invalido incluso en rutas permitidas,
// el JwtFilter lo rechaza antes de llegar a la capa de autorizacion.
const PUBLIC_REQUESTS = [
  { method: 'GET', pattern: /^\/api\/products(\/|$)/ },
  { method: 'GET', pattern: /^\/api\/categories(\/|$)/ },
  { method: 'GET', pattern: /^\/api\/admin\/materials(\/|$)/ },
  { method: 'GET', pattern: /^\/api\/admin\/material-categories(\/|$)/ },
  { method: 'POST', pattern: /^\/api\/products\/classify-intent(\/|$)/ }
];

function isPublicRequest(method: string, url: string): boolean {
  try {
    let path = url;
    if (url.includes('://')) {
      path = new URL(url).pathname;
    } else {
      path = url.split('?')[0].split('#')[0];
    }
    return PUBLIC_REQUESTS.some(route => 
      route.method === method.toUpperCase() && route.pattern.test(path)
    );
  } catch {
    return false;
  }
}

/**
 * Obtiene el token de Clerk con un mecanismo de reintento.
 *
 * Clerk puede devolver null momentáneamente si el SDK está realizando
 * un token refresh silencioso (ocurre cada ~60 s). En ese caso esperamos
 * 500 ms y reintentamos una vez antes de rendirnos.
 *
 * Sin este retry existía una condición de carrera: la Op-2 (multipart/FormData)
 * se ejecutaba justo durante el refresh y la request llegaba al backend sin
 * cabecera Authorization, provocando el 403 Forbidden en /api/files/upload.
 */
function getTokenWithRetry(clerkService: ClerkService): Promise<string | null> {
  return clerkService.getToken().then(token => {
    if (token) return token;

    // Token nulo en el primer intento — esperar 500 ms y reintentar una vez.
    console.warn('[AuthInterceptor] getToken() retornó null; reintentando en 500 ms...');
    return new Promise<string | null>(resolve =>
      setTimeout(() => clerkService.getToken().then(resolve), 500)
    );
  });
}

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const clerkService = inject(ClerkService);

  // Para rutas publicas de productos: no enviar el token aunque exista.
  // Esto evita que un token expirado/corrupto bloquee la carga del catalogo.
  const skipToken = isPublicRequest(req.method, req.url);

  if (skipToken || req.headers.has('Authorization')) {
    return next(req);
  }

  return from(getTokenWithRetry(clerkService)).pipe(
    switchMap(token => {
      if (!token) {
        // Después del retry sigue sin token: no enviar la request sin auth.
        // Retornar un error descriptivo para que el componente pueda manejarlo.
        console.error('[AuthInterceptor] No se pudo obtener el token de Clerk tras el reintento. Request abortada:', req.url);
        return throwError(() => new Error('Token de autenticación no disponible. Por favor, recarga la página.'));
      }

      // Intentar obtener el email primero de sessionStorage.
      // Si está vacío (p.ej. durante un refresh de token), obtenerlo directamente del SDK de Clerk como fallback.
      let email = sessionStorage.getItem('auth_email') || '';
      if (!email) {
        const clerkUser = clerkService.user$.getValue();
        email = clerkUser?.primaryEmailAddress?.emailAddress || '';
        if (email) {
          // Re-sincronizar sessionStorage para las próximas peticiones
          sessionStorage.setItem('auth_email', email);
          console.warn('[AuthInterceptor] auth_email vacío en sessionStorage, recuperado desde Clerk SDK:', email);
        }
      }

      let name = sessionStorage.getItem('auth_nombre') || '';
      if (!name) {
        const clerkUser = clerkService.user$.getValue();
        name = clerkUser?.username || clerkUser?.fullName || clerkUser?.firstName || email;
        if (name) {
          sessionStorage.setItem('auth_nombre', name);
        }
      }

      console.log('[AuthInterceptor] Adjuntando headers para:', req.url, '| Email:', email || '(VACÍO!)');

      const headers: { [key: string]: string } = {
        Authorization: `Bearer ${token}`
      };
      if (email) {
        headers['X-User-Email'] = email;
      }
      if (name) {
        headers['X-User-Name'] = name;
      }

      const outReq = req.clone({ setHeaders: headers });
      return next(outReq);
    }),
    catchError((error: HttpErrorResponse) => {
      // Si el backend responde 401/403, el token es invalido o expiro o no tiene permisos.
      // Solicitamos cerrar sesión en Clerk SOLO para endpoints de autenticación reales,
      // no para errores de subida de archivos u otras operaciones.
      if (error.status === 401 || error.status === 403) {
        console.warn("[AuthInterceptor] Sesión caducada o inválida. Redirigiendo al login...");
        // Solo cerrar sesión si NO es una subida de archivo (evitar logout por fallos de upload)
        const isFileUpload = req.url.includes('/files/upload');
        if (!isFileUpload) {
          from(clerkService.signOut()).subscribe();
          if (!req.url.includes('/auth/')) {
            window.location.href = '/';
          }
        } else {
          console.error('[AuthInterceptor] Fallo de autenticación en subida de archivo. No cerrando sesión.');
        }
      } else if (error.status === 0) {
        // ClientAbort, Timeout o backend caído -> NO matar sesión
        console.error("[AuthInterceptor] Error de red: El servidor tardó demasiado o la conexión se interrumpió.", error);
      } else if (error.status >= 500) {
        // Error interno del backend -> NO matar sesión
        console.error("[AuthInterceptor] Error en el backend:", error.message);
      }
      return throwError(() => error);
    })
  );
};
