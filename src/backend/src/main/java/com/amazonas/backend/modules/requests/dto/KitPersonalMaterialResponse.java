package com.amazonas.backend.modules.requests.dto;

import java.math.BigDecimal;
import java.util.UUID;

public record KitPersonalMaterialResponse(
    UUID id,
    String materialName,
    BigDecimal cantidad,
    String descripcion
) {}
