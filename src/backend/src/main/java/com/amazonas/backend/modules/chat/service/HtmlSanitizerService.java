package com.amazonas.backend.modules.chat.service;

import org.owasp.html.HtmlPolicyBuilder;
import org.owasp.html.PolicyFactory;
import org.springframework.stereotype.Service;

/**
 * Servicio de sanitización de HTML para mensajes del chat.
 * Previene ataques XSS eliminando etiquetas y atributos peligrosos.
 * Usa la librería OWASP Java HTML Sanitizer.
 *
 * Política: solo texto plano (sin HTML), todos los tags son eliminados.
 * Esto es adecuado para mensajes de chat de texto puro.
 */
@Service
public class HtmlSanitizerService {

    /**
     * Política de sanitización que elimina TODOS los tags HTML.
     * Solo se permite texto plano, sin ninguna etiqueta.
     */
    private static final PolicyFactory PLAIN_TEXT_POLICY =
            new HtmlPolicyBuilder()
                    // No se permite ningún elemento HTML (solo texto)
                    .toFactory();

    /**
     * Sanitiza el contenido de un mensaje eliminando cualquier HTML peligroso.
     *
     * @param rawContent Contenido sin procesar que envía el cliente
     * @return Contenido seguro (solo texto plano)
     */
    public String sanitize(String rawContent) {
        if (rawContent == null || rawContent.isBlank()) {
            return "";
        }
        return PLAIN_TEXT_POLICY.sanitize(rawContent.trim());
    }
}
