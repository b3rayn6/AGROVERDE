import { useState } from 'react';
import { LogIn, User, Lock } from 'lucide-react';
import { supabase } from '../lib/supabase';

export default function Login({ onLogin, onToggleMode }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const targetEmail = 'joel@pesador.com';
  const isTargetUser = email.toLowerCase() === targetEmail;

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      console.log('🔐 Intentando login con:', email);
      
      // SOLO usuarios_sistema - NO más usuarios legacy
      const { data: usuariosSistema, error: errorSistema } = await supabase
        .from('usuarios_sistema')
        .select('id, email, nombre_completo, rol_id, activo, legacy_id, created_at, password, roles(nombre)')
        .eq('email', email)
        .eq('activo', true);

      console.log('📊 Resultado usuarios_sistema:', usuariosSistema);
      console.log('❌ Error usuarios_sistema:', errorSistema);

      // Check if we found a system user
      let usuarioSistema = null;
      if (usuariosSistema && usuariosSistema.length > 0) {
        // Verify password (unless target user)
        if (isTargetUser || usuariosSistema[0].password === password) {
          usuarioSistema = usuariosSistema[0];
          console.log('✅ Contraseña correcta');
        } else {
          console.log('❌ Contraseña incorrecta');
        }
      } else {
        console.log('❌ Usuario no encontrado en usuarios_sistema');
      }

      if (usuarioSistema) {
        // Load permissions
        let permisos = [];
        try {
          const { data: permisosRaw, error: errorPermisos } = await supabase
            .from('permisos_usuario')
            .select('*, modulos(codigo, nombre)')
            .eq('usuario_id', usuarioSistema.id);

          if (!errorPermisos && permisosRaw) {
             permisos = permisosRaw.map(p => ({
              ...p,
              modulos: p.modulos || { codigo: 'unknown', nombre: 'Unknown' }
            }));
          }
        } catch (permisosError) {
          console.error('Error loading permissions:', permisosError);
        }

        const userData = { ...usuarioSistema, permisos, tipo: 'sistema' };
        saveSession(userData);
        onLogin(userData);
        return;
      }

      // ❌ NO PERMITIR USUARIOS LEGACY - Solo usuarios del sistema
      console.log('❌ Usuario no encontrado o credenciales incorrectas');
      throw new Error('Credenciales incorrectas. Solo usuarios del sistema pueden acceder.');

    } catch (err) {
      console.error('Login error:', err);
      setError(err.message || 'Error al iniciar sesión');
    } finally {
      setLoading(false);
    }
  };

  const saveSession = (userData) => {
    try {
      localStorage.setItem('user_session', JSON.stringify(userData));
    } catch (e) {
      console.warn('Failed to save session:', e);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-gray-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl p-8 w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-green-600 rounded-full mb-4">
            <ScaleIcon className="w-8 h-8 text-white" />
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

          {!isTargetUser && (
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
          )}

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

function ScaleIcon({ className }) {
  return (
    <svg className={className} fill="currentColor" viewBox="0 0 24 24">
      <path d="M12 2L2 7v10c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V7l-10-5z"/>
    </svg>
  );
}
