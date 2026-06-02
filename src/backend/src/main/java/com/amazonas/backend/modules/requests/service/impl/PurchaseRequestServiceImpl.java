package com.amazonas.backend.modules.requests.service.impl;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

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

@Service
@Transactional
public class PurchaseRequestServiceImpl implements PurchaseRequestService {

    private final PurchaseRequestRepository purchaseRequestRepository;
    private final ProductRepository productRepository;
    private final MaterialRepository materialRepository;
    private final UserRepository userRepository;

    public PurchaseRequestServiceImpl(
            PurchaseRequestRepository purchaseRequestRepository,
            ProductRepository productRepository,
            MaterialRepository materialRepository,
            UserRepository userRepository) {
        this.purchaseRequestRepository = purchaseRequestRepository;
        this.productRepository = productRepository;
        this.materialRepository = materialRepository;
        this.userRepository = userRepository;
    }

    // ─────────────────────────────────────────────────────────
    // CREAR SOLICITUD
    // ─────────────────────────────────────────────────────────

    @Override
    public PurchaseRequestResponse crear(PurchaseRequestRequest req, String usuarioEmail) {
        User usuario = userRepository.findByEmail(usuarioEmail)
                .orElseThrow(() -> new RuntimeException("Usuario no encontrado: " + usuarioEmail));

        PurchaseRequest solicitud = new PurchaseRequest();
        solicitud.setUsuario(usuario);
        solicitud.setClienteNombre(req.getClienteNombre());
        solicitud.setClienteEmail(req.getClienteEmail());
        solicitud.setClienteTelefono(req.getClienteTelefono());
        solicitud.setMensaje(req.getMensaje());
        solicitud.setIsKit(Boolean.TRUE.equals(req.getIsKit()));
        solicitud.setIsCustom(Boolean.TRUE.equals(req.getIsCustom()));
        solicitud.setDescripcionPersonalizacion(req.getDescripcionPersonalizacion());
        solicitud.setMaterialesDeseados(req.getMaterialesDeseados());
        solicitud.setSolicitarExplicacion(Boolean.TRUE.equals(req.getSolicitarExplicacion()));
        solicitud.setTipoEvento(req.getTipoEvento());
        solicitud.setCantidadPersonas(req.getCantidadPersonas());

        // ─── Flujo 1: Maqueta Ya Hecha / Producto específico ───
        String productoNombre = "Solicitud personalizada";
        if (req.getProductoId() != null) {
            Product producto = productRepository.findById(req.getProductoId())
                    .orElseThrow(() -> new RuntimeException("Producto no encontrado: " + req.getProductoId()));
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
        if (Boolean.TRUE.equals(req.getIsKit()) && req.getKits() != null) {
            for (KitMaquetaRequest kitReq : req.getKits()) {
                Product kitProducto = productRepository.findById(kitReq.getProductId())
                        .orElseThrow(() -> new RuntimeException("Producto de kit no encontrado: " + kitReq.getProductId()));
                KitMaqueta kit = new KitMaqueta(
                        solicitud,
                        kitProducto,
                        kitProducto.getTitulo(),
                        null,
                        kitReq.getCantidad() != null ? kitReq.getCantidad() : 1,
                        kitReq.getPrecioUnitarioReferencia()
                );
                solicitud.getKits().add(kit);
            }
        }

        // ─── Flujo 3: Materiales Customizados (del inventario) ───
        if (req.getMaterialesCustomizados() != null) {
            for (KitCustomizedMaterialRequest matReq : req.getMaterialesCustomizados()) {
                Material material = materialRepository.findById(matReq.getMaterialId())
                        .orElseThrow(() -> new RuntimeException("Material no encontrado: " + matReq.getMaterialId()));
                KitCustomizedMaterial kitMat = new KitCustomizedMaterial(
                        solicitud,
                        material,
                        material.getNombre(),
                        material.getUnidad(),
                        matReq.getCantidad(),
                        material.getCostoVenta() // Snapshot del costo de venta actual
                );
                solicitud.getMaterialesCustomizados().add(kitMat);
            }
        }

        // ─── Flujo 3: Materiales Personales (texto libre) ───
        if (req.getMaterialesPersonales() != null) {
            for (KitPersonalMaterialRequest perReq : req.getMaterialesPersonales()) {
                KitPersonalMaterial kitPer = new KitPersonalMaterial(
                        solicitud,
                        perReq.getMaterialName(),
                        perReq.getCantidad(),
                        perReq.getDescripcion()
                );
                solicitud.getMaterialesPersonales().add(kitPer);
            }
        }

        // ─── Materiales Preferidos (sugerencias) ───
        if (req.getMaterialesPreferidos() != null) {
            for (RequestPreferredMaterialRequest prefReq : req.getMaterialesPreferidos()) {
                Material material = null;
                String materialName = prefReq.getMaterialName();
                if (prefReq.getMaterialId() != null) {
                    material = materialRepository.findById(prefReq.getMaterialId()).orElse(null);
                    if (material != null) materialName = material.getNombre();
                }
                RequestPreferredMaterial pref = new RequestPreferredMaterial(
                        solicitud,
                        material,
                        materialName,
                        prefReq.getRazonPreferencia()
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

    @Override
    @Transactional(readOnly = true)
    public List<PurchaseRequestResponse> listarMisSolicitudes(String usuarioEmail) {
        User usuario = userRepository.findByEmail(usuarioEmail)
                .orElseThrow(() -> new RuntimeException("Usuario no encontrado: " + usuarioEmail));
        return purchaseRequestRepository.findByUsuarioOrderByCreatedAtDesc(usuario)
                .stream().map(this::toResponse).collect(Collectors.toList());
    }

    @Override
    @Transactional(readOnly = true)
    public PurchaseRequestResponse obtenerPorId(UUID id, String usuarioEmail) {
        PurchaseRequest solicitud = purchaseRequestRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Solicitud no encontrada: " + id));
        return toResponse(solicitud);
    }

    @Override
    @Transactional(readOnly = true)
    public List<PurchaseRequestResponse> listarTodas(EstadoSolicitud estado) {
        List<PurchaseRequest> lista = (estado != null)
                ? purchaseRequestRepository.findByEstadoOrderByCreatedAtDesc(estado)
                : purchaseRequestRepository.findAllByOrderByCreatedAtDesc();
        return lista.stream().map(this::toResponse).collect(Collectors.toList());
    }

    @Override
    public PurchaseRequestResponse actualizarEstado(UUID id, UpdateEstadoRequest req) {
        PurchaseRequest solicitud = purchaseRequestRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Solicitud no encontrada: " + id));
        solicitud.setEstado(req.getEstado());
        return toResponse(purchaseRequestRepository.save(solicitud));
    }

    // ─────────────────────────────────────────────────────────
    // MAPPER
    // ─────────────────────────────────────────────────────────

    private PurchaseRequestResponse toResponse(PurchaseRequest s) {
        PurchaseRequestResponse resp = new PurchaseRequestResponse();
        resp.setId(s.getId());
        resp.setClienteNombre(s.getClienteNombre());
        resp.setClienteEmail(s.getClienteEmail());
        resp.setClienteTelefono(s.getClienteTelefono());
        resp.setProductoNombre(s.getProductoNombre());
        if (s.getProducto() != null) resp.setProductoId(s.getProducto().getId());
        resp.setIsKit(s.getIsKit());
        resp.setIsCustom(s.getIsCustom());
        resp.setEstado(s.getEstado());
        resp.setMensaje(s.getMensaje());
        resp.setDescripcionPersonalizacion(s.getDescripcionPersonalizacion());
        resp.setMaterialesDeseados(s.getMaterialesDeseados());
        resp.setSolicitarExplicacion(s.getSolicitarExplicacion());
        resp.setTipoEvento(s.getTipoEvento());
        resp.setCantidadPersonas(s.getCantidadPersonas());
        resp.setTienePresupuesto(s.getPresupuesto() != null);
        resp.setCreatedAt(s.getCreatedAt());
        resp.setUpdatedAt(s.getUpdatedAt());

        // Kits
        resp.setKits(s.getKits().stream().map(k -> {
            KitMaquetaResponse kr = new KitMaquetaResponse();
            kr.setId(k.getId());
            if (k.getProduct() != null) kr.setProductId(k.getProduct().getId());
            kr.setProductName(k.getProductName());
            kr.setProductSlug(k.getProductSlug());
            kr.setCantidad(k.getCantidad());
            kr.setPrecioUnitarioReferencia(k.getPrecioUnitarioReferencia());
            if (k.getPrecioUnitarioReferencia() != null && k.getCantidad() != null) {
                kr.setSubtotal(k.getPrecioUnitarioReferencia().multiply(BigDecimal.valueOf(k.getCantidad())));
            }
            return kr;
        }).collect(Collectors.toList()));

        // Materiales customizados
        resp.setMaterialesCustomizados(s.getMaterialesCustomizados().stream().map(m -> {
            KitCustomizedMaterialResponse mr = new KitCustomizedMaterialResponse();
            mr.setId(m.getId());
            if (m.getMaterial() != null) mr.setMaterialId(m.getMaterial().getId());
            mr.setMaterialName(m.getMaterialName());
            mr.setMaterialUnit(m.getMaterialUnit());
            mr.setCantidad(m.getCantidad());
            mr.setCostoUnitarioReferencia(m.getCostoUnitarioReferencia());
            if (m.getCantidad() != null && m.getCostoUnitarioReferencia() != null) {
                mr.setSubtotal(m.getCantidad().multiply(m.getCostoUnitarioReferencia()));
            }
            return mr;
        }).collect(Collectors.toList()));

        // Materiales personales
        resp.setMaterialesPersonales(s.getMaterialesPersonales().stream().map(p -> {
            KitPersonalMaterialResponse pr = new KitPersonalMaterialResponse();
            pr.setId(p.getId());
            pr.setMaterialName(p.getMaterialName());
            pr.setCantidad(p.getCantidad());
            pr.setDescripcion(p.getDescripcion());
            return pr;
        }).collect(Collectors.toList()));

        // Materiales preferidos
        resp.setMaterialesPreferidos(s.getMaterialesPreferidos().stream().map(pf -> {
            RequestPreferredMaterialResponse pfr = new RequestPreferredMaterialResponse();
            pfr.setId(pf.getId());
            if (pf.getMaterial() != null) pfr.setMaterialId(pf.getMaterial().getId());
            pfr.setMaterialName(pf.getMaterialName());
            pfr.setRazonPreferencia(pf.getRazonPreferencia());
            return pfr;
        }).collect(Collectors.toList()));

        return resp;
    }
}
