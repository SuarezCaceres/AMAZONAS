package com.amazonas.backend.modules.materials.controller;

import java.util.List;
import java.util.UUID;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.amazonas.backend.modules.materials.dto.MaterialRequest;
import com.amazonas.backend.modules.materials.dto.MaterialResponse;
import com.amazonas.backend.modules.materials.model.MaterialCategory;
import com.amazonas.backend.modules.materials.repository.MaterialCategoryRepository;
import com.amazonas.backend.modules.materials.service.MaterialService;

import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/api/admin")
@RequiredArgsConstructor
@Validated
public class MaterialController {

    private final MaterialService materialService;
    private final MaterialCategoryRepository materialCategoryRepository;

    @GetMapping("/materials")
    public ResponseEntity<List<MaterialResponse>> getAllMaterials() {
        return ResponseEntity.ok(materialService.getAllMaterials());
    }

    @GetMapping("/materials/{id}")
    public ResponseEntity<MaterialResponse> getMaterialById(@PathVariable UUID id) {
        return ResponseEntity.ok(materialService.getMaterialById(id));
    }

    @PostMapping("/materials")
    public ResponseEntity<MaterialResponse> createMaterial(
            @RequestBody @Validated MaterialRequest request
    ) {
        MaterialResponse created = materialService.createMaterial(request);
        return ResponseEntity.status(HttpStatus.CREATED).body(created);
    }

    @PutMapping("/materials/{id}")
    public ResponseEntity<MaterialResponse> updateMaterial(
            @PathVariable UUID id,
            @RequestBody @Validated MaterialRequest request
    ) {
        MaterialResponse updated = materialService.updateMaterial(id, request);
        return ResponseEntity.ok(updated);
    }

    @DeleteMapping("/materials/{id}")
    public ResponseEntity<Void> deleteMaterial(@PathVariable UUID id) {
        materialService.deleteMaterial(id);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/material-categories")
    public ResponseEntity<List<MaterialCategory>> getAllMaterialCategories() {
        return ResponseEntity.ok(materialCategoryRepository.findAll());
    }
}
