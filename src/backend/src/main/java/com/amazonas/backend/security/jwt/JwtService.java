package com.amazonas.backend.security.jwt;

import java.nio.charset.StandardCharsets;
import java.util.Date;

import javax.crypto.SecretKey;
import javax.crypto.spec.SecretKeySpec;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;

@Service
public class JwtService {

    @Value("${security.jwt.secret-key}")
    private String secretKey;

    @Value("${security.jwt.expiration-time}")
    private long expirationTime;

    // =========================
    // GENERAR CLAVE
    // =========================

    private SecretKey getSigningKey() {

        byte[] keyBytes = secretKey.getBytes(StandardCharsets.UTF_8);

        return new SecretKeySpec(
                keyBytes,
                "HmacSHA256"
        );
    }

    // =========================
    // GENERAR TOKEN
    // =========================

    public String generateToken(String email) {

        return Jwts.builder()
                .subject(email)
                .issuedAt(new Date())
                .expiration(
                        new Date(
                                System.currentTimeMillis() + expirationTime
                        )
                )
                .signWith(getSigningKey())
                .compact();
    }

    // =========================
    // EXTRAER EMAIL
    // =========================

    public String extractUsername(String token) {

        return extractAllClaims(token)
                .getSubject();
    }

    // =========================
    // VALIDAR TOKEN
    // =========================

    public boolean isTokenValid(
            String token,
            String email
    ) {

        final String extractedEmail =
                extractUsername(token);

        return extractedEmail.equals(email)
                && !isTokenExpired(token);
    }

    // =========================
    // VALIDAR EXPIRACIÓN
    // =========================

    private boolean isTokenExpired(String token) {

        return extractAllClaims(token)
                .getExpiration()
                .before(new Date());
    }

    // =========================
    // EXTRAER CLAIMS
    // =========================

    private Claims extractAllClaims(String token) {

        return Jwts.parser()
                .verifyWith(getSigningKey())
                .build()
                .parseSignedClaims(token)
                .getPayload();
    }
}