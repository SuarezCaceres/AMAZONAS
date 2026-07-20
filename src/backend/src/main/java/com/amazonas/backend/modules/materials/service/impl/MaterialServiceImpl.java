package com.amazonas.backend.modules.materials.service.impl;

import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.amazonas.backend.modules.materials.dto.MaterialRequest;
import com.amazonas.backend.modules.materials.dto.MaterialResponse;
import com.amazonas.backend.modules.materials.model.Material;
import com.amazonas.backend.modules.materials.model.MaterialCategory;
import com.amazonas.backend.modules.materials.repository.MaterialCategoryRepository;
import com.amazonas.backend.modules.materials.repository.MaterialRepository;
import com.amazonas.backend.modules.materials.service.MaterialService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.cache.annotation.CacheEvict;

@Service
@RequiredArgsConstructor
public class MaterialServiceImpl implements MaterialService {

    private final MaterialRepository materialRepository;
    private final MaterialCategoryRepository materialCategoryRepository;

    @Override
    @Transactional(readOnly = true)
    @Cacheable(value = "materials", key = "'all'")
    public List<MaterialResponse> getAllMaterials() {
        return materialRepository.findAll().stream()
                .map(this::mapToResponse)
                .collect(Collectors.toList());
    }

    @Override
    @Transactional(readOnly = true)
    @Cacheable(value = "materials", key = "#id")
    public MaterialResponse getMaterialById(UUID id) {
        Material material = materialRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Material no encontrado"));
        return mapToResponse(material);
    }

    @Override
    @Transactional
    @CacheEvict(value = "materials", allEntries = true)
    public MaterialResponse createMaterial(MaterialRequest request) {
        if (materialRepository.findByNombreIgnoreCase(request.nombre()).isPresent()) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Ya existe un material con el nombre: " + request.nombre());
        }

        UUID catUuid = parseUuid(request.categoriaId());
        MaterialCategory category = materialCategoryRepository.findById(catUuid)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Categoría de material no encontrada: " + request.categoriaId()));

        Material material = new Material();
        updateMaterialFields(material, request, category);

        Material saved = materialRepository.save(material);
        return mapToResponse(saved);
    }

    @Override
    @Transactional
    @CacheEvict(value = "materials", allEntries = true)
    public MaterialResponse updateMaterial(UUID id, MaterialRequest request) {
        Material material = materialRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Material no encontrado"));

        materialRepository.findByNombreIgnoreCase(request.nombre())
                .ifPresent(existing -> {
                    if (!existing.getId().equals(id)) {
                        throw new ResponseStatusException(HttpStatus.CONFLICT, "Ya existe otro material con el nombre: " + request.nombre());
                    }
                });

        UUID catUuid = parseUuid(request.categoriaId());
        MaterialCategory category = materialCategoryRepository.findById(catUuid)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Categoría de material no encontrada: " + request.categoriaId()));

        updateMaterialFields(material, request, category);

        Material saved = materialRepository.save(material);
        return mapToResponse(saved);
    }

    private UUID parseUuid(String uuidStr) {
        if (uuidStr == null || uuidStr.isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "La categoría del material es obligatoria");
        }
        try {
            return UUID.fromString(uuidStr);
        } catch (IllegalArgumentException e) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "ID de categoría con formato inválido: " + uuidStr);
        }
    }

    @Override
    @Transactional
    @CacheEvict(value = "materials", allEntries = true)
    public void deleteMaterial(UUID id) {
        if (!materialRepository.existsById(id)) {
            throw new RuntimeException("Material no encontrado");
        }
        materialRepository.deleteById(id);
    }

    private void updateMaterialFields(Material material, MaterialRequest request, MaterialCategory category) {
        material.setNombre(request.nombre().trim());
        material.setUnidad(request.unidad().trim());
        material.setCostoCompra(request.costoCompra());
        material.setCostoVenta(request.costoVenta());
        material.setStockActual(request.stockActual());
        material.setCategoria(category);
        material.setProveedor(request.proveedor() != null ? request.proveedor().trim() : null);
        material.setActivo(request.activo() != null && request.activo());
    }

    private MaterialResponse mapToResponse(Material material) {
        String catId = null;
        String catNombre = null;
        if (material.getCategoria() != null) {
            catId = material.getCategoria().getId().toString();
            catNombre = material.getCategoria().getNombre();
        }
        return new MaterialResponse(
            material.getId(),
            material.getNombre(),
            material.getUnidad(),
            material.getCostoCompra(),
            material.getCostoVenta(),
            material.getStockActual(),
            catId,
            catNombre,
            material.getProveedor(),
            material.getActivo()
        );
    }
}
