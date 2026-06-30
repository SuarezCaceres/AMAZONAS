# 📑 Sub-issue 3.7: Panel de auditoría de transacciones con visualización de comprobantes cargados

## 🎯 Objetivo
Crear un panel de auditoría interna de transacciones de caja, permitiendo revisar el historial de transacciones físicas, consultar detalles y visualizar los comprobantes adjuntos (imágenes, capturas de pantalla, archivos PDF).

## 📋 Lista de Tareas
- [ ] **Diseño del Panel de Auditoría:**
  - Crear una vista de tabla con filtros por fecha, tipo de pago, método de pago y número de boleta.
  - Columnas de la tabla: ID de Transacción, Fecha/Hora, Cliente, Tipo (Adelanto/Saldo/Total), Método, Monto, Auditoría (botón para ver comprobante).
- [ ] **Visor de Comprobantes (Modal):**
  - Implementar un modal interactivo que renderice la imagen o PDF del voucher de pago o comprobante adjunto.
  - Debe soportar controles de zoom e impresión rápida del comprobante adjunto.
- [ ] **Lógica de Backend (Auditoría):**
  - Crear un endpoint seguro para consultar el historial de transacciones (con paginación y filtros).
  - Proveer el stream de archivos de comprobantes de forma segura verificando los permisos del rol administrador o vendedor.

## 🔎 Layout del Panel de Auditoría
```text
+---------------------------------------------------------------------------------+
| PANEL DE AUDITORÍA DE TRANSACCIONES                                             |
+---------------------------------------------------------------------------------+
| Filtros: [ Fecha: Hoy ] [ Tipo: Todos ] [ Buscar por ID...                   ]  |
+---------------------------------------------------------------------------------+
| ID   | Fecha      | Cliente      | Tipo     | Método   | Monto   | Comprobante  |
+------+------------+--------------+----------+----------+---------+--------------+
| #001 | 28/06/2026 | Juan Pérez   | Adelanto | Efectivo | $50.00  | [ Ver 👁️ ]   |
| #002 | 28/06/2026 | Ana Gómez    | Saldo    | POS      | $30.00  | [ Ver 👁️ ]   |
+------+------------+--------------+----------+----------+---------+--------------+

[ Visualizador de Comprobante - Modal ]
+--------------------------------------+
| Transacción #001 - Comprobante       |
| +----------------------------------+ |
| |        VOUCHER DE ADELANTO       | |
| |           [IMAGEN/PDF]           | |
| +----------------------------------+ |
| [ Descargar ]        [ Cerrar ]      |
+--------------------------------------+
```
