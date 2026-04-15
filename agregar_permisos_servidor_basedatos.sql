-- Script para agregar permisos de Servidor y Base de Datos al usuario josuebrayan3076@gmail.com

-- Primero, verificar que los módulos existen
DO $$
DECLARE
  v_usuario_id UUID;
  v_modulo_servidor_id BIGINT;
  v_modulo_basedatos_id BIGINT;
BEGIN
  -- Obtener el ID del usuario
  SELECT id INTO v_usuario_id 
  FROM usuarios_sistema 
  WHERE email = 'josuebrayan3076@gmail.com';

  IF v_usuario_id IS NULL THEN
    RAISE EXCEPTION 'Usuario no encontrado: josuebrayan3076@gmail.com';
  END IF;

  -- Obtener el ID del módulo servidor
  SELECT id INTO v_modulo_servidor_id 
  FROM modulos 
  WHERE codigo = 'servidor';

  -- Obtener el ID del módulo base_datos
  SELECT id INTO v_modulo_basedatos_id 
  FROM modulos 
  WHERE codigo = 'base_datos';

  -- Insertar permiso para servidor si no existe
  IF v_modulo_servidor_id IS NOT NULL THEN
    INSERT INTO permisos_usuario (usuario_id, modulo_id, puede_ver, puede_crear, puede_editar, puede_eliminar)
    VALUES (v_usuario_id, v_modulo_servidor_id, TRUE, FALSE, FALSE, FALSE)
    ON CONFLICT DO NOTHING;
    
    RAISE NOTICE 'Permiso de Servidor agregado/verificado para el usuario';
  ELSE
    RAISE NOTICE 'Módulo servidor no existe en la base de datos';
  END IF;

  -- Insertar permiso para base_datos si no existe
  IF v_modulo_basedatos_id IS NOT NULL THEN
    INSERT INTO permisos_usuario (usuario_id, modulo_id, puede_ver, puede_crear, puede_editar, puede_eliminar)
    VALUES (v_usuario_id, v_modulo_basedatos_id, TRUE, FALSE, FALSE, FALSE)
    ON CONFLICT DO NOTHING;
    
    RAISE NOTICE 'Permiso de Base de Datos agregado/verificado para el usuario';
  ELSE
    RAISE NOTICE 'Módulo base_datos no existe en la base de datos';
  END IF;

END $$;

-- Verificar los permisos agregados
SELECT 
  u.email,
  m.codigo as modulo_codigo,
  m.nombre as modulo_nombre,
  pu.puede_ver,
  pu.puede_crear,
  pu.puede_editar,
  pu.puede_eliminar
FROM permisos_usuario pu
JOIN usuarios_sistema u ON pu.usuario_id = u.id
JOIN modulos m ON pu.modulo_id = m.id
WHERE u.email = 'josuebrayan3076@gmail.com'
  AND m.codigo IN ('servidor', 'base_datos')
ORDER BY m.codigo;
