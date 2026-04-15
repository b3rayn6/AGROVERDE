-- Tabla para almacenar información del servidor
CREATE TABLE IF NOT EXISTS servidor_info (
  id BIGSERIAL PRIMARY KEY,
  pin TEXT NOT NULL,
  espacio_total NUMERIC(10, 2),
  espacio_usado NUMERIC(10, 2),
  espacio_disponible NUMERIC(10, 2),
  cpu_uso NUMERIC(5, 2),
  memoria_total NUMERIC(10, 2),
  memoria_usada NUMERIC(10, 2),
  ultima_actualizacion TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índice para búsquedas rápidas
CREATE INDEX IF NOT EXISTS idx_servidor_info_ultima_actualizacion 
ON servidor_info(ultima_actualizacion DESC);

-- Comentarios para documentación
COMMENT ON TABLE servidor_info IS 'Información y configuración del servidor';
COMMENT ON COLUMN servidor_info.pin IS 'PIN de seguridad del servidor';
COMMENT ON COLUMN servidor_info.espacio_total IS 'Espacio total del disco en GB';
COMMENT ON COLUMN servidor_info.espacio_usado IS 'Espacio usado del disco en GB';
COMMENT ON COLUMN servidor_info.espacio_disponible IS 'Espacio disponible del disco en GB';
COMMENT ON COLUMN servidor_info.cpu_uso IS 'Porcentaje de uso de CPU';
COMMENT ON COLUMN servidor_info.memoria_total IS 'Memoria RAM total en GB';
COMMENT ON COLUMN servidor_info.memoria_usada IS 'Memoria RAM usada en GB';
COMMENT ON COLUMN servidor_info.ultima_actualizacion IS 'Fecha y hora de la última actualización';

-- Insertar registro inicial (opcional)
INSERT INTO servidor_info (pin, espacio_total, espacio_usado, espacio_disponible, cpu_uso, memoria_total, memoria_usada)
VALUES ('1234', 500, 250, 250, 45, 16, 8)
ON CONFLICT DO NOTHING;
