-- Buscar en cuadre_caja
SELECT 'cuadre_caja' AS tabla, id, concepto, monto, referencia, created_at, descripcion
FROM cuadre_caja
WHERE referencia = '533' OR monto = 152541;

-- Buscar en compensacion_pesadas
SELECT 'compensacion_pesadas' AS tabla, id, cliente_id, metodo_pago, monto, referencia, created_at
FROM compensacion_pesadas
WHERE referencia = '533' OR monto = 152541;

-- Buscar en detalle_compensacion_pesadas
SELECT 'detalle_compensacion_pesadas' AS tabla, dcp.id, dcp.compensacion_id, dcp.factura_id, dcp.monto, cp.referencia AS compensacion_referencia
FROM detalle_compensacion_pesadas dcp
LEFT JOIN compensacion_pesadas cp ON dcp.compensacion_id = cp.id
WHERE cp.referencia = '533' OR dcp.monto = 152541;

-- Buscar en pagos_facturas
SELECT 'pagos_facturas' AS tabla, id, factura_id, monto, metodo_pago, referencia, created_at
FROM pagos_facturas
WHERE referencia = '533' OR monto = 152541;

-- Buscar en ingresos_clientes
SELECT 'ingresos_clientes' AS tabla, id, cliente_id, monto, referencia, tipo, created_at, descripcion
FROM ingresos_clientes
WHERE referencia = '533' OR monto = 152541;
