package com.amazonas.backend.modules.chat.model;

import com.amazonas.backend.modules.chat.enums.ChatRoomStatus;
import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.UUID;

/**
 * Sala de chat entre un cliente y un vendedor.
 * Una sala se crea automáticamente por cada solicitud de compra (purchase_request).
 * Toda la negociación de precios y mensajes ocurre dentro de esta sala.
 */
@Entity
@Table(name = "chat_rooms")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ChatRoom {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    /** ID de la solicitud de compra asociada (una solicitud → una sala) */
    @Column(name = "request_id", nullable = false, unique = true)
    private UUID requestId;

    /** ID del cliente que inició la solicitud */
    @Column(name = "client_id", nullable = false)
    private UUID clientId;

    /** ID del vendedor asignado a esta sala */
    @Column(name = "vendor_id", nullable = false)
    private UUID vendorId;

    /** Estado actual de la negociación */
    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    @Builder.Default
    private ChatRoomStatus status = ChatRoomStatus.ACTIVE;

    /** Precio final acordado (se registra al aceptar una oferta) */
    @Column(name = "agreed_price", precision = 10, scale = 2)
    private BigDecimal agreedPrice;

    /** Timestamp del último mensaje (para ordenar lista de salas) */
    @Column(name = "last_message_at")
    private OffsetDateTime lastMessageAt;

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
