package com.amazonas.backend.modules.requests.dto;

import java.math.BigDecimal;
import java.util.UUID;

public class KitCustomizedMaterialResponse {

    private UUID id;
    private UUID materialId;
    private String materialName;
    private String materialUnit;
    private BigDecimal cantidad;
    private BigDecimal costoUnitarioReferencia;
    private BigDecimal subtotal;

    public KitCustomizedMaterialResponse() {}

    public UUID getId() { return id; }
    public void setId(UUID id) { this.id = id; }

    public UUID getMaterialId() { return materialId; }
    public void setMaterialId(UUID materialId) { this.materialId = materialId; }

    public String getMaterialName() { return materialName; }
    public void setMaterialName(String materialName) { this.materialName = materialName; }

    public String getMaterialUnit() { return materialUnit; }
    public void setMaterialUnit(String materialUnit) { this.materialUnit = materialUnit; }

    public BigDecimal getCantidad() { return cantidad; }
    public void setCantidad(BigDecimal cantidad) { this.cantidad = cantidad; }

    public BigDecimal getCostoUnitarioReferencia() { return costoUnitarioReferencia; }
    public void setCostoUnitarioReferencia(BigDecimal costoUnitarioReferencia) { this.costoUnitarioReferencia = costoUnitarioReferencia; }

    public BigDecimal getSubtotal() { return subtotal; }
    public void setSubtotal(BigDecimal subtotal) { this.subtotal = subtotal; }
}
