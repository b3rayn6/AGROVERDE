import { createClient } from './node_modules/@supabase/supabase-js/dist/main/index.js';
import { readFileSync } from 'fs';

// Lee de .env
const envStr = readFileSync('.env', 'utf-8');
const env = {};
envStr.split('\n').forEach(line => {
  const match = line.match(/^([^=]+)=(.*)$/);
  if (match) env[match[1]] = match[2];
});

const supabaseUrl = env.VITE_SUPABASE_URL;
const supabaseKey = env.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
  const { data, error } = await supabase.rpc('get_table_constraints', { table_name: 'cheques_factoria' });
  console.log(data || error);
}

check();
