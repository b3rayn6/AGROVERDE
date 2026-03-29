import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://njzpozedfitrwphrjmsb.supabase.co';
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseAnonKey) {
  console.error('ERROR: VITE_SUPABASE_ANON_KEY no está definida');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function buscarRegistro() {
  console.log('🔍 INICIANDO BÚSQUEDA COMPLETA EN BASE DE DATOS\n');
  console.log('Buscando:');
  console.log('  - Cliente: Felix Manuel Minaya (felix/minaya)');
  console.log('  - Referencia: 533');
  console.log('  - Monto: 152541\n');
  console.log('═'.repeat(80));

  // 1. Buscar cliente Felix Minaya
  console.log('\n1️⃣ BUSCANDO CLIENTE FELIX MINAYA');
  console.log('─'.repeat(80));
  const { data: clientes, error: errorClientes } = await supabase
    .from('clientes')
    .select('*')
    .or('nombre.ilike.%felix%,nombre.ilike.%minaya%');

  if (errorClientes) {
    console.error('❌ Error al buscar clientes:', errorClientes);
  } else if (clientes && clientes.length > 0) {
    console.log(`✅ Encontrados ${clientes.length} cliente(s):`);
    clientes.forEach(c => {
      console.log(`  • ID: ${c.id} | Nombre: ${c.nombre} | Tipo: ${c.tipo_cliente || 'N/A'} | Activo: ${c.activo}`);
    });
  } else {
    console.log('⚠️  No se encontró ningún cliente con nombre Felix o Minaya');
  }

  // Obtener IDs de clientes encontrados
  const clienteIds = clientes?.map(c => c.id) || [];

  // 2. Buscar en cuadre_caja
  console.log('\n2️⃣ BUSCANDO EN TABLA cuadre_caja');
  console.log('─'.repeat(80));
  const { data: cuadreCaja, error: errorCuadre } = await supabase
    .from('cuadre_caja')
    .select('*')
    .or(`referencia.eq.533,monto.eq.152541,descripcion.ilike.%felix%,descripcion.ilike.%minaya%${clienteIds.length > 0 ? `,cliente_id.in.(${clienteIds.join(',')})` : ''}`)
    .order('created_at', { ascending: false });

  if (errorCuadre) {
    console.error('❌ Error al buscar en cuadre_caja:', errorCuadre);
  } else if (cuadreCaja && cuadreCaja.length > 0) {
    console.log(`✅ Encontrados ${cuadreCaja.length} registro(s):`);
    cuadreCaja.forEach(r => {
      console.log(`  • ID: ${r.id} | Fecha: ${r.fecha} | Tipo: ${r.tipo_movimiento} | Concepto: ${r.concepto}`);
      console.log(`    Monto: ${r.monto} ${r.divisa || ''} | Ref: ${r.referencia || 'N/A'} | Cliente ID: ${r.cliente_id || 'N/A'}`);
      console.log(`    Descripción: ${r.descripcion || 'N/A'}`);
    });
  } else {
    console.log('⚠️  No se encontraron registros en cuadre_caja');
  }

  // 3. Buscar en pagos
  console.log('\n3️⃣ BUSCANDO EN TABLA pagos');
  console.log('─'.repeat(80));
  const { data: pagos, error: errorPagos } = await supabase
    .from('pagos')
    .select('*')
    .or(`referencia.eq.533,monto.eq.152541${clienteIds.length > 0 ? `,cliente_id.in.(${clienteIds.join(',')})` : ''}`)
    .order('created_at', { ascending: false });

  if (errorPagos) {
    console.error('❌ Error al buscar en pagos:', errorPagos);
  } else if (pagos && pagos.length > 0) {
    console.log(`✅ Encontrados ${pagos.length} registro(s):`);
    pagos.forEach(p => {
      console.log(`  • ID: ${p.id} | Fecha: ${p.fecha} | Monto: ${p.monto} ${p.divisa || ''}`);
      console.log(`    Ref: ${p.referencia || 'N/A'} | Método: ${p.metodo_pago || 'N/A'} | Cliente ID: ${p.cliente_id || 'N/A'}`);
    });
  } else {
    console.log('⚠️  No se encontraron registros en pagos');
  }

  // 4. Buscar en facturas_venta
  if (clienteIds.length > 0) {
    console.log('\n4️⃣ BUSCANDO EN TABLA facturas_venta');
    console.log('─'.repeat(80));
    const { data: facturas, error: errorFacturas } = await supabase
      .from('facturas_venta')
      .select('*, clientes(nombre)')
      .or(`total.eq.152541,cliente_id.in.(${clienteIds.join(',')})`)
      .order('created_at', { ascending: false })
      .limit(20);

    if (errorFacturas) {
      console.error('❌ Error al buscar en facturas_venta:', errorFacturas);
    } else if (facturas && facturas.length > 0) {
      console.log(`✅ Encontradas ${facturas.length} factura(s):`);
      facturas.forEach(f => {
        console.log(`  • ID: ${f.id} | N° Factura: ${f.numero_factura} | Fecha: ${f.fecha_emision}`);
        console.log(`    Total: ${f.total} | Cliente: ${f.clientes?.nombre || 'N/A'} | Cliente ID: ${f.cliente_id}`);
      });
    } else {
      console.log('⚠️  No se encontraron facturas para estos clientes');
    }
  }

  // 5. Buscar en cuentas_por_cobrar
  if (clienteIds.length > 0) {
    console.log('\n5️⃣ BUSCANDO EN TABLA cuentas_por_cobrar');
    console.log('─'.repeat(80));
    const { data: cuentas, error: errorCuentas } = await supabase
      .from('cuentas_por_cobrar')
      .select('*, clientes(nombre)')
      .or(`monto_total.eq.152541,saldo_pendiente.eq.152541,cliente_id.in.(${clienteIds.join(',')})`)
      .order('created_at', { ascending: false })
      .limit(20);

    if (errorCuentas) {
      console.error('❌ Error al buscar en cuentas_por_cobrar:', errorCuentas);
    } else if (cuentas && cuentas.length > 0) {
      console.log(`✅ Encontradas ${cuentas.length} cuenta(s):`);
      cuentas.forEach(c => {
        console.log(`  • ID: ${c.id} | Fecha: ${c.fecha} | Monto Total: ${c.monto_total}`);
        console.log(`    Saldo Pendiente: ${c.saldo_pendiente} | Cliente: ${c.clientes?.nombre || 'N/A'}`);
      });
    } else {
      console.log('⚠️  No se encontraron cuentas por cobrar para estos clientes');
    }
  }

  // 6. Buscar en transacciones
  console.log('\n6️⃣ BUSCANDO EN TABLA transacciones (si existe)');
  console.log('─'.repeat(80));
  const { data: transacciones, error: errorTransacciones } = await supabase
    .from('transacciones')
    .select('*')
    .or(`referencia.eq.533,monto.eq.152541,descripcion.ilike.%felix%,descripcion.ilike.%minaya%${clienteIds.length > 0 ? `,cliente_id.in.(${clienteIds.join(',')})` : ''}`)
    .order('created_at', { ascending: false });

  if (errorTransacciones) {
    if (errorTransacciones.code === 'PGRST204' || errorTransacciones.message.includes('does not exist')) {
      console.log('ℹ️  La tabla transacciones no existe en la base de datos');
    } else {
      console.error('❌ Error al buscar en transacciones:', errorTransacciones);
    }
  } else if (transacciones && transacciones.length > 0) {
    console.log(`✅ Encontradas ${transacciones.length} transacción(es):`);
    transacciones.forEach(t => {
      console.log(`  • ID: ${t.id} | Fecha: ${t.fecha} | Tipo: ${t.tipo} | Monto: ${t.monto}`);
      console.log(`    Ref: ${t.referencia || 'N/A'} | Cliente ID: ${t.cliente_id || 'N/A'}`);
      console.log(`    Descripción: ${t.descripcion || 'N/A'}`);
    });
  } else {
    console.log('⚠️  No se encontraron transacciones');
  }

  console.log('\n' + '═'.repeat(80));
  console.log('🏁 BÚSQUEDA COMPLETADA\n');
}

buscarRegistro().catch(error => {
  console.error('\n💥 ERROR FATAL:', error);
  process.exit(1);
});
