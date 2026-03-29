import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Users, DollarSign, Calendar, Plus, X, Check, Search, Printer } from 'lucide-react';
import { formatCurrency, formatDate } from '../lib/formatters';
import { generateNominaPDF } from '../lib/pdfGeneratorExtras';

export default function Nomina() {
  const [empleados, setEmpleados] = useState([]);
  const [nominas, setNominas] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [showEmpleadoModal, setShowEmpleadoModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filtroEstado, setFiltroEstado] = useState('Todos');
  
  const [nuevoEmpleado, setNuevoEmpleado] = useState({
    nombre: '',
    cedula: '',
    cargo: '',
    salario: '',
    fecha_ingreso: new Date().toISOString().split('T')[0],
    telefono: '',
    direccion: ''
  });

  const [nuevaNomina, setNuevaNomina] = useState({
    empleado_id: '',
    periodo_inicio: new Date().toISOString().split('T')[0],
    periodo_fin: new Date().toISOString().split('T')[0],
    bonificaciones: 0,
    deducciones: 0,
    notas: ''
  });

  useEffect(() => {
    cargarEmpleados();
    cargarNominas();
  }, []);

  const cargarEmpleados = async () => {
    const { data, error } = await supabase
      .from('empleados')
      .select('*')
      .eq('activo', true)
      .order('nombre');
    
    if (!error && data) setEmpleados(data);
  };

  const cargarNominas = async () => {
    const { data, error } = await supabase
      .from('nomina')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (!error && data) setNominas(data);
  };

  const guardarEmpleado = async () => {
    try {
      const { error } = await supabase
        .from('empleados')
        .insert([{
          ...nuevoEmpleado,
          salario: parseFloat(nuevoEmpleado.salario)
        }]);

      if (error) throw error;

      alert('Empleado registrado exitosamente');
      setShowEmpleadoModal(false);
      setNuevoEmpleado({
        nombre: '',
        cedula: '',
        cargo: '',
        salario: '',
        fecha_ingreso: new Date().toISOString().split('T')[0],
        telefono: '',
        direccion: ''
      });
      cargarEmpleados();
    } catch (error) {
      console.error('Error:', error);
      alert('Error al guardar empleado: ' + error.message);
    }
  };

  const guardarNomina = async () => {
    try {
      const empleado = empleados.find(e => e.id === parseInt(nuevaNomina.empleado_id));
      if (!empleado) {
        alert('Selecciona un empleado');
        return;
      }

      const salarioBase = parseFloat(empleado.salario);
      const bonificaciones = parseFloat(nuevaNomina.bonificaciones) || 0;
      const deducciones = parseFloat(nuevaNomina.deducciones) || 0;
      const totalPagar = salarioBase + bonificaciones - deducciones;

      const { error } = await supabase
        .from('nomina')
        .insert([{
          empleado_id: empleado.id,
          empleado_nombre: empleado.nombre,
          periodo_inicio: nuevaNomina.periodo_inicio,
          periodo_fin: nuevaNomina.periodo_fin,
          salario_base: salarioBase,
          bonificaciones: bonificaciones,
          deducciones: deducciones,
          total_pagar: totalPagar,
          notas: nuevaNomina.notas
        }]);

      if (error) throw error;

      alert('Nómina registrada exitosamente');
      setShowModal(false);
      setNuevaNomina({
        empleado_id: '',
        periodo_inicio: new Date().toISOString().split('T')[0],
        periodo_fin: new Date().toISOString().split('T')[0],
        bonificaciones: 0,
        deducciones: 0,
        notas: ''
      });
      cargarNominas();
    } catch (error) {
      console.error('Error:', error);
      alert('Error al guardar nómina: ' + error.message);
    }
  };

  const marcarComoPagado = async (nominaId) => {
    try {
      const { error } = await supabase
        .from('nomina')
        .update({ 
          estado: 'Pagado',
          fecha_pago: new Date().toISOString().split('T')[0]
        })
        .eq('id', nominaId);

      if (error) throw error;

      alert('Nómina marcada como pagada');
      cargarNominas();
    } catch (error) {
      console.error('Error:', error);
      alert('Error al actualizar nómina: ' + error.message);
    }
  };

  const empleadoSeleccionado = empleados.find(e => e.id === parseInt(nuevaNomina.empleado_id));
  const salarioBase = empleadoSeleccionado ? parseFloat(empleadoSeleccionado.salario) : 0;
  const bonificaciones = parseFloat(nuevaNomina.bonificaciones) || 0;
  const deducciones = parseFloat(nuevaNomina.deducciones) || 0;
  const totalPagar = salarioBase + bonificaciones - deducciones;

  const nominasFiltradas = nominas.filter(n => {
    const matchSearch = n.empleado_nombre.toLowerCase().includes(searchTerm.toLowerCase());
    const matchEstado = filtroEstado === 'Todos' || n.estado === filtroEstado;
    return matchSearch && matchEstado;
  });

  const totalPendiente = nominas.filter(n => n.estado === 'Pendiente').reduce((sum, n) => sum + parseFloat(n.total_pagar), 0);
  const totalPagado = nominas.filter(n => n.estado === 'Pagado').reduce((sum, n) => sum + parseFloat(n.total_pagar), 0);

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-gray-800">Nómina de Empleados</h1>
        <div className="flex gap-2">
          <button
            onClick={() => setShowEmpleadoModal(true)}
            className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 flex items-center gap-2"
          >
            <Users size={20} />
            Nuevo Empleado
          </button>
          <button
            onClick={() => setShowModal(true)}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center gap-2"
          >
            <Plus size={20} />
            Nueva Nómina
          </button>
        </div>
      </div>

      {/* Resumen */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
          <div className="flex items-center gap-3">
            <Users className="text-blue-600" size={32} />
            <div>
              <p className="text-sm text-gray-600">Empleados Activos</p>
              <p className="text-2xl font-bold text-gray-800">{empleados.length}</p>
            </div>
          </div>
        </div>

        <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200">
          <div className="flex items-center gap-3">
            <DollarSign className="text-yellow-600" size={32} />
            <div>
              <p className="text-sm text-gray-600">Nómina Pendiente</p>
              <p className="text-2xl font-bold text-gray-800">{formatCurrency(totalPendiente)}</p>
            </div>
          </div>
        </div>

        <div className="bg-green-50 p-4 rounded-lg border border-green-200">
          <div className="flex items-center gap-3">
            <Check className="text-green-600" size={32} />
            <div>
              <p className="text-sm text-gray-600">Nómina Pagada</p>
              <p className="text-2xl font-bold text-gray-800">{formatCurrency(totalPagado)}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Filtros */}
      <div className="bg-white p-4 rounded-lg shadow-sm mb-6 flex gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
          <input
            type="text"
            placeholder="Buscar empleado..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border rounded-lg"
          />
        </div>
        <select
          value={filtroEstado}
          onChange={(e) => setFiltroEstado(e.target.value)}
          className="px-4 py-2 border rounded-lg"
        >
          <option>Todos</option>
          <option>Pendiente</option>
          <option>Pagado</option>
        </select>
      </div>

      {/* Lista de Nóminas */}
      <div className="bg-white rounded-lg shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Empleado</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Período</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Salario Base</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Bonificaciones</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Deducciones</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Total a Pagar</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Estado</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {nominasFiltradas.map((nomina) => (
                <tr key={nomina.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="font-medium text-gray-900">{nomina.empleado_nombre}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                    {formatDate(nomina.periodo_inicio)} - {formatDate(nomina.periodo_fin)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {formatCurrency(nomina.salario_base)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-green-600">
                    +{formatCurrency(nomina.bonificaciones)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-red-600">
                    -{formatCurrency(nomina.deducciones)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-gray-900">
                    {formatCurrency(nomina.total_pagar)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                      nomina.estado === 'Pagado' 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-yellow-100 text-yellow-800'
                    }`}>
                      {nomina.estado}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    <div className="flex gap-2">
                      {nomina.estado === 'Pendiente' && (
                        <button
                          onClick={() => marcarComoPagado(nomina.id)}
                          className="text-green-600 hover:text-green-800"
                          title="Marcar como pagado"
                        >
                          <Check size={18} />
                        </button>
                      )}
                      <button
                        onClick={() => generateNominaPDF(nomina)}
                        className="text-blue-600 hover:text-blue-800"
                        title="Imprimir"
                      >
                        <Printer size={18} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Nuevo Empleado */}
      {showEmpleadoModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold">Nuevo Empleado</h2>
              <button onClick={() => setShowEmpleadoModal(false)} className="text-gray-500 hover:text-gray-700">
                <X size={24} />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nombre Completo</label>
                <input
                  type="text"
                  value={nuevoEmpleado.nombre}
                  onChange={(e) => setNuevoEmpleado({...nuevoEmpleado, nombre: e.target.value})}
                  className="w-full px-3 py-2 border rounded-lg"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Cédula</label>
                <input
                  type="text"
                  value={nuevoEmpleado.cedula}
                  onChange={(e) => setNuevoEmpleado({...nuevoEmpleado, cedula: e.target.value})}
                  className="w-full px-3 py-2 border rounded-lg"
                  placeholder="001-1234567-8"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Cargo</label>
                <input
                  type="text"
                  value={nuevoEmpleado.cargo}
                  onChange={(e) => setNuevoEmpleado({...nuevoEmpleado, cargo: e.target.value})}
                  className="w-full px-3 py-2 border rounded-lg"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Salario Mensual</label>
                <input
                  type="number"
                  value={nuevoEmpleado.salario}
                  onChange={(e) => setNuevoEmpleado({...nuevoEmpleado, salario: e.target.value})}
                  className="w-full px-3 py-2 border rounded-lg"
                  step="0.01"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Fecha de Ingreso</label>
                <input
                  type="date"
                  value={nuevoEmpleado.fecha_ingreso}
                  onChange={(e) => setNuevoEmpleado({...nuevoEmpleado, fecha_ingreso: e.target.value})}
                  className="w-full px-3 py-2 border rounded-lg"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Teléfono</label>
                <input
                  type="tel"
                  value={nuevoEmpleado.telefono}
                  onChange={(e) => setNuevoEmpleado({...nuevoEmpleado, telefono: e.target.value})}
                  className="w-full px-3 py-2 border rounded-lg"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Dirección</label>
                <textarea
                  value={nuevoEmpleado.direccion}
                  onChange={(e) => setNuevoEmpleado({...nuevoEmpleado, direccion: e.target.value})}
                  className="w-full px-3 py-2 border rounded-lg"
                  rows="2"
                />
              </div>

              <button
                onClick={guardarEmpleado}
                className="w-full bg-green-600 text-white py-2 rounded-lg hover:bg-green-700"
              >
                Guardar Empleado
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Nueva Nómina */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold">Nueva Nómina</h2>
              <button onClick={() => setShowModal(false)} className="text-gray-500 hover:text-gray-700">
                <X size={24} />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Empleado</label>
                <select
                  value={nuevaNomina.empleado_id}
                  onChange={(e) => setNuevaNomina({...nuevaNomina, empleado_id: e.target.value})}
                  className="w-full px-3 py-2 border rounded-lg"
                  required
                >
                  <option value="">Seleccionar empleado</option>
                  {empleados.map(emp => (
                    <option key={emp.id} value={emp.id}>
                      {emp.nombre} - {emp.cargo}
                    </option>
                  ))}
                </select>
              </div>

              {empleadoSeleccionado && (
                <div className="bg-blue-50 p-3 rounded-lg">
                  <p className="text-sm text-gray-600">Salario Base</p>
                  <p className="text-lg font-bold text-gray-800">{formatCurrency(salarioBase)}</p>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Período Inicio</label>
                  <input
                    type="date"
                    value={nuevaNomina.periodo_inicio}
                    onChange={(e) => setNuevaNomina({...nuevaNomina, periodo_inicio: e.target.value})}
                    className="w-full px-3 py-2 border rounded-lg"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Período Fin</label>
                  <input
                    type="date"
                    value={nuevaNomina.periodo_fin}
                    onChange={(e) => setNuevaNomina({...nuevaNomina, periodo_fin: e.target.value})}
                    className="w-full px-3 py-2 border rounded-lg"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Bonificaciones</label>
                <input
                  type="number"
                  value={nuevaNomina.bonificaciones}
                  onChange={(e) => setNuevaNomina({...nuevaNomina, bonificaciones: e.target.value})}
                  className="w-full px-3 py-2 border rounded-lg"
                  step="0.01"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Deducciones</label>
                <input
                  type="number"
                  value={nuevaNomina.deducciones}
                  onChange={(e) => setNuevaNomina({...nuevaNomina, deducciones: e.target.value})}
                  className="w-full px-3 py-2 border rounded-lg"
                  step="0.01"
                />
              </div>

              <div className="bg-green-50 p-3 rounded-lg">
                <p className="text-sm text-gray-600">Total a Pagar</p>
                <p className="text-2xl font-bold text-gray-800">{formatCurrency(totalPagar)}</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Notas</label>
                <textarea
                  value={nuevaNomina.notas}
                  onChange={(e) => setNuevaNomina({...nuevaNomina, notas: e.target.value})}
                  className="w-full px-3 py-2 border rounded-lg"
                  rows="2"
                />
              </div>

              <button
                onClick={guardarNomina}
                className="w-full bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700"
              >
                Guardar Nómina
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}