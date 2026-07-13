package com.amazonas.backend.modules.budgets.dto;

import java.math.BigDecimal;
import java.util.UUID;

public record BudgetItemRequest(
    UUID materialId,
    BigDecimal cantidad
) {}
