package com.amazonas.backend.modules.budgets.controller;

import java.util.UUID;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import com.amazonas.backend.modules.budgets.dto.BudgetRequest;
import com.amazonas.backend.modules.budgets.dto.BudgetResponse;
import com.amazonas.backend.modules.budgets.dto.BudgetVendorResponse;
import com.amazonas.backend.modules.budgets.dto.BudgetClientResponse;
import com.amazonas.backend.modules.budgets.service.BudgetService;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import java.util.List;
import java.util.stream.Collectors;

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

    // ─── Endpoints para Clientes y Vendedores ───────────────────

    /**
     * GET /api/budgets/by-request/{solicitudId}
     * Retorna el presupuesto asociado a una solicitud de compra.
     * Accesible para el cliente y el vendedor, aplicando filtrado por rol.
     */
    @GetMapping("/api/budgets/by-request/{solicitudId}")
    public ResponseEntity<?> obtenerPorSolicitud(
            @PathVariable UUID solicitudId,
            @AuthenticationPrincipal UserDetails userDetails
    ) {
        try {
            BudgetResponse response = budgetService.obtenerPorSolicitudId(solicitudId);
            
            boolean isVendor = userDetails.getAuthorities().stream()
                    .anyMatch(a -> a.getAuthority().equals("ADMIN"));
                    
            if (isVendor) {
                BudgetVendorResponse vendorResponse = new BudgetVendorResponse(
                    response.id(),
                    response.solicitudId(),
                    response.nombre(),
                    response.descripcion(),
                    response.codigoReferencia(),
                    response.estado(),
                    response.manoDeObra(),
                    response.margenGanancia(),
                    response.costoMateriales(),
                    response.subtotal(),
                    response.ganancia(),
                    response.total(),
                    response.adelantoRequerido(),
                    response.adelantoPorcentaje(),
                    response.adelantoMonto(),
                    response.items(),
                    response.servicioExplicacion()
                );
                return ResponseEntity.ok(vendorResponse);
            } else {
                List<String> materialesIncluidos = response.items().stream()
                        .filter(item -> item.materialNombre() != null)
                        .map(item -> item.materialNombre() + " (" + item.cantidad() + ")")
                        .collect(Collectors.toList());
                        
                BudgetClientResponse clientResponse = new BudgetClientResponse(
                    response.id(),
                    response.solicitudId(),
                    response.nombre(),
                    response.descripcion(),
                    response.codigoReferencia(),
                    response.estado(),
                    response.total(),
                    response.adelantoRequerido(),
                    response.adelantoPorcentaje(),
                    response.adelantoMonto(),
                    materialesIncluidos,
                    response.servicioExplicacion()
                );
                return ResponseEntity.ok(clientResponse);
            }
        } catch (org.springframework.web.server.ResponseStatusException ex) {
            if (ex.getStatusCode() == org.springframework.http.HttpStatus.NOT_FOUND) {
                // No hay presupuesto aún para esta solicitud — respuesta limpia para el cliente
                return ResponseEntity.ok().build();
            }
            throw ex;
        }
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

    /**
     * GET /api/admin/budgets
     * Retorna la lista de todos los presupuestos históricos guardados.
     */
    @GetMapping("/api/admin/budgets")
    public ResponseEntity<List<BudgetResponse>> listarTodos() {
        return ResponseEntity.ok(budgetService.obtenerTodos());
    }
}
