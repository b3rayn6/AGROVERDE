import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { AlertCircle, CheckCircle, XCircle, RefreshCw } from 'lucide-react';

export default function DiagnosticoUsuarios() {
  const [diagnostico, setDiagnostico] = useState({
    usuarios_sistema: { cargando: true, datos: null, error: null },
    users: { cargando: true, datos: null, error: null },
    roles: { cargando: true, datos: null, error: null },
    modulos: { cargando: true, datos: null, error: null },
    permisos: { cargando: true, datos: null, error: null }
  });

  const ejecutarDiagnostico = async () => {
    console.log('🔍 Iniciando diagnóstico completo...');
    
    // Reset
    setDiagnostico({
      usuarios_sistema: { cargando: true, datos: null, error: null },
      users: { cargando: true, datos: null, error: null },
      roles: { cargando: true, datos: null, error: null },
      modulos: { cargando: true, datos: null, error: null },
      permisos: { cargando: true, datos: null, error: null }
    });

    // 1. Verificar usuarios_sistema
    try {
      const { data, error, count } = await supabase
        .from('usuarios_sistema')
        .select('*', { count: 'exact' });
      
      setDiagnostico(prev => ({
        ...prev,
        usuarios_sistema: {
          cargando: false,
          datos: { registros: data, total: count },
          error: error
        }
      }));
      console.log('✅ usuarios_sistema:', data?.length, 'registros');
    } catch (err) {
      setDiagnostico(prev => ({
        ...prev,
        usuarios_sistema: {
          cargando: false,
          datos: null,
          error: err
        }
      }));
      console.error('❌ Error en usuarios_sistema:', err);
    }

    // 2. Verificar users (legacy)
    try {
      const { data, error, count } = await supabase
        .from('users')
        .select('*', { count: 'exact' });
      
      setDiagnostico(prev => ({
        ...prev,
        users: {
          cargando: false,
          datos: { registros: data, total: count },
          error: error
        }
      }));
      console.log('✅ users (legacy):', data?.length, 'registros');
    } catch (err) {
      setDiagnostico(prev => ({
        ...prev,
        users: {
          cargando: false,
          datos: null,
          error: err
        }
      }));
      console.error('❌ Error en users:', err);
    }

    // 3. Verificar roles
    try {
      const { data, error, count } = await supabase
        .from('roles')
        .select('*', { count: 'exact' });
      
      setDiagnostico(prev => ({
        ...prev,
        roles: {
          cargando: false,
          datos: { registros: data, total: count },
          error: error
        }
      }));
      console.log('✅ roles:', data?.length, 'registros');
    } catch (err) {
      setDiagnostico(prev => ({
        ...prev,
        roles: {
          cargando: false,
          datos: null,
          error: err
        }
      }));
      console.error('❌ Error en roles:', err);
    }

    // 4. Verificar módulos
    try {
      const { data, error, count } = await supabase
        .from('modulos')
        .select('*', { count: 'exact' });
      
      setDiagnostico(prev => ({
        ...prev,
        modulos: {
          cargando: false,
          datos: { registros: data, total: count },
          error: error
        }
      }));
      console.log('✅ modulos:', data?.length, 'registros');
    } catch (err) {
      setDiagnostico(prev => ({
        ...prev,
        modulos: {
          cargando: false,
          datos: null,
          error: err
        }
      }));
      console.error('❌ Error en modulos:', err);
    }

    // 5. Verificar permisos_usuario
    try {
      const { data, error, count } = await supabase
        .from('permisos_usuario')
        .select('*', { count: 'exact' });
      
      setDiagnostico(prev => ({
        ...prev,
        permisos: {
          cargando: false,
          datos: { registros: data, total: count },
          error: error
        }
      }));
      console.log('✅ permisos_usuario:', data?.length, 'registros');
    } catch (err) {
      setDiagnostico(prev => ({
        ...prev,
        permisos: {
          cargando: false,
          datos: null,
          error: err
        }
      }));
      console.error('❌ Error en permisos_usuario:', err);
    }
  };

  useEffect(() => {
    ejecutarDiagnostico();
  }, []);

  const renderTabla = (nombre, info) => {
    const { cargando, datos, error } = info;

    return (
      <div className="bg-white rounded-lg shadow-md p-6 mb-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
            {cargando && <RefreshCw className="w-5 h-5 animate-spin text-blue-500" />}
            {!cargando && !error && datos && <CheckCircle className="w-5 h-5 text-green-500" />}
            {!cargando && error && <XCircle className="w-5 h-5 text-red-500" />}
            {nombre}
          </h3>
          {!cargando && datos && (
            <span className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm font-semibold">
              {datos.total || 0} registros
            </span>
          )}
        </div>

        {cargando && (
          <div className="text-center py-4">
            <p className="text-gray-500">Cargando...</p>
          </div>
        )}

        {!cargando && error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-red-800 font-semibold mb-2">Error:</p>
            <p className="text-red-600 text-sm">{error.message}</p>
            <p className="text-red-500 text-xs mt-2">Código: {error.code}</p>
            <details className="mt-3">
              <summary className="text-red-700 text-sm cursor-pointer">Ver detalles técnicos</summary>
              <pre className="mt-2 text-xs bg-red-100 p-2 rounded overflow-auto">
                {JSON.stringify(error, null, 2)}
              </pre>
            </details>
          </div>
        )}

        {!cargando && !error && datos && (
          <div>
            {datos.registros && datos.registros.length > 0 ? (
              <div className="overflow-auto max-h-96">
                <pre className="text-xs bg-gray-50 p-4 rounded border border-gray-200">
                  {JSON.stringify(datos.registros, null, 2)}
                </pre>
              </div>
            ) : (
              <div className="text-center py-8 bg-gray-50 rounded-lg">
                <AlertCircle className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                <p className="text-gray-600 font-medium">No hay registros en esta tabla</p>
                <p className="text-gray-500 text-sm mt-1">La tabla existe pero está vacía</p>
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <div className="max-w-6xl mx-auto">
        <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg shadow-lg p-6 mb-6 text-white">
          <h1 className="text-3xl font-bold mb-2">🔍 Diagnóstico del Sistema de Usuarios</h1>
          <p className="text-blue-100">Verificación completa de tablas y datos</p>
          <button
            onClick={ejecutarDiagnostico}
            className="mt-4 bg-white text-blue-600 px-4 py-2 rounded-lg font-semibold hover:bg-blue-50 transition-colors flex items-center gap-2"
          >
            <RefreshCw className="w-4 h-4" />
            Recargar Diagnóstico
          </button>
        </div>

        {renderTabla('Tabla: usuarios_sistema', diagnostico.usuarios_sistema)}
        {renderTabla('Tabla: users (legacy)', diagnostico.users)}
        {renderTabla('Tabla: roles', diagnostico.roles)}
        {renderTabla('Tabla: modulos', diagnostico.modulos)}
        {renderTabla('Tabla: permisos_usuario', diagnostico.permisos)}

        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 mt-6">
          <h3 className="text-lg font-bold text-yellow-800 mb-3 flex items-center gap-2">
            <AlertCircle className="w-5 h-5" />
            Instrucciones
          </h3>
          <ul className="space-y-2 text-yellow-800 text-sm">
            <li>✅ <strong>CheckCircle verde:</strong> Tabla cargada correctamente</li>
            <li>❌ <strong>XCircle rojo:</strong> Error al cargar la tabla (ver detalles)</li>
            <li>📊 <strong>Número azul:</strong> Cantidad de registros en la tabla</li>
            <li>⚠️ <strong>Si una tabla está vacía:</strong> Necesitas crear registros</li>
            <li>🔒 <strong>Si hay error de permisos:</strong> Verifica RLS en Supabase</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
