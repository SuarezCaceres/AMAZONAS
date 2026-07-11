package com.amazonas.backend.modules.auth.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;

public record LoginRequest(
    @NotBlank(message = "El email es obligatorio")
    @Email(message = "Email inválido")
    String email,

    @NotBlank(message = "La contraseña es obligatoria")
    String password
) {
    public LoginRequest {
        if (email != null) email = email.trim();
    }
}