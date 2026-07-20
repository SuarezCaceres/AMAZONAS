package com.amazonas.backend.modules.requests.dto;

import java.math.BigDecimal;

public record KitPersonalMaterialRequest(
    String materialName,
    BigDecimal cantidad,
    String descripcion
) {}
