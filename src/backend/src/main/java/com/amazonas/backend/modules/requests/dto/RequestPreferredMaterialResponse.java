package com.amazonas.backend.modules.requests.dto;

import java.util.UUID;

public class RequestPreferredMaterialResponse {

    private UUID id;
    private UUID materialId;
    private String materialName;
    private String razonPreferencia;

    public RequestPreferredMaterialResponse() {}

    public UUID getId() { return id; }
    public void setId(UUID id) { this.id = id; }

    public UUID getMaterialId() { return materialId; }
    public void setMaterialId(UUID materialId) { this.materialId = materialId; }

    public String getMaterialName() { return materialName; }
    public void setMaterialName(String materialName) { this.materialName = materialName; }

    public String getRazonPreferencia() { return razonPreferencia; }
    public void setRazonPreferencia(String razonPreferencia) { this.razonPreferencia = razonPreferencia; }
}
