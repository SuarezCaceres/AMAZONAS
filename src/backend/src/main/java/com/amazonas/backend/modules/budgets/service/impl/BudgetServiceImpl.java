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
import lombok.extern.slf4j.Slf4j;

@Service
@Transactional
@Slf4j
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

        if (req.solicitudId() != null) {
            solicitud = purchaseRequestRepository.findById(req.solicitudId())
                    .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Solicitud no encontrada: " + req.solicitudId()));

            // Validar unicidad: solo 1 presupuesto por solicitud
            if (budgetRepository.existsBySolicitudId(solicitud.getId())) {
                throw new ResponseStatusException(HttpStatus.CONFLICT, "Esta solicitud ya tiene un presupuesto. Use el endpoint de edición.");
            }
        }

        // Si es presencial y hay email, crear usuario si no existe
        if (Boolean.TRUE.equals(req.esPresencial()) && req.clienteEmail() != null && !req.clienteEmail().isBlank()) {
            crearUsuarioSiNoExiste(req.clienteNombre(), req.clienteEmail(), req.clienteTelefono());
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
        // Usa findBySolicitudIdWithDetails para traer items, items.material y
        // servicioExplicacion en un único JOIN SQL — elimina el N+1 del mapper.
        Budget budget = budgetRepository.findBySolicitudIdWithDetails(solicitudId)
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
        if (Boolean.TRUE.equals(req.esPresencial()) && req.clienteEmail() != null && !req.clienteEmail().isBlank()) {
            crearUsuarioSiNoExiste(req.clienteNombre(), req.clienteEmail(), req.clienteTelefono());
        }

        budget.setNombre(req.nombre());
        budget.setDescripcion(req.descripcion());
        if (req.clienteNombre() != null) budget.setClienteNombre(req.clienteNombre());
        if (req.clienteEmail() != null) budget.setClienteEmail(req.clienteEmail());
        if (req.clienteTelefono() != null) budget.setClienteTelefono(req.clienteTelefono());
        if (req.esPresencial() != null) budget.setEsPresencial(req.esPresencial());
        if (req.manoDeObra() != null) budget.setManoDeObra(req.manoDeObra());
        if (req.margenGanancia() != null) budget.setMargenGanancia(req.margenGanancia());
        if (req.adelantoRequerido() != null) budget.setAdelantoRequerido(req.adelantoRequerido());
        if (req.adelantoPorcentaje() != null) budget.setAdelantoPorcentaje(req.adelantoPorcentaje());
 
        // Actualizar items de forma segura para no violar el constraint único uq_budget_material (Consolidación de duplicados)
        if (req.items() != null) {
            for (BudgetItemRequest itemReq : req.items()) {
                if (itemReq.materialId() == null) {
                    throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "El ID de cada material es obligatorio en los items del presupuesto.");
                }
            }

            java.util.Map<UUID, BigDecimal> groupedItems = req.items().stream()
                    .filter(item -> item.materialId() != null && item.cantidad() != null)
                    .collect(Collectors.toMap(
                        BudgetItemRequest::materialId,
                        BudgetItemRequest::cantidad,
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
        if (req.servicioExplicacion() != null) {
            BudgetExplanationService svc = budget.getServicioExplicacion();
            if (svc == null) {
                svc = new BudgetExplanationService();
                svc.setBudget(budget);
                budget.setServicioExplicacion(svc);
            }
            applyExplanationService(svc, req.servicioExplicacion());
        }

        budget.recalculateAdelanto();
        return toResponse(budgetRepository.save(budget));
    }

    @Override
    @Transactional(readOnly = true)
    public java.util.List<BudgetResponse> obtenerTodos() {
        // findAllWithDetails carga items, items.material y servicioExplicacion
        // en una sola query con JOIN — elimina N+1 al iterar la lista completa.
        java.util.List<Budget> lista = budgetRepository.findAllWithDetails();
        java.util.List<BudgetResponse> result = new java.util.ArrayList<>();
        for (Budget b : lista) {
            try {
                result.add(toResponse(b));
            } catch (Exception ex) {
                log.error("Exception mapping budget {}", b.getId(), ex);
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
        budget.setNombre(req.nombre());
        budget.setDescripcion(req.descripcion());
        if (req.manoDeObra() != null) budget.setManoDeObra(req.manoDeObra());
        if (req.margenGanancia() != null) budget.setMargenGanancia(req.margenGanancia());
        if (req.adelantoRequerido() != null) budget.setAdelantoRequerido(req.adelantoRequerido());
        if (req.adelantoPorcentaje() != null) budget.setAdelantoPorcentaje(req.adelantoPorcentaje());

        // Datos del cliente para presupuestos presenciales
        if (req.clienteNombre() != null) budget.setClienteNombre(req.clienteNombre());
        if (req.clienteEmail() != null) budget.setClienteEmail(req.clienteEmail());
        if (req.clienteTelefono() != null) budget.setClienteTelefono(req.clienteTelefono());
        if (req.esPresencial() != null) budget.setEsPresencial(req.esPresencial());

        // Tipo de maqueta (Personalizada vs Kit Estándar)
        if (req.isCustom() != null) {
            budget.setIsCustom(req.isCustom());
        } else if (solicitud != null) {
            budget.setIsCustom(solicitud.getIsCustom());
        }
        if (req.isKit() != null) {
            budget.setIsKit(req.isKit());
        } else if (solicitud != null) {
            budget.setIsKit(solicitud.getIsKit());
        }

        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth != null && auth.isAuthenticated()) {
            String email = auth.getName();
            vendorRepository.findByEmail(email).ifPresent(budget::setCreador);
        }

        // Items del presupuesto — snapshot de costoVenta del material (Consolidación de duplicados)
        if (req.items() != null) {
            for (BudgetItemRequest itemReq : req.items()) {
                if (itemReq.materialId() == null) {
                    throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "El ID de cada material es obligatorio en los items del presupuesto.");
                }
            }

            java.util.Map<UUID, BigDecimal> groupedItems = req.items().stream()
                    .filter(item -> item.materialId() != null && item.cantidad() != null)
                    .collect(Collectors.toMap(
                        BudgetItemRequest::materialId,
                        BudgetItemRequest::cantidad,
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
        if (req.servicioExplicacion() != null) {
            BudgetExplanationService svc = new BudgetExplanationService();
            svc.setBudget(budget);
            applyExplanationService(svc, req.servicioExplicacion());
            budget.setServicioExplicacion(svc);
        }

        return budget;
    }

    private void applyExplanationService(BudgetExplanationService svc, BudgetExplanationServiceRequest req) {
        boolean isIncluido = req.incluido() != null ? req.incluido() : svc.getIncluido();
        if (req.incluido() != null) svc.setIncluido(req.incluido());

        if (isIncluido) {
            if (req.cantidadPersonas() == null || req.cantidadPersonas() <= 0) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "La cantidad de personas para el servicio de explicación debe ser mayor a 0.");
            }
            if (req.duracionMinutos() == null || req.duracionMinutos() <= 0) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "La duración para el servicio de explicación debe ser mayor a 0.");
            }
            if (req.precio() != null && req.precio().compareTo(java.math.BigDecimal.ZERO) < 0) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "El precio del servicio de explicación no puede ser negativo.");
            }
            svc.setTipoEvento(req.tipoEvento());
            svc.setCantidadPersonas(req.cantidadPersonas());
            svc.setDuracionMinutos(req.duracionMinutos());
            if (req.precio() != null) svc.setPrecio(req.precio());
            svc.setNotas(req.notas());
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
        boolean clienteRegistrado = false;
        if (b.getSolicitud() != null) {
            clienteRegistrado = true;
        } else if (b.getClienteEmail() != null && !b.getClienteEmail().isBlank()) {
            clienteRegistrado = userRepository.existsByEmail(b.getClienteEmail());
        }

        UUID solicitudId = null;
        Boolean isCustom = b.getIsCustom();
        Boolean isKit = b.getIsKit();
        if (b.getSolicitud() != null) {
            try {
                solicitudId = b.getSolicitud().getId();
                isCustom = b.getIsCustom() != null ? b.getIsCustom() : b.getSolicitud().getIsCustom();
                isKit = b.getIsKit() != null ? b.getIsKit() : b.getSolicitud().getIsKit();
            } catch (Exception ex) {
                // Capturar EntityNotFoundException por soft-delete de solicitud
            }
        }

        java.util.List<BudgetItemResponse> items = b.getItems().stream().map(item -> {
            UUID id = item.getId();
            UUID materialId = null;
            String materialNombre = null;
            String materialUnidad = null;
            if (item.getMaterial() != null) {
                materialId = item.getMaterial().getId();
                materialNombre = item.getMaterial().getNombre();
                materialUnidad = item.getMaterial().getUnidad();
            }
            return new BudgetItemResponse(
                id,
                materialId,
                materialNombre,
                materialUnidad,
                item.getCantidad(),
                item.getCostoUnitario(),
                item.getSubtotal()
            );
        }).collect(Collectors.toList());

        BudgetExplanationServiceResponse svcResp = null;
        if (b.getServicioExplicacion() != null) {
            BudgetExplanationService svc = b.getServicioExplicacion();
            svcResp = new BudgetExplanationServiceResponse(
                svc.getId(),
                svc.getIncluido(),
                svc.getTipoEvento(),
                svc.getCantidadPersonas(),
                svc.getDuracionMinutos(),
                svc.getPrecio(),
                svc.getNotas()
            );
        }

        return new BudgetResponse(
            b.getId(),
            solicitudId,
            b.getNombre(),
            b.getDescripcion(),
            b.getCodigoReferencia(),
            b.getEstado(),
            b.getManoDeObra(),
            b.getMargenGanancia(),
            b.getAdelantoRequerido(),
            b.getAdelantoPorcentaje(),
            b.getCostoMateriales(),
            b.getSubtotal(),
            b.getGanancia(),
            b.getTotal(),
            b.getAdelantoMonto(),
            b.getClienteNombre(),
            b.getClienteEmail(),
            b.getClienteTelefono(),
            b.getEsPresencial(),
            items,
            svcResp,
            b.getCreatedAt(),
            b.getUpdatedAt(),
            isCustom,
            isKit,
            clienteRegistrado
        );
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
            log.error("Exception registering user for email {}", email, ex);
        }
    }
}
