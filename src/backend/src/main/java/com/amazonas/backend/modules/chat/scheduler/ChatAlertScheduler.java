package com.amazonas.backend.modules.chat.scheduler;

import com.amazonas.backend.modules.chat.model.ChatMessage;
import com.amazonas.backend.modules.chat.model.ChatRoom;
import com.amazonas.backend.modules.chat.enums.ChatSenderRole;
import com.amazonas.backend.modules.chat.enums.ChatRoomStatus;
import com.amazonas.backend.modules.chat.repository.ChatMessageRepository;
import com.amazonas.backend.modules.chat.repository.ChatRoomRepository;
import com.amazonas.backend.modules.users.model.User;
import com.amazonas.backend.modules.users.repository.UserRepository;
import com.amazonas.backend.modules.vendors.model.Vendor;
import com.amazonas.backend.modules.vendors.repository.VendorRepository;
import net.javacrumbs.shedlock.spring.annotation.SchedulerLock;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.time.OffsetDateTime;
import java.util.*;

@Component
public class ChatAlertScheduler {

    private static final Logger log = LoggerFactory.getLogger(ChatAlertScheduler.class);

    private final ChatRoomRepository chatRoomRepository;
    private final ChatMessageRepository chatMessageRepository;
    private final UserRepository userRepository;
    private final VendorRepository vendorRepository;
    private final JavaMailSender mailSender;

    public ChatAlertScheduler(ChatRoomRepository chatRoomRepository,
                              ChatMessageRepository chatMessageRepository,
                              UserRepository userRepository,
                              VendorRepository vendorRepository,
                              JavaMailSender mailSender) {
        this.chatRoomRepository = chatRoomRepository;
        this.chatMessageRepository = chatMessageRepository;
        this.userRepository = userRepository;
        this.vendorRepository = vendorRepository;
        this.mailSender = mailSender;
    }

    /**
     * Tarea programada por horas (cada hora en el minuto 0).
     * Revisa si hay mensajes enviados en la última hora que no han sido leídos,
     * y envía un correo de alerta consolidado al destinatario correspondiente.
     */
    @Scheduled(cron = "0 0 * * * *")
    @SchedulerLock(name = "ChatAlertScheduler_sendPendingChatAlerts", lockAtMostFor = "15m", lockAtLeastFor = "1m")
    public void sendPendingChatAlerts() {
        log.info("--- INICIANDO ESCANEO DE ALERTAS DE CHAT PENDIENTES ---");
        OffsetDateTime end = OffsetDateTime.now();
        OffsetDateTime start = end.minusHours(1);

        List<UUID> roomIds = chatMessageRepository.findRoomsWithUnreadMessages(start, end);
        if (roomIds.isEmpty()) {
            log.info("No hay mensajes no leídos en la última hora.");
            return;
        }

        // Mapear destinatario (email) -> Lista de mensajes no leídos
        Map<String, List<ChatMessage>> clientAlerts = new HashMap<>();
        Map<String, List<ChatMessage>> vendorAlerts = new HashMap<>();

        for (UUID roomId : roomIds) {
            ChatRoom room = chatRoomRepository.findById(roomId).orElse(null);
            if (room == null || room.getStatus() != ChatRoomStatus.ACTIVE) {
                continue;
            }

            List<ChatMessage> unreadMessages = chatMessageRepository.findUnreadMessagesInRoom(roomId, start, end);
            for (ChatMessage msg : unreadMessages) {
                if (msg.getSenderRole() == ChatSenderRole.CLIENT) {
                    // El remitente es el cliente, el destinatario es el vendor
                    vendorRepository.findById(room.getVendorId()).ifPresent(vendor -> {
                        vendorAlerts.computeIfAbsent(vendor.getEmail(), k -> new ArrayList<>()).add(msg);
                    });
                } else if (msg.getSenderRole() == ChatSenderRole.VENDOR) {
                    // El remitente es el vendor, el destinatario es el cliente
                    userRepository.findById(room.getClientId()).ifPresent(client -> {
                        clientAlerts.computeIfAbsent(client.getEmail(), k -> new ArrayList<>()).add(msg);
                    });
                }
            }
        }

        // Enviar correos a clientes
        clientAlerts.forEach((email, msgs) -> {
            try {
                sendEmailAlert(email, msgs, "cliente");
            } catch (Exception e) {
                log.error("Error enviando correo de alerta de chat a cliente {}", email, e);
            }
        });

        // Enviar correos a vendedores
        vendorAlerts.forEach((email, msgs) -> {
            try {
                sendEmailAlert(email, msgs, "vendedor");
            } catch (Exception e) {
                log.error("Error enviando correo de alerta de chat a vendedor {}", email, e);
            }
        });

        log.info("--- ESCANEO DE ALERTAS DE CHAT PENDIENTES FINALIZADO ---");
    }

    private void sendEmailAlert(String email, List<ChatMessage> messages, String userType) {
        log.info("Enviando correo de alerta de chat a: {} ({})", email, userType);
        SimpleMailMessage message = new SimpleMailMessage();
        message.setTo(email);
        message.setSubject("Mensajes de chat pendientes - Amazonas");
        
        StringBuilder body = new StringBuilder();
        body.append("Hola,\n\n");
        body.append("Tienes ").append(messages.size()).append(" mensaje(s) nuevo(s) sin leer en tu chat de Amazonas:\n\n");

        for (ChatMessage msg : messages) {
            String remitente = msg.getSenderRole() == ChatSenderRole.CLIENT ? "Cliente" : "Vendedor";
            body.append("- [").append(remitente).append("]: ").append(msg.getContent()).append("\n");
        }

        body.append("\nPor favor, ingresa a la plataforma para responder a la brevedad.\n\n");
        body.append("Atentamente,\nEquipo de Amazonas");

        message.setText(body.toString());
        mailSender.send(message);
    }
}
