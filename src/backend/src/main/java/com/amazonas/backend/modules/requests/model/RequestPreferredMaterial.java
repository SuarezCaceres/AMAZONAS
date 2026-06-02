package com.amazonas.backend.modules.requests.model;

import java.util.UUID;

import com.amazonas.backend.modules.materials.model.Material;
import com.fasterxml.jackson.annotation.JsonIgnore;

import jakarta.persistence.*;

@Entity
@Table(name = "request_preferred_materials")
public class RequestPreferredMaterial {

    @Id
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "purchase_request_id", nullable = false)
    @JsonIgnore
    private PurchaseRequest purchaseRequest;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "material_id")
    private Material material;

    @Column(name = "material_name", nullable = false, length = 255)
    private String materialName;

    @Column(name = "razon_preferencia", columnDefinition = "TEXT")
    private String razonPreferencia;

    @PrePersist
    protected void onCreate() {
        if (this.id == null) {
            this.id = UUID.randomUUID();
        }
    }

    public RequestPreferredMaterial() {}

    public RequestPreferredMaterial(PurchaseRequest purchaseRequest, Material material, String materialName, String razonPreferencia) {
        this.purchaseRequest = purchaseRequest;
        this.material = material;
        this.materialName = materialName;
        this.razonPreferencia = razonPreferencia;
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

    public String getRazonPreferencia() {
        return razonPreferencia;
    }

    public void setRazonPreferencia(String razonPreferencia) {
        this.razonPreferencia = razonPreferencia;
    }
}
