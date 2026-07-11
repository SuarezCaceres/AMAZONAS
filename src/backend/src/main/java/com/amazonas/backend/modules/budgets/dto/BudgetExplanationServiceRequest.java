package com.amazonas.backend.modules.budgets.dto;

import java.math.BigDecimal;

public record BudgetExplanationServiceRequest(
    Boolean incluido,
    String tipoEvento,
    Integer cantidadPersonas,
    Integer duracionMinutos,
    BigDecimal precio,
    String notas
) {}
