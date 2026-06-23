package com.amazonas.backend.modules.payments.repository;

import com.amazonas.backend.modules.payments.enums.PaymentMethod;
import com.amazonas.backend.modules.payments.model.PaymentTransaction;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.UUID;

@Repository
public interface PaymentTransactionRepository extends JpaRepository<PaymentTransaction, UUID> {

    @Query("SELECT COALESCE(SUM(p.monto), 0) FROM PaymentTransaction p WHERE p.fechaTransaccion >= :start AND p.fechaTransaccion <= :end")
    BigDecimal sumMontoBetween(@Param("start") OffsetDateTime start, @Param("end") OffsetDateTime end);

    @Query("SELECT COUNT(p) FROM PaymentTransaction p WHERE p.metodoPago = :metodo AND p.fechaTransaccion >= :start AND p.fechaTransaccion <= :end")
    long countByMetodoPagoAndFechaTransaccionBetween(
            @Param("metodo") PaymentMethod metodo,
            @Param("start") OffsetDateTime start,
            @Param("end") OffsetDateTime end
    );
}
