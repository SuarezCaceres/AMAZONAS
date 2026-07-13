package com.amazonas.backend.modules.products.dto;

public record SearchIntentResponse(
    String action,
    String categoria,
    Integer confianza,
    String explicacion
) {}
