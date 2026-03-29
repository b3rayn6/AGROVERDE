import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ Error: Variables de entorno no encontradas');
  console.error('VITE_SUPABASE_URL:', supabaseUrl ? 'Definida' : 'No definida');
  console.error('VITE_SUPABASE_ANON_KEY:', supabaseAnonKey ? 'Definida' : 'No definida');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

console.log('\n🔍 Buscando registros de "Pagar con Ingreso" en cuadre_caja...\n');

async function queryRegistros() {
  try {
    // Consulta 1: Buscar por concepto "pago_ingreso" o "ingreso_disponible"
    console.log('📊 Consulta 1: Registros con concepto "pago_ingreso" o "ingreso_disponible"');
    const { data: registrosPorConcepto, error: error1 } = await supabase
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
      .in('concepto', ['pago_ingreso', 'ingreso_disponible'])
      .order('created_at', { ascending: false });

    if (error1) {
      console.error('❌ Error en consulta 1:', error1);
    } else {
      console.log(`✅ Encontrados ${registrosPorConcepto?.length || 0} registros por concepto`);
      if (registrosPorConcepto && registrosPorConcepto.length > 0) {
        console.log('\n📋 Registros por concepto:');
        registrosPorConcepto.forEach((reg, index) => {
          console.log(`\n[${index + 1}] ID: ${reg.id}`);
          console.log(`    Fecha: ${reg.fecha || 'SIN FECHA'}`);
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
        });
      }
    }

    // Consulta 2: Buscar por referencia o descripción con "felix" o "minaya"
    console.log('\n\n📊 Consulta 2: Registros con "felix" o "minaya" en referencia/descripción');
    const { data: registrosPorTexto, error: error2 } = await supabase
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
      .or('referencia.ilike.%felix%,referencia.ilike.%minaya%,descripcion.ilike.%felix%,descripcion.ilike.%minaya%')
      .order('created_at', { ascending: false });

    if (error2) {
      console.error('❌ Error en consulta 2:', error2);
    } else {
      console.log(`✅ Encontrados ${registrosPorTexto?.length || 0} registros por texto`);
      if (registrosPorTexto && registrosPorTexto.length > 0) {
        console.log('\n📋 Registros con "felix" o "minaya":');
        registrosPorTexto.forEach((reg, index) => {
          console.log(`\n[${index + 1}] ID: ${reg.id}`);
          console.log(`    Fecha: ${reg.fecha || 'SIN FECHA'}`);
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
        });
      }
    }

    // Consulta 3: Buscar cliente Felix Manuel Minaya
    console.log('\n\n📊 Consulta 3: Buscando cliente "Felix Manuel Minaya" en tabla clientes');
    const { data: clientes, error: error3 } = await supabase
      .from('clientes')
      .select('id, nombre, cedula')
      .or('nombre.ilike.%felix%,nombre.ilike.%minaya%');

    if (error3) {
      console.error('❌ Error en consulta 3:', error3);
    } else {
      console.log(`✅ Encontrados ${clientes?.length || 0} clientes con "felix" o "minaya"`);
      if (clientes && clientes.length > 0) {
        console.log('\n👤 Clientes encontrados:');
        clientes.forEach((cliente, index) => {
          console.log(`\n[${index + 1}] ID: ${cliente.id}`);
          console.log(`    Nombre: ${cliente.nombre}`);
          console.log(`    Cédula: ${cliente.cedula || 'N/A'}`);
        });

        // Consulta 4: Buscar registros con cliente_id encontrado
        const clienteIds = clientes.map(c => c.id);
        console.log('\n\n📊 Consulta 4: Registros con cliente_id de Felix Manuel Minaya');
        const { data: registrosPorCliente, error: error4 } = await supabase
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
          .in('cliente_id', clienteIds)
          .order('created_at', { ascending: false });

        if (error4) {
          console.error('❌ Error en consulta 4:', error4);
        } else {
          console.log(`✅ Encontrados ${registrosPorCliente?.length || 0} registros para el cliente`);
          if (registrosPorCliente && registrosPorCliente.length > 0) {
            console.log('\n📋 Registros del cliente:');
            registrosPorCliente.forEach((reg, index) => {
              console.log(`\n[${index + 1}] ID: ${reg.id}`);
              console.log(`    Fecha: ${reg.fecha || 'SIN FECHA'}`);
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
            });
          }
        }
      }
    }

    console.log('\n✅ Consulta completada\n');
  } catch (error) {
    console.error('❌ Error general:', error);
  }
}

queryRegistros();
