-- Script para desactivar/eliminar usuarios legacy del sistema
-- Ejecutar en Supabase SQL Editor

-- ========================================
-- PASO 1: IDENTIFICAR USUARIOS LEGACY
-- ========================================

-- Ver todos los usuarios legacy (tienen legacy_id)
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

-- ========================================
-- PASO 2: DESACTIVAR USUARIOS LEGACY
-- ========================================

-- Desactivar todos los usuarios legacy
-- (Recomendado: mantiene el registro pero impide el acceso)
UPDATE usuarios_sistema
SET activo = false
WHERE legacy_id IS NOT NULL;

-- Verificar que se desactivaron
SELECT 
  COUNT(*) as usuarios_legacy_desactivados
FROM usuarios_sistema
WHERE legacy_id IS NOT NULL AND activo = false;

-- ========================================
-- PASO 3: VERIFICAR USUARIOS ACTIVOS
-- ========================================

-- Ver solo usuarios activos (sin legacy)
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
WHERE activo = true
ORDER BY created_at DESC;

-- ========================================
-- PASO 4 (OPCIONAL): ELIMINAR COMPLETAMENTE
-- ========================================

-- ⚠️ CUIDADO: Esto eliminará permanentemente los usuarios legacy
-- Solo descomentar si estás 100% seguro

/*
-- Primero eliminar permisos asociados
DELETE FROM permisos_usuario
WHERE usuario_id IN (
  SELECT id FROM usuarios_sistema WHERE legacy_id IS NOT NULL
);

-- Luego eliminar los usuarios
DELETE FROM usuarios_sistema
WHERE legacy_id IS NOT NULL;

-- Verificar que se eliminaron
SELECT COUNT(*) as usuarios_legacy_restantes
FROM usuarios_sistema
WHERE legacy_id IS NOT NULL;
*/

-- ========================================
-- PASO 5: RESUMEN FINAL
-- ========================================

-- Resumen de usuarios en el sistema
SELECT 
  COUNT(*) FILTER (WHERE activo = true AND legacy_id IS NULL) as usuarios_sistema_activos,
  COUNT(*) FILTER (WHERE activo = false AND legacy_id IS NOT NULL) as usuarios_legacy_desactivados,
  COUNT(*) FILTER (WHERE activo = true AND legacy_id IS NOT NULL) as usuarios_legacy_activos_PROBLEMA,
  COUNT(*) as total_usuarios
FROM usuarios_sistema;

-- Si "usuarios_legacy_activos_PROBLEMA" > 0, ejecutar nuevamente el PASO 2
