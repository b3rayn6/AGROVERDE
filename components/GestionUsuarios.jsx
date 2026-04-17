import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Users, Plus, Edit2, Trash2, Save, X, Eye, EyeOff } from 'lucide-react';

export default function GestionUsuarios({ user }) {
  const [usuarios, setUsuarios] = useState([]);
  const [roles, setRoles] = useState([]);
  const [modulos, setModulos] = useState([]);
  const [mostrarForm, setMostrarForm] = useState(false);
  const [editando, setEditando] = useState(null);
  const [permisos, setPermisos] = useState({});
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState(null);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    nombre_completo: '',
    rol_id: '',
    activo: true
  });

  useEffect(() => {
    cargarDatos();
  }, []);

  const cargarDatos = async () => {
    console.log('🔄 GestionUsuarios: Iniciando carga de datos...');
    setCargando(true);
    setError(null);
    
    try {
      const { data: usuariosData, error: errorUsuarios } = await supabase
        .from('usuarios_sistema')
        .select('*, roles(nombre)')
        .order('created_at', { ascending: false });
      
      console.log('👥 Usuarios cargados:', usuariosData);
      console.log('❌ Error usuarios:', errorUsuarios);
      
      if (errorUsuarios) {
        throw new Error(`Error al cargar usuarios: ${errorUsuarios.message}`);
      }
      
      const { data: rolesData, error: errorRoles } = await supabase
        .from('roles')
        .select('*')
        .order('nombre');
      
      console.log('🎭 Roles cargados:', rolesData);
      console.log('❌ Error roles:', errorRoles);
      
      if (errorRoles) {
        throw new Error(`Error al cargar roles: ${errorRoles.message}`);
      }
      
      const { data: modulosData, error: errorModulos } = await supabase
        .from('modulos')
        .select('*')
        .order('nombre');
      
      console.log('📦 Módulos cargados:', modulosData);
      console.log('❌ Error módulos:', errorModulos);
      
      if (errorModulos) {
        throw new Error(`Error al cargar módulos: ${errorModulos.message}`);
      }

    // Verificar y crear módulos faltantes si no existen
    const modulosRequeridos = [
      { codigo: 'activos_fijos', nombre: 'Activos Fijos / PPE' },
      { codigo: 'compensacion_cuentas', nombre: 'Compensación de Cuentas' }
    ];

    for (const moduloReq of modulosRequeridos) {
      const existe = modulosData?.some(m => m.codigo === moduloReq.codigo);
      if (!existe) {
        // Crear el módulo si no existe
        await supabase
          .from('modulos')
          .insert([{ codigo: moduloReq.codigo, nombre: moduloReq.nombre }]);
      }
    }

    // Recargar módulos después de crear los faltantes
    const { data: modulosActualizados, error: errorModulosActualizados } = await supabase
      .from('modulos')
      .select('*')
      .order('nombre');
    
    console.log('📦 Módulos actualizados:', modulosActualizados);
    console.log('❌ Error módulos actualizados:', errorModulosActualizados);

    setUsuarios(usuariosData || []);
    setRoles(rolesData || []);
    setModulos(modulosActualizados || []);
    
    console.log('✅ Estado actualizado - Usuarios:', usuariosData?.length, 'Roles:', rolesData?.length, 'Módulos:', modulosActualizados?.length);
  } catch (error) {
    console.error('❌ Error general en cargarDatos:', error);
    setError(error.message || 'Error al cargar los datos');
  } finally {
    setCargando(false);
  }
};

  const cargarPermisos = async (usuarioId) => {
    const { data } = await supabase
      .from('permisos_usuario')
      .select('*')
      .eq('usuario_id', usuarioId);

    const permisosMap = {};
    data?.forEach(p => {
      permisosMap[p.modulo_id] = {
        puede_ver: p.puede_ver,
        puede_crear: p.puede_crear,
        puede_editar: p.puede_editar,
        puede_eliminar: p.puede_eliminar
      };
    });
    setPermisos(permisosMap);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (editando) {
      const updateData = { ...formData };
      if (!updateData.password) delete updateData.password;
      
      await supabase
        .from('usuarios_sistema')
        .update(updateData)
        .eq('id', editando);
    } else {
      const { data: nuevoUsuario } = await supabase
        .from('usuarios_sistema')
        .insert([formData])
        .select()
        .single();

      if (nuevoUsuario) {
        const permisosIniciales = modulos.map(m => ({
          usuario_id: nuevoUsuario.id,
          modulo_id: m.id,
          puede_ver: false,
          puede_crear: false,
          puede_editar: false,
          puede_eliminar: false
        }));

        await supabase
          .from('permisos_usuario')
          .insert(permisosIniciales);
      }
    }

    setFormData({ email: '', password: '', nombre_completo: '', rol_id: '', activo: true });
    setMostrarForm(false);
    setEditando(null);
    cargarDatos();
  };

  const handleEditar = (usuario) => {
    setFormData({
      email: usuario.email,
      password: '',
      nombre_completo: usuario.nombre_completo,
      rol_id: usuario.rol_id,
      activo: usuario.activo
    });
    setEditando(usuario.id);
    setMostrarForm(true);
  };

  const handleEliminar = async (id) => {
    if (window.confirm('¿Eliminar este usuario?')) {
      await supabase.from('usuarios_sistema').delete().eq('id', id);
      cargarDatos();
    }
  };

  const handleEditarPermisos = async (usuarioId) => {
    setEditando(usuarioId);
    await cargarPermisos(usuarioId);
  };

  const handleCambiarPermiso = (moduloId, campo) => {
    setPermisos(prev => ({
      ...prev,
      [moduloId]: {
        ...prev[moduloId],
        [campo]: !prev[moduloId]?.[campo]
      }
    }));
  };

  const handleGuardarPermisos = async () => {
    try {
      for (const moduloId in permisos) {
        // Verificar si ya existe el permiso
        const { data: existingPermiso } = await supabase
          .from('permisos_usuario')
          .select('id')
          .eq('usuario_id', editando)
          .eq('modulo_id', parseInt(moduloId))
          .single();

        if (existingPermiso) {
          // Actualizar
          const { error } = await supabase
            .from('permisos_usuario')
            .update({
              ...permisos[moduloId]
            })
            .eq('id', existingPermiso.id);
            
          if (error) throw error;
        } else {
          // Insertar
          const { error } = await supabase
            .from('permisos_usuario')
            .insert({
              usuario_id: editando,
              modulo_id: parseInt(moduloId),
              ...permisos[moduloId]
            });
            
          if (error) throw error;
        }
      }
      
      // Si el usuario actual es el mismo que se está editando, recargar su sesión
      if (user && user.id === editando && user.tipo === 'sistema') {
        // Recargar permisos del usuario actual
        const { data: permisosRaw } = await supabase
          .from('permisos_usuario')
          .select('*, modulos(codigo, nombre)')
          .eq('usuario_id', user.id);

        const permisosActualizados = permisosRaw?.map(p => ({
          ...p,
          modulos: p.modulos || { codigo: 'unknown', nombre: 'Unknown' }
        })) || [];

        // Actualizar el usuario en localStorage y recargar la página para aplicar cambios
        const usuarioActualizado = { ...user, permisos: permisosActualizados };
        localStorage.setItem('user_session', JSON.stringify(usuarioActualizado));
        
        // Recargar la página para aplicar los cambios de permisos
        window.location.reload();
      }
      
      setEditando(null);
      setPermisos({});
      alert('Permisos guardados correctamente' + (user && user.id === editando ? '. Recargando sesión...' : ''));
    } catch (error) {
      console.error('Error al guardar permisos:', error);
      alert('Error al guardar permisos: ' + error.message);
    }
  };

  if (editando && Object.keys(permisos).length > 0) {
    return (
      <div className="p-6">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-gray-800">Configurar Permisos</h2>
          <div className="flex gap-2">
            <button onClick={handleGuardarPermisos} className="bg-green-600 text-white px-4 py-2 rounded-lg flex items-center gap-2">
              <Save className="w-4 h-4" /> Guardar
            </button>
            <button onClick={() => { setEditando(null); setPermisos({}); }} className="bg-gray-500 text-white px-4 py-2 rounded-lg flex items-center gap-2">
              <X className="w-4 h-4" /> Cancelar
            </button>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Módulo</th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">Ver</th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">Crear</th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">Editar</th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">Eliminar</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {modulos.map(modulo => (
                <tr key={modulo.id}>
                  <td className="px-6 py-4 text-sm font-medium text-gray-900">{modulo.nombre}</td>
                  <td className="px-6 py-4 text-center">
                    <input
                      type="checkbox"
                      checked={permisos[modulo.id]?.puede_ver || false}
                      onChange={() => handleCambiarPermiso(modulo.id, 'puede_ver')}
                      className="w-4 h-4"
                    />
                  </td>
                  <td className="px-6 py-4 text-center">
                    <input
                      type="checkbox"
                      checked={permisos[modulo.id]?.puede_crear || false}
                      onChange={() => handleCambiarPermiso(modulo.id, 'puede_crear')}
                      className="w-4 h-4"
                    />
                  </td>
                  <td className="px-6 py-4 text-center">
                    <input
                      type="checkbox"
                      checked={permisos[modulo.id]?.puede_editar || false}
                      onChange={() => handleCambiarPermiso(modulo.id, 'puede_editar')}
                      className="w-4 h-4"
                    />
                  </td>
                  <td className="px-6 py-4 text-center">
                    <input
                      type="checkbox"
                      checked={permisos[modulo.id]?.puede_eliminar || false}
                      onChange={() => handleCambiarPermiso(modulo.id, 'puede_eliminar')}
                      className="w-4 h-4"
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  // Mostrar estado de carga
  if (cargando) {
    return (
      <div className="p-6">
        <div className="flex flex-col items-center justify-center min-h-[400px]">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mb-4"></div>
          <p className="text-gray-600">Cargando usuarios...</p>
        </div>
      </div>
    );
  }

  // Mostrar error si existe
  if (error) {
    return (
      <div className="p-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6">
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0">
              <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-red-800 mb-2">Error al cargar datos</h3>
              <p className="text-red-700 mb-4">{error}</p>
              <button
                onClick={cargarDatos}
                className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors"
              >
                Reintentar
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
          <Users className="w-6 h-6" /> Gestión de Usuarios
        </h2>
        <button
          onClick={() => setMostrarForm(!mostrarForm)}
          className="bg-green-600 text-white px-4 py-2 rounded-lg flex items-center gap-2"
        >
          <Plus className="w-4 h-4" /> Nuevo Usuario
        </button>
      </div>

      {mostrarForm && (
        <div className="bg-white p-6 rounded-lg shadow mb-6">
          <form onSubmit={handleSubmit} className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="w-full border rounded-lg px-3 py-2"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Contraseña {editando && '(dejar vacío para no cambiar)'}
              </label>
              <input
                type="password"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                className="w-full border rounded-lg px-3 py-2"
                required={!editando}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nombre Completo</label>
              <input
                type="text"
                value={formData.nombre_completo}
                onChange={(e) => setFormData({ ...formData, nombre_completo: e.target.value })}
                className="w-full border rounded-lg px-3 py-2"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Rol</label>
              <select
                value={formData.rol_id}
                onChange={(e) => setFormData({ ...formData, rol_id: e.target.value })}
                className="w-full border rounded-lg px-3 py-2"
                required
              >
                <option value="">Seleccionar rol</option>
                {roles.map(rol => (
                  <option key={rol.id} value={rol.id}>{rol.nombre}</option>
                ))}
              </select>
            </div>
            <div className="col-span-2 flex items-center gap-2">
              <input
                type="checkbox"
                checked={formData.activo}
                onChange={(e) => setFormData({ ...formData, activo: e.target.checked })}
                className="w-4 h-4"
              />
              <label className="text-sm font-medium text-gray-700">Usuario Activo</label>
            </div>
            <div className="col-span-2 flex gap-2">
              <button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center gap-2">
                <Save className="w-4 h-4" /> {editando ? 'Actualizar' : 'Crear'}
              </button>
              <button
                type="button"
                onClick={() => {
                  setMostrarForm(false);
                  setEditando(null);
                  setFormData({ email: '', password: '', nombre_completo: '', rol_id: '', activo: true });
                }}
                className="bg-gray-500 text-white px-4 py-2 rounded-lg flex items-center gap-2"
              >
                <X className="w-4 h-4" /> Cancelar
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="bg-white rounded-lg shadow overflow-hidden">
        {usuarios.length === 0 ? (
          <div className="p-12 text-center">
            <Users className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-700 mb-2">No hay usuarios registrados</h3>
            <p className="text-gray-500 mb-4">Comienza creando tu primer usuario del sistema</p>
            <button
              onClick={() => setMostrarForm(true)}
              className="bg-green-600 text-white px-6 py-2 rounded-lg hover:bg-green-700 transition-colors inline-flex items-center gap-2"
            >
              <Plus className="w-4 h-4" /> Crear Primer Usuario
            </button>
          </div>
        ) : (
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Nombre</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Email</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Rol</th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">Estado</th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {usuarios.map(usuario => (
                <tr key={usuario.id}>
                  <td className="px-6 py-4 text-sm font-medium text-gray-900">{usuario.nombre_completo}</td>
                  <td className="px-6 py-4 text-sm text-gray-500">{usuario.email}</td>
                  <td className="px-6 py-4 text-sm text-gray-500">{usuario.roles?.nombre}</td>
                  <td className="px-6 py-4 text-center">
                    <span className={`px-2 py-1 text-xs rounded-full ${usuario.activo ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                      {usuario.activo ? 'Activo' : 'Inactivo'}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-center">
                    <div className="flex justify-center gap-2">
                      <button onClick={() => handleEditar(usuario)} className="text-blue-600 hover:text-blue-800">
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button onClick={() => handleEditarPermisos(usuario.id)} className="text-purple-600 hover:text-purple-800">
                        <Eye className="w-4 h-4" />
                      </button>
                      <button onClick={() => handleEliminar(usuario.id)} className="text-red-600 hover:text-red-800">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}