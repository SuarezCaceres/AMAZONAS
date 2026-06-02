-- ============================================================================
-- MIGRACIÓN DE BASE DE DATOS V3 - BLOQUEO DE VENDEDORES (AMAZONAS)
-- ============================================================================

-- Agregar columnas para bloqueo de seguridad por fuerza bruta en la tabla de vendors sin alterar datos existentes
ALTER TABLE vendors ADD COLUMN IF NOT EXISTS failed_login_attempts INTEGER DEFAULT 0 NOT NULL;
ALTER TABLE vendors ADD COLUMN IF NOT EXISTS lock_until TIMESTAMPTZ;
