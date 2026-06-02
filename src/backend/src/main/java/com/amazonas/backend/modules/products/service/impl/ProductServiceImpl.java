package com.amazonas.backend.modules.products.service.impl;

import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.amazonas.backend.modules.categories.model.Category;
import com.amazonas.backend.modules.categories.repository.CategoryRepository;
import com.amazonas.backend.modules.products.dto.ProductRequest;
import com.amazonas.backend.modules.products.dto.ProductResponse;
import com.amazonas.backend.modules.products.model.Product;
import com.amazonas.backend.modules.products.model.ProductMaterial;
import com.amazonas.backend.modules.products.repository.ProductRepository;
import com.amazonas.backend.modules.products.service.ProductService;
import com.amazonas.backend.modules.materials.model.Material;
import com.amazonas.backend.modules.materials.repository.MaterialRepository;

import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class ProductServiceImpl implements ProductService {

    private final ProductRepository productRepository;
    private final CategoryRepository categoryRepository;
    private final MaterialRepository materialRepository;

    @Override
    @Transactional(readOnly = true)
    public Page<ProductResponse> getProducts(String category, String search, Pageable pageable) {
        // Normalizamos parámetros vacíos y convertimos la categoría a su formato slug/ID
        String categoryParam = (category == null || category.trim().isEmpty()) ? null : slugify(category.trim());
        String searchParam = (search == null || search.trim().isEmpty()) ? null : search;

        Page<Product> productPage = productRepository.searchProducts(categoryParam, searchParam, pageable);
        return productPage.map(this::mapToResponseSummary);
    }

    @Override
    @Transactional(readOnly = true)
    public ProductResponse getProductById(UUID id) {
        Product product = productRepository.findByIdWithDetails(id)
                .orElseThrow(() -> new RuntimeException("Producto no encontrado"));

        ProductResponse response = mapToResponseDetail(product);

        // Buscar productos relacionados (de la misma categoría, limitado a 4)
        List<Product> related = productRepository.findRelatedProducts(
                product.getCategoria().getId(),
                product.getId(),
                PageRequest.of(0, 4));

        List<ProductResponse.RelatedProduct> relatedResponses = related.stream()
                .map(p -> new ProductResponse.RelatedProduct(p.getId(), p.getTitulo(), p.getImageUrl()))
                .collect(Collectors.toList());

        response.setRelacionados(relatedResponses);
        return response;
    }

    @Override
    @Transactional
    public ProductResponse createProduct(ProductRequest request) {
        Product product = new Product();
        updateProductFields(product, request);

        Product savedProduct = productRepository.save(product);
        return mapToResponseDetail(savedProduct);
    }

    @Override
    @Transactional
    public ProductResponse updateProduct(UUID id, ProductRequest request) {
        Product product = productRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Producto no encontrado"));

        updateProductFields(product, request);

        Product savedProduct = productRepository.save(product);
        return mapToResponseDetail(savedProduct);
    }

    @Override
    @Transactional
    public void deleteProduct(UUID id) {
        if (!productRepository.existsById(id)) {
            throw new RuntimeException("Producto no encontrado");
        }
        productRepository.deleteById(id); // Hará soft delete automáticamente gracias a @SQLDelete
    }

    // ===================================
    // PRIVATE HELPER METHODS
    // ===================================

    private void updateProductFields(Product product, ProductRequest request) {
        product.setTitulo(request.getTitulo());
        product.setDescripcion(request.getDescripcion());
        product.setDescripcionDetallada(request.getDescripcionDetallada());

        // Categoria auto-creacion/resolucion
        Category category = resolveCategory(request.getCategoriaId());
        product.setCategoria(category);

        product.setImageUrl(request.getImageUrl());

        // Grado escolar normalizacion
        if (request.getGradoEscolar() != null) {
            product.setGradoEscolar(request.getGradoEscolar().trim().toUpperCase());
        } else {
            product.setGradoEscolar(null);
        }

        // Ocasion normalizacion
        if (request.getOcasion() != null) {
            List<String> normalizedOcasion = request.getOcasion().stream()
                    .filter(o -> o != null && !o.trim().isEmpty())
                    .map(o -> toTitleCase(o.trim()))
                    .collect(Collectors.toList());
            product.setOcasion(normalizedOcasion);
        } else {
            product.setOcasion(null);
        }

        // Caracteristicas normalizacion
        if (request.getCaracteristicas() != null) {
            List<String> normalizedCaracteristicas = request.getCaracteristicas().stream()
                    .filter(c -> c != null && !c.trim().isEmpty())
                    .map(String::trim)
                    .collect(Collectors.toList());
            product.setCaracteristicas(normalizedCaracteristicas.isEmpty() ? null : normalizedCaracteristicas);
        } else {
            product.setCaracteristicas(null);
        }

        product.setMaterialesReciclables(
                request.getMaterialesReciclables() != null && request.getMaterialesReciclables());
        product.setStock(request.getStock());

        // ProductMaterial update
        if (product.getMateriales() == null) {
            product.setMateriales(new ArrayList<>());
        } else {
            product.getMateriales().clear();
        }

        if (request.getMateriales() != null) {
            for (ProductRequest.ProductMaterialInput input : request.getMateriales()) {
                if (input.getNombre() == null || input.getNombre().trim().isEmpty()) {
                    continue;
                }
                Material material = materialRepository.findByNombreIgnoreCase(input.getNombre().trim())
                        .orElseThrow(() -> new RuntimeException(
                                "Material no encontrado en inventario: " + input.getNombre()));

                ProductMaterial pm = new ProductMaterial(
                        product,
                        material,
                        input.getCantidadSugerida() != null ? input.getCantidadSugerida() : java.math.BigDecimal.ONE,
                        input.getEsOpcional() != null ? input.getEsOpcional() : false,
                        input.getNotas());
                product.getMateriales().add(pm);
            }
        }
    }

    private Category resolveCategory(String categoryInput) {
        if (categoryInput == null || categoryInput.trim().isEmpty()) {
            throw new RuntimeException("La categoría es obligatoria");
        }

        String input = categoryInput.trim();

        // 1. Intentar buscar por ID/Slug exacto
        Category category = categoryRepository.findById(input).orElse(null);
        if (category != null) {
            return category;
        }

        // 2. Intentar buscar por nombre exacto (case-insensitive)
        category = categoryRepository.findByNombreIgnoreCase(input).orElse(null);
        if (category != null) {
            return category;
        }

        // 3. Si no existe, determinar ID y Nombre para auto-creación
        String nombre;
        String id;

        if (input.contains("-") && !input.contains(" ")) {
            // Parece un slug: "manualidades-creativas"
            nombre = toTitleCase(input.replace("-", " "));
            id = input;
        } else {
            // Parece un nombre normal: "Manualidades Creativas"
            nombre = toTitleCase(input);
            id = slugify(input);
        }

        // Validar de nuevo por las dudas tras formatear
        category = categoryRepository.findById(id).orElse(null);
        if (category != null) {
            return category;
        }

        category = categoryRepository.findByNombreIgnoreCase(nombre).orElse(null);
        if (category != null) {
            return category;
        }

        // Crear nueva categoría
        Category newCategory = new Category();
        newCategory.setId(id);
        newCategory.setNombre(nombre);
        newCategory.setDescripcion("Categoría auto-creada para " + nombre);
        newCategory.setOrden(0);

        return categoryRepository.save(newCategory);
    }

    private String slugify(String input) {
        if (input == null)
            return null;
        String normalized = java.text.Normalizer.normalize(input, java.text.Normalizer.Form.NFD);
        return normalized.replaceAll("\\p{InCombiningDiacriticalMarks}+", "")
                .toLowerCase()
                .replaceAll("[^a-z0-9\\s-]", "")
                .replaceAll("\\s+", "-")
                .replaceAll("-+", "-")
                .replaceAll("^-|-$", "");
    }

    private String toTitleCase(String input) {
        if (input == null || input.isBlank())
            return input;
        return java.util.Arrays.stream(input.trim().split("\\s+"))
                .map(word -> word.isEmpty() ? ""
                        : Character.toUpperCase(word.charAt(0)) + word.substring(1).toLowerCase())
                .collect(Collectors.joining(" "));
    }

    private ProductResponse mapToResponseSummary(Product product) {
        ProductResponse response = new ProductResponse();
        response.setId(product.getId());
        response.setTitulo(product.getTitulo());
        response.setDescripcion(product.getDescripcion());
        response.setImageUrl(product.getImageUrl());
        response.setGradoEscolar(product.getGradoEscolar());
        response.setMaterialesReciclables(product.getMaterialesReciclables());
        response.setOcasion(product.getOcasion());
        response.setCaracteristicas(product.getCaracteristicas());
        if (product.getCategoria() != null) {
            response.setCategoriaId(product.getCategoria().getId());
            response.setCategoriaNombre(product.getCategoria().getNombre());
        }

        if (product.getMateriales() != null) {
            List<String> materialNames = product.getMateriales().stream()
                    .map(pm -> pm.getMaterial().getNombre())
                    .collect(Collectors.toList());
            response.setMateriales(materialNames);
        } else {
            response.setMateriales(new ArrayList<>());
        }

        response.setStock(product.getStock());

        return response;
    }

    private ProductResponse mapToResponseDetail(Product product) {
        ProductResponse response = mapToResponseSummary(product);
        response.setDescripcionDetallada(product.getDescripcionDetallada());
        response.setStock(product.getStock());

        if (product.getMateriales() != null) {
            List<ProductResponse.ProductMaterialDetail> detailList = product.getMateriales().stream()
                    .map(pm -> {
                        ProductResponse.ProductMaterialDetail detail = new ProductResponse.ProductMaterialDetail();
                        Material m = pm.getMaterial();
                        detail.setMaterialId(m.getId());
                        detail.setNombre(m.getNombre());
                        detail.setUnidad(m.getUnidad());
                        detail.setCostoVenta(m.getCostoVenta());
                        detail.setCantidadSugerida(pm.getCantidadSugerida());
                        detail.setEsOpcional(pm.getEsOpcional());
                        detail.setNotas(pm.getNotas());
                        detail.setProveedor(m.getProveedor());
                        detail.setStockActual(m.getStockActual());
                        if (m.getCategoria() != null) {
                            detail.setCategoriaMaterial(m.getCategoria().getNombre());
                        }
                        return detail;
                    })
                    .collect(Collectors.toList());
            response.setMaterialesDetalle(detailList);
        } else {
            response.setMaterialesDetalle(new ArrayList<>());
        }

        return response;
    }
}
