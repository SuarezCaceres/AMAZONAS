package com.amazonas.backend.modules.chat.listener;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.event.EventListener;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.messaging.simp.stomp.StompHeaderAccessor;
import org.springframework.stereotype.Component;
import org.springframework.web.socket.messaging.SessionConnectedEvent;
import org.springframework.web.socket.messaging.SessionDisconnectEvent;

import java.security.Principal;
import java.util.Set;
import java.util.concurrent.TimeUnit;

/**
 * Listener de eventos de sesión WebSocket para rastrear usuarios activos en tiempo real usando Redis.
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class WebSocketSessionListener {

    private final StringRedisTemplate redisTemplate;

    private static final String REDIS_ACTIVE_USERS_KEY = "websocket:active_users";
    private static final String REDIS_SESSION_PREFIX = "websocket:session:";

    @EventListener
    public void handleWebSocketConnectListener(SessionConnectedEvent event) {
        StompHeaderAccessor headerAccessor = StompHeaderAccessor.wrap(event.getMessage());
        Principal principal = headerAccessor.getUser();
        String sessionId = headerAccessor.getSessionId();

        if (principal != null && principal.getName() != null) {
            String username = principal.getName();
            log.info("WebSocket connected: user={}, sessionId={}", username, sessionId);

            // Guardar mapeo de sesión en Redis con TTL de 2 horas como respaldo
            redisTemplate.opsForValue().set(REDIS_SESSION_PREFIX + sessionId, username, 2, TimeUnit.HOURS);
            
            // Añadir al set de usuarios activos
            redisTemplate.opsForSet().add(REDIS_ACTIVE_USERS_KEY, username);
        }
    }

    @EventListener
    public void handleWebSocketDisconnectListener(SessionDisconnectEvent event) {
        StompHeaderAccessor headerAccessor = StompHeaderAccessor.wrap(event.getMessage());
        String sessionId = headerAccessor.getSessionId();

        log.info("WebSocket disconnected: sessionId={}", sessionId);

        // Obtener el usuario mapeado para removerlo del set activo
        String username = redisTemplate.opsForValue().get(REDIS_SESSION_PREFIX + sessionId);
        if (username != null) {
            redisTemplate.delete(REDIS_SESSION_PREFIX + sessionId);
            redisTemplate.opsForSet().remove(REDIS_ACTIVE_USERS_KEY, username);
            log.info("Removed user {} from active WebSocket users set", username);
        } else {
            // Fallback: intentar por el principal del evento
            Principal principal = headerAccessor.getUser();
            if (principal != null && principal.getName() != null) {
                redisTemplate.opsForSet().remove(REDIS_ACTIVE_USERS_KEY, principal.getName());
                log.info("Removed user {} from active WebSocket users set (fallback)", principal.getName());
            }
        }
    }

    /**
     * Retorna si un usuario tiene una sesión WebSocket activa en el clúster.
     */
    public boolean isUserActive(String username) {
        Boolean isMember = redisTemplate.opsForSet().isMember(REDIS_ACTIVE_USERS_KEY, username);
        return isMember != null && isMember;
    }

    /**
     * Retorna el conjunto de todos los usuarios activos.
     */
    public Set<String> getActiveUsers() {
        return redisTemplate.opsForSet().members(REDIS_ACTIVE_USERS_KEY);
    }
}
