package com.amazonas.backend.modules.auth.dto;

public class AuthResponse {

    private String token;

    private String email;

    private String role;

    private String nombre;

    public AuthResponse() {
    }

    public AuthResponse(
            String token,
            String email,
            String role,
            String nombre
    ) {

        this.token = token;
        this.email = email;
        this.role = role;
        this.nombre = nombre;
    }

    public String getToken() {
        return token;
    }

    public void setToken(String token) {
        this.token = token;
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

    public String getNombre() {
        return nombre;
    }

    public void setNombre(String nombre) {
        this.nombre = nombre;
    }
}