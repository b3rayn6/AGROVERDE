
import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
dotenv.config()

const supabaseUrl = process.env.VITE_SUPABASE_URL
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('Error: Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function checkConnection() {
  console.log('Testing Supabase connection...')
  try {

    const tables = ['suplidores', 'facturas_compra', 'cuadre_caja', 'facturas_venta', 'clientes', 'mercancias', 'pagos_suplidores', 'items_factura_compra', 'items_factura_venta', 'cobros_clientes', 'ventas_diarias'];
    
    for (const table of tables) {
      console.log(`Testing table: ${table}...`);
      const { error } = await supabase.from(table).select('count', { count: 'exact', head: true });
      if (error) {
        console.error(`Error accessing ${table}:`, error);
      } else {
        console.log(`Success: ${table} is accessible.`);
      }
    }

  } catch (err) {
    console.error('Network/Client Error:', err)
  }
}

checkConnection()
