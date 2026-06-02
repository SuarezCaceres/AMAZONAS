package com.amazonas.backend.modules.auth.service;

import com.amazonas.backend.modules.auth.dto.AuthResponse;
import com.amazonas.backend.modules.auth.dto.LoginRequest;
import com.amazonas.backend.modules.auth.dto.LoginVendorRequest;
import com.amazonas.backend.modules.auth.dto.RegisterRequest;
import com.amazonas.backend.modules.auth.dto.ForgotPasswordRequest;
import com.amazonas.backend.modules.auth.dto.ResetPasswordRequest;
import com.amazonas.backend.modules.vendors.model.Vendor;

public interface AuthService {
    AuthResponse register(RegisterRequest request);
    AuthResponse registerVendor(RegisterRequest request);
    AuthResponse login(LoginRequest request);
    AuthResponse vendorLogin(LoginVendorRequest request);
    Vendor getRemoteVendor(String token);
    void forgotPassword(ForgotPasswordRequest request);
    void resetPassword(ResetPasswordRequest request);
}