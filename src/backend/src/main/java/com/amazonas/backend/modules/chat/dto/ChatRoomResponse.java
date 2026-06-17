package com.amazonas.backend.modules.chat.dto;

import com.amazonas.backend.modules.chat.enums.ChatRoomStatus;

import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.UUID;

/**
 * Respuesta con los datos de una sala de chat.
 * Incluye información del cliente, vendedor y solicitud para renderizar la UI.
 */
public record ChatRoomResponse(
        UUID id,
        UUID requestId,
        String productName,       // Nombre del producto de la solicitud
        String clientName,
        String clientEmail,
        String vendorName,
        ChatRoomStatus status,
        BigDecimal agreedPrice,
        OffsetDateTime lastMessageAt,
        OffsetDateTime createdAt,
        long unreadCount          // Mensajes no leídos para el usuario actual
) {}
