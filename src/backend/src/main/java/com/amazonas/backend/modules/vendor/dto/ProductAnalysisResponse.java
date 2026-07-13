package com.amazonas.backend.modules.vendor.dto;

public record ProductAnalysisResponse(
    String productoId,
    String titulo,
    String categoriaNombre,
    String imageUrl,
    long totalSolicitudes
) {}
