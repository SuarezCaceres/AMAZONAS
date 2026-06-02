package com.amazonas.backend.modules.requests.dto;

import java.math.BigDecimal;
import java.util.UUID;

public class KitMaquetaResponse {

    private UUID id;
    private UUID productId;
    private String productName;
    private String productSlug;
    private Integer cantidad;
    private BigDecimal precioUnitarioReferencia;
    private BigDecimal subtotal;

    public KitMaquetaResponse() {}

    public UUID getId() { return id; }
    public void setId(UUID id) { this.id = id; }

    public UUID getProductId() { return productId; }
    public void setProductId(UUID productId) { this.productId = productId; }

    public String getProductName() { return productName; }
    public void setProductName(String productName) { this.productName = productName; }

    public String getProductSlug() { return productSlug; }
    public void setProductSlug(String productSlug) { this.productSlug = productSlug; }

    public Integer getCantidad() { return cantidad; }
    public void setCantidad(Integer cantidad) { this.cantidad = cantidad; }

    public BigDecimal getPrecioUnitarioReferencia() { return precioUnitarioReferencia; }
    public void setPrecioUnitarioReferencia(BigDecimal precioUnitarioReferencia) { this.precioUnitarioReferencia = precioUnitarioReferencia; }

    public BigDecimal getSubtotal() { return subtotal; }
    public void setSubtotal(BigDecimal subtotal) { this.subtotal = subtotal; }
}
