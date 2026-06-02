package com.amazonas.backend.modules.materials.service;

import java.util.List;
import java.util.UUID;

import com.amazonas.backend.modules.materials.dto.MaterialRequest;
import com.amazonas.backend.modules.materials.dto.MaterialResponse;

public interface MaterialService {
    List<MaterialResponse> getAllMaterials();
    MaterialResponse getMaterialById(UUID id);
    MaterialResponse createMaterial(MaterialRequest request);
    MaterialResponse updateMaterial(UUID id, MaterialRequest request);
    void deleteMaterial(UUID id);
}
