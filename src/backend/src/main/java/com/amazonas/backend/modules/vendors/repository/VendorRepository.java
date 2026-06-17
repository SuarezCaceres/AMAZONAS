package com.amazonas.backend.modules.vendors.repository;

import java.util.Optional;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import com.amazonas.backend.modules.vendors.model.Vendor;

@Repository
public interface VendorRepository extends JpaRepository<Vendor, UUID> {
    
    Optional<Vendor> findByEmail(String email);
    
    boolean existsByEmail(String email);

    /** Obtiene el primer vendedor activo (usado para asignación automática en MVP) */
    Optional<Vendor> findFirstByActivoTrue();
}