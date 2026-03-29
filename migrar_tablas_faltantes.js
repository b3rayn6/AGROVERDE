import { createClient } from '@supabase/supabase-js';

const ORIGEN_URL = 'https://njzpozedfitrwphrjmsb.supabase.co';
const ORIGEN_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5qenBvemVkZml0cndwaHJqbXNiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjI4Mjk4NDQsImV4cCI6MjA3ODQwNTg0NH0.YD4k2--flkeM-quWQOPrsXYonfiRGIcegwVZN1GrPVs';

const DESTINO_URL = 'https://rqsxandjxinxdvfkiqvg.supabase.co';
const DESTINO_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJxc3hhbmRqeGlueGR2ZmtpcXZnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ3OTEyMTUsImV4cCI6MjA5MDM2NzIxNX0.BuVz5WVSqb9UV50Y2KJa65kv90OclM4acgnAU1wyVlk';

const origen = createClient(ORIGEN_URL, ORIGEN_KEY);
const destino = createClient(DESTINO_URL, DESTINO_KEY);

// Solo las tablas que fallaron
const TABLAS_FALLIDAS = [
  'mercancias',
  'nom_tipos_incentivos',
  'financiamientos',
  'financiamientos_bancarios',
  'notas_credito',
  'items_factura_venta',
  'items_factura_compra',
  // Tablas que dependen de las anteriores
  'pagos_prestamos',
  'pagos_financiamientos',
  'ventas_diarias',
  'ventas_diarias_items',
];

async function leerTodos(tabla) {
  const registros = [];
  let offset = 0;
  let hayMas = true;
  while (hayMas) {
    const { data, error } = await origen.from(tabla).select('*').range(offset, offset + 999);
    if (error) { console.error(`  ❌ Error leyendo ${tabla}:`, error.message); return null; }
    if (data && data.length > 0) { registros.push(...data); offset += 1000; if (data.length < 1000) hayMas = false; }
    else hayMas = false;
  }
  return registros;
}

async function insertar(tabla, registros) {
  const BATCH = 500;
  let ok = 0;
  for (let i = 0; i < registros.length; i += BATCH) {
    const lote = registros.slice(i, i + BATCH);
    const { error } = await destino.from(tabla).upsert(lote, { onConflict: 'id', ignoreDuplicates: true });
    if (error) {
      console.error(`  ❌ Lote falló en ${tabla}:`, error.message);
      for (const r of lote) {
        const { error: e2 } = await destino.from(tabla).upsert(r, { onConflict: 'id', ignoreDuplicates: true });
        if (e2) console.error(`    ⚠️ ID ${r.id}: ${e2.message}`);
        else ok++;
      }
    } else ok += lote.length;
  }
  return ok;
}

async function main() {
  console.log('🔄 RE-MIGRANDO TABLAS QUE FALLARON\n');
  for (const tabla of TABLAS_FALLIDAS) {
    console.log(`📊 ${tabla}`);
    const datos = await leerTodos(tabla);
    if (!datos) continue;
    if (datos.length === 0) { console.log('  ⏭️ Vacía'); continue; }
    console.log(`  📖 ${datos.length} registros`);
    const ok = await insertar(tabla, datos);
    console.log(`  ✅ ${ok}/${datos.length}\n`);
  }
  console.log('🏁 Listo');
}

main().catch(e => { console.error('💥', e); process.exit(1); });
