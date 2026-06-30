package com.amazonas.backend.modules.requests.controller;

import java.security.Principal;
import java.util.List;
import java.util.UUID;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import com.amazonas.backend.modules.requests.dto.PurchaseRequestRequest;
import com.amazonas.backend.modules.requests.dto.PurchaseRequestResponse;
import com.amazonas.backend.modules.requests.dto.RequestFilesUpdateRequest;
import com.amazonas.backend.modules.requests.dto.SolicitudParaPresupuestoResponse;
import com.amazonas.backend.modules.requests.dto.UpdateEstadoRequest;
import com.amazonas.backend.modules.requests.enums.EstadoSolicitud;
import com.amazonas.backend.modules.requests.service.PurchaseRequestService;

/**
 * Controlador de Solicitudes de Compra
 *
 * Rutas públicas para clientes autenticados:
 *   POST   /api/purchase-requests           → Crear solicitud
 *   GET    /api/purchase-requests/my         → Mis solicitudes
 *   GET    /api/purchase-requests/{id}       → Detalle de una solicitud
 *   PUT    /api/purchase-requests/{id}/files → Guardar archivos definitivos
 *
 * Rutas de administrador (vendedor):
 *   GET    /api/admin/purchase-requests      → Listar todas (con filtro de estado)
 *   PUT    /api/admin/purchase-requests/{id}/status → Actualizar estado
 */
@RestController
public class PurchaseRequestController {

    private final PurchaseRequestService purchaseRequestService;

    public PurchaseRequestController(PurchaseRequestService purchaseRequestService) {
        this.purchaseRequestService = purchaseRequestService;
    }

    // ─── Endpoints para Clientes ───────────────────────────────

    /**
     * POST /api/purchase-requests
     * Crea una solicitud de compra para el usuario autenticado.
     * Soporta los 3 flujos del Figma: maqueta ya hecha, kit y personalización.
     */
    @PostMapping("/api/purchase-requests")
    public ResponseEntity<PurchaseRequestResponse> crear(
            @RequestBody PurchaseRequestRequest request,
            Principal principal) {
        PurchaseRequestResponse response = purchaseRequestService.crear(request, principal.getName());
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    /**
     * PUT /api/purchase-requests/{id}/files
     * Guarda los enlaces de los archivos definitivos de la solicitud.
     */
    @PutMapping("/api/purchase-requests/{id}/files")
    public ResponseEntity<PurchaseRequestResponse> actualizarArchivos(
            @PathVariable UUID id,
            @RequestBody RequestFilesUpdateRequest request,
            Principal principal) {
        PurchaseRequestResponse response = purchaseRequestService.actualizarArchivos(id, request, principal.getName());
        return ResponseEntity.ok(response);
    }

    /**
     * GET /api/purchase-requests/my
     * Retorna las solicitudes del cliente autenticado.
     */
    @GetMapping("/api/purchase-requests/my")
    public ResponseEntity<List<PurchaseRequestResponse>> listarMisSolicitudes(Principal principal) {
        return ResponseEntity.ok(purchaseRequestService.listarMisSolicitudes(principal.getName()));
    }

    /**
     * GET /api/purchase-requests/{id}
     * Retorna el detalle de una solicitud por ID.
     */
    @GetMapping("/api/purchase-requests/{id}")
    public ResponseEntity<PurchaseRequestResponse> obtenerPorId(
            @PathVariable UUID id,
            Principal principal) {
        return ResponseEntity.ok(purchaseRequestService.obtenerPorId(id, principal.getName()));
    }

    // ─── Endpoints para Administradores/Vendedores ─────────────

    /**
     * GET /api/admin/purchase-requests
     * Lista todas las solicitudes con filtro opcional por estado.
     * Solo accesible para usuarios con rol ADMIN.
     */
    @GetMapping("/api/admin/purchase-requests")
    public ResponseEntity<List<PurchaseRequestResponse>> listarTodas(
            @RequestParam(required = false) EstadoSolicitud estado) {
        return ResponseEntity.ok(purchaseRequestService.listarTodas(estado));
    }

    /**
     * PUT /api/admin/purchase-requests/{id}/status
     * Actualiza el estado de una solicitud (PENDIENTE → PROCESANDO → COMPLETADO).
     * Solo accesible para usuarios con rol ADMIN.
     */
    @PutMapping("/api/admin/purchase-requests/{id}/status")
    public ResponseEntity<PurchaseRequestResponse> actualizarEstado(
            @PathVariable UUID id,
            @RequestBody UpdateEstadoRequest request) {
        return ResponseEntity.ok(purchaseRequestService.actualizarEstado(id, request));
    }

    /**
     * GET /api/admin/purchase-requests/{id}/para-presupuesto
     * Obtiene los datos de una solicitud para crear un presupuesto,
     * incluyendo los materiales del producto asociado.
     * Solo accesible para usuarios con rol ADMIN.
     */
    @GetMapping("/api/admin/purchase-requests/{id}/para-presupuesto")
    public ResponseEntity<SolicitudParaPresupuestoResponse> obtenerParaPresupuesto(
            @PathVariable UUID id) {
        return ResponseEntity.ok(purchaseRequestService.obtenerParaPresupuesto(id));
    }
}
