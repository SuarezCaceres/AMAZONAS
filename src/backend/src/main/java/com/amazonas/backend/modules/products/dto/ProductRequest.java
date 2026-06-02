package com.amazonas.backend.modules.products.dto;

import java.math.BigDecimal;
import java.util.List;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public class ProductRequest {

    @NotBlank(message = "El título es obligatorio")
    @Size(max = 200, message = "El título debe tener como máximo 200 caracteres")
    private String titulo;

    private String descripcion;

    private String descripcionDetallada;

    @NotBlank(message = "La categoría es obligatoria")
    private String categoriaId;

    @Size(max = 500, message = "La URL de la imagen debe tener como máximo 500 caracteres")
    private String imageUrl;

    private List<ProductMaterialInput> materiales;

    @Size(max = 50)
    private String gradoEscolar;

    private List<String> ocasion;

    private List<String> caracteristicas;

    private Boolean materialesReciclables = false;

    @NotNull(message = "El stock es obligatorio")
    @Min(value = 0, message = "El stock no puede ser negativo")
    private Integer stock = 0;

    // =========================
    // NESTED DTO: Material input para crear/editar producto
    // =========================

    public static class ProductMaterialInput {
        @NotBlank(message = "El nombre del material es obligatorio")
        private String nombre;

        private BigDecimal cantidadSugerida = BigDecimal.ONE;

        private Boolean esOpcional = false;

        private String notas;

        public String getNombre() {
            return nombre;
        }

        public void setNombre(String nombre) {
            this.nombre = nombre;
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

    // =========================
    // GETTERS & SETTERS
    // =========================

    public String getTitulo() {
        return titulo;
    }

    public void setTitulo(String titulo) {
        this.titulo = titulo;
    }

    public String getDescripcion() {
        return descripcion;
    }

    public void setDescripcion(String descripcion) {
        this.descripcion = descripcion;
    }

    public String getDescripcionDetallada() {
        return descripcionDetallada;
    }

    public void setDescripcionDetallada(String descripcionDetallada) {
        this.descripcionDetallada = descripcionDetallada;
    }

    public String getCategoriaId() {
        return categoriaId;
    }

    public void setCategoriaId(String categoriaId) {
        this.categoriaId = categoriaId;
    }

    public String getImageUrl() {
        return imageUrl;
    }

    public void setImageUrl(String imageUrl) {
        this.imageUrl = imageUrl;
    }

    public List<ProductMaterialInput> getMateriales() {
        return materiales;
    }

    public void setMateriales(List<ProductMaterialInput> materiales) {
        this.materiales = materiales;
    }

    public String getGradoEscolar() {
        return gradoEscolar;
    }

    public void setGradoEscolar(String gradoEscolar) {
        this.gradoEscolar = gradoEscolar;
    }

    public List<String> getOcasion() {
        return ocasion;
    }

    public void setOcasion(List<String> ocasion) {
        this.ocasion = ocasion;
    }

    public List<String> getCaracteristicas() {
        return caracteristicas;
    }

    public void setCaracteristicas(List<String> caracteristicas) {
        this.caracteristicas = caracteristicas;
    }

    public Boolean getMaterialesReciclables() {
        return materialesReciclables;
    }

    public void setMaterialesReciclables(Boolean materialesReciclables) {
        this.materialesReciclables = materialesReciclables;
    }

    public Integer getStock() {
        return stock;
    }

    public void setStock(Integer stock) {
        this.stock = stock;
    }
}
