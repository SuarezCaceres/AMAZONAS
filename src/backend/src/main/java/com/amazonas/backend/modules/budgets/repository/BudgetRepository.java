package com.amazonas.backend.modules.budgets.repository;

import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import com.amazonas.backend.modules.budgets.model.Budget;

import java.time.LocalDateTime;
import java.util.List;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

@Repository
public interface BudgetRepository extends JpaRepository<Budget, UUID> {
    Optional<Budget> findBySolicitudId(UUID solicitudId);
    boolean existsBySolicitudId(UUID solicitudId);

    @Query("SELECT b FROM Budget b WHERE b.estado IN ('PENDIENTE', 'ENVIADO') AND b.createdAt < :limite")
    List<Budget> findExpiredBudgets(@Param("limite") LocalDateTime limite);
}
