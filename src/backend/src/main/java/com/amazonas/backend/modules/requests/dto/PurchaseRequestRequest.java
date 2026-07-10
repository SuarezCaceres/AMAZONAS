package com.amazonas.backend.modules.requests.dto;

import java.util.List;
import java.util.UUID;

public record PurchaseRequestRequest(
    String clienteNombre,
    String clienteEmail,
    String clienteTelefono,
    String mensaje,
    UUID productoId,
    Boolean isKit,
    List<KitMaquetaRequest> kits,
    Boolean isCustom,
    String descripcionPersonalizacion,
    String materialesDeseados,
    List<KitCustomizedMaterialRequest> materialesCustomizados,
    List<KitPersonalMaterialRequest> materialesPersonales,
    List<RequestPreferredMaterialRequest> materialesPreferidos,
    Boolean solicitarExplicacion,
    String tipoEvento,
    Integer cantidadPersonas
) {
    public PurchaseRequestRequest {
        if (isKit == null) isKit = false;
        if (isCustom == null) isCustom = false;
        if (solicitarExplicacion == null) solicitarExplicacion = false;
        if (kits == null) kits = List.of();
        if (materialesCustomizados == null) materialesCustomizados = List.of();
        if (materialesPersonales == null) materialesPersonales = List.of();
        if (materialesPreferidos == null) materialesPreferidos = List.of();
    }
}
