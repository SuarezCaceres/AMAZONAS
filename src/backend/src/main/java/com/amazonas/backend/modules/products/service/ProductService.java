package com.amazonas.backend.modules.products.service;

import java.util.UUID;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

import com.amazonas.backend.modules.products.dto.ProductRequest;
import com.amazonas.backend.modules.products.dto.ProductResponse;

public interface ProductService {

    Page<ProductResponse> getProducts(String category, String search, Pageable pageable);

    ProductResponse getProductById(UUID id);

    ProductResponse createProduct(ProductRequest request);

    ProductResponse updateProduct(UUID id, ProductRequest request);

    void deleteProduct(UUID id);
}
