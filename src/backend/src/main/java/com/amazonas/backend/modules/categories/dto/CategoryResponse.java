package com.amazonas.backend.modules.categories.dto;

public record CategoryResponse(
    String id,
    String nombre,
    String descripcion,
    Integer orden
) {}
