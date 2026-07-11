package com.amazonas.backend.modules.budgets.scheduler;

import com.amazonas.backend.modules.budgets.model.Budget;
import com.amazonas.backend.modules.budgets.repository.BudgetRepository;
import com.amazonas.backend.modules.requests.model.PurchaseRequest;
import com.amazonas.backend.modules.requests.enums.EstadoSolicitud;
import com.amazonas.backend.modules.requests.repository.PurchaseRequestRepository;
import net.javacrumbs.shedlock.spring.annotation.SchedulerLock;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;

@Component
public class BudgetGuardianScheduler {

    private static final Logger log = LoggerFactory.getLogger(BudgetGuardianScheduler.class);

    private final BudgetRepository budgetRepository;
    private final PurchaseRequestRepository purchaseRequestRepository;

    public BudgetGuardianScheduler(BudgetRepository budgetRepository, PurchaseRequestRepository purchaseRequestRepository) {
        this.budgetRepository = budgetRepository;
        this.purchaseRequestRepository = purchaseRequestRepository;
    }

    /**
     * Tarea programada que corre diariamente a las 2:00 AM.
     * Busca presupuestos en estado PENDIENTE o ENVIADO creados hace más de 7 días,
     * los marca como RECHAZADO y también rechaza la solicitud asociada con el motivo de vencimiento.
     */
    @Scheduled(cron = "0 0 2 * * *")
    @SchedulerLock(name = "BudgetGuardianScheduler_cleanExpiredBudgets", lockAtMostFor = "15m", lockAtLeastFor = "1m")
    @Transactional
    public void cleanExpiredBudgets() {
        log.info("--- INICIANDO EL GUARDIÁN DE PRESUPUESTOS (VENCIMIENTOS DE 7 DÍAS) ---");
        LocalDateTime limite = LocalDateTime.now().minusDays(7);
        List<Budget> expiredBudgets = budgetRepository.findExpiredBudgets(limite);

        if (expiredBudgets.isEmpty()) {
            log.info("No se encontraron presupuestos vencidos.");
            return;
        }

        log.info("Se encontraron {} presupuestos vencidos para procesar.", expiredBudgets.size());

        for (Budget budget : expiredBudgets) {
            log.info("Expirando presupuesto ID: {}, código de referencia: {}", budget.getId(), budget.getCodigoReferencia());
            budget.setEstado("RECHAZADO");
            budgetRepository.save(budget);

            PurchaseRequest solicitud = budget.getSolicitud();
            if (solicitud != null) {
                log.info("Rechazando solicitud asociada ID: {}", solicitud.getId());
                solicitud.setEstado(EstadoSolicitud.RECHAZADO);
                solicitud.setMotivoCancelacion("Presupuesto vencido tras 7 días sin aceptación.");
                purchaseRequestRepository.save(solicitud);
            }
        }

        log.info("--- GUARDIÁN DE PRESUPUESTOS COMPLETADO ---");
    }
}
