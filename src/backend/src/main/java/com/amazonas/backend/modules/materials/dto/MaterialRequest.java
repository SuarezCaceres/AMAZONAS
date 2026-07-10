package com.amazonas.backend.modules.materials.dto;

import java.math.BigDecimal;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public record MaterialRequest(
    @NotBlank(message = "El nombre es obligatorio")
    @Size(max = 100, message = "El nombre debe tener como máximo 100 caracteres")
    String nombre,

    @NotBlank(message = "La unidad es obligatoria")
    @Size(max = 20, message = "La unidad debe tener como máximo 20 caracteres")
    String unidad,

    @NotNull(message = "El costo de compra es obligatorio")
    @DecimalMin(value = "0.0", message = "El costo de compra no puede ser negativo")
    BigDecimal costoCompra,

    @NotNull(message = "El costo de venta es obligatorio")
    @DecimalMin(value = "0.0", message = "El costo de venta no puede ser negativo")
    BigDecimal costoVenta,

    @NotNull(message = "El stock actual es obligatorio")
    @Min(value = 0, message = "El stock actual no puede ser negativo")
    Integer stockActual,

    @NotBlank(message = "La categoría del material es obligatoria")
    String categoriaId,

    String proveedor,

    Boolean activo
) {
    // Constructor para definir un valor por defecto de "activo" similar a la clase original
    public MaterialRequest {
        if (activo == null) {
            activo = true;
        }
    }
}
