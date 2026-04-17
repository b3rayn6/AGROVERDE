import { useState, useEffect } from 'react';
import { Server, Activity, Cpu, HardDrive, Wifi, AlertCircle, CheckCircle, RefreshCw } from 'lucide-react';

export default function Servidor({ user }) {
  const [serverStatus, setServerStatus] = useState({
    status: 'checking',
    uptime: 0,
    cpu: 0,
    memory: 0,
    disk: 0,
    network: 'active'
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkServerStatus();
    const interval = setInterval(checkServerStatus, 30000); // Actualizar cada 30 segundos
    return () => clearInterval(interval);
  }, []);

  const checkServerStatus = async () => {
    setLoading(true);
    try {
      // Simular verificación de estado del servidor
      // En producción, esto haría una llamada real a tu API
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      setServerStatus({
        status: 'online',
        uptime: Math.floor(Math.random() * 1000000),
        cpu: Math.floor(Math.random() * 100),
        memory: Math.floor(Math.random() * 100),
        disk: Math.floor(Math.random() * 100),
        network: 'active'
      });
    } catch (error) {
      console.error('Error checking server status:', error);
      setServerStatus(prev => ({ ...prev, status: 'error' }));
    } finally {
      setLoading(false);
    }
  };

  const formatUptime = (seconds) => {
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return `${days}d ${hours}h ${minutes}m`;
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'online': return 'text-green-600 bg-green-100';
      case 'warning': return 'text-yellow-600 bg-yellow-100';
      case 'error': return 'text-red-600 bg-red-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'online': return <CheckCircle className="w-5 h-5" />;
      case 'error': return <AlertCircle className="w-5 h-5" />;
      default: return <RefreshCw className="w-5 h-5 animate-spin" />;
    }
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-800 flex items-center gap-3">
            <Server className="w-8 h-8 text-blue-600" />
            Estado del Servidor
          </h1>
          <p className="text-gray-600 mt-1">Monitoreo en tiempo real del servidor</p>
        </div>
        <button
          onClick={checkServerStatus}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          Actualizar
        </button>
      </div>

      {/* Estado General */}
      <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className={`p-3 rounded-full ${getStatusColor(serverStatus.status)}`}>
              {getStatusIcon(serverStatus.status)}
            </div>
            <div>
              <h2 className="text-xl font-semibold text-gray-800">
                {serverStatus.status === 'online' ? 'Servidor Operativo' : 
                 serverStatus.status === 'error' ? 'Servidor con Problemas' : 
                 'Verificando...'}
              </h2>
              <p className="text-gray-600">
                Tiempo activo: {formatUptime(serverStatus.uptime)}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 text-green-600">
            <Wifi className="w-5 h-5" />
            <span className="font-medium">Conectado</span>
          </div>
        </div>
      </div>

      {/* Métricas del Servidor */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* CPU */}
        <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-200">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-100 rounded-lg">
                <Cpu className="w-6 h-6 text-purple-600" />
              </div>
              <h3 className="font-semibold text-gray-800">CPU</h3>
            </div>
            <span className="text-2xl font-bold text-purple-600">{serverStatus.cpu}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div 
              className="bg-purple-600 h-2 rounded-full transition-all duration-500"
              style={{ width: `${serverStatus.cpu}%` }}
            />
          </div>
        </div>

        {/* Memoria */}
        <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-200">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Activity className="w-6 h-6 text-blue-600" />
              </div>
              <h3 className="font-semibold text-gray-800">Memoria</h3>
            </div>
            <span className="text-2xl font-bold text-blue-600">{serverStatus.memory}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div 
              className="bg-blue-600 h-2 rounded-full transition-all duration-500"
              style={{ width: `${serverStatus.memory}%` }}
            />
          </div>
        </div>

        {/* Disco */}
        <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-200">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <HardDrive className="w-6 h-6 text-green-600" />
              </div>
              <h3 className="font-semibold text-gray-800">Disco</h3>
            </div>
            <span className="text-2xl font-bold text-green-600">{serverStatus.disk}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div 
              className="bg-green-600 h-2 rounded-full transition-all duration-500"
              style={{ width: `${serverStatus.disk}%` }}
            />
          </div>
        </div>
      </div>

      {/* Información Adicional */}
      <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-200">
        <h3 className="text-lg font-semibold text-gray-800 mb-4">Información del Sistema</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="flex justify-between py-2 border-b border-gray-200">
            <span className="text-gray-600">Sistema Operativo:</span>
            <span className="font-medium text-gray-800">Linux Ubuntu 22.04</span>
          </div>
          <div className="flex justify-between py-2 border-b border-gray-200">
            <span className="text-gray-600">Versión Node.js:</span>
            <span className="font-medium text-gray-800">v20.11.0</span>
          </div>
          <div className="flex justify-between py-2 border-b border-gray-200">
            <span className="text-gray-600">Base de Datos:</span>
            <span className="font-medium text-gray-800">PostgreSQL 15.3</span>
          </div>
          <div className="flex justify-between py-2 border-b border-gray-200">
            <span className="text-gray-600">Región:</span>
            <span className="font-medium text-gray-800">US East (N. Virginia)</span>
          </div>
        </div>
      </div>

      {/* Alertas y Notificaciones */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
        <div className="flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
          <div>
            <h4 className="font-semibold text-blue-900">Información</h4>
            <p className="text-blue-800 text-sm mt-1">
              El monitoreo del servidor está activo. Las métricas se actualizan cada 30 segundos.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
