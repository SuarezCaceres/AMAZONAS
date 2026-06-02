package com.amazonas.backend.modules.auth.dto;

import java.util.UUID;

import com.amazonas.backend.modules.auth.enums.Role;

public class CurrentUserResponse {

    private UUID id;
    private String nombre;
    private String email;
    private String telefono;
    private Role role;

    public CurrentUserResponse() {
    }

    public CurrentUserResponse(
            UUID id,
            String nombre,
            String email,
            String telefono,
            Role role
    ) {
        this.id = id;
        this.nombre = nombre;
        this.email = email;
        this.telefono = telefono;
        this.role = role;
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

    public String getTelefono() {
        return telefono;
    }

    public void setTelefono(String telefono) {
        this.telefono = telefono;
    }

    public Role getRole() {
        return role;
    }

    public void setRole(Role role) {
        this.role = role;
    }
}