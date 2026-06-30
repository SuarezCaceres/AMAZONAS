package com.amazonas.backend.modules.chat.repository;

import com.amazonas.backend.modules.chat.model.ChatMessage;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;

@Repository
public interface ChatMessageRepository extends JpaRepository<ChatMessage, UUID> {

    /**
     * Carga los mensajes más recientes de una sala (cursor-based pagination).
     * El frontend envía el sentAt del último mensaje cargado para obtener los anteriores.
     */
    @Query("SELECT m FROM ChatMessage m WHERE m.roomId = :roomId AND m.sentAt < :before ORDER BY m.sentAt DESC")
    List<ChatMessage> findByRoomIdBefore(
            @Param("roomId") UUID roomId,
            @Param("before") OffsetDateTime before,
            Pageable pageable
    );

    /** Carga los primeros N mensajes de una sala (carga inicial) */
    List<ChatMessage> findByRoomIdOrderBySentAtDesc(UUID roomId, Pageable pageable);

    /** Cuenta los mensajes no leídos en una sala para un rol específico */
    @Query("SELECT COUNT(m) FROM ChatMessage m WHERE m.roomId = :roomId AND m.isRead = false AND m.senderRole <> :senderRole")
    long countUnread(@Param("roomId") UUID roomId, @Param("senderRole") com.amazonas.backend.modules.chat.enums.ChatSenderRole senderRole);

    /** Marca todos los mensajes de una sala como leídos para el destinatario */
    @Modifying
    @Query("UPDATE ChatMessage m SET m.isRead = true WHERE m.roomId = :roomId AND m.senderRole = :senderRole")
    void markAllAsRead(@Param("roomId") UUID roomId, @Param("senderRole") com.amazonas.backend.modules.chat.enums.ChatSenderRole senderRole);
}
