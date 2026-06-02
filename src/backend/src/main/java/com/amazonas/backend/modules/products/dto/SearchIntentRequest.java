package com.amazonas.backend.modules.products.dto;

import jakarta.validation.constraints.NotBlank;

public class SearchIntentRequest {

    @NotBlank(message = "La consulta de búsqueda no puede estar vacía")
    private String query;

    public SearchIntentRequest() {
    }

    public SearchIntentRequest(String query) {
        this.query = query;
    }

    public String getQuery() {
        return query;
    }

    public void setQuery(String query) {
        this.query = query;
    }
}
