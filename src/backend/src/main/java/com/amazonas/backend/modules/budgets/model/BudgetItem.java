package com.amazonas.backend.modules.budgets.model;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.UUID;

import com.amazonas.backend.modules.materials.model.Material;
import com.fasterxml.jackson.annotation.JsonIgnore;

import jakarta.persistence.*;

@Entity
@Table(name = "budget_items")
public class BudgetItem {

    @Id
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "presupuesto_id", nullable = false)
    @JsonIgnore
    private Budget presupuesto;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "material_id", nullable = false)
    private Material material;

    @Column(nullable = false, precision = 10, scale = 2)
    private BigDecimal cantidad;

    @Column(name = "costo_unitario", nullable = false, precision = 10, scale = 2)
    private BigDecimal costoUnitario; // Snapshot histórico de costoVenta del material

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @PrePersist
    protected void onCreate() {
        if (this.id == null) {
            this.id = UUID.randomUUID();
        }
        this.createdAt = LocalDateTime.now();
    }

    public BudgetItem() {}

    public BudgetItem(Budget presupuesto, Material material, BigDecimal cantidad, BigDecimal costoUnitario) {
        this.presupuesto = presupuesto;
        this.material = material;
        this.cantidad = cantidad;
        this.costoUnitario = costoUnitario;
    }

    // Método calculado para el subtotal de este item
    public BigDecimal getSubtotal() {
        if (cantidad == null || costoUnitario == null) return BigDecimal.ZERO;
        return cantidad.multiply(costoUnitario);
    }

    // =========================
    // GETTERS & SETTERS
    // =========================

    public UUID getId() {
        return id;
    }

    public void setId(UUID id) {
        this.id = id;
    }

    public Budget getPresupuesto() {
        return presupuesto;
    }

    public void setPresupuesto(Budget presupuesto) {
        this.presupuesto = presupuesto;
    }

    public Material getMaterial() {
        return material;
    }

    public void setMaterial(Material material) {
        this.material = material;
    }

    public BigDecimal getCantidad() {
        return cantidad;
    }

    public void setCantidad(BigDecimal cantidad) {
        this.cantidad = cantidad;
    }

    public BigDecimal getCostoUnitario() {
        return costoUnitario;
    }

    public void setCostoUnitario(BigDecimal costoUnitario) {
        this.costoUnitario = costoUnitario;
    }

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(LocalDateTime createdAt) {
        this.createdAt = createdAt;
    }
}
