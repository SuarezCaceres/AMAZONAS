import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, throwError, from, switchMap } from 'rxjs';
import { ClerkService } from './clerk.service';

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
  const clerkService = inject(ClerkService);

  // Para rutas publicas de productos: no enviar el token aunque exista.
  // Esto evita que un token expirado/corrupto bloquee la carga del catalogo.
  const skipToken = isPublicGetRequest(req.method, req.url);

  if (skipToken || req.headers.has('Authorization')) {
    return next(req);
  }

  return from(clerkService.getToken()).pipe(
    switchMap(token => {
      let outReq = req;
      if (token) {
        const email = sessionStorage.getItem('auth_email') || '';
        const name = sessionStorage.getItem('auth_nombre') || '';
        const headers: { [key: string]: string } = {
          Authorization: `Bearer ${token}`
        };
        if (email) {
          headers['X-User-Email'] = email;
        }
        if (name) {
          headers['X-User-Name'] = name;
        }
        outReq = req.clone({
          setHeaders: headers
        });
      }
      return next(outReq);
    }),
    catchError((error: HttpErrorResponse) => {
      // Si el backend responde 401, el token es invalido o expiro.
      // Solicitamos cerrar sesión en Clerk.
      if (error.status === 401) {
        from(clerkService.signOut()).subscribe();
        if (!req.url.includes('/auth/')) {
          window.location.href = '/';
        }
      }
      return throwError(() => error);
    })
  );
};
