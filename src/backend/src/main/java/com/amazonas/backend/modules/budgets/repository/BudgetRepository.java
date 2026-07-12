package com.amazonas.backend.modules.budgets.repository;

import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import com.amazonas.backend.modules.budgets.model.Budget;

import java.time.LocalDateTime;
import java.util.List;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

@Repository
public interface BudgetRepository extends JpaRepository<Budget, UUID> {

    /**
     * Carga el presupuesto con TODAS sus relaciones en un único JOIN SQL.
     * Resuelve el problema N+1 al mapear BudgetResponse: items, material de cada item
     * y el servicio de explicación se traen en la misma query.
     */
    @EntityGraph(attributePaths = {
        "solicitud", "creador",
        "items", "items.material",
        "servicioExplicacion"
    })
    @Query("SELECT b FROM Budget b WHERE b.solicitud.id = :solicitudId")
    Optional<Budget> findBySolicitudIdWithDetails(@Param("solicitudId") UUID solicitudId);

    /**
     * Mantiene la firma original (sin relaciones hijas) para casos donde solo
     * se necesita la entidad ligera (e.g., verificar existencia, eliminar).
     */
    @EntityGraph(attributePaths = {"solicitud", "creador"})
    Optional<Budget> findBySolicitudId(UUID solicitudId);

    boolean existsBySolicitudId(UUID solicitudId);

    /**
     * Carga todos los presupuestos con sus relaciones hijas para evitar N+1
     * en el método obtenerTodos().
     */
    @EntityGraph(attributePaths = {
        "solicitud", "creador",
        "items", "items.material",
        "servicioExplicacion"
    })
    @Query("SELECT b FROM Budget b ORDER BY b.createdAt DESC")
    List<Budget> findAllWithDetails();

    @EntityGraph(attributePaths = {"solicitud"})
    @Query("SELECT b FROM Budget b WHERE b.estado IN ('PENDIENTE', 'ENVIADO') AND b.createdAt < :limite")
    List<Budget> findExpiredBudgets(@Param("limite") LocalDateTime limite);
}
