-- Script para inicializar el sistema de usuarios completo
-- Ejecutar en Supabase SQL Editor

-- ============================================
-- 1. CREAR TABLA DE ROLES (si no existe)
-- ============================================
CREATE TABLE IF NOT EXISTS roles (
    id BIGSERIAL PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL UNIQUE,
    descripcion TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insertar roles básicos si no existen
INSERT INTO roles (nombre, descripcion) 
VALUES 
    ('Administrador', 'Acceso completo al sistema'),
    ('Gerente', 'Acceso a reportes y gestión'),
    ('Usuario', 'Acceso básico al sistema')
ON CONFLICT (nombre) DO NOTHING;

-- ============================================
-- 2. CREAR TABLA DE USUARIOS DEL SISTEMA
-- ============================================
CREATE TABLE IF NOT EXISTS usuarios_sistema (
    id BIGSERIAL PRIMARY KEY,
    email VARCHAR(255) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    nombre_completo VARCHAR(255) NOT NULL,
    rol_id BIGINT REFERENCES roles(id),
    activo BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- 3. CREAR TABLA DE MÓDULOS
-- ============================================
CREATE TABLE IF NOT EXISTS modulos (
    id BIGSERIAL PRIMARY KEY,
    codigo VARCHAR(100) NOT NULL UNIQUE,
    nombre VARCHAR(255) NOT NULL,
    descripcion TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insertar módulos del sistema
INSERT INTO modulos (codigo, nombre, descripcion) 
VALUES 
    ('pesadas', 'Pesadas', 'Gestión de pesadas'),
    ('facturas_factoria', 'Facturas Factoría', 'Gestión de facturas de factoría'),
    ('compensacion_cuentas', 'Compensación de Cuentas', 'Compensación entre cuentas'),
    ('compensacion_pesadas', 'Pagar con Pesadas', 'Compensación usando pesadas'),
    ('fletes_obreros', 'Fletes y Obreros', 'Gestión de fletes y pago de obreros'),
    ('prestamos', 'Financiamientos', 'Gestión de préstamos y financiamientos'),
    ('inventario', 'Inventario', 'Control de inventario'),
    ('facturas_compra', 'Facturas de Compra', 'Gestión de facturas de compra'),
    ('facturas_venta', 'Facturas de Venta', 'Gestión de facturas de venta'),
    ('suplidores', 'Suplidores', 'Gestión de suplidores'),
    ('clientes', 'Clientes', 'Gestión de clientes'),
    ('ventas_diarias', 'Ventas Diarias', 'Registro de ventas diarias'),
    ('cuentas_cobrar', 'Cuentas por Cobrar', 'Gestión de cuentas por cobrar'),
    ('cuentas_pagar', 'Cuentas por Pagar', 'Gestión de cuentas por pagar'),
    ('utilidad_neta', 'Utilidad Neta', 'Cálculo de utilidad neta'),
    ('libro_diario', 'Libro Diario', 'Registro contable diario'),
    ('cuadre_caja', 'Cuadre de Caja', 'Cuadre de caja diario'),
    ('gastos', 'Egresos/Gastos', 'Registro de gastos'),
    ('activos_fijos', 'Activos Fijos', 'Gestión de activos fijos'),
    ('servidor', 'Servidor', 'Gestión del servidor'),
    ('base_datos', 'Base de Datos', 'Gestión de base de datos'),
    ('gestion_usuarios', 'Gestión de Usuarios', 'Administración de usuarios y permisos')
ON CONFLICT (codigo) DO NOTHING;

-- ============================================
-- 4. CREAR TABLA DE PERMISOS
-- ============================================
CREATE TABLE IF NOT EXISTS permisos_usuario (
    id BIGSERIAL PRIMARY KEY,
    usuario_id BIGINT NOT NULL REFERENCES usuarios_sistema(id) ON DELETE CASCADE,
    modulo_id BIGINT NOT NULL REFERENCES modulos(id) ON DELETE CASCADE,
    puede_ver BOOLEAN DEFAULT false,
    puede_crear BOOLEAN DEFAULT false,
    puede_editar BOOLEAN DEFAULT false,
    puede_eliminar BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(usuario_id, modulo_id)
);

-- ============================================
-- 5. CREAR TABLA USERS (LEGACY) si no existe
-- ============================================
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) NOT NULL UNIQUE,
    nombre VARCHAR(255),
    password_hash VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- 6. CREAR USUARIO ADMINISTRADOR POR DEFECTO
-- ============================================
-- Contraseña: admin123 (cambiar después del primer login)
DO $$
DECLARE
    admin_rol_id BIGINT;
    admin_user_id BIGINT;
BEGIN
    -- Obtener ID del rol Administrador
    SELECT id INTO admin_rol_id FROM roles WHERE nombre = 'Administrador' LIMIT 1;
    
    -- Crear usuario admin si no existe
    INSERT INTO usuarios_sistema (email, password, nombre_completo, rol_id, activo)
    VALUES ('admin@agroverde.com', 'admin123', 'Administrador del Sistema', admin_rol_id, true)
    ON CONFLICT (email) DO NOTHING
    RETURNING id INTO admin_user_id;
    
    -- Si se creó el usuario, darle todos los permisos
    IF admin_user_id IS NOT NULL THEN
        INSERT INTO permisos_usuario (usuario_id, modulo_id, puede_ver, puede_crear, puede_editar, puede_eliminar)
        SELECT admin_user_id, id, true, true, true, true
        FROM modulos
        ON CONFLICT (usuario_id, modulo_id) DO NOTHING;
    END IF;
END $$;

-- ============================================
-- 7. DESHABILITAR RLS TEMPORALMENTE (DESARROLLO)
-- ============================================
-- ADVERTENCIA: En producción, configurar políticas RLS apropiadas
ALTER TABLE roles DISABLE ROW LEVEL SECURITY;
ALTER TABLE usuarios_sistema DISABLE ROW LEVEL SECURITY;
ALTER TABLE modulos DISABLE ROW LEVEL SECURITY;
ALTER TABLE permisos_usuario DISABLE ROW LEVEL SECURITY;
ALTER TABLE users DISABLE ROW LEVEL SECURITY;

-- ============================================
-- 8. VERIFICACIÓN
-- ============================================
-- Ver usuarios creados
SELECT 
    us.id,
    us.email,
    us.nombre_completo,
    r.nombre as rol,
    us.activo
FROM usuarios_sistema us
LEFT JOIN roles r ON us.rol_id = r.id;

-- Ver módulos
SELECT COUNT(*) as total_modulos FROM modulos;

-- Ver permisos del admin
SELECT 
    m.nombre as modulo,
    p.puede_ver,
    p.puede_crear,
    p.puede_editar,
    p.puede_eliminar
FROM permisos_usuario p
JOIN modulos m ON p.modulo_id = m.id
JOIN usuarios_sistema u ON p.usuario_id = u.id
WHERE u.email = 'admin@agroverde.com'
ORDER BY m.nombre;

-- ============================================
-- CREDENCIALES POR DEFECTO
-- ============================================
-- Email: admin@agroverde.com
-- Contraseña: admin123
-- ⚠️ CAMBIAR DESPUÉS DEL PRIMER LOGIN
