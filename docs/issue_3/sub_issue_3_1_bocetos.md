# 📑 Sub-issue 3.1: Diseño de prototipos e interfaz de selección de maquetas en pagos presenciales

## 🎯 Objetivo
Diseñar y bocetar la interfaz de usuario (UI/UX) para listar y seleccionar maquetas físicas y materiales dentro del formulario de venta manual presencial.

## 📋 Lista de Tareas
- [ ] **Definición de flujo UX:** Mapear los pasos que sigue el vendedor al registrar una venta presencial (Selección de tipo de venta -> Selección de maqueta catálogo/personalizada -> Listar/Agregar materiales -> Resumen de costo).
- [ ] **Boceto de la Interfaz (Wireframes):**
  - **Selector de maquetas:** Componente tipo tarjetas (cards) o desplegable interactivo con buscador de maquetas.
  - **Selector de materiales:** Tabla o lista dinámica que permita agregar múltiples insumos, definir cantidades y autocalcular precios.
- [ ] **Validación de usabilidad:** Asegurar que sea fácil de operar desde un dispositivo de caja (PC/Tablet).

## 💡 Propuesta de Layout (Boceto conceptual)
```text
+----------------------------------------------------------------+
| REGISTRAR VENTA PRESENCIAL                                     |
+----------------------------------------------------------------+
| [ ] Catálogo de Maquetas (Seleccionar de lista existente)      |
|     [ Buscar maqueta...   ]                                    |
|     +-------+  +-------+  +-------+                            |
|     | Maq A |  | Maq B |  | Maq C |                            |
|     +-------+  +-------+  +-------+                            |
|                                                                |
| [ ] Maqueta Personalizada (Definir dimensiones y detalles)     |
|                                                                |
| --- MATERIALES UTILIZADOS ---                                  |
| [ Añadir Material + ]                                          |
| Material        | Stock | Cantidad | P. Unitario | Total       |
| Cartón Paja     | 50    | [ 2    ] | $1.50       | $3.00   [x] |
| Silicona Barra  | 120   | [ 5    ] | $0.20       | $1.00   [x] |
|                                                                |
| Total Materiales: $4.00                                        |
+----------------------------------------------------------------+
```

## 📝 Notas de Implementación
- El formulario debe ser reactivo y calcular los precios en tiempo real para evitar discrepancias.
