package com.amazonas.backend.modules.vendor.controller;

import java.util.List;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.amazonas.backend.modules.vendor.dto.DashboardStatsResponse;
import com.amazonas.backend.modules.vendor.dto.MaquetaStatsResponse;
import com.amazonas.backend.modules.vendor.dto.ProductAnalysisResponse;
import com.amazonas.backend.modules.vendor.service.VendorService;

import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/api/admin")
@RequiredArgsConstructor
public class VendorController {

    private final VendorService vendorService;

    @GetMapping("/dashboard/stats")
    public ResponseEntity<DashboardStatsResponse> getDashboardStats() {
        return ResponseEntity.ok(vendorService.getDashboardStats());
    }

    @GetMapping("/maquetas/stats")
    public ResponseEntity<MaquetaStatsResponse> getMaquetaStats() {
        return ResponseEntity.ok(vendorService.getMaquetaStats());
    }

    @GetMapping("/analysis/products")
    public ResponseEntity<List<ProductAnalysisResponse>> getProductAnalysis() {
        return ResponseEntity.ok(vendorService.getProductAnalysis());
    }
}
