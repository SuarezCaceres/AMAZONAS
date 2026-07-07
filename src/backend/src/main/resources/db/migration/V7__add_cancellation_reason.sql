-- ============================================================================
-- V7__add_cancellation_reason.sql
-- Migración Flyway: Añadir motivo de cancelación y estado RECHAZADO
-- ============================================================================

-- Agregar el valor RECHAZADO al enum existente
ALTER TYPE estado_solicitud ADD VALUE 'RECHAZADO';

-- Añadir la columna motivo_cancelacion a la tabla purchase_requests
ALTER TABLE purchase_requests ADD COLUMN motivo_cancelacion TEXT;
