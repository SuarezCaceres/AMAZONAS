package com.amazonas.backend.modules.budgets.controller;

import java.util.UUID;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import com.amazonas.backend.modules.budgets.dto.BudgetRequest;
import com.amazonas.backend.modules.budgets.dto.BudgetResponse;
import com.amazonas.backend.modules.budgets.service.BudgetService;

/**
 * Controlador de Presupuestos
 *
 * Rutas para clientes autenticados:
 *   GET /api/budgets/by-request/{solicitudId} → Ver presupuesto de una solicitud
 *
 * Rutas de administrador (vendedor):
 *   POST /api/admin/budgets           → Crear presupuesto
 *   PUT  /api/admin/budgets/{id}      → Editar presupuesto
 */
@RestController
public class BudgetController {

    private final BudgetService budgetService;

    public BudgetController(BudgetService budgetService) {
        this.budgetService = budgetService;
    }

    // ─── Endpoints para Clientes ───────────────────────────────

    /**
     * GET /api/budgets/by-request/{solicitudId}
     * Retorna el presupuesto asociado a una solicitud de compra.
     * Accesible para el cliente y el vendedor.
     */
    @GetMapping("/api/budgets/by-request/{solicitudId}")
    public ResponseEntity<BudgetResponse> obtenerPorSolicitud(@PathVariable UUID solicitudId) {
        return ResponseEntity.ok(budgetService.obtenerPorSolicitudId(solicitudId));
    }

    // ─── Endpoints para Administradores/Vendedores ─────────────

    /**
     * POST /api/admin/budgets
     * El vendedor crea un presupuesto para una solicitud de compra.
     * Calcula automáticamente costos de materiales, mano de obra, ganancia y adelanto.
     * Solo se permite 1 presupuesto por solicitud.
     */
    @PostMapping("/api/admin/budgets")
    public ResponseEntity<BudgetResponse> crear(@RequestBody BudgetRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(budgetService.crear(request));
    }

    /**
     * PUT /api/admin/budgets/{id}
     * El vendedor modifica un presupuesto existente.
     */
    @PutMapping("/api/admin/budgets/{id}")
    public ResponseEntity<BudgetResponse> actualizar(
            @PathVariable UUID id,
            @RequestBody BudgetRequest request) {
        return ResponseEntity.ok(budgetService.actualizar(id, request));
    }
}
