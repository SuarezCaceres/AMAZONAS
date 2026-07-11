package com.amazonas.backend.modules.auth.dto;

public record AuthResponse(
    String token,
    String email,
    String role,
    String nombre
) {}