package com.amazonas.backend.modules.materials.dto;

import java.io.Serializable;
import java.math.BigDecimal;
import java.util.UUID;

public record MaterialResponse(
    UUID id,
    String nombre,
    String unidad,
    BigDecimal costoCompra,
    BigDecimal costoVenta,
    Integer stockActual,
    String categoriaId,
    String categoriaNombre,
    String proveedor,
    Boolean activo
) implements Serializable {
    private static final long serialVersionUID = 1L;
}
