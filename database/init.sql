-- Script de inicialización para la base de datos deliveries
-- Este script se ejecuta automáticamente cuando el contenedor PostgreSQL se inicia por primera vez

-- Crear la tabla de envíos
CREATE TABLE IF NOT EXISTS envios (
    id SERIAL PRIMARY KEY,
    codigo_tracking VARCHAR(50) NOT NULL UNIQUE,
    remitente VARCHAR(150) NOT NULL,
    destinatario VARCHAR(150) NOT NULL,
    direccion_destino VARCHAR(255) NOT NULL,
    peso NUMERIC(10,2) NOT NULL CHECK (peso > 0),
    estado VARCHAR(20) NOT NULL DEFAULT 'REGISTRADO',
    fecha_creacion TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    fecha_actualizacion TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT estado_valido CHECK (
        estado IN (
            'REGISTRADO',
            'EN_TRANSITO',
            'EN_REPARTO',
            'ENTREGADO',
            'CANCELADO'
        )
    )
);

-- Crear tabla de auditoría
CREATE TABLE IF NOT EXISTS audit_logs (
    id SERIAL PRIMARY KEY,
    usuario_id VARCHAR(100) NOT NULL,
    accion VARCHAR(100) NOT NULL,
    entidad_tipo VARCHAR(50) NOT NULL,
    entidad_id VARCHAR(100) NOT NULL,
    metadata JSONB,
    fecha_creacion TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Crear tabla de refresh tokens para sesiones
CREATE TABLE IF NOT EXISTS auth_refresh_tokens (
    id SERIAL PRIMARY KEY,
    token_hash VARCHAR(128) NOT NULL UNIQUE,
    usuario_id VARCHAR(100) NOT NULL,
    revoked_at TIMESTAMP NULL,
    expires_at TIMESTAMP NULL,
    fecha_creacion TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Crear índices para mejor rendimiento
CREATE INDEX IF NOT EXISTS idx_envios_tracking ON envios(codigo_tracking);
CREATE INDEX IF NOT EXISTS idx_envios_estado ON envios(estado);
CREATE INDEX IF NOT EXISTS idx_envios_fecha_creacion ON envios(fecha_creacion);
CREATE INDEX IF NOT EXISTS idx_audit_logs_usuario ON audit_logs(usuario_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_entidad ON audit_logs(entidad_tipo, entidad_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_fecha_creacion ON audit_logs(fecha_creacion);
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_usuario ON auth_refresh_tokens(usuario_id);
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_revoked ON auth_refresh_tokens(revoked_at);
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_expires ON auth_refresh_tokens(expires_at);

-- Insertar datos de ejemplo (opcional)
INSERT INTO envios (codigo_tracking, remitente, destinatario, direccion_destino, peso, estado) VALUES
('TRK-DEMO001', 'Juan Pérez', 'María García', 'Calle Principal #123, Ciudad', 2.5, 'REGISTRADO'),
('TRK-DEMO002', 'Carlos López', 'Ana Martínez', 'Avenida Secundaria #456, Pueblo', 1.8, 'EN_TRANSITO'),
('TRK-DEMO003', 'Roberto Díaz', 'Laura Sánchez', 'Boulevard Central #789, Villa', 3.2, 'ENTREGADO');

-- Mostrar mensaje de confirmación
DO $$
BEGIN
    RAISE NOTICE 'Base de datos "deliveries" inicializada exitosamente';
    RAISE NOTICE 'Tabla "envios" creada con % registros', (SELECT COUNT(*) FROM envios);
END $$;
