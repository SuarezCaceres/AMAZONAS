package com.amazonas.backend.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.data.redis.cache.RedisCacheConfiguration;
import org.springframework.data.redis.cache.RedisCacheManager;
import org.springframework.data.redis.connection.RedisConnectionFactory;
import org.springframework.data.redis.serializer.GenericJackson2JsonRedisSerializer;
import org.springframework.data.redis.serializer.RedisSerializationContext;
import org.springframework.data.redis.serializer.StringRedisSerializer;

import java.time.Duration;
import java.util.HashMap;
import java.util.Map;

/**
 * Configuración explícita del CacheManager de Redis.
 *
 * <p>Usa serialización JSON (GenericJackson2JsonRedisSerializer) para que los DTOs
 * (BudgetResponse, PurchaseRequestResponse) se guarden como JSON legible en Redis
 * en lugar de bytes Java binarios. Esto facilita la depuración con redis-cli.</p>
 *
 * <p>TTLs por cache:
 * <ul>
 *   <li><b>presupuestos</b>     — 10 min: los presupuestos cambian con poca frecuencia.</li>
 *   <li><b>presupuestos-todos</b> — 5 min: lista global, se invalida ante cualquier cambio.</li>
 *   <li><b>solicitudes</b>      — 5 min: las solicitudes cambian más frecuentemente.</li>
 * </ul>
 * </p>
 */
@Configuration
public class RedisCacheConfig {

    @Bean
    public RedisCacheManager cacheManager(RedisConnectionFactory connectionFactory) {

        // Configuración base: JSON + sin nulls + TTL global de 1 hora
        RedisCacheConfiguration defaultConfig = RedisCacheConfiguration.defaultCacheConfig()
                .entryTtl(Duration.ofHours(1))
                .disableCachingNullValues()
                .serializeKeysWith(
                    RedisSerializationContext.SerializationPair.fromSerializer(new StringRedisSerializer())
                )
                .serializeValuesWith(
                    RedisSerializationContext.SerializationPair.fromSerializer(
                        new GenericJackson2JsonRedisSerializer()
                    )
                );

        // TTLs específicos por nombre de caché
        Map<String, RedisCacheConfiguration> cacheConfigs = new HashMap<>();

        // Caché de presupuesto individual (por solicitudId) — 10 minutos
        cacheConfigs.put("presupuestos", defaultConfig.entryTtl(Duration.ofMinutes(10)));

        // Caché de lista completa de presupuestos (admin) — 5 minutos
        cacheConfigs.put("presupuestos-todos", defaultConfig.entryTtl(Duration.ofMinutes(5)));

        // Caché de solicitudes por email de usuario — 5 minutos
        cacheConfigs.put("solicitudes", defaultConfig.entryTtl(Duration.ofMinutes(5)));

        return RedisCacheManager.builder(connectionFactory)
                .cacheDefaults(defaultConfig)
                .withInitialCacheConfigurations(cacheConfigs)
                .build();
    }
}
