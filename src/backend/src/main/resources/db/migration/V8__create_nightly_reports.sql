CREATE TABLE nightly_reports (
    id UUID PRIMARY KEY,
    fecha TIMESTAMP NOT NULL,
    total_maquetas BIGINT NOT NULL,
    total_solicitudes BIGINT NOT NULL,
    solicitudes_pendientes BIGINT NOT NULL,
    solicitudes_completadas BIGINT NOT NULL,
    total_presupuestos BIGINT NOT NULL,
    total_monto_presupuestado NUMERIC(12, 2) NOT NULL,
    mensajes_no_leidos BIGINT NOT NULL,
    created_at TIMESTAMP NOT NULL
);
