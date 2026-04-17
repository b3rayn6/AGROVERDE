// Script CLI para crear usuarios del sistema
import { createClient } from '@supabase/supabase-js';
import readline from 'readline';

const supabaseUrl = 'https://njzpozedfitrwphrjmsb.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5qenBvemVkZml0cndwaHJqbXNiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjI4Mjk4NDQsImV4cCI6MjA3ODQwNTg0NH0.YD4k2--flkeM-quWQOPrsXYonfiRGIcegwVZN1GrPVs';

const supabase = createClient(supabaseUrl, supabaseKey);

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function question(prompt) {
  return new Promise((resolve) => {
    rl.question(prompt, resolve);
  });
}

async function crearUsuario() {
  console.log('🚀 CREAR NUEVO USUARIO DEL SISTEMA\n');
  
  // 1. Obtener datos del usuario
  const email = await question('📧 Email: ');
  const password = await question('🔒 Password: ');
  const nombreCompleto = await question('👤 Nombre completo: ');
  
  // 2. Listar roles disponibles
  console.log('\n📋 Roles disponibles:');
  const { data: roles, error: errorRoles } = await supabase
    .from('roles')
    .select('id, nombre, descripcion')
    .order('nombre');
  
  if (errorRoles || !roles || roles.length === 0) {
    console.error('❌ Error obteniendo roles:', errorRoles);
    rl.close();
    return;
  }
  
  roles.forEach((r, i) => {
    console.log(`   ${i + 1}. ${r.nombre} - ${r.descripcion || 'Sin descripción'}`);
  });
  
  const rolIndex = await question('\n🎯 Selecciona rol (número): ');
  const rolSeleccionado = roles[parseInt(rolIndex) - 1];
  
  if (!rolSeleccionado) {
    console.error('❌ Rol inválido');
    rl.close();
    return;
  }
  
  console.log(`\n✅ Rol seleccionado: ${rolSeleccionado.nombre}`);
  
  // 3. Confirmar creación
  const confirmar = await question('\n¿Crear usuario? (s/n): ');
  
  if (confirmar.toLowerCase() !== 's') {
    console.log('❌ Operación cancelada');
    rl.close();
    return;
  }
  
  // 4. Crear usuario
  console.log('\n⏳ Creando usuario...');
  const { data: nuevoUsuario, error: errorUsuario } = await supabase
    .from('usuarios_sistema')
    .insert({
      email,
      password, // ⚠️ En producción usar hash
      nombre_completo: nombreCompleto,
      rol_id: rolSeleccionado.id,
      activo: true
    })
    .select()
    .single();
  
  if (errorUsuario) {
    console.error('❌ Error creando usuario:', errorUsuario);
    rl.close();
    return;
  }
  
  console.log('✅ Usuario creado exitosamente!');
  console.log('   - ID:', nuevoUsuario.id);
  console.log('   - Email:', nuevoUsuario.email);
  
  // 5. Preguntar si asignar permisos
  const asignarPermisos = await question('\n¿Asignar permisos? (s/n): ');
  
  if (asignarPermisos.toLowerCase() === 's') {
    const tipoPermisos = await question('¿Tipo de permisos? (1=Todos, 2=Solo lectura, 3=Personalizado): ');
    
    // Obtener todos los módulos
    const { data: modulos } = await supabase
      .from('modulos')
      .select('id, codigo, nombre')
      .eq('activo', true);
    
    if (!modulos || modulos.length === 0) {
      console.log('⚠️  No hay módulos disponibles');
      rl.close();
      return;
    }
    
    let permisos = [];
    
    if (tipoPermisos === '1') {
      // Todos los permisos
      permisos = modulos.map(m => ({
        usuario_id: nuevoUsuario.id,
        modulo_id: m.id,
        puede_ver: true,
        puede_crear: true,
        puede_editar: true,
        puede_eliminar: true
      }));
    } else if (tipoPermisos === '2') {
      // Solo lectura
      permisos = modulos.map(m => ({
        usuario_id: nuevoUsuario.id,
        modulo_id: m.id,
        puede_ver: true,
        puede_crear: false,
        puede_editar: false,
        puede_eliminar: false
      }));
    } else {
      console.log('⚠️  Permisos personalizados no implementados en CLI');
      console.log('💡 Usa el SQL Editor de Supabase para configurar permisos personalizados');
      rl.close();
      return;
    }
    
    // Insertar permisos
    console.log('\n⏳ Asignando permisos...');
    const { error: errorPermisos } = await supabase
      .from('permisos_usuario')
      .insert(permisos);
    
    if (errorPermisos) {
      console.error('❌ Error asignando permisos:', errorPermisos);
    } else {
      console.log(`✅ Permisos asignados: ${permisos.length} módulos`);
    }
  }
  
  console.log('\n🎉 ¡Proceso completado!');
  console.log('\n📝 Credenciales:');
  console.log(`   Email: ${email}`);
  console.log(`   Password: ${password}`);
  console.log('\n⚠️  Guarda estas credenciales en un lugar seguro');
  
  rl.close();
}

crearUsuario().catch((error) => {
  console.error('❌ Error:', error);
  rl.close();
});
