package com.amazonas.backend.modules.categories.controller;

import java.util.List;
import java.util.stream.Collectors;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.amazonas.backend.modules.categories.dto.CategoryResponse;
import com.amazonas.backend.modules.categories.repository.CategoryRepository;

import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/api/categories")
@RequiredArgsConstructor
public class CategoryController {

    private final CategoryRepository categoryRepository;

    @GetMapping
    public ResponseEntity<List<CategoryResponse>> getCategories() {
        List<CategoryResponse> categories = categoryRepository.findAllByOrderByOrdenAsc()
                .stream()
                .map(c -> new CategoryResponse(c.getId(), c.getNombre(), c.getDescripcion(), c.getOrden()))
                .collect(Collectors.toList());
        return ResponseEntity.ok(categories);
    }
}
