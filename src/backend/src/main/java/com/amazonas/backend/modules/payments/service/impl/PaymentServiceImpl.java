package com.amazonas.backend.modules.payments.service.impl;

import com.amazonas.backend.modules.payments.dto.DailyStatsResponse;
import com.amazonas.backend.modules.payments.dto.RegisterPaymentRequest;
import com.amazonas.backend.modules.payments.enums.PaymentMethod;
import com.amazonas.backend.modules.payments.model.PaymentTransaction;
import com.amazonas.backend.modules.payments.repository.PaymentTransactionRepository;
import com.amazonas.backend.modules.payments.service.PaymentService;
import com.amazonas.backend.modules.users.model.User;
import com.amazonas.backend.modules.users.repository.UserRepository;
import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalTime;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
@Transactional
public class PaymentServiceImpl implements PaymentService {

    private final PaymentTransactionRepository paymentRepository;
    private final UserRepository userRepository;

    @Override
    public PaymentTransaction registerPayment(RegisterPaymentRequest request) {
        log.info("Registrando transacción de pago para el cliente con correo: {}", request.clientEmail());

        UUID clientId = userRepository.findByEmailIgnoreCase(request.clientEmail())
                .map(User::getId)
                .orElseGet(() -> {
                    log.info("Cliente no encontrado con el correo {}, creando usuario cliente automático.", request.clientEmail());
                    User guest = new User();
                    guest.setNombre(request.clientName());
                    guest.setEmail(request.clientEmail().toLowerCase().trim());
                    guest.setTelefono(request.clientPhone() != null && !request.clientPhone().isEmpty() ? request.clientPhone() : "999999999");
                    // Hash BCrypt genérico válido pero inutilizable
                    guest.setPassword("$2a$10$e0MYzXyDx.J.q7h.yM1xG.gA4uA5aK2/T9rB8k7/l9r6.j9z.xY3C");
                    guest.setRole(com.amazonas.backend.modules.auth.enums.Role.CLIENT);
                    return userRepository.save(guest).getId();
                });

        PaymentTransaction transaction = PaymentTransaction.builder()
                .clientId(clientId)
                .roomId(request.roomId())
                .monto(request.monto())
                .metodoPago(request.metodoPago())
                .tipoAbono(request.tipoAbono())
                .tipoMaqueta(request.tipoMaqueta())
                .materiales(request.materiales())
                .fechaTransaccion(request.fechaTransaccion())
                .codigoOperacion(request.codigoOperacion())
                .montoRecibido(request.montoRecibido())
                .vuelto(request.vuelto())
                .codigoSeguridad(request.codigoSeguridad())
                .voucherUrl(request.voucherUrl())
                .build();

        return paymentRepository.save(transaction);
    }

    @Override
    @Transactional(readOnly = true)
    public DailyStatsResponse getDailyStats() {
        // Obtenemos el inicio y fin del día actual en UTC
        LocalDate today = LocalDate.now(ZoneOffset.UTC);
        OffsetDateTime startOfDay = today.atStartOfDay().atOffset(ZoneOffset.UTC);
        OffsetDateTime endOfDay = today.atTime(LocalTime.MAX).atOffset(ZoneOffset.UTC);

        BigDecimal ventasTotales = paymentRepository.sumMontoBetween(startOfDay, endOfDay);
        long onlineCount = paymentRepository.countByMetodoPagoAndFechaTransaccionBetween(PaymentMethod.ONLINE, startOfDay, endOfDay);
        long fisicoCount = paymentRepository.countByMetodoPagoAndFechaTransaccionBetween(PaymentMethod.FISICO, startOfDay, endOfDay);

        return new DailyStatsResponse(ventasTotales, onlineCount, fisicoCount);
    }

    @Override
    @Transactional(readOnly = true)
    public java.util.List<com.amazonas.backend.modules.payments.dto.PaymentTransactionResponse> getAllTransactions() {
        log.info("Obteniendo todas las transacciones de pago con información del cliente");
        return paymentRepository.findAllTransactionsWithClientInfo();
    }
}
