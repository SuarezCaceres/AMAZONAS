package com.amazonas.backend.modules.chat.config;

import com.amazonas.backend.security.jwt.JwtService;
import com.amazonas.backend.security.service.CustomUserDetailsService;
import com.amazonas.backend.modules.users.repository.UserRepository;
import com.amazonas.backend.modules.users.model.User;
import org.springframework.security.crypto.password.PasswordEncoder;
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
    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;

    @Override
    public void registerStompEndpoints(StompEndpointRegistry registry) {
        registry
                .addEndpoint("/ws")                        // Endpoint de conexión WebSocket
                .setAllowedOriginPatterns("*");            // CORS (afinar en producción)
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
                        // Detectar si es un token de Clerk
                        String issuer = getClaimUnverified(token, "iss");
                        boolean isClerkToken = issuer != null && (issuer.contains("clerk") || issuer.contains("clerk.accounts.dev"));

                        if (isClerkToken) {
                            String clerkEmail = accessor.getFirstNativeHeader("X-User-Email");
                            String clerkName = accessor.getFirstNativeHeader("X-User-Name");
                            if (clerkEmail != null && !clerkEmail.isBlank()) {
                                try {
                                    User user = userRepository.findByEmailIgnoreCase(clerkEmail)
                                            .orElseGet(() -> {
                                                User newUser = new User();
                                                newUser.setEmail(clerkEmail);
                                                newUser.setNombre((clerkName != null && !clerkName.isBlank()) ? clerkName : clerkEmail.split("@")[0]);
                                                newUser.setPassword(passwordEncoder.encode("clerk_oauth_dummy_pass"));
                                                newUser.setRole(com.amazonas.backend.modules.auth.enums.Role.CLIENT);
                                                newUser.setTelefono("");
                                                return userRepository.save(newUser);
                                            });

                                    UsernamePasswordAuthenticationToken auth =
                                            new UsernamePasswordAuthenticationToken(
                                                    user,
                                                    null,
                                                    user.getAuthorities()
                                            );
                                    accessor.setUser(auth);
                                    log.debug("WebSocket autenticado con Clerk para usuario: {}", clerkEmail);
                                } catch (Exception e) {
                                    log.warn("WebSocket CONNECT con Clerk rechazado: {}", e.getMessage());
                                    return null; // Rechaza la conexión
                                }
                            } else {
                                log.warn("WebSocket CONNECT con Clerk rechazado: X-User-Email faltante");
                                return null; // Rechaza la conexión
                            }
                        } else {
                            // Flujo original para token JWT local
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

    private String getClaimUnverified(String token, String claimName) {
        try {
            String[] parts = token.split("\\.");
            if (parts.length != 3) {
                return null;
            }
            String payload = new String(java.util.Base64.getUrlDecoder().decode(parts[1]), java.nio.charset.StandardCharsets.UTF_8);
            String searchPattern = "\"" + claimName + "\":\"";
            int index = payload.indexOf(searchPattern);
            if (index == -1) {
                return null;
            }
            int start = index + searchPattern.length();
            int end = payload.indexOf("\"", start);
            if (end == -1) {
                return null;
            }
            return payload.substring(start, end);
        } catch (Exception e) {
            return null;
        }
    }
}
