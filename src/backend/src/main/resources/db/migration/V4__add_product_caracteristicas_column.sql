-- ============================================================================
-- ADICION DE COLUMNA DE CARACTERISTICAS PARA PRODUCTOS (MAQUETAS)
-- ============================================================================

ALTER TABLE products ADD COLUMN IF NOT EXISTS caracteristicas TEXT[];
