package com.amazonas.backend.modules.requests.dto;

import java.util.List;

public record RequestFilesUpdateRequest(
    List<String> grabacionesUrls,
    List<String> archivosUrls
) {}
