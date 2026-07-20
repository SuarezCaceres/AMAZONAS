package com.amazonas.backend.modules.requests.dto;

import java.util.UUID;

public record RequestPreferredMaterialRequest(
    UUID materialId,
    String materialName,
    String razonPreferencia
) {}
