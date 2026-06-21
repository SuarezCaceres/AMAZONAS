package com.amazonas.backend.modules.files.service.impl;

import com.amazonas.backend.modules.files.service.CloudinaryService;
import com.cloudinary.Cloudinary;
import com.cloudinary.utils.ObjectUtils;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.util.Map;
import java.util.Set;

@Service
@RequiredArgsConstructor
public class CloudinaryServiceImpl implements CloudinaryService {

    private final Cloudinary cloudinary;

    /**
     * Content-Types permitidos para subida de archivos de referencia de maquetas.
     * Las imágenes se suben con resource_type=image; los documentos con resource_type=raw.
     */
    private static final Set<String> ALLOWED_TYPES = Set.of(
            // Imágenes
            "image/jpeg",
            "image/png",
            "image/gif",
            "image/webp",
            "image/svg+xml",
            // PDF
            "application/pdf",
            // Microsoft Word
            "application/msword",
            "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            // Texto plano
            "text/plain"
    );

    @Override
    public String uploadFile(MultipartFile file) throws IOException {
        if (file.isEmpty()) {
            throw new IllegalArgumentException("El archivo está vacío");
        }

        String contentType = file.getContentType();
        if (contentType == null || !ALLOWED_TYPES.contains(contentType)) {
            throw new IllegalArgumentException(
                "Tipo de archivo no permitido: " + contentType +
                ". Se aceptan: imágenes (JPEG, PNG, GIF, WEBP, SVG), PDF, Word (.doc/.docx) y texto plano."
            );
        }

        // Cloudinary requiere resource_type="image" para imágenes
        // y resource_type="raw" para documentos, PDFs y cualquier otro archivo binario.
        String resourceType = contentType.startsWith("image/") ? "image" : "raw";

        Map<?, ?> uploadResult = cloudinary.uploader().upload(
                file.getBytes(),
                ObjectUtils.asMap(
                        "folder", "amazonas_maquetas",
                        "resource_type", resourceType
                )
        );

        return uploadResult.get("secure_url").toString();
    }
}
