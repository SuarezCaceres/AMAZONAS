package com.amazonas.backend.modules.products.service.impl;

import java.util.Locale;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import com.amazonas.backend.modules.products.dto.SearchIntentResponse;
import com.amazonas.backend.modules.products.service.SearchIntentService;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;

@Service
public class SearchIntentServiceImpl implements SearchIntentService {

    private static final Logger log = LoggerFactory.getLogger(SearchIntentServiceImpl.class);

    @Value("${gemini.api.key:}")
    private String geminiApiKey;

    private final RestTemplate restTemplate = new RestTemplate();
    private final ObjectMapper objectMapper = new ObjectMapper();

    // Caché en memoria para evitar llamadas redundantes de IA para el mismo query
    private final Map<String, SearchIntentResponse> cacheMap = new ConcurrentHashMap<>();

    @Override
    public SearchIntentResponse classifyIntent(String query) {
        if (query == null || query.trim().isEmpty()) {
            return new SearchIntentResponse("SEARCH", null, 0, "Búsqueda vacía.");
        }

        String normalizedQuery = query.trim().toLowerCase(Locale.ROOT);

        // 1. Verificar Caché local
        if (cacheMap.containsKey(normalizedQuery)) {
            log.info("Intención de búsqueda resuelta desde caché: '{}'", normalizedQuery);
            return cacheMap.get(normalizedQuery);
        }

        // 2. Coincidencia semántica basada en Reglas Locales y Sinónimos
        SearchIntentResponse localMatch = checkLocalRules(normalizedQuery);
        if (localMatch != null) {
            log.info("Intención de búsqueda resuelta localmente por reglas: '{}'", normalizedQuery);
            cacheMap.put(normalizedQuery, localMatch);
            return localMatch;
        }

        // 3. Fallback a Clasificación por Inteligencia Artificial (Gemini API)
        if (geminiApiKey == null || geminiApiKey.trim().isEmpty()) {
            log.warn("Gemini API Key no configurada. Saltando clasificación por IA.");
            return fallbackSearch(query);
        }

        try {
            log.info("Llamando a la API de Gemini para clasificar intención de: '{}'", query);
            SearchIntentResponse aiMatch = callGeminiAPI(query);
            if (aiMatch != null) {
                cacheMap.put(normalizedQuery, aiMatch);
                return aiMatch;
            }
        } catch (Exception e) {
            log.error("Error al llamar o procesar la API de Gemini para clasificar la intención", e);
        }

        return fallbackSearch(query);
    }

    private SearchIntentResponse checkLocalRules(String query) {
        // Regla para Personalización directa
        if (query.contains("personaliza") || query.contains("a medida") || 
            query.contains("mi gusto") || query.contains("crear maqueta") || 
            query.contains("diseñar maqueta") || query.contains("nueva maqueta")) {
            return new SearchIntentResponse("CUSTOMIZE", null, 100, 
                "El usuario expresó interés directo en personalizar o crear una maqueta.");
        }

        // Reglas para categoría "Educativo"
        if (query.contains("colegio") || query.contains("escuela") || 
            query.contains("escolar") || query.contains("clase") || 
            query.contains("aula") || query.contains("estudiante") || 
            query.contains("educativ") || query.contains("tarea") ||
            query.contains("logro")) {
            return new SearchIntentResponse("SEARCH", "Educativo", 95, 
                "Búsqueda escolar o colegial mapeada a la categoría Educativo.");
        }

        // Reglas para categoría "Ciencia"
        if (query.contains("ciencia") || query.contains("experimento") || 
            query.contains("quimica") || query.contains("química") || 
            query.contains("fisica") || query.contains("física") || 
            query.contains("biologia") || query.contains("biología") || 
            query.contains("célula") || query.contains("celula") || 
            query.contains("solar") || query.contains("planeta")) {
            return new SearchIntentResponse("SEARCH", "Ciencia", 95, 
                "Intención asociada a ciencias naturales o experimentos espaciales.");
        }

        // Reglas para categoría "Arquitectura"
        if (query.contains("arquitectura") || query.contains("construccion") || 
            query.contains("construcción") || query.contains("edificio") || 
            query.contains("casa") || query.contains("puente") || 
            query.contains("historico") || query.contains("histórico") || 
            query.contains("cultura") || query.contains("civilizacion") ||
            query.contains("antiguo") || query.contains("historia")) {
            return new SearchIntentResponse("SEARCH", "Arquitectura", 90, 
                "Maquetas de edificaciones, diseño arquitectónico o representaciones históricas.");
        }

        // Reglas para categoría "Inclusivo"
        if (query.contains("inclusiv") || query.contains("inclusion") || 
            query.contains("inclusión") || query.contains("discapacidad") || 
            query.contains("habilidades diferentes") || query.contains("sensorial") || 
            query.contains("braille") || query.contains("tactil") || 
            query.contains("táctil") || query.contains("ciego")) {
            return new SearchIntentResponse("SEARCH", "Inclusivo", 95, 
                "Material educativo táctil o adaptado para inclusión escolar.");
        }

        return null;
    }

    private SearchIntentResponse callGeminiAPI(String query) throws Exception {
        String url = "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=" + geminiApiKey;

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);

        String prompt = "Analiza la intención de esta búsqueda del usuario en un catálogo de maquetas: \"" + query + "\". "
                + "Categorías de maquetas disponibles: \"Ciencia\", \"Arquitectura\", \"Educativo\", \"Inclusivo\". "
                + "Además, si el usuario desea crear o personalizar una maqueta desde cero o a medida, determina si la acción es \"CUSTOMIZE\". "
                + "Responde ÚNICAMENTE en formato JSON con la siguiente estructura, sin bloques de código ```json o formato markdown adicional:\n"
                + "{\n"
                + "  \"action\": \"SEARCH\" o \"CUSTOMIZE\",\n"
                + "  \"categoria\": \"NombreCategoria_Exacta_O_null\",\n"
                + "  \"confianza\": valor_de_0_a_100,\n"
                + "  \"explicacion\": \"breve explicación de la decisión en español\"\n"
                + "}";

        // Construir JSON payload para Gemini
        String jsonPayload = objectMapper.writeValueAsString(Map.of(
            "contents", new Object[] {
                Map.of("parts", new Object[] {
                    Map.of("text", prompt)
                })
            }
        ));

        HttpEntity<String> request = new HttpEntity<>(jsonPayload, headers);
        ResponseEntity<String> response = restTemplate.postForEntity(url, request, String.class);

        if (response.getStatusCode().is2xxSuccessful() && response.getBody() != null) {
            JsonNode root = objectMapper.readTree(response.getBody());
            JsonNode candidate = root.path("candidates").get(0);
            String text = candidate.path("content").path("parts").get(0).path("text").asText().trim();

            // Limpieza básica de markdown ticks que Gemini suele enviar por inercia
            if (text.startsWith("```json")) {
                text = text.substring(7);
            }
            if (text.endsWith("```")) {
                text = text.substring(0, text.length() - 3);
            }
            text = text.trim();

            JsonNode intentNode = objectMapper.readTree(text);
            String action = intentNode.path("action").asText("SEARCH");
            String categoria = intentNode.path("categoria").isNull() ? null : intentNode.path("categoria").asText(null);
            int confianza = intentNode.path("confianza").asInt(0);
            String explicacion = intentNode.path("explicacion").asText("");

            // Normalización de la categoría detectada
            if (categoria != null) {
                categoria = normalizeCategoryName(categoria);
            }

            return new SearchIntentResponse(action, categoria, confianza, explicacion);
        }

        return null;
    }

    private String normalizeCategoryName(String cat) {
        String lower = cat.toLowerCase(Locale.ROOT);
        if (lower.contains("ciencia")) return "Ciencia";
        if (lower.contains("arquitectura")) return "Arquitectura";
        if (lower.contains("educativ")) return "Educativo";
        if (lower.contains("inclusiv")) return "Inclusivo";
        return null;
    }

    private SearchIntentResponse fallbackSearch(String query) {
        return new SearchIntentResponse("SEARCH", null, 0, 
            "No se pudo determinar intencionalidad semántica específica. Se aplica búsqueda convencional.");
    }
}
