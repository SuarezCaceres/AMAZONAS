package com.amazonas.backend.modules.requests.dto;

import java.math.BigDecimal;
import java.util.UUID;

public record KitMaquetaResponse(
    UUID id,
    UUID productId,
    String productName,
    String productSlug,
    Integer cantidad,
    BigDecimal precioUnitarioReferencia,
    BigDecimal subtotal
) {}
