package com.amazonas.backend.modules.reports.scheduler;

import com.amazonas.backend.modules.budgets.model.Budget;
import com.amazonas.backend.modules.budgets.repository.BudgetRepository;
import com.amazonas.backend.modules.chat.repository.ChatMessageRepository;
import com.amazonas.backend.modules.products.repository.ProductRepository;
import com.amazonas.backend.modules.requests.enums.EstadoSolicitud;
import com.amazonas.backend.modules.requests.repository.PurchaseRequestRepository;
import com.amazonas.backend.modules.reports.model.NightlyReport;
import com.amazonas.backend.modules.reports.repository.NightlyReportRepository;
import net.javacrumbs.shedlock.spring.annotation.SchedulerLock;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

@Component
public class NightlyReportScheduler {

    private static final Logger log = LoggerFactory.getLogger(NightlyReportScheduler.class);

    private final ProductRepository productRepository;
    private final PurchaseRequestRepository purchaseRequestRepository;
    private final BudgetRepository budgetRepository;
    private final ChatMessageRepository chatMessageRepository;
    private final NightlyReportRepository nightlyReportRepository;

    public NightlyReportScheduler(ProductRepository productRepository,
                                  PurchaseRequestRepository purchaseRequestRepository,
                                  BudgetRepository budgetRepository,
                                  ChatMessageRepository chatMessageRepository,
                                  NightlyReportRepository nightlyReportRepository) {
        this.productRepository = productRepository;
        this.purchaseRequestRepository = purchaseRequestRepository;
        this.budgetRepository = budgetRepository;
        this.chatMessageRepository = chatMessageRepository;
        this.nightlyReportRepository = nightlyReportRepository;
    }

    /**
     * Corre todos los días a las 20:00 (8:00 PM).
     * Recopila y consolida las métricas del sistema para guardarlas en la base de datos
     * como un reporte nocturno.
     */
    @Scheduled(cron = "0 0 20 * * *")
    @SchedulerLock(name = "NightlyReportScheduler_generateNightlyReport", lockAtMostFor = "15m", lockAtLeastFor = "1m")
    @Transactional
    public void generateNightlyReport() {
        log.info("--- GENERANDO REPORTE NOCTURNO DIARIO (20:00) ---");

        long totalMaquetas = productRepository.count();
        long totalSolicitudes = purchaseRequestRepository.count();
        long solicitudesPendientes = purchaseRequestRepository.countByEstado(EstadoSolicitud.PENDIENTE);
        long solicitudesCompletadas = purchaseRequestRepository.countByEstado(EstadoSolicitud.COMPLETADO);
        long totalPresupuestos = budgetRepository.count();
        long mensajesNoLeidos = chatMessageRepository.countByIsReadFalse();

        // Calcular el monto total presupuestado sumando el total de todos los presupuestos
        List<Budget> budgets = budgetRepository.findAll();
        BigDecimal totalMontoPresupuestado = budgets.stream()
                .map(b -> b.getTotal() != null ? b.getTotal() : BigDecimal.ZERO)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        NightlyReport report = new NightlyReport();
        report.setFecha(LocalDateTime.now());
        report.setTotalMaquetas(totalMaquetas);
        report.setTotalSolicitudes(totalSolicitudes);
        report.setSolicitudesPendientes(solicitudesPendientes);
        report.setSolicitudesCompletadas(solicitudesCompletadas);
        report.setTotalPresupuestos(totalPresupuestos);
        report.setTotalMontoPresupuestado(totalMontoPresupuestado);
        report.setMensajesNoLeidos(mensajesNoLeidos);

        nightlyReportRepository.save(report);

        log.info("Reporte nocturno guardado con éxito. ID: {}, Monto total presupuestado: {}", report.getId(), totalMontoPresupuestado);
        log.info("--- REPORTE NOCTURNO COMPLETADO ---");
    }
}
