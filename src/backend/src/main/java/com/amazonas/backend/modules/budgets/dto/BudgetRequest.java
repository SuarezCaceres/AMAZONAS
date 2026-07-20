package com.amazonas.backend.modules.budgets.dto;

import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;

public record BudgetRequest(
    UUID solicitudId,
    String nombre,
    String descripcion,
    BigDecimal manoDeObra,
    Integer margenGanancia,
    Boolean adelantoRequerido,
    Integer adelantoPorcentaje,
    String clienteNombre,
    String clienteEmail,
    String clienteTelefono,
    Boolean esPresencial,
    List<BudgetItemRequest> items,
    BudgetExplanationServiceRequest servicioExplicacion,
    Boolean isCustom,
    Boolean isKit
) {}
