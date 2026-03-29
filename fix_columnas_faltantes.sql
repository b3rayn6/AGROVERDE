-- ============================================================
-- FIX: Columnas faltantes en la nueva base de datos
-- Ejecutar en el SQL Editor del nuevo proyecto Supabase
-- ============================================================

-- mercancias: agregar precio_1
ALTER TABLE mercancias ADD COLUMN IF NOT EXISTS precio_1 NUMERIC;

-- nom_tipos_incentivos: agregar es_fijo
ALTER TABLE nom_tipos_incentivos ADD COLUMN IF NOT EXISTS es_fijo BOOLEAN DEFAULT FALSE;

-- financiamientos: agregar divisa
ALTER TABLE financiamientos ADD COLUMN IF NOT EXISTS divisa TEXT DEFAULT 'DOP';

-- financiamientos_bancarios: agregar monto_prestamo
ALTER TABLE financiamientos_bancarios ADD COLUMN IF NOT EXISTS monto_prestamo NUMERIC;

-- notas_credito: agregar numero_nota
ALTER TABLE notas_credito ADD COLUMN IF NOT EXISTS numero_nota TEXT;

-- items_factura_venta: agregar factura_venta_id
ALTER TABLE items_factura_venta ADD COLUMN IF NOT EXISTS factura_venta_id BIGINT REFERENCES facturas_venta(id);

-- items_factura_compra: agregar divisa
ALTER TABLE items_factura_compra ADD COLUMN IF NOT EXISTS divisa TEXT;
