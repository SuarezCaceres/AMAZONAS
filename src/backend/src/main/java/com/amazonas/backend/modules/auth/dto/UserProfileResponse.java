package com.amazonas.backend.modules.auth.dto;

public record UserProfileResponse(
    String id,
    String nombre,
    String email,
    String role
) {}
