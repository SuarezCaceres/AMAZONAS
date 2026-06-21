package com.amazonas.backend.modules.chat.service.impl;

import com.amazonas.backend.modules.chat.config.WebSocketConfig;
import com.amazonas.backend.modules.chat.dto.*;
import com.amazonas.backend.modules.chat.enums.*;
import com.amazonas.backend.modules.chat.model.*;
import com.amazonas.backend.modules.chat.repository.*;
import com.amazonas.backend.modules.chat.service.ChatService;
import com.amazonas.backend.modules.chat.service.HtmlSanitizerService;
import com.amazonas.backend.modules.requests.model.PurchaseRequest;
import com.amazonas.backend.modules.requests.repository.PurchaseRequestRepository;
import com.amazonas.backend.modules.users.model.User;
import com.amazonas.backend.modules.users.repository.UserRepository;
import com.amazonas.backend.modules.vendors.model.Vendor;
import com.amazonas.backend.modules.vendors.repository.VendorRepository;
import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.PageRequest;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import java.util.stream.Collectors;

/**
 * Implementación del servicio de Chat y Negociación.
 *
 * Responsabilidades:
 * 1. Crear/obtener salas de chat vinculadas a solicitudes de compra.
 * 2. Persistir mensajes sanitizados (OWASP XSS) en PostgreSQL.
 * 3. Publicar mensajes en tiempo real via WebSocket/STOMP.
 * 4. Gestionar el ciclo de vida de ofertas de precio.
 * 5. Gestionar extras/servicios adicionales negociados.
 * 6. Autorizar que solo el cliente/vendedor de la sala puedan acceder.
 */
@Slf4j
@Service
@RequiredArgsConstructor
@Transactional
public class ChatServiceImpl implements ChatService {

    private static final int PAGE_SIZE = 30;

    private final ChatRoomRepository chatRoomRepository;
    private final ChatMessageRepository chatMessageRepository;
    private final ChatOfferRepository chatOfferRepository;
    private final ChatExtraRepository chatExtraRepository;
    private final PurchaseRequestRepository purchaseRequestRepository;
    private final UserRepository userRepository;
    private final VendorRepository vendorRepository;
    private final HtmlSanitizerService htmlSanitizer;
    private final SimpMessagingTemplate messagingTemplate;

    // =========================================================================
    // SALA DE CHAT
    // =========================================================================

    @Override
    public ChatRoomResponse getOrCreateRoom(UUID requestId, String currentEmail) {
        // Obtener la solicitud de compra
        PurchaseRequest request = purchaseRequestRepository.findById(requestId)
                .orElseThrow(() -> new EntityNotFoundException("Solicitud no encontrada: " + requestId));

        // Obtener o crear la sala
        ChatRoom room = chatRoomRepository.findByRequestId(requestId)
                .orElseGet(() -> createRoomForRequest(request));

        // Verificar que el usuario tiene acceso a esta sala
        validateRoomAccess(room, currentEmail);

        return buildRoomResponse(room, currentEmail);
    }

    @Override
    @Transactional(readOnly = true)
    public List<ChatRoomResponse> getMyRooms(String currentEmail) {
        // Determinar si es cliente o vendedor
        Optional<User> userOpt = userRepository.findByEmail(currentEmail);
        if (userOpt.isPresent()) {
            return chatRoomRepository
                    .findByClientIdOrderByLastMessageAtDesc(userOpt.get().getId())
                    .stream()
                    .map(r -> buildRoomResponse(r, currentEmail))
                    .collect(Collectors.toList());
        }

        Optional<Vendor> vendorOpt = vendorRepository.findByEmail(currentEmail);
        if (vendorOpt.isPresent()) {
            return chatRoomRepository
                    .findByVendorIdOrderByLastMessageAtDesc(vendorOpt.get().getId())
                    .stream()
                    .map(r -> buildRoomResponse(r, currentEmail))
                    .collect(Collectors.toList());
        }

        throw new EntityNotFoundException("Usuario no encontrado: " + currentEmail);
    }

    // =========================================================================
    // MENSAJES
    // =========================================================================

    @Override
    @Transactional(readOnly = true)
    public List<ChatMessageResponse> getMessages(UUID roomId, String currentEmail) {
        ChatRoom room = getRoomOrThrow(roomId);
        validateRoomAccess(room, currentEmail);

        List<ChatMessage> messages = chatMessageRepository
                .findByRoomIdOrderBySentAtDesc(roomId, PageRequest.of(0, PAGE_SIZE));

        // Devolver en orden cronológico (más antiguo primero)
        return messages.stream()
                .sorted((a, b) -> a.getSentAt().compareTo(b.getSentAt()))
                .map(this::buildMessageResponse)
                .collect(Collectors.toList());
    }

    @Override
    public ChatMessageResponse sendMessage(UUID roomId, SendMessageRequest request, String currentEmail) {
        ChatRoom room = getRoomOrThrow(roomId);

        // Resolver remitente de forma consolidada para evitar multiples consultas SELECT por email/id
        UUID senderId;
        ChatSenderRole senderRole;
        String senderName;

        Optional<User> userOpt = userRepository.findByEmail(currentEmail);
        if (userOpt.isPresent()) {
            User user = userOpt.get();
            if (!room.getClientId().equals(user.getId())) {
                throw new AccessDeniedException("No tienes permisos para acceder a esta sala de chat.");
            }
            senderId = user.getId();
            senderRole = ChatSenderRole.CLIENT;
            senderName = user.getNombre();
        } else {
            Optional<Vendor> vendorOpt = vendorRepository.findByEmail(currentEmail);
            if (vendorOpt.isPresent()) {
                Vendor vendor = vendorOpt.get();
                if (!room.getVendorId().equals(vendor.getId())) {
                    throw new AccessDeniedException("No tienes permisos para acceder a esta sala de chat.");
                }
                senderId = vendor.getId();
                senderRole = ChatSenderRole.VENDOR;
                senderName = vendor.getNombre();
            } else {
                throw new EntityNotFoundException("Usuario no encontrado: " + currentEmail);
            }
        }

        if (room.getStatus() == ChatRoomStatus.CLOSED || room.getStatus() == ChatRoomStatus.ARCHIVED) {
            throw new IllegalStateException("Esta sala de chat está cerrada. No se pueden enviar más mensajes.");
        }

        // Sanitizar el contenido del mensaje (prevenir XSS)
        String sanitizedContent = request.content() != null ? htmlSanitizer.sanitize(request.content()) : "";
        ChatMessageType mType = request.messageType() != null ? request.messageType() : ChatMessageType.TEXT;
        if (sanitizedContent.isBlank() && mType != ChatMessageType.FILE) {
            throw new IllegalArgumentException("El mensaje no puede estar vacío después de la sanitización.");
        }

        // Persistir mensaje con flush inmediato
        ChatMessage message = ChatMessage.builder()
                .roomId(roomId)
                .senderId(senderId)
                .senderRole(senderRole)
                .messageType(mType)
                .content(sanitizedContent)
                .metadata(request.metadata())
                .build();

        message = chatMessageRepository.saveAndFlush(message);

        // Actualizar sala con flush inmediato
        room.setLastMessageAt(OffsetDateTime.now());
        chatRoomRepository.saveAndFlush(room);

        // Construir respuesta usando datos ya resueltos en memoria (evita consultas findById redundantes)
        ChatMessageResponse response = new ChatMessageResponse(
                message.getId(),
                message.getRoomId(),
                message.getSenderId(),
                senderName != null ? senderName : (senderRole == ChatSenderRole.CLIENT ? "Cliente" : "Vendedor"),
                message.getSenderRole(),
                message.getMessageType(),
                message.getContent(),
                message.getMetadata(),
                message.isRead(),
                message.getSentAt()
        );

        // Publicar en tiempo real vía WebSocket
        messagingTemplate.convertAndSend("/topic/room/" + roomId, response);

        return response;
    }

    // =========================================================================
    // OFERTAS DE PRECIO
    // =========================================================================

    @Override
    public ChatOfferResponse createOffer(UUID roomId, CreateOfferRequest request, String currentEmail) {
        ChatRoom room = getRoomOrThrow(roomId);
        validateRoomAccess(room, currentEmail);

        // Compatibilidad: salas existentes en Neon pueden tener status OPEN o ACTIVE
        boolean roomIsOpen = room.getStatus() == ChatRoomStatus.ACTIVE || room.getStatus() == ChatRoomStatus.OPEN;
        if (!roomIsOpen) {
            throw new IllegalStateException("No se pueden crear ofertas en una sala que no está abierta.");
        }

        // Invalidar ofertas PENDING anteriores
        chatOfferRepository.findByRoomIdAndStatus(roomId, ChatOfferStatus.PENDING)
                .ifPresent(existing -> {
                    existing.setStatus(ChatOfferStatus.COUNTERED);
                    existing.setRespondedAt(OffsetDateTime.now());
                    chatOfferRepository.saveAndFlush(existing);
                });

        ChatSenderRole senderRole = getSenderRole(currentEmail, room);
        UUID proposerId = getSenderId(currentEmail);

        // Crear la nueva oferta
        ChatOffer offer = ChatOffer.builder()
                .roomId(roomId)
                .proposerId(proposerId)
                .proposerRole(senderRole)
                .proposedPrice(request.proposedPrice())
                .note(request.note())
                .status(ChatOfferStatus.PENDING)
                .build();

        offer = chatOfferRepository.saveAndFlush(offer);

        // Crear mensaje de tipo OFFER en el chat para visualizarla
        String metadata = String.format(
                "{\"offerId\":\"%s\",\"proposedPrice\":%s,\"note\":\"%s\"}",
                offer.getId(),
                offer.getProposedPrice(),
                offer.getNote() != null ? offer.getNote() : ""
        );

        ChatMessage offerMessage = ChatMessage.builder()
                .roomId(roomId)
                .senderId(proposerId)
                .senderRole(senderRole)
                .messageType(ChatMessageType.OFFER)
                .content("Propuesta de precio: S/ " + request.proposedPrice())
                .metadata(metadata)
                .build();

        chatMessageRepository.saveAndFlush(offerMessage);

        // Vincular el mensaje a la oferta
        offer.setMessageId(offerMessage.getId());
        offer = chatOfferRepository.saveAndFlush(offer);

        // Actualizar last_message_at
        room.setLastMessageAt(OffsetDateTime.now());
        chatRoomRepository.saveAndFlush(room);

        ChatOfferResponse offerResponse = buildOfferResponse(offer, currentEmail);

        // Publicar en tiempo real
        messagingTemplate.convertAndSend("/topic/room/" + roomId + "/offers", offerResponse);
        messagingTemplate.convertAndSend("/topic/room/" + roomId, buildMessageResponse(offerMessage));

        return offerResponse;
    }

    @Override
    public ChatOfferResponse respondToOffer(UUID offerId, boolean accept, String currentEmail) {
        ChatOffer offer = chatOfferRepository.findById(offerId)
                .orElseThrow(() -> new EntityNotFoundException("Oferta no encontrada: " + offerId));

        ChatRoom room = getRoomOrThrow(offer.getRoomId());
        validateRoomAccess(room, currentEmail);

        if (offer.getStatus() != ChatOfferStatus.PENDING) {
            throw new IllegalStateException("Esta oferta ya fue respondida o expiró.");
        }

        // La respuesta debe ser del lado opuesto a quien propuso
        ChatSenderRole currentRole = getSenderRole(currentEmail, room);
        if (currentRole == offer.getProposerRole()) {
            throw new AccessDeniedException("No puedes responder a tu propia oferta.");
        }

        offer.setStatus(accept ? ChatOfferStatus.ACCEPTED : ChatOfferStatus.REJECTED);
        offer.setRespondedAt(OffsetDateTime.now());
        offer = chatOfferRepository.saveAndFlush(offer);

        if (accept) {
            // Registrar el precio acordado en la sala
            room.setAgreedPrice(offer.getProposedPrice());
            room.setStatus(ChatRoomStatus.AGREED);
            chatRoomRepository.saveAndFlush(room);

            // Crear mensaje de sistema "Precio acordado"
            ChatMessage systemMessage = ChatMessage.builder()
                    .roomId(room.getId())
                    .senderId(getSenderId(currentEmail))
                    .senderRole(ChatSenderRole.SYSTEM)
                    .messageType(ChatMessageType.SYSTEM)
                    .content("✅ Precio acordado: S/ " + offer.getProposedPrice() + ". ¡La negociación ha concluido exitosamente!")
                    .build();
            chatMessageRepository.saveAndFlush(systemMessage);
            messagingTemplate.convertAndSend("/topic/room/" + room.getId(), buildMessageResponse(systemMessage));
        }

        ChatOfferResponse offerResponse = buildOfferResponse(offer, currentEmail);
        messagingTemplate.convertAndSend("/topic/room/" + room.getId() + "/offers", offerResponse);

        return offerResponse;
    }

    // =========================================================================
    // EXTRAS
    // =========================================================================

    @Override
    public ChatRoomResponse addExtra(UUID roomId, CreateExtraRequest request, String currentEmail) {
        ChatRoom room = getRoomOrThrow(roomId);
        validateRoomAccess(room, currentEmail);

        // Solo vendedores pueden proponer extras
        ChatSenderRole role = getSenderRole(currentEmail, room);
        if (role != ChatSenderRole.VENDOR) {
            throw new AccessDeniedException("Solo el vendedor puede proponer servicios adicionales.");
        }

        ChatExtra extra = ChatExtra.builder()
                .roomId(roomId)
                .nombre(htmlSanitizer.sanitize(request.nombre()))
                .descripcion(request.descripcion() != null ? htmlSanitizer.sanitize(request.descripcion()) : null)
                .precio(request.precio())
                .build();

        chatExtraRepository.saveAndFlush(extra);

        // Notificar al cliente del nuevo extra
        String extraMsg = String.format("📦 Servicio adicional propuesto: %s — S/ %.2f", extra.getNombre(), extra.getPrecio());
        ChatMessage infoMessage = ChatMessage.builder()
                .roomId(roomId)
                .senderId(getSenderId(currentEmail))
                .senderRole(ChatSenderRole.VENDOR)
                .messageType(ChatMessageType.SYSTEM)
                .content(extraMsg)
                .build();
        chatMessageRepository.saveAndFlush(infoMessage);
        messagingTemplate.convertAndSend("/topic/room/" + roomId, buildMessageResponse(infoMessage));

        return buildRoomResponse(room, currentEmail);
    }

    @Override
    public ChatRoomResponse respondToExtra(UUID extraId, boolean accept, String currentEmail) {
        ChatExtra extra = chatExtraRepository.findById(extraId)
                .orElseThrow(() -> new EntityNotFoundException("Extra no encontrado: " + extraId));

        ChatRoom room = getRoomOrThrow(extra.getRoomId());
        validateRoomAccess(room, currentEmail);

        // Solo el cliente puede responder
        ChatSenderRole role = getSenderRole(currentEmail, room);
        if (role != ChatSenderRole.CLIENT) {
            throw new AccessDeniedException("Solo el cliente puede aceptar o rechazar extras.");
        }

        extra.setAceptado(accept);
        chatExtraRepository.saveAndFlush(extra);

        String responseMsg = accept
                ? "✅ El cliente aceptó el extra: " + extra.getNombre()
                : "❌ El cliente rechazó el extra: " + extra.getNombre();

        ChatMessage infoMessage = ChatMessage.builder()
                .roomId(extra.getRoomId())
                .senderId(getSenderId(currentEmail))
                .senderRole(ChatSenderRole.CLIENT)
                .messageType(ChatMessageType.SYSTEM)
                .content(responseMsg)
                .build();
        chatMessageRepository.saveAndFlush(infoMessage);
        messagingTemplate.convertAndSend("/topic/room/" + extra.getRoomId(), buildMessageResponse(infoMessage));

        return buildRoomResponse(room, currentEmail);
    }

    // =========================================================================
    // LECTURA
    // =========================================================================

    @Override
    public void markAsRead(UUID roomId, String currentEmail) {
        ChatRoom room = getRoomOrThrow(roomId);
        validateRoomAccess(room, currentEmail);

        ChatSenderRole role = getSenderRole(currentEmail, room);
        // Marcar como leídos los mensajes del otro lado (los que me llegan a mí)
        ChatSenderRole oppositeRole = (role == ChatSenderRole.CLIENT) ? ChatSenderRole.VENDOR : ChatSenderRole.CLIENT;
        chatMessageRepository.markAllAsRead(roomId, oppositeRole);
    }

    // =========================================================================
    // HELPERS PRIVADOS
    // =========================================================================

    private ChatRoom createRoomForRequest(PurchaseRequest request) {
        // El vendedor institucional es SIEMPRE Admin@gmail.com según regla de negocio.
        // Como fallback se usa el primer vendedor activo si no se encuentra el correo.
        Vendor vendor = vendorRepository.findByEmail("Admin@gmail.com")
                .or(() -> vendorRepository.findByEmail("admin@gmail.com"))
                .or(() -> vendorRepository.findFirstByActivoTrue())
                .orElseThrow(() -> new EntityNotFoundException("No hay vendedor activo disponible."));

        ChatRoom room = ChatRoom.builder()
                .requestId(request.getId())
                .clientId(request.getUsuario().getId())
                .vendorId(vendor.getId())
                .status(ChatRoomStatus.ACTIVE)
                .build();

        room = chatRoomRepository.saveAndFlush(room);

        // Mensaje de bienvenida del sistema
        ChatMessage welcome = ChatMessage.builder()
                .roomId(room.getId())
                .senderId(vendor.getId())
                .senderRole(ChatSenderRole.SYSTEM)
                .messageType(ChatMessageType.SYSTEM)
                .content("👋 ¡Bienvenido al chat de negociación! Aquí podrás conversar con el vendedor sobre tu solicitud de \"" + request.getProductoNombre() + "\". Puedes hacer preguntas, negociar el precio y definir los detalles.")
                .build();
        chatMessageRepository.saveAndFlush(welcome);

        log.info("Sala de chat creada para solicitud: {} → sala: {}", request.getId(), room.getId());
        return room;
    }

    private void validateRoomAccess(ChatRoom room, String currentEmail) {
        Optional<User> userOpt = userRepository.findByEmail(currentEmail);
        if (userOpt.isPresent() && room.getClientId().equals(userOpt.get().getId())) return;

        Optional<Vendor> vendorOpt = vendorRepository.findByEmail(currentEmail);
        if (vendorOpt.isPresent() && room.getVendorId().equals(vendorOpt.get().getId())) return;

        throw new AccessDeniedException("No tienes permisos para acceder a esta sala de chat.");
    }

    private ChatSenderRole getSenderRole(String email, ChatRoom room) {
        Optional<User> userOpt = userRepository.findByEmail(email);
        if (userOpt.isPresent() && room.getClientId().equals(userOpt.get().getId())) {
            return ChatSenderRole.CLIENT;
        }
        return ChatSenderRole.VENDOR;
    }

    private UUID getSenderId(String email) {
        Optional<User> userOpt = userRepository.findByEmail(email);
        if (userOpt.isPresent()) return userOpt.get().getId();

        Optional<Vendor> vendorOpt = vendorRepository.findByEmail(email);
        if (vendorOpt.isPresent()) return vendorOpt.get().getId();

        throw new EntityNotFoundException("Usuario no encontrado: " + email);
    }

    private ChatRoom getRoomOrThrow(UUID roomId) {
        return chatRoomRepository.findById(roomId)
                .orElseThrow(() -> new EntityNotFoundException("Sala de chat no encontrada: " + roomId));
    }

    // =========================================================================
    // MAPPERS
    // =========================================================================

    private ChatRoomResponse buildRoomResponse(ChatRoom room, String currentEmail) {
        // Obtener nombre del cliente
        String clientName = userRepository.findById(room.getClientId())
                .map(u -> u.getNombre()).orElse("Cliente");
        String clientEmail = userRepository.findById(room.getClientId())
                .map(u -> u.getEmail()).orElse("");

        // Obtener nombre del vendedor
        String vendorName = vendorRepository.findById(room.getVendorId())
                .map(v -> v.getNombre()).orElse("Vendedor");

        // Nombre del producto desde la solicitud
        String productName = purchaseRequestRepository.findById(room.getRequestId())
                .map(r -> r.getProductoNombre()).orElse("Maqueta");

        // Contar mensajes no leídos para el usuario actual
        ChatSenderRole role = getSenderRole(currentEmail, room);
        ChatSenderRole myRole = (role == ChatSenderRole.CLIENT) ? ChatSenderRole.CLIENT : ChatSenderRole.VENDOR;
        long unread = chatMessageRepository.countUnread(room.getId(), myRole);

        return new ChatRoomResponse(
                room.getId(),
                room.getRequestId(),
                productName,
                clientName,
                clientEmail,
                vendorName,
                room.getStatus(),
                room.getAgreedPrice(),
                room.getLastMessageAt(),
                room.getCreatedAt(),
                unread
        );
    }

    private ChatMessageResponse buildMessageResponse(ChatMessage message) {
        String senderName = resolveSenderName(message.getSenderId(), message.getSenderRole());
        return new ChatMessageResponse(
                message.getId(),
                message.getRoomId(),
                message.getSenderId(),
                senderName,
                message.getSenderRole(),
                message.getMessageType(),
                message.getContent(),
                message.getMetadata(),
                message.isRead(),
                message.getSentAt()
        );
    }

    private ChatOfferResponse buildOfferResponse(ChatOffer offer, String currentEmail) {
        String proposerName = resolveSenderName(offer.getProposerId(), offer.getProposerRole());
        return new ChatOfferResponse(
                offer.getId(),
                offer.getRoomId(),
                offer.getProposerId(),
                proposerName,
                offer.getProposerRole(),
                offer.getProposedPrice(),
                offer.getNote(),
                offer.getStatus(),
                offer.getRespondedAt(),
                offer.getCreatedAt()
        );
    }

    private String resolveSenderName(UUID senderId, ChatSenderRole role) {
        if (role == ChatSenderRole.SYSTEM) return "Sistema";
        if (role == ChatSenderRole.CLIENT) {
            return userRepository.findById(senderId).map(u -> u.getNombre()).orElse("Cliente");
        }
        return vendorRepository.findById(senderId).map(v -> v.getNombre()).orElse("Vendedor");
    }
}
