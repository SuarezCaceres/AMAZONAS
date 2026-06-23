package com.amazonas.backend.modules.budgets.service;

import java.util.List;
import java.util.UUID;

import com.amazonas.backend.modules.budgets.dto.BudgetRequest;
import com.amazonas.backend.modules.budgets.dto.BudgetResponse;

public interface BudgetService {

    /** [Admin] Crea un presupuesto para una solicitud de compra */
    BudgetResponse crear(BudgetRequest request);

    /** Retorna el presupuesto de una solicitud por ID de solicitud */
    BudgetResponse obtenerPorSolicitudId(UUID solicitudId);

    /** [Admin] Modifica un presupuesto existente */
    BudgetResponse actualizar(UUID budgetId, BudgetRequest request);

    /** [Admin] Retorna la lista de todos los presupuestos históricos */
    List<BudgetResponse> obtenerTodos();
}
