package com.amazonas.backend.modules.budgets.dto;

import java.math.BigDecimal;
import java.util.UUID;

public class BudgetItemResponse {

    private UUID id;
    private UUID materialId;
    private String materialNombre;
    private String materialUnidad;
    private BigDecimal cantidad;
    private BigDecimal costoUnitario; // Snapshot histórico
    private BigDecimal subtotal;

    public BudgetItemResponse() {}

    public UUID getId() { return id; }
    public void setId(UUID id) { this.id = id; }

    public UUID getMaterialId() { return materialId; }
    public void setMaterialId(UUID materialId) { this.materialId = materialId; }

    public String getMaterialNombre() { return materialNombre; }
    public void setMaterialNombre(String materialNombre) { this.materialNombre = materialNombre; }

    public String getMaterialUnidad() { return materialUnidad; }
    public void setMaterialUnidad(String materialUnidad) { this.materialUnidad = materialUnidad; }

    public BigDecimal getCantidad() { return cantidad; }
    public void setCantidad(BigDecimal cantidad) { this.cantidad = cantidad; }

    public BigDecimal getCostoUnitario() { return costoUnitario; }
    public void setCostoUnitario(BigDecimal costoUnitario) { this.costoUnitario = costoUnitario; }

    public BigDecimal getSubtotal() { return subtotal; }
    public void setSubtotal(BigDecimal subtotal) { this.subtotal = subtotal; }
}
