package com.amazonas.backend.modules.budgets.service.impl;

import java.util.UUID;
import java.util.stream.Collectors;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.amazonas.backend.modules.budgets.dto.*;
import com.amazonas.backend.modules.budgets.model.Budget;
import com.amazonas.backend.modules.budgets.model.BudgetExplanationService;
import com.amazonas.backend.modules.budgets.model.BudgetItem;
import com.amazonas.backend.modules.budgets.repository.BudgetRepository;
import com.amazonas.backend.modules.budgets.service.BudgetService;
import com.amazonas.backend.modules.materials.model.Material;
import com.amazonas.backend.modules.materials.repository.MaterialRepository;
import com.amazonas.backend.modules.requests.model.PurchaseRequest;
import com.amazonas.backend.modules.requests.repository.PurchaseRequestRepository;

@Service
@Transactional
public class BudgetServiceImpl implements BudgetService {

    private final BudgetRepository budgetRepository;
    private final PurchaseRequestRepository purchaseRequestRepository;
    private final MaterialRepository materialRepository;

    public BudgetServiceImpl(
            BudgetRepository budgetRepository,
            PurchaseRequestRepository purchaseRequestRepository,
            MaterialRepository materialRepository) {
        this.budgetRepository = budgetRepository;
        this.purchaseRequestRepository = purchaseRequestRepository;
        this.materialRepository = materialRepository;
    }

    // ─────────────────────────────────────────────────────────
    // CREAR PRESUPUESTO
    // ─────────────────────────────────────────────────────────

    @Override
    public BudgetResponse crear(BudgetRequest req) {
        PurchaseRequest solicitud = purchaseRequestRepository.findById(req.getSolicitudId())
                .orElseThrow(() -> new RuntimeException("Solicitud no encontrada: " + req.getSolicitudId()));

        // Validar unicidad: solo 1 presupuesto por solicitud
        if (budgetRepository.existsBySolicitudId(solicitud.getId())) {
            throw new RuntimeException("Esta solicitud ya tiene un presupuesto. Use el endpoint de edición.");
        }

        Budget budget = buildBudget(req, solicitud);
        Budget saved = budgetRepository.save(budget);
        return toResponse(saved);
    }

    // ─────────────────────────────────────────────────────────
    // CONSULTA POR SOLICITUD
    // ─────────────────────────────────────────────────────────

    @Override
    @Transactional(readOnly = true)
    public BudgetResponse obtenerPorSolicitudId(UUID solicitudId) {
        Budget budget = budgetRepository.findBySolicitudId(solicitudId)
                .orElseThrow(() -> new RuntimeException("No hay presupuesto para la solicitud: " + solicitudId));
        return toResponse(budget);
    }

    // ─────────────────────────────────────────────────────────
    // ACTUALIZAR PRESUPUESTO
    // ─────────────────────────────────────────────────────────

    @Override
    public BudgetResponse actualizar(UUID budgetId, BudgetRequest req) {
        Budget budget = budgetRepository.findById(budgetId)
                .orElseThrow(() -> new RuntimeException("Presupuesto no encontrado: " + budgetId));

        budget.setNombre(req.getNombre());
        budget.setDescripcion(req.getDescripcion());
        if (req.getManoDeObra() != null) budget.setManoDeObra(req.getManoDeObra());
        if (req.getMargenGanancia() != null) budget.setMargenGanancia(req.getMargenGanancia());
        if (req.getAdelantoRequerido() != null) budget.setAdelantoRequerido(req.getAdelantoRequerido());
        if (req.getAdelantoPorcentaje() != null) budget.setAdelantoPorcentaje(req.getAdelantoPorcentaje());

        // Reemplazar items
        budget.getItems().clear();
        if (req.getItems() != null) {
            for (BudgetItemRequest itemReq : req.getItems()) {
                Material material = materialRepository.findById(itemReq.getMaterialId())
                        .orElseThrow(() -> new RuntimeException("Material no encontrado: " + itemReq.getMaterialId()));
                BudgetItem item = new BudgetItem(budget, material, itemReq.getCantidad(), material.getCostoVenta());
                budget.getItems().add(item);
            }
        }

        // Actualizar servicio de explicación
        if (req.getServicioExplicacion() != null) {
            BudgetExplanationService svc = budget.getServicioExplicacion();
            if (svc == null) {
                svc = new BudgetExplanationService();
                svc.setBudget(budget);
                budget.setServicioExplicacion(svc);
            }
            applyExplanationService(svc, req.getServicioExplicacion());
        }

        budget.recalculateAdelanto();
        return toResponse(budgetRepository.save(budget));
    }

    // ─────────────────────────────────────────────────────────
    // HELPERS
    // ─────────────────────────────────────────────────────────

    private Budget buildBudget(BudgetRequest req, PurchaseRequest solicitud) {
        Budget budget = new Budget();
        budget.setSolicitud(solicitud);
        budget.setNombre(req.getNombre());
        budget.setDescripcion(req.getDescripcion());
        if (req.getManoDeObra() != null) budget.setManoDeObra(req.getManoDeObra());
        if (req.getMargenGanancia() != null) budget.setMargenGanancia(req.getMargenGanancia());
        if (req.getAdelantoRequerido() != null) budget.setAdelantoRequerido(req.getAdelantoRequerido());
        if (req.getAdelantoPorcentaje() != null) budget.setAdelantoPorcentaje(req.getAdelantoPorcentaje());

        // Items del presupuesto — snapshot de costoVenta del material
        if (req.getItems() != null) {
            for (BudgetItemRequest itemReq : req.getItems()) {
                Material material = materialRepository.findById(itemReq.getMaterialId())
                        .orElseThrow(() -> new RuntimeException("Material no encontrado: " + itemReq.getMaterialId()));
                BudgetItem item = new BudgetItem(budget, material, itemReq.getCantidad(), material.getCostoVenta());
                budget.getItems().add(item);
            }
        }

        // Servicio de explicación (opcional)
        if (req.getServicioExplicacion() != null) {
            BudgetExplanationService svc = new BudgetExplanationService();
            svc.setBudget(budget);
            applyExplanationService(svc, req.getServicioExplicacion());
            budget.setServicioExplicacion(svc);
        }

        return budget;
    }

    private void applyExplanationService(BudgetExplanationService svc, BudgetExplanationServiceRequest req) {
        if (req.getIncluido() != null) svc.setIncluido(req.getIncluido());
        svc.setTipoEvento(req.getTipoEvento());
        svc.setCantidadPersonas(req.getCantidadPersonas());
        svc.setDuracionMinutos(req.getDuracionMinutos());
        if (req.getPrecio() != null) svc.setPrecio(req.getPrecio());
        svc.setNotas(req.getNotas());
    }

    // ─────────────────────────────────────────────────────────
    // MAPPER
    // ─────────────────────────────────────────────────────────

    private BudgetResponse toResponse(Budget b) {
        BudgetResponse resp = new BudgetResponse();
        resp.setId(b.getId());
        if (b.getSolicitud() != null) resp.setSolicitudId(b.getSolicitud().getId());
        resp.setNombre(b.getNombre());
        resp.setDescripcion(b.getDescripcion());
        resp.setManoDeObra(b.getManoDeObra());
        resp.setMargenGanancia(b.getMargenGanancia());
        resp.setAdelantoRequerido(b.getAdelantoRequerido());
        resp.setAdelantoPorcentaje(b.getAdelantoPorcentaje());

        // Campos calculados
        resp.setCostoMateriales(b.getCostoMateriales());
        resp.setSubtotal(b.getSubtotal());
        resp.setGanancia(b.getGanancia());
        resp.setTotal(b.getTotal());
        resp.setAdelantoMonto(b.getAdelantoMonto());

        resp.setCreatedAt(b.getCreatedAt());
        resp.setUpdatedAt(b.getUpdatedAt());

        // Items
        resp.setItems(b.getItems().stream().map(item -> {
            BudgetItemResponse ir = new BudgetItemResponse();
            ir.setId(item.getId());
            if (item.getMaterial() != null) {
                ir.setMaterialId(item.getMaterial().getId());
                ir.setMaterialNombre(item.getMaterial().getNombre());
                ir.setMaterialUnidad(item.getMaterial().getUnidad());
            }
            ir.setCantidad(item.getCantidad());
            ir.setCostoUnitario(item.getCostoUnitario());
            ir.setSubtotal(item.getSubtotal());
            return ir;
        }).collect(Collectors.toList()));

        // Servicio de explicación
        if (b.getServicioExplicacion() != null) {
            BudgetExplanationService svc = b.getServicioExplicacion();
            BudgetExplanationServiceResponse svcResp = new BudgetExplanationServiceResponse();
            svcResp.setId(svc.getId());
            svcResp.setIncluido(svc.getIncluido());
            svcResp.setTipoEvento(svc.getTipoEvento());
            svcResp.setCantidadPersonas(svc.getCantidadPersonas());
            svcResp.setDuracionMinutos(svc.getDuracionMinutos());
            svcResp.setPrecio(svc.getPrecio());
            svcResp.setNotas(svc.getNotas());
            resp.setServicioExplicacion(svcResp);
        }

        return resp;
    }
}
