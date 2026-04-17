// NUEVO DISEÑO LOGIN - Version 2024-04-14-v3
import { useState, useEffect } from 'react';
import { LogIn, User, Lock, Eye, EyeOff, Sprout, Shield, CheckCircle } from 'lucide-react';
import { supabase } from '../lib/supabase';

export default function Login({ onLogin, onToggleMode }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Limpiar sesión al cargar el componente si hay error de conexión
  useEffect(() => {
    const checkConnection = async () => {
      try {
        // Intentar una consulta simple para verificar conexión
        const { error } = await supabase
          .from('users')
          .select('count', { count: 'exact', head: true });
        
        if (error && error.message.includes('Failed to fetch')) {
          console.warn('⚠️ No se puede conectar a Supabase');
          setError('No se puede conectar al servidor. Verifica tu conexión.');
        }
      } catch (err) {
        console.error('❌ Error de conexión:', err);
      }
    };
    
    checkConnection();
  }, []);

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
        .eq('activo', true)
        .maybeSingle();

      // Verificar si existe el usuario y si la contraseña coincide
      if (usuarioSistema && usuarioSistema.password === password) {
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
    <div className="min-h-screen flex">
      {/* Panel izquierdo - Información y branding */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-green-600 via-emerald-600 to-teal-700 p-12 flex-col justify-between relative overflow-hidden">
        {/* Patrón de fondo decorativo */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-0 left-0 w-96 h-96 bg-white rounded-full -translate-x-1/2 -translate-y-1/2"></div>
          <div className="absolute bottom-0 right-0 w-96 h-96 bg-white rounded-full translate-x-1/2 translate-y-1/2"></div>
          <div className="absolute top-1/2 left-1/2 w-64 h-64 bg-white rounded-full -translate-x-1/2 -translate-y-1/2"></div>
        </div>

        {/* Contenido del panel izquierdo */}
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-8">
            <div className="w-14 h-14 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center">
              <Sprout className="w-8 h-8 text-white" strokeWidth={2.5} />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-white">AGROVERDE</h1>
              <p className="text-green-100 text-sm">Sistema Integral de Gestión</p>
            </div>
          </div>

          <div className="space-y-6 mt-16">
            <h2 className="text-4xl font-bold text-white leading-tight">
              Gestiona tu negocio<br />agrícola de forma<br />inteligente
            </h2>
            <p className="text-green-50 text-lg leading-relaxed">
              Controla pesadas, facturas, inventario y finanzas desde una sola plataforma moderna y segura.
            </p>
          </div>
        </div>

        {/* Features */}
        <div className="relative z-10 space-y-4">
          <div className="flex items-center gap-3 text-white">
            <div className="w-10 h-10 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center flex-shrink-0">
              <CheckCircle className="w-5 h-5" />
            </div>
            <div>
              <p className="font-semibold">Control Total</p>
              <p className="text-sm text-green-100">Gestión completa de operaciones</p>
            </div>
          </div>
          <div className="flex items-center gap-3 text-white">
            <div className="w-10 h-10 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center flex-shrink-0">
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <p className="font-semibold">Seguridad Garantizada</p>
              <p className="text-sm text-green-100">Tus datos protegidos 24/7</p>
            </div>
          </div>
          <div className="flex items-center gap-3 text-white">
            <div className="w-10 h-10 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center flex-shrink-0">
              <Sprout className="w-5 h-5" />
            </div>
            <div>
              <p className="font-semibold">Fácil de Usar</p>
              <p className="text-sm text-green-100">Interfaz intuitiva y moderna</p>
            </div>
          </div>
        </div>
      </div>

      {/* Panel derecho - Formulario de login */}
      <div className="flex-1 flex items-center justify-center p-8 bg-gray-50">
        <div className="w-full max-w-md">
          {/* Logo móvil */}
          <div className="lg:hidden text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-green-600 to-emerald-600 rounded-2xl mb-4">
              <Sprout className="w-8 h-8 text-white" strokeWidth={2.5} />
            </div>
            <h1 className="text-2xl font-bold text-gray-800">AGROVERDE</h1>
            <p className="text-gray-600 text-sm">Sistema Integral de Gestión</p>
          </div>

          {/* Card del formulario */}
          <div className="bg-white rounded-2xl shadow-xl p-8 border border-gray-100">
            <div className="mb-8">
              <h2 className="text-3xl font-bold text-gray-800 mb-2">Bienvenido</h2>
              <p className="text-gray-600">Ingresa tus credenciales para continuar</p>
            </div>

            <form onSubmit={handleLogin} className="space-y-6">
              {/* Campo Email */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Correo Electrónico
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <User className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="block w-full pl-12 pr-4 py-3.5 text-gray-900 border border-gray-300 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all outline-none bg-gray-50 hover:bg-white"
                    placeholder="correo@ejemplo.com"
                    required
                  />
                </div>
              </div>

              {/* Campo Contraseña */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Contraseña
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <Lock className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="block w-full pl-12 pr-12 py-3.5 text-gray-900 border border-gray-300 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all outline-none bg-gray-50 hover:bg-white"
                    placeholder="••••••••"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-4 flex items-center text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    {showPassword ? (
                      <EyeOff className="h-5 w-5" />
                    ) : (
                      <Eye className="h-5 w-5" />
                    )}
                  </button>
                </div>
              </div>

              {/* Recordarme y Olvidé contraseña */}
              <div className="flex items-center justify-between">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    className="w-4 h-4 text-green-600 border-gray-300 rounded focus:ring-green-500"
                  />
                  <span className="ml-2 text-sm text-gray-600">Recordarme</span>
                </label>
                <button
                  type="button"
                  className="text-sm font-semibold text-green-600 hover:text-green-700 transition-colors"
                >
                  ¿Olvidaste tu contraseña?
                </button>
              </div>

              {/* Mensaje de error */}
              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm flex items-start gap-3">
                  <svg className="w-5 h-5 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                  <span>{error}</span>
                </div>
              )}

              {/* Botón de login */}
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white font-semibold py-4 rounded-xl transition-all duration-200 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-green-500/30 hover:shadow-xl hover:shadow-green-500/40 hover:-translate-y-0.5"
              >
                {loading ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                    <span>Ingresando...</span>
                  </>
                ) : (
                  <>
                    <LogIn className="w-5 h-5" />
                    <span>Iniciar Sesión</span>
                  </>
                )}
              </button>
            </form>

            {/* Divisor */}
            <div className="relative my-8">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-200"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-4 bg-white text-gray-500 font-medium">¿Nuevo en AgroVerde?</span>
              </div>
            </div>

            {/* Link de registro */}
            <button
              onClick={onToggleMode}
              className="w-full border-2 border-gray-300 hover:border-green-600 text-gray-700 hover:text-green-600 font-semibold py-3.5 rounded-xl transition-all duration-200 hover:bg-green-50"
            >
              Crear una cuenta
            </button>
          </div>

          {/* Footer */}
          <p className="text-center text-sm text-gray-500 mt-8">
            © 2024 AgroVerde. Todos los derechos reservados.
          </p>
          
          {/* Botón de limpiar sesión (solo visible si hay error) */}
          {error && (
            <div className="text-center mt-4">
              <button
                onClick={() => {
                  localStorage.clear();
                  setError('');
                  alert('Sesión limpiada. Recarga la página.');
                  window.location.reload();
                }}
                className="text-xs text-gray-500 hover:text-gray-700 underline"
              >
                🧹 Limpiar datos guardados y reintentar
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}