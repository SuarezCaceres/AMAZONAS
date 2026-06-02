package com.amazonas.backend.modules.auth.service.impl;

import java.time.LocalDateTime;
import java.util.UUID;

import org.springframework.http.HttpStatus;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.web.server.ResponseStatusException;

import com.amazonas.backend.modules.auth.dto.AuthResponse;
import com.amazonas.backend.modules.auth.dto.LoginRequest;
import com.amazonas.backend.modules.auth.dto.LoginVendorRequest;
import com.amazonas.backend.modules.auth.dto.RegisterRequest;
import com.amazonas.backend.modules.auth.dto.ForgotPasswordRequest;
import com.amazonas.backend.modules.auth.dto.ResetPasswordRequest;
import com.amazonas.backend.modules.auth.enums.Role;
import com.amazonas.backend.modules.auth.model.PasswordResetToken;
import com.amazonas.backend.modules.auth.repository.PasswordResetTokenRepository;
import com.amazonas.backend.modules.auth.service.AuthService;
import com.amazonas.backend.modules.users.model.User;
import com.amazonas.backend.modules.users.repository.UserRepository;
import com.amazonas.backend.modules.vendors.model.Vendor;
import com.amazonas.backend.modules.vendors.repository.VendorRepository;
import com.amazonas.backend.security.jwt.JwtService;

import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class AuthServiceImpl implements AuthService {

    private final UserRepository userRepository;
    private final VendorRepository vendorRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtService jwtService;
    private final JavaMailSender mailSender;
    private final PasswordResetTokenRepository tokenRepository;

    @Value("${app.frontend-url:http://localhost:4200}")
    private String frontendUrl;

    @Override
    public AuthResponse register(RegisterRequest request) {
        if (userRepository.existsByEmail(request.getEmail())) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "El correo ya se encuentra registrado");
        }

        User user = new User();
        user.setNombre(request.getNombre());
        user.setEmail(request.getEmail());
        user.setTelefono(request.getTelefono());
        user.setPassword(passwordEncoder.encode(request.getPassword()));
        user.setRole(Role.CLIENT);

        userRepository.save(user);

        String token = jwtService.generateToken(user.getEmail());
        return new AuthResponse(token, user.getEmail(), user.getRole().name(), user.getNombre());
    }

    @Override
    public AuthResponse registerVendor(RegisterRequest request) {
        if (vendorRepository.existsByEmail(request.getEmail())) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "El email ya está registrado para un vendor");
        }

        Vendor vendor = new Vendor();
        vendor.setNombre(request.getNombre());
        vendor.setEmail(request.getEmail());
        vendor.setPassword(passwordEncoder.encode(request.getPassword()));
        vendor.setRole(Role.ADMIN);

        vendorRepository.save(vendor);

        String token = jwtService.generateToken(vendor.getEmail());
        return new AuthResponse(token, vendor.getEmail(), vendor.getRole().name(), vendor.getNombre());
    }

    @Override
    public AuthResponse login(LoginRequest request) {
        User user = userRepository.findByEmail(request.getEmail())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Usuario no encontrado"));

        if (user.getLockUntil() != null && user.getLockUntil().isAfter(LocalDateTime.now())) {
            throw new ResponseStatusException(HttpStatus.LOCKED, "La cuenta está bloqueada temporalmente. Inténtalo de nuevo más tarde.");
        }

        if (!passwordEncoder.matches(request.getPassword(), user.getPassword())) {
            int attempts = (user.getFailedLoginAttempts() != null ? user.getFailedLoginAttempts() : 0) + 1;
            user.setFailedLoginAttempts(attempts);
            if (attempts >= 3) {
                user.setLockUntil(LocalDateTime.now().plusMinutes(15));
            }
            userRepository.save(user);
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Contraseña incorrecta");
        }

        user.setFailedLoginAttempts(0);
        user.setLockUntil(null);
        userRepository.save(user);

        String token = jwtService.generateToken(user.getEmail());
        return new AuthResponse(token, user.getEmail(), user.getRole().name(), user.getNombre());
    }

    @Override
    public AuthResponse vendorLogin(LoginVendorRequest request) {
        Vendor vendor = vendorRepository.findByEmail(request.getEmail())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Vendor no encontrado"));

        if (vendor.getLockUntil() != null && vendor.getLockUntil().isAfter(LocalDateTime.now())) {
            throw new ResponseStatusException(HttpStatus.LOCKED, "La cuenta está bloqueada temporalmente. Inténtalo de nuevo más tarde.");
        }

        if (!passwordEncoder.matches(request.getPassword(), vendor.getPassword())) {
            int attempts = (vendor.getFailedLoginAttempts() != null ? vendor.getFailedLoginAttempts() : 0) + 1;
            vendor.setFailedLoginAttempts(attempts);
            if (attempts >= 3) {
                vendor.setLockUntil(LocalDateTime.now().plusMinutes(15));
            }
            vendorRepository.save(vendor);
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Contraseña incorrecta");
        }

        vendor.setFailedLoginAttempts(0);
        vendor.setLockUntil(null);
        vendorRepository.save(vendor);

        String token = jwtService.generateToken(vendor.getEmail());

        return new AuthResponse(
                token,
                vendor.getEmail(),
                vendor.getRole().name(),
                vendor.getNombre()
        );
    }

    @Override
    public Vendor getRemoteVendor(String token) {
        if (token != null && token.startsWith("Bearer ")) {
            token = token.substring(7);
        }
        String email = jwtService.extractUsername(token);
        return vendorRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("Vendor no encontrado con el token provisto"));
    }

    @Override
    @Transactional
    public void forgotPassword(ForgotPasswordRequest request) {
        String email = request.getEmail().trim().toLowerCase();
        String userType = null;

        if (userRepository.existsByEmail(email)) {
            userType = "USER";
        } else if (vendorRepository.existsByEmail(email)) {
            userType = "VENDOR";
        }

        if (userType == null) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "El correo no está registrado");
        }

        tokenRepository.deleteByEmailAndUserType(email, userType);

        String token = UUID.randomUUID().toString();
        PasswordResetToken resetToken = new PasswordResetToken();
        resetToken.setToken(token);
        resetToken.setEmail(email);
        resetToken.setUserType(userType);
        resetToken.setExpiryDate(LocalDateTime.now().plusHours(1));

        tokenRepository.save(resetToken);

        sendRecoveryEmail(email, token);
    }

    private void sendRecoveryEmail(String email, String token) {
        String resetUrl = frontendUrl + "/reset-password?token=" + token;

        SimpleMailMessage message = new SimpleMailMessage();
        message.setTo(email);
        message.setSubject("Recuperación de Contraseña - Amazonas");
        message.setText("Hola,\n\n"
                + "Has solicitado restablecer tu contraseña en Amazonas.\n"
                + "Por favor, haz clic en el siguiente enlace para completar el proceso:\n"
                + resetUrl + "\n\n"
                + "Este enlace expirará en 1 hora.\n\n"
                + "Si no solicitaste este cambio, puedes ignorar este correo.\n\n"
                + "Soporte Amazonas");

        mailSender.send(message);
    }

    @Override
    @Transactional
    public void resetPassword(ResetPasswordRequest request) {
        PasswordResetToken resetToken = tokenRepository.findByToken(request.getToken())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.BAD_REQUEST, "Token de recuperación inválido o inexistente"));

        if (resetToken.isExpired()) {
            tokenRepository.delete(resetToken);
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "El token de recuperación ha expirado");
        }

        String email = resetToken.getEmail();
        String encodedPassword = passwordEncoder.encode(request.getNewPassword());

        if ("USER".equals(resetToken.getUserType())) {
            User user = userRepository.findByEmail(email)
                    .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Usuario no encontrado"));
            user.setPassword(encodedPassword);
            userRepository.save(user);
        } else if ("VENDOR".equals(resetToken.getUserType())) {
            Vendor vendor = vendorRepository.findByEmail(email)
                    .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Vendor no encontrado"));
            vendor.setPassword(encodedPassword);
            vendorRepository.save(vendor);
        }

        tokenRepository.delete(resetToken);
    }
}