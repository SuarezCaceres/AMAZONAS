package com.amazonas.backend.modules.requests.repository;

import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import com.amazonas.backend.modules.requests.model.KitCustomizedMaterial;

@Repository
public interface KitCustomizedMaterialRepository extends JpaRepository<KitCustomizedMaterial, UUID> {
}
