import { supabase } from './src/lib/supabase.js';

async function check() {
  const dummy = {
    numero_cheque: 'TEST-AUTH',
    monto: 1.0,
    fecha: '2026-03-12',
    factoria: 'Test',
    user_id: '69aa11be-78ac-4dfe-b585-ff3695269fa7'
  };
  const { data: d3, error: e3 } = await supabase.from('cheques_factoria').insert([dummy]).select();
  console.log("Insert with public users id:", d3, e3);
}

check();
