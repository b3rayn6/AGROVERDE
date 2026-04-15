import { useState, useEffect } from 'react';
import { X, Truck, Users } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { getUserId } from '../lib/authUtils';
import SearchableSelect from './SearchableSelect';

export default function ModalFleteObreros({ pesada, user, onClose, onSuccess }) {
  const [step, setStep] = useState('confirm'); // confirm, flete, obreros, success
  const [fleteData, setFleteData] = useState({
    chofer: '',
    placa: '',
    factoria: '',
    precio_flete: ''
  });
  const [obrerosData, setObrerosData] = useState({
    precio_por_saco: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [choferes, setChoferes] = useState([]);
  const [choferesLoading, setChoferesLoading] = useState(true);

  useEffect(() => {
    cargarChoferes();
  }, []);

  const cargarChoferes = async () => {
    try {
      const { data, error: err } = await supabase
        .from('choferes')
        .select('id, nombre, placa')
        .order('nombre');
      
      if (err) throw err;
      setChoferes(data || []);
    } catch (err) {
      console.error('Error al cargar choferes:', err);
    } finally {
      setChoferesLoading(false);
    }
  };

  const handleChoferSeleccionado = (choferId) => {
    if (choferId) {
      const chofer = choferes.find(c => String(c.id) === String(choferId));
      if (chofer) {
        setFleteData({
          ...fleteData,
          chofer: chofer.nombre,
          placa: chofer.placa || ''
        });
      }
    } else {
      setFleteData({
        ...fleteData,
        chofer: '',
        placa: ''
      });
    }
  };

  const handleConfirm = (option) => {
    if (option === 'yes') {
      setStep('flete');
    } else {
      onClose();
    }
  };

  const handleSaveFlete = async () => {
    setLoading(true);
    setError('');

    try {
      if (!user || !user.id) {
        setError('Error de sesión. Por favor cierra sesión y vuelve a entrar.');
        setLoading(false);
        return;
      }

      const userId = await getUserId(user);
      if (!userId) {
        setError('Error al obtener el ID de usuario. Por favor, verifica que estés autenticado correctamente.');
        setLoading(false);
        return;
      }

      // Validar y convertir valores numéricos
      const precioFlete = parseFloat(fleteData.precio_flete);
      if (isNaN(precioFlete) || precioFlete < 0) {
        setError('El precio del flete debe ser un número válido mayor o igual a 0');
        setLoading(false);
        return;
      }

      // Validar que el precio no exceda el límite (por ejemplo, 99999999.99)
      if (precioFlete > 99999999.99) {
        setError('El precio del flete es demasiado grande. Máximo: 99,999,999.99');
        setLoading(false);
        return;
      }
      
      const valorTotalFlete = pesada.cantidad_sacos * precioFlete;

      // Validar que el valor total no exceda el límite
      if (valorTotalFlete > 99999999.99) {
        setError('El valor total del flete excede el límite permitido. Reduce el precio por saco.');
        setLoading(false);
        return;
      }
      
      const fleteRecord = {
        pesada_id: pesada.id,
        fecha: pesada.fecha,
        productor: pesada.nombre_productor,
        variedad: pesada.variedad,
        cantidad_sacos: pesada.cantidad_sacos,
        lugar: pesada.direccion || 'N/A',
        pesador: user.nombre || 'N/A',
        numero_pesada: pesada.id?.substring(0, 8) || 'N/A',
        chofer: fleteData.chofer,
        placa: fleteData.placa,
        finca: pesada.direccion || 'N/A',
        factoria: fleteData.factoria,
        precio_flete: precioFlete,
        valor_total_flete: parseFloat(valorTotalFlete.toFixed(2)),
        user_id: userId
      };

      const { error: insertError } = await supabase
        .from('fletes')
        .insert([fleteRecord]);

      if (insertError) throw insertError;

      setStep('obreros');
    } catch (err) {
      setError('Error al guardar el flete: ' + (err.message || 'Error desconocido'));
      console.error(err);
    }

    setLoading(false);
  };

  const handleSaveObreros = async () => {
    setLoading(true);
    setError('');

    try {
      if (!user || !user.id) {
        setError('Error de sesión. Por favor cierra sesión y vuelve a entrar.');
        setLoading(false);
        return;
      }

      const userId = await getUserId(user);
      if (!userId) {
        setError('Error al obtener el ID de usuario. Por favor, verifica que estés autenticado correctamente.');
        setLoading(false);
        return;
      }
      
      const total = pesada.cantidad_sacos * parseFloat(obrerosData.precio_por_saco);

      const obrerosRecord = {
        pesada_id: pesada.id,
        fecha: pesada.fecha,
        nombre_obrero: pesada.nombre_productor,
        cantidad_sacos: pesada.cantidad_sacos,
        precio_saco: parseFloat(obrerosData.precio_por_saco),
        total: total,
        user_id: userId
      };

      const { error: insertError } = await supabase
        .from('pagos_obreros')
        .insert([obrerosRecord]);

      if (insertError) throw insertError;

      setStep('success');
      setTimeout(() => {
        onSuccess();
      }, 2000);
    } catch (err) {
      setError('Error al guardar el pago de obreros: ' + (err.message || 'Error desconocido'));
      console.error(err);
    }

    setLoading(false);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg">
        <div className="bg-gradient-to-r from-green-600 to-green-700 px-6 py-4 flex items-center justify-between rounded-t-2xl">
          <h2 className="text-xl font-bold text-white">
            {step === 'confirm' && '¿Registrar Flete y Obreros?'}
            {step === 'flete' && 'Registro de Flete'}
            {step === 'obreros' && 'Pago de Obreros'}
            {step === 'success' && '¡Completado!'}
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white/20 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-white" />
          </button>
        </div>

        <div className="p-6">
          {step === 'confirm' && (
            <div className="space-y-6">
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <p className="text-sm text-gray-700 mb-2">
                  <strong>Pesada registrada:</strong>
                </p>
                <ul className="text-sm text-gray-600 space-y-1">
                  <li>• Productor: {pesada.nombre_productor}</li>
                  <li>• Variedad: {pesada.variedad}</li>
                  <li>• Sacos: {pesada.cantidad_sacos}</li>
                  <li>• Fanegas: {pesada.fanegas?.toFixed(2)}</li>
                </ul>
              </div>

              <p className="text-gray-700">
                ¿Deseas registrar automáticamente el <strong>Flete</strong> y el <strong>Pago de Obreros</strong> usando estos datos?
              </p>

              <div className="flex gap-4">
                <button
                  onClick={() => handleConfirm('no')}
                  className="flex-1 px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  No, solo pesada
                </button>
                <button
                  onClick={() => handleConfirm('yes')}
                  className="flex-1 bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-lg transition-colors"
                >
                  Sí, continuar
                </button>
              </div>
            </div>
          )}

          {step === 'flete' && (
            <div className="space-y-4">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex items-start gap-3">
                <Truck className="w-5 h-5 text-blue-600 mt-0.5" />
                <div className="text-sm text-gray-700">
                  <p className="font-medium mb-1">Datos pre-cargados:</p>
                  <p>Productor: {pesada.nombre_productor}</p>
                  <p>Variedad: {pesada.variedad}</p>
                  <p>Sacos: {pesada.cantidad_sacos}</p>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Seleccionar Chofer
                </label>
                <SearchableSelect
                  options={choferes}
                  value=""
                  onChange={(value) => handleChoferSeleccionado(value)}
                  placeholder="-- Seleccionar chofer o ingreso manual --"
                  searchPlaceholder="Buscar chofer por nombre..."
                  displayField="nombre"
                  valueField="id"
                  disabled={choferesLoading}
                />
                <p className="text-xs text-gray-500 mt-2 flex items-center gap-1">
                  <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                  </svg>
                  Selecciona un chofer o escribe manualmente abajo
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Nombre del Chofer
                </label>
                <input
                  type="text"
                  value={fleteData.chofer}
                  onChange={(e) => setFleteData({...fleteData, chofer: e.target.value})}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  placeholder="Nombre del chofer"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Placa del Vehículo
                </label>
                <input
                  type="text"
                  value={fleteData.placa}
                  onChange={(e) => setFleteData({...fleteData, placa: e.target.value})}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  placeholder="ABC-1234"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Factoría
                </label>
                <input
                  type="text"
                  value={fleteData.factoria}
                  onChange={(e) => setFleteData({...fleteData, factoria: e.target.value})}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  placeholder="Nombre de la factoría"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Precio del Flete (RD$)
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={fleteData.precio_flete}
                  onChange={(e) => setFleteData({...fleteData, precio_flete: e.target.value})}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  placeholder="5000.00"
                  required
                />
              </div>

              {error && (
                <div className="bg-red-50 text-red-600 px-4 py-3 rounded-lg text-sm">
                  {error}
                </div>
              )}

              <div className="flex gap-4 mt-6">
                <button
                  onClick={onClose}
                  className="flex-1 px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleSaveFlete}
                  disabled={loading || !fleteData.chofer || !fleteData.placa || !fleteData.factoria || !fleteData.precio_flete}
                  className="flex-1 bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-lg transition-colors disabled:opacity-50"
                >
                  {loading ? 'Guardando...' : 'Continuar'}
                </button>
              </div>
            </div>
          )}

          {step === 'obreros' && (
            <div className="space-y-4">
              <div className="bg-purple-50 border border-purple-200 rounded-lg p-4 flex items-start gap-3">
                <Users className="w-5 h-5 text-purple-600 mt-0.5" />
                <div className="text-sm text-gray-700">
                  <p className="font-medium mb-1">Datos pre-cargados:</p>
                  <p>Obrero: {pesada.nombre_productor}</p>
                  <p>Sacos: {pesada.cantidad_sacos}</p>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Precio por Saco (RD$)
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={obrerosData.precio_por_saco}
                  onChange={(e) => setObrerosData({...obrerosData, precio_por_saco: e.target.value})}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  placeholder="50.00"
                  required
                />
              </div>

              {obrerosData.precio_por_saco && (
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                  <p className="text-sm text-gray-600">Total a pagar:</p>
                  <p className="text-2xl font-bold text-green-600">
                    RD$ {(pesada.cantidad_sacos * parseFloat(obrerosData.precio_por_saco)).toFixed(2)}
                  </p>
                </div>
              )}

              {error && (
                <div className="bg-red-50 text-red-600 px-4 py-3 rounded-lg text-sm">
                  {error}
                </div>
              )}

              <div className="flex gap-4 mt-6">
                <button
                  onClick={onClose}
                  className="flex-1 px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleSaveObreros}
                  disabled={loading || !obrerosData.precio_por_saco}
                  className="flex-1 bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-lg transition-colors disabled:opacity-50"
                >
                  {loading ? 'Guardando...' : 'Finalizar'}
                </button>
              </div>
            </div>
          )}

          {step === 'success' && (
            <div className="text-center py-8">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-gray-800 mb-2">¡Todo registrado!</h3>
              <p className="text-gray-600">
                Se guardaron correctamente:<br />
                ✓ Pesada<br />
                ✓ Registro de Flete<br />
                ✓ Pago de Obreros
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
