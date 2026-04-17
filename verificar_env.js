// Script para verificar la configuración de variables de entorno
// Ejecutar con: node verificar_env.js

import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

console.log('🔍 Verificando configuración de Supabase...\n');

try {
  // Leer archivo .env
  const envPath = join(__dirname, '.env');
  const envContent = readFileSync(envPath, 'utf-8');
  
  // Parsear variables
  const lines = envContent.split('\n');
  const vars = {};
  
  lines.forEach(line => {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith('#')) {
      const [key, ...valueParts] = trimmed.split('=');
      const value = valueParts.join('=');
      vars[key] = value;
    }
  });

  // Verificar VITE_SUPABASE_URL
  console.log('📍 VITE_SUPABASE_URL:');
  if (vars.VITE_SUPABASE_URL) {
    console.log(`   ✅ Configurada: ${vars.VITE_SUPABASE_URL}`);
    
    // Verificar formato
    try {
      const url = new URL(vars.VITE_SUPABASE_URL);
      console.log(`   ✅ Formato válido`);
      console.log(`   📌 Dominio: ${url.hostname}`);
      
      // Verificar que sea una URL de Supabase
      if (url.hostname.includes('supabase.co')) {
        console.log(`   ✅ Es una URL de Supabase`);
      } else {
        console.log(`   ⚠️  No parece ser una URL de Supabase`);
      }
    } catch (e) {
      console.log(`   ❌ Formato inválido: ${e.message}`);
    }
  } else {
    console.log('   ❌ NO configurada');
  }

  console.log('\n🔑 VITE_SUPABASE_ANON_KEY:');
  if (vars.VITE_SUPABASE_ANON_KEY) {
    const key = vars.VITE_SUPABASE_ANON_KEY;
    console.log(`   ✅ Configurada (${key.length} caracteres)`);
    console.log(`   📌 Primeros 20 chars: ${key.substring(0, 20)}...`);
    
    // Verificar que sea un JWT
    if (key.startsWith('eyJ')) {
      console.log(`   ✅ Parece ser un JWT válido`);
    } else {
      console.log(`   ⚠️  No parece ser un JWT (debería empezar con 'eyJ')`);
    }
  } else {
    console.log('   ❌ NO configurada');
  }

  console.log('\n🤖 VITE_GROQ_API_KEY:');
  if (vars.VITE_GROQ_API_KEY) {
    const key = vars.VITE_GROQ_API_KEY;
    console.log(`   ✅ Configurada (${key.length} caracteres)`);
    console.log(`   📌 Primeros 10 chars: ${key.substring(0, 10)}...`);
    
    if (key.startsWith('gsk_')) {
      console.log(`   ✅ Formato correcto (empieza con 'gsk_')`);
    } else {
      console.log(`   ⚠️  No empieza con 'gsk_'`);
    }
  } else {
    console.log('   ⚠️  NO configurada (opcional para IA)');
  }

  // Resumen
  console.log('\n' + '='.repeat(50));
  console.log('📊 RESUMEN:');
  console.log('='.repeat(50));
  
  const urlOk = vars.VITE_SUPABASE_URL && vars.VITE_SUPABASE_URL.includes('supabase.co');
  const keyOk = vars.VITE_SUPABASE_ANON_KEY && vars.VITE_SUPABASE_ANON_KEY.startsWith('eyJ');
  
  if (urlOk && keyOk) {
    console.log('✅ Configuración completa y válida');
    console.log('\n💡 Próximos pasos:');
    console.log('   1. Reinicia el servidor: npm run dev');
    console.log('   2. Verifica que el proyecto de Supabase esté activo');
    console.log('   3. Ejecuta el script SQL: inicializar_sistema_usuarios.sql');
  } else {
    console.log('❌ Configuración incompleta o inválida');
    console.log('\n💡 Acciones requeridas:');
    if (!urlOk) {
      console.log('   - Configura VITE_SUPABASE_URL en el archivo .env');
    }
    if (!keyOk) {
      console.log('   - Configura VITE_SUPABASE_ANON_KEY en el archivo .env');
    }
    console.log('\n📖 Lee el archivo ERROR_CONEXION_SUPABASE.md para más detalles');
  }

} catch (error) {
  console.error('❌ Error al leer el archivo .env:', error.message);
  console.log('\n💡 Asegúrate de que existe el archivo .env en la raíz del proyecto');
  console.log('   Puedes copiar .env.example a .env y configurar las variables');
}

console.log('\n' + '='.repeat(50));
