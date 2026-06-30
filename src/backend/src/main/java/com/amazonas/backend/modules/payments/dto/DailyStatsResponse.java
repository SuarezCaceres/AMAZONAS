package com.amazonas.backend.modules.payments.dto;

import java.math.BigDecimal;

public record DailyStatsResponse(
    BigDecimal ventasTotales,
    long metodoOnlineCount,
    long metodoFisicoCount
) {}
