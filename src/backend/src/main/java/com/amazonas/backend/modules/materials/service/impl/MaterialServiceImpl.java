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
                .orElseThrow(() -> new RuntimeException("Material no encontrado"));
        return mapToResponse(material);
    }

    @Override
    @Transactional
    @CacheEvict(value = "materials", allEntries = true)
    public MaterialResponse createMaterial(MaterialRequest request) {
        if (materialRepository.findByNombreIgnoreCase(request.getNombre()).isPresent()) {
            throw new RuntimeException("Ya existe un material con el nombre: " + request.getNombre());
        }

        MaterialCategory category = materialCategoryRepository
                .findById(UUID.fromString(request.getCategoriaId()))
                .orElseThrow(() -> new RuntimeException("Categoría de material no encontrada: " + request.getCategoriaId()));

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
                .orElseThrow(() -> new RuntimeException("Material no encontrado"));

        materialRepository.findByNombreIgnoreCase(request.getNombre())
                .ifPresent(existing -> {
                    if (!existing.getId().equals(id)) {
                        throw new RuntimeException("Ya existe otro material con el nombre: " + request.getNombre());
                    }
                });

        MaterialCategory category = materialCategoryRepository
                .findById(UUID.fromString(request.getCategoriaId()))
                .orElseThrow(() -> new RuntimeException("Categoría de material no encontrada: " + request.getCategoriaId()));

        updateMaterialFields(material, request, category);

        Material saved = materialRepository.save(material);
        return mapToResponse(saved);
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
        material.setNombre(request.getNombre().trim());
        material.setUnidad(request.getUnidad().trim());
        material.setCostoCompra(request.getCostoCompra());
        material.setCostoVenta(request.getCostoVenta());
        material.setStockActual(request.getStockActual());
        material.setCategoria(category);
        material.setProveedor(request.getProveedor() != null ? request.getProveedor().trim() : null);
        material.setActivo(request.getActivo() != null && request.getActivo());
    }

    private MaterialResponse mapToResponse(Material material) {
        MaterialResponse response = new MaterialResponse();
        response.setId(material.getId());
        response.setNombre(material.getNombre());
        response.setUnidad(material.getUnidad());
        response.setCostoCompra(material.getCostoCompra());
        response.setCostoVenta(material.getCostoVenta());
        response.setStockActual(material.getStockActual());
        response.setProveedor(material.getProveedor());
        response.setActivo(material.getActivo());
        if (material.getCategoria() != null) {
            response.setCategoriaId(material.getCategoria().getId().toString());
            response.setCategoriaNombre(material.getCategoria().getNombre());
        }
        return response;
    }
}
