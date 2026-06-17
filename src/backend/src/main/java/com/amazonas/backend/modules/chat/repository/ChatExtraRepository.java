package com.amazonas.backend.modules.chat.repository;

import com.amazonas.backend.modules.chat.model.ChatExtra;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface ChatExtraRepository extends JpaRepository<ChatExtra, UUID> {

    /** Obtiene todos los extras de una sala */
    List<ChatExtra> findByRoomIdOrderByCreatedAtDesc(UUID roomId);

    /** Obtiene los extras pendientes (aún no respondidos) */
    List<ChatExtra> findByRoomIdAndAceptadoIsNull(UUID roomId);
}
