import { useState, useEffect } from 'react';
import { Database, Activity, RefreshCw, CheckCircle, AlertTriangle, Clock, HardDrive, Zap, TrendingUp, X } from 'lucide-react';

export default function BaseDatos({ onClose }) {
  const [loading, setLoading] = useState(true);

  // Datos simulados de base de datos
  const [dbData] = useState({
    // Información General
    tipo: 'PostgreSQL',
    version: '15.4',
    nombre: 'agroverde_production',
    tamano_total: '24.5 GB',
    uptime: '45 días, 12 horas',
    puerto: '5432',
    charset: 'UTF8',
    collation: 'es_DO.UTF-8',
    
    // Rendimiento
    conexiones_activas: 12,
    conexiones_max: 200,
    conexiones_idle: 8,
    queries_segundo: 145,
    queries_lentas: 3,
    cache_hit_ratio: 98.7,
    transacciones_segundo: 89,
    
    // Backups
    ultimo_backup: new Date(Date.now() - 3600000 * 6).toISOString(),
    proximo_backup: new Date(Date.now() + 3600000 * 18).toISOString(),
    tamano_backup: '22.1 GB',
    backups_exitosos: 127,
    backups_fallidos: 2,
    
    // Tablas principales
    tablas: [
      { 
        nombre: 'pesadas', 
        registros: 15847, 
        tamano: '8.2 GB',
        indices: 5,
        ultimo_vacuum: '2 días',
        fragmentacion: '12%'
      },
      { 
        nombre: 'facturas_factoria', 
        registros: 3421, 
        tamano: '4.1 GB',
        indices: 4,
        ultimo_vacuum: '1 día',
        fragmentacion: '8%'
      },
      { 
        nombre: 'fletes', 
        registros: 12305, 
        tamano: '2.8 GB',
        indices: 3,
        ultimo_vacuum: '3 días',
        fragmentacion: '15%'
      },
      { 
        nombre: 'pagos_obreros', 
        registros: 8934, 
        tamano: '1.9 GB',
        indices: 3,
        ultimo_vacuum: '1 día',
        fragmentacion: '10%'
      },
      { 
        nombre: 'inventario', 
        registros: 2156, 
        tamano: '1.2 GB',
        indices: 4,
        ultimo_vacuum: '2 días',
        fragmentacion: '7%'
      },
      { 
        nombre: 'usuarios_sistema', 
        registros: 45, 
        tamano: '12 MB',
        indices: 2,
        ultimo_vacuum: '1 día',
        fragmentacion: '3%'
      }
    ],
    
    // Estadísticas de uso
    lecturas_segundo: 892,
    escrituras_segundo: 156,
    commits_segundo: 78,
    rollbacks_segundo: 2,
    
    ultima_actualizacion: new Date().toISOString()
  });

  useEffect(() => {
    setTimeout(() => setLoading(false), 800);
  }, []);

  const calcularPorcentaje = (usado, total) => {
    if (!usado || !total) return 0;
    return ((parseFloat(usado) / parseFloat(total)) * 100).toFixed(1);
  };

  const getColorEstado = (porcentaje) => {
    if (porcentaje < 60) return 'bg-green-600';
    if (porcentaje < 80) return 'bg-yellow-500';
    return 'bg-red-600';
  };

  const getIconoEstado = (porcentaje) => {
    if (porcentaje < 60) return <CheckCircle className="w-5 h-5 text-green-600" />;
    if (porcentaje < 80) return <AlertTriangle className="w-5 h-5 text-yellow-600" />;
    return <AlertTriangle className="w-5 h-5 text-red-600" />;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <RefreshCw className="w-12 h-12 text-green-600 animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Cargando información de la base de datos...</p>
        </div>
      </div>
    );
  }

  const conexionesPorcentaje = calcularPorcentaje(dbData.conexiones_activas, dbData.conexiones_max);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <div className="bg-gradient-to-br from-green-500 to-emerald-600 p-3 rounded-xl shadow-lg">
            <Database className="w-8 h-8 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-gray-800">Base de Datos</h1>
            <p className="text-sm text-gray-500">Monitoreo y estadísticas de PostgreSQL</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 bg-green-50 px-4 py-2 rounded-lg border border-green-200">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
            <span className="text-sm font-medium text-green-700">Base de Datos Activa</span>
          </div>
          {onClose && (
            <button
              onClick={onClose}
              className="p-2 bg-red-50 hover:bg-red-100 rounded-lg transition-colors group"
              title="Cerrar"
            >
              <X className="w-5 h-5 text-red-600 group-hover:text-red-700" />
            </button>
          )}
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-3">
            <Activity className="w-8 h-8 text-blue-600" />
            {getIconoEstado(conexionesPorcentaje)}
          </div>
          <p className="text-sm text-gray-500 mb-1">Conexiones</p>
          <p className="text-3xl font-bold text-gray-800">{dbData.conexiones_activas}</p>
          <p className="text-xs text-gray-500 mt-1">de {dbData.conexiones_max} máx</p>
          <div className="w-full bg-gray-200 rounded-full h-2 mt-3">
            <div className={`${getColorEstado(conexionesPorcentaje)} h-2 rounded-full transition-all`} style={{ width: `${conexionesPorcentaje}%` }}></div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-3">
            <Zap className="w-8 h-8 text-yellow-600" />
            <CheckCircle className="w-5 h-5 text-green-600" />
          </div>
          <p className="text-sm text-gray-500 mb-1">Queries/seg</p>
          <p className="text-3xl font-bold text-gray-800">{dbData.queries_segundo}</p>
          <p className="text-xs text-gray-500 mt-1">{dbData.queries_lentas} lentas</p>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-3">
            <TrendingUp className="w-8 h-8 text-green-600" />
            <CheckCircle className="w-5 h-5 text-green-600" />
          </div>
          <p className="text-sm text-gray-500 mb-1">Cache Hit Ratio</p>
          <p className="text-3xl font-bold text-gray-800">{dbData.cache_hit_ratio}%</p>
          <p className="text-xs text-gray-500 mt-1">Excelente rendimiento</p>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-3">
            <HardDrive className="w-8 h-8 text-purple-600" />
            <CheckCircle className="w-5 h-5 text-green-600" />
          </div>
          <p className="text-sm text-gray-500 mb-1">Tamaño Total</p>
          <p className="text-3xl font-bold text-gray-800">{dbData.tamano_total}</p>
          <p className="text-xs text-gray-500 mt-1">6 tablas principales</p>
        </div>
      </div>

      {/* Información General */}
      <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl shadow-sm border border-green-200 p-6 mb-8">
        <h2 className="text-2xl font-bold text-gray-800 mb-6 flex items-center gap-2">
          <Database className="w-6 h-6 text-green-600" />
          Información General
        </h2>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white rounded-xl p-6 shadow-sm">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">Configuración</h3>
            <div className="space-y-3">
              <div className="flex justify-between items-center py-2 border-b border-gray-100">
                <span className="text-sm text-gray-600">Motor de BD</span>
                <span className="text-sm font-semibold text-gray-800">{dbData.tipo}</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-gray-100">
                <span className="text-sm text-gray-600">Versión</span>
                <span className="text-sm font-semibold text-gray-800">{dbData.version}</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-gray-100">
                <span className="text-sm text-gray-600">Nombre</span>
                <span className="text-sm font-mono font-semibold text-gray-800">{dbData.nombre}</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-gray-100">
                <span className="text-sm text-gray-600">Puerto</span>
                <span className="text-sm font-mono font-semibold text-gray-800">{dbData.puerto}</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-gray-100">
                <span className="text-sm text-gray-600">Charset</span>
                <span className="text-sm font-mono font-semibold text-gray-800">{dbData.charset}</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-gray-100">
                <span className="text-sm text-gray-600 flex items-center gap-1">
                  <Clock className="w-4 h-4" />
                  Tiempo Activo
                </span>
                <span className="text-sm font-semibold text-green-600">{dbData.uptime}</span>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl p-6 shadow-sm">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">Rendimiento</h3>
            <div className="space-y-3">
              <div className="flex justify-between items-center py-2 border-b border-gray-100">
                <span className="text-sm text-gray-600">Transacciones/seg</span>
                <span className="text-sm font-semibold text-blue-600">{dbData.transacciones_segundo}</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-gray-100">
                <span className="text-sm text-gray-600">Lecturas/seg</span>
                <span className="text-sm font-semibold text-green-600">{dbData.lecturas_segundo}</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-gray-100">
                <span className="text-sm text-gray-600">Escrituras/seg</span>
                <span className="text-sm font-semibold text-orange-600">{dbData.escrituras_segundo}</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-gray-100">
                <span className="text-sm text-gray-600">Commits/seg</span>
                <span className="text-sm font-semibold text-green-600">{dbData.commits_segundo}</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-gray-100">
                <span className="text-sm text-gray-600">Rollbacks/seg</span>
                <span className="text-sm font-semibold text-red-600">{dbData.rollbacks_segundo}</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-gray-100">
                <span className="text-sm text-gray-600">Conexiones Idle</span>
                <span className="text-sm font-semibold text-gray-600">{dbData.conexiones_idle}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Backups */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-8">
        <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
          <HardDrive className="w-5 h-5 text-blue-600" />
          Backups y Respaldos
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-blue-50 rounded-lg p-4">
            <p className="text-sm text-gray-600 mb-1">Último Backup</p>
            <p className="text-lg font-semibold text-gray-800">
              {new Date(dbData.ultimo_backup).toLocaleString('es-DO', {
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
              })}
            </p>
            <p className="text-xs text-gray-500 mt-1">Tamaño: {dbData.tamano_backup}</p>
          </div>
          <div className="bg-green-50 rounded-lg p-4">
            <p className="text-sm text-gray-600 mb-1">Próximo Backup</p>
            <p className="text-lg font-semibold text-gray-800">
              {new Date(dbData.proximo_backup).toLocaleString('es-DO', {
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
              })}
            </p>
            <p className="text-xs text-gray-500 mt-1">Programado automáticamente</p>
          </div>
          <div className="bg-purple-50 rounded-lg p-4">
            <p className="text-sm text-gray-600 mb-1">Historial</p>
            <p className="text-lg font-semibold text-green-600">{dbData.backups_exitosos} exitosos</p>
            <p className="text-xs text-red-600 mt-1">{dbData.backups_fallidos} fallidos</p>
          </div>
        </div>
      </div>

      {/* Tablas Principales */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-800 mb-4">Tablas Principales</h3>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Tabla</th>
                <th className="text-right py-3 px-4 text-sm font-semibold text-gray-700">Registros</th>
                <th className="text-right py-3 px-4 text-sm font-semibold text-gray-700">Tamaño</th>
                <th className="text-center py-3 px-4 text-sm font-semibold text-gray-700">Índices</th>
                <th className="text-center py-3 px-4 text-sm font-semibold text-gray-700">Último Vacuum</th>
                <th className="text-center py-3 px-4 text-sm font-semibold text-gray-700">Fragmentación</th>
                <th className="text-center py-3 px-4 text-sm font-semibold text-gray-700">Estado</th>
              </tr>
            </thead>
            <tbody>
              {dbData.tablas.map((tabla, index) => (
                <tr key={index} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                  <td className="py-3 px-4 text-sm font-mono text-gray-800">{tabla.nombre}</td>
                  <td className="py-3 px-4 text-sm text-right text-gray-700">{tabla.registros.toLocaleString()}</td>
                  <td className="py-3 px-4 text-sm text-right font-semibold text-green-600">{tabla.tamano}</td>
                  <td className="py-3 px-4 text-sm text-center text-gray-700">{tabla.indices}</td>
                  <td className="py-3 px-4 text-sm text-center text-gray-600">{tabla.ultimo_vacuum}</td>
                  <td className="py-3 px-4 text-sm text-center">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      parseInt(tabla.fragmentacion) < 10 ? 'bg-green-100 text-green-700' :
                      parseInt(tabla.fragmentacion) < 20 ? 'bg-yellow-100 text-yellow-700' :
                      'bg-red-100 text-red-700'
                    }`}>
                      {tabla.fragmentacion}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-center">
                    <span className="inline-flex items-center gap-1 px-2 py-1 bg-green-100 text-green-700 rounded-full text-xs font-medium">
                      <CheckCircle className="w-3 h-3" />
                      Activa
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Última Actualización */}
      <div className="bg-gray-50 rounded-lg p-4 text-center mt-6">
        <p className="text-sm text-gray-600 flex items-center justify-center gap-2">
          <RefreshCw className="w-4 h-4" />
          Última actualización: {new Date(dbData.ultima_actualizacion).toLocaleString('es-DO', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit'
          })}
        </p>
      </div>
    </div>
  );
}
