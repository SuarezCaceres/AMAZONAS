package com.amazonas.backend.modules.chat.model;

import com.amazonas.backend.modules.chat.enums.ChatMessageType;
import com.amazonas.backend.modules.chat.enums.ChatSenderRole;
import jakarta.persistence.*;
import lombok.*;

import java.time.OffsetDateTime;
import java.util.UUID;

/**
 * Mensaje individual dentro de una sala de chat.
 * Soporta múltiples tipos: texto, ofertas, presupuestos, archivos y vouchers.
 * El contenido siempre llega sanitizado (OWASP) antes de guardarse.
 */
@Entity
@Table(name = "chat_messages")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ChatMessage {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    /** Sala a la que pertenece este mensaje */
    @Column(name = "room_id", nullable = false)
    private UUID roomId;

    /** ID del usuario o vendedor que envió el mensaje */
    @Column(name = "sender_id", nullable = false)
    private UUID senderId;

    /** Rol del remitente (CLIENT, VENDOR, SYSTEM) */
    @Enumerated(EnumType.STRING)
    @Column(name = "sender_role", nullable = false, length = 10)
    private ChatSenderRole senderRole;

    /** Tipo de mensaje para renderizado condicional en el frontend */
    @Enumerated(EnumType.STRING)
    @Column(name = "message_type", nullable = false, length = 10)
    @Builder.Default
    private ChatMessageType messageType = ChatMessageType.TEXT;

    /** Contenido de texto del mensaje (sanitizado XSS) */
    @Column(nullable = false, columnDefinition = "TEXT")
    private String content;

    /**
     * Metadatos adicionales según el tipo de mensaje.
     * Ejemplos:
     *  - OFFER:   { "offerId": "uuid", "proposedPrice": 250.00 }
     *  - BUDGET:  { "budgetId": "uuid", "totalAmount": 350.00 }
     *  - FILE:    { "fileUrl": "https://...", "fileName": "diseño.pdf" }
     *  - VOUCHER: { "voucherUrl": "https://...", "paymentMethod": "YAPE" }
     */
    @org.hibernate.annotations.JdbcTypeCode(org.hibernate.type.SqlTypes.JSON)
    @Column(columnDefinition = "jsonb")
    private String metadata;

    /** Si el mensaje fue leído por el destinatario */
    @Column(name = "is_read", nullable = false)
    @Builder.Default
    private boolean isRead = false;

    @Column(name = "sent_at", nullable = false, updatable = false)
    @Builder.Default
    private OffsetDateTime sentAt = OffsetDateTime.now();
}
