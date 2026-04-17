// Script para ejecutar en la consola del navegador (F12)
// Limpia localStorage, caché, service workers y recarga

(async function limpiarTodo() {
  console.log('🧹 INICIANDO LIMPIEZA COMPLETA...\n');
  
  // 1. Limpiar localStorage
  console.log('1️⃣ Limpiando localStorage...');
  const items = Object.keys(localStorage);
  console.log(`   - Items encontrados: ${items.length}`);
  items.forEach(key => console.log(`     • ${key}`));
  localStorage.clear();
  console.log('   ✅ localStorage limpiado\n');
  
  // 2. Limpiar sessionStorage
  console.log('2️⃣ Limpiando sessionStorage...');
  sessionStorage.clear();
  console.log('   ✅ sessionStorage limpiado\n');
  
  // 3. Desregistrar Service Workers
  if ('serviceWorker' in navigator) {
    console.log('3️⃣ Desregistrando Service Workers...');
    const registrations = await navigator.serviceWorker.getRegistrations();
    console.log(`   - Service Workers encontrados: ${registrations.length}`);
    
    for (const registration of registrations) {
      await registration.unregister();
      console.log(`   ✅ Service Worker desregistrado: ${registration.scope}`);
    }
    
    if (registrations.length === 0) {
      console.log('   ℹ️  No hay Service Workers registrados');
    }
    console.log('');
  }
  
  // 4. Limpiar Caché API
  if ('caches' in window) {
    console.log('4️⃣ Limpiando Caché API...');
    const cacheNames = await caches.keys();
    console.log(`   - Cachés encontrados: ${cacheNames.length}`);
    
    for (const cacheName of cacheNames) {
      await caches.delete(cacheName);
      console.log(`   ✅ Caché eliminado: ${cacheName}`);
    }
    
    if (cacheNames.length === 0) {
      console.log('   ℹ️  No hay cachés almacenados');
    }
    console.log('');
  }
  
  // 5. Resumen
  console.log('📊 RESUMEN DE LIMPIEZA:');
  console.log(`   • localStorage: ${items.length} items eliminados`);
  console.log(`   • sessionStorage: Limpiado`);
  console.log(`   • Service Workers: ${registrations?.length || 0} desregistrados`);
  console.log(`   • Cachés: ${cacheNames?.length || 0} eliminados`);
  console.log('');
  
  // 6. Instrucciones finales
  console.log('✅ LIMPIEZA COMPLETA\n');
  console.log('📝 PRÓXIMOS PASOS:');
  console.log('   1. Presiona Ctrl + Shift + R (Windows) o Cmd + Shift + R (Mac)');
  console.log('   2. O cierra y abre el navegador');
  console.log('   3. Verifica los logs en consola\n');
  
  // 7. Preguntar si recargar
  console.log('🔄 Recargando en 3 segundos...');
  console.log('   (Presiona Ctrl+C para cancelar)\n');
  
  setTimeout(() => {
    console.log('🔄 Recargando página...');
    location.reload(true); // Hard reload
  }, 3000);
  
})().catch(error => {
  console.error('❌ Error durante la limpieza:', error);
  console.log('\n💡 Intenta limpiar manualmente:');
  console.log('   1. localStorage.clear()');
  console.log('   2. Ctrl + Shift + Delete → Limpiar caché');
  console.log('   3. Ctrl + Shift + R → Hard refresh');
});
