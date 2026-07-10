package com.amazonas.backend.modules.auth.dto;

public class UserProfileResponse {

    private String id;
    private String nombre;
    private String email;
    private String role;

    public UserProfileResponse() {
    }

    public UserProfileResponse(String id, String nombre, String email, String role) {
        this.id = id;
        this.nombre = nombre;
        this.email = email;
        this.role = role;
    }

    public String getId() {
        return id;
    }

    public void setId(String id) {
        this.id = id;
    }

    public String getNombre() {
        return nombre;
    }

    public void setNombre(String nombre) {
        this.nombre = nombre;
    }

    public String getEmail() {
        return email;
    }

    public void setEmail(String email) {
        this.email = email;
    }

    public String getRole() {
        return role;
    }

    public void setRole(String role) {
        this.role = role;
    }
}
