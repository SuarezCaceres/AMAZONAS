package com.amazonas.backend.modules.auth.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;

public record LoginVendorRequest(
    @Email
    @NotBlank
    String email,

    @NotBlank
    String password
) {
    public LoginVendorRequest {
        if (email != null) email = email.trim();
    }
}