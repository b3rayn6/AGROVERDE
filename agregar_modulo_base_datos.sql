-- Agregar módulo de Base de Datos al sistema
INSERT INTO modulos (codigo, nombre, descripcion, activo)
VALUES ('base_datos', 'Base de Datos', 'Módulo para visualizar información y estadísticas de la base de datos PostgreSQL', true)
ON CONFLICT (codigo) DO UPDATE
SET nombre = EXCLUDED.nombre,
    descripcion = EXCLUDED.descripcion,
    activo = EXCLUDED.activo;

-- Dar permisos completos a todos los usuarios existentes para el módulo de base de datos
INSERT INTO permisos_usuario (usuario_id, modulo_id, puede_ver, puede_crear, puede_editar, puede_eliminar)
SELECT 
    u.id,
    m.id,
    true,
    true,
    true,
    true
FROM usuarios_sistema u
CROSS JOIN modulos m
WHERE m.codigo = 'base_datos'
ON CONFLICT (usuario_id, modulo_id) DO UPDATE
SET puede_ver = true,
    puede_crear = true,
    puede_editar = true,
    puede_eliminar = true;
