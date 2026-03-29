import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { formatCurrency } from '../lib/formatters';
import { Package, Plus, Search, Edit, Trash2, Download, Eye, Wrench, TrendingDown, AlertCircle, DollarSign, Calendar, MapPin, FileText, Upload, X, CheckCircle } from 'lucide-react';
import JSZip from 'jszip';

export default function ActivosFijos({ user }) {
  const [activos, setActivos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filtroCategoria, setFiltroCategoria] = useState('todos');
  const [filtroEstado, setFiltroEstado] = useState('todos');
  const [showModal, setShowModal] = useState(false);
  const [showDepreciacionModal, setShowDepreciacionModal] = useState(false);
  const [showMantenimientoModal, setShowMantenimientoModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [activoSeleccionado, setActivoSeleccionado] = useState(null);
  const [mantenimientos, setMantenimientos] = useState([]);
  const [importFile, setImportFile] = useState(null);
  const [importLoading, setImportLoading] = useState(false);
  const [importProgress, setImportProgress] = useState('');
  const [importError, setImportError] = useState('');
  const [importSuccess, setImportSuccess] = useState(false);
  const [formData, setFormData] = useState({
    codigo: '',
    nombre: '',
    categoria: 'Vehículos',
    descripcion: '',
    fecha_adquisicion: '',
    costo_adquisicion: '',
    moneda: 'DOP',
    vida_util_anos: '',
    valor_residual: '',
    metodo_depreciacion: 'lineal',
    ubicacion: '',
    estado: 'activo',
    proveedor: '',
    numero_serie: '',
    numero_factura: '',
    notas: ''
  });
  const [mantenimientoData, setMantenimientoData] = useState({
    tipo_mantenimiento: 'Preventivo',
    fecha_mantenimiento: '',
    descripcion: '',
    costo: '',
    moneda: 'DOP',
    proveedor: '',
    proximo_mantenimiento: '',
    realizado_por: ''
  });

  const categorias = ['Vehículos', 'Maquinaria', 'Edificios', 'Equipos', 'Mobiliario', 'Tecnología', 'Herramientas', 'Otros'];
  const estados = ['activo', 'en_mantenimiento', 'inactivo', 'vendido', 'desechado'];

  useEffect(() => {
    cargarActivos();
  }, []);

  const cargarActivos = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('activos_fijos')
        .select('*')
        .order('fecha_adquisicion', { ascending: false });

      if (error) throw error;

      // Calcular depreciación y valor en libros
      const activosConDepreciacion = data.map(activo => {
        const depreciacion = calcularDepreciacion(activo);
        return {
          ...activo,
          depreciacion_acumulada: depreciacion.acumulada,
          valor_en_libros: depreciacion.valorLibros
        };
      });

      setActivos(activosConDepreciacion);
    } catch (error) {
      console.error('Error al cargar activos:', error);
      alert('Error al cargar activos fijos');
    } finally {
      setLoading(false);
    }
  };

  const calcularDepreciacion = (activo) => {
    const fechaAdquisicion = new Date(activo.fecha_adquisicion);
    const hoy = new Date();
    const mesesTranscurridos = (hoy.getFullYear() - fechaAdquisicion.getFullYear()) * 12 + (hoy.getMonth() - fechaAdquisicion.getMonth());
    
    const costoDepreciable = activo.costo_adquisicion - (activo.valor_residual || 0);
    const vidaUtilMeses = activo.vida_util_anos * 12;
    const depreciacionMensual = costoDepreciable / vidaUtilMeses;
    const depreciacionAcumulada = Math.min(depreciacionMensual * mesesTranscurridos, costoDepreciable);
    const valorEnLibros = activo.costo_adquisicion - depreciacionAcumulada;

    return {
      mensual: depreciacionMensual,
      acumulada: depreciacionAcumulada,
      valorLibros: Math.max(valorEnLibros, activo.valor_residual || 0)
    };
  };

  const cargarMantenimientos = async (activoId) => {
    try {
      const { data, error } = await supabase
        .from('mantenimientos_activos')
        .select('*')
        .eq('activo_id', activoId)
        .order('fecha_mantenimiento', { ascending: false });

      if (error) throw error;
      setMantenimientos(data || []);
    } catch (error) {
      console.error('Error al cargar mantenimientos:', error);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const datosActivo = {
        ...formData,
        costo_adquisicion: parseFloat(formData.costo_adquisicion),
        vida_util_anos: parseInt(formData.vida_util_anos),
        valor_residual: parseFloat(formData.valor_residual) || 0,
        usuario_registro: user?.email || 'Admin'
      };

      if (activoSeleccionado) {
        const { error } = await supabase
          .from('activos_fijos')
          .update(datosActivo)
          .eq('id', activoSeleccionado.id);

        if (error) throw error;
        alert('Activo actualizado exitosamente');
      } else {
        const { error } = await supabase
          .from('activos_fijos')
          .insert([datosActivo]);

        if (error) throw error;
        alert('Activo registrado exitosamente');
      }

      setShowModal(false);
      setActivoSeleccionado(null);
      resetForm();
      cargarActivos();
    } catch (error) {
      console.error('Error al guardar activo:', error);
      alert('Error al guardar el activo: ' + error.message);
    }
  };

  const handleMantenimientoSubmit = async (e) => {
    e.preventDefault();
    try {
      const datosMantenimiento = {
        activo_id: activoSeleccionado.id,
        ...mantenimientoData,
        costo: parseFloat(mantenimientoData.costo)
      };

      const { error } = await supabase
        .from('mantenimientos_activos')
        .insert([datosMantenimiento]);

      if (error) throw error;

      alert('Mantenimiento registrado exitosamente');
      setShowMantenimientoModal(false);
      resetMantenimientoForm();
      cargarMantenimientos(activoSeleccionado.id);
    } catch (error) {
      console.error('Error al registrar mantenimiento:', error);
      alert('Error al registrar mantenimiento: ' + error.message);
    }
  };

  const eliminarActivo = async (id) => {
    if (!confirm('¿Está seguro de eliminar este activo?')) return;
    
    try {
      const { error } = await supabase
        .from('activos_fijos')
        .delete()
        .eq('id', id);

      if (error) throw error;
      alert('Activo eliminado exitosamente');
      cargarActivos();
    } catch (error) {
      console.error('Error al eliminar activo:', error);
      alert('Error al eliminar activo');
    }
  };

  const resetForm = () => {
    setFormData({
      codigo: '',
      nombre: '',
      categoria: 'Vehículos',
      descripcion: '',
      fecha_adquisicion: '',
      costo_adquisicion: '',
      moneda: 'DOP',
      vida_util_anos: '',
      valor_residual: '',
      metodo_depreciacion: 'lineal',
      ubicacion: '',
      estado: 'activo',
      proveedor: '',
      numero_serie: '',
      numero_factura: '',
      notas: ''
    });
  };

  const resetMantenimientoForm = () => {
    setMantenimientoData({
      tipo_mantenimiento: 'Preventivo',
      fecha_mantenimiento: '',
      descripcion: '',
      costo: '',
      moneda: 'DOP',
      proveedor: '',
      proximo_mantenimiento: '',
      realizado_por: ''
    });
  };

  const abrirModalEditar = (activo) => {
    setActivoSeleccionado(activo);
    setFormData({
      codigo: activo.codigo,
      nombre: activo.nombre,
      categoria: activo.categoria,
      descripcion: activo.descripcion || '',
      fecha_adquisicion: activo.fecha_adquisicion,
      costo_adquisicion: activo.costo_adquisicion,
      moneda: activo.moneda,
      vida_util_anos: activo.vida_util_anos,
      valor_residual: activo.valor_residual || 0,
      metodo_depreciacion: activo.metodo_depreciacion,
      ubicacion: activo.ubicacion || '',
      estado: activo.estado,
      proveedor: activo.proveedor || '',
      numero_serie: activo.numero_serie || '',
      numero_factura: activo.numero_factura || '',
      notas: activo.notas || ''
    });
    setShowModal(true);
  };

  const abrirModalDepreciacion = (activo) => {
    setActivoSeleccionado(activo);
    setShowDepreciacionModal(true);
  };

  const abrirModalMantenimiento = async (activo) => {
    setActivoSeleccionado(activo);
    await cargarMantenimientos(activo.id);
    setShowMantenimientoModal(true);
  };

  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Validar tamaño (máx 10MB)
    if (file.size > 10 * 1024 * 1024) {
      setImportError('El archivo es demasiado grande. Máximo 10MB.');
      return;
    }

    // Validar extensión
    const extension = file.name.split('.').pop().toLowerCase();
    if (extension !== 'sql' && extension !== 'zip') {
      setImportError('Formato no soportado. Solo se permiten archivos .sql o .zip');
      return;
    }

    setImportFile(file);
    setImportError('');
    setImportSuccess(false);
  };

  const handleImportFile = async () => {
    if (!importFile) return;

    setImportLoading(true);
    setImportError('');
    setImportProgress('Leyendo archivo...');

    // Timeout de seguridad (30 segundos)
    const timeoutId = setTimeout(() => {
      if (importLoading) {
        setImportLoading(false);
        setImportError('El proceso de importación está tomando demasiado tiempo. Por favor, intenta con un archivo más pequeño o ejecuta el SQL manualmente en Supabase.');
        setImportProgress('');
      }
    }, 30000);

    try {
      const extension = importFile.name.split('.').pop().toLowerCase();
      let sqlContent = '';

      if (extension === 'zip') {
        setImportProgress('Extrayendo archivo ZIP...');
        const zip = new JSZip();
        const zipData = await importFile.arrayBuffer();
        const zipContents = await zip.loadAsync(zipData);
        
        // Buscar archivos SQL en el ZIP
        const sqlFiles = Object.keys(zipContents.files).filter(name => 
          name.toLowerCase().endsWith('.sql')
        );
        
        if (sqlFiles.length === 0) {
          throw new Error('No se encontraron archivos SQL en el ZIP.');
        }
        
        setImportProgress(`Encontrado(s) ${sqlFiles.length} archivo(s) SQL. Extrayendo...`);
        
        // Leer el primer archivo SQL encontrado (o todos si hay múltiples)
        const sqlFilePromises = sqlFiles.map(async (fileName) => {
          const file = zipContents.files[fileName];
          return await file.async('string');
        });
        
        const sqlContents = await Promise.all(sqlFilePromises);
        sqlContent = sqlContents.join('\n\n');
      } else {
        setImportProgress('Leyendo contenido SQL...');
        sqlContent = await importFile.text();
      }

      if (!sqlContent || sqlContent.trim().length === 0) {
        throw new Error('El archivo está vacío o no se pudo leer correctamente.');
      }

      setImportProgress('Procesando consultas SQL...');
      
      // Dividir el contenido en consultas individuales
      const queries = sqlContent
        .split(';')
        .map(q => q.trim())
        .filter(q => q.length > 0 && !q.startsWith('--') && !q.startsWith('/*'));

      setImportProgress(`Analizando ${queries.length} consulta(s)...`);

      // Nota: Supabase no permite ejecutar SQL arbitrario desde el cliente por seguridad
      // Las consultas CREATE TABLE, ALTER TABLE, etc. deben ejecutarse desde el panel de Supabase
      // o mediante funciones RPC específicas configuradas en el servidor
      
      // Por ahora, validamos y mostramos el contenido
      const validQueries = queries.filter(q => q.length >= 10);
      
      setImportProgress(`Se encontraron ${validQueries.length} consulta(s) válida(s).`);
      
      // Intentar ejecutar solo INSERT, UPDATE, DELETE que puedan funcionar
      let successCount = 0;
      let errorCount = 0;
      const skippedQueries = [];

      for (let i = 0; i < validQueries.length; i++) {
        const query = validQueries[i];
        const queryLower = query.toLowerCase().trim();
        
        // Saltar CREATE, ALTER, DROP, etc. que requieren permisos de administrador
        if (queryLower.startsWith('create ') || 
            queryLower.startsWith('alter ') || 
            queryLower.startsWith('drop ') ||
            queryLower.startsWith('truncate ') ||
            queryLower.startsWith('grant ') ||
            queryLower.startsWith('revoke ')) {
          skippedQueries.push(`Consulta ${i + 1}: ${query.substring(0, 50)}... (requiere permisos de administrador)`);
          continue;
        }

        // Intentar ejecutar INSERT, UPDATE, DELETE
        if (queryLower.startsWith('insert ') || 
            queryLower.startsWith('update ') || 
            queryLower.startsWith('delete ')) {
          try {
            setImportProgress(`Ejecutando consulta ${i + 1} de ${validQueries.length}...`);
            
            // Nota: Estas consultas también pueden fallar por permisos
            // En producción, deberías usar funciones RPC específicas
            const { error } = await supabase.rpc('exec_sql', { sql_query: query });
            
            if (error) {
              // Si no existe la función RPC, la consulta no se puede ejecutar desde el cliente
              throw new Error('Función RPC no disponible');
            }
            
            successCount++;
          } catch (queryError) {
            console.warn(`No se pudo ejecutar la consulta ${i + 1}:`, queryError);
            errorCount++;
            skippedQueries.push(`Consulta ${i + 1}: ${query.substring(0, 50)}... (error: ${queryError.message})`);
          }
        } else {
          skippedQueries.push(`Consulta ${i + 1}: ${query.substring(0, 50)}... (tipo no soportado desde cliente)`);
        }
      }

      setImportProgress('');
      
      // Mostrar resultado
      if (successCount > 0 || errorCount === 0) {
        setImportSuccess(true);
        
        if (skippedQueries.length > 0) {
          const message = `Se procesaron ${validQueries.length} consultas. ` +
            `${successCount} ejecutadas exitosamente. ` +
            `${skippedQueries.length} requieren ejecución manual en el panel de Supabase.`;
          setImportError(message);
        }
      } else {
        throw new Error(
          `No se pudieron ejecutar las consultas desde el cliente. ` +
          `Por favor, ejecuta el SQL manualmente en el panel de Supabase (SQL Editor). ` +
          `Esto es normal para consultas CREATE TABLE, ALTER TABLE, etc.`
        );
      }
    } catch (error) {
      console.error('Error al importar archivo:', error);
      setImportError(error.message || 'Error al procesar el archivo. Por favor, verifica que el archivo sea válido.');
      setImportProgress('');
    } finally {
      clearTimeout(timeoutId);
      setImportLoading(false);
    }
  };

  const activosFiltrados = activos.filter(activo => {
    const matchSearch = activo.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
                       activo.codigo.toLowerCase().includes(searchTerm.toLowerCase());
    const matchCategoria = filtroCategoria === 'todos' || activo.categoria === filtroCategoria;
    const matchEstado = filtroEstado === 'todos' || activo.estado === filtroEstado;
    return matchSearch && matchCategoria && matchEstado;
  });

  const totales = activosFiltrados.reduce((acc, activo) => {
    const moneda = activo.moneda;
    if (!acc[moneda]) {
      acc[moneda] = {
        costoAdquisicion: 0,
        depreciacionAcumulada: 0,
        valorLibros: 0
      };
    }
    acc[moneda].costoAdquisicion += activo.costo_adquisicion;
    acc[moneda].depreciacionAcumulada += activo.depreciacion_acumulada || 0;
    acc[moneda].valorLibros += activo.valor_en_libros || 0;
    return acc;
  }, {});

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Cargando activos fijos...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-800">Activos Fijos / PPE</h1>
          <p className="text-sm text-gray-600">Propiedad, Planta y Equipo</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setShowImportModal(true)}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center gap-2"
          >
            <Upload className="w-5 h-5" />
            Importar SQL
          </button>
          <button
            onClick={() => {
              setActivoSeleccionado(null);
              resetForm();
              setShowModal(true);
            }}
            className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 flex items-center gap-2"
          >
            <Plus className="w-5 h-5" />
            Nuevo Activo
          </button>
        </div>
      </div>

      {/* Tarjetas de resumen */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        {Object.entries(totales).map(([moneda, datos]) => (
          <div key={moneda} className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg shadow-lg p-6 text-white">
            <div className="flex items-center justify-between mb-3">
              <div>
                <p className="text-blue-100 text-sm font-medium">Total {moneda}</p>
                <p className="text-2xl font-bold mt-1">
                  {formatCurrency(datos.valorLibros, moneda)}
                </p>
              </div>
              <Package className="w-10 h-10 text-blue-200" />
            </div>
            <div className="border-t border-blue-400 pt-2 space-y-1">
              <p className="text-blue-100 text-xs">
                Costo: {formatCurrency(datos.costoAdquisicion, moneda)}
              </p>
              <p className="text-blue-100 text-xs">
                Depreciación: {formatCurrency(datos.depreciacionAcumulada, moneda)}
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* Filtros */}
      <div className="bg-white rounded-lg shadow-md p-4 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Buscar por nombre o código..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
            />
          </div>
          <select
            value={filtroCategoria}
            onChange={(e) => setFiltroCategoria(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
          >
            <option value="todos">Todas las categorías</option>
            {categorias.map(cat => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>
          <select
            value={filtroEstado}
            onChange={(e) => setFiltroEstado(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
          >
            <option value="todos">Todos los estados</option>
            {estados.map(est => (
              <option key={est} value={est}>{est.replace('_', ' ').toUpperCase()}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Tabla de activos */}
      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Código</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Activo</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Categoría</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Adquisición</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Costo</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Valor Libros</th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Estado</th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Acciones</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {activosFiltrados.map((activo) => (
                <tr key={activo.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {activo.codigo}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-900">
                    <div>
                      <p className="font-medium">{activo.nombre}</p>
                      <p className="text-xs text-gray-500">{activo.ubicacion}</p>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {activo.categoria}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {new Date(activo.fecha_adquisicion).toLocaleDateString('es-DO')}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right font-medium">
                    {formatCurrency(activo.costo_adquisicion, activo.moneda)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-green-600 text-right font-bold">
                    {formatCurrency(activo.valor_en_libros || 0, activo.moneda)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-center">
                    <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                      activo.estado === 'activo' ? 'bg-green-100 text-green-800' :
                      activo.estado === 'en_mantenimiento' ? 'bg-yellow-100 text-yellow-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {activo.estado.replace('_', ' ').toUpperCase()}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-center text-sm font-medium">
                    <div className="flex items-center justify-center gap-2">
                      <button
                        onClick={() => abrirModalDepreciacion(activo)}
                        className="text-purple-600 hover:text-purple-800"
                        title="Ver depreciación"
                      >
                        <TrendingDown className="w-5 h-5" />
                      </button>
                      <button
                        onClick={() => abrirModalMantenimiento(activo)}
                        className="text-orange-600 hover:text-orange-800"
                        title="Mantenimientos"
                      >
                        <Wrench className="w-5 h-5" />
                      </button>
                      <button
                        onClick={() => abrirModalEditar(activo)}
                        className="text-blue-600 hover:text-blue-800"
                        title="Editar"
                      >
                        <Edit className="w-5 h-5" />
                      </button>
                      <button
                        onClick={() => eliminarActivo(activo.id)}
                        className="text-red-600 hover:text-red-800"
                        title="Eliminar"
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal de nuevo/editar activo */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4">
              <h2 className="text-2xl font-bold text-gray-800">
                {activoSeleccionado ? 'Editar Activo Fijo' : 'Nuevo Activo Fijo'}
              </h2>
            </div>

            <form onSubmit={handleSubmit} className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Código *</label>
                  <input
                    type="text"
                    required
                    value={formData.codigo}
                    onChange={(e) => setFormData({ ...formData, codigo: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Nombre *</label>
                  <input
                    type="text"
                    required
                    value={formData.nombre}
                    onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Categoría *</label>
                  <select
                    required
                    value={formData.categoria}
                    onChange={(e) => setFormData({ ...formData, categoria: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                  >
                    {categorias.map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Fecha Adquisición *</label>
                  <input
                    type="date"
                    required
                    value={formData.fecha_adquisicion}
                    onChange={(e) => setFormData({ ...formData, fecha_adquisicion: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Costo Adquisición *</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={formData.costo_adquisicion}
                    onChange={(e) => setFormData({ ...formData, costo_adquisicion: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Moneda *</label>
                  <select
                    required
                    value={formData.moneda}
                    onChange={(e) => setFormData({ ...formData, moneda: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                  >
                    <option value="DOP">Pesos (DOP)</option>
                    <option value="USD">Dólares (USD)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Vida Útil (años) *</label>
                  <input
                    type="number"
                    required
                    value={formData.vida_util_anos}
                    onChange={(e) => setFormData({ ...formData, vida_util_anos: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Valor Residual</label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.valor_residual}
                    onChange={(e) => setFormData({ ...formData, valor_residual: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Ubicación</label>
                  <input
                    type="text"
                    value={formData.ubicacion}
                    onChange={(e) => setFormData({ ...formData, ubicacion: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Estado *</label>
                  <select
                    required
                    value={formData.estado}
                    onChange={(e) => setFormData({ ...formData, estado: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                  >
                    {estados.map(est => (
                      <option key={est} value={est}>{est.replace('_', ' ').toUpperCase()}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Proveedor</label>
                  <input
                    type="text"
                    value={formData.proveedor}
                    onChange={(e) => setFormData({ ...formData, proveedor: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Número de Serie</label>
                  <input
                    type="text"
                    value={formData.numero_serie}
                    onChange={(e) => setFormData({ ...formData, numero_serie: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Descripción</label>
                  <textarea
                    value={formData.descripcion}
                    onChange={(e) => setFormData({ ...formData, descripcion: e.target.value })}
                    rows={2}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Notas</label>
                  <textarea
                    value={formData.notas}
                    onChange={(e) => setFormData({ ...formData, notas: e.target.value })}
                    rows={2}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 mt-6">
                <button
                  type="button"
                  onClick={() => {
                    setShowModal(false);
                    setActivoSeleccionado(null);
                    resetForm();
                  }}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                >
                  {activoSeleccionado ? 'Actualizar' : 'Registrar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal de depreciación */}
      {showDepreciacionModal && activoSeleccionado && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full">
            <div className="bg-purple-600 text-white px-6 py-4 rounded-t-lg">
              <h2 className="text-2xl font-bold">Depreciación del Activo</h2>
              <p className="text-sm text-purple-100">{activoSeleccionado.nombre}</p>
            </div>

            <div className="p-6">
              {(() => {
                const depreciacion = calcularDepreciacion(activoSeleccionado);
                const porcentajeDepreciado = ((depreciacion.acumulada / (activoSeleccionado.costo_adquisicion - (activoSeleccionado.valor_residual || 0))) * 100).toFixed(2);

                return (
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="bg-blue-50 p-4 rounded-lg">
                        <p className="text-sm text-blue-600 font-medium">Costo de Adquisición</p>
                        <p className="text-2xl font-bold text-blue-900">
                          {formatCurrency(activoSeleccionado.costo_adquisicion, activoSeleccionado.moneda)}
                        </p>
                      </div>

                      <div className="bg-green-50 p-4 rounded-lg">
                        <p className="text-sm text-green-600 font-medium">Valor en Libros</p>
                        <p className="text-2xl font-bold text-green-900">
                          {formatCurrency(depreciacion.valorLibros, activoSeleccionado.moneda)}
                        </p>
                      </div>

                      <div className="bg-red-50 p-4 rounded-lg">
                        <p className="text-sm text-red-600 font-medium">Depreciación Acumulada</p>
                        <p className="text-2xl font-bold text-red-900">
                          {formatCurrency(depreciacion.acumulada, activoSeleccionado.moneda)}
                        </p>
                        <p className="text-xs text-red-600 mt-1">{porcentajeDepreciado}% depreciado</p>
                      </div>

                      <div className="bg-purple-50 p-4 rounded-lg">
                        <p className="text-sm text-purple-600 font-medium">Depreciación Mensual</p>
                        <p className="text-2xl font-bold text-purple-900">
                          {formatCurrency(depreciacion.mensual, activoSeleccionado.moneda)}
                        </p>
                      </div>
                    </div>

                    <div className="bg-gray-50 p-4 rounded-lg">
                      <div className="flex items-center gap-2 mb-2">
                        <AlertCircle className="w-5 h-5 text-gray-600" />
                        <h3 className="font-semibold text-gray-800">Información del Activo</h3>
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        <div>
                          <span className="text-gray-600">Fecha de adquisición:</span>
                          <span className="ml-2 font-medium">{new Date(activoSeleccionado.fecha_adquisicion).toLocaleDateString('es-DO')}</span>
                        </div>
                        <div>
                          <span className="text-gray-600">Vida útil:</span>
                          <span className="ml-2 font-medium">{activoSeleccionado.vida_util_anos} años</span>
                        </div>
                        <div>
                          <span className="text-gray-600">Valor residual:</span>
                          <span className="ml-2 font-medium">
                            {formatCurrency(activoSeleccionado.valor_residual || 0, activoSeleccionado.moneda)}
                          </span>
                        </div>
                        <div>
                          <span className="text-gray-600">Método:</span>
                          <span className="ml-2 font-medium capitalize">{activoSeleccionado.metodo_depreciacion}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })()}

              <div className="flex justify-end mt-6">
                <button
                  onClick={() => setShowDepreciacionModal(false)}
                  className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
                >
                  Cerrar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal de mantenimientos */}
      {showMantenimientoModal && activoSeleccionado && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-orange-600 text-white px-6 py-4 rounded-t-lg">
              <h2 className="text-2xl font-bold">Mantenimientos del Activo</h2>
              <p className="text-sm text-orange-100">{activoSeleccionado.nombre}</p>
            </div>

            <div className="p-6">
              {/* Formulario de nuevo mantenimiento */}
              <form onSubmit={handleMantenimientoSubmit} className="bg-gray-50 p-4 rounded-lg mb-6">
                <h3 className="font-semibold text-gray-800 mb-4">Registrar Nuevo Mantenimiento</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Tipo *</label>
                    <select
                      required
                      value={mantenimientoData.tipo_mantenimiento}
                      onChange={(e) => setMantenimientoData({ ...mantenimientoData, tipo_mantenimiento: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    >
                      <option value="Preventivo">Preventivo</option>
                      <option value="Correctivo">Correctivo</option>
                      <option value="Predictivo">Predictivo</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Fecha *</label>
                    <input
                      type="date"
                      required
                      value={mantenimientoData.fecha_mantenimiento}
                      onChange={(e) => setMantenimientoData({ ...mantenimientoData, fecha_mantenimiento: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Costo *</label>
                    <input
                      type="number"
                      step="0.01"
                      required
                      value={mantenimientoData.costo}
                      onChange={(e) => setMantenimientoData({ ...mantenimientoData, costo: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Moneda *</label>
                    <select
                      required
                      value={mantenimientoData.moneda}
                      onChange={(e) => setMantenimientoData({ ...mantenimientoData, moneda: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    >
                      <option value="DOP">Pesos (DOP)</option>
                      <option value="USD">Dólares (USD)</option>
                    </select>
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Descripción *</label>
                    <textarea
                      required
                      value={mantenimientoData.descripcion}
                      onChange={(e) => setMantenimientoData({ ...mantenimientoData, descripcion: e.target.value })}
                      rows={2}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    />
                  </div>
                </div>

                <div className="flex justify-end mt-4">
                  <button
                    type="submit"
                    className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 flex items-center gap-2"
                  >
                    <Plus className="w-4 h-4" />
                    Registrar Mantenimiento
                  </button>
                </div>
              </form>

              {/* Lista de mantenimientos */}
              <h3 className="font-semibold text-gray-800 mb-4">Historial de Mantenimientos</h3>
              {mantenimientos.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <Wrench className="w-12 h-12 mx-auto mb-2 opacity-50" />
                  <p>No hay mantenimientos registrados</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {mantenimientos.map((mant) => (
                    <div key={mant.id} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                      <div className="flex justify-between items-start">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                              mant.tipo_mantenimiento === 'Preventivo' ? 'bg-blue-100 text-blue-800' :
                              mant.tipo_mantenimiento === 'Correctivo' ? 'bg-red-100 text-red-800' :
                              'bg-purple-100 text-purple-800'
                            }`}>
                              {mant.tipo_mantenimiento}
                            </span>
                            <span className="text-sm text-gray-600">
                              {new Date(mant.fecha_mantenimiento).toLocaleDateString('es-DO')}
                            </span>
                          </div>
                          <p className="text-sm text-gray-800 mt-2">{mant.descripcion}</p>
                          {mant.proveedor && (
                            <p className="text-xs text-gray-500 mt-1">Proveedor: {mant.proveedor}</p>
                          )}
                        </div>
                        <p className="text-lg font-bold text-gray-900">
                          {formatCurrency(mant.costo, mant.moneda)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <div className="flex justify-end mt-6">
                <button
                  onClick={() => {
                    setShowMantenimientoModal(false);
                    setActivoSeleccionado(null);
                    setMantenimientos([]);
                    resetMantenimientoForm();
                  }}
                  className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
                >
                  Cerrar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal de importación SQL */}
      {showImportModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full">
            <div className="bg-blue-600 text-white px-6 py-4 rounded-t-lg flex justify-between items-center">
              <h2 className="text-2xl font-bold">Importar Archivo SQL/ZIP</h2>
              <button
                onClick={() => {
                  setShowImportModal(false);
                  setImportFile(null);
                  setImportError('');
                  setImportSuccess(false);
                  setImportProgress('');
                }}
                className="text-white hover:text-gray-200"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="p-6">
              {!importSuccess ? (
                <>
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Seleccionar archivo (.sql o .zip)
                    </label>
                    <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                      <input
                        type="file"
                        accept=".sql,.zip"
                        onChange={handleFileSelect}
                        className="hidden"
                        id="file-upload"
                        disabled={importLoading}
                      />
                      <label
                        htmlFor="file-upload"
                        className={`cursor-pointer flex flex-col items-center ${importLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
                      >
                        <Upload className="w-12 h-12 text-gray-400 mb-2" />
                        <p className="text-sm text-gray-600">
                          {importFile ? importFile.name : 'Haz clic para seleccionar un archivo'}
                        </p>
                        <p className="text-xs text-gray-500 mt-1">
                          Formatos soportados: .sql, .zip (máx. 10MB)
                        </p>
                      </label>
                    </div>
                    {importFile && (
                      <div className="mt-2 flex items-center gap-2 text-sm text-gray-600">
                        <FileText className="w-4 h-4" />
                        <span>{importFile.name}</span>
                        <span className="text-gray-400">
                          ({(importFile.size / 1024).toFixed(2)} KB)
                        </span>
                        <button
                          onClick={() => setImportFile(null)}
                          className="ml-auto text-red-600 hover:text-red-800"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    )}
                  </div>

                  {importError && (
                    <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                      <div className="flex items-center gap-2 text-red-800">
                        <AlertCircle className="w-5 h-5" />
                        <p className="text-sm font-medium">Error: {importError}</p>
                      </div>
                    </div>
                  )}

                  {importProgress && (
                    <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                      <p className="text-sm text-blue-800">{importProgress}</p>
                    </div>
                  )}

                  <div className="flex justify-end gap-3">
                    <button
                      onClick={() => {
                        setShowImportModal(false);
                        setImportFile(null);
                        setImportError('');
                        setImportProgress('');
                      }}
                      className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                      disabled={importLoading}
                    >
                      Cancelar
                    </button>
                    <button
                      onClick={handleImportFile}
                      disabled={!importFile || importLoading}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                    >
                      {importLoading ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                          Procesando...
                        </>
                      ) : (
                        <>
                          <Upload className="w-4 h-4" />
                          Importar
                        </>
                      )}
                    </button>
                  </div>
                </>
              ) : (
                <div className="text-center py-8">
                  <CheckCircle className="w-16 h-16 text-green-600 mx-auto mb-4" />
                  <h3 className="text-xl font-bold text-gray-800 mb-2">¡Importación exitosa!</h3>
                  <p className="text-gray-600 mb-6">El archivo se ha procesado correctamente.</p>
                  <button
                    onClick={() => {
                      setShowImportModal(false);
                      setImportFile(null);
                      setImportError('');
                      setImportSuccess(false);
                      setImportProgress('');
                      cargarActivos();
                    }}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                  >
                    Cerrar
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}