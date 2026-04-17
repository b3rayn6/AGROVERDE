// Script de diagnóstico para verificar permisos de usuarios
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://njzpozedfitrwphrjmsb.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5qenBvemVkZml0cndwaHJqbXNiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjI4Mjk4NDQsImV4cCI6MjA3ODQwNTg0NH0.YD4k2--flkeM-quWQOPrsXYonfiRGIcegwVZN1GrPVs';

const supabase = createClient(supabaseUrl, supabaseKey);

async function diagnosticarPermisos() {
  console.log('🔍 DIAGNÓSTICO DE PERMISOS\n');
  
  // 1. Verificar usuario brayanjosue2809@gmail.com
  console.log('1️⃣ Buscando usuario brayanjosue2809@gmail.com...');
  const { data: usuario, error: errorUsuario } = await supabase
    .from('usuarios_sistema')
    .select('id, email, nombre_completo, rol_id, activo, legacy_id, roles(nombre)')
    .eq('email', 'brayanjosue2809@gmail.com')
    .maybeSingle();
  
  if (errorUsuario) {
    console.error('❌ Error:', errorUsuario);
    return;
  }
  
  if (!usuario) {
    console.log('❌ Usuario no encontrado');
    return;
  }
  
  console.log('✅ Usuario encontrado:');
  console.log('   - ID:', usuario.id);
  console.log('   - Email:', usuario.email);
  console.log('   - Nombre:', usuario.nombre_completo);
  console.log('   - Rol ID:', usuario.rol_id);
  console.log('   - Rol Nombre:', usuario.roles?.nombre);
  console.log('   - Activo:', usuario.activo);
  console.log('   - Legacy ID:', usuario.legacy_id);
  console.log('');
  
  // 2. Verificar permisos del usuario
  console.log('2️⃣ Buscando permisos del usuario...');
  const { data: permisos, error: errorPermisos } = await supabase
    .from('permisos_usuario')
    .select('*, modulos(codigo, nombre)')
    .eq('usuario_id', usuario.id);
  
  if (errorPermisos) {
    console.error('❌ Error:', errorPermisos);
    return;
  }
  
  console.log(`✅ Permisos encontrados: ${permisos?.length || 0}`);
  if (permisos && permisos.length > 0) {
    permisos.forEach((p, i) => {
      console.log(`   ${i + 1}. ${p.modulos?.nombre || 'Unknown'} (${p.modulos?.codigo || 'unknown'})`);
      console.log(`      - Ver: ${p.puede_ver}, Crear: ${p.puede_crear}, Editar: ${p.puede_editar}, Eliminar: ${p.puede_eliminar}`);
    });
  } else {
    console.log('⚠️  No se encontraron permisos para este usuario');
  }
  console.log('');
  
  // 3. Verificar todos los módulos disponibles
  console.log('3️⃣ Módulos disponibles en el sistema...');
  const { data: modulos, error: errorModulos } = await supabase
    .from('modulos')
    .select('id, codigo, nombre, activo')
    .eq('activo', true)
    .order('nombre');
  
  if (errorModulos) {
    console.error('❌ Error:', errorModulos);
    return;
  }
  
  console.log(`✅ Módulos activos: ${modulos?.length || 0}`);
  if (modulos && modulos.length > 0) {
    modulos.forEach((m, i) => {
      console.log(`   ${i + 1}. ${m.nombre} (${m.codigo})`);
    });
  }
  console.log('');
  
  // 4. Verificar rol del usuario
  if (usuario.rol_id) {
    console.log('4️⃣ Verificando rol del usuario...');
    const { data: rol, error: errorRol } = await supabase
      .from('roles')
      .select('*')
      .eq('id', usuario.rol_id)
      .maybeSingle();
    
    if (errorRol) {
      console.error('❌ Error:', errorRol);
    } else if (rol) {
      console.log('✅ Rol encontrado:');
      console.log('   - ID:', rol.id);
      console.log('   - Nombre:', rol.nombre);
      console.log('   - Descripción:', rol.descripcion);
    }
  }
  
  console.log('\n✅ Diagnóstico completado');
}

diagnosticarPermisos().catch(console.error);
