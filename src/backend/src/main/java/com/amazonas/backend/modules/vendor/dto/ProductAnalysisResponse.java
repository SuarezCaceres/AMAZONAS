package com.amazonas.backend.modules.vendor.dto;

public class ProductAnalysisResponse {

    private String productoId;
    private String titulo;
    private String categoriaNombre;
    private String imageUrl;
    private long totalSolicitudes;

    public ProductAnalysisResponse() {}

    public ProductAnalysisResponse(
            String productoId,
            String titulo,
            String categoriaNombre,
            String imageUrl,
            long totalSolicitudes) {
        this.productoId = productoId;
        this.titulo = titulo;
        this.categoriaNombre = categoriaNombre;
        this.imageUrl = imageUrl;
        this.totalSolicitudes = totalSolicitudes;
    }

    public String getProductoId() {
        return productoId;
    }

    public void setProductoId(String productoId) {
        this.productoId = productoId;
    }

    public String getTitulo() {
        return titulo;
    }

    public void setTitulo(String titulo) {
        this.titulo = titulo;
    }

    public String getCategoriaNombre() {
        return categoriaNombre;
    }

    public void setCategoriaNombre(String categoriaNombre) {
        this.categoriaNombre = categoriaNombre;
    }

    public String getImageUrl() {
        return imageUrl;
    }

    public void setImageUrl(String imageUrl) {
        this.imageUrl = imageUrl;
    }

    public long getTotalSolicitudes() {
        return totalSolicitudes;
    }

    public void setTotalSolicitudes(long totalSolicitudes) {
        this.totalSolicitudes = totalSolicitudes;
    }
}
