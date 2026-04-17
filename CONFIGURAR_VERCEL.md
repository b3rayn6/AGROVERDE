# 🚀 CONFIGURACIÓN DE VARIABLES DE ENTORNO EN VERCEL

## ⚠️ IMPORTANTE: Las variables de entorno NO se suben automáticamente

El archivo `.env` está en `.gitignore` y NO se sube al repositorio por seguridad.
Debes configurar las variables manualmente en Vercel.

---

## 📋 PASO A PASO

### 1. Accede a tu proyecto en Vercel
- Ve a: https://vercel.com/dashboard
- Selecciona tu proyecto AGROVERDE

### 2. Ve a Settings → Environment Variables
- Click en "Settings" en el menú superior
- Click en "Environment Variables" en el menú lateral

### 3. Agrega las siguientes variables:

#### Variable 1: VITE_SUPABASE_URL
```
Key: VITE_SUPABASE_URL
Value: https://njzpozedfitrwphrjmsb.supabase.co
```
✅ Marca: Production, Preview, Development

#### Variable 2: VITE_SUPABASE_ANON_KEY
```
Key: VITE_SUPABASE_ANON_KEY
Value: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5qenBvemVkZml0cndwaHJqbXNiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjI4Mjk4NDQsImV4cCI6MjA3ODQwNTg0NH0.YD4k2--flkeM-quWQOPrsXYonfiRGIcegwVZN1GrPVs
```
✅ Marca: Production, Preview, Development

#### Variable 3: VITE_GROQ_API_KEY
```
Key: VITE_GROQ_API_KEY
Value: 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
```
✅ Marca: Production, Preview, Development

### 4. Guarda los cambios
- Click en "Save" para cada variable

### 5. Redeploy el proyecto
- Ve a "Deployments"
- Click en los 3 puntos del último deployment
- Click en "Redeploy"
- O simplemente haz un nuevo push al repositorio

---

## ✅ VERIFICACIÓN

Después del deploy, verifica:
1. El sitio carga sin errores 500
2. Puedes hacer login
3. La conexión a Supabase funciona
4. El chatbot de IA funciona (si lo usas)

---

## 🔍 TROUBLESHOOTING

### Si sigue dando error 500:
1. Ve a Vercel Dashboard → Deployments → [tu deploy] → "View Function Logs"
2. Busca errores específicos
3. Verifica que las variables estén bien escritas (sin espacios extra)

### Si no puedes hacer login:
1. Abre la consola del navegador (F12)
2. Ve a la pestaña "Console"
3. Busca errores de Supabase
4. Verifica que las URLs y keys sean correctas

---

## 📝 NOTAS

- Las variables con prefijo `VITE_` son accesibles en el frontend
- Nunca compartas estas keys públicamente (excepto la ANON_KEY que es pública)
- Si cambias las variables, debes hacer redeploy
- Las variables se aplican a todos los environments que marques

---

## 🆘 AYUDA

Si necesitas ayuda:
1. Revisa los logs en Vercel
2. Verifica la consola del navegador
3. Asegúrate de que Supabase esté activo
