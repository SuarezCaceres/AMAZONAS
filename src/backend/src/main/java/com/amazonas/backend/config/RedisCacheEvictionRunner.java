package com.amazonas.backend.config;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.cache.Cache;
import org.springframework.cache.CacheManager;
import org.springframework.context.annotation.Configuration;

import java.util.List;

/**
 * Al levantar el backend, limpia todas las caches de Redis conocidas.
 * Garantiza que no queden datos corruptos de versiones anteriores del serializador.
 */
@Configuration
public class RedisCacheEvictionRunner implements ApplicationRunner {

    private static final Logger log = LoggerFactory.getLogger(RedisCacheEvictionRunner.class);
    private final CacheManager cacheManager;

    // Lista exhaustiva de todos los nombres de caches registrados en la aplicacion
    private static final List<String> CACHE_NAMES = List.of(
        "presupuestos",
        "presupuestos-todos",
        "solicitudes",
        "solicitudes-todas",
        "materials"
    );

    public RedisCacheEvictionRunner(CacheManager cacheManager) {
        this.cacheManager = cacheManager;
    }

    @Override
    public void run(ApplicationArguments args) {
        log.info("[RedisCacheEvictionRunner] Limpiando caches de Redis al arrancar...");
        CACHE_NAMES.forEach(cacheName -> {
            try {
                Cache cache = cacheManager.getCache(cacheName);
                if (cache != null) {
                    cache.clear();
                    log.info("[RedisCacheEvictionRunner] Cache '{}' limpiada correctamente.", cacheName);
                }
            } catch (Exception ex) {
                log.warn("[RedisCacheEvictionRunner] No se pudo limpiar la cache '{}': {}", cacheName, ex.getMessage());
            }
        });
        log.info("[RedisCacheEvictionRunner] Limpieza de caches completada.");
    }
}
