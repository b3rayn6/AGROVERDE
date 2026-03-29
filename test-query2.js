import { supabase } from './src/lib/supabase.js';

async function check() {
  const { data: u1, error: e1 } = await supabase.from('usuarios_sistema').select('*').limit(1);
  console.log("usuarios_sistema:", u1);
}

check();
