# 📑 Sub-issue 3.8: Plantilla de boleta e impresión de recibo en formato de ticket térmico

## 🎯 Objetivo
Diseñar una plantilla de comprobante optimizada para ticketeras térmicas (formato estándar de 80mm de ancho) e integrar un control que permita al vendedor enviar la boleta directamente a imprimir usando la impresora térmica local.

## 📋 Lista de Tareas
- [ ] **Diseño de la Plantilla (HTML/CSS):**
  - Crear una vista limpia que simule un ticket de compra.
  - El diseño debe incluir: Logo de la tienda, datos de la empresa, número de boleta, datos de la venta (maqueta, materiales, precios unitarios, subtotal, impuestos, total, adelanto, saldo y método de pago).
- [ ] **Estilos de Impresión CSS (`@media print`):**
  - Configurar CSS específico para ocultar cabeceras de navegador, footers de página, barras de navegación y botones.
  - Ajustar el ancho del contenedor del ticket a un tamaño exacto (ej. `80mm` o `300px`) y establecer márgenes a `0` para evitar saltos de página innecesarios en la ticketera.
- [ ] **Acción de Impresión:**
  - Agregar un botón "Imprimir Boleta" que invoque la función `window.print()` en el navegador con la plantilla seleccionada.

## 📐 Estilos CSS Recomendados para Ticketera Térmica (80mm)
```css
@media print {
  body * {
    visibility: hidden;
  }
  #ticket-termico, #ticket-termico * {
    visibility: visible;
  }
  #ticket-termico {
    position: absolute;
    left: 0;
    top: 0;
    width: 80mm;
    font-family: 'Courier New', Courier, monospace;
    font-size: 12px;
    line-height: 1.2;
    padding: 2mm;
    box-sizing: border-box;
  }
  /* Ocultar botones de impresión al imprimir */
  .no-print {
    display: none !important;
  }
}
```

## 🧪 Pruebas de Calidad de Impresión
1. Comprobar que al pulsar "Imprimir", el cuadro de diálogo de impresión del navegador muestre una previsualización limpia y adaptada a papel continuo de 80mm.
2. Confirmar que no se impriman elementos de la UI general (barra lateral, navbar, etc.).
