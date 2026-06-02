package com.amazonas.backend.modules.requests.repository;

import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import com.amazonas.backend.modules.requests.model.KitMaqueta;

@Repository
public interface KitMaquetaRepository extends JpaRepository<KitMaqueta, UUID> {
}
