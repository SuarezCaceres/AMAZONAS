package com.amazonas.backend.modules.vendor.dto;

public record DashboardStatsResponse(
    long totalMaquetas,
    long maquetasConfiguradas,
    long maquetasDisponibles,
    long sinConfigurar,
    long totalSolicitudes,
    long solicitudesPendientes,
    long solicitudesProcesando,
    long solicitudesCompletadas
) {}
