# 📑 Sub-issue 3.6: Botón rápido de "Confirmar Pago de Saldo" (50% restante) en ventana de chat

## 🎯 Objetivo
Facilitar al vendedor el cierre de cuentas directamente desde el flujo de conversación, integrando un botón rápido de "Confirmar Pago de Saldo" en el chat del vendedor.

## 📋 Lista de Tareas
- [ ] **Modificación de la UI del Chat:**
  - Identificar la burbuja de chat o sección de estado de orden/presupuesto dentro del panel de chat del vendedor.
  - Agregar el botón "Confirmar Pago de Saldo" que se habilita únicamente cuando existe un adelanto registrado y queda pendiente el 50% restante.
- [ ] **Modal de Confirmación Rápida:**
  - Al presionar el botón, mostrar un modal de confirmación simplificado (Monto a pagar, medio de pago).
- [ ] **Integración con WebSocket / Estado del Chat:**
  - Tras confirmar la transacción, notificar mediante el WebSocket del chat al cliente sobre el pago del saldo, cambiando visualmente el estado del chat a `ENTREGADO` / `FINALIZADO`.

## 🎨 Mockup Conceptual de la Burbuja del Chat
```text
+-------------------------------------------------------------+
| [Cliente] Hola, acabo de pagar la mitad en efectivo.        |
+-------------------------------------------------------------+
| [Sistema] Adelanto Registrado Exitosamente ($50.00)         |
| Estado: Esperando el 50% restante ($50.00)                 |
|                                                             |
|   [  Confirmar Pago de Saldo  ]  <-- BOTÓN RÁPIDO VENDEDOR  |
+-------------------------------------------------------------+
```

## ⚙️ Flujo WebSocket
1. El vendedor hace clic en "Confirmar Pago de Saldo".
2. Se envía la solicitud al backend (`/api/chat/confirm-balance`).
3. El backend actualiza la orden y emite un mensaje por WebSocket a la sala de chat.
4. Ambos clientes (vendedor y cliente) reciben la actualización en tiempo real, deshabilitando el botón y mostrando el mensaje de "Cuenta Cerrada / Pagado".
