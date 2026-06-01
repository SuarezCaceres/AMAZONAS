package com.amazonas.backend.modules.vendor.dto;

public class MaquetaStatsResponse {

    private long totalMaquetas;
    private long maquetasConfiguradas;
    private long maquetasDisponibles;
    private long sinConfigurar;

    public MaquetaStatsResponse() {}

    public MaquetaStatsResponse(
            long totalMaquetas,
            long maquetasConfiguradas,
            long maquetasDisponibles,
            long sinConfigurar) {
        this.totalMaquetas = totalMaquetas;
        this.maquetasConfiguradas = maquetasConfiguradas;
        this.maquetasDisponibles = maquetasDisponibles;
        this.sinConfigurar = sinConfigurar;
    }

    public long getTotalMaquetas() { return totalMaquetas; }
    public void setTotalMaquetas(long totalMaquetas) { this.totalMaquetas = totalMaquetas; }

    public long getMaquetasConfiguradas() { return maquetasConfiguradas; }
    public void setMaquetasConfiguradas(long maquetasConfiguradas) { this.maquetasConfiguradas = maquetasConfiguradas; }

    public long getMaquetasDisponibles() { return maquetasDisponibles; }
    public void setMaquetasDisponibles(long maquetasDisponibles) { this.maquetasDisponibles = maquetasDisponibles; }

    public long getSinConfigurar() { return sinConfigurar; }
    public void setSinConfigurar(long sinConfigurar) { this.sinConfigurar = sinConfigurar; }
}
