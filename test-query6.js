import { supabase } from './src/lib/supabase.js';

async function check() {
  const { data, error } = await supabase.auth.signInWithPassword({
    email: 'admin@admin.com',
    password: 'admin123'
  });
  console.log("Auth:", data.user ? data.user.id : null, error);
}

check();
