package com.amazonas.backend.modules.payments.dto;

import com.amazonas.backend.modules.payments.enums.PaymentMethod;
import com.amazonas.backend.modules.payments.enums.PaymentType;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.UUID;

public record RegisterPaymentRequest(
    @NotBlank(message = "El nombre del cliente es requerido")
    String clientName,

    @NotBlank(message = "El correo electrónico es requerido")
    @Email(message = "El formato de correo no es válido")
    String clientEmail,

    String clientPhone,

    UUID roomId,

    @NotNull(message = "El monto es requerido")
    @DecimalMin(value = "0.0", inclusive = false, message = "El monto debe ser mayor a 0")
    BigDecimal monto,

    @NotNull(message = "El método de pago es requerido")
    PaymentMethod metodoPago,

    @NotNull(message = "El tipo de abono es requerido")
    PaymentType tipoAbono,

    @NotBlank(message = "El tipo de maqueta es requerido")
    String tipoMaqueta,

    String materiales,

    @NotNull(message = "La fecha de transacción es requerida")
    OffsetDateTime fechaTransaccion,

    String codigoOperacion
) {}
