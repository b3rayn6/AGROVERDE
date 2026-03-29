import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { FileText, Plus, DollarSign, Printer, Eye, Edit2, Trash2, Search } from 'lucide-react';
import { formatCurrency } from '../lib/formatters';
import { generarPDFFacturasCompra } from '../lib/pdfGenerator';

export default function FacturasCompra() {
  const [facturas, setFacturas] = useState([]);
  const [suplidores, setSuplidores] = useState([]);
  const [mercancias, setMercancias] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [showPagoModal, setShowPagoModal] = useState(null);
  const [showDetalleModal, setShowDetalleModal] = useState(null);
  const [editandoFactura, setEditandoFactura] = useState(null);
  const [formData, setFormData] = useState({
    numero_factura: '',
    suplidor_id: '',
    fecha: new Date().toISOString().split('T')[0],
    divisa: 'DOP',
    tasa_cambio: 1.00,
    aplicar_itbis: true,
    notas: '',
    items: []
  });
  const [tasaDolar, setTasaDolar] = useState(58.50);
  const [pagoData, setPagoData] = useState({
    monto: '',
    metodo_pago: 'efectivo',
    referencia: '',
    notas: ''
  });
  const [filtroFecha, setFiltroFecha] = useState({
    desde: '',
    hasta: ''
  });
  const [busqueda, setBusqueda] = useState('');
  const [filtroTipo, setFiltroTipo] = useState('todos');

  useEffect(() => {
    cargarDatos();
    cargarTasaDolar();
  }, []);

  const cargarTasaDolar = async () => {
    const { data } = await supabase
      .from('configuracion_divisa')
      .select('tasa_dolar')
      .single();
    if (data) setTasaDolar(data.tasa_dolar);
  };

  const generarNumeroFactura = async () => {
    // Obtener el último número de factura
    const { data, error } = await supabase
      .from('facturas_compra')
      .select('numero_factura')
      .order('id', { ascending: false })
      .limit(1);

    if (error) {
      console.error('Error al obtener último número:', error);
      return 'FC-0001';
    }

    if (!data || data.length === 0) {
      return 'FC-0001';
    }

    // Extraer el número y sumar 1
    const ultimoNumero = data[0].numero_factura;
    const match = ultimoNumero.match(/(\\d+)$/);
    
    if (match) {
      const numero = parseInt(match[1]) + 1;
      return `FC-${numero.toString().padStart(4, '0')}`;
    }

    return 'FC-0001';
  };

  const handleGenerarNumero = async () => {
    const nuevoNumero = await generarNumeroFactura();
    setFormData({...formData, numero_factura: nuevoNumero});
  };

  const cargarDatos = async () => {
    try {
      const [facturasRes, suplidoresRes, mercanciasRes] = await Promise.all([
        supabase.from('facturas_compra').select(`
          *,
          suplidores (nombre)
        `).order('fecha', { ascending: false }),
        supabase.from('suplidores').select('*').order('nombre'),
        supabase.from('mercancias').select('*').eq('activo', true).order('nombre')
      ]);

      if (facturasRes.error) {
        console.error('Error cargando facturas:', facturasRes.error);
        alert('Error cargando facturas: ' + facturasRes.error.message);
      } else {
        setFacturas(facturasRes.data || []);
      }

      if (suplidoresRes.error) {
        console.error('Error cargando suplidores:', suplidoresRes.error);
      } else {
        setSuplidores(suplidoresRes.data || []);
      }

      if (mercanciasRes.error) {
        console.error('Error cargando mercancias:', mercanciasRes.error);
      } else {
        setMercancias(mercanciasRes.data || []);
      }
    } catch (error) {
      console.error('Error de red o inesperado:', error);
      alert('Error de conexión. Verifique su internet.');
    }
  };

  const verDetalleFactura = async (factura) => {
    const { data: items } = await supabase
      .from('items_factura_compra')
      .select(`
        *,
        mercancias (nombre, unidad_medida)
      `)
      .eq('factura_compra_id', factura.id);

    setShowDetalleModal({ ...factura, items: items || [] });
  };

  const editarFactura = async (factura) => {
    const { data: items } = await supabase
      .from('items_factura_compra')
      .select('*')
      .eq('factura_compra_id', factura.id);

    setEditandoFactura(factura);
    setFormData({
      numero_factura: factura.numero_factura,
      suplidor_id: factura.suplidor_id,
      fecha: factura.fecha,
      divisa: factura.divisa,
      tasa_cambio: factura.tasa_cambio,
      aplicar_itbis: factura.aplicar_itbis,
      notas: factura.notas || '',
      items: items || []
    });
    setShowModal(true);
  };

  const eliminarFactura = async (factura) => {
    if (!confirm(`¿Está seguro de eliminar la factura ${factura.numero_factura}? Esta acción revertirá el inventario y las cuentas por pagar.`)) {
      return;
    }

    try {
      // Obtener items de la factura
      const { data: items } = await supabase
        .from('items_factura_compra')
        .select('*')
        .eq('factura_compra_id', factura.id);

      // Revertir inventario
      for (const item of items || []) {
        const { data: mercancia } = await supabase
          .from('mercancias')
          .select('stock_actual')
          .eq('id', item.mercancia_id)
          .single();

        if (mercancia) {
          await supabase
            .from('mercancias')
            .update({
              stock_actual: mercancia.stock_actual - item.cantidad
            })
            .eq('id', item.mercancia_id);
        }
      }

      // Revertir balance del suplidor
      const { data: suplidor } = await supabase
        .from('suplidores')
        .select('balance_pendiente')
        .eq('id', factura.suplidor_id)
        .single();

      if (suplidor) {
        await supabase
          .from('suplidores')
          .update({
            balance_pendiente: suplidor.balance_pendiente - factura.balance_pendiente
          })
          .eq('id', factura.suplidor_id);
      }

      // Eliminar pagos asociados
      await supabase
        .from('pagos_suplidores')
        .delete()
        .eq('factura_compra_id', factura.id);

      // Eliminar items
      await supabase
        .from('items_factura_compra')
        .delete()
        .eq('factura_compra_id', factura.id);

      // Eliminar factura
      await supabase
        .from('facturas_compra')
        .delete()
        .eq('id', factura.id);

      cargarDatos();
      alert('Factura eliminada exitosamente. Inventario y cuentas por pagar actualizados.');
    } catch (error) {
      console.error('Error al eliminar factura:', error);
      alert('Error al eliminar la factura');
    }
  };

  const agregarItem = () => {
    setFormData({
      ...formData,
      items: [...formData.items, { 
        mercancia_id: '', 
        cantidad: '', 
        precio_unitario: '', 
        fecha_vencimiento: '',
        precio_venta_1: '',
        precio_venta_2: '',
        precio_venta_3: '',
        divisa: 'DOP'
      }]
    });
  };

  const actualizarItem = (index, campo, valor) => {
    const nuevosItems = [...formData.items];
    nuevosItems[index][campo] = valor;
    setFormData({ ...formData, items: nuevosItems });
  };

  const eliminarItem = (index) => {
    const nuevosItems = formData.items.filter((_, i) => i !== index);
    setFormData({ ...formData, items: nuevosItems });
  };

  const calcularTotales = () => {
    const subtotal = formData.items.reduce((sum, item) => {
      const cantidad = parseFloat(item.cantidad) || 0;
      let precio = parseFloat(item.precio_unitario) || 0;
      const divisaItem = item.divisa || 'DOP';
      const divisaFactura = formData.divisa || 'DOP';
      
      // Convertir precio según la divisa del item y la divisa de la factura
      if (divisaItem !== divisaFactura) {
        if (divisaItem === 'USD' && divisaFactura === 'DOP') {
          // Convertir USD a DOP
          precio = precio * (formData.tasa_cambio || tasaDolar);
        } else if (divisaItem === 'DOP' && divisaFactura === 'USD') {
          // Convertir DOP a USD
          precio = precio / (formData.tasa_cambio || tasaDolar);
        }
      }
      
      return sum + (cantidad * precio);
    }, 0);
    const itbis = formData.aplicar_itbis ? subtotal * 0.18 : 0;
    const total = subtotal + itbis;
    return { subtotal, itbis, total };
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (formData.items.length === 0) {
      alert('Debe agregar al menos un item');
      return;
    }

    // Validar número de factura
    if (!formData.numero_factura || formData.numero_factura.trim() === '') {
      alert('El número de factura es obligatorio');
      return;
    }

    // Validar que todos los items tengan mercancía, cantidad y precio
    for (let i = 0; i < formData.items.length; i++) {
      const item = formData.items[i];
      if (!item.mercancia_id || !item.cantidad || !item.precio_unitario) {
        alert(`Item #${i + 1}: Debe completar producto, cantidad y precio`);
        return;
      }
      if (parseInt(item.cantidad) <= 0) {
        alert(`Item #${i + 1}: La cantidad debe ser mayor a 0`);
        return;
      }
      if (parseFloat(item.precio_unitario) <= 0) {
        alert(`Item #${i + 1}: El precio debe ser mayor a 0`);
        return;
      }
    }

    const { subtotal, itbis, total } = calcularTotales();

    try {
      const numeroFacturaNormalizado = formData.numero_factura.trim().toUpperCase();

      if (editandoFactura) {
        // MODO EDICIÓN
        // Revertir inventario anterior
        const { data: itemsAnteriores } = await supabase
          .from('items_factura_compra')
          .select('*')
          .eq('factura_compra_id', editandoFactura.id);

        for (const item of itemsAnteriores || []) {
          const { data: mercancia } = await supabase
            .from('mercancias')
            .select('stock_actual')
            .eq('id', item.mercancia_id)
            .single();

          if (mercancia) {
            await supabase
              .from('mercancias')
              .update({
                stock_actual: mercancia.stock_actual - item.cantidad
              })
              .eq('id', item.mercancia_id);
          }
        }

        // Revertir balance anterior del suplidor
        const { data: suplidorAnterior } = await supabase
          .from('suplidores')
          .select('balance_pendiente')
          .eq('id', editandoFactura.suplidor_id)
          .single();

        if (suplidorAnterior) {
          await supabase
            .from('suplidores')
            .update({
              balance_pendiente: suplidorAnterior.balance_pendiente - editandoFactura.balance_pendiente
            })
            .eq('id', editandoFactura.suplidor_id);
        }

        // Eliminar items anteriores
        await supabase
          .from('items_factura_compra')
          .delete()
          .eq('factura_compra_id', editandoFactura.id);


        // Calcular nuevo estado
        const montoPagado = editandoFactura.monto_pagado || 0;
        const nuevoBalance = total - montoPagado;
        let nuevoEstado = 'pendiente';
        if (nuevoBalance <= 0.01) {
          nuevoEstado = 'pagada';
        } else if (montoPagado > 0) {
          nuevoEstado = 'parcial';
        }

        // Actualizar factura
        const { data: facturaActualizada, error: errorActualizar } = await supabase
          .from('facturas_compra')
          .update({
            numero_factura: numeroFacturaNormalizado,
            suplidor_id: parseInt(formData.suplidor_id),
            fecha: formData.fecha,
            subtotal,
            itbis,
            total,
            balance_pendiente: nuevoBalance,
            divisa: formData.divisa,
            tasa_cambio: formData.divisa === 'USD' ? formData.tasa_cambio : 1.00,
            aplicar_itbis: formData.aplicar_itbis,
            notas: formData.notas,
            estado: nuevoEstado
          })
          .eq('id', editandoFactura.id)

          .select()
          .single();

        if (errorActualizar) {
          console.error('Error al actualizar factura:', errorActualizar);
          alert('Error al actualizar factura: ' + (errorActualizar.message || 'Error desconocido'));
          return;
        }

        // Insertar nuevos items y actualizar inventario
        for (const item of formData.items) {
          const cantidad = parseInt(item.cantidad);
          let precio = parseFloat(item.precio_unitario);
          const divisaItem = item.divisa || 'DOP';
          
          // Convertir precio a DOP si el item está en USD (para guardar en BD y precio_compra)
          let precioEnDOP = precio;
          if (divisaItem === 'USD') {
            precioEnDOP = precio * (formData.tasa_cambio || tasaDolar);
          }
          
          // Calcular subtotal en la divisa de la factura
          const divisaFactura = formData.divisa || 'DOP';
          let precioParaSubtotal = precio;
          if (divisaItem !== divisaFactura) {
            if (divisaItem === 'USD' && divisaFactura === 'DOP') {
              precioParaSubtotal = precio * (formData.tasa_cambio || tasaDolar);
            } else if (divisaItem === 'DOP' && divisaFactura === 'USD') {
              precioParaSubtotal = precio / (formData.tasa_cambio || tasaDolar);
            }
          }
          const subtotalItem = cantidad * precioParaSubtotal;

          await supabase.from('items_factura_compra').insert([{
            factura_compra_id: editandoFactura.id,
            mercancia_id: parseInt(item.mercancia_id),
            cantidad,
            precio_unitario: precio,
            subtotal: subtotalItem,
            fecha_vencimiento: item.fecha_vencimiento || null,
            precio_venta_1: item.precio_venta_1 ? parseFloat(item.precio_venta_1) : null,
            precio_venta_2: item.precio_venta_2 ? parseFloat(item.precio_venta_2) : null,
            precio_venta_3: item.precio_venta_3 ? parseFloat(item.precio_venta_3) : null,
            divisa: divisaItem
          }]);

          const { data: mercancia } = await supabase
            .from('mercancias')
            .select('stock_actual')
            .eq('id', item.mercancia_id)
            .single();

          if (mercancia) {
            await supabase
              .from('mercancias')
              .update({
                stock_actual: mercancia.stock_actual + cantidad,
                precio_compra: precioEnDOP
              })
              .eq('id', item.mercancia_id);
          }
        }

        // Actualizar balance del nuevo suplidor
        const { data: suplidorNuevo } = await supabase
          .from('suplidores')
          .select('balance_pendiente')
          .eq('id', formData.suplidor_id)
          .single();

        if (suplidorNuevo) {
          await supabase
            .from('suplidores')
            .update({
              balance_pendiente: suplidorNuevo.balance_pendiente + (total - editandoFactura.monto_pagado)
            })
            .eq('id', formData.suplidor_id);
        }

        alert('Factura actualizada exitosamente. Inventario y cuentas por pagar actualizados.');
      } else {
        // MODO CREACIÓN (código existente)
        const { data: factura, error: errorFactura } = await supabase
          .from('facturas_compra')
          .insert([{
            numero_factura: numeroFacturaNormalizado,
            suplidor_id: parseInt(formData.suplidor_id),
            fecha: formData.fecha,
            subtotal,
            itbis,
            total,
            balance_pendiente: total,
            divisa: formData.divisa,
            tasa_cambio: formData.divisa === 'USD' ? formData.tasa_cambio : 1.00,
            aplicar_itbis: formData.aplicar_itbis,
            notas: formData.notas,
            estado: 'pendiente'
          }])
          .select()
          .single();

        if (errorFactura) {
          console.error('Error al insertar factura:', errorFactura);
          if (errorFactura.code === '23503') {
            alert('Error: El suplidor seleccionado no es válido.');
          } else {
            alert('Error al guardar factura: ' + (errorFactura.message || 'Error desconocido'));
          }
          return;
        }

        if (!factura || !factura.id) {
          alert('Error: No se pudo crear la factura');
          return;
        }

        // Insertar items y actualizar inventario
        for (const item of formData.items) {
          const cantidad = parseInt(item.cantidad);
          let precio = parseFloat(item.precio_unitario);
          const divisaItem = item.divisa || 'DOP';
          
          // Convertir precio a DOP si el item está en USD (para guardar en BD y precio_compra)
          let precioEnDOP = precio;
          if (divisaItem === 'USD') {
            precioEnDOP = precio * (formData.tasa_cambio || tasaDolar);
          }
          
          // Calcular subtotal en la divisa de la factura
          const divisaFactura = formData.divisa || 'DOP';
          let precioParaSubtotal = precio;
          if (divisaItem !== divisaFactura) {
            if (divisaItem === 'USD' && divisaFactura === 'DOP') {
              precioParaSubtotal = precio * (formData.tasa_cambio || tasaDolar);
            } else if (divisaItem === 'DOP' && divisaFactura === 'USD') {
              precioParaSubtotal = precio / (formData.tasa_cambio || tasaDolar);
            }
          }
          const subtotalItem = cantidad * precioParaSubtotal;

          const { error: errorItem } = await supabase.from('items_factura_compra').insert([{
            factura_compra_id: factura.id,
            mercancia_id: parseInt(item.mercancia_id),
            cantidad,
            precio_unitario: precio,
            subtotal: subtotalItem,
            fecha_vencimiento: item.fecha_vencimiento || null,
            precio_venta_1: item.precio_venta_1 ? parseFloat(item.precio_venta_1) : null,
            precio_venta_2: item.precio_venta_2 ? parseFloat(item.precio_venta_2) : null,
            precio_venta_3: item.precio_venta_3 ? parseFloat(item.precio_venta_3) : null,
            divisa: divisaItem
          }]);

          if (errorItem) {
            console.error('Error al insertar item:', errorItem);
            alert('Error al guardar item de la factura: ' + (errorItem.message || 'Error desconocido'));
            return;
          }

          const { data: mercancia, error: errorMercancia } = await supabase
            .from('mercancias')
            .select('stock_actual, precio_compra')
            .eq('id', item.mercancia_id)
            .single();

          if (errorMercancia) {
            console.error('Error al obtener mercancía:', errorMercancia);
          }

          if (mercancia) {
            const { error: errorUpdate } = await supabase
              .from('mercancias')
              .update({
                stock_actual: mercancia.stock_actual + cantidad,
                precio_compra: precioEnDOP
              })
              .eq('id', item.mercancia_id);

            if (errorUpdate) {
              console.error('Error al actualizar inventario:', errorUpdate);
            }
          }
        }

        // Actualizar balance del suplidor
        const { data: suplidor, error: errorSuplidor } = await supabase
          .from('suplidores')
          .select('balance_pendiente')
          .eq('id', formData.suplidor_id)
          .single();

        if (errorSuplidor) {
          console.error('Error al obtener suplidor:', errorSuplidor);
        }

        if (suplidor) {
          const { error: errorUpdateSuplidor } = await supabase
            .from('suplidores')
            .update({
              balance_pendiente: suplidor.balance_pendiente + total
            })
            .eq('id', formData.suplidor_id);

          if (errorUpdateSuplidor) {
            console.error('Error al actualizar balance del suplidor:', errorUpdateSuplidor);
          }
        }

        alert('Factura guardada exitosamente. Inventario y cuentas por pagar actualizados.');
      }

      setShowModal(false);
      setEditandoFactura(null);
      setFormData({
        numero_factura: '',
        suplidor_id: '',
        fecha: new Date().toISOString().split('T')[0],
        divisa: 'DOP',
        tasa_cambio: 1.00,
        aplicar_itbis: true,
        notas: '',
        items: []
      });
      cargarDatos();
    } catch (error) {
      console.error('Error general al guardar factura:', error);
      alert('Error al guardar la factura. Revisa la consola para más detalles.');
    }
  };

  const handlePago = async (e) => {
    e.preventDefault();
    
    const monto = parseFloat(pagoData.monto);
    if (monto <= 0 || monto > showPagoModal.balance_pendiente) {
      alert('Monto inválido');
      return;
    }

    // Registrar pago
    await supabase.from('pagos_suplidores').insert([{
      factura_compra_id: showPagoModal.id,
      suplidor_id: showPagoModal.suplidor_id,
      fecha: new Date().toISOString().split('T')[0],
      monto,
      metodo_pago: pagoData.metodo_pago,
      referencia: pagoData.referencia,
      notas: pagoData.notas
    }]);

    // Actualizar factura
    const nuevoMontoPagado = showPagoModal.monto_pagado + monto;
    const nuevoBalance = showPagoModal.balance_pendiente - monto;
    const nuevoEstado = nuevoBalance === 0 ? 'pagada' : 'parcial';

    await supabase
      .from('facturas_compra')
      .update({
        monto_pagado: nuevoMontoPagado,
        balance_pendiente: nuevoBalance,
        estado: nuevoEstado
      })
      .eq('id', showPagoModal.id);

    // Actualizar balance del suplidor
    const { data: suplidor } = await supabase
      .from('suplidores')
      .select('balance_pendiente')
      .eq('id', showPagoModal.suplidor_id)
      .single();

    if (suplidor) {
      await supabase
        .from('suplidores')
        .update({
          balance_pendiente: suplidor.balance_pendiente - monto
        })
        .eq('id', showPagoModal.suplidor_id);
    }

    setShowPagoModal(null);
    setPagoData({
      monto: '',
      metodo_pago: 'efectivo',
      referencia: '',
      notas: ''
    });
    cargarDatos();
    alert('Pago registrado exitosamente');
  };

  const facturasFiltradasPorFecha = facturas.filter(factura => {
    // Filtro de búsqueda
    const cumpleBusqueda = 
      factura.numero_factura.toLowerCase().includes(busqueda.toLowerCase()) ||
      factura.suplidores?.nombre.toLowerCase().includes(busqueda.toLowerCase());

    if (!cumpleBusqueda) return false;

    // Filtro de tipo (basado en estado)
    if (filtroTipo !== 'todos') {
      if (filtroTipo === 'contado' && factura.estado !== 'pagada') return false;
      if (filtroTipo === 'credito' && factura.estado === 'pagada') return false;
    }

    // Filtro de fecha
    if (!filtroFecha.desde && !filtroFecha.hasta) return true;
    
    const fechaFactura = new Date(factura.fecha);
    
    if (filtroFecha.desde && filtroFecha.hasta) {
      const desde = new Date(filtroFecha.desde);
      const hasta = new Date(filtroFecha.hasta);
      return fechaFactura >= desde && fechaFactura <= hasta;
    }
    
    if (filtroFecha.desde) {
      const desde = new Date(filtroFecha.desde);
      return fechaFactura >= desde;
    }
    
    if (filtroFecha.hasta) {
      const hasta = new Date(filtroFecha.hasta);
      return fechaFactura <= hasta;
    }
    
    return true;
  });

  const totales = {
    total: facturasFiltradasPorFecha.reduce((sum, f) => sum + f.total, 0),
    pendiente: facturasFiltradasPorFecha.reduce((sum, f) => sum + f.balance_pendiente, 0),
    pagado: facturasFiltradasPorFecha.reduce((sum, f) => sum + f.monto_pagado, 0)
  };

  const { subtotal, itbis, total } = calcularTotales();

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header Moderno */}
        <div className="bg-white rounded-2xl shadow-xl p-8 mb-6 border border-gray-100">
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-4">
              <div className="bg-gradient-to-br from-blue-500 to-blue-600 p-3 rounded-xl shadow-lg">
                <FileText className="w-8 h-8 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                  Facturas de Compra
                </h1>
                <p className="text-sm text-gray-500 mt-1">Gestión de compras y proveedores</p>
              </div>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => generarPDFFacturasCompra(facturasFiltradasPorFecha)}
                className="bg-gradient-to-r from-green-500 to-green-600 text-white px-6 py-3 rounded-xl hover:from-green-600 hover:to-green-700 flex items-center gap-2 shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-105"
              >
                <Printer className="w-5 h-5" />
                <span className="font-medium">Generar PDF</span>
              </button>
              <button
                onClick={() => setShowModal(true)}
                className="bg-gradient-to-r from-blue-500 to-blue-600 text-white px-6 py-3 rounded-xl hover:from-blue-600 hover:to-blue-700 flex items-center gap-2 shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-105"
              >
                <Plus className="w-5 h-5" />
                <span className="font-medium">Nueva Factura</span>
              </button>
            </div>
          </div>

          {/* Búsqueda y Filtros */}
          <div className="bg-white rounded-2xl shadow-lg p-6 mb-6 border border-gray-100">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="relative md:col-span-2">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type="text"
                  placeholder="Buscar por número o suplidor..."
                  value={busqueda}
                  onChange={(e) => setBusqueda(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
                />
              </div>
              
              <div className="flex gap-2">
                <input
                  type="date"
                  value={filtroFecha.desde}
                  onChange={(e) => setFiltroFecha({...filtroFecha, desde: e.target.value})}
                  className="w-full px-3 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                  placeholder="Desde"
                />
                <input
                  type="date"
                  value={filtroFecha.hasta}
                  onChange={(e) => setFiltroFecha({...filtroFecha, hasta: e.target.value})}
                  className="w-full px-3 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                  placeholder="Hasta"
                />
              </div>

              <div className="relative">
                <select
                  value={filtroTipo}
                  onChange={(e) => setFiltroTipo(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 appearance-none bg-white"
                >
                  <option value="todos">Todos los tipos</option>
                  <option value="contado">Contado (Pagada)</option>
                  <option value="credito">Crédito (Pendiente)</option>
                </select>
                <div className="absolute inset-y-0 right-0 flex items-center px-2 pointer-events-none">
                  <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
              </div>
            </div>
          </div>

          {/* Resumen Moderno */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-gradient-to-br from-blue-500 to-blue-600 p-6 rounded-xl shadow-lg text-white transform hover:scale-105 transition-all duration-200">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm font-medium opacity-90">Total Compras</p>
                <DollarSign className="w-5 h-5 opacity-75" />
              </div>
              <p className="text-3xl font-bold">{formatCurrency(totales.total)}</p>
              <p className="text-xs opacity-75 mt-1">{facturas.length} facturas registradas</p>
            </div>
            <div className="bg-gradient-to-br from-red-500 to-red-600 p-6 rounded-xl shadow-lg text-white transform hover:scale-105 transition-all duration-200">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm font-medium opacity-90">Por Pagar</p>
                <DollarSign className="w-5 h-5 opacity-75" />
              </div>
              <p className="text-3xl font-bold">{formatCurrency(totales.pendiente)}</p>
              <p className="text-xs opacity-75 mt-1">Saldo pendiente</p>
            </div>
            <div className="bg-gradient-to-br from-green-500 to-green-600 p-6 rounded-xl shadow-lg text-white transform hover:scale-105 transition-all duration-200">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm font-medium opacity-90">Pagado</p>
                <DollarSign className="w-5 h-5 opacity-75" />
              </div>
              <p className="text-3xl font-bold">{formatCurrency(totales.pagado)}</p>
              <p className="text-xs opacity-75 mt-1">Total abonado</p>
            </div>
          </div>
        </div>

        {/* Tabla Moderna */}
        <div className="bg-white rounded-2xl shadow-xl overflow-hidden border border-gray-100">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gradient-to-r from-gray-50 to-gray-100 border-b-2 border-gray-200">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Factura</th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Fecha</th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Suplidor</th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Total</th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Pagado</th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Balance</th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Estado</th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {facturasFiltradasPorFecha.map((factura) => (
                  <tr key={factura.id} className="hover:bg-gradient-to-r hover:from-blue-50 hover:to-purple-50 transition-all duration-200">
                    <td className="px-6 py-4 text-sm font-bold text-gray-900">{factura.numero_factura}</td>
                    <td className="px-6 py-4 text-sm text-gray-600">{new Date(factura.fecha).toLocaleDateString()}</td>
                    <td className="px-6 py-4 text-sm font-medium text-gray-700">{factura.suplidores?.nombre}</td>
                    <td className="px-6 py-4 text-sm font-semibold text-gray-900">{formatCurrency(factura.total, factura.divisa || 'DOP')}</td>
                    <td className="px-6 py-4 text-sm font-semibold text-green-600">{formatCurrency(factura.monto_pagado, factura.divisa || 'DOP')}</td>
                    <td className="px-6 py-4 text-sm font-bold text-red-600">{formatCurrency(factura.balance_pendiente, factura.divisa || 'DOP')}</td>
                    <td className="px-6 py-4 text-sm">
                      <span className={`px-3 py-1.5 rounded-full text-xs font-bold shadow-sm ${
                        factura.estado === 'pagada' ? 'bg-gradient-to-r from-green-400 to-green-500 text-white' :
                        factura.estado === 'parcial' ? 'bg-gradient-to-r from-yellow-400 to-yellow-500 text-white' :
                        'bg-gradient-to-r from-red-400 to-red-500 text-white'
                      }`}>
                        {factura.estado === 'pagada' ? 'Pagada' : factura.estado === 'parcial' ? 'Parcial' : 'Pendiente'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm">
                      <div className="flex gap-2">
                        <button
                          onClick={() => verDetalleFactura(factura)}
                          className="bg-gradient-to-r from-purple-500 to-purple-600 text-white px-3 py-2 rounded-lg hover:from-purple-600 hover:to-purple-700 flex items-center gap-1 shadow-md hover:shadow-lg transition-all duration-200 transform hover:scale-105"
                          title="Ver detalles"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => editarFactura(factura)}
                          className="bg-gradient-to-r from-yellow-500 to-yellow-600 text-white px-3 py-2 rounded-lg hover:from-yellow-600 hover:to-yellow-700 flex items-center gap-1 shadow-md hover:shadow-lg transition-all duration-200 transform hover:scale-105"
                          title="Editar"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => eliminarFactura(factura)}
                          className="bg-gradient-to-r from-red-500 to-red-600 text-white px-3 py-2 rounded-lg hover:from-red-600 hover:to-red-700 flex items-center gap-1 shadow-md hover:shadow-lg transition-all duration-200 transform hover:scale-105"
                          title="Eliminar"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                        {factura.balance_pendiente > 0 && (
                          <button
                            onClick={() => setShowPagoModal(factura)}
                            className="bg-gradient-to-r from-blue-500 to-blue-600 text-white px-4 py-2 rounded-lg hover:from-blue-600 hover:to-blue-700 flex items-center gap-1 shadow-md hover:shadow-lg transition-all duration-200 transform hover:scale-105"
                          >
                            <DollarSign className="w-4 h-4" />
                            <span className="font-medium">Pagar</span>
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Modal Nueva Factura Moderno */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fadeIn">
          <div className="bg-white rounded-2xl max-w-5xl w-full max-h-[90vh] overflow-y-auto shadow-2xl border border-gray-200">
            <div className="sticky top-0 bg-gradient-to-r from-blue-600 to-purple-600 text-white p-6 rounded-t-2xl shadow-lg z-10">
              <h2 className="text-2xl font-bold">{editandoFactura ? 'Editar Factura de Compra' : 'Nueva Factura de Compra'}</h2>
              <p className="text-sm opacity-90 mt-1">{editandoFactura ? 'Modifica los datos de la factura' : 'Registra una nueva compra a proveedor'}</p>
            </div>
            <div className="p-6">
              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Información General */}
                <div className="bg-gradient-to-br from-blue-50 to-purple-50 p-6 rounded-xl border border-blue-100">
                  <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
                    <div className="w-2 h-2 bg-blue-600 rounded-full"></div>
                    Información General
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-bold text-gray-700 mb-2">No. Factura *</label>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          required
                          value={formData.numero_factura}
                          onChange={(e) => setFormData({...formData, numero_factura: e.target.value})}
                          className="flex-1 px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
                          placeholder="Ej: FC-0001"
                        />
                        <button
                          type="button"
                          onClick={handleGenerarNumero}
                          className="bg-gradient-to-r from-purple-500 to-purple-600 text-white px-4 py-3 rounded-xl hover:from-purple-600 hover:to-purple-700 font-bold shadow-md hover:shadow-lg transition-all duration-200 whitespace-nowrap"
                          title="Generar número automático"
                        >
                          🔄 Auto
                        </button>
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-bold text-gray-700 mb-2">Suplidor *</label>
                      <select
                        required
                        value={formData.suplidor_id}
                        onChange={(e) => setFormData({...formData, suplidor_id: e.target.value})}
                        className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
                      >
                        <option value="">Seleccionar...</option>
                        {suplidores.map(s => (
                          <option key={s.id} value={s.id}>{s.nombre}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-bold text-gray-700 mb-2">Fecha *</label>
                      <input
                        type="date"
                        required
                        value={formData.fecha}
                        onChange={(e) => setFormData({...formData, fecha: e.target.value})}
                        className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
                      />
                    </div>
                  </div>
                </div>

                {/* Configuración de Divisa e ITBIS */}
                <div className="bg-gradient-to-br from-green-50 to-blue-50 p-6 rounded-xl border border-green-100">
                  <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
                    <div className="w-2 h-2 bg-green-600 rounded-full"></div>
                    Configuración de Moneda e Impuestos
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-bold text-gray-700 mb-2">Divisa *</label>
                      <select
                        value={formData.divisa}
                        onChange={(e) => {
                          const divisa = e.target.value;
                          setFormData({
                            ...formData, 
                            divisa,
                            tasa_cambio: divisa === 'USD' ? tasaDolar : 1.00
                          });
                        }}
                        className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-all duration-200 bg-white"
                      >
                        <option value="DOP">🇩🇴 Pesos Dominicanos (DOP)</option>
                        <option value="USD">🇺🇸 Dólares (USD)</option>
                      </select>
                    </div>
                    {formData.divisa === 'USD' && (
                      <div>
                        <label className="block text-sm font-bold text-gray-700 mb-2">Tasa de Cambio</label>
                        <input
                          type="number"
                          step="0.01"
                          value={formData.tasa_cambio}
                          onChange={(e) => setFormData({...formData, tasa_cambio: parseFloat(e.target.value)})}
                          className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-all duration-200"
                          placeholder="Ej: 58.50"
                        />
                      </div>
                    )}
                    <div className="flex items-center">
                      <label className="flex items-center gap-3 cursor-pointer bg-white px-4 py-3 rounded-xl border-2 border-gray-200 hover:border-green-500 transition-all duration-200">
                        <input
                          type="checkbox"
                          checked={formData.aplicar_itbis}
                          onChange={(e) => setFormData({...formData, aplicar_itbis: e.target.checked})}
                          className="w-5 h-5 text-green-600 rounded focus:ring-2 focus:ring-green-500"
                        />
                        <span className="text-sm font-bold text-gray-700">Aplicar ITBIS (18%)</span>
                      </label>
                    </div>
                  </div>
                </div>

                {/* Items Modernos */}
                <div className="bg-gradient-to-br from-purple-50 to-pink-50 p-6 rounded-xl border border-purple-100">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-bold text-gray-800 flex items-center gap-2">
                      <div className="w-2 h-2 bg-purple-600 rounded-full"></div>
                      Items de la Factura
                    </h3>
                    <button
                      type="button"
                      onClick={agregarItem}
                      className="bg-gradient-to-r from-green-500 to-green-600 text-white px-4 py-2 rounded-xl hover:from-green-600 hover:to-green-700 text-sm font-bold shadow-md hover:shadow-lg transition-all duration-200 transform hover:scale-105 flex items-center gap-2"
                    >
                      <Plus className="w-4 h-4" />
                      Agregar Item
                    </button>
                  </div>
                  
                  {formData.items.map((item, index) => (
                    <div key={index} className="space-y-3 mb-4 p-5 bg-white rounded-xl border-2 border-purple-100 shadow-sm hover:shadow-md transition-all duration-200">
                      <div className="flex items-center justify-between mb-3">
                        <span className="text-sm font-bold text-purple-600">Item #{index + 1}</span>
                        <button
                          type="button"
                          onClick={() => eliminarItem(index)}
                          className="bg-gradient-to-r from-red-500 to-red-600 text-white px-3 py-1.5 rounded-lg hover:from-red-600 hover:to-red-700 text-xs font-bold shadow-sm hover:shadow-md transition-all duration-200"
                        >
                          Eliminar
                        </button>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                        <select
                          required
                          value={item.mercancia_id}
                          onChange={(e) => actualizarItem(index, 'mercancia_id', e.target.value)}
                          className="px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all duration-200 bg-white"
                        >
                          <option value="">Producto...</option>
                          {mercancias.map(m => (
                            <option key={m.id} value={m.id}>{m.nombre}</option>
                          ))}
                        </select>
                        <input
                          type="number"
                          required
                          placeholder="Cantidad"
                          value={item.cantidad}
                          onChange={(e) => actualizarItem(index, 'cantidad', e.target.value)}
                          className="px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all duration-200"
                        />
                        <div className="flex gap-2">
                          <input
                            type="number"
                            step="0.01"
                            required
                            placeholder="Precio Compra"
                            value={item.precio_unitario}
                            onChange={(e) => actualizarItem(index, 'precio_unitario', e.target.value)}
                            className="flex-1 px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all duration-200"
                          />
                          <select
                            value={item.divisa}
                            onChange={(e) => actualizarItem(index, 'divisa', e.target.value)}
                            className="px-3 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-500 bg-white font-bold transition-all duration-200"
                          >
                            <option value="DOP">DOP</option>
                            <option value="USD">USD</option>
                          </select>
                        </div>
                        <input
                          type="date"
                          placeholder="Vencimiento"
                          value={item.fecha_vencimiento}
                          onChange={(e) => actualizarItem(index, 'fecha_vencimiento', e.target.value)}
                          className="px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all duration-200"
                        />
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-2 border-t border-purple-100">
                        <input
                          type="number"
                          step="0.01"
                          placeholder="💰 Precio Venta 1 (Mayorista)"
                          value={item.precio_venta_1}
                          onChange={(e) => actualizarItem(index, 'precio_venta_1', e.target.value)}
                          className="px-4 py-3 border-2 border-green-200 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-all duration-200 bg-green-50"
                        />
                        <input
                          type="number"
                          step="0.01"
                          placeholder="💰 Precio Venta 2 (Detalle)"
                          value={item.precio_venta_2}
                          onChange={(e) => actualizarItem(index, 'precio_venta_2', e.target.value)}
                          className="px-4 py-3 border-2 border-blue-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 bg-blue-50"
                        />
                        <input
                          type="number"
                          step="0.01"
                          placeholder="💰 Precio Venta 3 (Especial)"
                          value={item.precio_venta_3}
                          onChange={(e) => actualizarItem(index, 'precio_venta_3', e.target.value)}
                          className="px-4 py-3 border-2 border-purple-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all duration-200 bg-purple-50"
                        />
                      </div>
                    </div>
                  ))}
                </div>

                {/* Totales Modernos */}
                <div className="bg-gradient-to-br from-gray-50 to-gray-100 p-6 rounded-xl border-2 border-gray-200">
                  <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
                    <div className="w-2 h-2 bg-gray-600 rounded-full"></div>
                    Resumen de Totales
                  </h3>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center p-3 bg-white rounded-lg">
                      <span className="text-sm font-medium text-gray-600">Subtotal:</span>
                      <span className="text-lg font-bold text-gray-900">{formatCurrency(subtotal, formData.divisa)}</span>
                    </div>
                    <div className="flex justify-between items-center p-3 bg-white rounded-lg">
                      <span className="text-sm font-medium text-gray-600">ITBIS (18%):</span>
                      <span className="text-lg font-bold text-orange-600">{formatCurrency(itbis, formData.divisa)}</span>
                    </div>
                    <div className="flex justify-between items-center p-4 bg-gradient-to-r from-blue-500 to-purple-600 rounded-xl text-white shadow-lg">
                      <span className="text-base font-bold">Total a Pagar:</span>
                      <span className="text-2xl font-bold">{formatCurrency(total, formData.divisa)}</span>
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">Notas Adicionales</label>
                  <textarea
                    value={formData.notas}
                    onChange={(e) => setFormData({...formData, notas: e.target.value})}
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
                    rows="3"
                    placeholder="Escribe cualquier nota o comentario adicional..."
                  />
                </div>

                <div className="flex gap-4 pt-4 border-t-2 border-gray-200">
                  <button
                    type="submit"
                    className="flex-1 bg-gradient-to-r from-blue-500 to-blue-600 text-white py-4 rounded-xl hover:from-blue-600 hover:to-blue-700 font-bold text-lg shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-105"
                  >
                    {editandoFactura ? '✏️ Actualizar Factura' : '💾 Guardar Factura'}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowModal(false);
                      setEditandoFactura(null);
                      setFormData({
                        numero_factura: '',
                        suplidor_id: '',
                        fecha: new Date().toISOString().split('T')[0],
                        divisa: 'DOP',
                        tasa_cambio: 1.00,
                        aplicar_itbis: true,
                        notas: '',
                        items: []
                      });
                    }}
                    className="flex-1 bg-gradient-to-r from-gray-400 to-gray-500 text-white py-4 rounded-xl hover:from-gray-500 hover:to-gray-600 font-bold text-lg shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-105"
                  >
                    ❌ Cancelar
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Modal Pago Moderno */}
      {showPagoModal && (
        <div className="fixed inset-0 bg-black bg-opacity-60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fadeIn">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-gray-200">
            <div className="bg-gradient-to-r from-green-500 to-green-600 text-white p-6 rounded-t-2xl shadow-lg">
              <h2 className="text-2xl font-bold flex items-center gap-2">
                <DollarSign className="w-6 h-6" />
                Registrar Pago
              </h2>
              <p className="text-sm opacity-90 mt-1">Abona a la factura pendiente</p>
            </div>
            <div className="p-6">
              <div className="mb-6 p-4 bg-gradient-to-br from-blue-50 to-purple-50 rounded-xl border-2 border-blue-100">
                <p className="text-sm text-gray-600 mb-1">Factura: <span className="font-bold text-gray-900">{showPagoModal.numero_factura}</span></p>
                <p className="text-sm text-gray-600">Balance Pendiente:</p>
                <p className="text-3xl font-bold text-red-600 mt-1">{formatCurrency(showPagoModal.balance_pendiente, showPagoModal.divisa || 'DOP')}</p>
              </div>
              <form onSubmit={handlePago} className="space-y-4">
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">Monto a Pagar *</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    max={showPagoModal.balance_pendiente}
                    value={pagoData.monto}
                    onChange={(e) => setPagoData({...pagoData, monto: e.target.value})}
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-all duration-200 text-lg font-bold"
                    placeholder="0.00"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">Método de Pago</label>
                  <select
                    value={pagoData.metodo_pago}
                    onChange={(e) => setPagoData({...pagoData, metodo_pago: e.target.value})}
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-all duration-200 bg-white"
                  >
                    <option value="efectivo">💵 Efectivo</option>
                    <option value="transferencia">🏦 Transferencia</option>
                    <option value="cheque">📝 Cheque</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">Referencia</label>
                  <input
                    type="text"
                    value={pagoData.referencia}
                    onChange={(e) => setPagoData({...pagoData, referencia: e.target.value})}
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-all duration-200"
                    placeholder="Número de referencia o cheque"
                  />
                </div>
                <div className="flex gap-3 pt-4 border-t-2 border-gray-200">
                  <button
                    type="submit"
                    className="flex-1 bg-gradient-to-r from-green-500 to-green-600 text-white py-3 rounded-xl hover:from-green-600 hover:to-green-700 font-bold shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-105"
                  >
                    ✅ Registrar Pago
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowPagoModal(null)}
                    className="flex-1 bg-gradient-to-r from-gray-400 to-gray-500 text-white py-3 rounded-xl hover:from-gray-500 hover:to-gray-600 font-bold shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-105"
                  >
                    Cancelar
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Modal Detalle Factura */}
      {showDetalleModal && (
        <div className="fixed inset-0 bg-black bg-opacity-60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fadeIn">
          <div className="bg-white rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto shadow-2xl border border-gray-200">
            <div className="sticky top-0 bg-gradient-to-r from-purple-600 to-pink-600 text-white p-6 rounded-t-2xl shadow-lg z-10">
              <h2 className="text-2xl font-bold flex items-center gap-2">
                <Eye className="w-6 h-6" />
                Detalle de Factura
              </h2>
              <p className="text-sm opacity-90 mt-1">Información completa de la compra</p>
            </div>
            <div className="p-6 space-y-6">
              {/* Información General */}
              <div className="bg-gradient-to-br from-blue-50 to-purple-50 p-6 rounded-xl border-2 border-blue-100">
                <h3 className="font-bold text-gray-800 mb-4">Información General</h3>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  <div>
                    <p className="text-sm text-gray-600">No. Factura</p>
                    <p className="font-bold text-gray-900">{showDetalleModal.numero_factura}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Fecha</p>
                    <p className="font-bold text-gray-900">{new Date(showDetalleModal.fecha).toLocaleDateString()}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Suplidor</p>
                    <p className="font-bold text-gray-900">{showDetalleModal.suplidores?.nombre}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Divisa</p>
                    <p className="font-bold text-gray-900">{showDetalleModal.divisa}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Estado</p>
                    <span className={`inline-block px-3 py-1 rounded-full text-xs font-bold ${
                      showDetalleModal.estado === 'pagada' ? 'bg-green-500 text-white' :
                      showDetalleModal.estado === 'parcial' ? 'bg-yellow-500 text-white' :
                      'bg-red-500 text-white'
                    }`}>
                      {showDetalleModal.estado === 'pagada' ? 'Pagada' : showDetalleModal.estado === 'parcial' ? 'Parcial' : 'Pendiente'}
                    </span>
                  </div>
                </div>
                {showDetalleModal.notas && (
                  <div className="mt-4 pt-4 border-t border-blue-200">
                    <p className="text-sm text-gray-600">Notas</p>
                    <p className="text-gray-900">{showDetalleModal.notas}</p>
                  </div>
                )}
              </div>

              {/* Items */}
              <div className="bg-gradient-to-br from-purple-50 to-pink-50 p-6 rounded-xl border-2 border-purple-100">
                <h3 className="font-bold text-gray-800 mb-4">Items de la Factura</h3>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-white border-b-2 border-purple-200">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-bold text-gray-700">Producto</th>
                        <th className="px-4 py-3 text-left text-xs font-bold text-gray-700">Cantidad</th>
                        <th className="px-4 py-3 text-left text-xs font-bold text-gray-700">Precio Unit.</th>
                        <th className="px-4 py-3 text-left text-xs font-bold text-gray-700">Subtotal</th>
                        <th className="px-4 py-3 text-left text-xs font-bold text-gray-700">Vencimiento</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-purple-100">
                      {showDetalleModal.items?.map((item, index) => (
                        <tr key={index} className="hover:bg-white transition-colors">
                          <td className="px-4 py-3 text-sm font-medium text-gray-900">{item.mercancias?.nombre}</td>
                          <td className="px-4 py-3 text-sm text-gray-700">{item.cantidad} {item.mercancias?.unidad_medida}</td>
                          <td className="px-4 py-3 text-sm font-semibold text-gray-900">{formatCurrency(item.precio_unitario, item.divisa || 'DOP')}</td>
                          <td className="px-4 py-3 text-sm font-bold text-purple-600">{formatCurrency(item.subtotal, showDetalleModal.divisa || 'DOP')}</td>
                          <td className="px-4 py-3 text-sm text-gray-600">
                            {item.fecha_vencimiento ? new Date(item.fecha_vencimiento).toLocaleDateString() : 'N/A'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Totales */}
              <div className="bg-gradient-to-br from-gray-50 to-gray-100 p-6 rounded-xl border-2 border-gray-200">
                <h3 className="font-bold text-gray-800 mb-4">Resumen Financiero</h3>
                <div className="space-y-3">
                  <div className="flex justify-between items-center p-3 bg-white rounded-lg">
                    <span className="text-sm font-medium text-gray-600">Subtotal:</span>
                    <span className="text-lg font-bold text-gray-900">{formatCurrency(showDetalleModal.subtotal, showDetalleModal.divisa || 'DOP')}</span>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-white rounded-lg">
                    <span className="text-sm font-medium text-gray-600">ITBIS (18%):</span>
                    <span className="text-lg font-bold text-orange-600">{formatCurrency(showDetalleModal.itbis, showDetalleModal.divisa || 'DOP')}</span>
                  </div>
                  <div className="flex justify-between items-center p-4 bg-gradient-to-r from-blue-500 to-purple-600 rounded-xl text-white shadow-lg">
                    <span className="text-base font-bold">Total:</span>
                    <span className="text-2xl font-bold">{formatCurrency(showDetalleModal.total, showDetalleModal.divisa || 'DOP')}</span>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-green-100 rounded-lg border-2 border-green-300">
                    <span className="text-sm font-medium text-green-800">Monto Pagado:</span>
                    <span className="text-lg font-bold text-green-700">{formatCurrency(showDetalleModal.monto_pagado, showDetalleModal.divisa || 'DOP')}</span>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-red-100 rounded-lg border-2 border-red-300">
                    <span className="text-sm font-medium text-red-800">Balance Pendiente:</span>
                    <span className="text-lg font-bold text-red-700">{formatCurrency(showDetalleModal.balance_pendiente, showDetalleModal.divisa || 'DOP')}</span>
                  </div>
                </div>
              </div>

              <div className="flex justify-end">
                <button
                  onClick={() => setShowDetalleModal(null)}
                  className="bg-gradient-to-r from-gray-400 to-gray-500 text-white px-8 py-3 rounded-xl hover:from-gray-500 hover:to-gray-600 font-bold shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-105"
                >
                  Cerrar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}