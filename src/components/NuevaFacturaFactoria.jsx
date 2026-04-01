import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { ArrowLeft, Save, Calculator } from 'lucide-react';

export default function NuevaFacturaFactoria({ user, onBack, facturaToEdit }) {
  const [loading, setLoading] = useState(false);
  const [clientes, setClientes] = useState([]);
  const [clientesFiltrados, setClientesFiltrados] = useState([]);
  const [mostrarSugerencias, setMostrarSugerencias] = useState(false);
  const [isLoadingEdit, setIsLoadingEdit] = useState(!!facturaToEdit);
  const [formData, setFormData] = useState({
    fecha: '',
    numero_pesada: '',
    nombre_factoria: '',
    cliente: '',
    cantidad_sacos: '',
    kilos_bruto: '',
    kilos_neto: '',
    humedad: '',
    fanegas: '',
    precio_fanega: '',
    valor_pagar: '',
    notas: ''
  });

  useEffect(() => {
    cargarClientes();
    if (facturaToEdit) {
      // Formatear fecha para input type="date" (necesita YYYY-MM-DD)
      let fechaFormateada = facturaToEdit.fecha || '';
      if (fechaFormateada && fechaFormateada.includes('T')) {
        fechaFormateada = fechaFormateada.split('T')[0];
      }
      
      setFormData({
        fecha: fechaFormateada,
        numero_pesada: facturaToEdit.numero_pesada || '',
        nombre_factoria: facturaToEdit.nombre_factoria || '',
        cliente: facturaToEdit.cliente || '',
        cantidad_sacos: facturaToEdit.cantidad_sacos ?? '',
        kilos_bruto: facturaToEdit.kilos_bruto ?? '',
        kilos_neto: facturaToEdit.kilos_neto ?? '',
        humedad: facturaToEdit.humedad ?? '',
        fanegas: facturaToEdit.fanegas ?? '',
        precio_fanega: facturaToEdit.precio_fanega ?? '',
        valor_pagar: facturaToEdit.valor_pagar ?? '',
        notas: facturaToEdit.notas || ''
      });
      // Permitir cálculos automáticos después de cargar datos
      setTimeout(() => setIsLoadingEdit(false), 100);
    }
  }, [facturaToEdit]);

  const cargarClientes = async () => {
    try {
      const { data, error } = await supabase
        .from('clientes')
        .select('nombre')
        .order('nombre');

      if (error) throw error;
      setClientes(data || []);
    } catch (error) {
      console.error('Error al cargar clientes:', error);
    }
  };

  const buscarClientes = (texto) => {
    if (texto.length > 0) {
      const filtrados = clientes.filter(c =>
        c.nombre.toLowerCase().includes(texto.toLowerCase())
      );
      setClientesFiltrados(filtrados);
      setMostrarSugerencias(true);
    } else {
      setClientesFiltrados([]);
      setMostrarSugerencias(false);
    }
  };

  const seleccionarCliente = (nombreCliente) => {
    setFormData(prev => ({ ...prev, cliente: nombreCliente }));
    setMostrarSugerencias(false);
  };

  useEffect(() => {
    calcularFanegas();
  }, [formData.kilos_neto, formData.humedad]);

  useEffect(() => {
    calcularValorPagar();
  }, [formData.fanegas, formData.precio_fanega]);

  const calcularFanegas = () => {
    if (isLoadingEdit) return;
    const kilosNeto = parseFloat(formData.kilos_neto) || 0;
    const humedad = parseFloat(formData.humedad) || 0;

    if (kilosNeto > 0 && humedad > 0) {
      // Fórmula correcta: Fanegas = Peso / Humedad
      // Ejemplo: 500 / 135 = 3.70 fanegas
      const fanegas = kilosNeto / humedad;
      setFormData(prev => ({ ...prev, fanegas: fanegas.toFixed(2) }));
    }
  };

  const calcularValorPagar = () => {
    if (isLoadingEdit) return;
    const fanegas = parseFloat(formData.fanegas) || 0;
    const precio = parseFloat(formData.precio_fanega) || 0;

    if (fanegas > 0 && precio > 0) {
      const valor = fanegas * precio;
      setFormData(prev => ({ ...prev, valor_pagar: valor.toFixed(2) }));
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));

    // Si es el campo de cliente, buscar sugerencias
    if (name === 'cliente') {
      buscarClientes(value);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (!user || !user.id) {
        alert('Debes iniciar sesión');
        setLoading(false);
        return;
      }

      // Obtener el user_id correcto según el tipo de usuario
      let userId = user.id;

      // Si es un usuario del sistema, necesitamos obtener o crear el usuario en la tabla users
      if (user.tipo === 'sistema') {
        // Buscar si existe un usuario en users con el mismo email
        const { data: existingUser, error: searchError } = await supabase
          .from('users')
          .select('id')
          .eq('email', user.email)
          .maybeSingle();

        if (existingUser && !searchError) {
          userId = existingUser.id;
        } else if (searchError && searchError.code !== 'PGRST116') {
          // Si hay un error que no sea "no encontrado", intentar crear
          console.warn('Error buscando usuario:', searchError);
        }

        // Si no existe, crear un usuario en la tabla users
        if (!existingUser) {
          const { data: newUser, error: createError } = await supabase
            .from('users')
            .insert([{
              email: user.email,
              nombre: user.nombre_completo || user.nombre || user.email,
              password_hash: user.password || 'legacy_user'
            }])
            .select('id')
            .single();

          if (createError || !newUser) {
            console.error('Error creando usuario legacy:', createError);
            alert(`Error al crear referencia de usuario: ${createError?.message || 'Error desconocido'}. Por favor contacte al administrador.`);
            setLoading(false);
            return;
          }
          userId = newUser.id;
        }
      }

      const facturaData = {
        user_id: userId,
        fecha: formData.fecha,
        numero_pesada: formData.numero_pesada || null,
        nombre_factoria: formData.nombre_factoria,
        cliente: formData.cliente,
        cantidad_sacos: parseInt(formData.cantidad_sacos),
        kilos_bruto: parseFloat(formData.kilos_bruto),
        kilos_neto: parseFloat(formData.kilos_neto),
        humedad: parseFloat(formData.humedad),
        fanegas: parseFloat(formData.fanegas),
        precio_fanega: parseFloat(formData.precio_fanega),
        valor_pagar: parseFloat(formData.valor_pagar),
        notas: formData.notas
      };

      let error;

      if (facturaToEdit) {
        const result = await supabase
          .from('facturas_factoria')
          .update(facturaData)
          .eq('id', facturaToEdit.id);
        error = result.error;
      } else {
        const result = await supabase
          .from('facturas_factoria')
          .insert([facturaData]);
        error = result.error;
      }

      if (error) {
        console.error('Error completo de Supabase:', error);
        throw error;
      }

      alert(facturaToEdit ? 'Factura actualizada correctamente' : 'Factura guardada correctamente');
      onBack();
    } catch (error) {
      console.error('Error al guardar:', error);
      alert(`Error al guardar la factura: ${error.message || error.details || 'Error desconocido'}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50 p-4">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-2xl shadow-xl p-6">
          <div className="flex items-center gap-4 mb-6">
            <button
              onClick={onBack}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <ArrowLeft className="w-6 h-6 text-gray-600" />
            </button>
            <h2 className="text-2xl font-bold text-gray-800">
              {facturaToEdit ? 'Editar Factura de Factoría' : 'Nueva Factura de Factoría'}
            </h2>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Información General */}
            <div className="bg-blue-50 p-4 rounded-xl">
              <h3 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
                <Calculator className="w-5 h-5" />
                Información General
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Fecha
                  </label>
                  <input
                    type="date"
                    name="fecha"
                    value={formData.fecha}
                    onChange={handleChange}
                    required
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Número de Pesada (Opcional)
                  </label>
                  <input
                    type="text"
                    name="numero_pesada"
                    value={formData.numero_pesada}
                    onChange={handleChange}
                    placeholder="Ej: P-001"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Nombre de la Factoría
                  </label>
                  <input
                    type="text"
                    name="nombre_factoria"
                    value={formData.nombre_factoria}
                    onChange={handleChange}
                    required
                    placeholder="Ej: Factoría San José"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div className="relative">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Productor
                  </label>
                  <input
                    type="text"
                    name="cliente"
                    value={formData.cliente}
                    onChange={handleChange}
                    onFocus={() => formData.cliente && buscarClientes(formData.cliente)}
                    required
                    placeholder="Nombre del productor"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    autoComplete="off"
                  />
                  {mostrarSugerencias && clientesFiltrados.length > 0 && (
                    <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                      {clientesFiltrados.map((cliente, index) => (
                        <button
                          key={index}
                          type="button"
                          onClick={() => seleccionarCliente(cliente.nombre)}
                          className="w-full px-4 py-2 text-left hover:bg-blue-50 transition-colors"
                        >
                          {cliente.nombre}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Datos de Peso */}
            <div className="bg-green-50 p-4 rounded-xl">
              <h3 className="font-semibold text-gray-800 mb-4">Datos de Peso</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Cantidad de Sacos
                  </label>
                  <input
                    type="number"
                    name="cantidad_sacos"
                    value={formData.cantidad_sacos}
                    onChange={handleChange}
                    required
                    min="1"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Kilos Bruto
                  </label>
                  <input
                    type="number"
                    name="kilos_bruto"
                    value={formData.kilos_bruto}
                    onChange={handleChange}
                    required
                    step="0.01"
                    min="0"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Kilos Neto
                  </label>
                  <input
                    type="number"
                    name="kilos_neto"
                    value={formData.kilos_neto}
                    onChange={handleChange}
                    required
                    step="0.01"
                    min="0"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  />
                </div>
              </div>
            </div>

            {/* Cálculos */}
            <div className="bg-yellow-50 p-4 rounded-xl">
              <h3 className="font-semibold text-gray-800 mb-4">Cálculos</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Humedad (%)
                  </label>
                  <input
                    type="number"
                    name="humedad"
                    value={formData.humedad}
                    onChange={handleChange}
                    required
                    step="0.01"
                    min="0"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
                  />
                  <p className="text-xs text-gray-500 mt-1">Puede ser mayor a 100</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Fanegas
                  </label>
                  <input
                    type="number"
                    name="fanegas"
                    value={formData.fanegas}
                    onChange={handleChange}
                    required
                    step="0.01"
                    min="0"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Precio por Fanega
                  </label>
                  <input
                    type="number"
                    name="precio_fanega"
                    value={formData.precio_fanega}
                    onChange={handleChange}
                    required
                    step="0.01"
                    min="0"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Valor a Pagar (Automático)
                  </label>
                  <input
                    type="number"
                    name="valor_pagar"
                    value={formData.valor_pagar}
                    readOnly
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-100 text-gray-700 font-bold"
                  />
                </div>
              </div>
            </div>

            {/* Notas */}
            <div className="bg-gray-50 p-4 rounded-xl">
              <h3 className="font-semibold text-gray-800 mb-4">Notas</h3>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Observaciones (Opcional)
                </label>
                <textarea
                  name="notas"
                  value={formData.notas}
                  onChange={handleChange}
                  placeholder="Observaciones adicionales..."
                  rows="3"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-500 focus:border-transparent"
                />
              </div>
            </div>

            {/* Botón de Guardar */}
            <div className="flex justify-end gap-4">
              <button
                type="button"
                onClick={onBack}
                className="px-6 py-3 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={loading}
                className="px-6 py-3 bg-gradient-to-r from-green-600 to-blue-600 text-white rounded-lg hover:from-green-700 hover:to-blue-700 transition-all flex items-center gap-2 disabled:opacity-50"
              >
                <Save className="w-5 h-5" />
                {loading ? 'Guardando...' : 'Guardar Factura'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
