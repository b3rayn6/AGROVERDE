-- ============================================
-- MÓDULO DE ACTIVOS FIJOS / PROPIEDAD, PLANTA Y EQUIPO (PPE)
-- ============================================

-- Crear tabla de activos fijos
CREATE TABLE IF NOT EXISTS activos_fijos (
  id BIGSERIAL PRIMARY KEY,
  codigo VARCHAR(50) UNIQUE NOT NULL,
  nombre TEXT NOT NULL,
  categoria TEXT NOT NULL,
  descripcion TEXT,
  fecha_adquisicion DATE NOT NULL,
  costo_adquisicion DECIMAL(12,2) NOT NULL,
  moneda VARCHAR(10) NOT NULL DEFAULT 'DOP',
  vida_util_anos INTEGER NOT NULL,
  valor_residual DECIMAL(12,2) DEFAULT 0,
  metodo_depreciacion TEXT NOT NULL DEFAULT 'lineal',
  ubicacion TEXT,
  estado TEXT NOT NULL DEFAULT 'activo',
  proveedor TEXT,
  numero_serie TEXT,
  numero_factura TEXT,
  depreciacion_acumulada DECIMAL(12,2) DEFAULT 0,
  valor_en_libros DECIMAL(12,2),
  notas TEXT,
  usuario_registro TEXT,
  fecha_registro TIMESTAMPTZ DEFAULT NOW(),
  fecha_actualizacion TIMESTAMPTZ DEFAULT NOW()
);

-- Crear tabla de depreciación mensual
CREATE TABLE IF NOT EXISTS depreciacion_activos (
  id BIGSERIAL PRIMARY KEY,
  activo_id BIGINT REFERENCES activos_fijos(id) ON DELETE CASCADE,
  periodo DATE NOT NULL,
  depreciacion_mensual DECIMAL(12,2) NOT NULL,
  depreciacion_acumulada DECIMAL(12,2) NOT NULL,
  valor_en_libros DECIMAL(12,2) NOT NULL,
  notas TEXT,
  fecha_registro TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(activo_id, periodo)
);

-- Crear tabla de mantenimientos
CREATE TABLE IF NOT EXISTS mantenimientos_activos (
  id BIGSERIAL PRIMARY KEY,
  activo_id BIGINT REFERENCES activos_fijos(id) ON DELETE CASCADE,
  fecha_mantenimiento DATE NOT NULL,
  tipo_mantenimiento TEXT NOT NULL,
  descripcion TEXT,
  costo DECIMAL(12,2) NOT NULL,
  moneda VARCHAR(10) NOT NULL DEFAULT 'DOP',
  proveedor TEXT,
  proximo_mantenimiento DATE,
  realizado_por TEXT,
  fecha_registro TIMESTAMPTZ DEFAULT NOW()
);

-- Crear índices
CREATE INDEX IF NOT EXISTS idx_activos_categoria ON activos_fijos(categoria);
CREATE INDEX IF NOT EXISTS idx_activos_estado ON activos_fijos(estado);
CREATE INDEX IF NOT EXISTS idx_activos_fecha_adquisicion ON activos_fijos(fecha_adquisicion);
CREATE INDEX IF NOT EXISTS idx_depreciacion_periodo ON depreciacion_activos(periodo);
CREATE INDEX IF NOT EXISTS idx_mantenimientos_fecha ON mantenimientos_activos(fecha_mantenimiento);

-- Datos de ejemplo
INSERT INTO activos_fijos (codigo, nombre, categoria, descripcion, fecha_adquisicion, costo_adquisicion, moneda, vida_util_anos, valor_residual, ubicacion, estado, proveedor, usuario_registro) VALUES
('VEH-001', 'Camión Mack 2020', 'Vehículos', 'Camión de carga pesada para transporte', '2020-01-15', 2500000, 'DOP', 10, 250000, 'Garaje Principal', 'activo', 'Mack Trucks RD', 'Admin'),
('MAQ-001', 'Montacargas Toyota', 'Maquinaria', 'Montacargas eléctrico 3 toneladas', '2021-03-10', 850000, 'DOP', 8, 85000, 'Almacén A', 'activo', 'Toyota Forklifts', 'Admin'),
('EDI-001', 'Edificio Almacén Principal', 'Edificios', 'Edificio de almacenamiento 500m2', '2018-06-01', 15000000, 'DOP', 30, 1500000, 'Zona Industrial', 'activo', 'Constructora XYZ', 'Admin'),
('EQP-001', 'Báscula Industrial 10 Ton', 'Equipos', 'Báscula electrónica de plataforma', '2019-11-20', 350000, 'DOP', 12, 35000, 'Almacén A', 'activo', 'Básculas del Caribe', 'Admin'),
('MOB-001', 'Escritorios y Sillas Oficina', 'Mobiliario', 'Set completo para oficina administrativa', '2022-02-15', 120000, 'DOP', 5, 12000, 'Oficina Administrativa', 'activo', 'Muebles Office', 'Admin')
ON CONFLICT (codigo) DO NOTHING;