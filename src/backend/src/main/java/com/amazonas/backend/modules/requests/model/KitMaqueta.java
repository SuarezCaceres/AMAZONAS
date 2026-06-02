package com.amazonas.backend.modules.requests.model;

import java.math.BigDecimal;
import java.util.UUID;

import com.amazonas.backend.modules.products.model.Product;
import com.fasterxml.jackson.annotation.JsonIgnore;

import jakarta.persistence.*;

@Entity
@Table(name = "kit_maquetas")
public class KitMaqueta {

    @Id
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "purchase_request_id", nullable = false)
    @JsonIgnore
    private PurchaseRequest purchaseRequest;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "product_id", nullable = false)
    private Product product;

    @Column(name = "product_name", nullable = false, length = 255)
    private String productName;

    @Column(name = "product_slug", length = 255)
    private String productSlug;

    @Column(nullable = false)
    private Integer cantidad = 1;

    @Column(name = "precio_unitario_referencia")
    private BigDecimal precioUnitarioReferencia;

    @PrePersist
    protected void onCreate() {
        if (this.id == null) {
            this.id = UUID.randomUUID();
        }
    }

    public KitMaqueta() {}

    public KitMaqueta(PurchaseRequest purchaseRequest, Product product, String productName, String productSlug, Integer cantidad, BigDecimal precioUnitarioReferencia) {
        this.purchaseRequest = purchaseRequest;
        this.product = product;
        this.productName = productName;
        this.productSlug = productSlug;
        this.cantidad = cantidad;
        this.precioUnitarioReferencia = precioUnitarioReferencia;
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

    public PurchaseRequest getPurchaseRequest() {
        return purchaseRequest;
    }

    public void setPurchaseRequest(PurchaseRequest purchaseRequest) {
        this.purchaseRequest = purchaseRequest;
    }

    public Product getProduct() {
        return product;
    }

    public void setProduct(Product product) {
        this.product = product;
    }

    public String getProductName() {
        return productName;
    }

    public void setProductName(String productName) {
        this.productName = productName;
    }

    public String getProductSlug() {
        return productSlug;
    }

    public void setProductSlug(String productSlug) {
        this.productSlug = productSlug;
    }

    public Integer getCantidad() {
        return cantidad;
    }

    public void setCantidad(Integer cantidad) {
        this.cantidad = cantidad;
    }

    public BigDecimal getPrecioUnitarioReferencia() {
        return precioUnitarioReferencia;
    }

    public void setPrecioUnitarioReferencia(BigDecimal precioUnitarioReferencia) {
        this.precioUnitarioReferencia = precioUnitarioReferencia;
    }
}
