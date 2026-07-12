package com.amazonas.backend.modules.requests.service.impl;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import java.util.stream.Collectors;

import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.cache.annotation.Caching;

import com.amazonas.backend.modules.materials.model.Material;
import com.amazonas.backend.modules.materials.repository.MaterialRepository;
import com.amazonas.backend.modules.products.model.Product;
import com.amazonas.backend.modules.products.repository.ProductRepository;
import com.amazonas.backend.modules.requests.dto.*;
import com.amazonas.backend.modules.requests.enums.EstadoSolicitud;
import com.amazonas.backend.modules.requests.model.*;
import com.amazonas.backend.modules.requests.repository.PurchaseRequestRepository;
import com.amazonas.backend.modules.requests.service.PurchaseRequestService;
import com.amazonas.backend.modules.users.model.User;
import com.amazonas.backend.modules.users.repository.UserRepository;
import com.amazonas.backend.modules.vendors.repository.VendorRepository;
import com.amazonas.backend.modules.chat.repository.ChatRoomRepository;
import com.amazonas.backend.modules.chat.enums.ChatRoomStatus;
import com.amazonas.backend.modules.budgets.repository.BudgetRepository;
import lombok.extern.slf4j.Slf4j;

@Service
@Transactional
@Slf4j
public class PurchaseRequestServiceImpl implements PurchaseRequestService {

    private final PurchaseRequestRepository purchaseRequestRepository;
    private final ProductRepository productRepository;
    private final MaterialRepository materialRepository;
    private final UserRepository userRepository;
    private final VendorRepository vendorRepository;
    private final ChatRoomRepository chatRoomRepository;
    private final BudgetRepository budgetRepository;

    public PurchaseRequestServiceImpl(
            PurchaseRequestRepository purchaseRequestRepository,
            ProductRepository productRepository,
            MaterialRepository materialRepository,
            UserRepository userRepository,
            VendorRepository vendorRepository,
            ChatRoomRepository chatRoomRepository,
            BudgetRepository budgetRepository) {
        this.purchaseRequestRepository = purchaseRequestRepository;
        this.productRepository = productRepository;
        this.materialRepository = materialRepository;
        this.userRepository = userRepository;
        this.vendorRepository = vendorRepository;
        this.chatRoomRepository = chatRoomRepository;
        this.budgetRepository = budgetRepository;
    }

    // ─────────────────────────────────────────────────────────
    // CREAR SOLICITUD
    // ─────────────────────────────────────────────────────────

    /**
     * Crea una solicitud e invalida la caché del usuario y la caché de admin.
     */
    @Override
    @Caching(evict = {
        @CacheEvict(value = "solicitudes", key = "#usuarioEmail"),
        @CacheEvict(value = "solicitudes-todas", allEntries = true)
    })
    public PurchaseRequestResponse crear(PurchaseRequestRequest req, String usuarioEmail) {
        // Validar duplicidad de materiales seleccionados (si es personalización)
        if (Boolean.TRUE.equals(req.isCustom())) {
            java.util.Set<String> materialNames = new java.util.HashSet<>();
            java.util.Set<UUID> materialIds = new java.util.HashSet<>();

            if (req.materialesCustomizados() != null) {
                for (KitCustomizedMaterialRequest matReq : req.materialesCustomizados()) {
                    if (matReq.materialId() != null) {
                        if (!materialIds.add(matReq.materialId())) {
                            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "No se permiten materiales duplicados.");
                        }
                        Material dbM = materialRepository.findById(matReq.materialId()).orElse(null);
                        if (dbM != null) {
                            if (!materialNames.add(dbM.getNombre().trim().toLowerCase())) {
                                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "No se permiten materiales duplicados.");
                            }
                        }
                    }
                }
            }

            if (req.materialesPersonales() != null) {
                for (KitPersonalMaterialRequest perReq : req.materialesPersonales()) {
                    if (perReq.materialName() != null && !perReq.materialName().trim().isEmpty()) {
                        String normName = perReq.materialName().trim().toLowerCase();
                        if (!materialNames.add(normName)) {
                            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "No se permiten materiales duplicados.");
                        }
                        Optional<Material> dbMatOpt = materialRepository.findByNombreIgnoreCase(normName);
                        if (dbMatOpt.isPresent()) {
                            if (!materialIds.add(dbMatOpt.get().getId())) {
                                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "No se permiten materiales duplicados.");
                            }
                        }
                    }
                }
            }
        }

        User usuario = userRepository.findByEmail(usuarioEmail)
                .orElseThrow(() -> new RuntimeException("Usuario no encontrado: " + usuarioEmail));

        PurchaseRequest solicitud = new PurchaseRequest();
        solicitud.setUsuario(usuario);
        solicitud.setClienteNombre(req.clienteNombre());
        solicitud.setClienteEmail(req.clienteEmail());

        // Validar número telefónico (caracteres numéricos, longitud 9 para Perú)
        String telefonoOriginal = req.clienteTelefono();
        String telefonoLimpio = telefonoOriginal != null ? telefonoOriginal.replaceAll("\\D", "") : "";
        if (telefonoLimpio.length() == 11 && telefonoLimpio.startsWith("51")) {
            telefonoLimpio = telefonoLimpio.substring(2);
        }
        if (!telefonoLimpio.matches("^[0-9]{9}$")) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "El número telefónico debe contener exactamente 9 dígitos numéricos.");
        }
        solicitud.setClienteTelefono(telefonoLimpio);

        solicitud.setMensaje(req.mensaje());
        solicitud.setIsKit(Boolean.TRUE.equals(req.isKit()));
        solicitud.setIsCustom(Boolean.TRUE.equals(req.isCustom()));
        solicitud.setDescripcionPersonalizacion(req.descripcionPersonalizacion());
        solicitud.setMaterialesDeseados(req.materialesDeseados());
        solicitud.setSolicitarExplicacion(Boolean.TRUE.equals(req.solicitarExplicacion()));
        solicitud.setTipoEvento(req.tipoEvento());
        solicitud.setCantidadPersonas(req.cantidadPersonas());

        // ─── Flujo 1: Maqueta Ya Hecha / Producto específico ───
        String productoNombre = "Solicitud personalizada";
        if (req.productoId() != null) {
            Product producto = productRepository.findById(req.productoId())
                    .orElseThrow(() -> new RuntimeException("Producto no encontrado: " + req.productoId()));
            solicitud.setProducto(producto);
            productoNombre = producto.getTitulo();
        }
        solicitud.setProductoNombre(productoNombre);

        // Check for duplicate requests within the last minute
        LocalDateTime since = LocalDateTime.now().minusMinutes(1);
        if (purchaseRequestRepository.existsDuplicateRequest(usuario.getId(), productoNombre, since)) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Ya has enviado esta solicitud recientemente. Por favor, espera un minuto.");
        }

        // ─── Flujo 2: Kit de Maquetas ───
        if (Boolean.TRUE.equals(req.isKit()) && req.kits() != null) {
            for (KitMaquetaRequest kitReq : req.kits()) {
                Product kitProducto = productRepository.findById(kitReq.productId())
                        .orElseThrow(() -> new RuntimeException("Producto de kit no encontrado: " + kitReq.productId()));
                KitMaqueta kit = new KitMaqueta(
                        solicitud,
                        kitProducto,
                        kitProducto.getTitulo(),
                        null,
                        kitReq.cantidad() != null ? kitReq.cantidad() : 1,
                        kitReq.precioUnitarioReferencia()
                );
                solicitud.getKits().add(kit);
            }
        }

        // ─── Flujo 3: Materiales Customizados (del inventario) ───
        if (req.materialesCustomizados() != null) {
            for (KitCustomizedMaterialRequest matReq : req.materialesCustomizados()) {
                Material material = materialRepository.findById(matReq.materialId())
                        .orElseThrow(() -> new RuntimeException("Material no encontrado: " + matReq.materialId()));
                KitCustomizedMaterial kitMat = new KitCustomizedMaterial(
                        solicitud,
                        material,
                        material.getNombre(),
                        material.getUnidad(),
                        matReq.cantidad(),
                        material.getCostoVenta() // Snapshot del costo de venta actual
                );
                solicitud.getMaterialesCustomizados().add(kitMat);
            }
        }

        // ─── Flujo 3: Materiales Personales (texto libre) ───
        if (req.materialesPersonales() != null) {
            for (KitPersonalMaterialRequest perReq : req.materialesPersonales()) {
                if (perReq.materialName() != null) {
                    Optional<Material> dbMatOpt = materialRepository.findByNombreIgnoreCase(perReq.materialName().trim());
                    if (dbMatOpt.isPresent()) {
                        Material material = dbMatOpt.get();
                        KitCustomizedMaterial kitMat = new KitCustomizedMaterial(
                                solicitud,
                                material,
                                material.getNombre(),
                                material.getUnidad(),
                                perReq.cantidad(),
                                material.getCostoVenta()
                        );
                        solicitud.getMaterialesCustomizados().add(kitMat);
                        continue;
                    }
                }
                KitPersonalMaterial kitPer = new KitPersonalMaterial(
                        solicitud,
                        perReq.materialName(),
                        perReq.cantidad(),
                        perReq.descripcion()
                );
                solicitud.getMaterialesPersonales().add(kitPer);
            }
        }

        // ─── Materiales Preferidos (sugerencias) ───
        if (req.materialesPreferidos() != null) {
            for (RequestPreferredMaterialRequest prefReq : req.materialesPreferidos()) {
                Material material = null;
                String materialName = prefReq.materialName();
                if (prefReq.materialId() != null) {
                    material = materialRepository.findById(prefReq.materialId()).orElse(null);
                    if (material != null) materialName = material.getNombre();
                }
                RequestPreferredMaterial pref = new RequestPreferredMaterial(
                        solicitud,
                        material,
                        materialName,
                        prefReq.razonPreferencia()
                );
                solicitud.getMaterialesPreferidos().add(pref);
            }
        }

        PurchaseRequest saved = purchaseRequestRepository.save(solicitud);
        return toResponse(saved);
    }

    // ─────────────────────────────────────────────────────────
    // CONSULTAS
    // ─────────────────────────────────────────────────────────

    /**
     * Lista las solicitudes del usuario autenticado.
     * Cacheada por email en Redis: cada usuario tiene su propia entrada.
     * Se invalida automáticamente al crear o actualizar una solicitud.
     */
    @Override
    @Transactional(readOnly = true)
    @Cacheable(value = "solicitudes", key = "#usuarioEmail")
    public List<PurchaseRequestResponse> listarMisSolicitudes(String usuarioEmail) {
        // Carga previa en memoria de los IDs de solicitudes con presupuesto
        // para evitar el N+1 del OneToOne opcional
        java.util.Set<UUID> conPresupuesto = new java.util.HashSet<>(
                budgetRepository.findSolicitudIdsWithPresupuesto()
        );

        // Si el email corresponde a un vendedor/admin (no existe en tabla users), retornar lista vacía
        // en lugar de lanzar una excepción que produce HTTP 500.
        return userRepository.findByEmail(usuarioEmail)
                .map(usuario -> purchaseRequestRepository.findByUsuarioOrderByCreatedAtDesc(usuario)
                        .stream().map(s -> this.toResponse(s, conPresupuesto)).collect(Collectors.toList()))
                .orElse(List.of());
    }

    @Override
    @Transactional(readOnly = true)
    public PurchaseRequestResponse obtenerPorId(UUID id, String usuarioEmail) {
        PurchaseRequest solicitud = purchaseRequestRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Solicitud no encontrada: " + id));
        return toResponse(solicitud);
    }

    /**
     * Lista todas las solicitudes filtradas por estado.
     * Caché de Redis configurada para administradores (vendedores).
     */
    @Override
    @Transactional(readOnly = true)
    @Cacheable(value = "solicitudes-todas", key = "#estado != null ? #estado.name() : 'todas'")
    public List<PurchaseRequestResponse> listarTodas(EstadoSolicitud estado) {
        // Carga previa en memoria de los IDs de solicitudes con presupuesto
        // para evitar el N+1 del OneToOne opcional en Hibernate al listar
        java.util.Set<UUID> conPresupuesto = new java.util.HashSet<>(
                budgetRepository.findSolicitudIdsWithPresupuesto()
        );

        List<PurchaseRequest> lista = (estado != null)
                ? purchaseRequestRepository.findByEstadoOrderByCreatedAtDesc(estado)
                : purchaseRequestRepository.findAllByOrderByCreatedAtDesc();
        List<PurchaseRequestResponse> result = new ArrayList<>();
        for (PurchaseRequest s : lista) {
            try {
                result.add(toResponse(s, conPresupuesto));
            } catch (Exception ex) {
                log.error("Exception mapping request {}", s.getId(), ex);
            }
        }
        return result;
    }

    /**
     * Actualiza el estado de una solicitud e invalida toda la caché de solicitudes
     * (tanto individuales de usuario como la global de admin).
     */
    @Override
    @Caching(evict = {
        @CacheEvict(value = "solicitudes", allEntries = true),
        @CacheEvict(value = "solicitudes-todas", allEntries = true)
    })
    public PurchaseRequestResponse actualizarEstado(UUID id, UpdateEstadoRequest req) {
        PurchaseRequest solicitud = purchaseRequestRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Solicitud no encontrada: " + id));
        solicitud.setEstado(req.estado());
        PurchaseRequestResponse response = toResponse(purchaseRequestRepository.save(solicitud));
        
        if (req.estado() == EstadoSolicitud.COMPLETADO) {
            chatRoomRepository.findByRequestId(id).ifPresent(room -> {
                room.setStatus(ChatRoomStatus.CLOSED);
                chatRoomRepository.save(room);
            });
        }
        
        return response;
    }

    @Override
    @Transactional(readOnly = true)
    public SolicitudParaPresupuestoResponse obtenerParaPresupuesto(UUID id) {
        PurchaseRequest solicitud = purchaseRequestRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Solicitud no encontrada: " + id));

        // Force initialization of lazy collections
        solicitud.getMaterialesPreferidos().size();
        solicitud.getMaterialesCustomizados().size();
        solicitud.getMaterialesPersonales().size();
        if (solicitud.getProducto() != null) {
            solicitud.getProducto().getMateriales().size();
        }

        // Get materials: if request has custom or personal materials chosen by client, use them. Otherwise default to product's original materials.
        List<SolicitudParaPresupuestoResponse.MaterialPresupuestoDTO> materiales = new ArrayList<>();
        if (solicitud.getMaterialesCustomizados() != null && !solicitud.getMaterialesCustomizados().isEmpty()) {
            materiales.addAll(
                solicitud.getMaterialesCustomizados().stream()
                    .map(cm -> new SolicitudParaPresupuestoResponse.MaterialPresupuestoDTO(
                        cm.getMaterial() != null ? cm.getMaterial().getId() : null,
                        cm.getMaterialName(),
                        cm.getMaterialUnit(),
                        cm.getCostoUnitarioReferencia(),
                        cm.getCantidad(),
                        false
                    ))
                    .collect(Collectors.toList())
            );
        }
        if (solicitud.getMaterialesPersonales() != null && !solicitud.getMaterialesPersonales().isEmpty()) {
            materiales.addAll(
                solicitud.getMaterialesPersonales().stream()
                    .map(pm -> {
                        Material dbMat = pm.getMaterialName() != null 
                            ? materialRepository.findByNombreIgnoreCase(pm.getMaterialName().trim()).orElse(null) 
                            : null;
                        return new SolicitudParaPresupuestoResponse.MaterialPresupuestoDTO(
                            dbMat != null ? dbMat.getId() : null,
                            pm.getMaterialName(),
                            dbMat != null ? dbMat.getUnidad() : "Unidad",
                            dbMat != null ? dbMat.getCostoVenta() : BigDecimal.ZERO,
                            pm.getCantidad() != null ? pm.getCantidad() : BigDecimal.ONE,
                            false
                        );
                    })
                    .collect(Collectors.toList())
            );
        }

        if (materiales.isEmpty() && solicitud.getProducto() != null) {
            List<SolicitudParaPresupuestoResponse.MaterialPresupuestoDTO> originalMateriales = 
                solicitud.getProducto().getMateriales().stream()
                    .map(pm -> new SolicitudParaPresupuestoResponse.MaterialPresupuestoDTO(
                        pm.getMaterial().getId(),
                        pm.getMaterial().getNombre(),
                        pm.getMaterial().getUnidad(),
                        pm.getMaterial().getCostoVenta(),
                        pm.getCantidadSugerida(),
                        pm.getEsOpcional()
                    ))
                    .collect(Collectors.toList());
            materiales.addAll(originalMateriales);
        }

        // Get client's preferred materials (selected from list)
        List<SolicitudParaPresupuestoResponse.MaterialSolicitadoDTO> materialesPreferidos = 
            solicitud.getMaterialesPreferidos().stream()
                .map(pref -> {
                    Material mat = pref.getMaterial();
                    return new SolicitudParaPresupuestoResponse.MaterialSolicitadoDTO(
                        mat != null ? mat.getId() : null,
                        pref.getMaterialName(),
                        mat != null ? mat.getUnidad() : null,
                        mat != null ? mat.getCostoVenta() : null,
                        pref.getRazonPreferencia()
                    );
                })
                .collect(Collectors.toList());

        return new SolicitudParaPresupuestoResponse(
            solicitud.getId(),
            solicitud.getProductoNombre(),
            solicitud.getDescripcionPersonalizacion(),
            solicitud.getIsCustom(),
            solicitud.getClienteNombre(),
            solicitud.getClienteEmail(),
            solicitud.getClienteTelefono(),
            solicitud.getCreatedAt(),
            solicitud.getEstado() != null ? solicitud.getEstado().name() : null,
            materiales,
            materialesPreferidos,
            solicitud.getMaterialesDeseados(),
            solicitud.getSolicitarExplicacion(),
            solicitud.getTipoEvento(),
            solicitud.getCantidadPersonas()
        );
    }

    // ─────────────────────────────────────────────────────────
    // MAPPER
    // ─────────────────────────────────────────────────────────

    private PurchaseRequestResponse toResponse(PurchaseRequest s) {
        return toResponse(s, null);
    }

    private PurchaseRequestResponse toResponse(PurchaseRequest s, java.util.Set<UUID> conPresupuesto) {
        UUID productoId = (s.getProducto() != null) ? s.getProducto().getId() : null;

        List<KitMaquetaResponse> kits = s.getKits().stream().map(k -> {
            UUID kitProdId = (k.getProduct() != null) ? k.getProduct().getId() : null;
            BigDecimal subtotal = null;
            if (k.getPrecioUnitarioReferencia() != null && k.getCantidad() != null) {
                subtotal = k.getPrecioUnitarioReferencia().multiply(BigDecimal.valueOf(k.getCantidad()));
            }
            return new KitMaquetaResponse(
                k.getId(),
                kitProdId,
                k.getProductName(),
                k.getProductSlug(),
                k.getCantidad(),
                k.getPrecioUnitarioReferencia(),
                subtotal
            );
        }).collect(Collectors.toList());

        List<KitCustomizedMaterialResponse> customized = s.getMaterialesCustomizados().stream().map(m -> {
            UUID matId = (m.getMaterial() != null) ? m.getMaterial().getId() : null;
            BigDecimal subtotal = null;
            if (m.getCantidad() != null && m.getCostoUnitarioReferencia() != null) {
                subtotal = m.getCantidad().multiply(m.getCostoUnitarioReferencia());
            }
            return new KitCustomizedMaterialResponse(
                m.getId(),
                matId,
                m.getMaterialName(),
                m.getMaterialUnit(),
                m.getCantidad(),
                m.getCostoUnitarioReferencia(),
                subtotal
            );
        }).collect(Collectors.toList());

        List<KitPersonalMaterialResponse> personales = s.getMaterialesPersonales().stream().map(p -> {
            return new KitPersonalMaterialResponse(
                p.getId(),
                p.getMaterialName(),
                p.getCantidad(),
                p.getDescripcion()
            );
        }).collect(Collectors.toList());

        List<RequestPreferredMaterialResponse> preferidos = s.getMaterialesPreferidos().stream().map(pf -> {
            UUID matId = (pf.getMaterial() != null) ? pf.getMaterial().getId() : null;
            return new RequestPreferredMaterialResponse(
                pf.getId(),
                matId,
                pf.getMaterialName(),
                pf.getRazonPreferencia()
            );
        }).collect(Collectors.toList());

        List<String> grabacionesUrls = (s.getGrabacionesUrls() != null && !s.getGrabacionesUrls().isBlank()) 
            ? List.of(s.getGrabacionesUrls().split(",")) 
            : List.of();

        List<String> archivosUrls = (s.getArchivosUrls() != null && !s.getArchivosUrls().isBlank()) 
            ? List.of(s.getArchivosUrls().split(",")) 
            : List.of();

        return new PurchaseRequestResponse(
            s.getId(),
            s.getClienteNombre(),
            s.getClienteEmail(),
            s.getClienteTelefono(),
            productoId,
            s.getProductoNombre(),
            s.getIsKit(),
            s.getIsCustom(),
            s.getEstado(),
            s.getMensaje(),
            s.getDescripcionPersonalizacion(),
            s.getMaterialesDeseados(),
            s.getSolicitarExplicacion(),
            s.getTipoEvento(),
            s.getCantidadPersonas(),
            kits,
            customized,
            personales,
            preferidos,
            conPresupuesto != null ? conPresupuesto.contains(s.getId()) : s.getPresupuesto() != null,
            grabacionesUrls,
            archivosUrls,
            s.getMotivoCancelacion(),
            s.getCreatedAt(),
            s.getUpdatedAt()
        );
    }

    @Override
    @Caching(evict = {
        @CacheEvict(value = "solicitudes", key = "#usuarioEmail"),
        @CacheEvict(value = "solicitudes-todas", allEntries = true)
    })
    public PurchaseRequestResponse actualizarArchivos(UUID id, RequestFilesUpdateRequest req, String usuarioEmail) {
        PurchaseRequest solicitud = purchaseRequestRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Solicitud no encontrada: " + id));

        // Validar acceso: creador de la solicitud o admin
        boolean isAdmin = userRepository.findByEmail(usuarioEmail).isEmpty() && vendorRepository.findByEmail(usuarioEmail).isPresent();
        if (!isAdmin && !solicitud.getUsuario().getEmail().equals(usuarioEmail)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "No tienes permiso para actualizar esta solicitud.");
        }

        if (req.grabacionesUrls() != null) {
            solicitud.setGrabacionesUrls(String.join(",", req.grabacionesUrls()));
        }
        if (req.archivosUrls() != null) {
            solicitud.setArchivosUrls(String.join(",", req.archivosUrls()));
        }

        PurchaseRequest saved = purchaseRequestRepository.save(solicitud);
        return toResponse(saved);
    }

    @Override
    @Caching(evict = {
        @CacheEvict(value = "solicitudes", allEntries = true),
        @CacheEvict(value = "solicitudes-todas", allEntries = true)
    })
    public void eliminar(UUID id, String usuarioEmail) {
        PurchaseRequest solicitud = purchaseRequestRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Solicitud no encontrada: " + id));

        // Validar que la solicitud sea del usuario actual O que el usuario que ejecuta sea ADMIN o VENDEDOR
        boolean isOwner = solicitud.getUsuario().getEmail().equalsIgnoreCase(usuarioEmail);
        boolean isAdmin = userRepository.findByEmail(usuarioEmail)
                .map(u -> u.getRole().name().equals("ADMIN"))
                .orElse(false);
        boolean isVendor = vendorRepository.findByEmailIgnoreCase(usuarioEmail).isPresent();

        if (!isOwner && !isAdmin && !isVendor) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "No tienes permiso para cancelar esta solicitud.");
        }

        // Buscar si existe un presupuesto asociado y eliminarlo
        budgetRepository.findBySolicitudId(id).ifPresent(budget -> {
            budgetRepository.delete(budget);
            budgetRepository.flush();
        });

        // Forzar eliminación física de la solicitud
        purchaseRequestRepository.forceDelete(id);
    }

    @Override
    @Caching(evict = {
        @CacheEvict(value = "solicitudes", allEntries = true),
        @CacheEvict(value = "solicitudes-todas", allEntries = true)
    })
    public PurchaseRequestResponse rechazar(UUID id, RejectRequest req, String usuarioEmail) {
        PurchaseRequest solicitud = purchaseRequestRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Solicitud no encontrada: " + id));

        // Validar que el usuario que ejecuta sea ADMIN o VENDEDOR
        boolean isAdmin = userRepository.findByEmail(usuarioEmail)
                .map(u -> u.getRole().name().equals("ADMIN"))
                .orElse(false);
        boolean isVendor = vendorRepository.findByEmailIgnoreCase(usuarioEmail).isPresent();

        if (!isAdmin && !isVendor) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "No tienes permiso para rechazar esta solicitud.");
        }

        solicitud.setEstado(EstadoSolicitud.RECHAZADO);
        solicitud.setMotivoCancelacion(req.motivo());

        PurchaseRequest saved = purchaseRequestRepository.save(solicitud);

        // Cerrar la sala de chat
        chatRoomRepository.findByRequestId(id).ifPresent(room -> {
            room.setStatus(ChatRoomStatus.CLOSED);
            chatRoomRepository.save(room);
        });

        return toResponse(saved);
    }
}
