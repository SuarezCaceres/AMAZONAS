package com.amazonas.backend.modules.budgets.repository;

import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import com.amazonas.backend.modules.budgets.model.BudgetExplanationService;

@Repository
public interface BudgetExplanationServiceRepository extends JpaRepository<BudgetExplanationService, UUID> {
}
