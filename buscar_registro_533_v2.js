import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://njzpozedfitrwphrjmsb.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5qenBvemVkZml0cndwaHJqbXNiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjI4Mjk4NDQsImV4cCI6MjA3ODQwNTg0NH0.YD4k2--flkeM-quWQOPrsXYonfiRGIcegwVZN1GrPVs';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function buscarRegistro533() {
  console.log('🔍 BÚSQUEDA EXHAUSTIVA: Referencia 533 y Monto 152541\n');
  console.log('=' .repeat(70));

  // 1. Buscar en cuadre_caja (tiene campo referencia)
  console.log('\n📊 1. TABLA: cuadre_caja');
  console.log('-'.repeat(70));

  const { data: cuadreCaja1, error: e1 } = await supabase
    .from('cuadre_caja')
    .select('*')
    .eq('referencia', '533');

  console.log(`✓ Búsqueda por referencia='533': ${cuadreCaja1?.length || 0} registros`);
  if (cuadreCaja1 && cuadreCaja1.length > 0) {
    console.log('✅ ENCONTRADO:\n', JSON.stringify(cuadreCaja1, null, 2));
  }

  const { data: cuadreCaja2, error: e2 } = await supabase
    .from('cuadre_caja')
    .select('*')
    .eq('monto', 152541);

  console.log(`✓ Búsqueda por monto=152541: ${cuadreCaja2?.length || 0} registros`);
  if (cuadreCaja2 && cuadreCaja2.length > 0) {
    console.log('✅ ENCONTRADO:\n', JSON.stringify(cuadreCaja2, null, 2));
  }

  // 2. Buscar en compensaciones (NO tiene campo referencia)
  console.log('\n📊 2. TABLA: compensaciones');
  console.log('-'.repeat(70));

  const { data: comp1, error: e3 } = await supabase
    .from('compensaciones')
    .select('*')
    .eq('monto_compensado', 152541);

  console.log(`✓ Búsqueda por monto_compensado=152541: ${comp1?.length || 0} registros`);
  if (comp1 && comp1.length > 0) {
    console.log('✅ ENCONTRADO:\n', JSON.stringify(comp1, null, 2));
  }

  const { data: comp2, error: e4 } = await supabase
    .from('compensaciones')
    .select('*')
    .eq('deuda_anterior', 152541);

  console.log(`✓ Búsqueda por deuda_anterior=152541: ${comp2?.length || 0} registros`);
  if (comp2 && comp2.length > 0) {
    console.log('✅ ENCONTRADO:\n', JSON.stringify(comp2, null, 2));
  }

  // 3. Buscar en compensaciones_cuentas (puede tener relación con pesadas)
  console.log('\n📊 3. TABLA: compensaciones_cuentas');
  console.log('-'.repeat(70));

  const { data: compCuentas, error: e5 } = await supabase
    .from('compensaciones_cuentas')
    .select(`
      *,
      pesadas(id, numero_factura, total_pagar),
      cuentas_por_cobrar(numero, monto_original),
      cuentas_por_pagar(numero_factura, monto_original)
    `)
    .eq('monto_compensado', 152541);

  console.log(`✓ Búsqueda por monto_compensado=152541: ${compCuentas?.length || 0} registros`);
  if (compCuentas && compCuentas.length > 0) {
    console.log('✅ ENCONTRADO:\n', JSON.stringify(compCuentas, null, 2));
  }

  // 4. Buscar en cobros_clientes
  console.log('\n📊 4. TABLA: cobros_clientes');
  console.log('-'.repeat(70));

  const { data: cobros1, error: e6 } = await supabase
    .from('cobros_clientes')
    .select('*')
    .eq('referencia', '533');

  console.log(`✓ Búsqueda por referencia='533': ${cobros1?.length || 0} registros`);
  if (cobros1 && cobros1.length > 0) {
    console.log('✅ ENCONTRADO:\n', JSON.stringify(cobros1, null, 2));
  }

  const { data: cobros2, error: e7 } = await supabase
    .from('cobros_clientes')
    .select('*')
    .eq('monto', 152541);

  console.log(`✓ Búsqueda por monto=152541: ${cobros2?.length || 0} registros`);
  if (cobros2 && cobros2.length > 0) {
    console.log('✅ ENCONTRADO:\n', JSON.stringify(cobros2, null, 2));
  }

  // 5. Buscar en pagos_obreros
  console.log('\n📊 5. TABLA: pagos_obreros');
  console.log('-'.repeat(70));

  const { data: pagos1, error: e8 } = await supabase
    .from('pagos_obreros')
    .select('*')
    .eq('monto', 152541);

  console.log(`✓ Búsqueda por monto=152541: ${pagos1?.length || 0} registros`);
  if (pagos1 && pagos1.length > 0) {
    console.log('✅ ENCONTRADO:\n', JSON.stringify(pagos1, null, 2));
  }

  // 6. Buscar pesadas con número 533
  console.log('\n📊 6. TABLA: pesadas (relacionadas)');
  console.log('-'.repeat(70));

  const { data: pesadas1, error: e9 } = await supabase
    .from('pesadas')
    .select('*')
    .eq('numero_factura', '533');

  console.log(`✓ Búsqueda por numero_factura='533': ${pesadas1?.length || 0} registros`);
  if (pesadas1 && pesadas1.length > 0) {
    console.log('✅ ENCONTRADO:\n', JSON.stringify(pesadas1, null, 2));
  }

  const { data: pesadas2, error: e10 } = await supabase
    .from('pesadas')
    .select('*')
    .eq('total_pagar', 152541);

  console.log(`✓ Búsqueda por total_pagar=152541: ${pesadas2?.length || 0} registros`);
  if (pesadas2 && pesadas2.length > 0) {
    console.log('✅ ENCONTRADO:\n', JSON.stringify(pesadas2, null, 2));
  }

  // 7. Buscar en cuentas_por_pagar
  console.log('\n📊 7. TABLA: cuentas_por_pagar');
  console.log('-'.repeat(70));

  const { data: cxp1, error: e11 } = await supabase
    .from('cuentas_por_pagar')
    .select('*')
    .eq('numero_factura', '533');

  console.log(`✓ Búsqueda por numero_factura='533': ${cxp1?.length || 0} registros`);
  if (cxp1 && cxp1.length > 0) {
    console.log('✅ ENCONTRADO:\n', JSON.stringify(cxp1, null, 2));
  }

  const { data: cxp2, error: e12 } = await supabase
    .from('cuentas_por_pagar')
    .select('*')
    .eq('monto_original', 152541);

  console.log(`✓ Búsqueda por monto_original=152541: ${cxp2?.length || 0} registros`);
  if (cxp2 && cxp2.length > 0) {
    console.log('✅ ENCONTRADO:\n', JSON.stringify(cxp2, null, 2));
  }

  // 8. Buscar en cuentas_por_cobrar
  console.log('\n📊 8. TABLA: cuentas_por_cobrar');
  console.log('-'.repeat(70));

  const { data: cxc1, error: e13 } = await supabase
    .from('cuentas_por_cobrar')
    .select('*')
    .ilike('numero', '%533%');

  console.log(`✓ Búsqueda por numero contiene '533': ${cxc1?.length || 0} registros`);
  if (cxc1 && cxc1.length > 0) {
    console.log('✅ ENCONTRADO:\n', JSON.stringify(cxc1, null, 2));
  }

  const { data: cxc2, error: e14 } = await supabase
    .from('cuentas_por_cobrar')
    .select('*')
    .eq('monto_original', 152541);

  console.log(`✓ Búsqueda por monto_original=152541: ${cxc2?.length || 0} registros`);
  if (cxc2 && cxc2.length > 0) {
    console.log('✅ ENCONTRADO:\n', JSON.stringify(cxc2, null, 2));
  }

  console.log('\n' + '='.repeat(70));
  console.log('✅ BÚSQUEDA COMPLETADA');
  console.log('='.repeat(70));
}

buscarRegistro533();
