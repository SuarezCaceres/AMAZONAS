package com.amazonas.backend.modules.products.dto;

import jakarta.validation.constraints.NotBlank;

public record SearchIntentRequest(
    @NotBlank(message = "La consulta de búsqueda no puede estar vacía")
    String query
) {}
