package com.amazonas.backend.modules.products.repository;

import java.util.List;
import java.util.UUID;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import com.amazonas.backend.modules.products.model.Product;

@Repository
public interface ProductRepository extends JpaRepository<Product, UUID> {

    @Query(value = "SELECT DISTINCT p FROM Product p " +
           "LEFT JOIN FETCH p.materiales pm " +
           "LEFT JOIN FETCH pm.material m " +
           "LEFT JOIN FETCH p.categoria c " +
           "WHERE (:categoriaId IS NULL OR c.id = :categoriaId OR " +
           "(:categoriaId = 'educativo' AND c.id = 'educativa') OR (:categoriaId = 'educativa' AND c.id = 'educativo') OR " +
           "(:categoriaId = 'inclusivo' AND c.id = 'inclusiva') OR (:categoriaId = 'inclusiva' AND c.id = 'inclusivo')) AND " +
           "(CAST(:search AS string) IS NULL OR LOWER(p.titulo) LIKE LOWER(CONCAT('%', CAST(:search AS string), '%')) " +
           "OR LOWER(p.descripcion) LIKE LOWER(CONCAT('%', CAST(:search AS string), '%')) " +
           "OR LOWER(c.nombre) LIKE LOWER(CONCAT('%', CAST(:search AS string), '%')) " +
           "OR LOWER(m.nombre) LIKE LOWER(CONCAT('%', CAST(:search AS string), '%')))",
           countQuery = "SELECT COUNT(DISTINCT p) FROM Product p " +
           "LEFT JOIN p.materiales pm " +
           "LEFT JOIN pm.material m " +
           "LEFT JOIN p.categoria c " +
           "WHERE (:categoriaId IS NULL OR c.id = :categoriaId OR " +
           "(:categoriaId = 'educativo' AND c.id = 'educativa') OR (:categoriaId = 'educativa' AND c.id = 'educativo') OR " +
           "(:categoriaId = 'inclusivo' AND c.id = 'inclusiva') OR (:categoriaId = 'inclusiva' AND c.id = 'inclusivo')) AND " +
           "(CAST(:search AS string) IS NULL OR LOWER(p.titulo) LIKE LOWER(CONCAT('%', CAST(:search AS string), '%')) " +
           "OR LOWER(p.descripcion) LIKE LOWER(CONCAT('%', CAST(:search AS string), '%')) " +
           "OR LOWER(c.nombre) LIKE LOWER(CONCAT('%', CAST(:search AS string), '%')) " +
           "OR LOWER(m.nombre) LIKE LOWER(CONCAT('%', CAST(:search AS string), '%')))")
    Page<Product> searchProducts(
            @Param("categoriaId") String categoriaId,
            @Param("search") String search,
            Pageable pageable
    );

    @Query("SELECT p FROM Product p " +
           "LEFT JOIN FETCH p.materiales pm " +
           "LEFT JOIN FETCH pm.material m " +
           "LEFT JOIN FETCH p.categoria " +
           "WHERE p.id = :id")
    java.util.Optional<Product> findByIdWithDetails(@Param("id") UUID id);

    @Query("SELECT p FROM Product p WHERE p.categoria.id = :categoriaId AND p.id <> :productId")
    List<Product> findRelatedProducts(
            @Param("categoriaId") String categoriaId,
            @Param("productId") UUID productId,
            Pageable pageable
    );

    @Query("SELECT COUNT(p) FROM Product p WHERE p.imageUrl IS NOT NULL AND p.imageUrl <> ''")
    long countMaquetasConfiguradas();

    @Query("SELECT COUNT(p) FROM Product p WHERE p.stock > 0")
    long countMaquetasDisponibles();

    @Query("SELECT COUNT(p) FROM Product p WHERE p.imageUrl IS NULL OR p.imageUrl = ''")
    long countSinConfigurar();
}
