package com.amazonas.backend.modules.files.controller;

import com.amazonas.backend.modules.files.service.CloudinaryService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.util.Map;
import java.util.concurrent.CompletableFuture;

@RestController
@RequestMapping("/api/files")
@RequiredArgsConstructor
public class FileController {

    private final CloudinaryService cloudinaryService;

    @PostMapping("/upload")
    public CompletableFuture<ResponseEntity<Object>> uploadFile(@RequestParam("file") MultipartFile file) {
        return cloudinaryService.uploadFileAsync(file)
            .thenApply(fileUrl -> ResponseEntity.ok((Object) Map.of("url", fileUrl)))
            .exceptionally(throwable -> {
                Throwable cause = throwable.getCause();
                if (cause == null) {
                    cause = throwable;
                }
                if (cause instanceof IllegalArgumentException) {
                    return ResponseEntity.status(400).body((Object) Map.of("error", cause.getMessage()));
                }
                return ResponseEntity.status(500).body((Object) Map.of("error", "Error al subir el archivo: " + cause.getMessage()));
            });
    }
}
