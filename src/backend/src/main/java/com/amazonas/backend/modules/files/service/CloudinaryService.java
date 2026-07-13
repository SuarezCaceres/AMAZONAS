package com.amazonas.backend.modules.files.service;

import org.springframework.web.multipart.MultipartFile;
import java.io.IOException;
import java.util.concurrent.CompletableFuture;

public interface CloudinaryService {
    String uploadFile(MultipartFile file) throws IOException;
    CompletableFuture<String> uploadFileAsync(MultipartFile file);
}
