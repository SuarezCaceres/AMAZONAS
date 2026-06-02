package com.amazonas.backend.modules.requests.dto;

import java.math.BigDecimal;

public class KitPersonalMaterialRequest {

    private String materialName;
    private BigDecimal cantidad;
    private String descripcion;

    public KitPersonalMaterialRequest() {}

    public String getMaterialName() { return materialName; }
    public void setMaterialName(String materialName) { this.materialName = materialName; }

    public BigDecimal getCantidad() { return cantidad; }
    public void setCantidad(BigDecimal cantidad) { this.cantidad = cantidad; }

    public String getDescripcion() { return descripcion; }
    public void setDescripcion(String descripcion) { this.descripcion = descripcion; }
}
