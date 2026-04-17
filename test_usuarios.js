import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Error: Faltan las variables de entorno VITE_SUPABASE_URL o VITE_SUPABASE_ANON_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function testUsuarios() {
  console.log('🔍 Probando conexión a Supabase...\n');
  
  try {
    // 1. Probar tabla usuarios_sistema
    console.log('📋 Consultando tabla usuarios_sistema...');
    const { data: usuarios, error: errorUsuarios } = await supabase
      .from('usuarios_sistema')
      .select('*');
    
    if (errorUsuarios) {
      console.error('❌ Error al consultar usuarios_sistema:', errorUsuarios);
    } else {
      console.log(`✅ Usuarios encontrados: ${usuarios?.length || 0}`);
      if (usuarios && usuarios.length > 0) {
        console.log('   Usuarios:', usuarios.map(u => `${u.nombre_completo} (${u.email})`).join(', '));
      }
    }
    
    // 2. Probar tabla roles
    console.log('\n📋 Consultando tabla roles...');
    const { data: roles, error: errorRoles } = await supabase
      .from('roles')
      .select('*');
    
    if (errorRoles) {
      console.error('❌ Error al consultar roles:', errorRoles);
    } else {
      console.log(`✅ Roles encontrados: ${roles?.length || 0}`);
      if (roles && roles.length > 0) {
        console.log('   Roles:', roles.map(r => r.nombre).join(', '));
      }
    }
    
    // 3. Probar tabla modulos
    console.log('\n📋 Consultando tabla modulos...');
    const { data: modulos, error: errorModulos } = await supabase
      .from('modulos')
      .select('*');
    
    if (errorModulos) {
      console.error('❌ Error al consultar modulos:', errorModulos);
    } else {
      console.log(`✅ Módulos encontrados: ${modulos?.length || 0}`);
      if (modulos && modulos.length > 0) {
        console.log('   Módulos:', modulos.map(m => m.nombre).join(', '));
      }
    }
    
    // 4. Probar tabla permisos_usuario
    console.log('\n📋 Consultando tabla permisos_usuario...');
    const { data: permisos, error: errorPermisos } = await supabase
      .from('permisos_usuario')
      .select('*');
    
    if (errorPermisos) {
      console.error('❌ Error al consultar permisos_usuario:', errorPermisos);
    } else {
      console.log(`✅ Permisos encontrados: ${permisos?.length || 0}`);
    }
    
    // 5. Probar consulta con JOIN (como en GestionUsuarios)
    console.log('\n📋 Consultando usuarios con roles (JOIN)...');
    const { data: usuariosConRoles, error: errorJoin } = await supabase
      .from('usuarios_sistema')
      .select('*, roles(nombre)')
      .order('created_at', { ascending: false });
    
    if (errorJoin) {
      console.error('❌ Error al consultar usuarios con roles:', errorJoin);
    } else {
      console.log(`✅ Usuarios con roles: ${usuariosConRoles?.length || 0}`);
      if (usuariosConRoles && usuariosConRoles.length > 0) {
        usuariosConRoles.forEach(u => {
          console.log(`   - ${u.nombre_completo} (${u.email}) - Rol: ${u.roles?.nombre || 'Sin rol'}`);
        });
      }
    }
    
    console.log('\n✅ Prueba completada');
    
  } catch (error) {
    console.error('❌ Error general:', error);
  }
}

testUsuarios();
