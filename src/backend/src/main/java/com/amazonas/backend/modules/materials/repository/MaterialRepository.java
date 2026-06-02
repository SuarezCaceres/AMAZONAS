package com.amazonas.backend.modules.materials.repository;

import java.util.Optional;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import com.amazonas.backend.modules.materials.model.Material;

@Repository
public interface MaterialRepository extends JpaRepository<Material, UUID> {
    Optional<Material> findByNombreIgnoreCase(String nombre);
}
