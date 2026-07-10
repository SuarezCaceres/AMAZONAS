package com.amazonas.backend.security.jwt;

import java.io.IOException;

import org.springframework.security.authentication.AnonymousAuthenticationToken;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.web.authentication.WebAuthenticationDetailsSource;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;
import org.springframework.security.crypto.password.PasswordEncoder;

import com.amazonas.backend.security.service.CustomUserDetailsService;
import com.amazonas.backend.modules.users.repository.UserRepository;
import com.amazonas.backend.modules.users.model.User;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;

@Component
@RequiredArgsConstructor
public class JwtFilter extends OncePerRequestFilter {

    private final JwtService jwtService;
    private final CustomUserDetailsService userDetailsService;
    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;

    @Override
    protected void doFilterInternal(
            HttpServletRequest request,
            HttpServletResponse response,
            FilterChain filterChain)
            throws ServletException, IOException {

        final String authHeader = request.getHeader("Authorization");
        final String jwtToken;
        final String userEmail;

        if (authHeader == null || !authHeader.startsWith("Bearer ")) {
            filterChain.doFilter(request, response);
            return;
        }

        jwtToken = authHeader.substring(7);
        
        // Detectar si es un token de Clerk
        String issuer = getClaimUnverified(jwtToken, "iss");
        boolean isClerkToken = issuer != null && (issuer.contains("clerk") || issuer.contains("clerk.accounts.dev"));

        if (isClerkToken) {
            String clerkEmail = request.getHeader("X-User-Email");
            String clerkName = request.getHeader("X-User-Name");
            if (clerkEmail != null && !clerkEmail.isBlank()) {
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

                UsernamePasswordAuthenticationToken authToken =
                        new UsernamePasswordAuthenticationToken(
                                user,
                                null,
                                user.getAuthorities()
                        );

                authToken.setDetails(
                        new WebAuthenticationDetailsSource().buildDetails(request)
                );

                SecurityContextHolder.getContext().setAuthentication(authToken);
            }
            filterChain.doFilter(request, response);
            return;
        }

        try {
            userEmail = jwtService.extractUsername(jwtToken);
            
            boolean isAnonymousOrNull = SecurityContextHolder.getContext().getAuthentication() == null || 
                                        SecurityContextHolder.getContext().getAuthentication() instanceof AnonymousAuthenticationToken;

            if (userEmail != null && isAnonymousOrNull) {

                UserDetails userDetails = userDetailsService.loadUserByUsername(userEmail);

                if (jwtService.isTokenValid(jwtToken, userDetails.getUsername())) {
                    
                    UsernamePasswordAuthenticationToken authToken =
                            new UsernamePasswordAuthenticationToken(
                                    userDetails,
                                    null,
                                    userDetails.getAuthorities()
                            );

                    authToken.setDetails(
                            new WebAuthenticationDetailsSource().buildDetails(request)
                    );

                    SecurityContextHolder.getContext().setAuthentication(authToken);
                }
            }
        } catch (Exception e) {
            // Si el token ha expirado, está malformado o tiene firma inválida,
            // no lanzamos excepción para permitir que los endpoints públicos (permitAll)
            // sigan funcionando normalmente.
            // Spring Security rechazará las solicitudes a rutas protegidas por sí solo.
        }

        filterChain.doFilter(request, response);
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