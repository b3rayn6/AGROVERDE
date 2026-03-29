import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseAnonKey);

console.log('\n🔍 Buscando TODOS los registros recientes en cuadre_caja...\n');

async function queryTodosLosRegistros() {
  try {
    // Consulta: TODOS los registros recientes (últimos 50)
    console.log('📊 Consultando los últimos 50 registros de cuadre_caja');
    const { data: registros, error } = await supabase
      .from('cuadre_caja')
      .select(`
        id,
        fecha,
        concepto,
        tipo_movimiento,
        monto,
        divisa,
        metodo_pago,
        referencia,
        descripcion,
        cliente_id,
        cuenta_cobrar_id,
        factura_id,
        created_at
      `)
      .order('created_at', { ascending: false })
      .limit(50);

    if (error) {
      console.error('❌ Error:', error);
      return;
    }

    console.log(`✅ Encontrados ${registros?.length || 0} registros\n`);

    if (registros && registros.length > 0) {
      console.log('📋 Registros recientes:\n');
      registros.forEach((reg, index) => {
        console.log(`[${index + 1}] ID: ${reg.id}`);
        console.log(`    Fecha: ${reg.fecha || '⚠️ SIN FECHA'}`);
        console.log(`    Created At: ${reg.created_at || 'N/A'}`);
        console.log(`    Concepto: ${reg.concepto}`);
        console.log(`    Tipo: ${reg.tipo_movimiento}`);
        console.log(`    Monto: ${reg.monto} ${reg.divisa || ''}`);
        console.log(`    Método: ${reg.metodo_pago || 'N/A'}`);
        console.log(`    Referencia: ${reg.referencia || 'N/A'}`);
        console.log(`    Descripción: ${reg.descripcion || 'N/A'}`);
        console.log(`    Cliente ID: ${reg.cliente_id || 'N/A'}`);
        console.log(`    Cuenta Cobrar ID: ${reg.cuenta_cobrar_id || 'N/A'}`);
        console.log(`    Factura ID: ${reg.factura_id || 'N/A'}`);
        console.log('');
      });

      // Buscar registros sin fecha
      const sinFecha = registros.filter(r => !r.fecha);
      if (sinFecha.length > 0) {
        console.log(`\n⚠️ ADVERTENCIA: ${sinFecha.length} registros SIN FECHA encontrados:`);
        sinFecha.forEach((reg, index) => {
          console.log(`\n[${index + 1}] ID: ${reg.id}`);
          console.log(`    Created At: ${reg.created_at || 'N/A'}`);
          console.log(`    Concepto: ${reg.concepto}`);
          console.log(`    Referencia: ${reg.referencia || 'N/A'}`);
          console.log(`    Descripción: ${reg.descripcion || 'N/A'}`);
        });
      }
    }

    console.log('\n✅ Consulta completada\n');
  } catch (error) {
    console.error('❌ Error general:', error);
  }
}

queryTodosLosRegistros();
