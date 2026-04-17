import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { CheckCircle, XCircle, AlertCircle, RefreshCw, ExternalLink } from 'lucide-react';

export default function VerificarConexion() {
  const [estado, setEstado] = useState({
    cargando: true,
    conectado: false,
    error: null,
    detalles: {}
  });

  const verificarConexion = async () => {
    setEstado({ cargando: true, conectado: false, error: null, detalles: {} });
    
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

    console.log('🔍 Verificando configuración de Supabase...');
    console.log('📍 URL:', supabaseUrl);
    console.log('🔑 Key (primeros 20 chars):', supabaseKey?.substring(0, 20) + '...');

    const detalles = {
      url: supabaseUrl,
      keyConfigured: !!supabaseKey,
      keyLength: supabaseKey?.length || 0
    };

    // Verificar que las variables estén configuradas
    if (!supabaseUrl || !supabaseKey) {
      setEstado({
        cargando: false,
        conectado: false,
        error: 'Variables de entorno no configuradas',
        detalles: {
          ...detalles,
          mensaje: 'Falta VITE_SUPABASE_URL o VITE_SUPABASE_ANON_KEY en el archivo .env'
        }
      });
      return;
    }

    // Verificar que la URL sea válida
    try {
      new URL(supabaseUrl);
    } catch (e) {
      setEstado({
        cargando: false,
        conectado: false,
        error: 'URL de Supabase inválida',
        detalles: {
          ...detalles,
          mensaje: 'La URL no tiene un formato válido'
        }
      });
      return;
    }

    // Intentar hacer ping a la URL
    try {
      console.log('🌐 Intentando conectar a:', supabaseUrl);
      const response = await fetch(supabaseUrl, {
        method: 'HEAD',
        mode: 'no-cors'
      });
      console.log('✅ Respuesta del servidor:', response);
      detalles.pingSuccess = true;
    } catch (error) {
      console.error('❌ Error de ping:', error);
      detalles.pingSuccess = false;
      detalles.pingError = error.message;
    }

    // Intentar una consulta simple a Supabase
    try {
      console.log('🔍 Intentando consulta de prueba...');
      
      // Intentar obtener la lista de tablas (esto fallará si no hay permisos, pero al menos verifica la conexión)
      const { data, error } = await supabase
        .from('users')
        .select('count', { count: 'exact', head: true });

      if (error) {
        console.warn('⚠️ Error en consulta de prueba:', error);
        
        // Si el error es de tabla no encontrada, la conexión funciona
        if (error.code === '42P01' || error.code === 'PGRST204') {
          setEstado({
            cargando: false,
            conectado: true,
            error: null,
            detalles: {
              ...detalles,
              mensaje: 'Conexión exitosa, pero la tabla "users" no existe',
              sugerencia: 'Ejecuta el script inicializar_sistema_usuarios.sql'
            }
          });
          return;
        }

        // Otro tipo de error
        setEstado({
          cargando: false,
          conectado: false,
          error: error.message,
          detalles: {
            ...detalles,
            errorCode: error.code,
            errorDetails: error.details,
            errorHint: error.hint
          }
        });
        return;
      }

      // Conexión exitosa
      console.log('✅ Conexión exitosa a Supabase');
      setEstado({
        cargando: false,
        conectado: true,
        error: null,
        detalles: {
          ...detalles,
          mensaje: 'Conexión exitosa a Supabase'
        }
      });

    } catch (error) {
      console.error('❌ Error al verificar conexión:', error);
      setEstado({
        cargando: false,
        conectado: false,
        error: error.message || 'Error desconocido',
        detalles: {
          ...detalles,
          errorType: error.name,
          errorStack: error.stack
        }
      });
    }
  };

  useEffect(() => {
    verificarConexion();
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center p-6">
      <div className="max-w-2xl w-full">
        <div className="bg-white rounded-2xl shadow-xl p-8">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full mb-4">
              {estado.cargando && <RefreshCw className="w-10 h-10 text-white animate-spin" />}
              {!estado.cargando && estado.conectado && <CheckCircle className="w-10 h-10 text-white" />}
              {!estado.cargando && !estado.conectado && <XCircle className="w-10 h-10 text-white" />}
            </div>
            <h1 className="text-3xl font-bold text-gray-800 mb-2">
              Verificación de Conexión
            </h1>
            <p className="text-gray-600">
              {estado.cargando && 'Verificando conexión a Supabase...'}
              {!estado.cargando && estado.conectado && '¡Conexión exitosa!'}
              {!estado.cargando && !estado.conectado && 'Error de conexión'}
            </p>
          </div>

          {/* Estado */}
          {!estado.cargando && (
            <div className={`rounded-xl p-6 mb-6 ${
              estado.conectado 
                ? 'bg-green-50 border-2 border-green-200' 
                : 'bg-red-50 border-2 border-red-200'
            }`}>
              <div className="flex items-start gap-4">
                {estado.conectado ? (
                  <CheckCircle className="w-6 h-6 text-green-600 flex-shrink-0 mt-1" />
                ) : (
                  <XCircle className="w-6 h-6 text-red-600 flex-shrink-0 mt-1" />
                )}
                <div className="flex-1">
                  <h3 className={`font-bold text-lg mb-2 ${
                    estado.conectado ? 'text-green-800' : 'text-red-800'
                  }`}>
                    {estado.conectado ? 'Conexión Establecida' : 'Error de Conexión'}
                  </h3>
                  <p className={estado.conectado ? 'text-green-700' : 'text-red-700'}>
                    {estado.detalles.mensaje || estado.error || 'Sin detalles'}
                  </p>
                  {estado.detalles.sugerencia && (
                    <p className="mt-2 text-sm font-semibold text-green-800">
                      💡 {estado.detalles.sugerencia}
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Detalles de configuración */}
          <div className="bg-gray-50 rounded-xl p-6 mb-6">
            <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
              <AlertCircle className="w-5 h-5" />
              Configuración Actual
            </h3>
            <div className="space-y-3">
              <div>
                <p className="text-sm font-semibold text-gray-600 mb-1">URL de Supabase:</p>
                <p className="text-sm font-mono bg-white px-3 py-2 rounded border border-gray-200 break-all">
                  {estado.detalles.url || 'No configurada'}
                </p>
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-600 mb-1">API Key:</p>
                <p className="text-sm font-mono bg-white px-3 py-2 rounded border border-gray-200">
                  {estado.detalles.keyConfigured 
                    ? `Configurada (${estado.detalles.keyLength} caracteres)` 
                    : 'No configurada'}
                </p>
              </div>
              {estado.detalles.errorCode && (
                <div>
                  <p className="text-sm font-semibold text-gray-600 mb-1">Código de Error:</p>
                  <p className="text-sm font-mono bg-white px-3 py-2 rounded border border-red-200 text-red-700">
                    {estado.detalles.errorCode}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Soluciones */}
          {!estado.conectado && !estado.cargando && (
            <div className="bg-yellow-50 border-2 border-yellow-200 rounded-xl p-6 mb-6">
              <h3 className="font-bold text-yellow-800 mb-3 flex items-center gap-2">
                <AlertCircle className="w-5 h-5" />
                Posibles Soluciones
              </h3>
              <ul className="space-y-2 text-sm text-yellow-800">
                <li className="flex items-start gap-2">
                  <span className="font-bold">1.</span>
                  <span>Verifica que tu proyecto de Supabase esté activo en <a href="https://supabase.com/dashboard" target="_blank" rel="noopener noreferrer" className="underline font-semibold">supabase.com/dashboard</a></span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="font-bold">2.</span>
                  <span>Verifica que la URL en el archivo <code className="bg-yellow-100 px-1 rounded">.env</code> sea correcta</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="font-bold">3.</span>
                  <span>Si cambiaste el archivo <code className="bg-yellow-100 px-1 rounded">.env</code>, reinicia el servidor de desarrollo</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="font-bold">4.</span>
                  <span>Verifica tu conexión a internet</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="font-bold">5.</span>
                  <span>Si el proyecto fue pausado, reactívalo en el dashboard de Supabase</span>
                </li>
              </ul>
            </div>
          )}

          {/* Botones de acción */}
          <div className="flex gap-3">
            <button
              onClick={verificarConexion}
              disabled={estado.cargando}
              className="flex-1 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-semibold py-3 rounded-xl transition-all duration-200 flex items-center justify-center gap-2 disabled:opacity-50"
            >
              <RefreshCw className={`w-5 h-5 ${estado.cargando ? 'animate-spin' : ''}`} />
              Verificar Nuevamente
            </button>
            <a
              href="https://supabase.com/dashboard"
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 bg-gray-600 hover:bg-gray-700 text-white font-semibold py-3 rounded-xl transition-all duration-200 flex items-center justify-center gap-2"
            >
              <ExternalLink className="w-5 h-5" />
              Abrir Supabase
            </a>
          </div>

          {/* Detalles técnicos */}
          {estado.detalles.errorStack && (
            <details className="mt-6">
              <summary className="text-sm text-gray-600 cursor-pointer hover:text-gray-800 font-semibold">
                Ver detalles técnicos
              </summary>
              <pre className="mt-3 text-xs bg-gray-100 p-4 rounded border border-gray-200 overflow-auto max-h-64">
                {JSON.stringify(estado.detalles, null, 2)}
              </pre>
            </details>
          )}
        </div>
      </div>
    </div>
  );
}
