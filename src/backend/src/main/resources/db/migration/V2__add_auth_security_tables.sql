-- ============================================================================
-- MIGRACIÓN DE BASE DE DATOS V2 - SEGURIDAD Y UX (AMAZONAS)
-- ============================================================================

-- 1. Agregar columnas para la protección contra fuerza bruta (intentos fallidos y bloqueo temporal)
ALTER TABLE users ADD COLUMN IF NOT EXISTS failed_login_attempts INTEGER DEFAULT 0 NOT NULL;
ALTER TABLE users ADD COLUMN IF NOT EXISTS lock_until TIMESTAMPTZ;

-- 2. Crear tabla de tokens para la recuperación de contraseñas
CREATE TABLE IF NOT EXISTS password_reset_tokens (
    id          UUID          PRIMARY KEY DEFAULT uuid_generate_v4(),
    token       VARCHAR(255)  NOT NULL UNIQUE,
    email       VARCHAR(150)  NOT NULL,
    user_type   VARCHAR(50)   NOT NULL,
    expiry_date TIMESTAMPTZ   NOT NULL,
    created_at  TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

-- 3. Crear índice para mejorar búsquedas de tokens
CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_token ON password_reset_tokens(token);
