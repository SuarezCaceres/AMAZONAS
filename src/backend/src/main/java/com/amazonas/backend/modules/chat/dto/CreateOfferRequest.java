package com.amazonas.backend.modules.chat.dto;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.math.BigDecimal;

/**
 * Payload para proponer una nueva oferta de precio.
 * Puede ser enviado tanto por cliente como por vendedor.
 */
public record CreateOfferRequest(
        @NotNull(message = "El precio propuesto es obligatorio")
        @DecimalMin(value = "1.00", message = "El precio mínimo es S/ 1.00")
        BigDecimal proposedPrice,

        @Size(max = 500, message = "La nota no puede superar 500 caracteres")
        String note
) {}
