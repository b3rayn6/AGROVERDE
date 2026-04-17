#!/bin/bash
# Script para configurar variables de entorno en Vercel

echo "Configurando variables de entorno en Vercel..."

vercel env add VITE_SUPABASE_URL production
vercel env add VITE_SUPABASE_ANON_KEY production
vercel env add VITE_GROQ_API_KEY production

echo "✅ Variables configuradas. Ahora ejecuta: vercel --prod"
