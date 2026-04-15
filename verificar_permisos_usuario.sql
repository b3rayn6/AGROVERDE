-- Verificar permisos del usuario josuebrayan3076@gmail.com

-- 1. Buscar el usuario
SELECT 
  id, 
  nombre_completo, 
  email, 
  rol_id,
  activo
FROM usuarios_sistema 
WHERE email = 'josuebrayan3076@gmail.com';

-- 2. Ver todos los módulos disponibles
SELECT 
  id,
  codigo,
  nombre,
  descripcion
FROM modulos
ORDER BY codigo;

-- 3. Ver permisos del usuario (reemplazar el UUID con el ID del usuario)
SELECT 
  pu.id,
  pu.usuario_id,
  m.codigo as modulo_codigo,
  m.nombre as modulo_nombre,
  pu.puede_ver,
  pu.puede_crear,
  pu.puede_editar,
  pu.puede_eliminar
FROM permisos_usuario pu
LEFT JOIN modulos m ON pu.modulo_id = m.id
WHERE pu.usuario_id = (
  SELECT id FROM usuarios_sistema WHERE email = 'josuebrayan3076@gmail.com'
)
ORDER BY m.codigo;

-- 4. Verificar específicamente los módulos servidor y base_datos
SELECT 
  m.codigo,
  m.nombre,
  CASE 
    WHEN pu.id IS NOT NULL THEN 'Tiene permiso'
    ELSE 'NO tiene permiso'
  END as estado_permiso,
  pu.puede_ver,
  pu.puede_crear,
  pu.puede_editar,
  pu.puede_eliminar
FROM modulos m
LEFT JOIN permisos_usuario pu ON m.id = pu.modulo_id 
  AND pu.usuario_id = (SELECT id FROM usuarios_sistema WHERE email = 'josuebrayan3076@gmail.com')
WHERE m.codigo IN ('servidor', 'base_datos')
ORDER BY m.codigo;
