package com.amazonas.backend.modules.chat.model;

import com.amazonas.backend.modules.chat.enums.ChatOfferStatus;
import com.amazonas.backend.modules.chat.enums.ChatSenderRole;
import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.UUID;

/**
 * Oferta de precio propuesta durante la negociación en el chat.
 * Una oferta puede ser creada por el cliente o el vendedor.
 * Solo puede haber UNA oferta PENDING activa por sala a la vez.
 */
@Entity
@Table(name = "chat_offers")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ChatOffer {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    /** Sala de chat en la que se propone esta oferta */
    @Column(name = "room_id", nullable = false)
    private UUID roomId;

    /** Mensaje del chat que contiene esta oferta (puede ser null si se generó automáticamente) */
    @Column(name = "message_id")
    private UUID messageId;

    /** ID del usuario o vendedor que propone el precio */
    @Column(name = "proposer_id", nullable = false)
    private UUID proposerId;

    /** Rol del proponente */
    @Enumerated(EnumType.STRING)
    @Column(name = "proposer_role", nullable = false, length = 10)
    private ChatSenderRole proposerRole;

    /** Precio propuesto en la oferta */
    @Column(name = "proposed_price", nullable = false, precision = 10, scale = 2)
    private BigDecimal proposedPrice;

    /** Nota opcional que acompaña la oferta (ej: "Incluye envío") */
    @Column(columnDefinition = "TEXT")
    private String note;

    /** Estado actual de la oferta */
    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 15)
    @Builder.Default
    private ChatOfferStatus status = ChatOfferStatus.PENDING;

    /** Cuándo fue respondida la oferta */
    @Column(name = "responded_at")
    private OffsetDateTime respondedAt;

    /** Fecha de expiración opcional de la oferta */
    @Column(name = "expires_at")
    private OffsetDateTime expiresAt;

    @Column(name = "created_at", nullable = false, updatable = false)
    @Builder.Default
    private OffsetDateTime createdAt = OffsetDateTime.now();
}
