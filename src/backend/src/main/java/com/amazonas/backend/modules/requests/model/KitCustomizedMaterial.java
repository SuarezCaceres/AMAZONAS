package com.amazonas.backend.modules.requests.model;

import java.math.BigDecimal;
import java.util.UUID;

import com.amazonas.backend.modules.materials.model.Material;
import com.fasterxml.jackson.annotation.JsonIgnore;

import jakarta.persistence.*;

@Entity
@Table(name = "kit_customized_materials")
public class KitCustomizedMaterial {

    @Id
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "purchase_request_id", nullable = false)
    @JsonIgnore
    private PurchaseRequest purchaseRequest;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "material_id", nullable = false)
    private Material material;

    @Column(name = "material_name", nullable = false, length = 255)
    private String materialName;

    @Column(name = "material_unit", nullable = false, length = 50)
    private String materialUnit;

    @Column(nullable = false, precision = 10, scale = 2)
    private BigDecimal cantidad;

    @Column(name = "costo_unitario_referencia", nullable = false, precision = 10, scale = 2)
    private BigDecimal costoUnitarioReferencia;

    @PrePersist
    protected void onCreate() {
        if (this.id == null) {
            this.id = UUID.randomUUID();
        }
    }

    public KitCustomizedMaterial() {}

    public KitCustomizedMaterial(PurchaseRequest purchaseRequest, Material material, String materialName, String materialUnit, BigDecimal cantidad, BigDecimal costoUnitarioReferencia) {
        this.purchaseRequest = purchaseRequest;
        this.material = material;
        this.materialName = materialName;
        this.materialUnit = materialUnit;
        this.cantidad = cantidad;
        this.costoUnitarioReferencia = costoUnitarioReferencia;
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

    public Material getMaterial() {
        return material;
    }

    public void setMaterial(Material material) {
        this.material = material;
    }

    public String getMaterialName() {
        return materialName;
    }

    public void setMaterialName(String materialName) {
        this.materialName = materialName;
    }

    public String getMaterialUnit() {
        return materialUnit;
    }

    public void setMaterialUnit(String materialUnit) {
        this.materialUnit = materialUnit;
    }

    public BigDecimal getCantidad() {
        return cantidad;
    }

    public void setCantidad(BigDecimal cantidad) {
        this.cantidad = cantidad;
    }

    public BigDecimal getCostoUnitarioReferencia() {
        return costoUnitarioReferencia;
    }

    public void setCostoUnitarioReferencia(BigDecimal costoUnitarioReferencia) {
        this.costoUnitarioReferencia = costoUnitarioReferencia;
    }
}
