package com.amazonas.backend.modules.budgets.dto;

import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;

public record BudgetVendorResponse(
    UUID id,
    UUID solicitudId,
    String nombre,
    String descripcion,
    String codigoReferencia,
    String estado,
    BigDecimal manoDeObra,
    Integer margenGanancia,
    BigDecimal costoMateriales,
    BigDecimal subtotal,
    BigDecimal ganancia,
    BigDecimal total,
    Boolean adelantoRequerido,
    Integer adelantoPorcentaje,
    BigDecimal adelantoMonto,
    List<BudgetItemResponse> items,
    BudgetExplanationServiceResponse servicioExplicacion
) {}
