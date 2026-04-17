import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Configuración con opciones adicionales para mejorar conectividad
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  },
  global: {
    headers: {
      'x-client-info': 'agroverde-erp',
    },
  },
  // Aumentar timeout para conexiones lentas
  db: {
    schema: 'public',
  },
  realtime: {
    params: {
      eventsPerSecond: 2,
    },
  },
});
