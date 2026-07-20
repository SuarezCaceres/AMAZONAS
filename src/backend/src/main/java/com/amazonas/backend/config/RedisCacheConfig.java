package com.amazonas.backend.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.data.redis.cache.RedisCacheConfiguration;
import org.springframework.data.redis.cache.RedisCacheManager;
import org.springframework.data.redis.connection.RedisConnectionFactory;
import org.springframework.data.redis.serializer.GenericJackson2JsonRedisSerializer;
import org.springframework.data.redis.serializer.RedisSerializationContext;
import org.springframework.data.redis.serializer.StringRedisSerializer;
import org.springframework.cache.annotation.CachingConfigurer;
import org.springframework.cache.interceptor.CacheErrorHandler;
import org.springframework.cache.interceptor.SimpleCacheErrorHandler;
import org.springframework.cache.Cache;
import com.fasterxml.jackson.annotation.JsonTypeInfo;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.SerializationFeature;
import com.fasterxml.jackson.databind.jsontype.impl.LaissezFaireSubTypeValidator;
import com.fasterxml.jackson.databind.json.JsonMapper;
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule;

import lombok.extern.slf4j.Slf4j;

import java.time.Duration;
import java.util.HashMap;
import java.util.Map;

/**
 * Configuración explícita del CacheManager de Redis.
 *
 * <p>Usa {@code GenericJackson2JsonRedisSerializer} con un ObjectMapper configurado
 * con Default Typing y CachingConfigurer para manejo resiliente de errores de caché.</p>
 */
@Configuration
@Slf4j
public class RedisCacheConfig implements CachingConfigurer {

    @Bean
    public RedisCacheManager cacheManager(RedisConnectionFactory connectionFactory) {

        // ObjectMapper personalizado para Redis
        ObjectMapper objectMapper = JsonMapper.builder()
                .addModule(new JavaTimeModule()) // Soporte para LocalDateTime y LocalDate
                .configure(SerializationFeature.WRITE_DATES_AS_TIMESTAMPS, false)
                // Ignora propiedades desconocidas como '@class' en Records (clases final)
                .configure(com.fasterxml.jackson.databind.DeserializationFeature.FAIL_ON_UNKNOWN_PROPERTIES, false)
                // Activa el tipado por defecto (polimorfismo) para guardar la información de la clase (incluyendo Records)
                .activateDefaultTyping(
                    LaissezFaireSubTypeValidator.instance,
                    ObjectMapper.DefaultTyping.NON_FINAL,
                    JsonTypeInfo.As.PROPERTY
                )
                .build();

        GenericJackson2JsonRedisSerializer jsonSerializer = new GenericJackson2JsonRedisSerializer(objectMapper);

        // Configuración base: JSON + sin nulls + TTL global de 1 hora
        RedisCacheConfiguration defaultConfig = RedisCacheConfiguration.defaultCacheConfig()
                .entryTtl(Duration.ofHours(1))
                .disableCachingNullValues()
                .serializeKeysWith(
                    RedisSerializationContext.SerializationPair.fromSerializer(new StringRedisSerializer())
                )
                .serializeValuesWith(
                    RedisSerializationContext.SerializationPair.fromSerializer(jsonSerializer)
                );

        // TTLs específicos por nombre de caché
        Map<String, RedisCacheConfiguration> cacheConfigs = new HashMap<>();

        // Caché de presupuesto individual (por solicitudId) — 10 minutos
        cacheConfigs.put("presupuestos", defaultConfig.entryTtl(Duration.ofMinutes(10)));

        // Caché de lista completa de presupuestos (admin) — 5 minutos
        cacheConfigs.put("presupuestos-todos", defaultConfig.entryTtl(Duration.ofMinutes(5)));

        // Caché de solicitudes por email de usuario — 5 minutos
        cacheConfigs.put("solicitudes", defaultConfig.entryTtl(Duration.ofMinutes(5)));

        // Caché de lista completa de solicitudes (admin) — 5 minutos
        cacheConfigs.put("solicitudes-todas", defaultConfig.entryTtl(Duration.ofMinutes(5)));

        // Caché de materiales (cambian muy poco) — 30 minutos
        cacheConfigs.put("materials", defaultConfig.entryTtl(Duration.ofMinutes(30)));

        return RedisCacheManager.builder(connectionFactory)
                .cacheDefaults(defaultConfig)
                .withInitialCacheConfigurations(cacheConfigs)
                .build();
    }

    /**
     * Manejador de errores de caché: Si Redis falla al leer o deserializar un objeto corrupto,
     * se loguea una advertencia, se evicta la clave y se consulta directamente la BD sin lanzar 500.
     */
    @Override
    public CacheErrorHandler errorHandler() {
        return new SimpleCacheErrorHandler() {
            @Override
            public void handleCacheGetError(RuntimeException exception, Cache cache, Object key) {
                log.warn("Error al leer cache Redis '{}' para la clave '{}'. Evictando clave corrupta y consultando BD.", cache.getName(), key, exception);
                try {
                    cache.evict(key);
                } catch (Exception e) {
                    log.error("No se pudo evictar la clave corrupta de Redis", e);
                }
            }

            @Override
            public void handleCachePutError(RuntimeException exception, Cache cache, Object key, Object value) {
                log.warn("Error al escribir en cache Redis '{}' para la clave '{}'.", cache.getName(), key, exception);
            }

            @Override
            public void handleCacheEvictError(RuntimeException exception, Cache cache, Object key) {
                log.warn("Error al evictar de cache Redis '{}' para la clave '{}'.", cache.getName(), key, exception);
            }

            @Override
            public void handleCacheClearError(RuntimeException exception, Cache cache) {
                log.warn("Error al limpiar cache Redis '{}'.", cache.getName(), exception);
            }
        };
    }
}

