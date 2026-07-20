package com.amazonas.backend.modules.budgets.dto;

import java.math.BigDecimal;
import java.util.UUID;

public record BudgetItemResponse(
    UUID id,
    UUID materialId,
    String materialNombre,
    String materialUnidad,
    BigDecimal cantidad,
    BigDecimal costoUnitario,
    BigDecimal subtotal
) {}
