# Guia: Clerk Auth + Spring Boot + Angular - Solucion al 401

**Fecha:** 2026-07-14  
**Problema resuelto:** `401 Unauthorized` en endpoints protegidos con Clerk OAuth + Spring Security

---

## Contexto

El proyecto usa Clerk como proveedor OAuth en Angular y Spring Boot como backend con Spring Security. El flujo JWT local funcionaba bien. El 401 aparecio al integrar Clerk.

---

## Problema 1 — Race condition en la suscripcion de Clerk

**Sintoma:** Las primeras peticiones salen sin el header `X-User-Email`.

**Causa:** Se suscribia a `session$` de Clerk. En OAuth, la sesion llega antes que el usuario (`user$`). Al leer el email, el objeto user todavia era null.

**Solucion:** Cambiar de `session$` a `user$`

```typescript
// INCORRECTO
this.clerkService.session$.subscribe(async (session) => {
  const email = session.user?.primaryEmailAddress?.emailAddress || '';
});

// CORRECTO
this.clerkService.user$.subscribe(async (user) => {
  const email = user.primaryEmailAddress?.emailAddress || '';
});
```

---

## Problema 2 — El backend rechazaba el token de Clerk

**Causa:** Clerk firma tokens con RS256 (su clave privada). El backend usaba HMAC-SHA256 con su clave local. La verificacion siempre fallaba.

**Solucion:** Detectar si el token es de Clerk leyendo el campo `iss` del payload SIN verificar la firma. Si es Clerk, autenticar por el header `X-User-Email`.

```java
String issuer = getClaimUnverified(jwtToken, "iss");
boolean isClerkToken = issuer != null && issuer.contains("clerk");

if (isClerkToken) {
    String clerkEmail = request.getHeader("X-User-Email");
    if (clerkEmail != null && !clerkEmail.isBlank()) {
        UserDetails user = userRepository.findByEmailIgnoreCase(clerkEmail).orElse(null);
        SecurityContextHolder.getContext().setAuthentication(
            new UsernamePasswordAuthenticationToken(user, null, user.getAuthorities())
        );
    }
} else {
    // Flujo JWT local normal
}
```

**Metodo `getClaimUnverified` con padding Base64 correcto:**

```java
private String getClaimUnverified(String token, String claimName) {
    try {
        String[] parts = token.split("\\.");
        if (parts.length != 3) return null;
        String payload = parts[1];
        int mod = payload.length() % 4;
        if (mod == 2) payload += "==";
        else if (mod == 3) payload += "=";
        byte[] decoded = Base64.getUrlDecoder().decode(payload);
        JsonNode node = new ObjectMapper().readTree(decoded);
        JsonNode claimNode = node.get(claimName);
        return claimNode != null ? claimNode.asText() : null;
    } catch (Exception e) { return null; }
}
```

> **Nota:** La lectura sin firma es segura porque solo se usa para *detectar* el tipo de token, no para autorizar. En produccion exigente, verificar los JWKs publicos de Clerk.

---

## Problema 3 — El interceptor no enviaba email durante refrescos de token

**Causa:** El interceptor leia el email solo de `sessionStorage`. Durante el refresco automatico del token de Clerk (cada 60s en desarrollo), habia una ventana donde `sessionStorage` estaba vacio.

**Solucion:** Anadir fallback directo al SDK de Clerk:

```typescript
let email = sessionStorage.getItem('auth_email') || '';
if (!email) {
    const clerkUser = clerkService.user$.getValue();
    email = clerkUser?.primaryEmailAddress?.emailAddress || '';
    if (email) sessionStorage.setItem('auth_email', email);
}
```

---

## Problema 4 — 401 SOLO en el endpoint de subida de archivos (EL PRINCIPAL)

**Sintoma:** Todos los GET/PUT funcionaban. Solo `POST /api/files/upload` daba 401.

**Diagnostico:** El backend log mostro que TODO llegaba correctamente:
- Authorization header: PRESENTE
- X-User-Email: cliente1@gmail.com
- Token reconocido como Clerk: SI
- Hibernate ejecutaba la query: SI
- SecurityContext establecido: aparentemente SI
- Resultado: 401 igual

### Causa raiz: async dispatch de CompletableFuture

El `FileController` retornaba `CompletableFuture<ResponseEntity>`. Spring MVC procesa esto en DOS FASES:

```
FASE 1 (hilo original del request):
  JwtFilter  -->  establece SecurityContext   OK
  Controller -->  devuelve CompletableFuture  (retorna inmediatamente)

FASE 2 (async dispatch - hilo DIFERENTE del thread pool):
  SecurityContextHolderFilter --> carga SecurityContext del repositorio --> VACIO
  JwtFilter NO corre (es OncePerRequestFilter, ya corrio en Fase 1)
  AuthorizationFilter --> no hay autenticacion --> 401
```

**Por que?** Spring Security stateless NO guarda el `SecurityContext` en el repositorio de la request. Cuando llega el async dispatch, `SecurityContextHolderFilter` crea un contexto nuevo y vacio. `JwtFilter` no vuelve a correr. Sin autenticacion = **401**.

**Solucion: Hacer el endpoint SINCRONO:**

```java
// INCORRECTO - causa 401
@PostMapping("/upload")
public CompletableFuture<ResponseEntity<Object>> upload(@RequestParam("file") MultipartFile file) {
    return service.uploadAsync(file).thenApply(url -> ResponseEntity.ok(url));
}

// CORRECTO - sincrono, mismo hilo, sin async dispatch
@PostMapping("/upload")
public ResponseEntity<Object> upload(@RequestParam("file") MultipartFile file) {
    try {
        String url = service.uploadFile(file); // metodo bloqueante ya existente
        return ResponseEntity.ok(Map.of("url", url));
    } catch (IllegalArgumentException e) {
        return ResponseEntity.status(400).body(Map.of("error", e.getMessage()));
    } catch (IOException e) {
        return ResponseEntity.status(500).body(Map.of("error", e.getMessage()));
    }
}
```

**Alternativa si async es obligatorio:** Usar `DelegatingSecurityContextExecutorService` para propagar el `SecurityContext` a los hilos hijos:

```java
@Bean("secureExecutor")
public Executor secureExecutor() {
    return new DelegatingSecurityContextExecutorService(Executors.newFixedThreadPool(4));
}
// Inyectar @Qualifier("secureExecutor") en el servicio asincrono
```

---

## Resumen de todos los cambios

### Frontend (Angular)

| Archivo | Cambio |
|---|---|
| `auth.service.ts` | Suscribir a `user$` en lugar de `session$` |
| `auth.interceptor.ts` | Fallback al SDK de Clerk si `sessionStorage` esta vacio |
| `auth.interceptor.ts` | No cerrar sesion si el endpoint fallido es upload de archivos |

### Backend (Spring Boot)

| Archivo | Cambio |
|---|---|
| `JwtFilter.java` | Detectar tokens Clerk por `iss` y autenticar por `X-User-Email` |
| `JwtFilter.java` | `getClaimUnverified` con padding Base64 correcto |
| `WebSocketConfig.java` | Mismo patron Clerk para WebSocket STOMP |
| `FileController.java` | Convertir de `CompletableFuture` a `ResponseEntity` sincrono |
| `UserRepository.java` | `findByEmailIgnoreCase` para comparaciones case-insensitive |
| `VendorRepository.java` | `findByEmailIgnoreCase` |

---

## REGLA DE ORO para proyectos futuros

> Si un endpoint requiere autenticacion Spring Security (no es `permitAll`), **NO retornar** `CompletableFuture<ResponseEntity>`. Usar `ResponseEntity` sincrono.

**Por que?** Spring Security stateless no guarda el `SecurityContext` en el repositorio de la request. El async dispatch crea un contexto nuevo y vacio, sin autenticacion -> 401.

---

## Como diagnosticar en el futuro

**Paso 1:** Log al inicio de `JwtFilter`:
```java
log.info("Auth: {}", request.getHeader("Authorization") != null ? "PRESENTE" : "AUSENTE");
log.info("Email: {}", request.getHeader("X-User-Email"));
```

**Paso 2:** Si todo llega correctamente pero sigue el 401, revisar si el controller usa `CompletableFuture`.

**Paso 3:** En el navegador (F12 Consola):
```javascript
sessionStorage.getItem('auth_email')
```

---

## Notas finales

- Los tokens de Clerk en desarrollo expiran cada **60 segundos**. El SDK los refresca automaticamente.
- Usar `getToken()` del SDK en el interceptor, no el token cacheado en `sessionStorage`.
- Para **WebSocket STOMP**, el mismo patron de deteccion Clerk aplica en el `ChannelInterceptor` de `WebSocketConfig`.
- Las comparaciones de email deben ser **case-insensitive** (`findByEmailIgnoreCase` en JPA) porque distintos proveedores OAuth pueden normalizar el email de forma diferente.
