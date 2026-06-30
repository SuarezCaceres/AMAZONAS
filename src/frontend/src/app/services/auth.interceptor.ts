import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, throwError } from 'rxjs';

// Rutas publicas que NO deben llevar el token en la cabecera.
// Si el backend recibe un token expirado/invalido incluso en rutas permitidas,
// el JwtFilter lo rechaza antes de llegar a la capa de autorizacion.
const PUBLIC_GET_PATTERNS = [
  /^\/api\/products(\/|$)/,
  /^\/api\/products$/,
  /^\/api\/admin\/materials(\/|$)/,
  /^\/api\/admin\/material-categories(\/|$)/,
];

function isPublicGetRequest(method: string, url: string): boolean {
  if (method.toUpperCase() !== 'GET') return false;
  try {
    const path = new URL(url).pathname;
    return PUBLIC_GET_PATTERNS.some(pattern => pattern.test(path));
  } catch {
    return false;
  }
}

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const token = sessionStorage.getItem('auth_token');

  // Para rutas publicas de productos: no enviar el token aunque exista.
  // Esto evita que un token expirado/corrupto bloquee la carga del catalogo.
  const skipToken = isPublicGetRequest(req.method, req.url);

  let outReq = req;
  if (token && !skipToken && !req.headers.has('Authorization')) {
    outReq = req.clone({
      setHeaders: { Authorization: `Bearer ${token}` }
    });
  }

  return next(outReq).pipe(
    catchError((error: HttpErrorResponse) => {
      // Si el backend responde 401, el token es invalido o expiro.
      // Limpiamos el storage completo y forzamos recarga para restablecer estado limpio.
      if (error.status === 401) {
        sessionStorage.removeItem('auth_token');
        sessionStorage.removeItem('auth_email');
        sessionStorage.removeItem('auth_role');
        sessionStorage.removeItem('auth_nombre');
        sessionStorage.clear();
        // Solo redirigimos si no estamos ya en una peticion de login
        if (!req.url.includes('/auth/')) {
          window.location.href = '/';
        }
      }
      return throwError(() => error);
    })
  );
};
