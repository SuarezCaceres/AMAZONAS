# Documentación: Integración de Cloudinary para Carga de Imágenes

Esta guía detalla el funcionamiento del módulo de carga de archivos en la nube utilizando **Cloudinary** en el backend de Spring Boot, y cómo consumirlo de forma sencilla desde el frontend en **Angular**.

---

## 1. Configuración de Credenciales

Para que el backend pueda conectarse a tu cuenta de Cloudinary, debes configurar tus credenciales en el archivo [application.properties](file:///c:/Users/USER/Documents/AMAZONAS/src/backend/src/main/resources/application.properties).

Abre el archivo y asigna los valores de tu consola de Cloudinary:
```properties
cloudinary.cloud-name=tu_cloud_name
cloudinary.api-key=tu_api_key
cloudinary.api-secret=tu_api_secret
```

> [!TIP]
> En producción, es recomendable definir estas credenciales como variables de entorno (`CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`). El archivo `application.properties` ya está configurado para leerlas automáticamente del sistema si existen.

---

## 2. API Endpoint: Carga de Archivos

Se ha expuesto un endpoint REST dedicado para la subida de imágenes:

* **URL:** `http://localhost:8080/api/admin/files/upload`
* **Método:** `POST`
* **Acceso:** Protegido (Requiere cabecera `Authorization: Bearer <JWT>` de un usuario con rol `VENDEDOR` o `ADMIN`).
* **Content-Type:** `multipart/form-data`
* **Parámetros de entrada:**
  * `file`: El archivo de imagen binario a subir (campo de tipo archivo).

### Respuestas de la API:

#### Exitoso (200 OK):
Devuelve un objeto JSON con la URL segura HTTPS asignada por Cloudinary:
```json
{
  "url": "https://res.cloudinary.com/dpxs3nswb/image/upload/v171694939/amazonas_maquetas/imagen_ejemplo.png"
}
```

#### Error de Validación (400 Bad Request):
Si el archivo está vacío o no es una imagen válida:
```json
{
  "error": "Solo se permiten archivos de imagen"
}
```

#### Error de Servidor (500 Internal Error):
Si falla la conexión de red con el servidor de Cloudinary:
```json
{
  "error": "Error al subir el archivo: [Detalle del error]"
}
```

---

## 3. Guía de Integración con Angular (Frontend)

Para integrar la subida en el panel de vendedor de Angular, sigue estos sencillos pasos:

### Paso A: Servicio de archivos (Ya creado en tu proyecto)
El servicio ya ha sido creado en tu frontend en [file.service.ts](file:///c:/Users/USER/Documents/AMAZONAS/src/frontend/src/app/services/file.service.ts) y está listo para ser inyectado. Contiene el siguiente código:

```typescript
import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { API_BASE_URL } from '../config/api.config';

@Injectable({
  providedIn: 'root'
})
export class FileService {
  private readonly http = inject(HttpClient);
  private readonly API_URL = `${API_BASE_URL}/admin/files`;

  uploadImage(file: File): Observable<{ url: string }> {
    const formData = new FormData();
    formData.append('file', file);

    return this.http.post<{ url: string }>(`${this.API_URL}/upload`, formData);
  }
}
```

### Paso B: Usar el servicio en un componente
En tu componente del formulario de creación o edición de productos, inyecta el `FileService` y añade un input de tipo archivo en tu archivo HTML:

#### Código HTML (`component.html`):
```html
<div class="form-group">
  <label for="imageUpload">Subir Imagen de la Maqueta</label>
  <input type="file" id="imageUpload" (change)="onFileSelected($event)" accept="image/*" class="form-control" />
  
  <!-- Vista previa opcional -->
  @if (previewUrl) {
    <img [src]="previewUrl" alt="Vista previa" class="img-preview" />
  }
</div>
```

#### Código TypeScript (`component.ts`):
```typescript
import { Component, inject } from '@angular/core';
import { FileService } from '../../services/file.service';
import { MaquetaService } from '../../services/maqueta.service';

@Component({ ... })
export class FormularioProductoComponent {
  private readonly fileService = inject(FileService);
  private readonly maquetaService = inject(MaquetaService);

  selectedFile: File | null = null;
  previewUrl: string | null = null;
  imageUrl: string = '';

  // Capturar el archivo cuando el usuario lo selecciona
  onFileSelected(event: any): void {
    const file = event.target.files[0];
    if (file) {
      this.selectedFile = file;

      // Crear una vista previa local para mejorar la experiencia de usuario
      const reader = new FileReader();
      reader.onload = () => this.previewUrl = reader.result as string;
      reader.readAsDataURL(file);
    }
  }

  // Subir imagen y luego guardar el producto
  onSubmit(): void {
    if (this.selectedFile) {
      // 1. Subimos la imagen primero
      this.fileService.uploadImage(this.selectedFile).subscribe({
        next: (res) => {
          this.imageUrl = res.url; // Guardamos la URL de Cloudinary
          this.saveProduct();      // 2. Guardamos el producto con la URL
        },
        error: (err) => {
          console.error('Error al subir la imagen a Cloudinary:', err);
          alert('No se pudo subir la imagen. Intenta de nuevo.');
        }
      });
    } else {
      this.saveProduct(); // Guardar directamente si no se cambió la imagen
    }
  }

  saveProduct(): void {
    const request = {
      titulo: 'Nombre de la Maqueta',
      categoriaId: 'slug-categoria',
      imageUrl: this.imageUrl, // Aquí enviamos la URL de Cloudinary
      stock: 10
      // ... otros campos
    };

    this.maquetaService.createProduct(request).subscribe({
      next: (product) => alert('Producto guardado exitosamente!'),
      error: (err) => console.error('Error al guardar el producto:', err)
    });
  }
}
```
