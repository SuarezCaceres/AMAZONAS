# Guía de Preparación y Despliegue de Frontend (Angular 20)

Este documento detalla los pasos de configuración técnica realizados en el monorrepo **AMAZONAS** para permitir el despliegue exitoso del Frontend en **Vercel**, configurando de forma segura y dinámica el consumo del Backend en **Render**.

---

## 🛠️ Modificaciones y Pasos de Configuración Realizados

### 1. Soporte de Variables de Entorno y Ajuste de Budgets en `angular.json`
* **Soporte de Entorno**: Se reemplazaron los constructores estándar de Angular por los de `@ngx-env/builder` para habilitar el uso de `import.meta.env` en la aplicación frontend.
  * *Build Target*: `@ngx-env/builder:application`
  * *Serve Target*: `@ngx-env/builder:dev-server`
  * *Test Target*: `@ngx-env/builder:karma`
* **Ajuste de Límites (Budgets)**: Se ajustaron los límites máximos permitidos en producción para evitar errores de compilación causados por archivos de gran tamaño (como el CSS de flujos de pagos y presupuestos):
  * **`initial`**: Límite de aviso y error fijado en `2mb`.
  * **`anyComponentStyle`**: Límite de aviso y error ampliado a `100kb` (evitando el error de límite superado de 30kb).

### 2. Archivo de Tipos de Entorno (`src/frontend/src/env.d.ts`)
Se creó este archivo de tipado global para que TypeScript reconozca el objeto `import.meta.env` e impida errores de tipado en tiempo de desarrollo o compilación:
```typescript
interface ImportMetaEnv {
  readonly NG_APP_API_URL: string;
  [key: string]: any;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
```

### 3. Configuración de Producción (`src/frontend/src/environments/environment.prod.ts`)
Se configuró para interceptar la variable de entorno y proveer una ruta de fallback para el desarrollo local en caso de no encontrarse definida:
```typescript
export const environment = {
  production: true,
  apiUrl: import.meta.env.NG_APP_API_URL || 'http://localhost:8080/api'
};
```

### 4. Consumo Dinámico de la URL del Backend (`src/frontend/src/app/config/api.config.ts`)
Se actualizó el punto único de configuración de endpoints para importar y usar dinámicamente la URL resuelta por el entorno de Angular en lugar de apuntar de forma estática a `localhost`:
```typescript
import { environment } from '../../environments/environment.prod';

export const API_BASE_URL = environment.apiUrl;
```

---

## 🔑 Configuración de Variables de Entorno en el Despliegue (Vercel)

Para que el frontend pueda conectarse con el backend una vez desplegado, se debe configurar la siguiente variable de entorno en la consola de administración de **Vercel**:

* **Nombre de la Variable (Key)**: `NG_APP_API_URL`
* **Valor (Value)**: `https://<tu-url-del-backend-en-render>.onrender.com/api` (Se modificará temporalmente al valor asignado del backend en Render en la Fase 4).

> [!IMPORTANT]
> El prefijo `NG_APP_` es mandatorio para que `@ngx-env/builder` reconozca y exponga la variable en el bundle final compilado de Angular. Cualquier otra variable que desees inyectar debe seguir esta misma convención de nombres.
