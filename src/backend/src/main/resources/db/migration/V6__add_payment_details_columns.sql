-- Agregar columnas adicionales para detalles de pago a la tabla payment_transactions
ALTER TABLE payment_transactions ADD COLUMN IF NOT EXISTS monto_recibido NUMERIC(10,2);
ALTER TABLE payment_transactions ADD COLUMN IF NOT EXISTS vuelto NUMERIC(10,2);
ALTER TABLE payment_transactions ADD COLUMN IF NOT EXISTS codigo_seguridad VARCHAR(100);
ALTER TABLE payment_transactions ADD COLUMN IF NOT EXISTS voucher_url TEXT;
