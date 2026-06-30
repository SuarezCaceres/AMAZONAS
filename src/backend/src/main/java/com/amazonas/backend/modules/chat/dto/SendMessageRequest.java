package com.amazonas.backend.modules.chat.dto;

import com.amazonas.backend.modules.chat.enums.ChatMessageType;
import jakarta.validation.constraints.Size;

/**
 * Payload que envía el frontend para un mensaje de texto o archivo.
 * El contenido será sanitizado (OWASP) en el servicio antes de guardarse.
 */
public record SendMessageRequest(
        @Size(max = 2000, message = "El mensaje no puede superar los 2000 caracteres")
        String content,
        
        ChatMessageType messageType,
        String metadata
) {}
