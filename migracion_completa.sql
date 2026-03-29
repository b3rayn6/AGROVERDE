-- ============================================================
-- MIGRACIÓN COMPLETA DE BASE DE DATOS
-- Sistema de Gestión: Pesadas, Facturación, Nómina, Contabilidad
-- Generado: 2026-03-29
-- ============================================================
-- INSTRUCCIONES:
-- 1. Crear un nuevo proyecto en Supabase
-- 2. Ejecutar este script en el SQL Editor del nuevo proyecto
-- 3. Actualizar las variables VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY en .env
-- ============================================================

-- =====================
-- TABLAS INDEPENDIENTES (sin foreign keys)
-- =====================

-- 1. clientes
CREATE TABLE IF NOT EXISTS clientes (
  id BIGSERIAL PRIMARY KEY,
  nombre TEXT NOT NULL,
  cedula TEXT,
  cedula_rnc TEXT,
  telefono TEXT,
  email TEXT,
  direccion TEXT,
  limite_credito NUMERIC,
  balance_pendiente NUMERIC DEFAULT 0,
  favorite_color TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. suplidores
CREATE TABLE IF NOT EXISTS suplidores (
  id BIGSERIAL PRIMARY KEY,
  nombre TEXT NOT NULL,
  rnc TEXT,
  telefono TEXT,
  email TEXT,
  direccion TEXT,
  balance_pendiente NUMERIC DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. empleados
CREATE TABLE IF NOT EXISTS empleados (
  id BIGSERIAL PRIMARY KEY,
  nombre TEXT NOT NULL,
  cedula TEXT NOT NULL,
  cargo TEXT NOT NULL,
  salario NUMERIC NOT NULL,
  telefono TEXT,
  direccion TEXT,
  fecha_ingreso DATE NOT NULL,
  activo BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. users (autenticación legacy)
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre TEXT NOT NULL,
  email TEXT NOT NULL,
  password_hash TEXT NOT NULL,
  favorite_color TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. roles
CREATE TABLE IF NOT EXISTS roles (
  id BIGSERIAL PRIMARY KEY,
  nombre TEXT NOT NULL,
  descripcion TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. modulos
CREATE TABLE IF NOT EXISTS modulos (
  id BIGSERIAL PRIMARY KEY,
  codigo TEXT NOT NULL,
  nombre TEXT NOT NULL,
  descripcion TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. mercancias (inventario)
CREATE TABLE IF NOT EXISTS mercancias (
  id BIGSERIAL PRIMARY KEY,
  codigo TEXT,
  nombre TEXT NOT NULL,
  descripcion TEXT,
  categoria TEXT,
  unidad_medida TEXT,
  precio_compra NUMERIC,
  precio_venta NUMERIC,
  stock_actual NUMERIC DEFAULT 0,
  stock_minimo NUMERIC DEFAULT 0,
  activo BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 8. configuracion_divisa
CREATE TABLE IF NOT EXISTS configuracion_divisa (
  id BIGSERIAL PRIMARY KEY,
  tasa_dolar NUMERIC,
  actualizado_por TEXT,
  fecha_actualizacion TIMESTAMPTZ DEFAULT NOW()
);

-- 9. contador_global
CREATE TABLE IF NOT EXISTS contador_global (
  id BIGSERIAL PRIMARY KEY,
  visitas INTEGER DEFAULT 0,
  ultima_actualizacion TIMESTAMPTZ DEFAULT NOW()
);

-- 10. counter
CREATE TABLE IF NOT EXISTS counter (
  id BIGSERIAL PRIMARY KEY,
  user_id TEXT NOT NULL,
  value INTEGER DEFAULT 0,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 11. profiles
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY,
  email TEXT NOT NULL,
  full_name TEXT,
  age INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 12. reviews
CREATE TABLE IF NOT EXISTS reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  author_name TEXT NOT NULL,
  content TEXT NOT NULL,
  rating INTEGER NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 13. pasivos
CREATE TABLE IF NOT EXISTS pasivos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  descripcion TEXT NOT NULL,
  monto NUMERIC NOT NULL,
  acreedor TEXT NOT NULL,
  fecha_registro DATE DEFAULT CURRENT_DATE,
  fecha_vencimiento DATE,
  estado TEXT DEFAULT 'pendiente',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 14. activos_fijos
CREATE TABLE IF NOT EXISTS activos_fijos (
  id BIGSERIAL PRIMARY KEY,
  codigo VARCHAR(50) UNIQUE NOT NULL,
  nombre TEXT NOT NULL,
  categoria TEXT NOT NULL,
  descripcion TEXT,
  fecha_adquisicion DATE NOT NULL,
  costo_adquisicion DECIMAL(12,2) NOT NULL,
  moneda VARCHAR(10) DEFAULT 'DOP',
  vida_util_anos INTEGER NOT NULL,
  valor_residual DECIMAL(12,2) DEFAULT 0,
  metodo_depreciacion TEXT DEFAULT 'lineal',
  ubicacion TEXT,
  estado TEXT DEFAULT 'activo',
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

-- 15. catalogo_cuentas (contabilidad)
CREATE TABLE IF NOT EXISTS catalogo_cuentas (
  id BIGSERIAL PRIMARY KEY,
  codigo TEXT NOT NULL,
  nombre TEXT NOT NULL,
  tipo TEXT NOT NULL,
  subtipo TEXT,
  nivel INTEGER,
  cuenta_padre_id BIGINT REFERENCES catalogo_cuentas(id),
  saldo_inicial NUMERIC DEFAULT 0,
  saldo_actual NUMERIC DEFAULT 0,
  activa BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================
-- TABLAS CON DEPENDENCIAS NIVEL 1
-- =====================

-- 16. usuarios_sistema
CREATE TABLE IF NOT EXISTS usuarios_sistema (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  legacy_id BIGSERIAL,
  nombre_completo TEXT NOT NULL,
  email TEXT NOT NULL,
  password TEXT NOT NULL,
  rol_id BIGINT REFERENCES roles(id),
  activo BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 17. permisos_usuario
CREATE TABLE IF NOT EXISTS permisos_usuario (
  id BIGSERIAL PRIMARY KEY,
  usuario_id UUID NOT NULL REFERENCES usuarios_sistema(id),
  usuario_legacy_id INTEGER,
  modulo_id BIGINT REFERENCES modulos(id),
  puede_ver BOOLEAN DEFAULT FALSE,
  puede_crear BOOLEAN DEFAULT FALSE,
  puede_editar BOOLEAN DEFAULT FALSE,
  puede_eliminar BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 18. choferes
CREATE TABLE IF NOT EXISTS choferes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre TEXT NOT NULL,
  placa TEXT,
  user_id UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 19. saldo_clientes
CREATE TABLE IF NOT EXISTS saldo_clientes (
  id BIGSERIAL PRIMARY KEY,
  cliente_id BIGINT UNIQUE REFERENCES clientes(id),
  saldo_favor NUMERIC DEFAULT 0,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 20. salidas_pais
CREATE TABLE IF NOT EXISTS salidas_pais (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cliente_id BIGINT NOT NULL REFERENCES clientes(id),
  pais_origen TEXT NOT NULL,
  pais_destino TEXT NOT NULL,
  fecha_salida DATE NOT NULL,
  fecha_regreso DATE,
  notas TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 21. pesadas
CREATE TABLE IF NOT EXISTS pesadas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  numero_pesada TEXT,
  fecha DATE DEFAULT CURRENT_DATE,
  nombre_productor TEXT NOT NULL,
  cliente_id BIGINT REFERENCES clientes(id),
  variedad TEXT NOT NULL,
  cantidad_sacos INTEGER NOT NULL,
  kilos_bruto NUMERIC NOT NULL,
  tara NUMERIC NOT NULL,
  kilos_neto NUMERIC NOT NULL,
  porcentaje_humedad NUMERIC NOT NULL,
  fanegas NUMERIC NOT NULL,
  precio_por_fanega NUMERIC NOT NULL,
  valor_total NUMERIC NOT NULL,
  avance_efectivo NUMERIC DEFAULT 0,
  saldo_disponible NUMERIC DEFAULT 0,
  usado_compensacion BOOLEAN DEFAULT FALSE,
  direccion TEXT,
  notas TEXT,
  user_id UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 22. facturas_venta
CREATE TABLE IF NOT EXISTS facturas_venta (
  id BIGSERIAL PRIMARY KEY,
  numero_factura TEXT NOT NULL,
  fecha DATE NOT NULL,
  cliente_id BIGINT REFERENCES clientes(id),
  subtotal NUMERIC NOT NULL,
  itbis NUMERIC DEFAULT 0,
  descuento_porcentaje NUMERIC DEFAULT 0,
  descuento_monto NUMERIC DEFAULT 0,
  total NUMERIC NOT NULL,
  monto_pagado NUMERIC DEFAULT 0,
  balance_pendiente NUMERIC NOT NULL,
  divisa TEXT DEFAULT 'DOP',
  tasa_cambio NUMERIC DEFAULT 1,
  estado TEXT DEFAULT 'pendiente',
  firma_cliente TEXT,
  notas TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 23. facturas_compra
CREATE TABLE IF NOT EXISTS facturas_compra (
  id BIGSERIAL PRIMARY KEY,
  numero_factura TEXT NOT NULL,
  fecha DATE NOT NULL,
  suplidor_id BIGINT REFERENCES suplidores(id),
  subtotal NUMERIC NOT NULL,
  itbis NUMERIC DEFAULT 0,
  aplicar_itbis BOOLEAN DEFAULT FALSE,
  total NUMERIC NOT NULL,
  monto_pagado NUMERIC DEFAULT 0,
  balance_pendiente NUMERIC NOT NULL,
  divisa TEXT DEFAULT 'DOP',
  tasa_cambio NUMERIC DEFAULT 1,
  metodo_pago TEXT,
  estado TEXT DEFAULT 'pendiente',
  fecha_vencimiento DATE,
  notas TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 24. facturas_factoria
CREATE TABLE IF NOT EXISTS facturas_factoria (
  id BIGSERIAL PRIMARY KEY,
  fecha DATE NOT NULL,
  nombre_factoria TEXT NOT NULL,
  cliente TEXT NOT NULL,
  numero_pesada TEXT,
  cantidad_sacos INTEGER NOT NULL,
  kilos_bruto NUMERIC NOT NULL,
  kilos_neto NUMERIC NOT NULL,
  humedad NUMERIC NOT NULL,
  fanegas NUMERIC NOT NULL,
  precio_fanega NUMERIC NOT NULL,
  valor_pagar NUMERIC NOT NULL,
  estado_pago TEXT DEFAULT 'pendiente',
  fecha_pago DATE,
  notas TEXT,
  user_id UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 25. cheques_factoria
CREATE TABLE IF NOT EXISTS cheques_factoria (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  fecha DATE NOT NULL,
  factoria TEXT NOT NULL,
  numero_cheque TEXT NOT NULL,
  monto NUMERIC NOT NULL,
  notas TEXT,
  user_id UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 26. cuentas_por_cobrar
CREATE TABLE IF NOT EXISTS cuentas_por_cobrar (
  id BIGSERIAL PRIMARY KEY,
  referencia TEXT NOT NULL,
  tipo TEXT NOT NULL,
  cliente TEXT NOT NULL,
  cliente_id BIGINT REFERENCES clientes(id),
  cedula TEXT,
  fecha_emision DATE NOT NULL,
  fecha_vencimiento DATE,
  monto_principal NUMERIC DEFAULT 0,
  monto_interes NUMERIC DEFAULT 0,
  monto_total NUMERIC NOT NULL,
  monto_pendiente NUMERIC NOT NULL,
  divisa TEXT DEFAULT 'DOP',
  estado TEXT DEFAULT 'pendiente',
  notas TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 27. cuentas_por_pagar_suplidores
CREATE TABLE IF NOT EXISTS cuentas_por_pagar_suplidores (
  id BIGSERIAL PRIMARY KEY,
  suplidor_id BIGINT REFERENCES suplidores(id),
  suplidor_nombre TEXT NOT NULL,
  numero_factura TEXT NOT NULL,
  fecha_factura DATE NOT NULL,
  fecha_vencimiento DATE,
  monto NUMERIC NOT NULL,
  descripcion TEXT,
  estado TEXT DEFAULT 'pendiente',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 28. financiamientos (préstamos)
CREATE TABLE IF NOT EXISTS financiamientos (
  id BIGSERIAL PRIMARY KEY,
  nombre_cliente TEXT NOT NULL,
  cedula_cliente TEXT NOT NULL,
  cliente_id BIGINT REFERENCES clientes(id),
  monto_prestado NUMERIC NOT NULL,
  tasa_interes NUMERIC NOT NULL,
  plazo_meses INTEGER NOT NULL,
  fecha_prestamo DATE NOT NULL,
  fecha_vencimiento DATE,
  balance_pendiente NUMERIC NOT NULL,
  estado TEXT DEFAULT 'activo',
  notas TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 29. financiamientos_bancarios
CREATE TABLE IF NOT EXISTS financiamientos_bancarios (
  id BIGSERIAL PRIMARY KEY,
  banco TEXT NOT NULL,
  tipo_financiamiento TEXT NOT NULL,
  monto NUMERIC NOT NULL,
  tasa_interes NUMERIC,
  plazo_meses INTEGER,
  fecha_inicio DATE NOT NULL,
  fecha_vencimiento DATE,
  cuota_mensual NUMERIC,
  balance_pendiente NUMERIC,
  estado TEXT DEFAULT 'activo',
  notas TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 30. gastos
CREATE TABLE IF NOT EXISTS gastos (
  id BIGSERIAL PRIMARY KEY,
  fecha DATE NOT NULL,
  categoria TEXT NOT NULL,
  descripcion TEXT,
  monto NUMERIC NOT NULL,
  metodo_pago TEXT,
  referencia TEXT,
  notas TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 31. nomina (legacy)
CREATE TABLE IF NOT EXISTS nomina (
  id BIGSERIAL PRIMARY KEY,
  empleado_id BIGINT REFERENCES empleados(id),
  periodo_inicio DATE NOT NULL,
  periodo_fin DATE NOT NULL,
  salario_base NUMERIC NOT NULL,
  horas_extra NUMERIC DEFAULT 0,
  monto_horas_extra NUMERIC DEFAULT 0,
  bonificaciones NUMERIC DEFAULT 0,
  deducciones NUMERIC DEFAULT 0,
  sfs NUMERIC DEFAULT 0,
  afp NUMERIC DEFAULT 0,
  isr NUMERIC DEFAULT 0,
  otros_descuentos NUMERIC DEFAULT 0,
  neto_pagar NUMERIC NOT NULL,
  estado TEXT DEFAULT 'pendiente',
  notas TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 32. depreciacion_activos
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

-- 33. mantenimientos_activos
CREATE TABLE IF NOT EXISTS mantenimientos_activos (
  id BIGSERIAL PRIMARY KEY,
  activo_id BIGINT REFERENCES activos_fijos(id) ON DELETE CASCADE,
  fecha_mantenimiento DATE NOT NULL,
  tipo_mantenimiento TEXT NOT NULL,
  descripcion TEXT,
  costo DECIMAL(12,2) NOT NULL,
  moneda VARCHAR(10) DEFAULT 'DOP',
  proveedor TEXT,
  proximo_mantenimiento DATE,
  realizado_por TEXT,
  fecha_registro TIMESTAMPTZ DEFAULT NOW()
);

-- 34. counter_history
CREATE TABLE IF NOT EXISTS counter_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  counter_id BIGINT NOT NULL,
  user_id TEXT,
  previous_value INTEGER NOT NULL,
  new_value INTEGER NOT NULL,
  change_amount INTEGER NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================
-- TABLAS CON DEPENDENCIAS NIVEL 2
-- =====================

-- 35. cuadre_caja
CREATE TABLE IF NOT EXISTS cuadre_caja (
  id BIGSERIAL PRIMARY KEY,
  fecha DATE DEFAULT CURRENT_DATE,
  concepto TEXT NOT NULL,
  tipo_movimiento TEXT NOT NULL,
  monto NUMERIC NOT NULL,
  divisa TEXT DEFAULT 'DOP',
  metodo_pago TEXT,
  referencia TEXT,
  descripcion TEXT,
  categoria TEXT,
  cliente_id BIGINT,
  cuenta_cobrar_id BIGINT REFERENCES cuentas_por_cobrar(id),
  factura_id BIGINT,
  proveedor TEXT,
  notas TEXT,
  usuario_id BIGINT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 36. movimientos_caja
CREATE TABLE IF NOT EXISTS movimientos_caja (
  id BIGSERIAL PRIMARY KEY,
  fecha DATE DEFAULT CURRENT_DATE,
  concepto TEXT NOT NULL,
  tipo TEXT NOT NULL,
  monto NUMERIC NOT NULL,
  metodo_pago TEXT,
  referencia TEXT,
  notas TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 37. compensaciones
CREATE TABLE IF NOT EXISTS compensaciones (
  id BIGSERIAL PRIMARY KEY,
  cliente_id BIGINT REFERENCES clientes(id),
  pesada_id UUID REFERENCES pesadas(id),
  fecha DATE DEFAULT CURRENT_DATE,
  deuda_anterior NUMERIC NOT NULL,
  monto_compensado NUMERIC NOT NULL,
  deuda_nueva NUMERIC NOT NULL,
  saldo_favor NUMERIC DEFAULT 0,
  notas TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 38. compensaciones_cuentas (nota_credito_id FK se agrega al final del script)
CREATE TABLE IF NOT EXISTS compensaciones_cuentas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  fecha DATE DEFAULT CURRENT_DATE,
  cuenta_cobrar_id BIGINT REFERENCES cuentas_por_cobrar(id),
  cuenta_pagar_id BIGINT REFERENCES facturas_compra(id),
  pesada_id UUID REFERENCES pesadas(id),
  nota_credito_id UUID,
  monto_compensado NUMERIC NOT NULL,
  saldo_favor NUMERIC DEFAULT 0,
  notas TEXT,
  user_id UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 39. cobros_clientes
CREATE TABLE IF NOT EXISTS cobros_clientes (
  id BIGSERIAL PRIMARY KEY,
  cliente_id BIGINT REFERENCES clientes(id),
  factura_venta_id BIGINT REFERENCES facturas_venta(id),
  fecha DATE NOT NULL,
  monto NUMERIC NOT NULL,
  metodo_pago TEXT,
  referencia TEXT,
  notas TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 41. cobros_ventas
CREATE TABLE IF NOT EXISTS cobros_ventas (
  id BIGSERIAL PRIMARY KEY,
  venta_id BIGINT,
  fecha_cobro DATE NOT NULL,
  monto NUMERIC NOT NULL,
  metodo_pago TEXT NOT NULL,
  notas TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 42. items_factura_venta
CREATE TABLE IF NOT EXISTS items_factura_venta (
  id BIGSERIAL PRIMARY KEY,
  factura_id BIGINT REFERENCES facturas_venta(id) ON DELETE CASCADE,
  mercancia_id BIGINT REFERENCES mercancias(id),
  producto_nombre TEXT NOT NULL,
  cantidad NUMERIC NOT NULL,
  precio_unitario NUMERIC NOT NULL,
  subtotal NUMERIC NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 43. items_factura_compra
CREATE TABLE IF NOT EXISTS items_factura_compra (
  id BIGSERIAL PRIMARY KEY,
  factura_id BIGINT REFERENCES facturas_compra(id) ON DELETE CASCADE,
  mercancia_id BIGINT REFERENCES mercancias(id),
  producto_nombre TEXT NOT NULL,
  cantidad NUMERIC NOT NULL,
  precio_unitario NUMERIC NOT NULL,
  subtotal NUMERIC NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 44. pagos_suplidores
CREATE TABLE IF NOT EXISTS pagos_suplidores (
  id BIGSERIAL PRIMARY KEY,
  suplidor_id BIGINT REFERENCES suplidores(id),
  factura_compra_id BIGINT REFERENCES facturas_compra(id),
  fecha DATE NOT NULL,
  monto NUMERIC NOT NULL,
  metodo_pago TEXT,
  referencia TEXT,
  notas TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 45. pagos_prestamos
CREATE TABLE IF NOT EXISTS pagos_prestamos (
  id BIGSERIAL PRIMARY KEY,
  prestamo_id BIGINT REFERENCES financiamientos(id),
  fecha_pago DATE NOT NULL,
  monto_pagado NUMERIC NOT NULL,
  balance_actualizado NUMERIC NOT NULL,
  notas TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 46. pagos_financiamientos
CREATE TABLE IF NOT EXISTS pagos_financiamientos (
  id BIGSERIAL PRIMARY KEY,
  financiamiento_id BIGINT REFERENCES financiamientos_bancarios(id),
  fecha_pago DATE NOT NULL,
  monto NUMERIC NOT NULL,
  capital NUMERIC DEFAULT 0,
  interes NUMERIC DEFAULT 0,
  notas TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 47. fletes
CREATE TABLE IF NOT EXISTS fletes (
  id BIGSERIAL PRIMARY KEY,
  fecha DATE NOT NULL,
  chofer TEXT NOT NULL,
  placa TEXT,
  origen TEXT,
  destino TEXT,
  cantidad_sacos INTEGER NOT NULL,
  precio_por_saco NUMERIC NOT NULL,
  total_flete NUMERIC NOT NULL,
  pesada_id UUID REFERENCES pesadas(id),
  cliente_id BIGINT REFERENCES clientes(id),
  estado TEXT DEFAULT 'pendiente',
  metodo_pago TEXT,
  notas TEXT,
  user_id UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 48. gastos_flete
CREATE TABLE IF NOT EXISTS gastos_flete (
  id BIGSERIAL PRIMARY KEY,
  flete_id BIGINT REFERENCES fletes(id),
  chofer TEXT,
  descripcion TEXT,
  monto NUMERIC NOT NULL,
  fecha DATE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 49. pagos_obreros
CREATE TABLE IF NOT EXISTS pagos_obreros (
  id BIGSERIAL PRIMARY KEY,
  fecha DATE NOT NULL,
  nombre_obrero TEXT NOT NULL,
  cedula_obrero TEXT,
  pesada_id UUID REFERENCES pesadas(id),
  cantidad_sacos INTEGER NOT NULL,
  precio_por_saco NUMERIC NOT NULL,
  total_pago NUMERIC NOT NULL,
  metodo_pago TEXT,
  referencia TEXT,
  notas TEXT,
  user_id UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 50. ventas_diarias
CREATE TABLE IF NOT EXISTS ventas_diarias (
  id BIGSERIAL PRIMARY KEY,
  fecha DATE NOT NULL,
  numero_factura TEXT NOT NULL,
  cliente_id BIGINT REFERENCES clientes(id),
  factura_venta_id BIGINT REFERENCES facturas_venta(id),
  tipo_venta TEXT NOT NULL,
  subtotal NUMERIC NOT NULL,
  itbis NUMERIC DEFAULT 0,
  total NUMERIC NOT NULL,
  monto_pagado NUMERIC DEFAULT 0,
  balance_pendiente NUMERIC DEFAULT 0,
  metodo_pago TEXT,
  estado TEXT DEFAULT 'completada',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 51. ventas_diarias_items
CREATE TABLE IF NOT EXISTS ventas_diarias_items (
  id BIGSERIAL PRIMARY KEY,
  venta_id BIGINT REFERENCES ventas_diarias(id) ON DELETE CASCADE,
  mercancia_id BIGINT REFERENCES mercancias(id),
  producto_nombre TEXT NOT NULL,
  cantidad NUMERIC NOT NULL,
  precio_unitario NUMERIC NOT NULL,
  subtotal NUMERIC NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 52. libro_diario (contabilidad)
CREATE TABLE IF NOT EXISTS libro_diario (
  id BIGSERIAL PRIMARY KEY,
  fecha DATE NOT NULL,
  cuenta_codigo TEXT NOT NULL,
  cuenta_nombre TEXT NOT NULL,
  descripcion TEXT,
  debe NUMERIC DEFAULT 0,
  haber NUMERIC DEFAULT 0,
  referencia TEXT,
  tipo_transaccion TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 53. utilidad_neta
CREATE TABLE IF NOT EXISTS utilidad_neta (
  id BIGSERIAL PRIMARY KEY,
  fecha DATE NOT NULL,
  tipo TEXT NOT NULL,
  descripcion TEXT NOT NULL,
  venta_total NUMERIC DEFAULT 0,
  costo_compra NUMERIC DEFAULT 0,
  fletes NUMERIC DEFAULT 0,
  obreros NUMERIC DEFAULT 0,
  otros_gastos NUMERIC DEFAULT 0,
  utilidad NUMERIC DEFAULT 0,
  referencia_id BIGINT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 54. notas_credito (necesaria antes de compensaciones_cuentas)
CREATE TABLE IF NOT EXISTS notas_credito (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  numero TEXT NOT NULL,
  fecha DATE NOT NULL,
  cliente_nombre TEXT NOT NULL,
  cliente_id BIGINT REFERENCES clientes(id),
  monto NUMERIC NOT NULL,
  motivo TEXT,
  estado TEXT DEFAULT 'activa',
  factura_venta_id BIGINT REFERENCES facturas_venta(id),
  notas TEXT,
  user_id UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================
-- MÓDULO DE NÓMINA (nom_*)
-- =====================

-- 55. nom_departamentos
CREATE TABLE IF NOT EXISTS nom_departamentos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre TEXT NOT NULL,
  descripcion TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 56. nom_puestos
CREATE TABLE IF NOT EXISTS nom_puestos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre TEXT NOT NULL,
  departamento_id UUID REFERENCES nom_departamentos(id),
  salario_base NUMERIC,
  descripcion TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 57. nom_empleados
CREATE TABLE IF NOT EXISTS nom_empleados (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre TEXT NOT NULL,
  apellido TEXT NOT NULL,
  cedula TEXT,
  fecha_nacimiento DATE,
  sexo TEXT,
  estado_civil TEXT,
  direccion TEXT,
  telefono TEXT,
  email TEXT,
  fecha_ingreso DATE NOT NULL,
  fecha_salida DATE,
  departamento_id UUID REFERENCES nom_departamentos(id),
  puesto_id UUID REFERENCES nom_puestos(id),
  tipo_contrato TEXT DEFAULT 'indefinido',
  salario_base NUMERIC NOT NULL,
  cuenta_banco TEXT,
  banco TEXT,
  tipo_cuenta TEXT,
  estado TEXT DEFAULT 'activo',
  foto_url TEXT,
  notas TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 58. nom_tipos_incentivos
CREATE TABLE IF NOT EXISTS nom_tipos_incentivos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre TEXT NOT NULL,
  descripcion TEXT,
  tipo TEXT DEFAULT 'fijo',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 59. nom_incentivos
CREATE TABLE IF NOT EXISTS nom_incentivos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empleado_id UUID REFERENCES nom_empleados(id),
  tipo_incentivo_id UUID REFERENCES nom_tipos_incentivos(id),
  monto NUMERIC NOT NULL,
  fecha DATE NOT NULL,
  descripcion TEXT,
  estado TEXT DEFAULT 'pendiente',
  aprobado_por TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 60. nom_nominas
CREATE TABLE IF NOT EXISTS nom_nominas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  periodo_inicio DATE NOT NULL,
  periodo_fin DATE NOT NULL,
  tipo_nomina TEXT DEFAULT 'quincenal',
  fecha_pago DATE,
  total_bruto NUMERIC DEFAULT 0,
  total_deducciones NUMERIC DEFAULT 0,
  total_neto NUMERIC DEFAULT 0,
  estado TEXT DEFAULT 'borrador',
  notas TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 61. nom_detalle_nomina
CREATE TABLE IF NOT EXISTS nom_detalle_nomina (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nomina_id UUID REFERENCES nom_nominas(id) ON DELETE CASCADE,
  empleado_id UUID REFERENCES nom_empleados(id),
  salario_base NUMERIC NOT NULL,
  horas_extra NUMERIC DEFAULT 0,
  monto_horas_extra NUMERIC DEFAULT 0,
  incentivos NUMERIC DEFAULT 0,
  total_ingresos NUMERIC NOT NULL,
  sfs NUMERIC DEFAULT 0,
  afp NUMERIC DEFAULT 0,
  isr NUMERIC DEFAULT 0,
  otros_descuentos NUMERIC DEFAULT 0,
  total_deducciones NUMERIC DEFAULT 0,
  neto_pagar NUMERIC NOT NULL,
  detalle_deducciones JSONB,
  detalle_incentivos JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 62. nom_prestamos
CREATE TABLE IF NOT EXISTS nom_prestamos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empleado_id UUID REFERENCES nom_empleados(id),
  monto NUMERIC NOT NULL,
  cuota_mensual NUMERIC NOT NULL,
  plazo_meses INTEGER NOT NULL,
  balance_pendiente NUMERIC NOT NULL,
  tasa_interes NUMERIC DEFAULT 0,
  fecha_inicio DATE NOT NULL,
  fecha_fin DATE,
  estado TEXT DEFAULT 'activo',
  motivo TEXT,
  notas TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 63. nom_cuotas_prestamos
CREATE TABLE IF NOT EXISTS nom_cuotas_prestamos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  prestamo_id UUID REFERENCES nom_prestamos(id) ON DELETE CASCADE,
  numero_cuota INTEGER NOT NULL,
  monto NUMERIC NOT NULL,
  fecha_pago DATE,
  estado TEXT DEFAULT 'pendiente',
  nomina_id UUID REFERENCES nom_nominas(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 64. nom_adelantos
CREATE TABLE IF NOT EXISTS nom_adelantos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empleado_id UUID REFERENCES nom_empleados(id),
  monto NUMERIC NOT NULL,
  fecha DATE NOT NULL,
  motivo TEXT,
  estado TEXT DEFAULT 'pendiente',
  nomina_id UUID REFERENCES nom_nominas(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 65. nom_acciones_personal
CREATE TABLE IF NOT EXISTS nom_acciones_personal (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empleado_id UUID REFERENCES nom_empleados(id),
  tipo_accion TEXT NOT NULL,
  fecha_efectiva DATE NOT NULL,
  descripcion TEXT,
  valor_anterior TEXT,
  valor_nuevo TEXT,
  aprobado_por TEXT,
  notas TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 66. nom_candidatos
CREATE TABLE IF NOT EXISTS nom_candidatos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre TEXT NOT NULL,
  apellido TEXT NOT NULL,
  cedula TEXT,
  telefono TEXT,
  email TEXT,
  puesto_aplicado TEXT,
  fecha_aplicacion DATE DEFAULT CURRENT_DATE,
  estado TEXT DEFAULT 'recibido',
  experiencia_anos INTEGER DEFAULT 0,
  educacion TEXT,
  notas TEXT,
  curriculum_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================
-- AHORA AGREGAR FK DE compensaciones_cuentas -> notas_credito
-- (notas_credito ya fue creada arriba)
-- =====================
-- Nota: Si ejecutas todo de corrido, necesitas reordenar notas_credito ANTES de compensaciones_cuentas.
-- Alternativa: agregar la FK después:
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'compensaciones_cuentas_nota_credito_id_fkey'
  ) THEN
    ALTER TABLE compensaciones_cuentas 
    ADD CONSTRAINT compensaciones_cuentas_nota_credito_id_fkey 
    FOREIGN KEY (nota_credito_id) REFERENCES notas_credito(id);
  END IF;
END $$;

-- =====================
-- ÍNDICES
-- =====================
CREATE INDEX IF NOT EXISTS idx_pesadas_cliente_id ON pesadas(cliente_id);
CREATE INDEX IF NOT EXISTS idx_pesadas_fecha ON pesadas(fecha);
CREATE INDEX IF NOT EXISTS idx_facturas_venta_cliente_id ON facturas_venta(cliente_id);
CREATE INDEX IF NOT EXISTS idx_facturas_venta_fecha ON facturas_venta(fecha);
CREATE INDEX IF NOT EXISTS idx_facturas_compra_suplidor_id ON facturas_compra(suplidor_id);
CREATE INDEX IF NOT EXISTS idx_facturas_compra_fecha ON facturas_compra(fecha);
CREATE INDEX IF NOT EXISTS idx_cuadre_caja_fecha ON cuadre_caja(fecha);
CREATE INDEX IF NOT EXISTS idx_cuadre_caja_concepto ON cuadre_caja(concepto);
CREATE INDEX IF NOT EXISTS idx_cuentas_por_cobrar_cliente_id ON cuentas_por_cobrar(cliente_id);
CREATE INDEX IF NOT EXISTS idx_cuentas_por_cobrar_estado ON cuentas_por_cobrar(estado);
CREATE INDEX IF NOT EXISTS idx_compensaciones_cliente_id ON compensaciones(cliente_id);
CREATE INDEX IF NOT EXISTS idx_fletes_pesada_id ON fletes(pesada_id);
CREATE INDEX IF NOT EXISTS idx_fletes_fecha ON fletes(fecha);
CREATE INDEX IF NOT EXISTS idx_gastos_fecha ON gastos(fecha);
CREATE INDEX IF NOT EXISTS idx_gastos_categoria ON gastos(categoria);
CREATE INDEX IF NOT EXISTS idx_ventas_diarias_fecha ON ventas_diarias(fecha);
CREATE INDEX IF NOT EXISTS idx_libro_diario_fecha ON libro_diario(fecha);
CREATE INDEX IF NOT EXISTS idx_libro_diario_cuenta ON libro_diario(cuenta_codigo);
CREATE INDEX IF NOT EXISTS idx_activos_categoria ON activos_fijos(categoria);
CREATE INDEX IF NOT EXISTS idx_activos_estado ON activos_fijos(estado);
CREATE INDEX IF NOT EXISTS idx_depreciacion_periodo ON depreciacion_activos(periodo);
CREATE INDEX IF NOT EXISTS idx_mantenimientos_fecha ON mantenimientos_activos(fecha_mantenimiento);
CREATE INDEX IF NOT EXISTS idx_nom_empleados_departamento ON nom_empleados(departamento_id);
CREATE INDEX IF NOT EXISTS idx_nom_empleados_estado ON nom_empleados(estado);
CREATE INDEX IF NOT EXISTS idx_nom_detalle_nomina_nomina ON nom_detalle_nomina(nomina_id);
CREATE INDEX IF NOT EXISTS idx_nom_detalle_nomina_empleado ON nom_detalle_nomina(empleado_id);
CREATE INDEX IF NOT EXISTS idx_financiamientos_cliente ON financiamientos(cliente_id);
CREATE INDEX IF NOT EXISTS idx_pagos_prestamos_prestamo ON pagos_prestamos(prestamo_id);
CREATE INDEX IF NOT EXISTS idx_cobros_clientes_cliente ON cobros_clientes(cliente_id);
CREATE INDEX IF NOT EXISTS idx_pagos_suplidores_suplidor ON pagos_suplidores(suplidor_id);
CREATE INDEX IF NOT EXISTS idx_pagos_obreros_pesada ON pagos_obreros(pesada_id);

-- =====================
-- VISTA: financiamientos actualizados con interés calculado
-- =====================
CREATE OR REPLACE VIEW vista_financiamientos_actualizados AS
SELECT
  f.id,
  f.nombre_cliente,
  f.cedula_cliente,
  f.cliente_id,
  f.monto_prestado,
  f.tasa_interes,
  f.plazo_meses,
  f.fecha_prestamo,
  f.fecha_vencimiento,
  f.balance_pendiente,
  f.estado,
  f.created_at,
  (CURRENT_DATE - f.fecha_prestamo) AS dias_transcurridos,
  (f.balance_pendiente * f.tasa_interes / 100 / 365) AS interes_diario,
  (f.balance_pendiente * f.tasa_interes / 100 / 365 * (CURRENT_DATE - f.fecha_prestamo)) AS interes_acumulado_actual,
  (f.balance_pendiente + f.balance_pendiente * f.tasa_interes / 100 / 365 * (CURRENT_DATE - f.fecha_prestamo)) AS total_actualizado
FROM financiamientos f;

-- =====================
-- FUNCIONES
-- =====================

-- Función: incrementar contador global
CREATE OR REPLACE FUNCTION incrementar_contador()
RETURNS INTEGER
LANGUAGE plpgsql
AS $$
DECLARE
  nuevo_valor INTEGER;
BEGIN
  UPDATE contador_global SET visitas = visitas + 1, ultima_actualizacion = NOW() WHERE id = 1
  RETURNING visitas INTO nuevo_valor;
  RETURN nuevo_valor;
END;
$$;

-- Función: inicializar counter de usuario
CREATE OR REPLACE FUNCTION initialize_user_counter(p_user_id TEXT)
RETURNS VOID
LANGUAGE plpgsql
AS $$
BEGIN
  INSERT INTO counter (user_id, value) VALUES (p_user_id, 0)
  ON CONFLICT (user_id) DO NOTHING;
END;
$$;

-- Función: unificar clientes duplicados
CREATE OR REPLACE FUNCTION unificar_clientes(
  primary_client_id BIGINT,
  duplicate_client_ids BIGINT[],
  updated_client_data JSONB
)
RETURNS VOID
LANGUAGE plpgsql
AS $$
DECLARE
  dup_id BIGINT;
BEGIN
  -- Actualizar datos del cliente principal
  UPDATE clientes SET
    nombre = COALESCE(updated_client_data->>'nombre', nombre),
    cedula = COALESCE(updated_client_data->>'cedula', cedula),
    telefono = COALESCE(updated_client_data->>'telefono', telefono),
    email = COALESCE(updated_client_data->>'email', email),
    direccion = COALESCE(updated_client_data->>'direccion', direccion)
  WHERE id = primary_client_id;

  -- Reasignar registros de clientes duplicados al principal
  FOREACH dup_id IN ARRAY duplicate_client_ids LOOP
    UPDATE pesadas SET cliente_id = primary_client_id WHERE cliente_id = dup_id;
    UPDATE facturas_venta SET cliente_id = primary_client_id WHERE cliente_id = dup_id;
    UPDATE cuentas_por_cobrar SET cliente_id = primary_client_id WHERE cliente_id = dup_id;
    UPDATE compensaciones SET cliente_id = primary_client_id WHERE cliente_id = dup_id;
    UPDATE financiamientos SET cliente_id = primary_client_id WHERE cliente_id = dup_id;
    UPDATE cobros_clientes SET cliente_id = primary_client_id WHERE cliente_id = dup_id;
    UPDATE ventas_diarias SET cliente_id = primary_client_id WHERE cliente_id = dup_id;
    UPDATE cuadre_caja SET cliente_id = primary_client_id WHERE cliente_id = dup_id;
    UPDATE saldo_clientes SET cliente_id = primary_client_id WHERE cliente_id = dup_id;
    UPDATE salidas_pais SET cliente_id = primary_client_id WHERE cliente_id = dup_id;
    UPDATE fletes SET cliente_id = primary_client_id WHERE cliente_id = dup_id;
    -- Eliminar duplicado
    DELETE FROM clientes WHERE id = dup_id;
  END LOOP;
END;
$$;

-- Función: obtener usuarios de auth (Supabase)
CREATE OR REPLACE FUNCTION get_auth_users(
  page_limit INTEGER DEFAULT 50,
  page_offset INTEGER DEFAULT 0,
  search_email TEXT DEFAULT NULL
)
RETURNS TABLE(
  id UUID,
  email TEXT,
  created_at TIMESTAMPTZ,
  email_confirmed_at TIMESTAMPTZ,
  last_sign_in_at TIMESTAMPTZ,
  total_count BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    au.id,
    au.email::TEXT,
    au.created_at,
    au.email_confirmed_at,
    au.last_sign_in_at,
    COUNT(*) OVER() AS total_count
  FROM auth.users au
  WHERE (search_email IS NULL OR au.email ILIKE '%' || search_email || '%')
  ORDER BY au.created_at DESC
  LIMIT page_limit OFFSET page_offset;
END;
$$;

-- =====================
-- RLS (Row Level Security) - Habilitar en tablas principales
-- =====================
-- NOTA: Configura las políticas RLS según tus necesidades.
-- Ejemplo básico para habilitar RLS:
-- ALTER TABLE pesadas ENABLE ROW LEVEL SECURITY;
-- CREATE POLICY "Users can view own pesadas" ON pesadas FOR SELECT USING (auth.uid() = user_id);

-- =====================
-- FIN DE LA MIGRACIÓN
-- =====================
-- Pasos siguientes:
-- 1. Ejecutar este script en el SQL Editor del nuevo proyecto Supabase
-- 2. Copiar los datos de la base de datos anterior (ver script de migración de datos)
-- 3. Actualizar .env con las nuevas credenciales:
--    VITE_SUPABASE_URL=https://TU_NUEVO_PROYECTO.supabase.co
--    VITE_SUPABASE_ANON_KEY=tu_nueva_anon_key
-- 4. Regenerar los tipos: npx supabase gen types typescript --project-id TU_PROJECT_ID > types/database.types.ts
