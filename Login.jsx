import { useState } from 'react';
import { LogIn, User, Lock } from 'lucide-react';
import { supabase } from '../lib/supabase';

export default function Login({ onLogin, onToggleMode }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      // Intentar login con usuarios_sistema primero
      const { data: usuarioSistema, error: errorSistema } = await supabase
        .from('usuarios_sistema')
        .select('*, roles(nombre)')
        .eq('email', email)
        .eq('password', password)
        .eq('activo', true)
        .single();

      if (usuarioSistema) {
        // Cargar permisos del usuario con JOIN explícito
        let permisos = [];
        try {
          const { data: permisosRaw, error: errorPermisos } = await supabase
            .from('permisos_usuario')
            .select('*, modulos(codigo, nombre)')
            .eq('usuario_id', usuarioSistema.id);

          console.log('🔍 DEBUG - Usuario ID:', usuarioSistema.id);
          console.log('🔍 DEBUG - Permisos raw desde DB:', permisosRaw);
          console.log('🔍 DEBUG - Error permisos:', errorPermisos);

          // Si hay error, usar array vacío en lugar de fallar
          if (errorPermisos) {
            console.warn('⚠️ Advertencia: Error al cargar permisos:', errorPermisos);
            permisos = [];
          } else {
            // Mapear permisos para asegurar estructura correcta
            permisos = permisosRaw?.map(p => ({
              ...p,
              modulos: p.modulos || { codigo: 'unknown', nombre: 'Unknown' }
            })) || [];
          }

          console.log('🔍 DEBUG - Permisos procesados:', permisos);
          console.log('🔍 DEBUG - ¿Tiene compensacion_pesadas?', 
            permisos.some(p => p.modulos?.codigo === 'compensacion_pesadas')
          );
        } catch (permisosError) {
          console.error('Error al cargar permisos:', permisosError);
          // Continuar con permisos vacíos en lugar de fallar
          permisos = [];
        }

        const userData = { ...usuarioSistema, permisos, tipo: 'sistema' };
        
        // Guardar sesión en localStorage
        try {
          localStorage.setItem('user_session', JSON.stringify(userData));
        } catch (storageError) {
          console.warn('No se pudo guardar la sesión en localStorage:', storageError);
        }

        onLogin(userData);
        setLoading(false);
        return;
      }

      // Si no es usuario del sistema, mostrar error
      setError('Credenciales incorrectas');
      setLoading(false);

    } catch (err) {
      console.error('Error en login:', err);
      setError(err.message || 'Error al iniciar sesión. Por favor, intenta nuevamente.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-gray-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl p-8 w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-green-600 rounded-full mb-4">
            <svg className="w-8 h-8 text-white" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 2L2 7v10c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V7l-10-5z"/>
            </svg>
          </div>
          <h1 className="text-3xl font-bold text-gray-800 mb-2">AGROVERDE</h1>
          <p className="text-gray-500">Sistema de Registro de Pesadas</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Correo Electrónico
            </label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                placeholder="tu@email.com"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Contraseña
            </label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                placeholder="••••••••"
                required
              />
            </div>
          </div>

          {error && (
            <div className="bg-red-50 text-red-600 px-4 py-3 rounded-lg text-sm">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-green-600 hover:bg-green-700 text-white font-medium py-3 rounded-lg transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
          >
            <LogIn className="w-5 h-5" />
            {loading ? 'Ingresando...' : 'Iniciar Sesión'}
          </button>
        </form>

        <div className="mt-6 text-center">
          <button
            onClick={onToggleMode}
            className="text-green-600 hover:text-green-700 text-sm font-medium"
          >
            ¿No tienes cuenta? Regístrate aquí
          </button>
        </div>
      </div>
    </div>
  );
}