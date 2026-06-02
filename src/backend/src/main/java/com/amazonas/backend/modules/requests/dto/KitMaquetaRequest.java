package com.amazonas.backend.modules.requests.dto;

import java.math.BigDecimal;
import java.util.UUID;

public class KitMaquetaRequest {

    private UUID productId;
    private Integer cantidad;
    private BigDecimal precioUnitarioReferencia;

    public KitMaquetaRequest() {}

    public UUID getProductId() { return productId; }
    public void setProductId(UUID productId) { this.productId = productId; }

    public Integer getCantidad() { return cantidad; }
    public void setCantidad(Integer cantidad) { this.cantidad = cantidad; }

    public BigDecimal getPrecioUnitarioReferencia() { return precioUnitarioReferencia; }
    public void setPrecioUnitarioReferencia(BigDecimal precioUnitarioReferencia) { this.precioUnitarioReferencia = precioUnitarioReferencia; }
}
