package com.amazonas.backend.modules.chat.repository;

import com.amazonas.backend.modules.chat.enums.ChatOfferStatus;
import com.amazonas.backend.modules.chat.model.ChatOffer;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface ChatOfferRepository extends JpaRepository<ChatOffer, UUID> {

    /** Obtiene todas las ofertas de una sala (ordenadas por más reciente) */
    List<ChatOffer> findByRoomIdOrderByCreatedAtDesc(UUID roomId);

    /** Busca la oferta pendiente activa en una sala (máximo una a la vez) */
    Optional<ChatOffer> findByRoomIdAndStatus(UUID roomId, ChatOfferStatus status);

    /** Verifica si hay una oferta pendiente en la sala */
    boolean existsByRoomIdAndStatus(UUID roomId, ChatOfferStatus status);
}
