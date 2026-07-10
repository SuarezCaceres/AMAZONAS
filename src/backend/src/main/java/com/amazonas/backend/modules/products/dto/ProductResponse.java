package com.amazonas.backend.modules.products.dto;

import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;

public record ProductResponse(
    UUID id,
    String titulo,
    String descripcion,
    String descripcionDetallada,
    String imageUrl,
    String categoriaId,
    String categoriaNombre,
    List<String> materiales,
    List<ProductMaterialDetail> materialesDetalle,
    String gradoEscolar,
    List<String> ocasion,
    List<String> caracteristicas,
    Boolean materialesReciclables,
    Integer stock,
    List<RelatedProduct> relacionados
) {
    public record ProductMaterialDetail(
        UUID materialId,
        String nombre,
        String unidad,
        BigDecimal costoVenta,
        BigDecimal cantidadSugerida,
        Boolean esOpcional,
        String notas,
        String categoriaMaterial,
        String proveedor,
        Integer stockActual
    ) {}

    public record RelatedProduct(
        UUID id,
        String titulo,
        String imageUrl
    ) {}
}
