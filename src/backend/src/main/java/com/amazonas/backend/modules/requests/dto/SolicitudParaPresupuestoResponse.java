package com.amazonas.backend.modules.requests.dto;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

public record SolicitudParaPresupuestoResponse(
    UUID id,
    String productoNombre,
    String descripcionPersonalizacion,
    Boolean isCustom,
    String clienteNombre,
    String clienteEmail,
    String clienteTelefono,
    LocalDateTime createdAt,
    String estado,
    List<MaterialPresupuestoDTO> materialesProducto,
    List<MaterialSolicitadoDTO> materialesPreferidos,
    String materialesDeseados,
    Boolean solicitarExplicacion,
    String tipoEvento,
    Integer cantidadPersonas
) {
    public record MaterialPresupuestoDTO(
        UUID id,
        String nombre,
        String unidad,
        BigDecimal costoVenta,
        BigDecimal cantidadSugerida,
        Boolean esOpcional
    ) {}

    public record MaterialSolicitadoDTO(
        UUID materialId,
        String nombre,
        String unidad,
        BigDecimal costoVenta,
        String razonPreferencia
    ) {}
}
