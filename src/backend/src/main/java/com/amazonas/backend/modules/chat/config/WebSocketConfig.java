package com.amazonas.backend.modules.chat.config;

import com.amazonas.backend.security.jwt.JwtService;
import com.amazonas.backend.security.service.CustomUserDetailsService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.annotation.Configuration;
import org.springframework.messaging.Message;
import org.springframework.messaging.MessageChannel;
import org.springframework.messaging.simp.config.ChannelRegistration;
import org.springframework.messaging.simp.config.MessageBrokerRegistry;
import org.springframework.messaging.simp.stomp.StompCommand;
import org.springframework.messaging.simp.stomp.StompHeaderAccessor;
import org.springframework.messaging.support.ChannelInterceptor;
import org.springframework.messaging.support.MessageHeaderAccessor;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.socket.config.annotation.EnableWebSocketMessageBroker;
import org.springframework.web.socket.config.annotation.StompEndpointRegistry;
import org.springframework.web.socket.config.annotation.WebSocketMessageBrokerConfigurer;

/**
 * Configuración central de WebSocket con STOMP y autenticación JWT.
 *
 * Flujo de conexión segura:
 * 1. El frontend Angular conecta al endpoint /ws?token=<JWT>
 * 2. El ChannelInterceptor extrae y valida el token en cada CONNECT
 * 3. Se establece el Principal autenticado en el contexto de la sesión WebSocket
 * 4. La autorización por sala se verifica en ChatService al suscribirse
 *
 * Tópicos STOMP:
 * - /topic/room/{roomId}          → Mensajes en tiempo real de la sala
 * - /topic/room/{roomId}/offers   → Actualizaciones de ofertas
 * - /user/queue/notifications     → Notificaciones personales (nuevo mensaje, etc.)
 */
@Slf4j
@Configuration
@EnableWebSocketMessageBroker
@RequiredArgsConstructor
public class WebSocketConfig implements WebSocketMessageBrokerConfigurer {

    private final JwtService jwtService;
    private final CustomUserDetailsService userDetailsService;

    @Override
    public void registerStompEndpoints(StompEndpointRegistry registry) {
        registry
                .addEndpoint("/ws")                        // Endpoint de conexión WebSocket
                .setAllowedOriginPatterns("*")             // CORS (afinar en producción)
                .withSockJS();                             // Fallback para browsers sin WebSocket nativo
    }

    @Override
    public void configureMessageBroker(MessageBrokerRegistry registry) {
        // Prefijo para mensajes enviados desde cliente al servidor
        registry.setApplicationDestinationPrefixes("/app");

        // Prefijo de tópicos del broker en memoria
        registry.enableSimpleBroker("/topic", "/queue", "/user");

        // Prefijo para mensajes dirigidos a un usuario específico
        registry.setUserDestinationPrefix("/user");
    }

    /**
     * Interceptor de canal de entrada: valida el JWT en cada frame CONNECT.
     * Protege la conexión WebSocket sin depender del HTTP session filter.
     */
    @Override
    public void configureClientInboundChannel(ChannelRegistration registration) {
        registration.interceptors(new ChannelInterceptor() {
            @Override
            public Message<?> preSend(Message<?> message, MessageChannel channel) {
                StompHeaderAccessor accessor = MessageHeaderAccessor.getAccessor(
                        message, StompHeaderAccessor.class
                );

                if (accessor == null) return message;

                // Solo procesar frames CONNECT
                if (StompCommand.CONNECT.equals(accessor.getCommand())) {
                    String token = accessor.getFirstNativeHeader("Authorization");

                    // Soporte alternativo: token en query param (para SockJS)
                    if (token == null || token.isBlank()) {
                        token = accessor.getFirstNativeHeader("token");
                    }

                    if (token != null && token.startsWith("Bearer ")) {
                        token = token.substring(7);
                    }

                    if (token != null && !token.isBlank()) {
                        try {
                            String email = jwtService.extractUsername(token);
                            UserDetails userDetails = userDetailsService.loadUserByUsername(email);

                            if (jwtService.isTokenValid(token, userDetails.getUsername())) {
                                UsernamePasswordAuthenticationToken auth =
                                        new UsernamePasswordAuthenticationToken(
                                                userDetails,
                                                null,
                                                userDetails.getAuthorities()
                                        );
                                accessor.setUser(auth);
                                log.debug("WebSocket autenticado para usuario: {}", email);
                            } else {
                                log.warn("WebSocket CONNECT rechazado: token inválido");
                                return null; // Rechaza la conexión
                            }
                        } catch (Exception e) {
                            log.warn("WebSocket CONNECT rechazado: {}", e.getMessage());
                            return null; // Rechaza la conexión
                        }
                    } else {
                        log.warn("WebSocket CONNECT sin token JWT");
                        return null; // Rechaza conexiones sin token
                    }
                }

                return message;
            }
        });
    }
}
