package com.amazonas.backend.modules.budgets.dto;

import java.math.BigDecimal;
import java.util.UUID;

public class BudgetItemRequest {

    private UUID materialId;
    private BigDecimal cantidad;
    // costoUnitario es un snapshot tomado al momento de crear: se captura desde el Material en el servicio

    public BudgetItemRequest() {}

    public UUID getMaterialId() { return materialId; }
    public void setMaterialId(UUID materialId) { this.materialId = materialId; }

    public BigDecimal getCantidad() { return cantidad; }
    public void setCantidad(BigDecimal cantidad) { this.cantidad = cantidad; }
}
