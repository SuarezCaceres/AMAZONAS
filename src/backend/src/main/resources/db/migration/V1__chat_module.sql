-- ============================================================================
-- V1__chat_module.sql
-- Migración Flyway: Módulo de Chat y Negociación
-- Tablas: chat_rooms, chat_messages, chat_offers, chat_extras
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. ENUMs del módulo de chat
-- ----------------------------------------------------------------------------

DO $$ BEGIN
    CREATE TYPE chat_room_status AS ENUM (
        'OPEN',        -- Negociación activa
        'AGREED',      -- Precio acordado, pendiente de pago
        'CLOSED',      -- Cerrado
        'ARCHIVED'     -- Archivado
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    CREATE TYPE chat_message_type AS ENUM (
        'TEXT',
        'OFFER',
        'BUDGET',
        'FILE',
        'VOUCHER',
        'SYSTEM'
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    CREATE TYPE chat_offer_status AS ENUM (
        'PENDING',
        'ACCEPTED',
        'REJECTED',
        'COUNTERED',
        'EXPIRED'
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    CREATE TYPE chat_sender_role AS ENUM ('CLIENT', 'VENDOR', 'SYSTEM');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ----------------------------------------------------------------------------
-- 2. SALAS DE CHAT
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS chat_rooms (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    request_id      UUID NOT NULL UNIQUE REFERENCES purchase_requests(id) ON DELETE CASCADE,
    client_id       UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    vendor_id       UUID NOT NULL REFERENCES vendors(id) ON DELETE CASCADE,
    status          VARCHAR(50) NOT NULL DEFAULT 'OPEN',
    agreed_price    NUMERIC(10,2),
    last_message_at TIMESTAMPTZ,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE OR REPLACE TRIGGER trg_chat_rooms_updated_at
    BEFORE UPDATE ON chat_rooms
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ----------------------------------------------------------------------------
-- 3. MENSAJES DEL CHAT
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS chat_messages (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    room_id         UUID NOT NULL REFERENCES chat_rooms(id) ON DELETE CASCADE,
    sender_id       UUID NOT NULL,
    sender_role     VARCHAR(50) NOT NULL,
    message_type    VARCHAR(50) NOT NULL DEFAULT 'TEXT',
    content         TEXT NOT NULL,
    metadata        JSONB,
    is_read         BOOLEAN NOT NULL DEFAULT FALSE,
    sent_at         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ----------------------------------------------------------------------------
-- 4. OFERTAS DE PRECIO
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS chat_offers (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    room_id         UUID NOT NULL REFERENCES chat_rooms(id) ON DELETE CASCADE,
    message_id      UUID REFERENCES chat_messages(id) ON DELETE SET NULL,
    proposer_id     UUID NOT NULL,
    proposer_role   VARCHAR(50) NOT NULL,
    proposed_price  NUMERIC(10,2) NOT NULL CHECK (proposed_price > 0),
    note            TEXT,
    status          VARCHAR(50) NOT NULL DEFAULT 'PENDING',
    responded_at    TIMESTAMPTZ,
    expires_at      TIMESTAMPTZ,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ----------------------------------------------------------------------------
-- 5. EXTRAS / SERVICIOS ADICIONALES
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS chat_extras (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    room_id         UUID NOT NULL REFERENCES chat_rooms(id) ON DELETE CASCADE,
    nombre          VARCHAR(200) NOT NULL,
    descripcion     TEXT,
    precio          NUMERIC(10,2) NOT NULL CHECK (precio >= 0),
    aceptado        BOOLEAN,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE OR REPLACE TRIGGER trg_chat_extras_updated_at
    BEFORE UPDATE ON chat_extras
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ----------------------------------------------------------------------------
-- 6. ÍNDICES DE RENDIMIENTO
-- ----------------------------------------------------------------------------

CREATE INDEX IF NOT EXISTS idx_chat_rooms_request  ON chat_rooms(request_id);
CREATE INDEX IF NOT EXISTS idx_chat_rooms_client   ON chat_rooms(client_id);
CREATE INDEX IF NOT EXISTS idx_chat_rooms_vendor   ON chat_rooms(vendor_id);
CREATE INDEX IF NOT EXISTS idx_chat_rooms_status   ON chat_rooms(status) WHERE status = 'OPEN';

CREATE INDEX IF NOT EXISTS idx_chat_messages_room_sent ON chat_messages(room_id, sent_at DESC);
CREATE INDEX IF NOT EXISTS idx_chat_messages_sender     ON chat_messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_unread     ON chat_messages(room_id, is_read) WHERE is_read = FALSE;

CREATE INDEX IF NOT EXISTS idx_chat_offers_room    ON chat_offers(room_id);
CREATE INDEX IF NOT EXISTS idx_chat_offers_pending ON chat_offers(room_id, status) WHERE status = 'PENDING';

CREATE INDEX IF NOT EXISTS idx_chat_extras_room    ON chat_extras(room_id);
