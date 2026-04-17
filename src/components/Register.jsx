import { useState, useEffect } from 'react';
import { UserPlus, User, Lock, Mail, Briefcase } from 'lucide-react';
import { supabase } from '../lib/supabase';

export default function Register({ onRegister, onToggleMode }) {
  const [formData, setFormData] = useState({
    nombre_completo: '',
    email: '',
    password: '',
    confirmPassword: '',
    rol_id: ''
  });
  const [roles, setRoles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Cargar roles disponibles
  useEffect(() => {
    const cargarRoles = async () => {
      const { data, error } = await supabase
        .from('roles')
        .select('id, nombre, descripcion')
        .order('nombre');
      
      if (!error && data) {
        setRoles(data);
        // Seleccionar rol "Usuario" por defecto si existe
        const rolUsuario = data.find(r => r.nombre === 'Usuario' || r.nombre === 'Visualizador');
        if (rolUsuario) {
          setFormData(prev => ({ ...prev, rol_id: rolUsuario.id }));
        }
      }
    };
    
    cargarRoles();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    // Validaciones
    if (formData.password !== formData.confirmPassword) {
      setError('Las contraseñas no coinciden');
      setLoading(false);
      return;
    }

    if (formData.password.length < 8) {
      setError('La contraseña debe tener al menos 8 caracteres');
      setLoading(false);
      return;
    }

    if (!formData.rol_id) {
      setError('Debes seleccionar un rol');
      setLoading(false);
      return;
    }

    try {
      console.log('🔐 Registrando nuevo usuario:', formData.email);
      
      // Verificar si el email ya existe
      const { data: existente, error: errorCheck } = await supabase
        .from('usuarios_sistema')
        .select('id, email')
        .eq('email', formData.email)
        .maybeSingle();
      
      if (existente) {
        setError('El correo electrónico ya está registrado');
        setLoading(false);
        return;
      }

      // Crear usuario en usuarios_sistema
      const { data: nuevoUsuario, error: insertError } = await supabase
        .from('usuarios_sistema')
        .insert([{
          nombre_completo: formData.nombre_completo,
          email: formData.email,
          password: formData.password, // ⚠️ En producción usar hash
          rol_id: formData.rol_id,
          activo: true
        }])
        .select('id, email, nombre_completo, rol_id, activo, roles(nombre)')
        .single();

      if (insertError) {
        console.error('❌ Error al crear usuario:', insertError);
        setError(insertError.message || 'Error al crear la cuenta');
        setLoading(false);
        return;
      }

      console.log('✅ Usuario creado exitosamente:', nuevoUsuario.email);

      // Asignar permisos básicos (solo lectura) a módulos comunes
      const modulosBasicos = ['pesadas', 'facturas_factoria', 'clientes', 'suplidores', 'inventario'];
      
      const { data: modulos } = await supabase
        .from('modulos')
        .select('id, codigo')
        .in('codigo', modulosBasicos);

      if (modulos && modulos.length > 0) {
        const permisos = modulos.map(m => ({
          usuario_id: nuevoUsuario.id,
          modulo_id: m.id,
          puede_ver: true,
          puede_crear: false,
          puede_editar: false,
          puede_eliminar: false
        }));

        const { error: errorPermisos } = await supabase
          .from('permisos_usuario')
          .insert(permisos);

        if (errorPermisos) {
          console.warn('⚠️ Error asignando permisos básicos:', errorPermisos);
        } else {
          console.log('✅ Permisos básicos asignados');
        }
      }

      // Cargar permisos para el usuario
      const { data: permisosUsuario } = await supabase
        .from('permisos_usuario')
        .select('*, modulos(codigo, nombre)')
        .eq('usuario_id', nuevoUsuario.id);

      const permisos = permisosUsuario?.map(p => ({
        ...p,
        modulos: p.modulos || { codigo: 'unknown', nombre: 'Unknown' }
      })) || [];

      const userData = { ...nuevoUsuario, permisos, tipo: 'sistema' };
      console.log('✅ Registro completado - Iniciando sesión...');
      
      onRegister(userData);
    } catch (err) {
      console.error('❌ Error en registro:', err);
      setError('Error al crear la cuenta. Intenta nuevamente.');
    }

    setLoading(false);
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
          <p className="text-gray-500">Crear Nueva Cuenta</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Nombre Completo
            </label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                value={formData.nombre_completo}
                onChange={(e) => setFormData({...formData, nombre_completo: e.target.value})}
                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                placeholder="Juan Pérez"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Correo Electrónico
            </label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({...formData, email: e.target.value})}
                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                placeholder="tu@email.com"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Rol
            </label>
            <div className="relative">
              <Briefcase className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
              <select
                value={formData.rol_id}
                onChange={(e) => setFormData({...formData, rol_id: e.target.value})}
                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent appearance-none bg-white"
                required
              >
                <option value="">Selecciona un rol</option>
                {roles.map(rol => (
                  <option key={rol.id} value={rol.id}>
                    {rol.nombre} {rol.descripcion ? `- ${rol.descripcion}` : ''}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Contraseña (mínimo 8 caracteres)
            </label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="password"
                value={formData.password}
                onChange={(e) => setFormData({...formData, password: e.target.value})}
                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                placeholder="••••••••"
                required
                minLength={8}
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Confirmar Contraseña
            </label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="password"
                value={formData.confirmPassword}
                onChange={(e) => setFormData({...formData, confirmPassword: e.target.value})}
                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                placeholder="••••••••"
                required
                minLength={8}
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
            <UserPlus className="w-5 h-5" />
            {loading ? 'Registrando...' : 'Crear Cuenta'}
          </button>
        </form>

        <div className="mt-6 text-center">
          <button
            onClick={onToggleMode}
            className="text-green-600 hover:text-green-700 text-sm font-medium"
          >
            ¿Ya tienes cuenta? Inicia sesión aquí
          </button>
        </div>
      </div>
    </div>
  );
}