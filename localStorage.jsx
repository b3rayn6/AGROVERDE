// Sistema de almacenamiento local con sincronización automática
import { supabase } from './supabase';

const STORAGE_KEYS = {
  PESADAS: 'agroverde_pesadas',
  PRODUCTORES: 'agroverde_productores',
  LAST_SYNC: 'agroverde_last_sync',
  PENDING_SYNC: 'agroverde_pending_sync'
};

// Guardar datos localmente
export const saveLocal = (key, data) => {
  if (typeof window === 'undefined') return false;
  try {
    localStorage.setItem(key, JSON.stringify(data));
    return true;
  } catch (error) {
    console.error('Error guardando localmente:', error);
    return false;
  }
};

// Obtener datos locales
export const getLocal = (key) => {
  if (typeof window === 'undefined') return null;
  try {
    const data = localStorage.getItem(key);
    return data ? JSON.parse(data) : null;
  } catch (error) {
    console.error('Error obteniendo datos locales:', error);
    return null;
  }
};

// Guardar pesada localmente y marcar para sincronización
export const savePesadaLocal = async (pesada) => {
  const pesadas = getLocal(STORAGE_KEYS.PESADAS) || [];
  const newPesada = {
    ...pesada,
    id: pesada.id || Date.now(),
    synced: false,
    created_at: pesada.created_at || new Date().toISOString()
  };
  
  pesadas.push(newPesada);
  saveLocal(STORAGE_KEYS.PESADAS, pesadas);
  
  // Intentar sincronizar con Supabase si hay conexión
  await syncToSupabase();
  
  return newPesada;
};

// Obtener todas las pesadas (locales + sincronizadas)
export const getPesadasLocal = () => {
  return getLocal(STORAGE_KEYS.PESADAS) || [];
};

// Actualizar pesada localmente
export const updatePesadaLocal = async (id, updates) => {
  const pesadas = getLocal(STORAGE_KEYS.PESADAS) || [];
  const index = pesadas.findIndex(p => p.id === id);
  
  if (index !== -1) {
    pesadas[index] = { ...pesadas[index], ...updates, synced: false };
    saveLocal(STORAGE_KEYS.PESADAS, pesadas);
    await syncToSupabase();
    return pesadas[index];
  }
  return null;
};

// Eliminar pesada localmente
export const deletePesadaLocal = async (id) => {
  const pesadas = getLocal(STORAGE_KEYS.PESADAS) || [];
  const filtered = pesadas.filter(p => p.id !== id);
  saveLocal(STORAGE_KEYS.PESADAS, filtered);
  
  // Si la pesada estaba sincronizada, eliminarla de Supabase
  await syncToSupabase();
  
  return true;
};

// Sincronizar datos locales con Supabase
export const syncToSupabase = async () => {
  if (typeof window === 'undefined') return false;
  try {
    // Verificar si hay conexión a internet
    if (!navigator.onLine) {
      console.log('Sin conexión - trabajando offline');
      return false;
    }

    const pesadas = getLocal(STORAGE_KEYS.PESADAS) || [];
    const pendingSync = pesadas.filter(p => !p.synced);

    if (pendingSync.length === 0) {
      return true;
    }

    // Sincronizar pesadas pendientes
    for (const pesada of pendingSync) {
      const { synced, ...pesadaData } = pesada;
      
      const { data, error } = await supabase
        .from('pesadas')
        .upsert(pesadaData);

      if (!error) {
        // Marcar como sincronizada localmente
        const updatedPesadas = pesadas.map(p => 
          p.id === pesada.id ? { ...p, synced: true } : p
        );
        saveLocal(STORAGE_KEYS.PESADAS, updatedPesadas);
      }
    }

    saveLocal(STORAGE_KEYS.LAST_SYNC, new Date().toISOString());
    console.log('Sincronización completada');
    return true;

  } catch (error) {
    console.error('Error en sincronización:', error);
    return false;
  }
};

// Sincronizar desde Supabase a local
export const syncFromSupabase = async () => {
  if (typeof window === 'undefined') return false;
  try {
    if (!navigator.onLine) {
      return false;
    }

    const { data: pesadas, error } = await supabase
      .from('pesadas')
      .select('*')
      .order('created_at', { ascending: false });

    if (!error && pesadas) {
      const localPesadas = getLocal(STORAGE_KEYS.PESADAS) || [];
      const unsynced = localPesadas.filter(p => !p.synced);
      
      // Combinar datos de Supabase con pendientes locales
      const allPesadas = [
        ...pesadas.map(p => ({ ...p, synced: true })),
        ...unsynced
      ];
      
      saveLocal(STORAGE_KEYS.PESADAS, allPesadas);
      return true;
    }
    
    return false;
  } catch (error) {
    console.error('Error sincronizando desde Supabase:', error);
    return false;
  }
};

// Verificar estado de conexión
export const checkConnection = () => {
  if (typeof window === 'undefined') return false;
  return navigator.onLine;
};

// Obtener última sincronización
export const getLastSync = () => {
  return getLocal(STORAGE_KEYS.LAST_SYNC);
};