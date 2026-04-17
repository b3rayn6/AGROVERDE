import { useState, useEffect } from 'react';
import { supabase } from './lib/supabase';
import Login from './components/Login';
import Register from './components/Register';
import Dashboard from './components/Dashboard';
import ListaFacturasFactoria from './components/ListaFacturasFactoria';
import NuevaFacturaFactoria from './components/NuevaFacturaFactoria';
import ComparacionPesadasFacturas from './components/ComparacionPesadasFacturas';
import CompensacionCuentas from './components/CompensacionCuentas';
import CompensacionPesadas from './components/CompensacionPesadas';
import RegistroFlete from './components/RegistroFlete';
import PagoObreros from './components/PagoObreros';
import Prestamos from './components/Prestamos';
import Inventario from './components/Inventario';
import FacturasCompra from './components/FacturasCompra';
import Suplidores from './components/Suplidores';
import FacturasVenta from './components/FacturasVenta';
import Clientes from './components/Clientes';
import VentasDiarias from './components/VentasDiarias';
import CuentasPorCobrar from './components/CuentasPorCobrar';
import CuentasPorPagar from './components/CuentasPorPagar';
import GestionUsuarios from './components/GestionUsuarios';
import UtilidadNeta from './components/UtilidadNeta';
import LibroDiario from './components/LibroDiario';
import CuadreCaja from './components/CuadreCaja';
import Gastos from './components/Gastos';
import ActivosFijos from './components/ActivosFijos';
import AsistenteIA from './components/AsistenteIA';
import Servidor from './src/components/Servidor';
import BaseDatos from './src/components/BaseDatos';
import AIChatbot from './components/AIChatbot';
import AIChatbotTest from './components/AIChatbotTest';
import ChatbotSimple from './components/ChatbotSimple';
import DiagnosticoUsuarios from './components/DiagnosticoUsuarios';
import VerificarConexion from './components/VerificarConexion';
import { FileText, Scale, GitCompare, Truck, Users, DollarSign, LogOut, Package, ShoppingCart, Building2, Receipt, UserCheck, Store, CreditCard, Wallet, TrendingUp, Settings, BookOpen, Calculator, Building, Server, Database, Sparkles } from 'lucide-react';

export default function App() {
  const [user, setUser] = useState(null);
  const [mode, setMode] = useState('login');
  const [activeModule, setActiveModule] = useState('pesadas');
  const [showNuevaFactura, setShowNuevaFactura] = useState(false);
  const [editingFactura, setEditingFactura] = useState(null);
  const [loadingSession, setLoadingSession] = useState(true);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  // 🔄 VERSION: 2024-04-14-v3 - Servidor y Base de Datos siempre visibles
  console.log('🚀 App.jsx cargado - Versión: 2024-04-14-v3');

  // Cargar sesión guardada al iniciar
  useEffect(() => {
    const loadSavedSession = async () => {
      try {
        const savedSession = localStorage.getItem('user_session');
        if (savedSession) {
          const userData = JSON.parse(savedSession);
          
          console.log('🔍 Sesión guardada encontrada:', userData.email);
          
          // SIEMPRE verificar que el usuario existe en la base de datos
          // No confiar ciegamente en localStorage
          if (userData.tipo === 'sistema') {
            try {
              console.log('🔄 Verificando usuario del sistema en Supabase...');
              const { data: usuarioActualizado, error } = await supabase
                .from('usuarios_sistema')
                .select('id, email, nombre_completo, rol_id, activo, legacy_id, created_at, roles(nombre)')
                .eq('id', userData.id)
                .eq('activo', true)
                .maybeSingle();

              if (error) {
                console.error('❌ Error verificando sesión:', error);
                console.log('🧹 Limpiando sesión inválida...');
                localStorage.removeItem('user_session');
                setLoadingSession(false);
                return;
              }

              if (usuarioActualizado) {
                console.log('✅ Usuario verificado en Supabase');
                // Recargar permisos
                const { data: permisosRaw } = await supabase
                  .from('permisos_usuario')
                  .select('*, modulos(codigo, nombre)')
                  .eq('usuario_id', userData.id);

                const permisos = permisosRaw?.map(p => ({
                  ...p,
                  modulos: p.modulos || { codigo: 'unknown', nombre: 'Unknown' }
                })) || [];

                setUser({ ...usuarioActualizado, permisos, tipo: 'sistema' });
              } else {
                // Usuario no encontrado o desactivado
                console.warn('⚠️ Usuario no encontrado o desactivado');
                localStorage.removeItem('user_session');
              }
            } catch (error) {
              console.error('❌ Error de conexión al verificar sesión:', error);
              // Si hay error de conexión, NO usar la sesión guardada
              console.log('🧹 Limpiando sesión por error de conexión...');
              localStorage.removeItem('user_session');
            }
          } else {
            // Usuario legacy - YA NO SOPORTADO
            console.warn('⚠️ Usuario legacy detectado - ya no soportado');
            console.log('🧹 Limpiando sesión legacy...');
            localStorage.removeItem('user_session');
          }
        }
      } catch (error) {
        console.error('Error cargando sesión:', error);
        localStorage.removeItem('user_session');
      } finally {
        setLoadingSession(false);
      }
    };

    loadSavedSession();
  }, []);

  // Guardar sesión cuando cambia el usuario
  useEffect(() => {
    if (user) {
      try {
        localStorage.setItem('user_session', JSON.stringify(user));
      } catch (error) {
        console.warn('No se pudo guardar la sesión:', error);
      }
    } else {
      localStorage.removeItem('user_session');
    }
  }, [user]);

  // Mostrar loading mientras se carga la sesión
  if (loadingSession) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Cargando...</p>
        </div>
      </div>
    );
  }

  if (user) {
    // Verificar permisos del usuario
    const tienePermiso = (codigoModulo, accion = 'puede_ver') => {
      // Solo usuarios sistema tienen acceso
      if (user.tipo !== 'sistema') {
        console.warn('⚠️ Usuario no es del sistema - acceso denegado');
        return false;
      }
      
      // Usuarios sistema con permisos configurados
      if (user.tipo === 'sistema') {
        // Acceso completo temporal para testing
        return true;
      }

      // Buscar permiso específico
      const permiso = user.permisos?.find(p => p.modulos?.codigo === codigoModulo);
      return permiso?.[accion] || false;
    };

    // 🔍 DEBUG - Ver permisos en App.js
    console.log('🎯 DEBUG App.js - Usuario completo:', user);
    console.log('🎯 DEBUG App.js - Tipo de usuario:', user.tipo);
    console.log('🎯 DEBUG App.js - Permisos del usuario:', user.permisos);
    
    if (user.permisos && user.permisos.length > 0) {
      console.log('🎯 DEBUG App.js - Primer permiso (ejemplo):', user.permisos[0]);
      const compensacion = user.permisos.find(p => p.modulos?.codigo === 'compensacion_pesadas');
      console.log('🎯 DEBUG App.js - Permiso compensacion_pesadas:', compensacion);
      console.log('🎯 DEBUG App.js - tienePermiso("compensacion_pesadas"):', tienePermiso('compensacion_pesadas'));
    }

    // Menú de navegación con permisos
    const todosLosModulos = [
      { id: 'pesadas', name: 'Pesadas', icon: Scale, codigo: 'pesadas' },
      { id: 'facturas', name: 'Facturas Factoría', icon: FileText, codigo: 'facturas_factoria' },
      { id: 'comparacion', name: 'Comparación', icon: GitCompare, codigo: 'facturas_factoria' },
      { id: 'compensacion', name: 'Compensación Cuentas', icon: DollarSign, codigo: 'compensacion_cuentas' },
      { id: 'compensacion-pesadas', name: 'Pagar con Pesadas', icon: Scale, codigo: 'compensacion_pesadas' },
      { id: 'flete', name: 'Registro de Flete', icon: Truck, codigo: 'fletes_obreros' },
      { id: 'obreros', name: 'Pago de Obreros', icon: Users, codigo: 'fletes_obreros' },
      { id: 'prestamos', name: 'Financiamientos', icon: DollarSign, codigo: 'prestamos' },
      { id: 'inventario', name: 'Inventario', icon: Package, codigo: 'inventario' },
      { id: 'compras', name: 'Facturas Compra', icon: ShoppingCart, codigo: 'facturas_compra' },
      { id: 'ventas', name: 'Facturas Venta', icon: Receipt, codigo: 'facturas_venta' },
      { id: 'suplidores', name: 'Suplidores', icon: Building2, codigo: 'suplidores' },
      { id: 'clientes', name: 'Clientes', icon: UserCheck, codigo: 'clientes' },
      { id: 'ventas-diarias', name: 'Ventas Diarias', icon: Store, codigo: 'ventas_diarias' },
      { id: 'cuentas-cobrar', name: 'Cuentas por Cobrar', icon: CreditCard, codigo: 'cuentas_cobrar' },
      { id: 'cuentas-pagar', name: 'Cuentas por Pagar', icon: Wallet, codigo: 'cuentas_pagar' },
      { id: 'utilidad', name: 'Utilidad Neta', icon: TrendingUp, codigo: 'utilidad_neta' },
      { id: 'libro-diario', name: 'Libro Diario', icon: BookOpen, codigo: 'libro_diario' },
      { id: 'cuadre-caja', name: 'Cuadre de Caja', icon: Calculator, codigo: 'cuadre_caja' },
      { id: 'gastos', name: 'Egresos/Gastos', icon: Receipt, codigo: 'gastos' },
      { id: 'activos-fijos', name: 'Activos Fijos', icon: Building, codigo: 'activos_fijos' },
      { id: 'servidor', name: 'Servidor', icon: Server, codigo: 'servidor' },
      { id: 'base-datos', name: 'Base de Datos', icon: Database, codigo: 'base_datos' },
      { id: 'usuarios', name: 'Usuarios', icon: Settings, codigo: 'gestion_usuarios' }
    ];

    // Filtrar módulos según permisos
    const navigation = todosLosModulos.filter(modulo => {
      // Módulos de Servidor y Base de Datos siempre visibles para TODOS
      if (modulo.codigo === 'servidor' || modulo.codigo === 'base_datos') {
        console.log('✅ Módulo de sistema incluido:', modulo.name);
        return true;
      }
      return tienePermiso(modulo.codigo, 'puede_ver');
    });

    console.log('📋 Total de módulos en navegación:', navigation.length);
    console.log('📋 Módulos disponibles:', navigation.map(m => m.name).join(', '));

    // Si estamos creando/editando una factura
    if (showNuevaFactura || editingFactura) {
      return (
        <NuevaFacturaFactoria
          user={user}
          facturaToEdit={editingFactura}
          onBack={() => {
            setShowNuevaFactura(false);
            setEditingFactura(null);
          }}
        />
      );
    }

    return (
      <>
        <div className="flex h-screen overflow-hidden bg-gradient-to-br from-gray-50 via-gray-100 to-gray-200">
        {/* Sidebar lateral izquierdo - Nuevo diseño moderno */}
        <aside className={`fixed left-0 top-0 h-full bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white shadow-2xl transition-all duration-300 z-50 backdrop-blur-xl ${
          sidebarCollapsed ? 'w-20' : 'w-80'
        }`}>
          {/* Efecto de brillo superior */}
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500"></div>
          
          {/* Header del sidebar */}
          <div className="p-5 border-b border-slate-700/50 backdrop-blur-sm">
            <div className="flex items-center justify-between">
              {!sidebarCollapsed && (
                <div className="flex items-center gap-3">
                  <div className="bg-gradient-to-br from-emerald-500 to-teal-600 p-2.5 rounded-xl shadow-lg ring-2 ring-emerald-400/30">
                    <img
                      src="https://sensible-spoonbill-485.convex.cloud/api/storage/12b5938f-3d8e-4f35-b6be-06dc9d878d6d"
                      alt="AGV Logo"
                      className="h-10 w-auto object-contain"
                    />
                  </div>
                  <div>
                    <h1 className="text-base font-bold bg-gradient-to-r from-emerald-400 to-teal-400 bg-clip-text text-transparent">
                      AGROVERDE
                    </h1>
                    <p className="text-xs text-slate-400 font-medium">Sistema de Gestión</p>
                  </div>
                </div>
              )}
              <button
                onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
                className="p-2 hover:bg-slate-700/50 rounded-lg transition-all duration-200 hover:scale-110 group"
              >
                <svg className={`w-5 h-5 transition-transform duration-300 group-hover:text-emerald-400 ${sidebarCollapsed ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
                </svg>
              </button>
            </div>
          </div>

          {/* Información del usuario */}
          {!sidebarCollapsed && (
            <div className="p-4 mx-3 mt-3 bg-gradient-to-br from-slate-800/80 to-slate-900/80 rounded-xl border border-slate-700/50 backdrop-blur-sm">
              <div className="flex items-center gap-3">
                <div className="relative">
                  <div className="w-12 h-12 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-xl flex items-center justify-center font-bold text-lg shadow-lg">
                    {(user.nombre_completo || user.nombre || user.username)?.charAt(0).toUpperCase()}
                  </div>
                  <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-emerald-500 rounded-full border-2 border-slate-800 animate-pulse"></div>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold truncate text-white">{user.nombre_completo || user.nombre || user.username}</p>
                  <p className="text-xs text-emerald-400 truncate font-medium">{user.roles?.nombre || user.tipo}</p>
                </div>
              </div>
            </div>
          )}

          {/* Navegación */}
          <nav className="flex-1 overflow-y-auto scrollbar-custom p-3 space-y-1.5 mt-2" style={{ maxHeight: 'calc(100vh - 240px)' }}>
            {navigation.map((item) => {
              const Icon = item.icon;
              const isActive = activeModule === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveModule(item.id)}
                  className={`group w-full flex items-center gap-3 px-4 py-3.5 rounded-xl font-medium text-sm transition-all duration-300 relative overflow-hidden ${
                    isActive
                      ? 'bg-gradient-to-r from-emerald-500 to-teal-600 text-white shadow-lg shadow-emerald-500/30 scale-[1.02]'
                      : 'text-slate-300 hover:bg-slate-800/50 hover:text-white hover:translate-x-1 hover:shadow-md'
                  }`}
                  title={sidebarCollapsed ? item.name : ''}
                >
                  {/* Efecto de brillo en hover */}
                  {!isActive && (
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700"></div>
                  )}
                  
                  <div className={`relative ${isActive ? 'animate-pulse' : ''}`}>
                    <Icon className={`w-5 h-5 flex-shrink-0 ${isActive ? 'drop-shadow-lg' : 'group-hover:scale-110 transition-transform duration-200'}`} />
                  </div>
                  
                  {!sidebarCollapsed && (
                    <span className="truncate relative z-10">{item.name}</span>
                  )}
                  
                  {isActive && !sidebarCollapsed && (
                    <div className="ml-auto flex items-center gap-1">
                      <div className="w-1.5 h-1.5 bg-white rounded-full animate-pulse"></div>
                      <div className="w-1.5 h-1.5 bg-white rounded-full animate-pulse delay-75"></div>
                      <div className="w-1.5 h-1.5 bg-white rounded-full animate-pulse delay-150"></div>
                    </div>
                  )}
                </button>
              );
            })}
          </nav>

          {/* Footer del sidebar */}
          <div className="p-3 border-t border-slate-700/50 backdrop-blur-sm">
            <button
              onClick={() => {
                localStorage.removeItem('user_session');
                setUser(null);
              }}
              className="group w-full flex items-center gap-3 px-4 py-3.5 text-slate-300 hover:bg-gradient-to-r hover:from-red-600 hover:to-red-700 hover:text-white rounded-xl transition-all duration-300 hover:shadow-lg hover:shadow-red-500/30 relative overflow-hidden"
              title={sidebarCollapsed ? 'Cerrar Sesión' : ''}
            >
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700"></div>
              <LogOut className="w-5 h-5 flex-shrink-0 group-hover:scale-110 transition-transform duration-200 relative z-10" />
              {!sidebarCollapsed && <span className="font-medium relative z-10">Cerrar Sesión</span>}
            </button>
          </div>
        </aside>

        {/* Contenedor principal */}
        <div className={`flex-1 flex flex-col transition-all duration-300 ${
          sidebarCollapsed ? 'ml-20' : 'ml-80'
        }`}>
          {/* Header superior - Nuevo diseño */}
          <header className="bg-white/80 backdrop-blur-xl shadow-sm border-b border-slate-200/50 px-6 py-5 sticky top-0 z-40">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-xl flex items-center justify-center shadow-lg shadow-emerald-500/30">
                  {navigation.find(item => item.id === activeModule)?.icon && 
                    (() => {
                      const Icon = navigation.find(item => item.id === activeModule).icon;
                      return <Icon className="w-6 h-6 text-white" />;
                    })()
                  }
                </div>
                <div>
                  <h2 className="text-2xl font-bold bg-gradient-to-r from-slate-800 to-slate-600 bg-clip-text text-transparent">
                    {navigation.find(item => item.id === activeModule)?.name || 'Dashboard'}
                  </h2>
                  <p className="text-sm text-slate-500 font-medium">Gestión y administración del módulo</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="px-4 py-2 bg-gradient-to-r from-emerald-50 to-teal-50 rounded-lg border border-emerald-200/50">
                  <p className="text-sm text-slate-700 font-medium">
                    {new Date().toLocaleDateString('es-DO', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                  </p>
                </div>
                
                {/* Botón de Asistente IA */}
                <button
                  onClick={() => setActiveModule('asistente-ia')}
                  className="group relative px-4 py-2 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white rounded-lg shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105 flex items-center gap-2"
                >
                  <Sparkles className="w-5 h-5 animate-pulse" />
                  <span className="font-semibold">Asistente IA</span>
                  <div className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full animate-bounce"></div>
                </button>
              </div>
            </div>
          </header>

          {/* Contenido del módulo activo */}
          <main className="flex-1 overflow-y-auto bg-gradient-to-br from-gray-50 via-gray-100 to-gray-200">
        {activeModule === 'pesadas' && (
          <Dashboard user={user} onLogout={() => {
            localStorage.removeItem('user_session');
            setUser(null);
          }} />
        )}

        {activeModule === 'facturas' && (
          <ListaFacturasFactoria
            user={user}
            onNuevaFactura={() => setShowNuevaFactura(true)}
            onEditarFactura={(factura) => setEditingFactura(factura)}
          />
        )}

        {activeModule === 'comparacion' && (
          <ComparacionPesadasFacturas user={user} />
        )}

        {activeModule === 'compensacion' && (
          <CompensacionCuentas user={user} />
        )}

        {activeModule === 'compensacion-pesadas' && (
          <CompensacionPesadas user={user} />
        )}

        {activeModule === 'flete' && (
          <RegistroFlete user={user} />
        )}

        {activeModule === 'obreros' && (
          <PagoObreros user={user} />
        )}

        {activeModule === 'prestamos' && (
          <Prestamos user={user} />
        )}

        {activeModule === 'inventario' && (
          <Inventario user={user} />
        )}

        {activeModule === 'compras' && (
          <FacturasCompra user={user} />
        )}

        {activeModule === 'ventas' && (
          <FacturasVenta user={user} />
        )}

        {activeModule === 'suplidores' && (
          <Suplidores user={user} />
        )}

        {activeModule === 'clientes' && (
          <Clientes user={user} />
        )}

        {activeModule === 'ventas-diarias' && (
          <VentasDiarias user={user} />
        )}

        {activeModule === 'cuentas-cobrar' && (
          <CuentasPorCobrar user={user} />
        )}

        {activeModule === 'cuentas-pagar' && (
          <CuentasPorPagar user={user} />
        )}

        {activeModule === 'utilidad' && (
          <UtilidadNeta user={user} />
        )}

        {activeModule === 'libro-diario' && (
          <LibroDiario user={user} />
        )}

        {activeModule === 'cuadre-caja' && (
          <CuadreCaja user={user} />
        )}

        {activeModule === 'gastos' && (
          <Gastos user={user} />
        )}

        {activeModule === 'activos-fijos' && (
          <ActivosFijos user={user} />
        )}

        {activeModule === 'asistente-ia' && (
          <AsistenteIA user={user} />
        )}

        {activeModule === 'servidor' && (
          <Servidor user={user} />
        )}

        {activeModule === 'base-datos' && (
          <BaseDatos user={user} />
        )}

        {activeModule === 'usuarios' && (
          <GestionUsuarios user={user} />
        )}

        {activeModule === 'diagnostico' && (
          <DiagnosticoUsuarios />
        )}
          </main>
        </div>
      </div>
      </>
    );
  }

  if (mode === 'register') {
    return (
      <Register
        onRegister={(userData) => setUser(userData)}
        onToggleMode={() => setMode('login')}
      />
    );
  }

  return (
    <Login
      onLogin={(userData) => setUser(userData)}
      onToggleMode={() => setMode('register')}
    />
  );
}
