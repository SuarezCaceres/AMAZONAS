package com.amazonas.backend.modules.vendor.service.impl;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

import org.springframework.stereotype.Service;

import com.amazonas.backend.modules.products.repository.ProductRepository;
import com.amazonas.backend.modules.requests.enums.EstadoSolicitud;
import com.amazonas.backend.modules.requests.repository.PurchaseRequestRepository;
import com.amazonas.backend.modules.vendor.dto.DashboardStatsResponse;
import com.amazonas.backend.modules.vendor.dto.MaquetaStatsResponse;
import com.amazonas.backend.modules.vendor.dto.ProductAnalysisResponse;
import com.amazonas.backend.modules.vendor.service.VendorService;

import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class VendorServiceImpl implements VendorService {

    private final ProductRepository productRepository;
    private final PurchaseRequestRepository purchaseRequestRepository;

    @Override
    public DashboardStatsResponse getDashboardStats() {
        long totalMaquetas          = productRepository.count();
        long maquetasConfiguradas   = productRepository.countMaquetasConfiguradas();
        long maquetasDisponibles    = productRepository.countMaquetasDisponibles();
        long sinConfigurar          = productRepository.countSinConfigurar();
        long totalSolicitudes       = purchaseRequestRepository.count();
        long solicitudesPendientes  = purchaseRequestRepository.countByEstado(EstadoSolicitud.PENDIENTE);
        long solicitudesProcesando  = purchaseRequestRepository.countByEstado(EstadoSolicitud.PROCESANDO);
        long solicitudesCompletadas = purchaseRequestRepository.countByEstado(EstadoSolicitud.COMPLETADO);

        return new DashboardStatsResponse(
                totalMaquetas,
                maquetasConfiguradas,
                maquetasDisponibles,
                sinConfigurar,
                totalSolicitudes,
                solicitudesPendientes,
                solicitudesProcesando,
                solicitudesCompletadas
        );
    }

    @Override
    public MaquetaStatsResponse getMaquetaStats() {
        return new MaquetaStatsResponse(
                productRepository.count(),
                productRepository.countMaquetasConfiguradas(),
                productRepository.countMaquetasDisponibles(),
                productRepository.countSinConfigurar()
        );
    }

    @Override
    public List<ProductAnalysisResponse> getProductAnalysis() {
        List<Object[]> rows = purchaseRequestRepository.countRequestsByProduct();
        Map<String, ProductAnalysisResponse> map = new LinkedHashMap<>();

        // 1. Agregar los productos que tienen solicitudes
        for (Object[] row : rows) {
            if (row[0] != null) {
                String id = row[0].toString();
                String titulo = row[1] != null ? row[1].toString() : "Sin Título";
                String categoriaNombre = row[2] != null ? row[2].toString() : "Sin Categoría";
                String imageUrl = row[3] != null ? row[3].toString() : "";
                long totalSolicitudes = row[4] != null ? ((Number) row[4]).longValue() : 0L;

                map.put(id, new ProductAnalysisResponse(id, titulo, categoriaNombre, imageUrl, totalSolicitudes));
            }
        }

        // 2. Agregar los productos que NO tienen solicitudes para que salgan en el listado con 0
        productRepository.findAll().forEach(p -> {
            String id = p.getId().toString();
            if (!map.containsKey(id)) {
                String catNombre = p.getCategoria() != null ? p.getCategoria().getNombre() : "Sin Categoría";
                map.put(id, new ProductAnalysisResponse(id, p.getTitulo(), catNombre, p.getImageUrl(), 0L));
            }
        });

        return new ArrayList<>(map.values());
    }
}
