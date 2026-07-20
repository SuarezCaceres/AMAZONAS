package com.amazonas.backend.modules.requests.dto;

import java.util.UUID;

public record RequestPreferredMaterialResponse(
    UUID id,
    UUID materialId,
    String materialName,
    String razonPreferencia
) {}
