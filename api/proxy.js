// Proxy para Supabase - Solución temporal para problemas de DNS regional
export default async function handler(req, res) {
  // Configurar CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, apikey, x-client-info');

  // Manejar preflight
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    const supabaseUrl = process.env.VITE_SUPABASE_URL;
    const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

    // Construir la URL de Supabase
    const path = req.url.replace('/api/proxy', '');
    const targetUrl = `${supabaseUrl}${path}`;

    // Reenviar la petición a Supabase
    const response = await fetch(targetUrl, {
      method: req.method,
      headers: {
        'Content-Type': 'application/json',
        'apikey': supabaseKey,
        'Authorization': req.headers.authorization || `Bearer ${supabaseKey}`,
      },
      body: req.method !== 'GET' && req.method !== 'HEAD' ? JSON.stringify(req.body) : undefined,
    });

    const data = await response.json();
    
    return res.status(response.status).json(data);
  } catch (error) {
    console.error('Proxy error:', error);
    return res.status(500).json({ 
      error: 'Proxy error', 
      message: error.message 
    });
  }
}
