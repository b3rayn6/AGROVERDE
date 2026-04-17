import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Error: Faltan las variables de entorno');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function repararPermisos() {
  console.log('🔧 Iniciando reparación de permisos...\n');
  
  try {
    // 1. Obtener todos los usuarios
    const { data: usuarios, error: errorUsuarios } = await supabase
      .from('usuarios_sistema')
      .select('id, nombre_completo, email');
    
    if (errorUsuarios) {
      console.error('❌ Error al obtener usuarios:', errorUsuarios);
      return;
    }
    
    console.log(`📋 Usuarios encontrados: ${usuarios.length}`);
    
    // 2. Obtener todos los módulos
    const { data: modulos, error: errorModulos } = await supabase
      .from('modulos')
      .select('id, codigo, nombre');
    
    if (errorModulos) {
      console.error('❌ Error al obtener módulos:', errorModulos);
      return;
    }
    
    console.log(`📦 Módulos encontrados: ${modulos.length}\n`);
    
    // 3. Para cada usuario, verificar y crear permisos faltantes
    for (const usuario of usuarios) {
      console.log(`👤 Procesando usuario: ${usuario.nombre_completo} (${usuario.email})`);
      
      // Obtener permisos actuales del usuario
      const { data: permisosActuales, error: errorPermisos } = await supabase
        .from('permisos_usuario')
        .select('modulo_id')
        .eq('usuario_id', usuario.id);
      
      if (errorPermisos) {
        console.error(`   ❌ Error al obtener permisos: ${errorPermisos.message}`);
        continue;
      }
      
      const modulosConPermiso = new Set(permisosActuales.map(p => p.modulo_id));
      console.log(`   ✓ Permisos existentes: ${modulosConPermiso.size}`);
      
      // Crear permisos faltantes
      const permisosFaltantes = [];
      for (const modulo of modulos) {
        if (!modulosConPermiso.has(modulo.id)) {
          permisosFaltantes.push({
            usuario_id: usuario.id,
            modulo_id: modulo.id,
            puede_ver: true,  // Por defecto, dar acceso de visualización
            puede_crear: false,
            puede_editar: false,
            puede_eliminar: false
          });
        }
      }
      
      if (permisosFaltantes.length > 0) {
        console.log(`   📝 Creando ${permisosFaltantes.length} permisos faltantes...`);
        
        const { error: errorInsert } = await supabase
          .from('permisos_usuario')
          .insert(permisosFaltantes);
        
        if (errorInsert) {
          console.error(`   ❌ Error al crear permisos: ${errorInsert.message}`);
        } else {
          console.log(`   ✅ Permisos creados exitosamente`);
        }
      } else {
        console.log(`   ✓ Todos los permisos ya existen`);
      }
      
      console.log('');
    }
    
    // 4. Verificar permisos finales
    console.log('📊 Resumen final:');
    for (const usuario of usuarios) {
      const { data: permisos } = await supabase
        .from('permisos_usuario')
        .select('*')
        .eq('usuario_id', usuario.id);
      
      console.log(`   ${usuario.nombre_completo}: ${permisos.length} permisos`);
    }
    
    console.log('\n✅ Reparación completada');
    
  } catch (error) {
    console.error('❌ Error general:', error);
  }
}

// Función para dar permisos completos de administrador a un usuario
async function darPermisosAdmin(email) {
  console.log(`🔑 Dando permisos de administrador a: ${email}\n`);
  
  try {
    // Buscar usuario
    const { data: usuario, error: errorUsuario } = await supabase
      .from('usuarios_sistema')
      .select('id, nombre_completo')
      .eq('email', email)
      .single();
    
    if (errorUsuario || !usuario) {
      console.error('❌ Usuario no encontrado');
      return;
    }
    
    console.log(`👤 Usuario encontrado: ${usuario.nombre_completo}`);
    
    // Obtener todos los módulos
    const { data: modulos } = await supabase
      .from('modulos')
      .select('id');
    
    // Actualizar todos los permisos a true
    for (const modulo of modulos) {
      // Verificar si ya existe el permiso
      const { data: permisoExistente } = await supabase
        .from('permisos_usuario')
        .select('id')
        .eq('usuario_id', usuario.id)
        .eq('modulo_id', modulo.id)
        .single();
      
      if (permisoExistente) {
        // Actualizar permiso existente
        const { error } = await supabase
          .from('permisos_usuario')
          .update({
            puede_ver: true,
            puede_crear: true,
            puede_editar: true,
            puede_eliminar: true
          })
          .eq('id', permisoExistente.id);
        
        if (error) {
          console.error(`❌ Error actualizando módulo ${modulo.id}:`, error.message);
        }
      } else {
        // Crear nuevo permiso
        const { error } = await supabase
          .from('permisos_usuario')
          .insert({
            usuario_id: usuario.id,
            modulo_id: modulo.id,
            puede_ver: true,
            puede_crear: true,
            puede_editar: true,
            puede_eliminar: true
          });
        
        if (error) {
          console.error(`❌ Error creando módulo ${modulo.id}:`, error.message);
        }
      }
    }
    
    console.log('✅ Permisos de administrador otorgados');
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

// Ejecutar según argumentos
const comando = process.argv[2];
const email = process.argv[3];

if (comando === 'admin' && email) {
  darPermisosAdmin(email);
} else if (comando === 'reparar') {
  repararPermisos();
} else {
  console.log('📖 Uso:');
  console.log('  node reparar_permisos_usuarios.js reparar          - Reparar permisos faltantes');
  console.log('  node reparar_permisos_usuarios.js admin [email]    - Dar permisos de admin a un usuario');
  console.log('');
  console.log('Ejemplos:');
  console.log('  node reparar_permisos_usuarios.js reparar');
  console.log('  node reparar_permisos_usuarios.js admin agroverde@gmail.com');
}
