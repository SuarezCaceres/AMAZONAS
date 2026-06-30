# 📑 Sub-issue 3.3: Implementación del selector de maquetas y materiales en el formulario manual

## 🎯 Objetivo
Desarrollar la interfaz del selector interactivo en la plantilla (HTML/CSS) del formulario manual de ventas directas presenciales.

## 📋 Lista de Tareas
- [ ] **Estructura HTML básica:**
  - Crear pestañas o botones de opción de tipo de maqueta: `Catálogo` vs. `Personalizada`.
  - Diseñar el grid/lista para el catálogo de maquetas.
  - Implementar la sección dinámica de adición de materiales (listado dinámico en tabla).
- [ ] **Estilos CSS (Maquetación Premium):**
  - Aplicar transiciones suaves y efectos hover en las maquetas del catálogo.
  - Diseñar un input limpio para las cantidades y botones rápidos para eliminar materiales.
- [ ] **Enlace de datos (Binding):**
  - Conectar los selectores con los arreglos de datos correspondientes en el componente TS.

## 💻 Detalles Técnicos Propuestos (Angular)
- **Ruta del Componente:** A definir (bajo `src/frontend/src/app/pages/navbar-vendedor/sections/...`).
- **Directivas Clave:**
  - `*ngIf` para alternar la visualización del selector según el tipo de maqueta.
  - `*ngFor` para iterar el listado de materiales agregados a la venta.
- **Servicios Necesarios:**
  - `MaterialService` para obtener el catálogo de materiales disponibles con stock y precio.
  - `MaquetaService` (o equivalente) para obtener la lista de maquetas del catálogo.

## 🧪 Plan de Pruebas Visuales
1. Verificar que al alternar entre "Personalizada" y "Catálogo" se muestren los campos correctos.
2. Confirmar que al dar clic en "Añadir Material" se inserte una nueva fila en la tabla de materiales.
