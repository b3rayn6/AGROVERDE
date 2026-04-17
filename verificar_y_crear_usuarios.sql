-- ============================================
-- SCRIPT: Verificar y Crear Usuarios del Sistema
-- Fecha: 2024-04-17
-- Propósito: Verificar usuarios existentes y crear usuarios de prueba
-- ============================================

-- 1. VERIFICAR USUARIOS EXISTENTES
-- ============================================
SELECT 
    id,
    email,
    nombre_completo,
    rol_id,
    activo,
    created_at,
    CASE 
        WHEN password IS NOT NULL THEN '✅ Tiene contraseña'
        ELSE '❌ Sin contraseña'
    END as estado_password
FROM usuarios_sistema
ORDER BY created_at DESC;

-- 2. VERIFICAR ROLES EXISTENTES
-- ============================================
SELECT * FROM roles ORDER BY nombre;

-- 3. VERIFICAR MÓDULOS EXISTENTES
-- ============================================
SELECT * FROM modulos ORDER BY nombre;

-- 4. CREAR USUARIO ADMINISTRADOR SI NO EXISTE
-- ============================================
-- Primero verificar si existe el rol de Administrador
DO $$
DECLARE
    v_rol_admin_id INTEGER;
BEGIN
    -- Buscar o crear rol de Administrador
    SELECT id INTO v_rol_admin_id FROM roles WHERE nombre = 'Administrador';
    
    IF v_rol_admin_id IS NULL THEN
        INSERT INTO roles (nombre, descripcion)
        VALUES ('Administrador', 'Acceso completo al sistema')
        RETURNING id INTO v_rol_admin_id;
        
        RAISE NOTICE '✅ Rol Administrador creado con ID: %', v_rol_admin_id;
    ELSE
        RAISE NOTICE '✅ Rol Administrador ya existe con ID: %', v_rol_admin_id;
    END IF;
    
    -- Verificar si existe el usuario agroverde@gmail.com
    IF NOT EXISTS (SELECT 1 FROM usuarios_sistema WHERE email = 'agroverde@gmail.com') THEN
        INSERT INTO usuarios_sistema (
            email,
            password,
            nombre_completo,
            rol_id,
            activo
        ) VALUES (
            'agroverde@gmail.com',
            '12345678',
            'Administrador AgroVerde',
            v_rol_admin_id,
            true
        );
        
        RAISE NOTICE '✅ Usuario agroverde@gmail.com creado exitosamente';
    ELSE
        RAISE NOTICE '⚠️ Usuario agroverde@gmail.com ya existe';
    END IF;
    
    -- Verificar si existe el usuario admin@gmail.com en usuarios_sistema
    IF NOT EXISTS (SELECT 1 FROM usuarios_sistema WHERE email = 'admin@gmail.com') THEN
        INSERT INTO usuarios_sistema (
            email,
            password,
            nombre_completo,
            rol_id,
            activo
        ) VALUES (
            'admin@gmail.com',
            '12345678',
            'Administrador Sistema',
            v_rol_admin_id,
            true
        );
        
        RAISE NOTICE '✅ Usuario admin@gmail.com creado exitosamente';
    ELSE
        RAISE NOTICE '⚠️ Usuario admin@gmail.com ya existe';
    END IF;
END $$;

-- 5. VERIFICAR USUARIOS CREADOS
-- ============================================
SELECT 
    u.id,
    u.email,
    u.nombre_completo,
    r.nombre as rol,
    u.activo,
    u.created_at
FROM usuarios_sistema u
LEFT JOIN roles r ON u.rol_id = r.id
ORDER BY u.created_at DESC;

-- 6. CONTAR PERMISOS POR USUARIO
-- ============================================
SELECT 
    u.email,
    u.nombre_completo,
    COUNT(p.id) as total_permisos,
    SUM(CASE WHEN p.puede_ver THEN 1 ELSE 0 END) as puede_ver,
    SUM(CASE WHEN p.puede_crear THEN 1 ELSE 0 END) as puede_crear,
    SUM(CASE WHEN p.puede_editar THEN 1 ELSE 0 END) as puede_editar,
    SUM(CASE WHEN p.puede_eliminar THEN 1 ELSE 0 END) as puede_eliminar
FROM usuarios_sistema u
LEFT JOIN permisos_usuario p ON u.id = p.usuario_id
GROUP BY u.id, u.email, u.nombre_completo
ORDER BY u.email;

-- 7. CREAR PERMISOS COMPLETOS PARA ADMINISTRADORES
-- ============================================
DO $$
DECLARE
    v_usuario_id INTEGER;
    v_modulo RECORD;
BEGIN
    -- Para cada usuario administrador
    FOR v_usuario_id IN 
        SELECT u.id 
        FROM usuarios_sistema u
        JOIN roles r ON u.rol_id = r.id
        WHERE r.nombre = 'Administrador'
    LOOP
        -- Para cada módulo
        FOR v_modulo IN SELECT id FROM modulos LOOP
            -- Insertar o actualizar permisos
            INSERT INTO permisos_usuario (
                usuario_id,
                modulo_id,
                puede_ver,
                puede_crear,
                puede_editar,
                puede_eliminar
            ) VALUES (
                v_usuario_id,
                v_modulo.id,
                true,
                true,
                true,
                true
            )
            ON CONFLICT (usuario_id, modulo_id) 
            DO UPDATE SET
                puede_ver = true,
                puede_crear = true,
                puede_editar = true,
                puede_eliminar = true;
        END LOOP;
        
        RAISE NOTICE '✅ Permisos completos asignados al usuario ID: %', v_usuario_id;
    END LOOP;
END $$;

-- 8. VERIFICAR PERMISOS ASIGNADOS
-- ============================================
SELECT 
    u.email,
    m.nombre as modulo,
    p.puede_ver,
    p.puede_crear,
    p.puede_editar,
    p.puede_eliminar
FROM permisos_usuario p
JOIN usuarios_sistema u ON p.usuario_id = u.id
JOIN modulos m ON p.modulo_id = m.id
WHERE u.email IN ('agroverde@gmail.com', 'admin@gmail.com')
ORDER BY u.email, m.nombre;

-- 9. RESUMEN FINAL
-- ============================================
SELECT 
    '✅ RESUMEN FINAL' as titulo,
    (SELECT COUNT(*) FROM usuarios_sistema) as total_usuarios,
    (SELECT COUNT(*) FROM usuarios_sistema WHERE activo = true) as usuarios_activos,
    (SELECT COUNT(*) FROM roles) as total_roles,
    (SELECT COUNT(*) FROM modulos) as total_modulos,
    (SELECT COUNT(*) FROM permisos_usuario) as total_permisos;

-- ============================================
-- INSTRUCCIONES:
-- ============================================
-- 1. Ejecuta este script en Supabase SQL Editor
-- 2. Verifica que los usuarios se hayan creado correctamente
-- 3. Prueba hacer login con:
--    - Email: agroverde@gmail.com
--    - Password: 12345678
-- 4. O con:
--    - Email: admin@gmail.com
--    - Password: 12345678
-- ============================================
