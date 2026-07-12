package com.amazonas.backend.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.data.redis.cache.RedisCacheConfiguration;
import org.springframework.data.redis.cache.RedisCacheManager;
import org.springframework.data.redis.connection.RedisConnectionFactory;
import org.springframework.data.redis.serializer.GenericJackson2JsonRedisSerializer;
import org.springframework.data.redis.serializer.RedisSerializationContext;
import org.springframework.data.redis.serializer.StringRedisSerializer;
import com.fasterxml.jackson.annotation.JsonTypeInfo;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.SerializationFeature;
import com.fasterxml.jackson.databind.jsontype.impl.LaissezFaireSubTypeValidator;
import com.fasterxml.jackson.databind.json.JsonMapper;
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule;

import java.time.Duration;
import java.util.HashMap;
import java.util.Map;

/**
 * Configuración explícita del CacheManager de Redis.
 *
 * <p>Usa {@code GenericJackson2JsonRedisSerializer} con un ObjectMapper configurado
 * con Default Typing. Esto añade información de clase (@class) en el JSON guardado
 * en Redis para que Jackson pueda deserializar los DTOs complejos (LocalDateTime, Records)
 * de vuelta a sus tipos correspondientes en Java sin producir errores de tipado.</p>
 */
@Configuration
public class RedisCacheConfig {

    @Bean
    public RedisCacheManager cacheManager(RedisConnectionFactory connectionFactory) {

        // ObjectMapper personalizado para Redis
        ObjectMapper objectMapper = JsonMapper.builder()
                .addModule(new JavaTimeModule()) // Soporte para LocalDateTime y LocalDate
                .configure(SerializationFeature.WRITE_DATES_AS_TIMESTAMPS, false)
                // Ignora propiedades desconocidas como '@class' en Records (clases final)
                .configure(com.fasterxml.jackson.databind.DeserializationFeature.FAIL_ON_UNKNOWN_PROPERTIES, false)
                // Activa el tipado por defecto (polimorfismo) para guardar la información de la clase
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

        return RedisCacheManager.builder(connectionFactory)
                .cacheDefaults(defaultConfig)
                .withInitialCacheConfigurations(cacheConfigs)
                .build();
    }
}

