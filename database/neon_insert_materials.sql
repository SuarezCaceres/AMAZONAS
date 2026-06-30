-- ============================================================================
-- SCRIPT DE INSERCIÓN DE MATERIALES DE PERSONALIZACIÓN PARA NEON DB
-- ============================================================================

-- Asegurar que las categorías de materiales existan
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

-- Inserción de materiales usando subconsultas para asociar con la categoría correcta
INSERT INTO materials (nombre, unidad, costo_compra, costo_venta, stock_actual, categoria_id, proveedor, activo)
VALUES 
('Carton reciclado', 'plancha', 1.00, 1.50, 100, (SELECT id FROM material_categories WHERE nombre = 'Base' LIMIT 1), 'Proveedor Local', TRUE),
('Arcilla', 'kg', 6.00, 8.00, 50, (SELECT id FROM material_categories WHERE nombre = 'Modelado' LIMIT 1), 'Proveedor Local', TRUE),
('Pintura acrilica', 'frasco', 3.50, 5.00, 120, (SELECT id FROM material_categories WHERE nombre = 'Acabado' LIMIT 1), 'Proveedor Local', TRUE),
('Materiales reciclables', 'unidad', 0.50, 1.00, 200, (SELECT id FROM material_categories WHERE nombre = 'Decoración' LIMIT 1), 'Proveedor Local', TRUE),
('Carton', 'plancha', 2.00, 3.00, 150, (SELECT id FROM material_categories WHERE nombre = 'Base' LIMIT 1), 'Proveedor Local', TRUE),
('Cartulina', 'pliego', 0.50, 0.80, 300, (SELECT id FROM material_categories WHERE nombre = 'Base' LIMIT 1), 'Proveedor Local', TRUE),
('Tecnopor', 'plancha', 3.00, 4.50, 80, (SELECT id FROM material_categories WHERE nombre = 'Formas' LIMIT 1), 'Proveedor Local', TRUE),
('Duplex', 'pliego', 1.20, 1.80, 100, (SELECT id FROM material_categories WHERE nombre = 'Base' LIMIT 1), 'Proveedor Local', TRUE),
('Fideos', 'paquete', 2.00, 3.00, 50, (SELECT id FROM material_categories WHERE nombre = 'Estructura' LIMIT 1), 'Proveedor Local', TRUE),
('Plastilina', 'barra', 1.50, 2.50, 150, (SELECT id FROM material_categories WHERE nombre = 'Modelado' LIMIT 1), 'Proveedor Local', TRUE),
('Madera', 'liston', 5.00, 7.00, 60, (SELECT id FROM material_categories WHERE nombre = 'Estructura' LIMIT 1), 'Proveedor Local', TRUE),
('Algodon', 'bolsa', 1.50, 2.50, 90, (SELECT id FROM material_categories WHERE nombre = 'Decoración' LIMIT 1), 'Proveedor Local', TRUE),
('Aserrin', 'bolsa', 2.00, 3.00, 40, (SELECT id FROM material_categories WHERE nombre = 'Textura' LIMIT 1), 'Proveedor Local', TRUE),
('Palitos de chupete', 'paquete', 2.50, 3.50, 110, (SELECT id FROM material_categories WHERE nombre = 'Estructura' LIMIT 1), 'Proveedor Local', TRUE),
('Chapitas de plastico', 'unidad', 0.10, 0.20, 500, (SELECT id FROM material_categories WHERE nombre = 'Decoración' LIMIT 1), 'Proveedor Local', TRUE),
('Botellas de plastico', 'unidad', 0.20, 0.40, 300, (SELECT id FROM material_categories WHERE nombre = 'Base' LIMIT 1), 'Proveedor Local', TRUE),
('Discos', 'unidad', 0.50, 1.00, 100, (SELECT id FROM material_categories WHERE nombre = 'Decoración' LIMIT 1), 'Proveedor Local', TRUE),
('Papel', 'resma', 15.00, 20.00, 30, (SELECT id FROM material_categories WHERE nombre = 'Base' LIMIT 1), 'Proveedor Local', TRUE),
('Temperas', 'caja', 5.00, 7.50, 75, (SELECT id FROM material_categories WHERE nombre = 'Acabado' LIMIT 1), 'Proveedor Local', TRUE),
('Pegamento', 'unidad', 1.20, 2.00, 120, (SELECT id FROM material_categories WHERE nombre = 'Adhesivos' LIMIT 1), 'Proveedor Local', TRUE),
('Silicona', 'barra', 0.80, 1.50, 200, (SELECT id FROM material_categories WHERE nombre = 'Adhesivos' LIMIT 1), 'Proveedor Local', TRUE)
ON CONFLICT (nombre) DO NOTHING;
