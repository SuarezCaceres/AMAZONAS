# 📑 Sub-issue 3.4: Lógica de formulario presencial y controles de validación en frontend

## 🎯 Objetivo
Programar la lógica de negocio y las validaciones del formulario presencial en Angular para asegurar que la información ingresada por el vendedor sea correcta y completa antes de enviarla.

## 📋 Lista de Tareas
- [ ] **Validaciones requeridas:**
  - **Campos obligatorios:** Cliente, tipo de pago, tipo de maqueta, al menos un material (si aplica).
  - **Validación de cantidades:** Evitar que la cantidad de materiales sea negativa o igual a cero (`cantidad > 0`).
  - **Validación de stock:** No permitir añadir cantidades superiores al stock disponible del material.
  - **Validación de precios:** Prevenir ingresos de valores manuales que alteren el precio base sin autorización.
- [ ] **Mensajes de retroalimentación:** Mostrar alertas visuales claras bajo los inputs inválidos.
- [ ] **Control de Envío:** Deshabilitar el botón "Registrar Venta" si el formulario no cumple con todas las reglas (`form.invalid`).

## ⚙️ Estructura de Control Sugerida (Typescript)
```typescript
// Ejemplo de validaciones dinámicas para materiales
validateMaterialRow(row: MaterialRow): boolean {
  if (!row.materialId) return false;
  if (row.cantidad <= 0) {
    this.errorMessage = 'La cantidad de materiales debe ser mayor a cero.';
    return false;
  }
  if (row.cantidad > row.stockDisponible) {
    this.errorMessage = `Stock insuficiente. Solo quedan ${row.stockDisponible} unidades de ${row.nombre}.`;
    return false;
  }
  return true;
}
```

## 🧪 Casos de Prueba Críticos
- Intentar enviar el formulario con un campo vacío (Debe bloquearse y pintar el campo en rojo).
- Ingresar `-5` en cantidad de un material (Debe marcar error y corregir a un valor válido o vaciar el campo).
- Exceder el stock disponible de un material seleccionado (Debe mostrar alerta de stock).
