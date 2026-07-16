package com.amazonas.backend.modules.files.controller;

import com.amazonas.backend.modules.files.service.CloudinaryService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.util.Map;

@RestController
@RequestMapping("/api/files")
@RequiredArgsConstructor
public class FileController {

    private final CloudinaryService cloudinaryService;

    /**
     * Sube un archivo a Cloudinary de manera síncrona.
     *
     * NOTA: El endpoint es síncrono (no CompletableFuture) para garantizar
     * que el SecurityContext de Spring Security esté disponible durante toda
     * la ejecución de la petición. El uso de CompletableFuture causaba 401
     * porque el async dispatch creaba un nuevo contexto vacío sin autenticación.
     */
    @PostMapping("/upload")
    public ResponseEntity<Object> uploadFile(@RequestParam("file") MultipartFile file) {
        try {
            String fileUrl = cloudinaryService.uploadFile(file);
            return ResponseEntity.ok((Object) Map.of("url", fileUrl));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.status(400).body((Object) Map.of("error", e.getMessage()));
        } catch (IOException e) {
            return ResponseEntity.status(500).body((Object) Map.of("error", "Error al subir el archivo: " + e.getMessage()));
        }
    }
}
