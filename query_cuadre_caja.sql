-- Consultar TODOS los registros de cuadre_caja relacionados con "Pagar con Ingreso"
-- Buscando específicamente el registro del cliente Felix Manuel Minaya

SELECT
  cc.id,
  cc.fecha,
  cc.concepto,
  cc.tipo_movimiento,
  cc.monto,
  cc.divisa,
  cc.metodo_pago,
  cc.referencia,
  cc.descripcion,
  cc.cliente_id,
  cc.cuenta_cobrar_id,
  cc.factura_id,
  cc.created_at,
  -- Intentar obtener el nombre del cliente desde la tabla de clientes
  COALESCE(cl.nombre, 'Sin cliente') as nombre_cliente
FROM cuadre_caja cc
LEFT JOIN clientes cl ON cc.cliente_id = cl.id
WHERE
  cc.concepto IN ('pago_ingreso', 'ingreso_disponible', 'pago_factura')
  OR cc.referencia ILIKE '%felix%'
  OR cc.referencia ILIKE '%minaya%'
  OR cc.descripcion ILIKE '%felix%'
  OR cc.descripcion ILIKE '%minaya%'
ORDER BY cc.created_at DESC
LIMIT 100;
