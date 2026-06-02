package com.amazonas.backend.modules.requests.model;

import java.math.BigDecimal;
import java.util.UUID;

import com.fasterxml.jackson.annotation.JsonIgnore;

import jakarta.persistence.*;

@Entity
@Table(name = "kit_personal_materials")
public class KitPersonalMaterial {

    @Id
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "purchase_request_id", nullable = false)
    @JsonIgnore
    private PurchaseRequest purchaseRequest;

    @Column(name = "material_name", nullable = false, length = 255)
    private String materialName;

    @Column(nullable = false, precision = 10, scale = 2)
    private BigDecimal cantidad;

    @Column(columnDefinition = "TEXT")
    private String descripcion;

    @PrePersist
    protected void onCreate() {
        if (this.id == null) {
            this.id = UUID.randomUUID();
        }
    }

    public KitPersonalMaterial() {}

    public KitPersonalMaterial(PurchaseRequest purchaseRequest, String materialName, BigDecimal cantidad, String descripcion) {
        this.purchaseRequest = purchaseRequest;
        this.materialName = materialName;
        this.cantidad = cantidad;
        this.descripcion = descripcion;
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

    public String getMaterialName() {
        return materialName;
    }

    public void setMaterialName(String materialName) {
        this.materialName = materialName;
    }

    public BigDecimal getCantidad() {
        return cantidad;
    }

    public void setCantidad(BigDecimal cantidad) {
        this.cantidad = cantidad;
    }

    public String getDescripcion() {
        return descripcion;
    }

    public void setDescripcion(String descripcion) {
        this.descripcion = descripcion;
    }
}
