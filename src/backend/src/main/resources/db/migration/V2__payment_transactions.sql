-- ============================================================================
-- V2__payment_transactions.sql
-- Migración Flyway: Tabla para registro de transacciones de pago
-- ============================================================================

CREATE TABLE IF NOT EXISTS payment_transactions (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    client_id           UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    room_id             UUID REFERENCES chat_rooms(id) ON DELETE SET NULL,
    monto               NUMERIC(10,2) NOT NULL CHECK (monto >= 0),
    metodo_pago         VARCHAR(50) NOT NULL, -- ONLINE, FISICO
    tipo_abono          VARCHAR(50) NOT NULL,  -- ADELANTO, SALDO, TOTAL
    tipo_maqueta        VARCHAR(50) NOT NULL, -- PREDETERMINADA, PERSONALIZADA
    materiales          TEXT,
    fecha_transaccion   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    codigo_operacion    VARCHAR(255),
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Índices para optimizar consultas de estadísticas y reportes
CREATE INDEX IF NOT EXISTS idx_payment_transactions_client ON payment_transactions(client_id);
CREATE INDEX IF NOT EXISTS idx_payment_transactions_room   ON payment_transactions(room_id);
CREATE INDEX IF NOT EXISTS idx_payment_transactions_fecha  ON payment_transactions(fecha_transaccion DESC);
CREATE INDEX IF NOT EXISTS idx_payment_transactions_metodo ON payment_transactions(metodo_pago);
