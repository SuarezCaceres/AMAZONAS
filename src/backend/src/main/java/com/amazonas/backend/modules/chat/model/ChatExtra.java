package com.amazonas.backend.modules.chat.model;

import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.UUID;

/**
 * Servicio o ítem adicional negociado en el chat.
 * Por ejemplo: "Servicio de explicación", "Delivery", "Embalaje especial".
 * Puede ser propuesto por el vendedor y aceptado/rechazado por el cliente.
 */
@Entity
@Table(name = "chat_extras")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ChatExtra {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    /** Sala de chat a la que pertenece este extra */
    @Column(name = "room_id", nullable = false)
    private UUID roomId;

    /** Nombre del servicio/extra (ej: "Servicio de explicación educativa") */
    @Column(nullable = false, length = 200)
    private String nombre;

    /** Descripción detallada del extra */
    @Column(columnDefinition = "TEXT")
    private String descripcion;

    /** Precio del extra */
    @Column(nullable = false, precision = 10, scale = 2)
    private BigDecimal precio;

    /**
     * Estado de aceptación:
     * null = pendiente de respuesta del cliente
     * true = aceptado
     * false = rechazado
     */
    private Boolean aceptado;

    @Column(name = "created_at", nullable = false, updatable = false)
    @Builder.Default
    private OffsetDateTime createdAt = OffsetDateTime.now();

    @Column(name = "updated_at", nullable = false)
    @Builder.Default
    private OffsetDateTime updatedAt = OffsetDateTime.now();

    @PreUpdate
    protected void onUpdate() {
        this.updatedAt = OffsetDateTime.now();
    }
}
