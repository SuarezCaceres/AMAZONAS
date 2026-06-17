package com.amazonas.backend.modules.chat.dto;

import com.amazonas.backend.modules.chat.enums.ChatMessageType;
import com.amazonas.backend.modules.chat.enums.ChatSenderRole;

import java.time.OffsetDateTime;
import java.util.UUID;

/**
 * Respuesta con los datos de un mensaje del chat.
 * Se usa tanto en carga inicial (REST) como en tiempo real (WebSocket).
 */
public record ChatMessageResponse(
        UUID id,
        UUID roomId,
        UUID senderId,
        String senderName,        // Nombre del remitente (para mostrar en UI)
        ChatSenderRole senderRole,
        ChatMessageType messageType,
        String content,
        String metadata,          // JSON string con datos adicionales según tipo
        boolean isRead,
        OffsetDateTime sentAt
) {}
