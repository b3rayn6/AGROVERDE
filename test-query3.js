import { supabase } from './src/lib/supabase.js';

async function check() {
  const { data: u1, error: e1 } = await supabase.from('usuarios_sistema').select('*').eq('email', 'admin@admin.com');
  console.log("admin en usuarios_sistema:", u1);
  const { data: cols } = await supabase.rpc('get_table_constraints', { table_name: 'cheques_factoria' });
  console.log("Constraints:", cols);
}

check();
