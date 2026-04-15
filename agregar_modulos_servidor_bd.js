import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_ANON_KEY
);

async function agregarModulos() {
  console.log('🚀 Agregando módulos de Servidor y Base de Datos...\n');

  try {
    // 1. Agregar módulo de Servidor
    console.log('📝 Agregando módulo "Servidor"...');
    const { data: servidor, error: errorServidor } = await supabase
      .from('modulos')
      .upsert({
        codigo: 'servidor',
        nombre: 'Servidor',
        descripcion: 'Módulo para visualizar información del servidor y hardware',
        activo: true
      }, {
        onConflict: 'codigo'
      })
      .select()
      .single();

    if (errorServidor) {
      console.error('❌ Error al agregar módulo Servidor:', errorServidor);
    } else {
      console.log('✅ Módulo "Servidor" agregado correctamente');
    }

    // 2. Agregar módulo de Base de Datos
    console.log('📝 Agregando módulo "Base de Datos"...');
    const { data: baseDatos, error: errorBD } = await supabase
      .from('modulos')
      .upsert({
        codigo: 'base_datos',
        nombre: 'Base de Datos',
        descripcion: 'Módulo para visualizar información y estadísticas de PostgreSQL',
        activo: true
      }, {
        onConflict: 'codigo'
      })
      .select()
      .single();

    if (errorBD) {
      console.error('❌ Error al agregar módulo Base de Datos:', errorBD);
    } else {
      console.log('✅ Módulo "Base de Datos" agregado correctamente');
    }

    // 3. Obtener todos los usuarios
    console.log('\n👥 Obteniendo usuarios...');
    const { data: usuarios, error: errorUsuarios } = await supabase
      .from('usuarios_sistema')
      .select('id, nombre, username');

    if (errorUsuarios) {
      console.error('❌ Error al obtener usuarios:', errorUsuarios);
      return;
    }

    console.log(`✅ Se encontraron ${usuarios.length} usuarios\n`);

    // 4. Dar permisos a todos los usuarios para ambos módulos
    const modulosIds = [];
    
    if (servidor) modulosIds.push({ id: servidor.id, nombre: 'Servidor' });
    if (baseDatos) modulosIds.push({ id: baseDatos.id, nombre: 'Base de Datos' });

    for (const modulo of modulosIds) {
      console.log(`🔐 Asignando permisos para módulo "${modulo.nombre}"...`);
      
      for (const usuario of usuarios) {
        const { error: errorPermiso } = await supabase
          .from('permisos_usuario')
          .upsert({
            usuario_id: usuario.id,
            modulo_id: modulo.id,
            puede_ver: true,
            puede_crear: true,
            puede_editar: true,
            puede_eliminar: true
          }, {
            onConflict: 'usuario_id,modulo_id'
          });

        if (errorPermiso) {
          console.error(`   ❌ Error al asignar permiso a ${usuario.nombre || usuario.username}:`, errorPermiso.message);
        } else {
          console.log(`   ✅ Permisos asignados a ${usuario.nombre || usuario.username}`);
        }
      }
    }

    console.log('\n🎉 ¡Proceso completado exitosamente!');
    console.log('\n📋 Resumen:');
    console.log(`   - Módulos agregados: ${modulosIds.length}`);
    console.log(`   - Usuarios con permisos: ${usuarios.length}`);
    console.log('\n💡 Recarga la aplicación para ver los cambios');

  } catch (error) {
    console.error('❌ Error general:', error);
  }
}

agregarModulos();
