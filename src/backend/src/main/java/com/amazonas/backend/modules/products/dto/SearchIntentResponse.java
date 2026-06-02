package com.amazonas.backend.modules.products.dto;

public class SearchIntentResponse {

    private String action; // "SEARCH" o "CUSTOMIZE"
    private String categoria; // "Ciencia", "Arquitectura", "Educativo", "Inclusivo" o null
    private Integer confianza; // Nivel de confianza entre 0 y 100
    private String explicacion; // Breve explicación de la decisión de la clasificación o de la coincidencia

    public SearchIntentResponse() {
    }

    public SearchIntentResponse(String action, String categoria, Integer confianza, String explicacion) {
        this.action = action;
        this.categoria = categoria;
        this.confianza = confianza;
        this.explicacion = explicacion;
    }

    public String getAction() {
        return action;
    }

    public void setAction(String action) {
        this.action = action;
    }

    public String getCategoria() {
        return categoria;
    }

    public void setCategoria(String categoria) {
        this.categoria = categoria;
    }

    public Integer getConfianza() {
        return confianza;
    }

    public void setConfianza(Integer confianza) {
        this.confianza = confianza;
    }

    public String getExplicacion() {
        return explicacion;
    }

    public void setExplicacion(String explicacion) {
        this.explicacion = explicacion;
    }
}
