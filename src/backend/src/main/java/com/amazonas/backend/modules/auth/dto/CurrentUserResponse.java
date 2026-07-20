package com.amazonas.backend.modules.auth.dto;

import java.util.UUID;
import com.amazonas.backend.modules.auth.enums.Role;

public record CurrentUserResponse(
    UUID id,
    String nombre,
    String email,
    String telefono,
    Role role
) {}