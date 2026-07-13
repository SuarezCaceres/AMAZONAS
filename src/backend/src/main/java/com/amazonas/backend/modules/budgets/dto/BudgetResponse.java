package com.amazonas.backend.modules.budgets.dto;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

public record BudgetResponse(
    UUID id,
    UUID solicitudId,
    String nombre,
    String descripcion,
    String codigoReferencia,
    String estado,
    BigDecimal manoDeObra,
    Integer margenGanancia,
    Boolean adelantoRequerido,
    Integer adelantoPorcentaje,
    BigDecimal costoMateriales,
    BigDecimal subtotal,
    BigDecimal ganancia,
    BigDecimal total,
    BigDecimal adelantoMonto,
    String clienteNombre,
    String clienteEmail,
    String clienteTelefono,
    Boolean esPresencial,
    List<BudgetItemResponse> items,
    BudgetExplanationServiceResponse servicioExplicacion,
    LocalDateTime createdAt,
    LocalDateTime updatedAt,
    Boolean isCustom,
    Boolean isKit,
    Boolean clienteRegistrado
) {}
