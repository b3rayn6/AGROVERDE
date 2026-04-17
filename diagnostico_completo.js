// Script de diagnóstico completo del sistema de usuarios
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://njzpozedfitrwphrjmsb.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5qenBvemVkZml0cndwaHJqbXNiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjI4Mjk4NDQsImV4cCI6MjA3ODQwNTg0NH0.YD4k2--flkeM-quWQOPrsXYonfiRGIcegwVZN1GrPVs';

const supabase = createClient(supabaseUrl, supabaseKey);

async function diagnosticoCompleto() {
  console.log('🔍 DIAGNÓSTICO COMPLETO DEL SISTEMA\n');
  console.log('='.repeat(60));
  
  // 1. Verificar conexión
  console.log('\n1️⃣ VERIFICANDO CONEXIÓN A SUPABASE...');
  try {
    const { data, error } = await supabase.from('usuarios_sistema').select('count').limit(1);
    if (error) throw error;
    console.log('✅ Conexión exitosa');
  } catch (error) {
    console.error('❌ Error de conexión:', error.message);
    return;
  }
  
  // 2. Verificar roles
  console.log('\n2️⃣ VERIFICANDO ROLES...');
  const { data: roles, error: errorRoles } = await supabase
    .from('roles')
    .select('id, nombre, descripcion')
    .order('nombre');
  
  if (errorRoles) {
    console.error('❌ Error:', errorRoles.message);
  } else if (!roles || roles.length === 0) {
    console.log('⚠️  No hay roles configurados');
  } else {
    console.log(`✅ Roles encontrados: ${roles.length}`);
    roles.forEach((r, i) => {
      console.log(`   ${i + 1}. ${r.nombre} - ${r.descripcion || 'Sin descripción'}`);
    });
  }
  
  // 3. Verificar módulos
  console.log('\n3️⃣ VERIFICANDO MÓDULOS...');
  const { data: modulos, error: errorModulos } = await supabase
    .from('modulos')
    .select('id, codigo, nombre')
    .order('nombre');
  
  if (errorModulos) {
    console.error('❌ Error:', errorModulos.message);
  } else if (!modulos || modulos.length === 0) {
    console.log('⚠️  No hay módulos configurados');
  } else {
    console.log(`✅ Módulos encontrados: ${modulos.length}`);
    console.log('\n   Módulos disponibles:');
    modulos.forEach((m, i) => {
      console.log(`   ${i + 1}. ${m.nombre} (${m.codigo})`);
    });
  }
  
  // 4. Verificar usuarios
  console.log('\n4️⃣ VERIFICANDO USUARIOS...');
  const { data: usuarios, error: errorUsuarios } = await supabase
    .from('usuarios_sistema')
    .select('id, email, nombre_completo, rol_id, activo, legacy_id, created_at, roles(nombre)')
    .order('created_at', { ascending: false });
  
  if (errorUsuarios) {
    console.error('❌ Error:', errorUsuarios.message);
  } else if (!usuarios || usuarios.length === 0) {
    console.log('⚠️  NO HAY USUARIOS EN EL SISTEMA');
    console.log('\n💡 ACCIÓN REQUERIDA:');
    console.log('   1. Ejecutar: crear_usuario_admin.sql en Supabase SQL Editor');
    console.log('   2. O ejecutar: node crear_usuario_cli.js');
  } else {
    const activos = usuarios.filter(u => u.activo).length;
    const inactivos = usuarios.filter(u => !u.activo).length;
    const legacy = usuarios.filter(u => u.legacy_id).length;
    
    console.log(`✅ Usuarios encontrados: ${usuarios.length}`);
    console.log(`   - Activos: ${activos}`);
    console.log(`   - Inactivos: ${inactivos}`);
    console.log(`   - Legacy: ${legacy}`);
    
    if (legacy > 0) {
      console.log('\n⚠️  ADVERTENCIA: Hay usuarios legacy en el sistema');
      console.log('   Ejecutar: limpiar_usuarios_legacy.sql');
    }
    
    console.log('\n   Usuarios activos:');
    usuarios.filter(u => u.activo).forEach((u, i) => {
      console.log(`   ${i + 1}. ${u.email}`);
      console.log(`      - Nombre: ${u.nombre_completo || 'N/A'}`);
      console.log(`      - Rol: ${u.roles?.nombre || 'N/A'}`);
      console.log(`      - Legacy: ${u.legacy_id ? '⚠️ Sí' : '✅ No'}`);
    });
  }
  
  // 5. Verificar permisos
  console.log('\n5️⃣ VERIFICANDO PERMISOS...');
  if (usuarios && usuarios.length > 0) {
    for (const usuario of usuarios.filter(u => u.activo)) {
      const { data: permisos, error: errorPermisos } = await supabase
        .from('permisos_usuario')
        .select('*, modulos(codigo, nombre)')
        .eq('usuario_id', usuario.id);
      
      if (errorPermisos) {
        console.error(`❌ Error obteniendo permisos de ${usuario.email}:`, errorPermisos.message);
      } else {
        const totalPermisos = permisos?.length || 0;
        if (totalPermisos === 0) {
          console.log(`⚠️  ${usuario.email}: SIN PERMISOS`);
          console.log('   💡 Este usuario no podrá acceder a ningún módulo');
        } else {
          console.log(`✅ ${usuario.email}: ${totalPermisos} permisos`);
        }
      }
    }
  } else {
    console.log('⏭️  Saltando (no hay usuarios)');
  }
  
  // 6. Resumen y recomendaciones
  console.log('\n' + '='.repeat(60));
  console.log('📊 RESUMEN Y RECOMENDACIONES\n');
  
  const problemas = [];
  const recomendaciones = [];
  
  if (!roles || roles.length === 0) {
    problemas.push('❌ No hay roles configurados');
    recomendaciones.push('Crear roles en la tabla "roles"');
  }
  
  if (!modulos || modulos.length === 0) {
    problemas.push('❌ No hay módulos configurados');
    recomendaciones.push('Crear módulos en la tabla "modulos"');
  }
  
  if (!usuarios || usuarios.length === 0) {
    problemas.push('❌ NO HAY USUARIOS - SISTEMA NO FUNCIONAL');
    recomendaciones.push('URGENTE: Ejecutar crear_usuario_admin.sql');
  } else {
    const usuariosActivos = usuarios.filter(u => u.activo);
    if (usuariosActivos.length === 0) {
      problemas.push('❌ No hay usuarios activos');
      recomendaciones.push('Activar al menos un usuario');
    }
    
    const usuariosLegacy = usuarios.filter(u => u.legacy_id);
    if (usuariosLegacy.length > 0) {
      problemas.push(`⚠️  Hay ${usuariosLegacy.length} usuarios legacy`);
      recomendaciones.push('Ejecutar limpiar_usuarios_legacy.sql');
    }
    
    // Verificar usuarios sin permisos
    for (const usuario of usuariosActivos) {
      const { data: permisos } = await supabase
        .from('permisos_usuario')
        .select('id')
        .eq('usuario_id', usuario.id);
      
      if (!permisos || permisos.length === 0) {
        problemas.push(`⚠️  Usuario ${usuario.email} sin permisos`);
        recomendaciones.push(`Asignar permisos a ${usuario.email}`);
      }
    }
  }
  
  if (problemas.length === 0) {
    console.log('✅ ¡SISTEMA CONFIGURADO CORRECTAMENTE!\n');
    console.log('Todo está listo para usar el sistema.');
  } else {
    console.log('⚠️  PROBLEMAS DETECTADOS:\n');
    problemas.forEach((p, i) => {
      console.log(`${i + 1}. ${p}`);
    });
    
    console.log('\n💡 RECOMENDACIONES:\n');
    recomendaciones.forEach((r, i) => {
      console.log(`${i + 1}. ${r}`);
    });
  }
  
  console.log('\n' + '='.repeat(60));
  console.log('\n📝 PRÓXIMOS PASOS:\n');
  
  if (!usuarios || usuarios.length === 0) {
    console.log('1. Ejecutar: crear_usuario_admin.sql en Supabase SQL Editor');
    console.log('2. Verificar: node listar_usuarios_sistema.js');
    console.log('3. Probar login en la aplicación');
  } else {
    console.log('1. Revisar problemas detectados arriba');
    console.log('2. Aplicar recomendaciones');
    console.log('3. Ejecutar este diagnóstico nuevamente');
    console.log('4. Probar login en la aplicación');
  }
  
  console.log('\n✅ Diagnóstico completado\n');
}

diagnosticoCompleto().catch((error) => {
  console.error('❌ Error fatal:', error);
});
