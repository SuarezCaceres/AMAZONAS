package com.amazonas.backend.modules.vendor.service;

import java.util.List;
import com.amazonas.backend.modules.vendor.dto.DashboardStatsResponse;
import com.amazonas.backend.modules.vendor.dto.MaquetaStatsResponse;
import com.amazonas.backend.modules.vendor.dto.ProductAnalysisResponse;

public interface VendorService {
    DashboardStatsResponse getDashboardStats();
    MaquetaStatsResponse getMaquetaStats();
    List<ProductAnalysisResponse> getProductAnalysis();
}
