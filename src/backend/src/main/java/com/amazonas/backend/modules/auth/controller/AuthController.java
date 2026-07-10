package com.amazonas.backend.modules.auth.controller;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.amazonas.backend.modules.auth.dto.AuthResponse;
import com.amazonas.backend.modules.auth.dto.LoginRequest;
import com.amazonas.backend.modules.auth.dto.LoginVendorRequest;
import com.amazonas.backend.modules.auth.dto.RegisterRequest;
import com.amazonas.backend.modules.auth.dto.ForgotPasswordRequest;
import com.amazonas.backend.modules.auth.dto.ResetPasswordRequest;
import com.amazonas.backend.modules.auth.dto.UserProfileResponse;
import com.amazonas.backend.modules.auth.service.AuthService;
import java.security.Principal;
import com.amazonas.backend.modules.vendors.model.Vendor;
import com.amazonas.backend.modules.users.repository.UserRepository;
import com.amazonas.backend.modules.vendors.repository.VendorRepository;
import java.util.Map;
import java.util.HashMap;
import java.util.stream.Collectors;

import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
public class AuthController {

    private final AuthService authService;
    private final UserRepository userRepository;
    private final VendorRepository vendorRepository;

    @GetMapping("/debug-db")
    public ResponseEntity<Map<String, Object>> debugDb() {
        Map<String, Object> debugInfo = new HashMap<>();
        try {
            debugInfo.put("users", userRepository.findAll().stream()
                .map(u -> u.getEmail() + " (Role: " + u.getRole() + ", ID: " + u.getId() + ")")
                .collect(Collectors.toList()));
        } catch (Exception e) {
            debugInfo.put("users_error", e.getMessage());
        }
        try {
            debugInfo.put("vendors", vendorRepository.findAll().stream()
                .map(v -> v.getEmail() + " (Role: " + v.getRole() + ", ID: " + v.getId() + ")")
                .collect(Collectors.toList()));
        } catch (Exception e) {
            debugInfo.put("vendors_error", e.getMessage());
        }
        return ResponseEntity.ok(debugInfo);
    }

    @PostMapping("/register")
    public ResponseEntity<AuthResponse> register(@RequestBody RegisterRequest request) {
        return ResponseEntity.ok(authService.register(request));
    }

    @PostMapping("/vendor/register")
    public ResponseEntity<AuthResponse> registerVendor(@RequestBody RegisterRequest request) {
        return ResponseEntity.ok(authService.registerVendor(request));
    }

    @PostMapping("/login")
    public ResponseEntity<AuthResponse> login(@RequestBody LoginRequest request) {
        return ResponseEntity.ok(authService.login(request));
    }

    @PostMapping("/vendor/login")
    public ResponseEntity<AuthResponse> vendorLogin(@RequestBody LoginVendorRequest request) {
        return ResponseEntity.ok(authService.vendorLogin(request));
    }

    @GetMapping("/vendor/me")
    public ResponseEntity<Vendor> getVendorMe(@RequestHeader("Authorization") String token) {
        return ResponseEntity.ok(authService.getRemoteVendor(token));
    }

    @GetMapping("/me")
    public ResponseEntity<UserProfileResponse> getCurrentUser(Principal principal) {
        return ResponseEntity.ok(authService.getUserProfile(principal.getName()));
    }

    @PostMapping("/forgot-password")
    public ResponseEntity<Void> forgotPassword(@RequestBody ForgotPasswordRequest request) {
        authService.forgotPassword(request);
        return ResponseEntity.ok().build();
    }

    @PostMapping("/reset-password")
    public ResponseEntity<Void> resetPassword(@RequestBody ResetPasswordRequest request) {
        authService.resetPassword(request);
        return ResponseEntity.ok().build();
    }
}