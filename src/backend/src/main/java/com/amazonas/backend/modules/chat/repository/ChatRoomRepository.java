package com.amazonas.backend.modules.chat.repository;

import com.amazonas.backend.modules.chat.enums.ChatRoomStatus;
import com.amazonas.backend.modules.chat.model.ChatRoom;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface ChatRoomRepository extends JpaRepository<ChatRoom, UUID> {

    /** Busca la sala de chat de una solicitud específica */
    Optional<ChatRoom> findByRequestId(UUID requestId);

    /** Lista todas las salas de un cliente (ordenadas por último mensaje) */
    List<ChatRoom> findByClientIdOrderByLastMessageAtDesc(UUID clientId);

    /** Lista todas las salas de un vendedor (ordenadas por último mensaje) */
    List<ChatRoom> findByVendorIdOrderByLastMessageAtDesc(UUID vendorId);

    /** Verificar si ya existe una sala para esta solicitud */
    boolean existsByRequestId(UUID requestId);

    /** Salas abiertas de un cliente */
    List<ChatRoom> findByClientIdAndStatus(UUID clientId, ChatRoomStatus status);

    /** Salas abiertas de un vendedor */
    List<ChatRoom> findByVendorIdAndStatus(UUID vendorId, ChatRoomStatus status);
}
