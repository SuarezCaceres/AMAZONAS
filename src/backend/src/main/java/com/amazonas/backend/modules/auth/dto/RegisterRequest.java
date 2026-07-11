package com.amazonas.backend.modules.auth.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record RegisterRequest(
    @NotBlank(message = "El nombre es obligatorio")
    @Size(max = 100)
    String nombre,

    @NotBlank(message = "El email es obligatorio")
    @Email(message = "Email inválido")
    String email,

    @NotBlank(message = "La contraseña es obligatoria")
    @Size(min = 6, message = "La contraseña debe tener al menos 6 caracteres")
    String password,

    @Size(max = 15, message = "El teléfono debe tener como máximo 15 caracteres")
    String telefono
) {
    public RegisterRequest {
        if (nombre != null) nombre = nombre.trim();
        if (email != null) email = email.trim();
        if (telefono != null) telefono = telefono.trim();
    }
}