package com.amazonas.backend.modules.reports.model;

import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "nightly_reports")
public class NightlyReport {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "fecha", nullable = false)
    private LocalDateTime fecha;

    @Column(name = "total_maquetas", nullable = false)
    private long totalMaquetas;

    @Column(name = "total_solicitudes", nullable = false)
    private long totalSolicitudes;

    @Column(name = "solicitudes_pendientes", nullable = false)
    private long solicitudesPendientes;

    @Column(name = "solicitudes_completadas", nullable = false)
    private long solicitudesCompletadas;

    @Column(name = "total_presupuestos", nullable = false)
    private long totalPresupuestos;

    @Column(name = "total_monto_presupuestado", nullable = false, precision = 12, scale = 2)
    private BigDecimal totalMontoPresupuestado;

    @Column(name = "mensajes_no_leidos", nullable = false)
    private long mensajesNoLeidos;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @PrePersist
    protected void onCreate() {
        this.createdAt = LocalDateTime.now();
        if (this.fecha == null) {
            this.fecha = LocalDateTime.now();
        }
    }

    public UUID getId() {
        return id;
    }

    public void setId(UUID id) {
        this.id = id;
    }

    public LocalDateTime getFecha() {
        return fecha;
    }

    public void setFecha(LocalDateTime fecha) {
        this.fecha = fecha;
    }

    public long getTotalMaquetas() {
        return totalMaquetas;
    }

    public void setTotalMaquetas(long totalMaquetas) {
        this.totalMaquetas = totalMaquetas;
    }

    public long getTotalSolicitudes() {
        return totalSolicitudes;
    }

    public void setTotalSolicitudes(long totalSolicitudes) {
        this.totalSolicitudes = totalSolicitudes;
    }

    public long getSolicitudesPendientes() {
        return solicitudesPendientes;
    }

    public void setSolicitudesPendientes(long solicitudesPendientes) {
        this.solicitudesPendientes = solicitudesPendientes;
    }

    public long getSolicitudesCompletadas() {
        return solicitudesCompletadas;
    }

    public void setSolicitudesCompletadas(long solicitudesCompletadas) {
        this.solicitudesCompletadas = solicitudesCompletadas;
    }

    public long getTotalPresupuestos() {
        return totalPresupuestos;
    }

    public void setTotalPresupuestos(long totalPresupuestos) {
        this.totalPresupuestos = totalPresupuestos;
    }

    public BigDecimal getTotalMontoPresupuestado() {
        return totalMontoPresupuestado;
    }

    public void setTotalMontoPresupuestado(BigDecimal totalMontoPresupuestado) {
        this.totalMontoPresupuestado = totalMontoPresupuestado;
    }

    public long getMensajesNoLeidos() {
        return mensajesNoLeidos;
    }

    public void setMensajesNoLeidos(long mensajesNoLeidos) {
        this.mensajesNoLeidos = mensajesNoLeidos;
    }

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(LocalDateTime createdAt) {
        this.createdAt = createdAt;
    }
}
