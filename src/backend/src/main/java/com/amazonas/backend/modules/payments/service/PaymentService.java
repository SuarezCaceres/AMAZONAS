package com.amazonas.backend.modules.payments.service;

import com.amazonas.backend.modules.payments.dto.DailyStatsResponse;
import com.amazonas.backend.modules.payments.dto.RegisterPaymentRequest;
import com.amazonas.backend.modules.payments.model.PaymentTransaction;

public interface PaymentService {
    PaymentTransaction registerPayment(RegisterPaymentRequest request);
    DailyStatsResponse getDailyStats();
}
