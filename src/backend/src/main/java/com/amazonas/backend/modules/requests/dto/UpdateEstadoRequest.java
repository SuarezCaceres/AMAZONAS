package com.amazonas.backend.modules.requests.dto;

import com.amazonas.backend.modules.requests.enums.EstadoSolicitud;

public record UpdateEstadoRequest(
    EstadoSolicitud estado
) {}
