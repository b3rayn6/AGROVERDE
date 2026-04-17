// Script para listar todos los usuarios del sistema
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://njzpozedfitrwphrjmsb.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5qenBvemVkZml0cndwaHJqbXNiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjI4Mjk4NDQsImV4cCI6MjA3ODQwNTg0NH0.YD4k2--flkeM-quWQOPrsXYonfiRGIcegwVZN1GrPVs';

const supabase = createClient(supabaseUrl, supabaseKey);

async function listarUsuarios() {
  console.log('👥 LISTADO DE USUARIOS DEL SISTEMA\n');
  
  // Listar todos los usuarios
  const { data: usuarios, error } = await supabase
    .from('usuarios_sistema')
    .select('id, email, nombre_completo, rol_id, activo, legacy_id, created_at, roles(nombre)')
    .order('created_at', { ascending: false });
  
  if (error) {
    console.error('❌ Error:', error);
    return;
  }
  
  if (!usuarios || usuarios.length === 0) {
    console.log('⚠️  No se encontraron usuarios en el sistema');
    return;
  }
  
  console.log(`✅ Total de usuarios: ${usuarios.length}\n`);
  
  usuarios.forEach((u, i) => {
    console.log(`${i + 1}. ${u.email}`);
    console.log(`   - ID: ${u.id}`);
    console.log(`   - Nombre: ${u.nombre_completo || 'N/A'}`);
    console.log(`   - Rol: ${u.roles?.nombre || 'N/A'} (ID: ${u.rol_id || 'N/A'})`);
    console.log(`   - Activo: ${u.activo ? '✅' : '❌'}`);
    console.log(`   - Legacy ID: ${u.legacy_id || 'N/A'}`);
    console.log(`   - Creado: ${new Date(u.created_at).toLocaleString('es-DO')}`);
    console.log('');
  });
  
  // Contar usuarios activos vs inactivos
  const activos = usuarios.filter(u => u.activo).length;
  const inactivos = usuarios.filter(u => !u.activo).length;
  const legacy = usuarios.filter(u => u.legacy_id).length;
  
  console.log('📊 RESUMEN:');
  console.log(`   - Activos: ${activos}`);
  console.log(`   - Inactivos: ${inactivos}`);
  console.log(`   - Legacy: ${legacy}`);
}

listarUsuarios().catch(console.error);
