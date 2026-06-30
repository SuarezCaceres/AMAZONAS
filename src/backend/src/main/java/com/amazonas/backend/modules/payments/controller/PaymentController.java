package com.amazonas.backend.modules.payments.controller;

import com.amazonas.backend.modules.payments.dto.DailyStatsResponse;
import com.amazonas.backend.modules.payments.dto.RegisterPaymentRequest;
import com.amazonas.backend.modules.payments.model.PaymentTransaction;
import com.amazonas.backend.modules.payments.service.PaymentService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/payments")
@RequiredArgsConstructor
@Tag(name = "Gestión de Pagos", description = "Módulo de cobros, adelantos y saldos en el taller")
public class PaymentController {

    private final PaymentService paymentService;

    @Operation(summary = "Registrar una nueva transacción de pago (adelanto, saldo o total)")
    @PostMapping
    public ResponseEntity<PaymentTransaction> registerPayment(
            @Valid @RequestBody RegisterPaymentRequest request
    ) {
        return ResponseEntity.ok(paymentService.registerPayment(request));
    }

    @Operation(summary = "Obtener estadísticas de pago del día actual")
    @GetMapping("/stats/daily")
    public ResponseEntity<DailyStatsResponse> getDailyStats() {
        return ResponseEntity.ok(paymentService.getDailyStats());
    }

    @Operation(summary = "Obtener todas las transacciones de pago")
    @GetMapping
    public ResponseEntity<java.util.List<com.amazonas.backend.modules.payments.dto.PaymentTransactionResponse>> getAllTransactions() {
        return ResponseEntity.ok(paymentService.getAllTransactions());
    }
}
