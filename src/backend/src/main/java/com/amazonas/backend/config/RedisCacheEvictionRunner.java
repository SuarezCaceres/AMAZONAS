package com.amazonas.backend.config;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.cache.CacheManager;
import org.springframework.context.annotation.Configuration;

@Configuration
public class RedisCacheEvictionRunner implements ApplicationRunner {

    private static final Logger log = LoggerFactory.getLogger(RedisCacheEvictionRunner.class);
    private final CacheManager cacheManager;

    public RedisCacheEvictionRunner(CacheManager cacheManager) {
        this.cacheManager = cacheManager;
    }

    @Override
    public void run(ApplicationArguments args) {
        log.info("[RedisCacheEvictionRunner] Limpiando caches de Redis al arrancar...");
        cacheManager.getCacheNames().forEach(cacheName -> {
            var cache = cacheManager.getCache(cacheName);
            if (cache != null) {
                cache.clear();
                log.info("[RedisCacheEvictionRunner] Cache '{}' limpiada.", cacheName);
            }
        });
        log.info("[RedisCacheEvictionRunner] Limpieza completada.");
    }
}
