package com.amazonas.backend.modules.budgets.service.impl;

import java.util.UUID;
import java.util.stream.Collectors;
import java.math.BigDecimal;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.Authentication;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;

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
import com.amazonas.backend.modules.vendors.repository.VendorRepository;
import com.amazonas.backend.modules.vendors.model.Vendor;
import com.amazonas.backend.modules.users.model.User;
import com.amazonas.backend.modules.users.repository.UserRepository;
import com.amazonas.backend.modules.auth.enums.Role;
import org.springframework.security.crypto.password.PasswordEncoder;

@Service
@Transactional
public class BudgetServiceImpl implements BudgetService {

    private final BudgetRepository budgetRepository;
    private final PurchaseRequestRepository purchaseRequestRepository;
    private final MaterialRepository materialRepository;
    private final VendorRepository vendorRepository;
    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;

    public BudgetServiceImpl(
            BudgetRepository budgetRepository,
            PurchaseRequestRepository purchaseRequestRepository,
            MaterialRepository materialRepository,
            VendorRepository vendorRepository,
            UserRepository userRepository,
            PasswordEncoder passwordEncoder) {
        this.budgetRepository = budgetRepository;
        this.purchaseRequestRepository = purchaseRequestRepository;
        this.materialRepository = materialRepository;
        this.vendorRepository = vendorRepository;
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
    }

    // ─────────────────────────────────────────────────────────
    // CREAR PRESUPUESTO
    // ─────────────────────────────────────────────────────────

    @Override
    public BudgetResponse crear(BudgetRequest req) {
        PurchaseRequest solicitud = null;

        if (req.getSolicitudId() != null) {
            solicitud = purchaseRequestRepository.findById(req.getSolicitudId())
                    .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Solicitud no encontrada: " + req.getSolicitudId()));

            // Validar unicidad: solo 1 presupuesto por solicitud
            if (budgetRepository.existsBySolicitudId(solicitud.getId())) {
                throw new ResponseStatusException(HttpStatus.CONFLICT, "Esta solicitud ya tiene un presupuesto. Use el endpoint de edición.");
            }
        }

        // Si es presencial y hay email, crear usuario si no existe
        if (Boolean.TRUE.equals(req.getEsPresencial()) && req.getClienteEmail() != null && !req.getClienteEmail().isBlank()) {
            crearUsuarioSiNoExiste(req.getClienteNombre(), req.getClienteEmail(), req.getClienteTelefono());
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
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "No hay presupuesto para la solicitud: " + solicitudId));
        return toResponse(budget);
    }

    // ─────────────────────────────────────────────────────────
    // ACTUALIZAR PRESUPUESTO
    // ─────────────────────────────────────────────────────────

    @Override
    public BudgetResponse actualizar(UUID budgetId, BudgetRequest req) {
        if (budgetId == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "El ID del presupuesto es obligatorio.");
        }
        Budget budget = budgetRepository.findById(budgetId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Presupuesto no encontrado: " + budgetId));

        // Si es presencial y hay email, crear usuario si no existe
        if (Boolean.TRUE.equals(req.getEsPresencial()) && req.getClienteEmail() != null && !req.getClienteEmail().isBlank()) {
            crearUsuarioSiNoExiste(req.getClienteNombre(), req.getClienteEmail(), req.getClienteTelefono());
        }

        budget.setNombre(req.getNombre());
        budget.setDescripcion(req.getDescripcion());
        if (req.getClienteNombre() != null) budget.setClienteNombre(req.getClienteNombre());
        if (req.getClienteEmail() != null) budget.setClienteEmail(req.getClienteEmail());
        if (req.getClienteTelefono() != null) budget.setClienteTelefono(req.getClienteTelefono());
        if (req.getEsPresencial() != null) budget.setEsPresencial(req.getEsPresencial());
        if (req.getManoDeObra() != null) budget.setManoDeObra(req.getManoDeObra());
        if (req.getMargenGanancia() != null) budget.setMargenGanancia(req.getMargenGanancia());
        if (req.getAdelantoRequerido() != null) budget.setAdelantoRequerido(req.getAdelantoRequerido());
        if (req.getAdelantoPorcentaje() != null) budget.setAdelantoPorcentaje(req.getAdelantoPorcentaje());
 
        // Actualizar items de forma segura para no violar el constraint único uq_budget_material (Consolidación de duplicados)
        if (req.getItems() != null) {
            for (BudgetItemRequest itemReq : req.getItems()) {
                if (itemReq.getMaterialId() == null) {
                    throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "El ID de cada material es obligatorio en los items del presupuesto.");
                }
            }

            java.util.Map<UUID, BigDecimal> groupedItems = req.getItems().stream()
                    .filter(item -> item.getMaterialId() != null && item.getCantidad() != null)
                    .collect(Collectors.toMap(
                        BudgetItemRequest::getMaterialId,
                        BudgetItemRequest::getCantidad,
                        BigDecimal::add
                    ));

            java.util.Set<UUID> solicitadosMaterialIds = groupedItems.keySet();
 
            // Eliminar items que ya no están solicitados
            budget.getItems().removeIf(item -> !solicitadosMaterialIds.contains(item.getMaterial().getId()));
 
            // Actualizar existentes o agregar nuevos
            for (java.util.Map.Entry<UUID, BigDecimal> entry : groupedItems.entrySet()) {
                UUID matId = entry.getKey();
                BigDecimal cantidad = entry.getValue();

                BudgetItem existente = budget.getItems().stream()
                        .filter(item -> item.getMaterial().getId().equals(matId))
                        .findFirst()
                        .orElse(null);
 
                if (existente != null) {
                    existente.setCantidad(cantidad);
                    existente.setCostoUnitario(existente.getMaterial().getCostoVenta());
                } else {
                    Material material = materialRepository.findById(matId)
                            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Material no encontrado: " + matId));
                    BudgetItem item = new BudgetItem(budget, material, cantidad, material.getCostoVenta());
                    budget.getItems().add(item);
                }
            }
        } else {
            budget.getItems().clear();
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

    @Override
    @Transactional(readOnly = true)
    public java.util.List<BudgetResponse> obtenerTodos() {
        java.util.List<Budget> lista = budgetRepository.findAll();
        java.util.List<BudgetResponse> result = new java.util.ArrayList<>();
        for (Budget b : lista) {
            try {
                result.add(toResponse(b));
            } catch (Exception ex) {
                // Loguear error y continuar
                try {
                    java.io.FileWriter fw = new java.io.FileWriter("c:/Users/USER/Documents/Herramientas de desarrollo/AMAZONAS/error.log", true);
                    java.io.PrintWriter pw = new java.io.PrintWriter(fw);
                    pw.println("--- EXCEPTION MAPPING BUDGET " + b.getId() + " --- " + new java.util.Date());
                    ex.printStackTrace(pw);
                    pw.close();
                    fw.close();
                } catch (Exception e) {
                    // ignore
                }
            }
        }
        return result;
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

        // Datos del cliente para presupuestos presenciales
        if (req.getClienteNombre() != null) budget.setClienteNombre(req.getClienteNombre());
        if (req.getClienteEmail() != null) budget.setClienteEmail(req.getClienteEmail());
        if (req.getClienteTelefono() != null) budget.setClienteTelefono(req.getClienteTelefono());
        if (req.getEsPresencial() != null) budget.setEsPresencial(req.getEsPresencial());

        // Tipo de maqueta (Personalizada vs Kit Estándar)
        if (req.getIsCustom() != null) {
            budget.setIsCustom(req.getIsCustom());
        } else if (solicitud != null) {
            budget.setIsCustom(solicitud.getIsCustom());
        }
        if (req.getIsKit() != null) {
            budget.setIsKit(req.getIsKit());
        } else if (solicitud != null) {
            budget.setIsKit(solicitud.getIsKit());
        }

        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth != null && auth.isAuthenticated()) {
            String email = auth.getName();
            vendorRepository.findByEmail(email).ifPresent(budget::setCreador);
        }

        // Items del presupuesto — snapshot de costoVenta del material (Consolidación de duplicados)
        if (req.getItems() != null) {
            for (BudgetItemRequest itemReq : req.getItems()) {
                if (itemReq.getMaterialId() == null) {
                    throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "El ID de cada material es obligatorio en los items del presupuesto.");
                }
            }

            java.util.Map<UUID, BigDecimal> groupedItems = req.getItems().stream()
                    .filter(item -> item.getMaterialId() != null && item.getCantidad() != null)
                    .collect(Collectors.toMap(
                        BudgetItemRequest::getMaterialId,
                        BudgetItemRequest::getCantidad,
                        BigDecimal::add
                    ));

            for (java.util.Map.Entry<UUID, BigDecimal> entry : groupedItems.entrySet()) {
                UUID matId = entry.getKey();
                BigDecimal cantidad = entry.getValue();

                Material material = materialRepository.findById(matId)
                        .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Material no encontrado: " + matId));
                BudgetItem item = new BudgetItem(budget, material, cantidad, material.getCostoVenta());
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
        boolean isIncluido = req.getIncluido() != null ? req.getIncluido() : svc.getIncluido();
        if (req.getIncluido() != null) svc.setIncluido(req.getIncluido());

        if (isIncluido) {
            if (req.getCantidadPersonas() == null || req.getCantidadPersonas() <= 0) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "La cantidad de personas para el servicio de explicación debe ser mayor a 0.");
            }
            if (req.getDuracionMinutos() == null || req.getDuracionMinutos() <= 0) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "La duración para el servicio de explicación debe ser mayor a 0.");
            }
            if (req.getPrecio() != null && req.getPrecio().compareTo(java.math.BigDecimal.ZERO) < 0) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "El precio del servicio de explicación no puede ser negativo.");
            }
            svc.setTipoEvento(req.getTipoEvento());
            svc.setCantidadPersonas(req.getCantidadPersonas());
            svc.setDuracionMinutos(req.getDuracionMinutos());
            if (req.getPrecio() != null) svc.setPrecio(req.getPrecio());
            svc.setNotas(req.getNotas());
        } else {
            svc.setTipoEvento(null);
            svc.setCantidadPersonas(null);
            svc.setDuracionMinutos(null);
            svc.setPrecio(java.math.BigDecimal.ZERO);
            svc.setNotas(null);
        }
    }

    // ─────────────────────────────────────────────────────────
    // MAPPER
    // ─────────────────────────────────────────────────────────

    private BudgetResponse toResponse(Budget b) {
        BudgetResponse resp = new BudgetResponse();
        resp.setId(b.getId());
        boolean clienteRegistrado = false;
        if (b.getSolicitud() != null) {
            clienteRegistrado = true;
        } else if (b.getClienteEmail() != null && !b.getClienteEmail().isBlank()) {
            clienteRegistrado = userRepository.existsByEmail(b.getClienteEmail());
        }
        resp.setClienteRegistrado(clienteRegistrado);
        if (b.getSolicitud() != null) {
            try {
                resp.setSolicitudId(b.getSolicitud().getId());
                resp.setIsCustom(b.getIsCustom() != null ? b.getIsCustom() : b.getSolicitud().getIsCustom());
                resp.setIsKit(b.getIsKit() != null ? b.getIsKit() : b.getSolicitud().getIsKit());
            } catch (Exception ex) {
                // Capturar EntityNotFoundException por soft-delete de solicitud
                resp.setSolicitudId(null);
                resp.setIsCustom(b.getIsCustom());
                resp.setIsKit(b.getIsKit());
            }
        } else {
            resp.setIsCustom(b.getIsCustom());
            resp.setIsKit(b.getIsKit());
        }
        resp.setNombre(b.getNombre());
        resp.setDescripcion(b.getDescripcion());
        resp.setCodigoReferencia(b.getCodigoReferencia());
        resp.setEstado(b.getEstado());
        resp.setManoDeObra(b.getManoDeObra());
        resp.setMargenGanancia(b.getMargenGanancia());
        resp.setAdelantoRequerido(b.getAdelantoRequerido());
        resp.setAdelantoPorcentaje(b.getAdelantoPorcentaje());

        // Datos del cliente
        resp.setClienteNombre(b.getClienteNombre());
        resp.setClienteEmail(b.getClienteEmail());
        resp.setClienteTelefono(b.getClienteTelefono());
        resp.setEsPresencial(b.getEsPresencial());

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

    private void crearUsuarioSiNoExiste(String nombre, String email, String telefono) {
        try {
            if (!userRepository.existsByEmail(email)) {
                User user = new User();
                user.setNombre(nombre != null ? nombre : email.split("@")[0]);
                user.setEmail(email);
                user.setTelefono(telefono);
                user.setPassword(passwordEncoder.encode("presencial2026"));
                user.setRole(com.amazonas.backend.modules.auth.enums.Role.CLIENT);
                userRepository.save(user);
            }
        } catch (Exception ex) {
            try {
                java.io.FileWriter fw = new java.io.FileWriter("c:/Users/USER/Documents/Herramientas de desarrollo/AMAZONAS/error.log", true);
                java.io.PrintWriter pw = new java.io.PrintWriter(fw);
                pw.println("--- EXCEPTION REGISTERING USER FOR EMAIL " + email + " --- " + new java.util.Date());
                ex.printStackTrace(pw);
                pw.close();
                fw.close();
            } catch (Exception e) {
                // ignore
            }
        }
    }
}
