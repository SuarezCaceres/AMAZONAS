# Reporte de Errores de Conexión (HTTP 403 Forbidden) - Integración de Clerk

## 📋 Resumen del Problema
Al interactuar con los endpoints protegidos del backend (`/api/chat/rooms`, `/api/purchase-requests/my` y `/api/purchase-requests`), el frontend recibe respuestas con estado **HTTP 403 Forbidden**. 

A pesar de que los cambios de esta rama son **exclusivamente frontend**, el error ocurre debido a la interacción entre el nuevo mecanismo de autenticación del frontend (Clerk) y el mecanismo actual de autenticación del backend (JWT local con firma simétrica).

---

## 🔍 Análisis Técnico y Causas Raíz

### 1. Comportamiento en el Frontend (`auth.interceptor.ts`)
El interceptor del frontend ([auth.interceptor.ts](file:///c:/AMAZONAS/src/frontend/src/app/services/auth.interceptor.ts)) captura las solicitudes salientes e intenta adjuntar el token de autenticación:
- Si el usuario **no ha iniciado sesión**, no se adjunta ninguna cabecera `Authorization`.
- Si el usuario **inicia sesión con Clerk**, el interceptor obtiene el token de Clerk mediante `clerkService.getToken()` y lo envía como `Authorization: Bearer <clerk_token>`.

### 2. Comportamiento en el Backend (`SecurityConfig.java` y `JwtFilter.java`)
El backend tiene las siguientes configuraciones de seguridad:
- **Rutas Protegidas:** Las rutas `/api/purchase-requests/**` y `/api/chat/**` requieren autenticación ([SecurityConfig.java](file:///c:/AMAZONAS/src/backend/src/main/java/com/amazonas/backend/security/config/SecurityConfig.java#L51-L53)).
- **Filtro de Seguridad (`JwtFilter`):** Cada petición pasa por el [JwtFilter.java](file:///c:/AMAZONAS/src/backend/src/main/java/com/amazonas/backend/security/jwt/JwtFilter.java).

#### ¿Por qué ocurre el HTTP 403 Forbidden?

Hay dos escenarios posibles según el estado de la sesión:

#### Escenario A: Usuario no autenticado en el frontend (Sin Token)
1. La petición se envía sin cabecera `Authorization`.
2. El `JwtFilter` del backend no procesa ningún token y continúa la cadena de filtros.
3. Spring Security detecta que la ruta requiere autenticación y, al no encontrar un contexto de seguridad válido, rechaza la petición con un **HTTP 403 Forbidden** (o 401 dependiendo del entrypoint).

#### Escenario B: Usuario autenticado en el frontend con Clerk (Token Inválido para el Backend)
1. El interceptor envía el token JWT generado por **Clerk** (firmado con la clave privada RS256 de Clerk).
2. El `JwtFilter` del backend captura el token e intenta verificar su firma mediante [JwtService.java](file:///c:/AMAZONAS/src/backend/src/main/java/com/amazonas/backend/security/jwt/JwtService.java#L97-L104).
3. `JwtService` intenta validar el token usando un **algoritmo simétrico (HMAC-SHA256)** y la clave secreta local del backend (`security.jwt.secret-key`):
   ```java
   return Jwts.parser()
           .verifyWith(getSigningKey()) // Intenta validar con la clave secreta simétrica local
           .build()
           .parseSignedClaims(token)
           .getPayload();
   ```
4. Al ser un token de Clerk (con estructura y firma asimétrica RS256 diferentes), **la verificación de firma falla** y se lanza una excepción.
5. El bloque `try-catch` en `JwtFilter` captura el error y silenciosamente continúa la cadena sin establecer la autenticación:
   ```java
   } catch (Exception e) {
       // Si el token ha expirado, está malformado o tiene firma inválida, continúa...
   }
   ```
6. Spring Security ve la petición como no autenticada y responde con un **HTTP 403 Forbidden**.

---

## 🛠️ Soluciones Propuestas

### Solución A: Integrar Clerk en el Backend (Solución Definitiva)
Para que la autenticación con Clerk funcione de extremo a extremo, el backend debe ser actualizado para validar los tokens JWT de Clerk utilizando su JWKS (JSON Web Key Set).
1. Configurar Spring Security como un **OAuth2 Resource Server** en `pom.xml`:
   ```xml
   <dependency>
       <groupId>org.springframework.boot</groupId>
       <artifactId>spring-boot-starter-oauth2-resource-server</artifactId>
   </dependency>
   ```
2. Configurar la URL de las claves públicas de Clerk en `application.properties`:
   ```properties
   spring.security.oauth2.resourceserver.jwt.jwk-set-uri=https://clerk.tu-dominio.com/.well-known/jwks.json
   ```
3. Adaptar `SecurityConfig.java` para que valide los tokens usando JWT Decoder de Spring Security en lugar de usar el filtro de firmas simétricas local.

### Solución B: Bypass temporal para Pruebas del Frontend (Desarrollo)
Si quieres probar el frontend sin modificar aún la seguridad del backend para Clerk, puedes desactivar la seguridad temporalmente para esos endpoints en el backend.
- En [SecurityConfig.java](file:///c:/AMAZONAS/src/backend/src/main/java/com/amazonas/backend/security/config/SecurityConfig.java#L51-L53), cambia `.authenticated()` por `.permitAll()` para fines de desarrollo:
  ```diff
- .requestMatchers("/api/purchase-requests/**").authenticated()
- .requestMatchers("/api/chat/**").authenticated()
+ .requestMatchers("/api/purchase-requests/**").permitAll()
+ .requestMatchers("/api/chat/**").permitAll()
  ```
  *(⚠️ Nota: Esto es solo temporal para pruebas locales y no debe subirse a producción).*
