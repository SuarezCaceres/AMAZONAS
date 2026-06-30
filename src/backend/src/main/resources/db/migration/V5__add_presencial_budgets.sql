-- Hacemos solicitud_id nullable para permitir presupuestos presenciales
ALTER TABLE budgets ALTER COLUMN solicitud_id DROP NOT NULL;

-- Agregamos columnas para datos del cliente en presupuestos presenciales
ALTER TABLE budgets ADD COLUMN IF NOT EXISTS cliente_nombre VARCHAR(255);
ALTER TABLE budgets ADD COLUMN IF NOT EXISTS cliente_email VARCHAR(150);
ALTER TABLE budgets ADD COLUMN IF NOT EXISTS cliente_telefono VARCHAR(15);
ALTER TABLE budgets ADD COLUMN IF NOT EXISTS es_presencial BOOLEAN NOT NULL DEFAULT FALSE;
