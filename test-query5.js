import { supabase } from './src/lib/supabase.js';
async function check() {
  const { data: cols, error: e1 } = await supabase.rpc('query_constraints', {});
  console.log("Cols:", cols, e1);
}
check();
