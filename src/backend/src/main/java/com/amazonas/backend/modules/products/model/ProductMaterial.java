package com.amazonas.backend.modules.products.model;

import java.math.BigDecimal;
import java.util.UUID;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.PrePersist;
import jakarta.persistence.Table;

import com.amazonas.backend.modules.materials.model.Material;
import com.fasterxml.jackson.annotation.JsonIgnore;

@Entity
@Table(name = "product_materials")
public class ProductMaterial {

    @Id
    private UUID id;

    @ManyToOne
    @JoinColumn(name = "product_id", nullable = false)
    @JsonIgnore
    private Product product;

    @ManyToOne
    @JoinColumn(name = "material_id", nullable = false)
    private Material material;

    @Column(name = "cantidad_sugerida", nullable = false)
    private BigDecimal cantidadSugerida = BigDecimal.ONE;

    @Column(name = "es_opcional", nullable = false)
    private Boolean esOpcional = false;

    @Column(columnDefinition = "TEXT")
    private String notas;

    @PrePersist
    protected void onCreate() {
        if (this.id == null) {
            this.id = UUID.randomUUID();
        }
    }

    public ProductMaterial() {}

    public ProductMaterial(Product product, Material material, BigDecimal cantidadSugerida, Boolean esOpcional) {
        this.product = product;
        this.material = material;
        this.cantidadSugerida = cantidadSugerida;
        this.esOpcional = esOpcional;
        this.notas = null;
    }

    public ProductMaterial(Product product, Material material, BigDecimal cantidadSugerida, Boolean esOpcional, String notas) {
        this.product = product;
        this.material = material;
        this.cantidadSugerida = cantidadSugerida;
        this.esOpcional = esOpcional;
        this.notas = notas;
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

    public Product getProduct() {
        return product;
    }

    public void setProduct(Product product) {
        this.product = product;
    }

    public Material getMaterial() {
        return material;
    }

    public void setMaterial(Material material) {
        this.material = material;
    }

    public BigDecimal getCantidadSugerida() {
        return cantidadSugerida;
    }

    public void setCantidadSugerida(BigDecimal cantidadSugerida) {
        this.cantidadSugerida = cantidadSugerida;
    }

    public Boolean getEsOpcional() {
        return esOpcional;
    }

    public void setEsOpcional(Boolean esOpcional) {
        this.esOpcional = esOpcional;
    }

    public String getNotas() {
        return notas;
    }

    public void setNotas(String notas) {
        this.notas = notas;
    }
}
