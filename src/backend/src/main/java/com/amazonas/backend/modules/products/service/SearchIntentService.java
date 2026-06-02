package com.amazonas.backend.modules.products.service;

import com.amazonas.backend.modules.products.dto.SearchIntentResponse;

public interface SearchIntentService {
    SearchIntentResponse classifyIntent(String query);
}
