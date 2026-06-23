package com.amazonas.backend.modules.payments.model;

import com.amazonas.backend.modules.payments.enums.PaymentMethod;
import com.amazonas.backend.modules.payments.enums.PaymentType;
import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.UUID;

@Entity
@Table(name = "payment_transactions")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class PaymentTransaction {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "client_id", nullable = false)
    private UUID clientId;

    @Column(name = "room_id")
    private UUID roomId;

    @Column(nullable = false, precision = 10, scale = 2)
    private BigDecimal monto;

    @Enumerated(EnumType.STRING)
    @Column(name = "metodo_pago", nullable = false, length = 50)
    private PaymentMethod metodoPago;

    @Enumerated(EnumType.STRING)
    @Column(name = "tipo_abono", nullable = false, length = 50)
    private PaymentType tipoAbono;

    @Column(name = "tipo_maqueta", nullable = false, length = 50)
    private String tipoMaqueta; // PREDETERMINADA, PERSONALIZADA

    @Column(columnDefinition = "TEXT")
    private String materiales;

    @Column(name = "fecha_transaccion", nullable = false)
    @Builder.Default
    private OffsetDateTime fechaTransaccion = OffsetDateTime.now();

    @Column(name = "codigo_operacion", length = 255)
    private String codigoOperacion;

    @Column(name = "created_at", nullable = false, updatable = false)
    @Builder.Default
    private OffsetDateTime createdAt = OffsetDateTime.now();
}
