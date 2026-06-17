package com.amazonas.backend.modules.chat.dto;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.math.BigDecimal;

/**
 * Payload para que el vendedor proponga un servicio extra en el chat.
 * El cliente puede luego aceptarlo o rechazarlo.
 */
public record CreateExtraRequest(
        @NotBlank(message = "El nombre del extra es obligatorio")
        @Size(max = 200)
        String nombre,

        @Size(max = 1000)
        String descripcion,

        @NotNull(message = "El precio del extra es obligatorio")
        @DecimalMin(value = "0.00", message = "El precio no puede ser negativo")
        BigDecimal precio
) {}
