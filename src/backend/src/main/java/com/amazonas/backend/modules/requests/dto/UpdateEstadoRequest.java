package com.amazonas.backend.modules.requests.dto;

import com.amazonas.backend.modules.requests.enums.EstadoSolicitud;

public class UpdateEstadoRequest {

    private EstadoSolicitud estado;

    public UpdateEstadoRequest() {}

    public EstadoSolicitud getEstado() { return estado; }
    public void setEstado(EstadoSolicitud estado) { this.estado = estado; }
}
