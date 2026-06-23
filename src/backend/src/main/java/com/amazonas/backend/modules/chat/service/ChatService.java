package com.amazonas.backend.modules.chat.service;

import com.amazonas.backend.modules.chat.dto.*;
import com.amazonas.backend.modules.chat.enums.ChatOfferStatus;
import com.amazonas.backend.modules.chat.model.ChatRoom;

import java.util.List;
import java.util.UUID;

/**
 * Contrato del servicio de chat.
 * Todas las operaciones de negocio del módulo de chat y negociación.
 */
public interface ChatService {

    /**
     * Obtiene o crea la sala de chat para una solicitud de compra.
     * Si la sala ya existe, la retorna. Si no, la crea automáticamente.
     *
     * @param requestId  ID de la solicitud de compra
     * @param currentEmail Email del usuario autenticado (cliente o vendedor)
     */
    ChatRoomResponse getOrCreateRoom(UUID requestId, String currentEmail);

    /**
     * Lista todas las salas del usuario autenticado (cliente o vendedor).
     * Ordenadas por último mensaje.
     */
    List<ChatRoomResponse> getMyRooms(String currentEmail);

    /**
     * Obtiene el historial de mensajes de una sala (carga inicial).
     * Devuelve los últimos 30 mensajes ordenados de más antiguo a más reciente.
     */
    List<ChatMessageResponse> getMessages(UUID roomId, String currentEmail);

    /**
     * Envía un mensaje de texto en la sala.
     * El contenido es sanitizado (OWASP) antes de guardarse.
     * El mensaje se publica en el tópico WebSocket de la sala.
     */
    ChatMessageResponse sendMessage(UUID roomId, SendMessageRequest request, String currentEmail);

    /**
     * Propone una nueva oferta de precio en la sala.
     * Invalida cualquier oferta PENDING anterior antes de crear la nueva.
     */
    ChatOfferResponse createOffer(UUID roomId, CreateOfferRequest request, String currentEmail);

    /**
     * Responde a una oferta pendiente (aceptar o rechazar).
     *
     * @param offerId      ID de la oferta a responder
     * @param accept       true para aceptar, false para rechazar
     * @param currentEmail Email del usuario que responde
     */
    ChatOfferResponse respondToOffer(UUID offerId, boolean accept, String currentEmail);

    /**
     * El vendedor propone un servicio extra en la sala.
     */
    ChatRoomResponse addExtra(UUID roomId, CreateExtraRequest request, String currentEmail);

    /**
     * El cliente acepta o rechaza un extra propuesto por el vendedor.
     */
    ChatRoomResponse respondToExtra(UUID extraId, boolean accept, String currentEmail);

    /**
     * Marca todos los mensajes de una sala como leídos para el usuario actual.
     */
    void markAsRead(UUID roomId, String currentEmail);

    /**
     * Verifica si un usuario está en línea usando las sesiones WebSocket en Redis.
     */
    boolean isUserActive(String email);

    /**
     * Permite al cliente aceptar el presupuesto propuesto para la sala de chat.
     * Actualiza el estado a AGREED y registra el monto final acordado.
     */
    ChatRoomResponse acceptBudget(UUID roomId, Double totalAmount, String currentEmail);
}
