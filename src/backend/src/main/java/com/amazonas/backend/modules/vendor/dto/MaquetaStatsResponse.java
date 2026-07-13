package com.amazonas.backend.modules.vendor.dto;

public record MaquetaStatsResponse(
    long totalMaquetas,
    long maquetasConfiguradas,
    long maquetasDisponibles,
    long sinConfigurar
) {}
