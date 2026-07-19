-- ============================================================================
-- V1__init_master.sql
-- Archivo de migración maestro consolidado para inicializar la base de datos AMAZONAS.
-- ============================================================================

-- Habilitar extensiones necesarias en PostgreSQL
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- ----------------------------------------------------------------------------
-- 1. TIPOS ENUM (ENUMS)
-- ----------------------------------------------------------------------------
CREATE TYPE "user_role" AS ENUM('CLIENT', 'ADMIN');
CREATE TYPE "estado_solicitud" AS ENUM('PENDIENTE', 'PROCESANDO', 'COMPLETADO', 'RECHAZADO');
CREATE TYPE "tipo_remitente" AS ENUM('CLIENT', 'VENDOR');
CREATE TYPE "estado_pago" AS ENUM('PENDIENTE_ADELANTO', 'ADELANTO_CONFIRMADO', 'PENDIENTE_FINAL', 'COMPLETADO');
CREATE TYPE "accion_auditoria" AS ENUM('CREATE', 'UPDATE', 'DELETE', 'LOGIN', 'LOGOUT');
CREATE TYPE "chat_room_status" AS ENUM('OPEN', 'AGREED', 'CLOSED', 'ARCHIVED');
CREATE TYPE "chat_message_type" AS ENUM('TEXT', 'OFFER', 'BUDGET', 'FILE', 'VOUCHER', 'SYSTEM');
CREATE TYPE "chat_offer_status" AS ENUM('PENDING', 'ACCEPTED', 'REJECTED', 'COUNTERED', 'EXPIRED');
CREATE TYPE "chat_sender_role" AS ENUM('CLIENT', 'VENDOR', 'SYSTEM');

-- ----------------------------------------------------------------------------
-- 2. TABLAS (TABLES)
-- ----------------------------------------------------------------------------

-- audit_logs: Registro de auditoría para auditorías de cambios y eventos
CREATE TABLE "audit_logs" (
	"id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
	"entity_type" varchar(100) NOT NULL,
	"entity_id" uuid NOT NULL,
	"accion" accion_auditoria NOT NULL,
	"user_id" uuid,
	"cambios" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);

-- categories: Categorías del catálogo de productos de maquetas
CREATE TABLE "categories" (
	"id" varchar(50) PRIMARY KEY,
	"nombre" varchar(100) NOT NULL,
	"descripcion" text,
	"orden" integer DEFAULT 0
);

-- material_categories: Categorías de materiales del inventario
CREATE TABLE "material_categories" (
	"id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
	"nombre" varchar(100) NOT NULL CONSTRAINT "material_categories_nombre_key" UNIQUE,
	"descripcion" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

-- materials: Materiales disponibles para la venta o armado de maquetas
CREATE TABLE "materials" (
	"id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
	"nombre" varchar(100) NOT NULL CONSTRAINT "materials_nombre_key" UNIQUE,
	"unidad" varchar(20) DEFAULT 'unidad' NOT NULL,
	"costo_compra" numeric(10, 2) DEFAULT '0' NOT NULL,
	"costo_venta" numeric(10, 2) DEFAULT '0' NOT NULL,
	"stock_actual" integer DEFAULT 0 NOT NULL,
	"categoria_id" uuid,
	"proveedor" varchar(100),
	"activo" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	CONSTRAINT "materials_costo_compra_check" CHECK ((costo_compra >= (0)::numeric)),
	CONSTRAINT "materials_costo_venta_check" CHECK ((costo_venta >= (0)::numeric)),
	CONSTRAINT "materials_stock_actual_check" CHECK ((stock_actual >= 0))
);

-- users: Registro de usuarios clientes en la plataforma
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
	"nombre" varchar(100) NOT NULL,
	"email" varchar(150) NOT NULL CONSTRAINT "users_email_key" UNIQUE,
	"password" varchar(255) NOT NULL,
	"telefono" varchar(15),
	"role" user_role DEFAULT 'CLIENT' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	"failed_login_attempts" integer DEFAULT 0 NOT NULL,
	"lock_until" timestamp,
	CONSTRAINT "check_email_users" CHECK (((email)::text ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}$'::text))
);

-- vendors: Registro de administradores / vendedores del negocio
CREATE TABLE "vendors" (
	"id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
	"nombre" varchar(100) NOT NULL,
	"email" varchar(150) NOT NULL CONSTRAINT "vendors_email_key" UNIQUE,
	"password" varchar(255) NOT NULL,
	"role" user_role DEFAULT 'ADMIN' NOT NULL,
	"activo" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"failed_login_attempts" integer DEFAULT 0 NOT NULL,
	"lock_until" timestamp with time zone
);

-- password_reset_tokens: Fichas temporales de recuperación de contraseñas
CREATE TABLE "password_reset_tokens" (
	"id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
	"token" varchar(255) NOT NULL CONSTRAINT "password_reset_tokens_token_key" UNIQUE,
	"email" varchar(150) NOT NULL,
	"user_type" varchar(50) NOT NULL,
	"expiry_date" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);

-- products: Catálogo de maquetas estándar
CREATE TABLE "products" (
	"id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
	"titulo" varchar(200) NOT NULL,
	"descripcion" text,
	"descripcion_detallada" text,
	"categoria_id" varchar(50) NOT NULL,
	"image_url" varchar(500),
	"grado_escolar" varchar(50),
	"ocasion" text[],
	"materiales_reciclables" boolean DEFAULT false,
	"stock" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	"caracteristicas" text[],
	CONSTRAINT "products_stock_check" CHECK ((stock >= 0))
);

-- product_materials: Relación de materiales para maquetas estándar
CREATE TABLE "product_materials" (
	"id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
	"product_id" uuid NOT NULL,
	"material_id" uuid NOT NULL,
	"cantidad_sugerida" numeric(10, 2) DEFAULT '1' NOT NULL,
	"unidad" varchar(50),
	"es_opcional" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"notas" text,
	CONSTRAINT "uq_product_material" UNIQUE("product_id","material_id"),
	CONSTRAINT "product_materials_cantidad_check" CHECK ((cantidad_sugerida > (0)::numeric))
);

-- purchase_requests: Solicitudes de compra de clientes (estándar, personalizadas o kits)
CREATE TABLE "purchase_requests" (
	"id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
	"usuario_id" uuid NOT NULL,
	"producto_id" uuid,
	"cliente_nombre" varchar(255) NOT NULL,
	"cliente_email" varchar(150) NOT NULL,
	"cliente_telefono" varchar(15),
	"producto_nombre" varchar(200) NOT NULL,
	"is_kit" boolean DEFAULT false NOT NULL,
	"is_custom" boolean DEFAULT false NOT NULL,
	"estado" estado_solicitud DEFAULT 'PENDIENTE' NOT NULL,
	"mensaje" text,
	"descripcion_personalizacion" text,
	"materiales_deseados" text,
	"solicitar_explicacion" boolean DEFAULT false,
	"tipo_evento" varchar(100),
	"cantidad_personas" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	"grabaciones_urls" text,
	"archivos_urls" text,
	"motivo_cancelacion" text,
	CONSTRAINT "purchase_requests_cantidad_personas_check" CHECK ((cantidad_personas > 0))
);

-- budgets: Presupuestos calculados asociados a una solicitud
CREATE TABLE "budgets" (
	"id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
	"solicitud_id" uuid CONSTRAINT "budgets_solicitud_id_key" UNIQUE,
	"nombre" varchar(200) NOT NULL,
	"descripcion" text,
	"mano_de_obra" numeric(10, 2) DEFAULT '0' NOT NULL,
	"margen_ganancia" integer DEFAULT 30 NOT NULL,
	"adelanto_requerido" boolean DEFAULT false,
	"adelanto_porcentaje" integer DEFAULT 0,
	"adelanto_monto" numeric(10, 2) DEFAULT '0.00',
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"estado" varchar(30) DEFAULT 'PENDIENTE',
	"codigo_referencia" varchar(30) NOT NULL CONSTRAINT "uq_budgets_codigo" UNIQUE,
	"creador_id" uuid,
	"cliente_nombre" varchar(255),
	"cliente_email" varchar(150),
	"cliente_telefono" varchar(15),
	"es_presencial" boolean DEFAULT false NOT NULL,
	"is_custom" boolean DEFAULT false NOT NULL,
	"is_kit" boolean DEFAULT false NOT NULL,
	CONSTRAINT "budgets_adelanto_monto_check" CHECK ((adelanto_monto >= (0)::numeric)),
	CONSTRAINT "budgets_adelanto_porcentaje_check" CHECK (((adelanto_porcentaje >= 0) AND (adelanto_porcentaje <= 100))),
	CONSTRAINT "budgets_mano_de_obra_check" CHECK ((mano_de_obra >= (0)::numeric)),
	CONSTRAINT "budgets_margen_ganancia_check" CHECK (((margen_ganancia >= 0) AND (margen_ganancia <= 100)))
);

-- budget_explanation_services: Detalles adicionales de explicación presencial
CREATE TABLE "budget_explanation_services" (
	"id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
	"budget_id" uuid NOT NULL CONSTRAINT "budget_explanation_services_budget_id_key" UNIQUE,
	"incluido" boolean DEFAULT true NOT NULL,
	"tipo_evento" varchar(100),
	"cantidad_personas" integer,
	"duracion_minutos" integer,
	"precio" numeric(10, 2) DEFAULT '0' NOT NULL,
	"notas" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "budget_explanation_services_cantidad_personas_check" CHECK ((cantidad_personas > 0)),
	CONSTRAINT "budget_explanation_services_duracion_minutos_check" CHECK ((duracion_minutos > 0)),
	CONSTRAINT "budget_explanation_services_precio_check" CHECK ((precio >= (0)::numeric))
);

-- budget_items: Detalles de materiales incluidos en el presupuesto
CREATE TABLE "budget_items" (
	"id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
	"presupuesto_id" uuid NOT NULL,
	"material_id" uuid NOT NULL,
	"cantidad" numeric(10, 2) NOT NULL,
	"costo_unitario" numeric(10, 2) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "uq_budget_material" UNIQUE("presupuesto_id","material_id"),
	CONSTRAINT "budget_items_cantidad_check" CHECK ((cantidad > (0)::numeric)),
	CONSTRAINT "budget_items_costo_unitario_check" CHECK ((costo_unitario >= (0)::numeric))
);

-- chat_rooms: Salas de chat de negociación para solicitudes de maquetas
CREATE TABLE "chat_rooms" (
	"id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
	"request_id" uuid NOT NULL CONSTRAINT "chat_rooms_request_id_key" UNIQUE,
	"client_id" uuid NOT NULL,
	"vendor_id" uuid NOT NULL,
	"status" varchar(50) DEFAULT 'OPEN' NOT NULL,
	"agreed_price" numeric(10, 2),
	"last_message_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

-- chat_messages: Mensajes enviados en el chat
CREATE TABLE "chat_messages" (
	"id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
	"room_id" uuid NOT NULL,
	"sender_id" uuid NOT NULL,
	"sender_role" varchar(50) NOT NULL,
	"message_type" varchar(50) DEFAULT 'TEXT' NOT NULL,
	"content" text NOT NULL,
	"metadata" jsonb,
	"is_read" boolean DEFAULT false NOT NULL,
	"sent_at" timestamp with time zone DEFAULT now() NOT NULL
);

-- chat_offers: Ofertas de precio formales en el chat
CREATE TABLE "chat_offers" (
	"id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
	"room_id" uuid NOT NULL,
	"message_id" uuid,
	"proposer_id" uuid NOT NULL,
	"proposer_role" varchar(50) NOT NULL,
	"proposed_price" numeric(10, 2) NOT NULL,
	"note" text,
	"status" varchar(50) DEFAULT 'PENDING' NOT NULL,
	"responded_at" timestamp with time zone,
	"expires_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "chat_offers_proposed_price_check" CHECK ((proposed_price > (0)::numeric))
);

-- chat_extras: Servicios extra acordados en la negociación
CREATE TABLE "chat_extras" (
	"id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
	"room_id" uuid NOT NULL,
	"nombre" varchar(200) NOT NULL,
	"descripcion" text,
	"precio" numeric(10, 2) NOT NULL,
	"aceptado" boolean,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "chat_extras_precio_check" CHECK ((precio >= (0)::numeric))
);

-- complete_kits: Tabla de precios para maquetas tipo kit completo
CREATE TABLE "complete_kits" (
	"id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
	"producto_id" uuid NOT NULL CONSTRAINT "complete_kits_producto_id_key" UNIQUE,
	"precio_kit" numeric(10, 2) NOT NULL,
	"descripcion" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "complete_kits_precio_kit_check" CHECK ((precio_kit > (0)::numeric))
);

-- maqueta_prices: Tabla de precios base para maquetas armadas
CREATE TABLE "maqueta_prices" (
	"id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
	"producto_id" uuid NOT NULL CONSTRAINT "maqueta_prices_producto_id_key" UNIQUE,
	"precio_completa" numeric(10, 2) NOT NULL,
	"descripcion" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "maqueta_prices_precio_completa_check" CHECK ((precio_completa > (0)::numeric))
);

-- kit_customized_materials: Materiales sugeridos comprados en un Kit personalizado
CREATE TABLE "kit_customized_materials" (
	"id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
	"purchase_request_id" uuid NOT NULL,
	"material_id" uuid NOT NULL,
	"material_name" varchar(255) NOT NULL,
	"material_unit" varchar(50) NOT NULL,
	"cantidad" numeric(10, 2) NOT NULL,
	"costo_unitario_referencia" numeric(10, 2) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "kit_customized_materials_cantidad_check" CHECK ((cantidad > (0)::numeric)),
	CONSTRAINT "kit_customized_materials_costo_unitario_referencia_check" CHECK ((costo_unitario_referencia >= (0)::numeric))
);

-- kit_maquetas: Registro de maquetas solicitadas dentro de un kit
CREATE TABLE "kit_maquetas" (
	"id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
	"purchase_request_id" uuid NOT NULL,
	"product_id" uuid NOT NULL,
	"product_name" varchar(255) NOT NULL,
	"product_slug" varchar(255),
	"cantidad" integer DEFAULT 1 NOT NULL,
	"precio_unitario_referencia" numeric(10, 2),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "kit_maquetas_cantidad_check" CHECK ((cantidad > 0)),
	CONSTRAINT "kit_maquetas_precio_unitario_referencia_check" CHECK ((precio_unitario_referencia >= (0)::numeric))
);

-- kit_personal_materials: Registro de materiales propios aportados por el cliente para el Kit
CREATE TABLE "kit_personal_materials" (
	"id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
	"purchase_request_id" uuid NOT NULL,
	"material_name" varchar(255) NOT NULL,
	"cantidad" numeric(10, 2) NOT NULL,
	"descripcion" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "kit_personal_materials_cantidad_check" CHECK ((cantidad > (0)::numeric))
);

-- messages: Mensajes generales o adjuntos de presupuesto
CREATE TABLE "messages" (
	"id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
	"solicitud_id" uuid NOT NULL,
	"remitente" tipo_remitente NOT NULL,
	"remitente_id" uuid NOT NULL,
	"mensaje" text NOT NULL,
	"presupuesto_adjunto" boolean DEFAULT false,
	"presupuesto_total" numeric(10, 2),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "check_presupuesto" CHECK (((NOT presupuesto_adjunto) OR (presupuesto_adjunto AND (presupuesto_total IS NOT NULL))))
);

-- payment_transactions: Registro de transacciones monetarias individuales de pago
CREATE TABLE "payment_transactions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"client_id" uuid NOT NULL,
	"room_id" uuid,
	"monto" numeric(10, 2) NOT NULL,
	"metodo_pago" varchar(50) NOT NULL,
	"tipo_abono" varchar(50) NOT NULL,
	"tipo_maqueta" varchar(50) NOT NULL,
	"materiales" text,
	"fecha_transaccion" timestamp with time zone DEFAULT now() NOT NULL,
	"codigo_operacion" varchar(255),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"monto_recibido" numeric(10, 2),
	"vuelto" numeric(10, 2),
	"codigo_seguridad" varchar(100),
	"voucher_url" text,
	CONSTRAINT "payment_transactions_monto_check" CHECK ((monto >= (0)::numeric))
);

-- payments: Registro del estado de cobro general (Adelanto, Final, Entregas)
CREATE TABLE "payments" (
	"id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
	"solicitud_id" uuid NOT NULL CONSTRAINT "payments_solicitud_id_key" UNIQUE,
	"presupuesto_id" uuid NOT NULL,
	"monto_total" numeric(10, 2) NOT NULL,
	"estado" estado_pago DEFAULT 'PENDIENTE_ADELANTO' NOT NULL,
	"adelanto_monto" numeric(10, 2) DEFAULT '0' NOT NULL,
	"adelanto_pagado" boolean DEFAULT false,
	"adelanto_fecha_pago" timestamp with time zone,
	"adelanto_evidencia_url" varchar(500),
	"final_monto" numeric(10, 2) DEFAULT '0' NOT NULL,
	"final_pagado" boolean DEFAULT false,
	"final_fecha_pago" timestamp with time zone,
	"final_evidencia_url" varchar(500),
	"entregado" boolean DEFAULT false NOT NULL,
	"fecha_entrega" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "payments_adelanto_monto_check" CHECK ((adelanto_monto >= (0)::numeric)),
	CONSTRAINT "payments_final_monto_check" CHECK ((final_monto >= (0)::numeric)),
	CONSTRAINT "payments_monto_total_check" CHECK ((monto_total > (0)::numeric))
);

-- request_preferred_materials: Registro de materiales preferidos para una solicitud
CREATE TABLE "request_preferred_materials" (
	"id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
	"purchase_request_id" uuid NOT NULL,
	"material_id" uuid,
	"material_name" varchar(255) NOT NULL,
	"razon_preferencia" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);

-- nightly_reports: Guarda reportes nocturnos de resumen y estadísticas generados automáticamente
CREATE TABLE "nightly_reports" (
    "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    "fecha" timestamp with time zone NOT NULL,
    "total_maquetas" bigint NOT NULL,
    "total_solicitudes" bigint NOT NULL,
    "solicitudes_pendientes" bigint NOT NULL,
    "solicitudes_completadas" bigint NOT NULL,
    "total_presupuestos" bigint NOT NULL,
    "total_monto_presupuestado" numeric(12, 2) NOT NULL,
    "mensajes_no_leidos" bigint NOT NULL,
    "created_at" timestamp with time zone DEFAULT now() NOT NULL
);

-- ----------------------------------------------------------------------------
-- 3. ÍNDICES (INDEXES)
-- ----------------------------------------------------------------------------
CREATE INDEX "idx_budget_items_material" ON "budget_items" ("material_id");
CREATE INDEX "idx_budget_items_presupuesto" ON "budget_items" ("presupuesto_id");
CREATE INDEX "idx_budgets_solicitud" ON "budgets" ("solicitud_id");
CREATE INDEX "idx_chat_extras_room" ON "chat_extras" ("room_id");
CREATE INDEX "idx_chat_messages_room_sent" ON "chat_messages" ("room_id","sent_at");
CREATE INDEX "idx_chat_offers_room" ON "chat_offers" ("room_id");
CREATE INDEX "idx_chat_rooms_client" ON "chat_rooms" ("client_id");
CREATE INDEX "idx_chat_rooms_request" ON "chat_rooms" ("request_id");
CREATE INDEX "idx_chat_rooms_vendor" ON "chat_rooms" ("vendor_id");
CREATE INDEX "idx_kit_customized_request" ON "kit_customized_materials" ("purchase_request_id");
CREATE INDEX "idx_kit_maquetas_request" ON "kit_maquetas" ("purchase_request_id");
CREATE INDEX "idx_kit_personal_request" ON "kit_personal_materials" ("purchase_request_id");
CREATE INDEX "idx_materials_categoria" ON "materials" ("categoria_id");
CREATE INDEX "idx_materials_nombre" ON "materials" ("nombre");
CREATE INDEX "idx_materials_stock" ON "materials" ("stock_actual");
CREATE INDEX "idx_messages_solicitud" ON "messages" ("solicitud_id");
CREATE INDEX "idx_payment_transactions_client" ON "payment_transactions" ("client_id");
CREATE INDEX "idx_payment_transactions_fecha" ON "payment_transactions" ("fecha_transaccion");
CREATE INDEX "idx_payment_transactions_metodo" ON "payment_transactions" ("metodo_pago");
CREATE INDEX "idx_payment_transactions_room" ON "payment_transactions" ("room_id");
CREATE INDEX "idx_payments_estado" ON "payments" ("estado");
CREATE INDEX "idx_payments_solicitud" ON "payments" ("solicitud_id");
CREATE INDEX "idx_product_materials_material" ON "product_materials" ("material_id");
CREATE INDEX "idx_product_materials_product" ON "product_materials" ("product_id");
CREATE INDEX "idx_products_categoria" ON "products" ("categoria_id");
CREATE INDEX "idx_products_grado" ON "products" ("grado_escolar");
CREATE INDEX "idx_purchase_requests_estado" ON "purchase_requests" ("estado");
CREATE INDEX "idx_purchase_requests_fecha" ON "purchase_requests" ("created_at");
CREATE INDEX "idx_purchase_requests_usuario" ON "purchase_requests" ("usuario_id");
CREATE INDEX "idx_purchase_requests_usuario_estado" ON "purchase_requests" ("usuario_id","estado");
CREATE INDEX "idx_request_preferred_request" ON "request_preferred_materials" ("purchase_request_id");

-- Índices GIN con Trigramas (Requieren la extensión pg_trgm y operador clase)
CREATE INDEX "idx_materials_nombre_trgm" ON "materials" USING gin ("nombre" gin_trgm_ops);
CREATE INDEX "idx_products_descripcion_trgm" ON "products" USING gin ("descripcion" gin_trgm_ops);
CREATE INDEX "idx_products_titulo_trgm" ON "products" USING gin ("titulo" gin_trgm_ops);

-- ----------------------------------------------------------------------------
-- 4. RESTRICCIONES DE LLAVES FORÁNEAS (FOREIGN KEYS / ALTER TABLES)
-- ----------------------------------------------------------------------------
ALTER TABLE "budget_explanation_services" ADD CONSTRAINT "budget_explanation_services_budget_id_fkey" FOREIGN KEY ("budget_id") REFERENCES "budgets"("id") ON DELETE CASCADE;
ALTER TABLE "budget_items" ADD CONSTRAINT "budget_items_material_id_fkey" FOREIGN KEY ("material_id") REFERENCES "materials"("id") ON DELETE RESTRICT;
ALTER TABLE "budget_items" ADD CONSTRAINT "budget_items_presupuesto_id_fkey" FOREIGN KEY ("presupuesto_id") REFERENCES "budgets"("id") ON DELETE CASCADE;
ALTER TABLE "budgets" ADD CONSTRAINT "budgets_creador_id_fkey" FOREIGN KEY ("creador_id") REFERENCES "vendors"("id");
ALTER TABLE "budgets" ADD CONSTRAINT "budgets_solicitud_id_fkey" FOREIGN KEY ("solicitud_id") REFERENCES "purchase_requests"("id") ON DELETE CASCADE;
ALTER TABLE "chat_extras" ADD CONSTRAINT "chat_extras_room_id_fkey" FOREIGN KEY ("room_id") REFERENCES "chat_rooms"("id") ON DELETE CASCADE;
ALTER TABLE "chat_messages" ADD CONSTRAINT "chat_messages_room_id_fkey" FOREIGN KEY ("room_id") REFERENCES "chat_rooms"("id") ON DELETE CASCADE;
ALTER TABLE "chat_offers" ADD CONSTRAINT "chat_offers_message_id_fkey" FOREIGN KEY ("message_id") REFERENCES "chat_messages"("id") ON DELETE SET NULL;
ALTER TABLE "chat_offers" ADD CONSTRAINT "chat_offers_room_id_fkey" FOREIGN KEY ("room_id") REFERENCES "chat_rooms"("id") ON DELETE CASCADE;
ALTER TABLE "chat_rooms" ADD CONSTRAINT "chat_rooms_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "users"("id") ON DELETE CASCADE;
ALTER TABLE "chat_rooms" ADD CONSTRAINT "chat_rooms_request_id_fkey" FOREIGN KEY ("request_id") REFERENCES "purchase_requests"("id") ON DELETE CASCADE;
ALTER TABLE "chat_rooms" ADD CONSTRAINT "chat_rooms_vendor_id_fkey" FOREIGN KEY ("vendor_id") REFERENCES "vendors"("id") ON DELETE CASCADE;
ALTER TABLE "complete_kits" ADD CONSTRAINT "complete_kits_producto_id_fkey" FOREIGN KEY ("producto_id") REFERENCES "products"("id") ON DELETE CASCADE;
ALTER TABLE "kit_customized_materials" ADD CONSTRAINT "kit_customized_materials_material_id_fkey" FOREIGN KEY ("material_id") REFERENCES "materials"("id") ON DELETE RESTRICT;
ALTER TABLE "kit_customized_materials" ADD CONSTRAINT "kit_customized_materials_purchase_request_id_fkey" FOREIGN KEY ("purchase_request_id") REFERENCES "purchase_requests"("id") ON DELETE CASCADE;
ALTER TABLE "kit_maquetas" ADD CONSTRAINT "kit_maquetas_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE RESTRICT;
ALTER TABLE "kit_maquetas" ADD CONSTRAINT "kit_maquetas_purchase_request_id_fkey" FOREIGN KEY ("purchase_request_id") REFERENCES "purchase_requests"("id") ON DELETE CASCADE;
ALTER TABLE "kit_personal_materials" ADD CONSTRAINT "kit_personal_materials_purchase_request_id_fkey" FOREIGN KEY ("purchase_request_id") REFERENCES "purchase_requests"("id") ON DELETE CASCADE;
ALTER TABLE "maqueta_prices" ADD CONSTRAINT "maqueta_prices_producto_id_fkey" FOREIGN KEY ("producto_id") REFERENCES "products"("id") ON DELETE CASCADE;
ALTER TABLE "materials" ADD CONSTRAINT "materials_categoria_id_fkey" FOREIGN KEY ("categoria_id") REFERENCES "material_categories"("id") ON DELETE SET NULL;
ALTER TABLE "messages" ADD CONSTRAINT "messages_solicitud_id_fkey" FOREIGN KEY ("solicitud_id") REFERENCES "purchase_requests"("id") ON DELETE CASCADE;
ALTER TABLE "payment_transactions" ADD CONSTRAINT "payment_transactions_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "users"("id") ON DELETE CASCADE;
ALTER TABLE "payment_transactions" ADD CONSTRAINT "payment_transactions_room_id_fkey" FOREIGN KEY ("room_id") REFERENCES "chat_rooms"("id") ON DELETE SET NULL;
ALTER TABLE "payments" ADD CONSTRAINT "payments_presupuesto_id_fkey" FOREIGN KEY ("presupuesto_id") REFERENCES "budgets"("id") ON DELETE RESTRICT;
ALTER TABLE "payments" ADD CONSTRAINT "payments_solicitud_id_fkey" FOREIGN KEY ("solicitud_id") REFERENCES "purchase_requests"("id") ON DELETE CASCADE;
ALTER TABLE "product_materials" ADD CONSTRAINT "product_materials_material_id_fkey" FOREIGN KEY ("material_id") REFERENCES "materials"("id") ON DELETE RESTRICT;
ALTER TABLE "product_materials" ADD CONSTRAINT "product_materials_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE CASCADE;
ALTER TABLE "products" ADD CONSTRAINT "products_categoria_id_fkey" FOREIGN KEY ("categoria_id") REFERENCES "categories"("id") ON DELETE RESTRICT;
ALTER TABLE "purchase_requests" ADD CONSTRAINT "purchase_requests_producto_id_fkey" FOREIGN KEY ("producto_id") REFERENCES "products"("id") ON DELETE SET NULL;
ALTER TABLE "purchase_requests" ADD CONSTRAINT "purchase_requests_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "users"("id") ON DELETE CASCADE;
ALTER TABLE "request_preferred_materials" ADD CONSTRAINT "request_preferred_materials_material_id_fkey" FOREIGN KEY ("material_id") REFERENCES "materials"("id") ON DELETE SET NULL;
ALTER TABLE "request_preferred_materials" ADD CONSTRAINT "request_preferred_materials_purchase_request_id_fkey" FOREIGN KEY ("purchase_request_id") REFERENCES "purchase_requests"("id") ON DELETE CASCADE;

-- ----------------------------------------------------------------------------
-- 5. VISTAS (VIEWS)
-- ----------------------------------------------------------------------------

-- v_inventory_value: Resumen del valor total del inventario de materiales
CREATE OR REPLACE VIEW "v_inventory_value" AS 
(
    SELECT sum(stock_actual::numeric * costo_compra) AS valor_costo_inventario, sum(stock_actual::numeric * costo_venta) AS valor_venta_inventario, count(*) AS total_materiales, sum( CASE WHEN stock_actual < 10 THEN 1 ELSE 0 END) AS materiales_stock_bajo FROM materials WHERE deleted_at IS NULL AND activo = true
);

-- v_materials_critical_stock: Lista de materiales con stock crítico (< 10 unidades)
CREATE OR REPLACE VIEW "v_materials_critical_stock" AS 
(
    SELECT m.id, m.nombre, m.unidad, m.stock_actual, m.costo_compra, m.costo_venta, mc.nombre AS categoria_nombre FROM materials m LEFT JOIN material_categories mc ON m.categoria_id = mc.id WHERE m.deleted_at IS NULL AND m.activo = true AND m.stock_actual < 10 ORDER BY m.stock_actual
);

-- v_purchase_requests_complete: Detalle completo de solicitudes y presupuestos asociados
CREATE OR REPLACE VIEW "v_purchase_requests_complete" AS 
(
    SELECT pr.id, pr.cliente_nombre, pr.cliente_email, pr.producto_nombre, pr.is_kit, pr.is_custom, pr.estado, pr.solicitar_explicacion, pr.created_at, b.id AS presupuesto_id, b.nombre AS presupuesto_nombre, b.adelanto_requerido, b.adelanto_monto FROM purchase_requests pr LEFT JOIN budgets b ON pr.id = b.solicitud_id WHERE pr.deleted_at IS NULL ORDER BY pr.created_at DESC
);

-- v_purchase_stats: Estadísticas consolidadas de solicitudes de compra
CREATE OR REPLACE VIEW "v_purchase_stats" AS 
(
    SELECT count(*) AS total_solicitudes, count(*) FILTER (WHERE estado = 'PENDIENTE'::estado_solicitud) AS pendientes, count(*) FILTER (WHERE estado = 'PROCESANDO'::estado_solicitud) AS procesando, count(*) FILTER (WHERE estado = 'COMPLETADO'::estado_solicitud) AS completados, count(*) FILTER (WHERE is_custom = true) AS personalizadas, count(*) FILTER (WHERE is_kit = true) AS kits FROM purchase_requests WHERE deleted_at IS NULL
);

-- v_top_products: Las 10 maquetas/productos más solicitados por los clientes
CREATE OR REPLACE VIEW "v_top_products" AS 
(
    SELECT p.id, p.titulo, p.categoria_id, p.image_url, count(pr.id) AS total_solicitudes FROM products p LEFT JOIN purchase_requests pr ON p.id = pr.producto_id AND pr.deleted_at IS NULL WHERE p.deleted_at IS NULL GROUP BY p.id, p.titulo, p.categoria_id, p.image_url ORDER BY (count(pr.id)) DESC LIMIT 10
);

-- ----------------------------------------------------------------------------
-- 6. TRIGGERS (AUTOMATIC updated_at UPDATE)
-- ----------------------------------------------------------------------------

-- Función generadora de timestamps updated_at automáticos
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Asignación de triggers a tablas con columna updated_at
CREATE OR REPLACE TRIGGER trg_users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE OR REPLACE TRIGGER trg_vendors_updated_at
    BEFORE UPDATE ON vendors
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE OR REPLACE TRIGGER trg_materials_updated_at
    BEFORE UPDATE ON materials
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE OR REPLACE TRIGGER trg_material_categories_updated_at
    BEFORE UPDATE ON material_categories
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE OR REPLACE TRIGGER trg_products_updated_at
    BEFORE UPDATE ON products
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE OR REPLACE TRIGGER trg_purchase_requests_updated_at
    BEFORE UPDATE ON purchase_requests
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE OR REPLACE TRIGGER trg_budgets_updated_at
    BEFORE UPDATE ON budgets
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE OR REPLACE TRIGGER trg_budget_explanation_services_updated_at
    BEFORE UPDATE ON budget_explanation_services
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE OR REPLACE TRIGGER trg_chat_rooms_updated_at
    BEFORE UPDATE ON chat_rooms
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE OR REPLACE TRIGGER trg_chat_extras_updated_at
    BEFORE UPDATE ON chat_extras
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE OR REPLACE TRIGGER trg_complete_kits_updated_at
    BEFORE UPDATE ON complete_kits
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE OR REPLACE TRIGGER trg_maqueta_prices_updated_at
    BEFORE UPDATE ON maqueta_prices
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE OR REPLACE TRIGGER trg_payments_updated_at
    BEFORE UPDATE ON payments
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
