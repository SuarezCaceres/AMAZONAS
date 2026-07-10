package com.amazonas.backend.modules.budgets.dto;

import java.math.BigDecimal;
import java.util.UUID;

public record BudgetExplanationServiceResponse(
    UUID id,
    Boolean incluido,
    String tipoEvento,
    Integer cantidadPersonas,
    Integer duracionMinutos,
    BigDecimal precio,
    String notas
) {}
