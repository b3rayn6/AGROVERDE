-- Agregar el módulo de Servidor a la tabla de módulos
INSERT INTO modulos (codigo, nombre, descripcion, icono, orden)
VALUES (
  'servidor',
  'Servidor',
  'Gestión de información y configuración del servidor',
  'Server',
  22
)
ON CONFLICT (codigo) DO UPDATE SET
  nombre = EXCLUDED.nombre,
  descripcion = EXCLUDED.descripcion,
  icono = EXCLUDED.icono,
  orden = EXCLUDED.orden;

-- Verificar que se insertó correctamente
SELECT * FROM modulos WHERE codigo = 'servidor';
