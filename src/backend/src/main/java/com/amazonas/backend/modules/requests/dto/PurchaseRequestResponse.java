package com.amazonas.backend.modules.requests.dto;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;
import com.amazonas.backend.modules.requests.enums.EstadoSolicitud;

public record PurchaseRequestResponse(
    UUID id,
    String clienteNombre,
    String clienteEmail,
    String clienteTelefono,
    UUID productoId,
    String productoNombre,
    Boolean isKit,
    Boolean isCustom,
    EstadoSolicitud estado,
    String mensaje,
    String descripcionPersonalizacion,
    String materialesDeseados,
    Boolean solicitarExplicacion,
    String tipoEvento,
    Integer cantidadPersonas,
    List<KitMaquetaResponse> kits,
    List<KitCustomizedMaterialResponse> materialesCustomizados,
    List<KitPersonalMaterialResponse> materialesPersonales,
    List<RequestPreferredMaterialResponse> materialesPreferidos,
    Boolean tienePresupuesto,
    List<String> grabacionesUrls,
    List<String> archivosUrls,
    String motivoCancelacion,
    LocalDateTime createdAt,
    LocalDateTime updatedAt
) {}
