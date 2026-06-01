-- ============================================================================
-- BASE DE DATOS COMPLETA - SISTEMA MAQUETAS EDUCATIVAS AMAZONAS
-- ============================================================================


-- ============================================================================
-- 1. EXTENSIONES
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";


-- ============================================================================
-- 2. TIPOS ENUM
-- ============================================================================

-- Roles de usuario
DO $$ BEGIN
    CREATE TYPE user_role AS ENUM ('CLIENT', 'ADMIN');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Estados de solicitud
DO $$ BEGIN
    CREATE TYPE estado_solicitud AS ENUM ('PENDIENTE', 'PROCESANDO', 'COMPLETADO');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Tipo de remitente en mensajes
DO $$ BEGIN
    CREATE TYPE tipo_remitente AS ENUM ('CLIENT', 'VENDOR');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Estados de pago
DO $$ BEGIN
    CREATE TYPE estado_pago AS ENUM (
        'PENDIENTE_ADELANTO',
        'ADELANTO_CONFIRMADO',
        'PENDIENTE_FINAL',
        'COMPLETADO'
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Acciones de auditoría
DO $$ BEGIN
    CREATE TYPE accion_auditoria AS ENUM (
        'CREATE', 'UPDATE', 'DELETE', 'LOGIN', 'LOGOUT'
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;


-- ============================================================================
-- 3. FUNCIÓN updated_at automático
-- ============================================================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;


-- ============================================================================
-- 4. TABLAS PRINCIPALES
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 4.1 USUARIOS (clientes del sistema)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    nombre VARCHAR(100) NOT NULL,
    email VARCHAR(150) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    telefono VARCHAR(15),
    role user_role NOT NULL DEFAULT 'CLIENT',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ,

    CONSTRAINT check_email_users CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}$')
);

CREATE OR REPLACE TRIGGER trg_users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ----------------------------------------------------------------------------
-- 4.2 VENDEDORES (administradores del negocio)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS vendors (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    nombre VARCHAR(100) NOT NULL,
    email VARCHAR(150) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    role user_role NOT NULL DEFAULT 'ADMIN',
    activo BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE OR REPLACE TRIGGER trg_vendors_updated_at
    BEFORE UPDATE ON vendors
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ----------------------------------------------------------------------------
-- 4.3 CATEGORÍAS DE PRODUCTOS (ciencia, arquitectura, etc.)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS categories (
    id VARCHAR(50) PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL,
    descripcion TEXT,
    orden INTEGER DEFAULT 0
);

-- ----------------------------------------------------------------------------
-- 4.4 CATEGORÍAS DE MATERIALES (cartón, madera, pintura, etc.) ← NUEVO
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS material_categories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    nombre VARCHAR(100) NOT NULL UNIQUE,
    descripcion TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE OR REPLACE TRIGGER trg_material_categories_updated_at
    BEFORE UPDATE ON material_categories
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ----------------------------------------------------------------------------
-- 4.5 MATERIALES (inventario del vendedor)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS materials (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    nombre VARCHAR(100) NOT NULL UNIQUE,
    unidad VARCHAR(20) NOT NULL DEFAULT 'unidad',
    costo_compra NUMERIC(10,2) NOT NULL DEFAULT 0 CHECK (costo_compra >= 0),
    costo_venta NUMERIC(10,2) NOT NULL DEFAULT 0 CHECK (costo_venta >= 0),
    stock_actual INTEGER NOT NULL DEFAULT 0 CHECK (stock_actual >= 0),
    categoria_id UUID REFERENCES material_categories(id) ON DELETE SET NULL,
    proveedor VARCHAR(100),
    activo BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
);

CREATE OR REPLACE TRIGGER trg_materials_updated_at
    BEFORE UPDATE ON materials
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ----------------------------------------------------------------------------
-- 4.6 PRODUCTOS (catálogo de maquetas)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS products (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    titulo VARCHAR(200) NOT NULL,
    descripcion TEXT,
    descripcion_detallada TEXT,
    categoria_id VARCHAR(50) NOT NULL REFERENCES categories(id) ON DELETE RESTRICT,
    image_url VARCHAR(500),
    grado_escolar VARCHAR(50),
    ocasion TEXT[],
    materiales_reciclables BOOLEAN DEFAULT FALSE,
    stock INTEGER NOT NULL DEFAULT 0 CHECK (stock >= 0),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
);

CREATE OR REPLACE TRIGGER trg_products_updated_at
    BEFORE UPDATE ON products
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ----------------------------------------------------------------------------
-- 4.7 PRODUCT_MATERIALS - Relación Maqueta ↔ Material (Many-to-Many) ← NUEVO
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS product_materials (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    material_id UUID NOT NULL REFERENCES materials(id) ON DELETE RESTRICT,
    cantidad_sugerida NUMERIC(10,2) NOT NULL DEFAULT 1 CHECK (cantidad_sugerida > 0),
    es_opcional BOOLEAN NOT NULL DEFAULT FALSE,
    notas TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT uq_product_material UNIQUE (product_id, material_id)
);

-- ----------------------------------------------------------------------------
-- 4.8 PRECIOS DE MAQUETAS COMPLETAS (maqueta ya armada)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS maqueta_prices (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    producto_id UUID NOT NULL UNIQUE REFERENCES products(id) ON DELETE CASCADE,
    precio_completa NUMERIC(10,2) NOT NULL CHECK (precio_completa > 0),
    descripcion TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ----------------------------------------------------------------------------
-- 4.9 PRECIOS DE KITS COMPLETOS (kit de materiales para armar)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS complete_kits (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    producto_id UUID NOT NULL UNIQUE REFERENCES products(id) ON DELETE CASCADE,
    precio_kit NUMERIC(10,2) NOT NULL CHECK (precio_kit > 0),
    descripcion TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ----------------------------------------------------------------------------
-- 4.10 SOLICITUDES DE COMPRA (checkout del cliente)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS purchase_requests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    usuario_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    producto_id UUID REFERENCES products(id) ON DELETE SET NULL,

    -- Datos desnormalizados (snapshot histórico del cliente)
    cliente_nombre VARCHAR(255) NOT NULL,
    cliente_email VARCHAR(150) NOT NULL,
    cliente_telefono VARCHAR(15),
    producto_nombre VARCHAR(200) NOT NULL,

    -- Tipo de solicitud
    is_kit BOOLEAN NOT NULL DEFAULT FALSE,
    is_custom BOOLEAN NOT NULL DEFAULT FALSE,

    -- Estado del pedido
    estado estado_solicitud NOT NULL DEFAULT 'PENDIENTE',

    -- Mensajes y detalles de personalización
    mensaje TEXT,
    descripcion_personalizacion TEXT,
    materiales_deseados TEXT,

    -- Servicio de explicación (datos iniciales del cliente)
    solicitar_explicacion BOOLEAN DEFAULT FALSE,
    tipo_evento VARCHAR(100),
    cantidad_personas INTEGER CHECK (cantidad_personas > 0),

    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
);

CREATE OR REPLACE TRIGGER trg_purchase_requests_updated_at
    BEFORE UPDATE ON purchase_requests
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ----------------------------------------------------------------------------
-- 4.11 KIT_MAQUETAS - Maquetas dentro de un kit ← NUEVO (reemplaza JSONB)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS kit_maquetas (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    purchase_request_id UUID NOT NULL REFERENCES purchase_requests(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
    product_name VARCHAR(255) NOT NULL,
    product_slug VARCHAR(255),
    cantidad INT NOT NULL DEFAULT 1 CHECK (cantidad > 0),
    precio_unitario_referencia NUMERIC(10,2) CHECK (precio_unitario_referencia >= 0),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ----------------------------------------------------------------------------
-- 4.12 KIT_CUSTOMIZED_MATERIALS - Materiales del inventario escogidos ← NUEVO
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS kit_customized_materials (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    purchase_request_id UUID NOT NULL REFERENCES purchase_requests(id) ON DELETE CASCADE,
    material_id UUID NOT NULL REFERENCES materials(id) ON DELETE RESTRICT,
    material_name VARCHAR(255) NOT NULL,
    material_unit VARCHAR(50) NOT NULL,
    cantidad NUMERIC(10,2) NOT NULL CHECK (cantidad > 0),
    costo_unitario_referencia NUMERIC(10,2) NOT NULL CHECK (costo_unitario_referencia >= 0),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ----------------------------------------------------------------------------
-- 4.13 KIT_PERSONAL_MATERIALS - Materiales libres del cliente ← NUEVO
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS kit_personal_materials (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    purchase_request_id UUID NOT NULL REFERENCES purchase_requests(id) ON DELETE CASCADE,
    material_name VARCHAR(255) NOT NULL,
    cantidad NUMERIC(10,2) NOT NULL CHECK (cantidad > 0),
    descripcion TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ----------------------------------------------------------------------------
-- 4.14 REQUEST_PREFERRED_MATERIALS - Preferencias de materiales ← NUEVO
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS request_preferred_materials (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    purchase_request_id UUID NOT NULL REFERENCES purchase_requests(id) ON DELETE CASCADE,
    material_id UUID REFERENCES materials(id) ON DELETE SET NULL,
    material_name VARCHAR(255) NOT NULL,
    razon_preferencia TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ----------------------------------------------------------------------------
-- 4.15 PRESUPUESTOS (elaborados por el vendedor)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS budgets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    solicitud_id UUID NOT NULL UNIQUE REFERENCES purchase_requests(id) ON DELETE CASCADE,
    nombre VARCHAR(200) NOT NULL,
    descripcion TEXT,
    mano_de_obra NUMERIC(10,2) NOT NULL DEFAULT 0 CHECK (mano_de_obra >= 0),
    margen_ganancia INTEGER NOT NULL DEFAULT 30 CHECK (margen_ganancia >= 0 AND margen_ganancia <= 100),

    -- Adelanto (columnas planas, ya NO JSONB) ← NUEVO
    adelanto_requerido BOOLEAN DEFAULT FALSE,
    adelanto_porcentaje INTEGER DEFAULT 0 CHECK (adelanto_porcentaje >= 0 AND adelanto_porcentaje <= 100),
    adelanto_monto NUMERIC(10,2) DEFAULT 0.00 CHECK (adelanto_monto >= 0),

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE OR REPLACE TRIGGER trg_budgets_updated_at
    BEFORE UPDATE ON budgets
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ----------------------------------------------------------------------------
-- 4.16 BUDGET_ITEMS - Materiales del presupuesto con snapshot de precio
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS budget_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    presupuesto_id UUID NOT NULL REFERENCES budgets(id) ON DELETE CASCADE,
    material_id UUID NOT NULL REFERENCES materials(id) ON DELETE RESTRICT,
    cantidad NUMERIC(10,2) NOT NULL CHECK (cantidad > 0),
    costo_unitario NUMERIC(10,2) NOT NULL CHECK (costo_unitario >= 0),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT uq_budget_material UNIQUE (presupuesto_id, material_id)
);

-- ----------------------------------------------------------------------------
-- 4.17 BUDGET_EXPLANATION_SERVICES - Servicio de explicación ← NUEVO (reemplaza JSONB)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS budget_explanation_services (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    budget_id UUID NOT NULL UNIQUE REFERENCES budgets(id) ON DELETE CASCADE,
    incluido BOOLEAN NOT NULL DEFAULT TRUE,
    tipo_evento VARCHAR(100),
    cantidad_personas INTEGER CHECK (cantidad_personas > 0),
    duracion_minutos INTEGER CHECK (duracion_minutos > 0),
    precio NUMERIC(10,2) NOT NULL DEFAULT 0 CHECK (precio >= 0),
    notas TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE OR REPLACE TRIGGER trg_budget_explanation_updated_at
    BEFORE UPDATE ON budget_explanation_services
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ----------------------------------------------------------------------------
-- 4.18 MENSAJES (chat entre cliente y vendedor)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    solicitud_id UUID NOT NULL REFERENCES purchase_requests(id) ON DELETE CASCADE,
    remitente tipo_remitente NOT NULL,
    remitente_id UUID NOT NULL,
    mensaje TEXT NOT NULL,
    presupuesto_adjunto BOOLEAN DEFAULT FALSE,
    presupuesto_total NUMERIC(10,2),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT check_presupuesto CHECK (
        (NOT presupuesto_adjunto) OR (presupuesto_adjunto AND presupuesto_total IS NOT NULL)
    )
);

-- ----------------------------------------------------------------------------
-- 4.19 PAGOS (adelanto y pago final)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS payments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    solicitud_id UUID NOT NULL UNIQUE REFERENCES purchase_requests(id) ON DELETE CASCADE,
    presupuesto_id UUID NOT NULL REFERENCES budgets(id) ON DELETE RESTRICT,
    monto_total NUMERIC(10,2) NOT NULL CHECK (monto_total > 0),
    estado estado_pago NOT NULL DEFAULT 'PENDIENTE_ADELANTO',

    -- Adelanto (columnas planas, ya NO JSONB) ← NUEVO
    adelanto_monto NUMERIC(10,2) NOT NULL DEFAULT 0 CHECK (adelanto_monto >= 0),
    adelanto_pagado BOOLEAN DEFAULT FALSE,
    adelanto_fecha_pago TIMESTAMPTZ,
    adelanto_evidencia_url VARCHAR(500),

    -- Pago final (columnas planas, ya NO JSONB) ← NUEVO
    final_monto NUMERIC(10,2) NOT NULL DEFAULT 0 CHECK (final_monto >= 0),
    final_pagado BOOLEAN DEFAULT FALSE,
    final_fecha_pago TIMESTAMPTZ,
    final_evidencia_url VARCHAR(500),

    entregado BOOLEAN NOT NULL DEFAULT FALSE,
    fecha_entrega TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE OR REPLACE TRIGGER trg_payments_updated_at
    BEFORE UPDATE ON payments
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ----------------------------------------------------------------------------
-- 4.20 AUDITORÍA
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    entity_type VARCHAR(100) NOT NULL,
    entity_id UUID NOT NULL,
    accion accion_auditoria NOT NULL,
    user_id UUID,
    cambios JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);


-- ============================================================================
-- 5. ÍNDICES DE RENDIMIENTO
-- ============================================================================

-- Usuarios
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email) WHERE deleted_at IS NULL;

-- Productos
CREATE INDEX IF NOT EXISTS idx_products_categoria ON products(categoria_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_products_titulo_trgm ON products USING gin(titulo gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_products_descripcion_trgm ON products USING gin(descripcion gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_products_grado ON products(grado_escolar) WHERE deleted_at IS NULL;

-- Materiales
CREATE INDEX IF NOT EXISTS idx_materials_nombre ON materials(nombre) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_materials_nombre_trgm ON materials USING gin(nombre gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_materials_categoria ON materials(categoria_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_materials_stock ON materials(stock_actual) WHERE deleted_at IS NULL AND activo = TRUE;

-- Product Materials
CREATE INDEX IF NOT EXISTS idx_product_materials_product ON product_materials(product_id);
CREATE INDEX IF NOT EXISTS idx_product_materials_material ON product_materials(material_id);

-- Solicitudes
CREATE INDEX IF NOT EXISTS idx_purchase_requests_usuario ON purchase_requests(usuario_id);
CREATE INDEX IF NOT EXISTS idx_purchase_requests_estado ON purchase_requests(estado);
CREATE INDEX IF NOT EXISTS idx_purchase_requests_fecha ON purchase_requests(created_at DESC);

-- Kits y materiales de solicitudes
CREATE INDEX IF NOT EXISTS idx_kit_maquetas_request ON kit_maquetas(purchase_request_id);
CREATE INDEX IF NOT EXISTS idx_kit_customized_request ON kit_customized_materials(purchase_request_id);
CREATE INDEX IF NOT EXISTS idx_kit_personal_request ON kit_personal_materials(purchase_request_id);
CREATE INDEX IF NOT EXISTS idx_request_preferred_request ON request_preferred_materials(purchase_request_id);

-- Presupuestos
CREATE INDEX IF NOT EXISTS idx_budgets_solicitud ON budgets(solicitud_id);
CREATE INDEX IF NOT EXISTS idx_budget_items_presupuesto ON budget_items(presupuesto_id);
CREATE INDEX IF NOT EXISTS idx_budget_items_material ON budget_items(material_id);

-- Mensajes y pagos
CREATE INDEX IF NOT EXISTS idx_messages_solicitud ON messages(solicitud_id);
CREATE INDEX IF NOT EXISTS idx_payments_solicitud ON payments(solicitud_id);
CREATE INDEX IF NOT EXISTS idx_payments_estado ON payments(estado);


-- ============================================================================
-- 6. VISTAS ÚTILES
-- ============================================================================

-- Vista: valor total del inventario
CREATE OR REPLACE VIEW v_inventory_value AS
SELECT
    SUM(stock_actual * costo_compra)  AS valor_costo_inventario,
    SUM(stock_actual * costo_venta)   AS valor_venta_inventario,
    COUNT(*)                          AS total_materiales,
    SUM(CASE WHEN stock_actual < 10 THEN 1 ELSE 0 END) AS materiales_stock_bajo
FROM materials
WHERE deleted_at IS NULL AND activo = TRUE;

-- Vista: materiales con stock crítico
CREATE OR REPLACE VIEW v_materials_critical_stock AS
SELECT
    m.id,
    m.nombre,
    m.unidad,
    m.stock_actual,
    m.costo_compra,
    m.costo_venta,
    mc.nombre AS categoria_nombre
FROM materials m
LEFT JOIN material_categories mc ON m.categoria_id = mc.id
WHERE m.deleted_at IS NULL AND m.activo = TRUE AND m.stock_actual < 10
ORDER BY m.stock_actual ASC;

-- Vista: solicitudes completas para el dashboard del vendedor
CREATE OR REPLACE VIEW v_purchase_requests_complete AS
SELECT
    pr.id,
    pr.cliente_nombre,
    pr.cliente_email,
    pr.producto_nombre,
    pr.is_kit,
    pr.is_custom,
    pr.estado,
    pr.solicitar_explicacion,
    pr.created_at,
    b.id               AS presupuesto_id,
    b.nombre           AS presupuesto_nombre,
    b.adelanto_requerido,
    b.adelanto_monto
FROM purchase_requests pr
LEFT JOIN budgets b ON pr.id = b.solicitud_id
WHERE pr.deleted_at IS NULL
ORDER BY pr.created_at DESC;

-- Vista: estadísticas generales de solicitudes
CREATE OR REPLACE VIEW v_purchase_stats AS
SELECT
    COUNT(*)                                          AS total_solicitudes,
    COUNT(*) FILTER (WHERE estado = 'PENDIENTE')      AS pendientes,
    COUNT(*) FILTER (WHERE estado = 'PROCESANDO')     AS procesando,
    COUNT(*) FILTER (WHERE estado = 'COMPLETADO')     AS completados,
    COUNT(*) FILTER (WHERE is_custom = TRUE)          AS personalizadas,
    COUNT(*) FILTER (WHERE is_kit = TRUE)             AS kits
FROM purchase_requests
WHERE deleted_at IS NULL;

-- Vista: top 10 productos más solicitados
CREATE OR REPLACE VIEW v_top_products AS
SELECT
    p.id,
    p.titulo,
    p.categoria_id,
    p.image_url,
    COUNT(pr.id) AS total_solicitudes
FROM products p
LEFT JOIN purchase_requests pr ON p.id = pr.producto_id AND pr.deleted_at IS NULL
WHERE p.deleted_at IS NULL
GROUP BY p.id, p.titulo, p.categoria_id, p.image_url
ORDER BY total_solicitudes DESC
LIMIT 10;


-- ============================================================================
-- 7. DATOS INICIALES
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 7.1 Categorías de Productos
-- ----------------------------------------------------------------------------
INSERT INTO categories (id, nombre, descripcion, orden) VALUES
('ciencia',       'Ciencia',       'Modelos científicos y experimentos educativos', 1),
('arquitectura',  'Arquitectura',  'Maquetas arquitectónicas escolares',             2),
('educativo',     'Educativo',     'Modelos didácticos generales',                   3),
('inclusivo',     'Inclusivo',     'Adaptados para necesidades especiales',          4)
ON CONFLICT (id) DO NOTHING;

-- ----------------------------------------------------------------------------
-- 7.2 Categorías de Materiales (inventario)
-- ----------------------------------------------------------------------------
INSERT INTO material_categories (nombre, descripcion) VALUES
('Base',       'Materiales de soporte: cartón, madera, papel'),
('Estructura', 'Armazón: alambre, palitos, balsa'),
('Modelado',   'Plastelina, arcilla, yeso'),
('Acabado',    'Pinturas, barnices, sprays'),
('Adhesivos',  'Pegamentos, silicona, cinta'),
('Formas',     'Esferas, conos, formas geométricas'),
('Textura',    'Esponjas, tela, materiales de textura'),
('Decoración', 'Brillantina, ojos, elementos decorativos')
ON CONFLICT (nombre) DO NOTHING;

-- ----------------------------------------------------------------------------
-- 7.3 Materiales del Inventario
-- ----------------------------------------------------------------------------
INSERT INTO materials (nombre, unidad, costo_compra, costo_venta, stock_actual, categoria_id, proveedor)
SELECT 'Cartón corrugado', 'plancha', 2.50, 3.50, 100, id, 'Distribuidora Lima SAC'
FROM material_categories WHERE nombre = 'Base' LIMIT 1
ON CONFLICT (nombre) DO NOTHING;

INSERT INTO materials (nombre, unidad, costo_compra, costo_venta, stock_actual, categoria_id, proveedor)
SELECT 'Cartulina colores', 'pliego', 0.80, 1.00, 150, id, 'Librería Nacional'
FROM material_categories WHERE nombre = 'Base' LIMIT 1
ON CONFLICT (nombre) DO NOTHING;

INSERT INTO materials (nombre, unidad, costo_compra, costo_venta, stock_actual, categoria_id, proveedor)
SELECT 'Papel bond A4', 'paquete', 10.00, 12.00, 50, id, 'Librería Nacional'
FROM material_categories WHERE nombre = 'Base' LIMIT 1
ON CONFLICT (nombre) DO NOTHING;

INSERT INTO materials (nombre, unidad, costo_compra, costo_venta, stock_actual, categoria_id, proveedor)
SELECT 'Madera balsa', 'metro', 8.00, 10.00, 30, id, 'Maderera San Juan'
FROM material_categories WHERE nombre = 'Estructura' LIMIT 1
ON CONFLICT (nombre) DO NOTHING;

INSERT INTO materials (nombre, unidad, costo_compra, costo_venta, stock_actual, categoria_id, proveedor)
SELECT 'Madera MDF', 'plancha', 35.00, 40.00, 25, id, 'Maderera San Juan'
FROM material_categories WHERE nombre = 'Estructura' LIMIT 1
ON CONFLICT (nombre) DO NOTHING;

INSERT INTO materials (nombre, unidad, costo_compra, costo_venta, stock_actual, categoria_id, proveedor)
SELECT 'Palitos de helado', 'paquete', 4.00, 5.00, 80, id, 'Bazar San Miguel'
FROM material_categories WHERE nombre = 'Estructura' LIMIT 1
ON CONFLICT (nombre) DO NOTHING;

INSERT INTO materials (nombre, unidad, costo_compra, costo_venta, stock_actual, categoria_id, proveedor)
SELECT 'Alambre galvanizado', 'metro', 3.00, 3.50, 100, id, 'Ferretería Central'
FROM material_categories WHERE nombre = 'Estructura' LIMIT 1
ON CONFLICT (nombre) DO NOTHING;

INSERT INTO materials (nombre, unidad, costo_compra, costo_venta, stock_actual, categoria_id, proveedor)
SELECT 'Plastilina colores', 'kg', 12.00, 15.00, 50, id, 'Artesco Perú'
FROM material_categories WHERE nombre = 'Modelado' LIMIT 1
ON CONFLICT (nombre) DO NOTHING;

INSERT INTO materials (nombre, unidad, costo_compra, costo_venta, stock_actual, categoria_id, proveedor)
SELECT 'Arcilla natural', 'kg', 8.00, 10.00, 60, id, 'Cerámica Andina'
FROM material_categories WHERE nombre = 'Modelado' LIMIT 1
ON CONFLICT (nombre) DO NOTHING;

INSERT INTO materials (nombre, unidad, costo_compra, costo_venta, stock_actual, categoria_id, proveedor)
SELECT 'Yeso blanco', 'kg', 4.00, 5.00, 80, id, 'Ferretería Central'
FROM material_categories WHERE nombre = 'Modelado' LIMIT 1
ON CONFLICT (nombre) DO NOTHING;

INSERT INTO materials (nombre, unidad, costo_compra, costo_venta, stock_actual, categoria_id, proveedor)
SELECT 'Pintura acrílica', 'litro', 20.00, 25.00, 20, id, 'Pinturería El Maestro'
FROM material_categories WHERE nombre = 'Acabado' LIMIT 1
ON CONFLICT (nombre) DO NOTHING;

INSERT INTO materials (nombre, unidad, costo_compra, costo_venta, stock_actual, categoria_id, proveedor)
SELECT 'Temperas escolares', 'set', 18.00, 22.00, 35, id, 'Artesco Perú'
FROM material_categories WHERE nombre = 'Acabado' LIMIT 1
ON CONFLICT (nombre) DO NOTHING;

INSERT INTO materials (nombre, unidad, costo_compra, costo_venta, stock_actual, categoria_id, proveedor)
SELECT 'Pintura spray', 'lata', 12.00, 15.00, 25, id, 'Pinturería El Maestro'
FROM material_categories WHERE nombre = 'Acabado' LIMIT 1
ON CONFLICT (nombre) DO NOTHING;

INSERT INTO materials (nombre, unidad, costo_compra, costo_venta, stock_actual, categoria_id, proveedor)
SELECT 'Acrílico transparente', 'plancha', 30.00, 35.00, 15, id, 'Plásticos Industriales'
FROM material_categories WHERE nombre = 'Acabado' LIMIT 1
ON CONFLICT (nombre) DO NOTHING;

INSERT INTO materials (nombre, unidad, costo_compra, costo_venta, stock_actual, categoria_id, proveedor)
SELECT 'Pegamento escolar', 'litro', 10.00, 12.00, 40, id, 'Artesco Perú'
FROM material_categories WHERE nombre = 'Adhesivos' LIMIT 1
ON CONFLICT (nombre) DO NOTHING;

INSERT INTO materials (nombre, unidad, costo_compra, costo_venta, stock_actual, categoria_id, proveedor)
SELECT 'Silicona líquida', 'litro', 15.00, 18.00, 30, id, 'Ferretería Central'
FROM material_categories WHERE nombre = 'Adhesivos' LIMIT 1
ON CONFLICT (nombre) DO NOTHING;

INSERT INTO materials (nombre, unidad, costo_compra, costo_venta, stock_actual, categoria_id, proveedor)
SELECT 'Esferas de unicel', 'unidad', 1.00, 1.50, 200, id, 'Bazar San Miguel'
FROM material_categories WHERE nombre = 'Formas' LIMIT 1
ON CONFLICT (nombre) DO NOTHING;

INSERT INTO materials (nombre, unidad, costo_compra, costo_venta, stock_actual, categoria_id, proveedor)
SELECT 'Esponjas textura', 'unidad', 1.50, 2.00, 100, id, 'Bazar San Miguel'
FROM material_categories WHERE nombre = 'Textura' LIMIT 1
ON CONFLICT (nombre) DO NOTHING;

INSERT INTO materials (nombre, unidad, costo_compra, costo_venta, stock_actual, categoria_id, proveedor)
SELECT 'Brillantina colores', 'frasco', 5.00, 6.00, 40, id, 'Artesco Perú'
FROM material_categories WHERE nombre = 'Decoración' LIMIT 1
ON CONFLICT (nombre) DO NOTHING;

INSERT INTO materials (nombre, unidad, costo_compra, costo_venta, stock_actual, categoria_id, proveedor)
SELECT 'Ojos móviles', 'paquete', 3.00, 4.00, 60, id, 'Bazar San Miguel'
FROM material_categories WHERE nombre = 'Decoración' LIMIT 1
ON CONFLICT (nombre) DO NOTHING;

-- ----------------------------------------------------------------------------
-- 7.4 Productos (maquetas del catálogo)
-- ----------------------------------------------------------------------------
INSERT INTO products (titulo, descripcion, descripcion_detallada, categoria_id, grado_escolar, ocasion, materiales_reciclables, stock, image_url) VALUES
(
    'Célula Animal 3D',
    'Modelo tridimensional de célula eucariota animal con organelas identificadas.',
    'Maqueta educativa que muestra las principales organelas de una célula animal: núcleo, mitocondrias, retículo endoplasmático, aparato de Golgi, lisosomas y membrana celular. Perfecta para aprender biología celular de forma visual y práctica.',
    'ciencia', 'SECUNDARIA',
    ARRAY['Feria de Ciencias', 'Día del Logro'],
    FALSE, 20,
    'https://via.placeholder.com/400x300?text=Celula+Animal+3D'
),
(
    'Sistema Solar Móvil',
    'Móvil educativo con los 8 planetas del sistema solar a escala relativa.',
    'Maqueta suspendida que representa el sistema solar con el Sol en el centro y los 8 planetas en órbita. Incluye proporciones relativas de tamaño y distancia. Ideal para enseñar astronomía básica.',
    'ciencia', 'PRIMARIA',
    ARRAY['Feria de Ciencias', 'Exposiciones'],
    FALSE, 15,
    'https://via.placeholder.com/400x300?text=Sistema+Solar'
),
(
    'Volcán en Erupción',
    'Maqueta funcional de volcán con reacción química de erupción.',
    'Volcán realista que puede simular una erupción usando vinagre y bicarbonato. Incluye base montañosa, cráter funcional y paisaje volcánico. Perfecta para explicar fenómenos geológicos.',
    'ciencia', 'PRIMARIA',
    ARRAY['Feria de Ciencias', 'Día del Logro'],
    TRUE, 25,
    'https://via.placeholder.com/400x300?text=Volcan'
),
(
    'Casa Colonial Miniatura',
    'Maqueta arquitectónica de casa colonial peruana con patio central.',
    'Representación detallada de una casa colonial típica de Lima. Incluye patio central, habitaciones, balcones de cajón y arquitectura de la época virreinal. Ideal para estudios de historia y arquitectura.',
    'arquitectura', 'SECUNDARIA',
    ARRAY['Exposiciones', 'Día del Logro'],
    FALSE, 10,
    'https://via.placeholder.com/400x300?text=Casa+Colonial'
),
(
    'Maqueta de Machu Picchu',
    'Réplica en miniatura de la ciudadela inca de Machu Picchu.',
    'Recreación detallada de Machu Picchu con sus principales construcciones: Intihuatana, Templo del Sol, Plaza Principal y terrazas agrícolas. Patrimonio cultural del Perú.',
    'arquitectura', 'SECUNDARIA',
    ARRAY['Feria de Historia', 'Día de la Independencia', 'Exposiciones'],
    FALSE, 8,
    'https://via.placeholder.com/400x300?text=Machu+Picchu'
),
(
    'Ábaco Educativo',
    'Ábaco de madera para aprendizaje de matemáticas básicas.',
    'Herramienta didáctica para enseñar operaciones matemáticas básicas: suma, resta, multiplicación. Adaptado para educación especial con colores diferenciados y fácil manipulación.',
    'inclusivo', 'INICIAL',
    ARRAY['Uso diario', 'Clases especiales'],
    FALSE, 30,
    'https://via.placeholder.com/400x300?text=Abaco'
),
(
    'Pirámide de Biomasa',
    'Modelo de pirámide ecológica trófica con niveles diferenciados.',
    'Representación visual de los niveles tróficos en un ecosistema: productores, consumidores primarios, secundarios y terciarios. Muestra el flujo de energía en la naturaleza.',
    'ciencia', 'SECUNDARIA',
    ARRAY['Feria de Ciencias', 'Exposiciones'],
    TRUE, 20,
    'https://via.placeholder.com/400x300?text=Piramide+Biomasa'
),
(
    'Reloj de Sol',
    'Reloj solar funcional para enseñar astronomía y geometría.',
    'Instrumento astronómico que permite medir el tiempo mediante la sombra proyectada por el Sol. Incluye base graduada y gnomon ajustable. Enseña conceptos de astronomía y geometría.',
    'ciencia', 'PRIMARIA',
    ARRAY['Feria de Ciencias', 'Proyectos escolares'],
    FALSE, 15,
    'https://via.placeholder.com/400x300?text=Reloj+Solar'
)
ON CONFLICT DO NOTHING;

-- ----------------------------------------------------------------------------
-- 7.5 Relaciones Producto - Material (product_materials)
-- ----------------------------------------------------------------------------
-- Célula Animal 3D → Plastilina, Esferas unicel, Pintura acrílica, Cartón
INSERT INTO product_materials (product_id, material_id, cantidad_sugerida, es_opcional)
SELECT p.id, m.id, 2, FALSE
FROM products p, materials m
WHERE p.titulo = 'Célula Animal 3D' AND m.nombre = 'Plastilina colores'
ON CONFLICT (product_id, material_id) DO NOTHING;

INSERT INTO product_materials (product_id, material_id, cantidad_sugerida, es_opcional)
SELECT p.id, m.id, 10, FALSE
FROM products p, materials m
WHERE p.titulo = 'Célula Animal 3D' AND m.nombre = 'Esferas de unicel'
ON CONFLICT (product_id, material_id) DO NOTHING;

INSERT INTO product_materials (product_id, material_id, cantidad_sugerida, es_opcional)
SELECT p.id, m.id, 0.5, FALSE
FROM products p, materials m
WHERE p.titulo = 'Célula Animal 3D' AND m.nombre = 'Pintura acrílica'
ON CONFLICT (product_id, material_id) DO NOTHING;

INSERT INTO product_materials (product_id, material_id, cantidad_sugerida, es_opcional)
SELECT p.id, m.id, 2, FALSE
FROM products p, materials m
WHERE p.titulo = 'Célula Animal 3D' AND m.nombre = 'Cartón corrugado'
ON CONFLICT (product_id, material_id) DO NOTHING;

-- Sistema Solar Móvil → Esferas, Pintura, Alambre
INSERT INTO product_materials (product_id, material_id, cantidad_sugerida, es_opcional)
SELECT p.id, m.id, 8, FALSE
FROM products p, materials m
WHERE p.titulo = 'Sistema Solar Móvil' AND m.nombre = 'Esferas de unicel'
ON CONFLICT (product_id, material_id) DO NOTHING;

INSERT INTO product_materials (product_id, material_id, cantidad_sugerida, es_opcional)
SELECT p.id, m.id, 0.5, FALSE
FROM products p, materials m
WHERE p.titulo = 'Sistema Solar Móvil' AND m.nombre = 'Pintura acrílica'
ON CONFLICT (product_id, material_id) DO NOTHING;

INSERT INTO product_materials (product_id, material_id, cantidad_sugerida, es_opcional)
SELECT p.id, m.id, 2, FALSE
FROM products p, materials m
WHERE p.titulo = 'Sistema Solar Móvil' AND m.nombre = 'Alambre galvanizado'
ON CONFLICT (product_id, material_id) DO NOTHING;

-- Volcán → Yeso, Pintura, Arcilla
INSERT INTO product_materials (product_id, material_id, cantidad_sugerida, es_opcional)
SELECT p.id, m.id, 2, FALSE
FROM products p, materials m
WHERE p.titulo = 'Volcán en Erupción' AND m.nombre = 'Yeso blanco'
ON CONFLICT (product_id, material_id) DO NOTHING;

INSERT INTO product_materials (product_id, material_id, cantidad_sugerida, es_opcional)
SELECT p.id, m.id, 0.3, FALSE
FROM products p, materials m
WHERE p.titulo = 'Volcán en Erupción' AND m.nombre = 'Pintura acrílica'
ON CONFLICT (product_id, material_id) DO NOTHING;

INSERT INTO product_materials (product_id, material_id, cantidad_sugerida, es_opcional)
SELECT p.id, m.id, 1, TRUE
FROM products p, materials m
WHERE p.titulo = 'Volcán en Erupción' AND m.nombre = 'Arcilla natural'
ON CONFLICT (product_id, material_id) DO NOTHING;

-- Casa Colonial → Madera balsa, Palitos, Pintura
INSERT INTO product_materials (product_id, material_id, cantidad_sugerida, es_opcional)
SELECT p.id, m.id, 3, FALSE
FROM products p, materials m
WHERE p.titulo = 'Casa Colonial Miniatura' AND m.nombre = 'Madera balsa'
ON CONFLICT (product_id, material_id) DO NOTHING;

INSERT INTO product_materials (product_id, material_id, cantidad_sugerida, es_opcional)
SELECT p.id, m.id, 2, FALSE
FROM products p, materials m
WHERE p.titulo = 'Casa Colonial Miniatura' AND m.nombre = 'Palitos de helado'
ON CONFLICT (product_id, material_id) DO NOTHING;

INSERT INTO product_materials (product_id, material_id, cantidad_sugerida, es_opcional)
SELECT p.id, m.id, 0.5, FALSE
FROM products p, materials m
WHERE p.titulo = 'Casa Colonial Miniatura' AND m.nombre = 'Pintura acrílica'
ON CONFLICT (product_id, material_id) DO NOTHING;

-- Machu Picchu → Yeso, Madera balsa, Arcilla, Pintura
INSERT INTO product_materials (product_id, material_id, cantidad_sugerida, es_opcional)
SELECT p.id, m.id, 3, FALSE
FROM products p, materials m
WHERE p.titulo = 'Maqueta de Machu Picchu' AND m.nombre = 'Yeso blanco'
ON CONFLICT (product_id, material_id) DO NOTHING;

INSERT INTO product_materials (product_id, material_id, cantidad_sugerida, es_opcional)
SELECT p.id, m.id, 2, FALSE
FROM products p, materials m
WHERE p.titulo = 'Maqueta de Machu Picchu' AND m.nombre = 'Madera balsa'
ON CONFLICT (product_id, material_id) DO NOTHING;

INSERT INTO product_materials (product_id, material_id, cantidad_sugerida, es_opcional)
SELECT p.id, m.id, 1, FALSE
FROM products p, materials m
WHERE p.titulo = 'Maqueta de Machu Picchu' AND m.nombre = 'Arcilla natural'
ON CONFLICT (product_id, material_id) DO NOTHING;

INSERT INTO product_materials (product_id, material_id, cantidad_sugerida, es_opcional)
SELECT p.id, m.id, 0.5, FALSE
FROM products p, materials m
WHERE p.titulo = 'Maqueta de Machu Picchu' AND m.nombre = 'Pintura acrílica'
ON CONFLICT (product_id, material_id) DO NOTHING;

-- ----------------------------------------------------------------------------
-- 7.6 Precios de maquetas completas
-- ----------------------------------------------------------------------------
INSERT INTO maqueta_prices (producto_id, precio_completa, descripcion)
SELECT id, 85.00, 'Célula Animal 3D - lista para entregar'
FROM products WHERE titulo = 'Célula Animal 3D' LIMIT 1
ON CONFLICT (producto_id) DO NOTHING;

INSERT INTO maqueta_prices (producto_id, precio_completa, descripcion)
SELECT id, 120.00, 'Sistema Solar Móvil - lista para entregar'
FROM products WHERE titulo = 'Sistema Solar Móvil' LIMIT 1
ON CONFLICT (producto_id) DO NOTHING;

INSERT INTO maqueta_prices (producto_id, precio_completa, descripcion)
SELECT id, 75.00, 'Volcán en Erupción - lista para entregar'
FROM products WHERE titulo = 'Volcán en Erupción' LIMIT 1
ON CONFLICT (producto_id) DO NOTHING;

INSERT INTO maqueta_prices (producto_id, precio_completa, descripcion)
SELECT id, 180.00, 'Casa Colonial Miniatura - lista para entregar'
FROM products WHERE titulo = 'Casa Colonial Miniatura' LIMIT 1
ON CONFLICT (producto_id) DO NOTHING;

INSERT INTO maqueta_prices (producto_id, precio_completa, descripcion)
SELECT id, 250.00, 'Machu Picchu - lista para entregar'
FROM products WHERE titulo = 'Maqueta de Machu Picchu' LIMIT 1
ON CONFLICT (producto_id) DO NOTHING;

-- ----------------------------------------------------------------------------
-- 7.7 Precios de kits (materiales para armar)
-- ----------------------------------------------------------------------------
INSERT INTO complete_kits (producto_id, precio_kit, descripcion)
SELECT id, 45.00, 'Kit Célula Animal 3D - materiales para armar'
FROM products WHERE titulo = 'Célula Animal 3D' LIMIT 1
ON CONFLICT (producto_id) DO NOTHING;

INSERT INTO complete_kits (producto_id, precio_kit, descripcion)
SELECT id, 35.00, 'Kit Ábaco Educativo - materiales para armar'
FROM products WHERE titulo = 'Ábaco Educativo' LIMIT 1
ON CONFLICT (producto_id) DO NOTHING;

INSERT INTO complete_kits (producto_id, precio_kit, descripcion)
SELECT id, 40.00, 'Kit Reloj de Sol - materiales para armar'
FROM products WHERE titulo = 'Reloj de Sol' LIMIT 1
ON CONFLICT (producto_id) DO NOTHING;

-- ----------------------------------------------------------------------------
-- 7.8 Usuario de prueba (cliente) y Vendedor admin
-- Contraseña de ambos: Test1234!
-- Hash bcrypt de "Test1234!": $2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy
-- ----------------------------------------------------------------------------
INSERT INTO users (nombre, email, password, telefono, role) VALUES
(
    'Juan Pérez',
    'juan@test.com',
    '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy',
    '987654321',
    'CLIENT'
),
(
    'Administrador Amazonas',
    'admin@amazonas.com',
    '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy',
    '999888777',
    'ADMIN'
)
ON CONFLICT (email) DO NOTHING;



