package com.amazonas.backend.modules.materials.dto;

import java.math.BigDecimal;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public class MaterialRequest {

    @NotBlank(message = "El nombre es obligatorio")
    @Size(max = 100, message = "El nombre debe tener como máximo 100 caracteres")
    private String nombre;

    @NotBlank(message = "La unidad es obligatoria")
    @Size(max = 20, message = "La unidad debe tener como máximo 20 caracteres")
    private String unidad;

    @NotNull(message = "El costo de compra es obligatorio")
    @DecimalMin(value = "0.0", message = "El costo de compra no puede ser negativo")
    private BigDecimal costoCompra;

    @NotNull(message = "El costo de venta es obligatorio")
    @DecimalMin(value = "0.0", message = "El costo de venta no puede ser negativo")
    private BigDecimal costoVenta;

    @NotNull(message = "El stock actual es obligatorio")
    @Min(value = 0, message = "El stock actual no puede ser negativo")
    private Integer stockActual;

    @NotBlank(message = "La categoría del material es obligatoria")
    private String categoriaId;

    private String proveedor;

    private Boolean activo = true;

    // =========================
    // GETTERS & SETTERS
    // =========================

    public String getNombre() {
        return nombre;
    }

    public void setNombre(String nombre) {
        this.nombre = nombre;
    }

    public String getUnidad() {
        return unidad;
    }

    public void setUnidad(String unidad) {
        this.unidad = unidad;
    }

    public BigDecimal getCostoCompra() {
        return costoCompra;
    }

    public void setCostoCompra(BigDecimal costoCompra) {
        this.costoCompra = costoCompra;
    }

    public BigDecimal getCostoVenta() {
        return costoVenta;
    }

    public void setCostoVenta(BigDecimal costoVenta) {
        this.costoVenta = costoVenta;
    }

    public Integer getStockActual() {
        return stockActual;
    }

    public void setStockActual(Integer stockActual) {
        this.stockActual = stockActual;
    }

    public String getCategoriaId() {
        return categoriaId;
    }

    public void setCategoriaId(String categoriaId) {
        this.categoriaId = categoriaId;
    }

    public String getProveedor() {
        return proveedor;
    }

    public void setProveedor(String proveedor) {
        this.proveedor = proveedor;
    }

    public Boolean getActivo() {
        return activo;
    }

    public void setActivo(Boolean activo) {
        this.activo = activo;
    }
}
