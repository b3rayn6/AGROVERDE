import { createClient } from '@supabase/supabase-js';

// ============================================================
// SCRIPT DE MIGRACIÓN DE DATOS
// Copia TODOS los datos de Supabase origen a Supabase destino
// ============================================================
// USO:
//   1. Primero ejecuta migracion_completa.sql en el proyecto NUEVO
//   2. Llena las credenciales de DESTINO abajo
//   3. Ejecuta: node migrar_datos.js
// ============================================================

// === ORIGEN (tu base actual) ===
const ORIGEN_URL = 'https://njzpozedfitrwphrjmsb.supabase.co';
const ORIGEN_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5qenBvemVkZml0cndwaHJqbXNiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjI4Mjk4NDQsImV4cCI6MjA3ODQwNTg0NH0.YD4k2--flkeM-quWQOPrsXYonfiRGIcegwVZN1GrPVs';

// === DESTINO (tu base NUEVA) ===
const DESTINO_URL = 'https://rqsxandjxinxdvfkiqvg.supabase.co';
const DESTINO_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJxc3hhbmRqeGlueGR2ZmtpcXZnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ3OTEyMTUsImV4cCI6MjA5MDM2NzIxNX0.BuVz5WVSqb9UV50Y2KJa65kv90OclM4acgnAU1wyVlk';

const origen = createClient(ORIGEN_URL, ORIGEN_KEY);
const destino = createClient(DESTINO_URL, DESTINO_KEY);

// Orden de migración respetando dependencias (foreign keys)
const TABLAS_EN_ORDEN = [
  // Nivel 0: Sin dependencias
  'clientes',
  'suplidores',
  'empleados',
  'users',
  'roles',
  'modulos',
  'mercancias',
  'configuracion_divisa',
  'contador_global',
  'counter',
  'profiles',
  'reviews',
  'pasivos',
  'activos_fijos',
  'catalogo_cuentas',
  'nom_departamentos',
  'nom_tipos_incentivos',
  // Nivel 1: Dependen de nivel 0
  'usuarios_sistema',
  'permisos_usuario',
  'choferes',
  'saldo_clientes',
  'salidas_pais',
  'pesadas',
  'facturas_venta',
  'facturas_compra',
  'facturas_factoria',
  'cheques_factoria',
  'cuentas_por_cobrar',
  'cuentas_por_pagar_suplidores',
  'financiamientos',
  'financiamientos_bancarios',
  'gastos',
  'nomina',
  'depreciacion_activos',
  'mantenimientos_activos',
  'counter_history',
  'nom_puestos',
  'nom_empleados',
  'nom_nominas',
  'nom_candidatos',

  // Nivel 2: Dependen de nivel 1
  'cuadre_caja',
  'movimientos_caja',
  'compensaciones',
  'notas_credito',
  'compensaciones_cuentas',
  'cobros_clientes',
  'cobros_ventas',
  'items_factura_venta',
  'items_factura_compra',
  'pagos_suplidores',
  'pagos_prestamos',
  'pagos_financiamientos',
  'fletes',
  'pagos_obreros',
  'ventas_diarias',
  'libro_diario',
  'utilidad_neta',
  'nom_incentivos',
  'nom_detalle_nomina',
  'nom_prestamos',
  'nom_adelantos',
  'nom_acciones_personal',

  // Nivel 3: Dependen de nivel 2
  'gastos_flete',
  'ventas_diarias_items',
  'nom_cuotas_prestamos',
];

// Leer TODOS los registros de una tabla (maneja paginación de Supabase)
async function leerTodosLosRegistros(tabla) {
  const registros = [];
  const PAGE_SIZE = 1000;
  let offset = 0;
  let hayMas = true;

  while (hayMas) {
    const { data, error } = await origen
      .from(tabla)
      .select('*')
      .range(offset, offset + PAGE_SIZE - 1);

    if (error) {
      console.error(`  ❌ Error leyendo ${tabla}:`, error.message);
      return null;
    }

    if (data && data.length > 0) {
      registros.push(...data);
      offset += PAGE_SIZE;
      if (data.length < PAGE_SIZE) hayMas = false;
    } else {
      hayMas = false;
    }
  }

  return registros;
}

// Insertar registros en lotes para evitar timeouts
async function insertarEnLotes(tabla, registros) {
  const BATCH_SIZE = 500;
  let insertados = 0;

  for (let i = 0; i < registros.length; i += BATCH_SIZE) {
    const lote = registros.slice(i, i + BATCH_SIZE);
    const { error } = await destino
      .from(tabla)
      .upsert(lote, { onConflict: 'id', ignoreDuplicates: true });

    if (error) {
      console.error(`  ❌ Error insertando lote en ${tabla} (registros ${i}-${i + lote.length}):`, error.message);
      // Intentar uno por uno si falla el lote
      console.log(`  🔄 Reintentando uno por uno...`);
      for (const registro of lote) {
        const { error: errIndividual } = await destino
          .from(tabla)
          .upsert(registro, { onConflict: 'id', ignoreDuplicates: true });
        if (errIndividual) {
          console.error(`    ⚠️  Fallo registro ID ${registro.id}:`, errIndividual.message);
        } else {
          insertados++;
        }
      }
    } else {
      insertados += lote.length;
    }
  }

  return insertados;
}

// Función principal
async function migrarTodo() {
  console.log('═'.repeat(70));
  console.log('🚀 MIGRACIÓN DE DATOS - SUPABASE A SUPABASE');
  console.log('═'.repeat(70));
  console.log(`📤 Origen:  ${ORIGEN_URL}`);
  console.log(`📥 Destino: ${DESTINO_URL}`);
  console.log(`📋 Tablas a migrar: ${TABLAS_EN_ORDEN.length}`);
  console.log('═'.repeat(70));

  if (DESTINO_URL.includes('TU_NUEVO_PROYECTO')) {
    console.error('\n❌ ERROR: Debes configurar las credenciales del proyecto DESTINO.');
    console.error('   Edita DESTINO_URL y DESTINO_KEY en este archivo.\n');
    process.exit(1);
  }

  const resumen = {
    exitosas: [],
    vacias: [],
    errores: [],
  };

  let tablaNum = 0;
  for (const tabla of TABLAS_EN_ORDEN) {
    tablaNum++;
    console.log(`\n[${tablaNum}/${TABLAS_EN_ORDEN.length}] 📊 Migrando: ${tabla}`);

    // 1. Leer datos del origen
    const registros = await leerTodosLosRegistros(tabla);

    if (registros === null) {
      resumen.errores.push({ tabla, motivo: 'Error al leer' });
      continue;
    }

    if (registros.length === 0) {
      console.log(`  ⏭️  Tabla vacía, saltando.`);
      resumen.vacias.push(tabla);
      continue;
    }

    console.log(`  📖 Leídos: ${registros.length} registros`);

    // 2. Insertar en destino
    const insertados = await insertarEnLotes(tabla, registros);
    console.log(`  ✅ Insertados: ${insertados}/${registros.length}`);

    if (insertados === registros.length) {
      resumen.exitosas.push({ tabla, cantidad: insertados });
    } else if (insertados > 0) {
      resumen.exitosas.push({ tabla, cantidad: insertados });
      resumen.errores.push({ tabla, motivo: `Solo ${insertados}/${registros.length}` });
    } else {
      resumen.errores.push({ tabla, motivo: 'Ningún registro insertado' });
    }
  }

  // Resumen final
  console.log('\n' + '═'.repeat(70));
  console.log('📊 RESUMEN DE MIGRACIÓN');
  console.log('═'.repeat(70));

  console.log(`\n✅ Tablas migradas exitosamente: ${resumen.exitosas.length}`);
  resumen.exitosas.forEach(t => console.log(`   • ${t.tabla}: ${t.cantidad} registros`));

  if (resumen.vacias.length > 0) {
    console.log(`\n⏭️  Tablas vacías (sin datos): ${resumen.vacias.length}`);
    resumen.vacias.forEach(t => console.log(`   • ${t}`));
  }

  if (resumen.errores.length > 0) {
    console.log(`\n❌ Tablas con errores: ${resumen.errores.length}`);
    resumen.errores.forEach(t => console.log(`   • ${t.tabla}: ${t.motivo}`));
  }

  const totalRegistros = resumen.exitosas.reduce((sum, t) => sum + t.cantidad, 0);
  console.log(`\n📦 Total de registros migrados: ${totalRegistros}`);
  console.log('═'.repeat(70));
  console.log('🏁 Migración completada.');
  console.log('\n📝 Próximos pasos:');
  console.log('   1. Verifica los datos en el nuevo proyecto Supabase');
  console.log('   2. Actualiza tu .env con las nuevas credenciales');
  console.log('   3. Regenera los tipos: npx supabase gen types typescript --project-id TU_ID > types/database.types.ts');
}

migrarTodo().catch(err => {
  console.error('💥 Error fatal:', err);
  process.exit(1);
});
