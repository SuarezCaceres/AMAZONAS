package com.amazonas.backend.modules.payments.dto;

import com.amazonas.backend.modules.payments.enums.PaymentMethod;
import com.amazonas.backend.modules.payments.enums.PaymentType;
import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.UUID;

public record PaymentTransactionResponse(
    UUID id,
    UUID clientId,
    String clientName,
    String clientEmail,
    UUID roomId,
    BigDecimal monto,
    PaymentMethod metodoPago,
    PaymentType tipoAbono,
    String tipoMaqueta,
    String materiales,
    OffsetDateTime fechaTransaccion,
    String codigoOperacion
) {}
