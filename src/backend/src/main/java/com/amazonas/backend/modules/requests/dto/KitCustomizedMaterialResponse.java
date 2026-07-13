package com.amazonas.backend.modules.requests.dto;

import java.math.BigDecimal;
import java.util.UUID;

public record KitCustomizedMaterialResponse(
    UUID id,
    UUID materialId,
    String materialName,
    String materialUnit,
    BigDecimal cantidad,
    BigDecimal costoUnitarioReferencia,
    BigDecimal subtotal
) {}
