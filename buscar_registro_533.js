import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://njzpozedfitrwphrjmsb.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5qenBvemVkZml0cndwaHJqbXNiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjI4Mjk4NDQsImV4cCI6MjA3ODQwNTg0NH0.YD4k2--flkeM-quWQOPrsXYonfiRGIcegwVZN1GrPVs';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function buscarRegistro533() {
  console.log('🔍 Buscando registro con referencia 533 y monto 152541...\n');

  // 1. Buscar en cuadre_caja
  console.log('📊 Buscando en cuadre_caja...');
  const { data: cuadreCaja, error: error1 } = await supabase
    .from('cuadre_caja')
    .select('*')
    .or('referencia.eq.533,monto.eq.152541');

  if (error1) {
    console.error('❌ Error en cuadre_caja:', error1);
  } else {
    console.log('✅ Resultados en cuadre_caja:', cuadreCaja?.length || 0, 'registros');
    if (cuadreCaja && cuadreCaja.length > 0) {
      console.log(JSON.stringify(cuadreCaja, null, 2));
    }
  }

  // 2. Buscar en compensaciones
  console.log('\n📊 Buscando en compensaciones...');
  const { data: compensacion, error: error2 } = await supabase
    .from('compensaciones')
    .select('*')
    .or('referencia.eq.533,monto_total.eq.152541');

  if (error2) {
    console.error('❌ Error en compensaciones:', error2);
  } else {
    console.log('✅ Resultados en compensaciones:', compensacion?.length || 0, 'registros');
    if (compensacion && compensacion.length > 0) {
      console.log(JSON.stringify(compensacion, null, 2));
    }
  }

  // 3. Buscar en compensaciones_detalle
  console.log('\n📊 Buscando en compensaciones_detalle...');
  const { data: detalle, error: error3 } = await supabase
    .from('compensaciones_detalle')
    .select(`
      *,
      compensaciones(referencia, monto_total)
    `)
    .eq('monto_pagado', 152541);

  if (error3) {
    console.error('❌ Error en compensaciones_detalle:', error3);
  } else {
    console.log('✅ Resultados en compensaciones_detalle:', detalle?.length || 0, 'registros');
    if (detalle && detalle.length > 0) {
      console.log(JSON.stringify(detalle, null, 2));
    }
  }

  // 4. Buscar en pagos_obreros
  console.log('\n📊 Buscando en pagos_obreros...');
  const { data: pagos, error: error4 } = await supabase
    .from('pagos_obreros')
    .select('*')
    .or('referencia.eq.533,monto.eq.152541');

  if (error4) {
    console.error('❌ Error en pagos_obreros:', error4);
  } else {
    console.log('✅ Resultados en pagos_obreros:', pagos?.length || 0, 'registros');
    if (pagos && pagos.length > 0) {
      console.log(JSON.stringify(pagos, null, 2));
    }
  }

  // 5. Buscar en cobros_clientes
  console.log('\n📊 Buscando en cobros_clientes...');
  const { data: ingresos, error: error5 } = await supabase
    .from('cobros_clientes')
    .select('*')
    .or('referencia.eq.533,monto.eq.152541');

  if (error5) {
    console.error('❌ Error en cobros_clientes:', error5);
  } else {
    console.log('✅ Resultados en cobros_clientes:', ingresos?.length || 0, 'registros');
    if (ingresos && ingresos.length > 0) {
      console.log(JSON.stringify(ingresos, null, 2));
    }
  }

  // 6. Buscar también por monto aproximado (por si tiene decimales)
  console.log('\n📊 Buscando por monto aproximado (152540-152542)...');
  const { data: cuadreCajaAprox, error: error6 } = await supabase
    .from('cuadre_caja')
    .select('*')
    .gte('monto', 152540)
    .lte('monto', 152542);

  if (error6) {
    console.error('❌ Error buscando monto aproximado:', error6);
  } else {
    console.log('✅ Resultados con monto aproximado:', cuadreCajaAprox?.length || 0, 'registros');
    if (cuadreCajaAprox && cuadreCajaAprox.length > 0) {
      console.log(JSON.stringify(cuadreCajaAprox, null, 2));
    }
  }

  console.log('\n✅ Búsqueda completada');
}

buscarRegistro533();
