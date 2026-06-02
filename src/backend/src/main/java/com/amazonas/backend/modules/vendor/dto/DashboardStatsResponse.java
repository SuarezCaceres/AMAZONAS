package com.amazonas.backend.modules.vendor.dto;

public class DashboardStatsResponse {

    private long totalMaquetas;
    private long maquetasConfiguradas;
    private long maquetasDisponibles;
    private long sinConfigurar;
    private long totalSolicitudes;
    private long solicitudesPendientes;
    private long solicitudesProcesando;
    private long solicitudesCompletadas;

    public DashboardStatsResponse() {}

    public DashboardStatsResponse(
            long totalMaquetas,
            long maquetasConfiguradas,
            long maquetasDisponibles,
            long sinConfigurar,
            long totalSolicitudes,
            long solicitudesPendientes,
            long solicitudesProcesando,
            long solicitudesCompletadas) {
        this.totalMaquetas = totalMaquetas;
        this.maquetasConfiguradas = maquetasConfiguradas;
        this.maquetasDisponibles = maquetasDisponibles;
        this.sinConfigurar = sinConfigurar;
        this.totalSolicitudes = totalSolicitudes;
        this.solicitudesPendientes = solicitudesPendientes;
        this.solicitudesProcesando = solicitudesProcesando;
        this.solicitudesCompletadas = solicitudesCompletadas;
    }

    public long getTotalMaquetas() { return totalMaquetas; }
    public void setTotalMaquetas(long totalMaquetas) { this.totalMaquetas = totalMaquetas; }

    public long getMaquetasConfiguradas() { return maquetasConfiguradas; }
    public void setMaquetasConfiguradas(long maquetasConfiguradas) { this.maquetasConfiguradas = maquetasConfiguradas; }

    public long getMaquetasDisponibles() { return maquetasDisponibles; }
    public void setMaquetasDisponibles(long maquetasDisponibles) { this.maquetasDisponibles = maquetasDisponibles; }

    public long getSinConfigurar() { return sinConfigurar; }
    public void setSinConfigurar(long sinConfigurar) { this.sinConfigurar = sinConfigurar; }

    public long getTotalSolicitudes() { return totalSolicitudes; }
    public void setTotalSolicitudes(long totalSolicitudes) { this.totalSolicitudes = totalSolicitudes; }

    public long getSolicitudesPendientes() { return solicitudesPendientes; }
    public void setSolicitudesPendientes(long solicitudesPendientes) { this.solicitudesPendientes = solicitudesPendientes; }

    public long getSolicitudesProcesando() { return solicitudesProcesando; }
    public void setSolicitudesProcesando(long solicitudesProcesando) { this.solicitudesProcesando = solicitudesProcesando; }

    public long getSolicitudesCompletadas() { return solicitudesCompletadas; }
    public void setSolicitudesCompletadas(long solicitudesCompletadas) { this.solicitudesCompletadas = solicitudesCompletadas; }
}
