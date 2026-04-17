-- Script para verificar la estructura y datos de usuarios

-- 1. Verificar si existe la tabla usuarios_sistema
SELECT EXISTS (
   SELECT FROM information_schema.tables 
   WHERE table_schema = 'public'
   AND table_name = 'usuarios_sistema'
) as tabla_usuarios_sistema_existe;

-- 2. Verificar si existe la tabla roles
SELECT EXISTS (
   SELECT FROM information_schema.tables 
   WHERE table_schema = 'public'
   AND table_name = 'roles'
) as tabla_roles_existe;

-- 3. Verificar si existe la tabla modulos
SELECT EXISTS (
   SELECT FROM information_schema.tables 
   WHERE table_schema = 'public'
   AND table_name = 'modulos'
) as tabla_modulos_existe;

-- 4. Contar usuarios en usuarios_sistema
SELECT COUNT(*) as total_usuarios_sistema FROM usuarios_sistema;

-- 5. Contar usuarios en users (tabla legacy)
SELECT COUNT(*) as total_users_legacy FROM users;

-- 6. Ver todos los usuarios del sistema
SELECT 
    us.id,
    us.email,
    us.nombre_completo,
    us.activo,
    us.created_at,
    r.nombre as rol_nombre
FROM usuarios_sistema us
LEFT JOIN roles r ON us.rol_id = r.id
ORDER BY us.created_at DESC;

-- 7. Ver todos los usuarios legacy
SELECT 
    id,
    email,
    nombre,
    created_at
FROM users
ORDER BY created_at DESC;

-- 8. Ver todos los roles
SELECT * FROM roles ORDER BY nombre;

-- 9. Ver todos los módulos
SELECT * FROM modulos ORDER BY nombre;

-- 10. Verificar permisos de RLS (Row Level Security)
SELECT 
    schemaname,
    tablename,
    rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
AND tablename IN ('usuarios_sistema', 'users', 'roles', 'modulos', 'permisos_usuario');
