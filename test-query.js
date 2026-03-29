import { supabase } from './src/lib/supabase.js';

async function check() {
  const { data: cols, error: e1 } = await supabase.from('cheques_factoria').select('*').limit(1);
  console.log("Cols:", cols, e1);

  // Try to insert a dummy row to trigger the error again, but this time see what it returns.
  // Actually, we already know the error. The error is that user_id=69aa11be-78ac-4dfe-b585-ff3695269fa7 is not in users.
  // Wait, let's query the `auth.users` via RPC if we have one. But we can't.
  
  // Let's test checking `users` table for 69aa11be-78ac-4dfe-b585-ff3695269fa7
  const { data: u1, error: e2 } = await supabase.from('users').select('*').eq('id', '69aa11be-78ac-4dfe-b585-ff3695269fa7');
  console.log("User in public.users:", u1);
  
  // What happens if we try to insert with 0b5603e8-115f-402c-9f30-c0a6a68a8b79? (the ID from the console log for auth user)
  const dummy = {
    numero_cheque: 'TEST-123',
    monto: 1.0,
    fecha: '2026-03-12',
    factoria: 'Test',
    user_id: '0b5603e8-115f-402c-9f30-c0a6a68a8b79'
  };
  const { data: d3, error: e3 } = await supabase.from('cheques_factoria').insert([dummy]).select();
  console.log("Insert with auth user id:", d3, e3);
}

check();
