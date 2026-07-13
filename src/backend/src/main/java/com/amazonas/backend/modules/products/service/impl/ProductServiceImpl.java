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

        // Buscar productos relacionados (de la misma categoría, limitado a 4)
        List<Product> related = productRepository.findRelatedProducts(
                product.getCategoria().getId(),
                product.getId(),
                PageRequest.of(0, 4));

        List<ProductResponse.RelatedProduct> relatedResponses = related.stream()
                .map(p -> new ProductResponse.RelatedProduct(p.getId(), p.getTitulo(), p.getImageUrl()))
                .collect(Collectors.toList());

        return mapToResponse(product, relatedResponses);
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
        product.setTitulo(request.titulo());
        product.setDescripcion(request.descripcion());
        product.setDescripcionDetallada(request.descripcionDetallada());

        // Categoria auto-creacion/resolucion
        Category category = resolveCategory(request.categoriaId());
        product.setCategoria(category);

        product.setImageUrl(request.imageUrl());

        // Grado escolar normalizacion
        if (request.gradoEscolar() != null) {
            product.setGradoEscolar(request.gradoEscolar().trim().toUpperCase());
        } else {
            product.setGradoEscolar(null);
        }

        // Ocasion normalizacion
        if (request.ocasion() != null) {
            List<String> normalizedOcasion = request.ocasion().stream()
                    .filter(o -> o != null && !o.trim().isEmpty())
                    .map(o -> toTitleCase(o.trim()))
                    .collect(Collectors.toList());
            product.setOcasion(normalizedOcasion);
        } else {
            product.setOcasion(null);
        }

        // Caracteristicas normalizacion
        if (request.caracteristicas() != null) {
            List<String> normalizedCaracteristicas = request.caracteristicas().stream()
                    .filter(c -> c != null && !c.trim().isEmpty())
                    .map(String::trim)
                    .collect(Collectors.toList());
            product.setCaracteristicas(normalizedCaracteristicas.isEmpty() ? null : normalizedCaracteristicas);
        } else {
            product.setCaracteristicas(null);
        }

        product.setMaterialesReciclables(
                request.materialesReciclables() != null && request.materialesReciclables());
        product.setStock(request.stock());

        // ProductMaterial update (Fix: Merge collection to avoid Hibernate duplicate key constraint)
        if (product.getMateriales() == null) {
            product.setMateriales(new ArrayList<>());
        }

        List<ProductMaterial> existingMaterials = product.getMateriales();

        if (request.materiales() == null || request.materiales().isEmpty()) {
            existingMaterials.clear();
        } else {
            // 1. Eliminar los materiales que ya no están en el request
            List<String> requestedMaterialNames = request.materiales().stream()
                    .filter(m -> m.nombre() != null)
                    .map(m -> m.nombre().trim().toLowerCase())
                    .collect(Collectors.toList());

            existingMaterials.removeIf(pm -> !requestedMaterialNames.contains(pm.getMaterial().getNombre().toLowerCase()));

            // 2. Actualizar los existentes o agregar los nuevos
            for (ProductRequest.ProductMaterialInput input : request.materiales()) {
                if (input.nombre() == null || input.nombre().trim().isEmpty()) {
                    continue;
                }
                String normalizedName = input.nombre().trim();

                Material material = materialRepository.findByNombreIgnoreCase(normalizedName)
                        .orElseThrow(() -> new RuntimeException(
                                "Material no encontrado en inventario: " + input.nombre()));

                // Buscar si este material ya está vinculado al producto
                ProductMaterial existingPm = existingMaterials.stream()
                        .filter(pm -> pm.getMaterial().getId().equals(material.getId()))
                        .findFirst()
                        .orElse(null);

                if (existingPm != null) {
                    // Si ya existe, solo actualizamos sus valores sugeridos
                    existingPm.setCantidadSugerida(input.cantidadSugerida() != null ? input.cantidadSugerida() : java.math.BigDecimal.ONE);
                    existingPm.setEsOpcional(input.esOpcional() != null ? input.esOpcional() : false);
                    existingPm.setNotas(input.notas());
                } else {
                    // Si es nuevo, lo agregamos
                    ProductMaterial pm = new ProductMaterial(
                            product,
                            material,
                            input.cantidadSugerida() != null ? input.cantidadSugerida() : java.math.BigDecimal.ONE,
                            input.esOpcional() != null ? input.esOpcional() : false,
                            input.notas());
                    existingMaterials.add(pm);
                }
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
        return mapToResponse(product, null);
    }

    private ProductResponse mapToResponseDetail(Product product) {
        return mapToResponse(product, null);
    }

    private ProductResponse mapToResponse(Product product, List<ProductResponse.RelatedProduct> relacionados) {
        String catId = null;
        String catNombre = null;
        if (product.getCategoria() != null) {
            catId = product.getCategoria().getId();
            catNombre = product.getCategoria().getNombre();
        }

        List<String> materiales = new ArrayList<>();
        List<ProductResponse.ProductMaterialDetail> materialesDetalle = new ArrayList<>();
        if (product.getMateriales() != null) {
            for (ProductMaterial pm : product.getMateriales()) {
                Material m = pm.getMaterial();
                materiales.add(m.getNombre());

                String catMaterialStr = null;
                if (m.getCategoria() != null) {
                    catMaterialStr = m.getCategoria().getNombre();
                }

                materialesDetalle.add(new ProductResponse.ProductMaterialDetail(
                    m.getId(),
                    m.getNombre(),
                    m.getUnidad(),
                    m.getCostoVenta(),
                    pm.getCantidadSugerida(),
                    pm.getEsOpcional(),
                    pm.getNotas(),
                    catMaterialStr,
                    m.getProveedor(),
                    m.getStockActual()
                ));
            }
        }

        return new ProductResponse(
            product.getId(),
            product.getTitulo(),
            product.getDescripcion(),
            product.getDescripcionDetallada(),
            product.getImageUrl(),
            catId,
            catNombre,
            materiales,
            materialesDetalle,
            product.getGradoEscolar(),
            product.getOcasion(),
            product.getCaracteristicas(),
            product.getMaterialesReciclables(),
            product.getStock(),
            relacionados
        );
    }
}
