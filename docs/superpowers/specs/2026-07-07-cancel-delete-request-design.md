# Especificación de Diseño: Cancelación y Eliminación Física de Solicitudes

Fecha: 2026-07-07  
Estado: Aprobado  
Autor: Antigravity AI  

---

## 1. Contexto y Requerimientos

Cuando un cliente se arrepiente de una solicitud de compra o personalización de maqueta (debido a altos costos, cambios de opinión o errores en la carga de archivos), debe poder cancelarla y borrarla por completo.

### Requerimientos Clave:
1. **Borrado Físico (Hard Delete):** Eliminar permanentemente la solicitud y todos los registros asociados (chats, mensajes, ofertas, presupuestos) para liberar espacio y no dejar rastro de datos o comprobantes inválidos.
2. **Integridad Referencial:** Garantizar que la eliminación en cascada no provoque errores de base de datos (`Foreign Key Violation`) ni deje registros huérfanos.
3. **Acciones en Frontend:**
   * Un botón rojo de cancelación en cada tarjeta de la vista de "Mis Solicitudes".
   * Un botón rojo de cancelación en la cabecera del chat activo del cliente.
   * Diálogo modal de confirmación antes de proceder con el borrado.

---

## 2. Diseño del Backend

### 2.1. Exclusión de Soft-Delete en Repositorio
Dado que `PurchaseRequest` está anotada con `@SQLDelete`, cualquier llamada a `repository.delete()` ejecutará un soft-delete. Para realizar un borrado físico, agregamos un método en `PurchaseRequestRepository.java`:

```java
@Modifying
@Query("DELETE FROM PurchaseRequest r WHERE r.id = :id")
void forceDelete(@Param("id") UUID id);
```

### 2.2. Nuevo Endpoint en Controller
Creamos el endpoint `DELETE /api/purchase-requests/{id}` en `PurchaseRequestController.java`.

### 2.3. Lógica del Servicio (`PurchaseRequestServiceImpl.java`)
El método `eliminarSolicitud(UUID id, String usuarioEmail)` realizará:
1. Buscar la solicitud por ID y verificar que pertenezca al usuario autenticado.
2. Buscar si existe un presupuesto (`Budget`) asociado a la solicitud y eliminarlo de forma explícita (el borrado de `Budget` eliminará sus `items` y `BudgetExplanationService` asociados en cascada por JPA).
3. Llamar a `purchaseRequestRepository.forceDelete(id)`.
4. Gracias a las restricciones de base de datos (`ON DELETE CASCADE`), al borrarse físicamente la solicitud se eliminarán en cascada:
   * La sala de chat (`chat_rooms`).
   * Los mensajes (`chat_messages`).
   * Las ofertas (`chat_offers`).
   * Los servicios adicionales del chat (`chat_extras`).
5. Las transacciones de pago (`payment_transactions`) asociadas actualizarán su `room_id` a `NULL` (`ON DELETE SET NULL`), preservando los registros de caja históricos.

---

## 3. Diseño del Frontend

### 3.1. Botón en "Mis Solicitudes" (`my-requests.component.html`)
Añadimos un botón rojo con icono de papelera al lado de "Ver conversación":
```html
<button 
  class="btn-cancel" 
  type="button" 
  (click)="confirmarCancelacion(request.backendId)"
  aria-label="Cancelar y eliminar solicitud"
>
  <span class="material-icons">delete_forever</span>
  Cancelar
</button>
```

### 3.2. Botón en Cabecera de Chat (`chat.component.html`)
Añadimos un botón en la barra superior de la vista de chat activo del cliente:
```html
<button 
  (click)="confirmarCancelacion(selectedRoom.requestId)" 
  class="flex items-center gap-1.5 px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-lg text-xs font-bold transition-all border border-rose-200 cursor-pointer active:scale-95"
>
  <span class="material-icons text-sm" style="font-size: 16px;">delete_forever</span>
  Cancelar Solicitud
</button>
```

### 3.3. Diálogo de Confirmación
Implementamos un método `confirmarCancelacion(requestId: string)` en los componentes del cliente que abrirá una ventana de confirmación antes de disparar la petición HTTP `DELETE`.

---

## 4. Plan de Pruebas y Verificación

1. **Prueba de Cancelación con Presupuesto Activo:**
   * Crear solicitud -> Recibir presupuesto -> Cancelar solicitud.
   * Verificar en BD que la solicitud, el presupuesto y los mensajes desaparezcan físicamente.
2. **Prueba de Transacciones de Pago Relacionadas:**
   * Registrar un pago sobre una solicitud -> Cancelar solicitud.
   * Verificar en BD que la sala de chat se borre pero la transacción en `payment_transactions` permanezca con `room_id = NULL`.
