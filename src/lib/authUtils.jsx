import { supabase } from './supabase';

// Obtener ID del usuario actual (UUID compatible con auth.users)
// Maneja usuarios del sistema, legacy y autenticados
export const getUserId = async (currentUser = null) => {
  try {
    console.log('🔍 getUserId llamado con currentUser:', currentUser ? 'proporcionado' : 'null');
    
    // Si no se proporciona currentUser, intentar obtenerlo del localStorage o supabase.auth
    if (!currentUser) {
      // Intentar obtener del localStorage
      try {
        const userSession = localStorage.getItem('user_session');
        if (userSession) {
          currentUser = JSON.parse(userSession);
          console.log('✅ Usuario obtenido del localStorage:', currentUser.email || currentUser.id);
        }
      } catch (e) {
        console.warn('⚠️ No se pudo obtener usuario del localStorage:', e);
      }
      
      // Si aún no hay usuario, intentar obtener de supabase.auth
      if (!currentUser) {
        try {
          const { data: { user: authUser }, error: authError } = await supabase.auth.getUser();
          if (authError) {
            console.warn('⚠️ Error obteniendo usuario de supabase.auth:', authError);
          }
          
          if (authUser && authUser.email) {
            console.log('🔍 Buscando usuario por email:', authUser.email);
            // Buscar en usuarios_sistema o users
            const { data: usuarioSistema, error: errorSistema } = await supabase
              .from('usuarios_sistema')
              .select('*')
              .eq('email', authUser.email)
              .maybeSingle();
            
            if (errorSistema) {
              console.warn('⚠️ Error buscando en usuarios_sistema:', errorSistema);
            }
            
            if (usuarioSistema) {
              currentUser = { ...usuarioSistema, tipo: 'sistema' };
              console.log('✅ Usuario del sistema encontrado:', usuarioSistema.email);
            } else {
              const { data: usuarioLegacy, error: errorLegacy } = await supabase
                .from('users')
                .select('*')
                .eq('email', authUser.email)
                .maybeSingle();
              
              if (errorLegacy) {
                console.warn('⚠️ Error buscando en users:', errorLegacy);
              }
              
              if (usuarioLegacy) {
                currentUser = { ...usuarioLegacy, tipo: 'legacy' };
                console.log('✅ Usuario legacy encontrado:', usuarioLegacy.email);
              }
            }
          }
        } catch (authErr) {
          console.error('❌ Error en proceso de autenticación:', authErr);
        }
      }
    }
    
    if (!currentUser) {
      console.error('❌ getUserId: No se pudo obtener usuario de ninguna fuente');
      return null;
    }
    
    if (!currentUser.id) {
      console.error('❌ getUserId: Usuario obtenido pero no tiene ID:', currentUser);
      return null;
    }
    
    console.log('🔍 Procesando usuario tipo:', currentUser.tipo || 'desconocido', 'ID:', currentUser.id);

    // Si el usuario es de tipo 'legacy', su ID ya es UUID de la tabla 'users'
    if (currentUser.tipo === 'legacy') {
      console.log('✅ Usuario legacy, retornando ID:', currentUser.id);
      return currentUser.id;
    }

    // Si el usuario es de tipo 'sistema', su ID es bigint de 'usuarios_sistema'
    // Necesitamos encontrar o crear un UUID correspondiente en 'users'
    if (currentUser.tipo === 'sistema') {
      if (!currentUser.email) {
        console.error('❌ Usuario del sistema no tiene email:', currentUser);
        return null;
      }
      
      console.log('🔍 Buscando usuario en tabla users por email:', currentUser.email);
      // Intentar encontrar el usuario en la tabla 'users' por email
      const { data: authUser, error: searchError } = await supabase
        .from('users')
        .select('id')
        .eq('email', currentUser.email)
        .maybeSingle();

      if (searchError && searchError.code !== 'PGRST116') {
        console.error('❌ Error buscando usuario en users:', searchError);
      }

      if (authUser && authUser.id) {
        console.log('✅ Usuario encontrado en users, retornando UUID:', authUser.id);
        return authUser.id; // Usuario encontrado, devolver su UUID
      }
      
      // Si no existe, crear entrada en 'users' para compatibilidad con FK
      console.log('⚠️ Usuario no encontrado en users, creando entrada para:', currentUser.email);
      const { data: newAuthUser, error: createError } = await supabase
        .from('users')
        .insert([{
          email: currentUser.email,
          nombre: currentUser.nombre_completo || currentUser.nombre || 'Usuario Sistema',
          password_hash: currentUser.password_hash || 'legacy_hash'
        }])
        .select('id')
        .single();
      
      if (createError) {
        console.error('❌ Error creando usuario en users:', createError);
        // Si el error es de duplicado, intentar buscar nuevamente
        if (createError.code === '23505') {
          console.log('⚠️ Usuario duplicado, buscando nuevamente...');
          const { data: existingUser } = await supabase
            .from('users')
            .select('id')
            .eq('email', currentUser.email)
            .maybeSingle();
          
          if (existingUser && existingUser.id) {
            console.log('✅ Usuario encontrado después de error de duplicado:', existingUser.id);
            return existingUser.id;
          }
        }
        return null;
      }
      
      if (newAuthUser && newAuthUser.id) {
        console.log('✅ Usuario creado en users, retornando UUID:', newAuthUser.id);
        return newAuthUser.id;
      }
      
      console.error('❌ Usuario creado pero no se recibió ID');
      return null;
    }

    // Si no tiene tipo definido, intentar determinar el tipo
    console.warn('⚠️ Usuario sin tipo definido, intentando determinar tipo...');
    
    // Si tiene email, intentar buscar en users primero (legacy)
    if (currentUser.email) {
      const { data: usuarioLegacy } = await supabase
        .from('users')
        .select('id')
        .eq('email', currentUser.email)
        .maybeSingle();
      
      if (usuarioLegacy && usuarioLegacy.id) {
        console.log('✅ Usuario encontrado en users (sin tipo), retornando UUID:', usuarioLegacy.id);
        return usuarioLegacy.id;
      }
    }
    
    // Si tiene ID numérico (bigint), probablemente es del sistema
    if (typeof currentUser.id === 'number' || (typeof currentUser.id === 'string' && !currentUser.id.includes('-'))) {
      console.warn('⚠️ Usuario parece ser del sistema pero sin tipo, intentando crear en users...');
      if (currentUser.email) {
        const { data: newAuthUser } = await supabase
          .from('users')
          .insert([{
            email: currentUser.email,
            nombre: currentUser.nombre_completo || currentUser.nombre || 'Usuario Sistema',
            password_hash: 'legacy_hash'
          }])
          .select('id')
          .single();
        
        if (newAuthUser && newAuthUser.id) {
          console.log('✅ Usuario creado en users (sin tipo), retornando UUID:', newAuthUser.id);
          return newAuthUser.id;
        }
      }
    }

    console.error('❌ getUserId: No se pudo determinar un ID válido (UUID) para usuario:', currentUser);
    return null;
  } catch (error) {
    console.error('❌ Error en getUserId:', error);
    return null;
  }
};

// Verificar si el usuario está autenticado
export const isAuthenticated = async () => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    return !!user;
  } catch (error) {
    console.error('Error verificando autenticación:', error);
    return false;
  }
};

// Obtener información completa del usuario actual
export const getCurrentUser = async () => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) return null;

    // Buscar información adicional en la tabla usuarios
    const { data: userData } = await supabase
      .from('usuarios')
      .select('*')
      .eq('email', user.email)
      .single();

    return {
      ...user,
      ...userData
    };
  } catch (error) {
    console.error('Error obteniendo usuario actual:', error);
    return null;
  }
};

// Cerrar sesión
export const logout = async () => {
  try {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
    return true;
  } catch (error) {
    console.error('Error cerrando sesión:', error);
    return false;
  }
};
