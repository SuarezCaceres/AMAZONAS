package com.amazonas.backend.modules.products.controller;

import org.springframework.http.ResponseEntity;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.amazonas.backend.modules.products.dto.SearchIntentRequest;
import com.amazonas.backend.modules.products.dto.SearchIntentResponse;
import com.amazonas.backend.modules.products.service.SearchIntentService;

import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/api/products")
@RequiredArgsConstructor
@Validated
public class SearchIntentController {

    private final SearchIntentService searchIntentService;

    @PostMapping("/classify-intent")
    public ResponseEntity<SearchIntentResponse> classifyIntent(
            @RequestBody @Validated SearchIntentRequest request
    ) {
        SearchIntentResponse response = searchIntentService.classifyIntent(request.getQuery());
        return ResponseEntity.ok(response);
    }
}
