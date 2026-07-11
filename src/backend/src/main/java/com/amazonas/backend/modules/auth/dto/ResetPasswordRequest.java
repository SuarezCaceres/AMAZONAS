package com.amazonas.backend.modules.auth.dto;

public record ResetPasswordRequest(
    String token,
    String newPassword
) {}
