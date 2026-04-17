-- Script para crear usuario administrador en el sistema
-- Ejecutar en Supabase SQL Editor

-- 1. Verificar que existe el rol de Administrador
SELECT id, nombre, descripcion FROM roles WHERE nombre = 'Administrador';

-- 2. Crear usuario administrador
-- ⚠️ IMPORTANTE: Cambiar el email y password según tus necesidades
INSERT INTO usuarios_sistema (
  email,
  password, -- ⚠️ En producción, esto debería ser un hash
  nombre_completo,
  rol_id,
  activo
) VALUES (
  'admin@agroverde.com',
  '12345678', -- ⚠️ CAMBIAR ESTE PASSWORD
  'Administrador del Sistema',
  (SELECT id FROM roles WHERE nombre = 'Administrador' LIMIT 1),
  true
)
ON CONFLICT (email) DO UPDATE
SET 
  activo = true,
  nombre_completo = EXCLUDED.nombre_completo,
  rol_id = EXCLUDED.rol_id;

-- 3. Obtener el ID del usuario recién creado
SELECT id, email, nombre_completo, rol_id, activo 
FROM usuarios_sistema 
WHERE email = 'admin@agroverde.com';

-- 4. Asignar TODOS los permisos al administrador
-- Primero, obtener todos los módulos activos
INSERT INTO permisos_usuario (
  usuario_id,
  modulo_id,
  puede_ver,
  puede_crear,
  puede_editar,
  puede_eliminar
)
SELECT 
  (SELECT id FROM usuarios_sistema WHERE email = 'admin@agroverde.com'),
  m.id,
  true,
  true,
  true,
  true
FROM modulos m
WHERE m.activo = true
ON CONFLICT (usuario_id, modulo_id) DO UPDATE
SET 
  puede_ver = true,
  puede_crear = true,
  puede_editar = true,
  puede_eliminar = true;

-- 5. Verificar permisos asignados
SELECT 
  u.email,
  u.nombre_completo,
  COUNT(p.id) as total_permisos
FROM usuarios_sistema u
LEFT JOIN permisos_usuario p ON p.usuario_id = u.id
WHERE u.email = 'admin@agroverde.com'
GROUP BY u.id, u.email, u.nombre_completo;

-- 6. Ver detalle de permisos
SELECT 
  m.nombre as modulo,
  m.codigo,
  p.puede_ver,
  p.puede_crear,
  p.puede_editar,
  p.puede_eliminar
FROM permisos_usuario p
JOIN modulos m ON m.id = p.modulo_id
WHERE p.usuario_id = (SELECT id FROM usuarios_sistema WHERE email = 'admin@agroverde.com')
ORDER BY m.nombre;

-- 7. OPCIONAL: Crear usuario de prueba con permisos limitados
/*
INSERT INTO usuarios_sistema (
  email,
  password,
  nombre_completo,
  rol_id,
  activo
) VALUES (
  'usuario@agroverde.com',
  '12345678',
  'Usuario de Prueba',
  (SELECT id FROM roles WHERE nombre = 'Usuario' LIMIT 1),
  true
)
ON CONFLICT (email) DO UPDATE
SET activo = true;

-- Asignar solo permisos de lectura a algunos módulos
INSERT INTO permisos_usuario (
  usuario_id,
  modulo_id,
  puede_ver,
  puede_crear,
  puede_editar,
  puede_eliminar
)
SELECT 
  (SELECT id FROM usuarios_sistema WHERE email = 'usuario@agroverde.com'),
  m.id,
  true,
  false,
  false,
  false
FROM modulos m
WHERE m.codigo IN ('pesadas', 'facturas_factoria', 'clientes', 'suplidores')
ON CONFLICT (usuario_id, modulo_id) DO UPDATE
SET puede_ver = true;
*/
