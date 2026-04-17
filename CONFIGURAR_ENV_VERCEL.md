# Configurar Variables de Entorno en Vercel

## Problema
Al subir a Vercel, las variables del archivo `.env` no se incluyen automáticamente por seguridad.

## Error típico
```
ERR_NAME_NOT_RESOLVED
Failed to load resource: net::ERR_NAME_NOT_RESOLVED
```

## Solución

### Método 1: Dashboard de Vercel (Más fácil)

1. **Ir al proyecto en Vercel**
   - https://vercel.com/dashboard
   - Selecciona tu proyecto

2. **Configurar variables**
   - Ve a **Settings** → **Environment Variables**
   - Agrega cada variable:

   ```
   VITE_SUPABASE_URL
   VITE_SUPABASE_ANON_KEY
   VITE_GROQ_API_KEY
   ```

3. **Seleccionar entornos**
   - ✅ Production
   - ✅ Preview
   - ✅ Development

4. **Guardar y Redeploy**
   - Click en **Save**
   - Ve a **Deployments**
   - Click en **...** → **Redeploy**

### Método 2: CLI de Vercel

```bash
# Instalar Vercel CLI (si no la tienes)
npm i -g vercel

# Login
vercel login

# Agregar variables (te pedirá el valor de cada una)
vercel env add VITE_SUPABASE_URL production
vercel env add VITE_SUPABASE_ANON_KEY production
vercel env add VITE_GROQ_API_KEY production

# Redeploy
vercel --prod
```

### Método 3: Importar desde archivo

```bash
# Crear archivo temporal con las variables
cat > .env.production << EOF
VITE_SUPABASE_URL=https://njzpozedfitrwphrjmsb.supabase.co
VITE_SUPABASE_ANON_KEY=tu_key_aqui
VITE_GROQ_API_KEY=tu_key_aqui
EOF

# Importar a Vercel
vercel env pull .env.production
```

## Verificar que funcionó

Después del redeploy, verifica:

1. Ve a tu sitio en Vercel
2. Abre la consola del navegador (F12)
3. No deberías ver errores de `ERR_NAME_NOT_RESOLVED`
4. Las llamadas a Supabase deberían funcionar

## Notas importantes

- ⚠️ **NUNCA** subas el archivo `.env` a Git
- ✅ El archivo `.env.example` SÍ debe estar en Git (sin valores reales)
- 🔒 Las variables de entorno en Vercel están encriptadas
- 🔄 Cada vez que cambies una variable, debes hacer redeploy

## Troubleshooting

### Las variables no se aplican
- Asegúrate de haber hecho **Redeploy** después de agregar las variables
- Verifica que las variables estén en el entorno correcto (Production/Preview)

### Error de CORS
- Verifica que la URL de Supabase sea correcta
- Asegúrate de que el proyecto de Supabase esté activo (no pausado)

### Variables undefined en el código
- Verifica que las variables empiecen con `VITE_` (requerido por Vite)
- Reinicia el servidor de desarrollo local después de cambiar `.env`
