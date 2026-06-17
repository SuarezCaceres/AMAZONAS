package com.amazonas.backend.modules.chat.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/**
 * Payload que envía el frontend para un mensaje de texto.
 * El contenido será sanitizado (OWASP) en el servicio antes de guardarse.
 */
public record SendMessageRequest(
        @NotBlank(message = "El mensaje no puede estar vacío")
        @Size(max = 2000, message = "El mensaje no puede superar los 2000 caracteres")
        String content
) {}
