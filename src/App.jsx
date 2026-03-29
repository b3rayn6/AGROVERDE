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
import NuevaPesada from './components/NuevaPesada';
import { FileText, Scale, GitCompare, Truck, Users, DollarSign, LogOut, Package, ShoppingCart, Building2, Receipt, UserCheck, Store, CreditCard, Wallet, TrendingUp, Settings, BookOpen, Calculator, Building } from 'lucide-react';
export default function App() {
  const [user, setUser] = useState(null);
  const [mode, setMode] = useState('login');
  const [activeModule, setActiveModule] = useState('pesadas');
  const [showNuevaFactura, setShowNuevaFactura] = useState(false);
  const [editingFactura, setEditingFactura] = useState(null);
  const [loadingSession, setLoadingSession] = useState(true);
  const [resetKey, setResetKey] = useState(0);

  // Cargar sesión guardada al iniciar
  useEffect(() => {
    const loadSavedSession = async () => {
      try {
        const savedSession = localStorage.getItem('user_session');
        if (savedSession) {
          const userData = JSON.parse(savedSession);

          // Verificar que el usuario sigue activo (opcional, para usuarios del sistema)
          if (userData.tipo === 'sistema') {
            try {
              const {
                data: usuarioActualizado,
                error
              } = await supabase.from('usuarios_sistema').select('*, roles(nombre)').eq('id', userData.id).eq('activo', true).single();
              if (usuarioActualizado && !error) {
                // Recargar permisos - usar left join para incluir todos los permisos incluso si el módulo no existe
                const {
                  data: permisosRaw
                } = await supabase.from('permisos_usuario').select('*, modulos(codigo, nombre)').eq('usuario_id', userData.id);
                const permisos = permisosRaw?.map(p => ({
                  ...p,
                  modulos: p.modulos || {
                    codigo: 'unknown',
                    nombre: 'Unknown'
                  }
                })) || [];
                setUser({
                  ...usuarioActualizado,
                  permisos,
                  tipo: 'sistema'
                });
              } else {
                // Usuario desactivado, limpiar sesión
                localStorage.removeItem('user_session');
              }
            } catch (error) {
              console.error('Error verificando sesión:', error);
              // Si hay error, usar la sesión guardada de todos modos
              setUser(userData);
            }
          } else {
            // Usuario legacy, usar sesión guardada directamente
            setUser(userData);
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
    return <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Cargando...</p>
        </div>
      </div>;
  }
  if (user) {
    // 🔒 RESTRICTED ACCESS FOR joel@pesador.com
    if (user.email?.toLowerCase() === 'joel@pesador.com') {
      return <div className="overflow-x-hidden max-w-full w-full min-h-screen bg-gray-50 flex flex-col">
          <header className="sticky top-0 z-50 bg-white shadow-sm border-b border-gray-200 overflow-x-hidden">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full">
              <div className="flex items-center justify-between py-4" style={{
              color: "rgb(13, 13, 13)",
              backgroundColor: "rgba(0, 0, 0, 0)",
              fontSize: "20px",
              fontFamily: "Tahoma, sans-serif",
              fontWeight: "400",
              textAlign: "start",
              margin: "0px",
              marginTop: "0px",
              marginRight: "0px",
              marginBottom: "0px",
              marginLeft: "0px",
              padding: "16px 0px",
              paddingTop: "16px",
              paddingRight: "0px",
              paddingBottom: "16px",
              paddingLeft: "0px",
              borderRadius: "0px",
              border: "0px inset rgb(229, 231, 235)",
              borderWidth: "0px",
              borderColor: "rgb(229, 231, 235)",
              borderStyle: "inset",
              width: "1216.01px",
              height: "58.9813px",
              display: "flex",
              position: "static",
              top: "auto",
              right: "auto",
              bottom: "auto",
              left: "auto"
            }}>
                <div>
                  <div style={{
                  color: "rgb(13, 13, 13)",
                  fontSize: "18px",
                  fontFamily: "Tahoma, sans-serif",
                  fontWeight: "400"
                }}>AGROVERDE/AGVSRL</div>
                  <p className="text-xs text-gray-500">Sistema ERP - Pesador</p>
                </div>
                <button onClick={() => {
                localStorage.removeItem('user_session');
                setUser(null);
              }} className="flex items-center gap-2 px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors">
                  <LogOut className="w-5 h-5" />
                  <span className="hidden sm:inline">Salir</span>
                </button>
              </div>

              {/* Navegación Limitada - Solo Pesadas */}
              <nav className="flex gap-1 -mb-px overflow-x-auto overflow-y-hidden scrollbar-hide">
                <button className="flex items-center gap-2 px-4 py-3 border-b-2 font-medium text-sm transition-colors whitespace-nowrap border-green-600 text-green-600" onClick={() => {}} // No hace nada o recarga
              >
                  <Scale className="w-5 h-5" />
                  <span className="hidden sm:inline">Pesadas</span>
                </button>
              </nav>
            </div>
          </header>
          
          <main className="flex-1 p-4 flex items-start justify-center">
            <NuevaPesada key={resetKey} user={user} isModal={false} onSuccess={() => {
            // Re-mount component to reset form
            setResetKey(prev => prev + 1);
          }} onClose={() => {
            if (confirm('¿Estás seguro de limpiar el formulario? Se perderán los datos ingresados.')) {
              setResetKey(prev => prev + 1);
            }
          }} />
          </main>
        </div>;
    }

    // Verificar permisos del usuario
    const tienePermiso = (codigoModulo, accion = 'puede_ver') => {
      // Usuarios legacy tienen acceso completo
      if (user.tipo === 'legacy') return true;

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
    const todosLosModulos = [{
      id: 'pesadas',
      name: 'Pesadas',
      icon: Scale,
      codigo: 'pesadas'
    }, {
      id: 'facturas',
      name: 'Facturas Factoría',
      icon: FileText,
      codigo: 'facturas_factoria'
    }, {
      id: 'comparacion',
      name: 'Comparación',
      icon: GitCompare,
      codigo: 'facturas_factoria'
    }, {
      id: 'compensacion',
      name: 'Compensación Cuentas',
      icon: DollarSign,
      codigo: 'compensacion_cuentas'
    }, {
      id: 'compensacion-pesadas',
      name: 'Pagar con Pesadas',
      icon: Scale,
      codigo: 'compensacion_pesadas'
    }, {
      id: 'flete',
      name: 'Registro de Flete',
      icon: Truck,
      codigo: 'fletes_obreros'
    }, {
      id: 'obreros',
      name: 'Pago de Obreros',
      icon: Users,
      codigo: 'fletes_obreros'
    }, {
      id: 'prestamos',
      name: 'Financiamientos',
      icon: DollarSign,
      codigo: 'prestamos'
    }, {
      id: 'inventario',
      name: 'Inventario',
      icon: Package,
      codigo: 'inventario'
    }, {
      id: 'compras',
      name: 'Facturas Compra',
      icon: ShoppingCart,
      codigo: 'facturas_compra'
    }, {
      id: 'ventas',
      name: 'Facturas Venta',
      icon: Receipt,
      codigo: 'facturas_venta'
    }, {
      id: 'suplidores',
      name: 'Suplidores',
      icon: Building2,
      codigo: 'suplidores'
    }, {
      id: 'clientes',
      name: 'Clientes',
      icon: UserCheck,
      codigo: 'clientes'
    }, {
      id: 'ventas-diarias',
      name: 'Ventas Diarias',
      icon: Store,
      codigo: 'ventas_diarias'
    }, {
      id: 'cuentas-cobrar',
      name: 'Cuentas por Cobrar',
      icon: CreditCard,
      codigo: 'cuentas_cobrar'
    }, {
      id: 'cuentas-pagar',
      name: 'Cuentas por Pagar',
      icon: Wallet,
      codigo: 'cuentas_pagar'
    }, {
      id: 'utilidad',
      name: 'Utilidad Neta',
      icon: TrendingUp,
      codigo: 'utilidad_neta'
    }, {
      id: 'libro-diario',
      name: 'Libro Diario',
      icon: BookOpen,
      codigo: 'libro_diario'
    }, {
      id: 'cuadre-caja',
      name: 'Cuadre de Caja',
      icon: Calculator,
      codigo: 'cuadre_caja'
    }, {
      id: 'gastos',
      name: 'Egresos/Gastos',
      icon: Receipt,
      codigo: 'gastos'
    }, {
      id: 'activos-fijos',
      name: 'Activos Fijos',
      icon: Building,
      codigo: 'activos_fijos'
    }, {
      id: 'usuarios',
      name: 'Usuarios',
      icon: Settings,
      codigo: 'gestion_usuarios'
    }];

    // Filtrar módulos según permisos
    const navigation = todosLosModulos.filter(modulo => tienePermiso(modulo.codigo, 'puede_ver'));

    // Si estamos creando/editando una factura
    if (showNuevaFactura || editingFactura) {
      return <NuevaFacturaFactoria user={user} facturaToEdit={editingFactura} onBack={() => {
        setShowNuevaFactura(false);
        setEditingFactura(null);
      }} />;
    }
    return <div className="overflow-x-hidden max-w-full w-full">
        {/* Header con navegación */}
        <header className="sticky top-0 z-50 bg-white shadow-sm border-b border-gray-200 overflow-x-hidden">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full">
            <div className="flex items-center justify-between py-4" style={{
            color: "rgb(13, 13, 13)",
            backgroundColor: "rgba(0, 0, 0, 0)",
            fontSize: "18px",
            fontFamily: "Tahoma, sans-serif",
            fontWeight: "400",
            textAlign: "start",
            margin: "0px",
            marginTop: "0px",
            marginRight: "0px",
            marginBottom: "0px",
            marginLeft: "0px",
            padding: "16px 0px",
            paddingTop: "16px",
            paddingRight: "0px",
            paddingBottom: "16px",
            paddingLeft: "0px",
            borderRadius: "0px",
            border: "0px solid rgb(229, 231, 235)",
            borderWidth: "0px",
            borderColor: "rgb(229, 231, 235)",
            borderStyle: "solid",
            width: "1216.01px",
            height: "58.9813px",
            display: "flex",
            position: "static",
            top: "auto",
            right: "auto",
            bottom: "auto",
            left: "auto"
          }}>AGROVERDE/AGVSRL </div>

            {/* Menú de navegación */}
            <nav className="flex gap-1 -mb-px overflow-x-auto overflow-y-hidden scrollbar-hide">
              {navigation.map(item => {
              const Icon = item.icon;
              const isActive = activeModule === item.id;
              return <button key={item.id} onClick={() => setActiveModule(item.id)} className={`flex items-center gap-2 px-4 py-3 border-b-2 font-medium text-sm transition-colors whitespace-nowrap ${isActive ? 'border-green-600 text-green-600' : 'border-transparent text-gray-600 hover:text-gray-800 hover:border-gray-300'}`}>
                    <Icon className="w-5 h-5" />
                    <span className="hidden sm:inline">{item.name}</span>
                  </button>;
            })}
            </nav>
          </div>
        </header>

        {/* Contenido del módulo activo */}
        {activeModule === 'pesadas' && <Dashboard user={user} onLogout={() => {
        localStorage.removeItem('user_session');
        setUser(null);
      }} />}

        {activeModule === 'facturas' && <ListaFacturasFactoria user={user} onNuevaFactura={() => setShowNuevaFactura(true)} onEditarFactura={factura => setEditingFactura(factura)} />}

        {activeModule === 'comparacion' && <ComparacionPesadasFacturas user={user} />}

        {activeModule === 'compensacion' && <CompensacionCuentas user={user} />}

        {activeModule === 'compensacion-pesadas' && <CompensacionPesadas user={user} />}

        {activeModule === 'flete' && <RegistroFlete user={user} />}

        {activeModule === 'obreros' && <PagoObreros user={user} />}

        {activeModule === 'prestamos' && <Prestamos user={user} />}

        {activeModule === 'inventario' && <Inventario user={user} />}

        {activeModule === 'compras' && <FacturasCompra user={user} />}

        {activeModule === 'ventas' && <FacturasVenta user={user} />}

        {activeModule === 'suplidores' && <Suplidores user={user} />}

        {activeModule === 'clientes' && <Clientes user={user} />}

        {activeModule === 'ventas-diarias' && <VentasDiarias user={user} />}

        {activeModule === 'cuentas-cobrar' && <CuentasPorCobrar user={user} />}

        {activeModule === 'cuentas-pagar' && <CuentasPorPagar user={user} />}

        {activeModule === 'utilidad' && <UtilidadNeta user={user} />}

        {activeModule === 'libro-diario' && <LibroDiario user={user} />}

        {activeModule === 'cuadre-caja' && <CuadreCaja user={user} />}

        {activeModule === 'gastos' && <Gastos user={user} />}

        {activeModule === 'activos-fijos' && <ActivosFijos user={user} />}

        {activeModule === 'usuarios' && <GestionUsuarios user={user} />}
      </div>;
  }
  if (mode === 'register') {
    return <Register onRegister={userData => setUser(userData)} onToggleMode={() => setMode('login')} />;
  }
  return <Login onLogin={userData => setUser(userData)} onToggleMode={() => setMode('register')} />;
}