package com.amazonas.backend.modules.products.dto;

import java.math.BigDecimal;
import java.util.List;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public record ProductRequest(
    @NotBlank(message = "El título es obligatorio")
    @Size(max = 200, message = "El título debe tener como máximo 200 caracteres")
    String titulo,

    String descripcion,

    String descripcionDetallada,

    @NotBlank(message = "La categoría es obligatoria")
    String categoriaId,

    @Size(max = 500, message = "La URL de la imagen debe tener como máximo 500 caracteres")
    String imageUrl,

    List<ProductMaterialInput> materiales,

    @Size(max = 50)
    String gradoEscolar,

    List<String> ocasion,

    List<String> caracteristicas,

    Boolean materialesReciclables,

    @NotNull(message = "El stock es obligatorio")
    @Min(value = 0, message = "El stock no puede ser negativo")
    Integer stock
) {
    public ProductRequest {
        if (materialesReciclables == null) {
            materialesReciclables = false;
        }
        if (stock == null) {
            stock = 0;
        }
    }

    public record ProductMaterialInput(
        @NotBlank(message = "El nombre del material es obligatorio")
        String nombre,

        BigDecimal cantidadSugerida,

        Boolean esOpcional,

        String notas
    ) {
        public ProductMaterialInput {
            if (cantidadSugerida == null) {
                cantidadSugerida = BigDecimal.ONE;
            }
            if (esOpcional == null) {
                esOpcional = false;
            }
        }
    }
}
