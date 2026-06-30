package com.amazonas.backend.modules.chat.controller;

import com.amazonas.backend.modules.chat.dto.*;
import com.amazonas.backend.modules.chat.service.ChatService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.messaging.handler.annotation.DestinationVariable;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.handler.annotation.Payload;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

import java.security.Principal;

import java.util.List;
import java.util.UUID;

/**
 * Controlador del módulo de Chat y Negociación.
 *
 * Expone dos tipos de endpoints:
 * 1. REST (@GetMapping, @PostMapping) — Para carga inicial de datos.
 * 2. WebSocket (@MessageMapping) — Para mensajes en tiempo real via STOMP.
 *
 * Rutas REST base: /api/chat
 * Rutas WebSocket: /app/chat/{roomId}/...  →  publica en /topic/room/{roomId}
 */
@RestController
@RequestMapping("/api/chat")
@RequiredArgsConstructor
@Tag(name = "Chat y Negociación", description = "Módulo de comunicación y negociación entre cliente y vendedor")
public class ChatController {

    private final ChatService chatService;

    // =========================================================================
    // REST — SALAS
    // =========================================================================

    @Operation(summary = "Obtener o crear sala de chat de una solicitud")
    @PostMapping("/rooms/request/{requestId}")
    public ResponseEntity<ChatRoomResponse> getOrCreateRoom(
            @PathVariable UUID requestId,
            @AuthenticationPrincipal UserDetails userDetails
    ) {
        return ResponseEntity.ok(chatService.getOrCreateRoom(requestId, userDetails.getUsername()));
    }

    @Operation(summary = "Listar mis salas de chat (cliente o vendedor)")
    @GetMapping("/rooms")
    public ResponseEntity<List<ChatRoomResponse>> getMyRooms(
            @AuthenticationPrincipal UserDetails userDetails
    ) {
        return ResponseEntity.ok(chatService.getMyRooms(userDetails.getUsername()));
    }

    @Operation(summary = "Aceptar presupuesto para una sala de chat")
    @PostMapping("/rooms/{roomId}/accept-budget")
    public ResponseEntity<ChatRoomResponse> acceptBudget(
            @PathVariable UUID roomId,
            @RequestParam Double totalAmount,
            @AuthenticationPrincipal UserDetails userDetails
    ) {
        return ResponseEntity.ok(chatService.acceptBudget(roomId, totalAmount, userDetails.getUsername()));
    }

    // =========================================================================
    // REST — MENSAJES (Carga inicial del historial)
    // =========================================================================

    @Operation(summary = "Cargar historial de mensajes de una sala (últimos 30)")
    @GetMapping("/rooms/{roomId}/messages")
    public ResponseEntity<List<ChatMessageResponse>> getMessages(
            @PathVariable UUID roomId,
            @AuthenticationPrincipal UserDetails userDetails
    ) {
        return ResponseEntity.ok(chatService.getMessages(roomId, userDetails.getUsername()));
    }

    @Operation(summary = "Marcar mensajes como leídos")
    @PatchMapping("/rooms/{roomId}/read")
    public ResponseEntity<Void> markAsRead(
            @PathVariable UUID roomId,
            @AuthenticationPrincipal UserDetails userDetails
    ) {
        chatService.markAsRead(roomId, userDetails.getUsername());
        return ResponseEntity.ok().build();
    }

    @Operation(summary = "Verificar si un usuario está en línea")
    @GetMapping("/users/{email}/online")
    public ResponseEntity<Boolean> isUserOnline(
            @PathVariable String email
    ) {
        return ResponseEntity.ok(chatService.isUserActive(email));
    }

    // =========================================================================
    // REST — OFERTAS
    // =========================================================================

    @Operation(summary = "Proponer una nueva oferta de precio")
    @PostMapping("/rooms/{roomId}/offers")
    public ResponseEntity<ChatOfferResponse> createOffer(
            @PathVariable UUID roomId,
            @Valid @RequestBody CreateOfferRequest request,
            @AuthenticationPrincipal UserDetails userDetails
    ) {
        return ResponseEntity.ok(chatService.createOffer(roomId, request, userDetails.getUsername()));
    }

    @Operation(summary = "Aceptar una oferta de precio")
    @PostMapping("/offers/{offerId}/accept")
    public ResponseEntity<ChatOfferResponse> acceptOffer(
            @PathVariable UUID offerId,
            @AuthenticationPrincipal UserDetails userDetails
    ) {
        return ResponseEntity.ok(chatService.respondToOffer(offerId, true, userDetails.getUsername()));
    }

    @Operation(summary = "Rechazar una oferta de precio")
    @PostMapping("/offers/{offerId}/reject")
    public ResponseEntity<ChatOfferResponse> rejectOffer(
            @PathVariable UUID offerId,
            @AuthenticationPrincipal UserDetails userDetails
    ) {
        return ResponseEntity.ok(chatService.respondToOffer(offerId, false, userDetails.getUsername()));
    }

    // =========================================================================
    // REST — EXTRAS
    // =========================================================================

    @Operation(summary = "Proponer un servicio extra (solo vendedor)")
    @PostMapping("/rooms/{roomId}/extras")
    public ResponseEntity<ChatRoomResponse> addExtra(
            @PathVariable UUID roomId,
            @Valid @RequestBody CreateExtraRequest request,
            @AuthenticationPrincipal UserDetails userDetails
    ) {
        return ResponseEntity.ok(chatService.addExtra(roomId, request, userDetails.getUsername()));
    }

    @Operation(summary = "Aceptar un extra propuesto")
    @PostMapping("/extras/{extraId}/accept")
    public ResponseEntity<ChatRoomResponse> acceptExtra(
            @PathVariable UUID extraId,
            @AuthenticationPrincipal UserDetails userDetails
    ) {
        return ResponseEntity.ok(chatService.respondToExtra(extraId, true, userDetails.getUsername()));
    }

    @Operation(summary = "Rechazar un extra propuesto")
    @PostMapping("/extras/{extraId}/reject")
    public ResponseEntity<ChatRoomResponse> rejectExtra(
            @PathVariable UUID extraId,
            @AuthenticationPrincipal UserDetails userDetails
    ) {
        return ResponseEntity.ok(chatService.respondToExtra(extraId, false, userDetails.getUsername()));
    }

    // =========================================================================
    // WEBSOCKET — MENSAJES EN TIEMPO REAL
    // El frontend envía a: /app/chat/{roomId}/send
    // El servidor publica en: /topic/room/{roomId}
    // =========================================================================

    @MessageMapping("/chat/{roomId}/send")
    public void handleWebSocketMessage(
            @DestinationVariable UUID roomId,
            @Payload SendMessageRequest request,
            Principal principal
    ) {
        // El servicio se encarga de sanitizar, persistir y publicar via SimpMessagingTemplate
        // Principal es inyectado por Spring desde el handshake STOMP (no forma parte del payload JSON)
        chatService.sendMessage(roomId, request, principal.getName());
    }

    @org.springframework.messaging.handler.annotation.MessageExceptionHandler
    public void handleWebSocketException(Throwable exception) {
        // Registrar error y silenciarlo para evitar que el broker de Spring cierre la conexion STOMP del cliente (regla de la spec STOMP)
        System.err.println("Error procesando mensaje WebSocket (silenciado para conservar conexion): " + exception.getMessage());
        exception.printStackTrace();
    }
}
