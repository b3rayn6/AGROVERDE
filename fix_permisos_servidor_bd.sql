-- SOLUCIÓN RÁPIDA: Agregar permisos de Servidor y Base de Datos
-- Para el usuario: josuebrayan3076@gmail.com

-- PASO 1: Verificar que los módulos existen (si no existen, crearlos)
INSERT INTO modulos (codigo, nombre, descripcion)
VALUES 
  ('servidor', 'Servidor', 'Módulo para monitorear el servidor'),
  ('base_datos', 'Base de Datos', 'Módulo para gestionar la base de datos')
ON CONFLICT (codigo) DO NOTHING;

-- PASO 2: Agregar permisos al usuario
-- Nota: Reemplaza 'josuebrayan3076@gmail.com' con el email correcto si es diferente
INSERT INTO permisos_usuario (usuario_id, modulo_id, puede_ver, puede_crear, puede_editar, puede_eliminar)
SELECT 
  u.id as usuario_id,
  m.id as modulo_id,
  TRUE as puede_ver,
  FALSE as puede_crear,
  FALSE as puede_editar,
  FALSE as puede_eliminar
FROM usuarios_sistema u
CROSS JOIN modulos m
WHERE u.email = 'josuebrayan3076@gmail.com'
  AND m.codigo IN ('servidor', 'base_datos')
  AND NOT EXISTS (
    SELECT 1 FROM permisos_usuario pu 
    WHERE pu.usuario_id = u.id AND pu.modulo_id = m.id
  );

-- PASO 3: Verificar que se agregaron correctamente
SELECT 
  u.email,
  u.nombre_completo,
  m.codigo,
  m.nombre,
  pu.puede_ver,
  pu.puede_crear,
  pu.puede_editar,
  pu.puede_eliminar
FROM permisos_usuario pu
JOIN usuarios_sistema u ON pu.usuario_id = u.id
JOIN modulos m ON pu.modulo_id = m.id
WHERE u.email = 'josuebrayan3076@gmail.com'
  AND m.codigo IN ('servidor', 'base_datos');
