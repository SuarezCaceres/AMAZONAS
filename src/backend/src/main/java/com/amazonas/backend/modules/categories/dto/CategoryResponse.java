package com.amazonas.backend.modules.categories.dto;

public class CategoryResponse {

    private String id;
    private String nombre;
    private String descripcion;
    private Integer orden;

    public CategoryResponse() {}

    public CategoryResponse(String id, String nombre, String descripcion, Integer orden) {
        this.id = id;
        this.nombre = nombre;
        this.descripcion = descripcion;
        this.orden = orden;
    }

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }

    public String getNombre() { return nombre; }
    public void setNombre(String nombre) { this.nombre = nombre; }

    public String getDescripcion() { return descripcion; }
    public void setDescripcion(String descripcion) { this.descripcion = descripcion; }

    public Integer getOrden() { return orden; }
    public void setOrden(Integer orden) { this.orden = orden; }
}
