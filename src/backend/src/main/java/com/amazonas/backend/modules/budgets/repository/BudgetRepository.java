package com.amazonas.backend.modules.budgets.repository;

import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import com.amazonas.backend.modules.budgets.model.Budget;

@Repository
public interface BudgetRepository extends JpaRepository<Budget, UUID> {
    Optional<Budget> findBySolicitudId(UUID solicitudId);
    boolean existsBySolicitudId(UUID solicitudId);
}
