package com.amazonas.backend.security.service;

import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.stereotype.Service;

import com.amazonas.backend.modules.users.repository.UserRepository;
import com.amazonas.backend.modules.vendors.repository.VendorRepository;

import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class CustomUserDetailsService implements UserDetailsService {

    private final UserRepository userRepository;
    private final VendorRepository vendorRepository;

    @Override
    public UserDetails loadUserByUsername(String email)
            throws UsernameNotFoundException {

        // =========================
        // BUSCAR USER
        // =========================

        return userRepository.findByEmailIgnoreCase(email)
                .map(user -> (UserDetails) user)

                // =========================
                // SI NO EXISTE USER
                // BUSCAR VENDOR
                // =========================

                .orElseGet(() ->
                        vendorRepository.findByEmailIgnoreCase(email)
                                .map(vendor -> (UserDetails) vendor)

                                // =========================
                                // SI NO EXISTE NINGUNO
                                // =========================

                                .orElseThrow(() ->
                                        new UsernameNotFoundException(
                                                "Usuario no encontrado"
                                        )
                                )
                );
    }
}