package com.amazonas.backend.modules.requests.dto;

import java.util.UUID;

public class RequestPreferredMaterialRequest {

    private UUID materialId; // Opcional
    private String materialName;
    private String razonPreferencia;

    public RequestPreferredMaterialRequest() {}

    public UUID getMaterialId() { return materialId; }
    public void setMaterialId(UUID materialId) { this.materialId = materialId; }

    public String getMaterialName() { return materialName; }
    public void setMaterialName(String materialName) { this.materialName = materialName; }

    public String getRazonPreferencia() { return razonPreferencia; }
    public void setRazonPreferencia(String razonPreferencia) { this.razonPreferencia = razonPreferencia; }
}
