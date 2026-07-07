package com.amazonas.backend.modules.requests.dto;

public class RejectRequest {
    private String motivo;

    public RejectRequest() {}

    public RejectRequest(String motivo) {
        this.motivo = motivo;
    }

    public String getMotivo() {
        return motivo;
    }

    public void setMotivo(String motivo) {
        this.motivo = motivo;
    }
}
