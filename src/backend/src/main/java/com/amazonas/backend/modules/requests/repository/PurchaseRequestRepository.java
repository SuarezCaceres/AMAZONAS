package com.amazonas.backend.modules.requests.repository;

import java.util.List;
import java.util.UUID;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import com.amazonas.backend.modules.requests.model.PurchaseRequest;
import com.amazonas.backend.modules.requests.enums.EstadoSolicitud;
import com.amazonas.backend.modules.users.model.User;

@Repository
public interface PurchaseRequestRepository extends JpaRepository<PurchaseRequest, UUID> {

    List<PurchaseRequest> findByUsuarioIdOrderByCreatedAtDesc(UUID usuarioId);

    @Query("SELECT pr FROM PurchaseRequest pr WHERE " +
           "(:estado IS NULL OR pr.estado = :estado) AND " +
           "(:search IS NULL OR LOWER(pr.clienteNombre) LIKE LOWER(CONCAT('%', :search, '%')) OR " +
           "LOWER(pr.productoNombre) LIKE LOWER(CONCAT('%', :search, '%')))")
    Page<PurchaseRequest> searchRequests(
            @Param("estado") EstadoSolicitud estado,
            @Param("search") String search,
            Pageable pageable
    );
    
    long countByEstado(EstadoSolicitud estado);

    @Query("SELECT pr.producto.id, pr.producto.titulo, pr.producto.categoria.nombre, " +
           "pr.producto.imageUrl, COUNT(pr) FROM PurchaseRequest pr " +
           "WHERE pr.producto IS NOT NULL " +
           "GROUP BY pr.producto.id, pr.producto.titulo, pr.producto.categoria.nombre, pr.producto.imageUrl " +
           "ORDER BY COUNT(pr) DESC")
    List<Object[]> countRequestsByProduct();

    // Métodos adicionales usados por PurchaseRequestServiceImpl
    List<PurchaseRequest> findByUsuarioOrderByCreatedAtDesc(User usuario);

    List<PurchaseRequest> findByEstadoOrderByCreatedAtDesc(EstadoSolicitud estado);

    List<PurchaseRequest> findAllByOrderByCreatedAtDesc();
}
