package com.amazonas.backend.modules.materials.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import com.amazonas.backend.modules.materials.model.MaterialCategory;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface MaterialCategoryRepository extends JpaRepository<MaterialCategory, UUID> {
    Optional<MaterialCategory> findByNombreIgnoreCase(String nombre);
}
