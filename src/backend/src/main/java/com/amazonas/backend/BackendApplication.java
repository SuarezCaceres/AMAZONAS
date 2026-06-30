package com.amazonas.backend;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

import org.springframework.context.annotation.Bean;
import org.springframework.boot.CommandLineRunner;
import org.springframework.jdbc.core.JdbcTemplate;

@SpringBootApplication
@org.springframework.cache.annotation.EnableCaching
public class BackendApplication {

    public static void main(String[] args) {
        SpringApplication.run(BackendApplication.class, args);
    }

    @Bean
    public CommandLineRunner initDatabaseSchema(JdbcTemplate jdbcTemplate) {
        return args -> {
            try {
                // Asegurar columnas en la tabla budgets para presupuestos presenciales
                jdbcTemplate.execute("ALTER TABLE budgets ALTER COLUMN solicitud_id DROP NOT NULL");
                jdbcTemplate.execute("ALTER TABLE budgets ADD COLUMN IF NOT EXISTS cliente_nombre VARCHAR(255)");
                jdbcTemplate.execute("ALTER TABLE budgets ADD COLUMN IF NOT EXISTS cliente_email VARCHAR(150)");
                jdbcTemplate.execute("ALTER TABLE budgets ADD COLUMN IF NOT EXISTS cliente_telefono VARCHAR(15)");
                jdbcTemplate.execute("ALTER TABLE budgets ADD COLUMN IF NOT EXISTS es_presencial BOOLEAN NOT NULL DEFAULT FALSE");
                jdbcTemplate.execute("ALTER TABLE budgets ADD COLUMN IF NOT EXISTS is_custom BOOLEAN NOT NULL DEFAULT FALSE");
                jdbcTemplate.execute("ALTER TABLE budgets ADD COLUMN IF NOT EXISTS is_kit BOOLEAN NOT NULL DEFAULT FALSE");
                System.out.println(">>> DATABASE SCHEMA INITIALIZED SUCCESSFULLY (BUDGET COLUMNS ENSURED) <<<");
            } catch (Exception e) {
                System.err.println(">>> Failed to initialize database schema: " + e.getMessage());
            }
        };
    }
}
