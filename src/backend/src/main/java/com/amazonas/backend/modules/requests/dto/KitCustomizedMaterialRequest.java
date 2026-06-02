package com.amazonas.backend.modules.requests.dto;

import java.math.BigDecimal;
import java.util.UUID;

public class KitCustomizedMaterialRequest {

    private UUID materialId;
    private BigDecimal cantidad;

    public KitCustomizedMaterialRequest() {}

    public UUID getMaterialId() { return materialId; }
    public void setMaterialId(UUID materialId) { this.materialId = materialId; }

    public BigDecimal getCantidad() { return cantidad; }
    public void setCantidad(BigDecimal cantidad) { this.cantidad = cantidad; }
}
