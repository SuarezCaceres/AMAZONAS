package com.amazonas.backend.modules.requests.dto;

import java.math.BigDecimal;
import java.util.UUID;

public record KitMaquetaRequest(
    UUID productId,
    Integer cantidad,
    BigDecimal precioUnitarioReferencia
) {}
