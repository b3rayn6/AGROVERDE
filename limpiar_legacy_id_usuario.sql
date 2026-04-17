-- Script para convertir usuarios legacy en usuarios del sistema
-- Ejecutar en Supabase SQL Editor

-- ========================================
-- PASO 1: IDENTIFICAR EL USUARIO PROBLEMÁTICO
-- ========================================

SELECT 
  id, 
  email, 
  nombre_completo, 
  legacy_id,
  activo,
  rol_id,
  created_at
FROM usuarios_sistema
WHERE email = 'josuebrayan3076@gmail.com';

-- ========================================
-- PASO 2: LIMPIAR EL LEGACY_ID
-- ========================================

-- Convertir el usuario legacy en usuario del sistema
UPDATE usuarios_sistema
SET legacy_id = NULL
WHERE email = 'josuebrayan3076@gmail.com';

-- ========================================
-- PASO 3: VERIFICAR EL CAMBIO
-- ========================================

SELECT 
  id, 
  email, 
  nombre_completo, 
  legacy_id,
  activo,
  rol_id,
  created_at
FROM usuarios_sistema
WHERE email = 'josuebrayan3076@gmail.com';

-- ========================================
-- PASO 4: VERIFICAR PERMISOS DEL USUARIO
-- ========================================

-- Ver permisos actuales del usuario
SELECT 
  u.email,
  u.nombre_completo,
  r.nombre as rol,
  COUNT(p.id) as total_permisos,
  COUNT(p.id) FILTER (WHERE p.puede_ver = true) as puede_ver,
  COUNT(p.id) FILTER (WHERE p.puede_crear = true) as puede_crear,
  COUNT(p.id) FILTER (WHERE p.puede_editar = true) as puede_editar,
  COUNT(p.id) FILTER (WHERE p.puede_eliminar = true) as puede_eliminar
FROM usuarios_sistema u
LEFT JOIN roles r ON r.id = u.rol_id
LEFT JOIN permisos_usuario p ON p.usuario_id = u.id
WHERE u.email = 'josuebrayan3076@gmail.com'
GROUP BY u.id, u.email, u.nombre_completo, r.nombre;

-- ========================================
-- PASO 5 (OPCIONAL): ASIGNAR PERMISOS SI NO TIENE
-- ========================================

-- Si el usuario no tiene permisos, asignar permisos básicos
-- Descomenta las siguientes líneas si es necesario:

/*
-- Asignar permisos de lectura a módulos básicos
INSERT INTO permisos_usuario (
  usuario_id,
  modulo_id,
  puede_ver,
  puede_crear,
  puede_editar,
  puede_eliminar
)
SELECT 
  (SELECT id FROM usuarios_sistema WHERE email = 'josuebrayan3076@gmail.com'),
  m.id,
  true,  -- puede_ver
  true,  -- puede_crear
  true,  -- puede_editar
  false  -- puede_eliminar
FROM modulos m
WHERE m.codigo IN (
  'pesadas',
  'facturas_factoria',
  'clientes',
  'suplidores',
  'inventario',
  'facturas_compra',
  'facturas_venta'
)
ON CONFLICT (usuario_id, modulo_id) DO UPDATE
SET 
  puede_ver = true,
  puede_crear = true,
  puede_editar = true;
*/

-- ========================================
-- PASO 6: HACER LO MISMO PARA OTROS USUARIOS
-- ========================================

-- Si hay más usuarios legacy que necesitas convertir:
/*
UPDATE usuarios_sistema
SET legacy_id = NULL
WHERE legacy_id IS NOT NULL 
  AND activo = true
  AND email IN (
    'brayanjosue2809@gmail.com',
    'otro@email.com'
  );
*/

-- ========================================
-- PASO 7: RESUMEN FINAL
-- ========================================

-- Ver todos los usuarios activos sin legacy_id
SELECT 
  id,
  email,
  nombre_completo,
  rol_id,
  activo,
  legacy_id,
  created_at,
  (SELECT COUNT(*) FROM permisos_usuario WHERE usuario_id = usuarios_sistema.id) as total_permisos
FROM usuarios_sistema
WHERE activo = true AND legacy_id IS NULL
ORDER BY created_at DESC;
