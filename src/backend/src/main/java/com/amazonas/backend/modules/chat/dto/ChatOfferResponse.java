package com.amazonas.backend.modules.chat.dto;

import com.amazonas.backend.modules.chat.enums.ChatOfferStatus;

import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.UUID;

/**
 * Respuesta con los datos de una oferta de precio.
 * Se envía en tiempo real vía WebSocket cuando el estado cambia.
 */
public record ChatOfferResponse(
        UUID id,
        UUID roomId,
        UUID proposerId,
        String proposerName,
        com.amazonas.backend.modules.chat.enums.ChatSenderRole proposerRole,
        BigDecimal proposedPrice,
        String note,
        ChatOfferStatus status,
        OffsetDateTime respondedAt,
        OffsetDateTime createdAt
) {}
