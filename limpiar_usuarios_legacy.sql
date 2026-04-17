-- Script para limpiar usuarios legacy del sistema
-- Ejecutar en Supabase SQL Editor

-- 1. Ver usuarios legacy que existen (solo para verificar)
SELECT 
  id, 
  email, 
  nombre_completo, 
  legacy_id,
  activo,
  created_at
FROM usuarios_sistema
WHERE legacy_id IS NOT NULL
ORDER BY created_at DESC;

-- 2. OPCIONAL: Desactivar usuarios legacy (en lugar de eliminar)
-- Descomentar si prefieres desactivar en lugar de eliminar
/*
UPDATE usuarios_sistema
SET activo = false
WHERE legacy_id IS NOT NULL;
*/

-- 3. OPCIONAL: Eliminar usuarios legacy completamente
-- ⚠️ CUIDADO: Esto eliminará permanentemente los usuarios legacy
-- Descomentar solo si estás seguro
/*
-- Primero eliminar permisos asociados
DELETE FROM permisos_usuario
WHERE usuario_id IN (
  SELECT id FROM usuarios_sistema WHERE legacy_id IS NOT NULL
);

-- Luego eliminar los usuarios
DELETE FROM usuarios_sistema
WHERE legacy_id IS NOT NULL;
*/

-- 4. Verificar que no quedan usuarios legacy activos
SELECT 
  COUNT(*) as usuarios_legacy_activos
FROM usuarios_sistema
WHERE legacy_id IS NOT NULL AND activo = true;

-- 5. Ver todos los usuarios activos del sistema
SELECT 
  id,
  email,
  nombre_completo,
  rol_id,
  activo,
  created_at,
  (SELECT COUNT(*) FROM permisos_usuario WHERE usuario_id = usuarios_sistema.id) as total_permisos
FROM usuarios_sistema
WHERE activo = true
ORDER BY created_at DESC;
