import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { FileText, Plus, X, DollarSign, Search, AlertCircle, CheckCircle, Printer, Trash2, Eye, Edit, PenTool } from 'lucide-react';
import { generarPDFFacturaVenta } from '../lib/pdfFacturaVenta';
import { getFechaActual, formatearFechaLocal } from '../lib/dateUtils';
import { formatCurrency } from '../lib/formatters';
import FirmaDigital from './FirmaDigital';
import SearchableSelect from './SearchableSelect';

export default function FacturasVenta() {
  const [facturas, setFacturas] = useState([]);
  const [clientes, setClientes] = useState([]);
  const [mercancias, setMercancias] = useState([]);
  const [mostrarModal, setMostrarModal] = useState(false);
  const [mostrarPagos, setMostrarPagos] = useState(false);
  const [mostrarDetalles, setMostrarDetalles] = useState(false);
  const [mostrarFirma, setMostrarFirma] = useState(false);
  const [modoEdicion, setModoEdicion] = useState(false);
  const [facturaSeleccionada, setFacturaSeleccionada] = useState(null);
  const [busqueda, setBusqueda] = useState('');
  const [loading, setLoading] = useState(false);
  const [isDeletingDuplicates, setIsDeletingDuplicates] = useState(false);

  const generarPDF = async () => {
    const { generarPDFFacturasVenta } = await import('../lib/pdfGeneratorExtras');
    generarPDFFacturasVenta(facturas);
  };

  const [nuevaFactura, setNuevaFactura] = useState({
    numero_factura: '',
    cliente_id: '',
    fecha: getFechaActual(), // Siempre se inicializa con la fecha actual del sistema
    tipo_venta: 'credito', // 'contado' o 'credito'
    metodo_pago: 'efectivo', // solo para contado
    descuento_porcentaje: 0, // descuento solo para contado
    aplicar_itbis: true, // checkbox para aplicar o no ITBIS
    divisa: 'DOP', // DOP o USD
    tasa_cambio: 1.0000, // tasa de conversión
    notas: '',
    firma_cliente: null, // firma digital
    items: []
  });

  // Actualizar fecha cada vez que se abre el modal
  useEffect(() => {
    if (mostrarModal && !modoEdicion) {
      setNuevaFactura(prev => ({
        ...prev,
        fecha: getFechaActual() // Asegurar que siempre tenga la fecha actual
      }));
    }
  }, [mostrarModal, modoEdicion]);

  const [nuevoItem, setNuevoItem] = useState({
    mercancia_id: '',
    cantidad: '',
    precio_unitario: '',
    nivel_precio: '1' // 1, 2 o 3
  });

  const [busquedaProducto, setBusquedaProducto] = useState('');

  const [nuevoPago, setNuevoPago] = useState({
    fecha: getFechaActual(),
    monto: '',
    metodo_pago: 'efectivo',
    referencia: '',
    notas: ''
  });

  useEffect(() => {
    cargarDatos();
  }, []);

  const cargarDatos = async () => {
    setLoading(true);
    try {
      const [facturasRes, clientesRes, mercanciasRes] = await Promise.all([
        supabase.from('facturas_venta').select('*, clientes(nombre)').order('fecha', { ascending: false }),
        supabase.from('clientes').select('*').order('nombre'),
        supabase.from('mercancias').select('*').eq('activo', true).order('nombre')
      ]);

      if (facturasRes.data) setFacturas(facturasRes.data);
      if (clientesRes.data) setClientes(clientesRes.data);
      if (mercanciasRes.data) setMercancias(mercanciasRes.data);
    } catch (error) {
      console.error('Error:', error);
      alert('Error al cargar datos');
    }
    setLoading(false);
  };

  const generarNumeroFactura = async () => {
    try {
      // Obtener todas las facturas que empiezan con AGV-
      const { data: facturas } = await supabase
        .from('facturas_venta')
        .select('numero_factura')
        .like('numero_factura', 'AGV-%')
        .order('numero_factura', { ascending: false })
        .limit(1);

      let nuevoNumero = 4; // Comenzar desde AGV-004

      if (facturas && facturas.length > 0) {
        // Extraer el número de la última factura
        const ultimoNumero = facturas[0].numero_factura.split('-')[1];
        nuevoNumero = parseInt(ultimoNumero) + 1;
      }

      // Formatear con ceros a la izquierda (AGV-004, AGV-005, etc.)
      const numeroFormateado = `AGV-${String(nuevoNumero).padStart(3, '0')}`;
      
      setNuevaFactura({ ...nuevaFactura, numero_factura: numeroFormateado });
      
    } catch (error) {
      console.error('Error al generar número de factura:', error);
      alert('Error al generar número de factura');
    }
  };

  const eliminarDuplicados = async () => {
    if (!confirm('¿Está seguro de eliminar facturas duplicadas? Se mantendrá la factura más antigua de cada grupo de duplicados.')) {
      return;
    }

    setIsDeletingDuplicates(true);
    try {
      const { data: allFacturas, error } = await supabase
        .from('facturas_venta')
        .select('id, numero_factura, cliente_id, fecha')
        .order('fecha', { ascending: true }); // Ordenar por fecha para mantener la más antigua

      if (error) throw error;

      const facturasPorNumeroCliente = {};
      for (const factura of allFacturas) {
        const key = `${factura.numero_factura}-${factura.cliente_id}`;
        if (!facturasPorNumeroCliente[key]) {
          facturasPorNumeroCliente[key] = [];
        }
        facturasPorNumeroCliente[key].push(factura);
      }

      let duplicadosEliminados = 0;
      for (const key in facturasPorNumeroCliente) {
        const grupo = facturasPorNumeroCliente[key];
        if (grupo.length > 1) {
          // Mantener la primera (más antigua) y eliminar el resto
          const idsAEliminar = grupo.slice(1).map(f => f.id);
          
          // Eliminar items de factura, cobros, ventas_diarias y cuentas_por_cobrar asociados a los duplicados
          for (const id of idsAEliminar) {
            // Obtener items de la factura para devolver al inventario
            const { data: items } = await supabase
              .from('items_factura_venta')
              .select('mercancia_id, cantidad')
              .eq('factura_venta_id', id);

            // Devolver productos al inventario
            for (const item of items || []) {
              const { data: mercancia } = await supabase
                .from('mercancias')
                .select('stock_actual')
                .eq('id', item.mercancia_id)
                .single();

              if (mercancia) {
                await supabase
                  .from('mercancias')
                  .update({ stock_actual: mercancia.stock_actual + item.cantidad })
                  .eq('id', item.mercancia_id);
              }
            }

            // Si era a crédito, restar del balance del cliente
            const { data: facturaEliminar } = await supabase
              .from('facturas_venta')
              .select('balance_pendiente, cliente_id')
              .eq('id', id)
              .single();

            if (facturaEliminar && facturaEliminar.balance_pendiente > 0) {
              const { data: cliente } = await supabase
                .from('clientes')
                .select('balance_pendiente')
                .eq('id', facturaEliminar.cliente_id)
                .single();

              if (cliente) {
                await supabase
                  .from('clientes')
                  .update({ balance_pendiente: Math.max(0, cliente.balance_pendiente - facturaEliminar.balance_pendiente) })
                  .eq('id', facturaEliminar.cliente_id);
              }
            }

            // Eliminar de cuentas_por_cobrar
            await supabase
              .from('cuentas_por_cobrar')
              .delete()
              .eq('referencia', grupo.find(f => f.id === id)?.numero_factura || '')
              .in('tipo', ['Factura', 'factura_venta', 'factura']);

            // Eliminar de ventas_diarias
            await supabase
              .from('ventas_diarias')
              .delete()
              .eq('factura_venta_id', id);

            // Eliminar cobros asociados
            await supabase
              .from('cobros_clientes')
              .delete()
              .eq('factura_venta_id', id);

            // Finalmente, eliminar la factura duplicada
            await supabase
              .from('facturas_venta')
              .delete()
              .in('id', [id]);
            duplicadosEliminados++;
          }
        }
      }

      alert(`Se eliminaron ${duplicadosEliminados} facturas duplicadas.`);
      cargarDatos();
    } catch (error) {
      console.error('Error al eliminar duplicados:', error);
      alert('Error al eliminar facturas duplicadas: ' + error.message);
    } finally {
      setIsDeletingDuplicates(false);
    }
  };

  const agregarItem = () => {
    if (!nuevoItem.mercancia_id || !nuevoItem.cantidad || !nuevoItem.precio_unitario) {
      alert('Complete todos los campos del item');
      return;
    }

    const mercancia = mercancias.find(m => m.id === parseInt(nuevoItem.mercancia_id));
    
    if (!mercancia) {
      alert('Producto no encontrado');
      return;
    }

    if (parseInt(nuevoItem.cantidad) > mercancia.stock_actual) {
      alert(`Stock insuficiente. Disponible: ${mercancia.stock_actual} ${mercancia.unidad_medida}`);
      return;
    }

    const subtotal = parseFloat(nuevoItem.cantidad) * parseFloat(nuevoItem.precio_unitario);

    setNuevaFactura({
      ...nuevaFactura,
      items: [...nuevaFactura.items, {
        mercancia_id: parseInt(nuevoItem.mercancia_id),
        mercancia_nombre: mercancia.nombre,
        cantidad: parseFloat(nuevoItem.cantidad),
        precio_unitario: parseFloat(nuevoItem.precio_unitario),
        subtotal: subtotal
      }]
    });

    setNuevoItem({ mercancia_id: '', cantidad: '', precio_unitario: '', nivel_precio: '1' });
  };

  const eliminarItem = (index) => {
    setNuevaFactura({
      ...nuevaFactura,
      items: nuevaFactura.items.filter((_, i) => i !== index)
    });
  };

  const calcularTotales = () => {
    const subtotal = nuevaFactura.items.reduce((sum, item) => sum + item.subtotal, 0);
    const descuento_monto = nuevaFactura.tipo_venta === 'contado' 
      ? subtotal * (parseFloat(nuevaFactura.descuento_porcentaje) / 100) 
      : 0;
    const subtotalConDescuento = subtotal - descuento_monto;
    const itbis = nuevaFactura.aplicar_itbis ? subtotalConDescuento * 0.18 : 0;
    const total = subtotalConDescuento + itbis;
    return { subtotal, descuento_monto, itbis, total };
  };

  const guardarFactura = async () => {
    if (!nuevaFactura.numero_factura || !nuevaFactura.cliente_id || nuevaFactura.items.length === 0) {
      alert('Complete todos los campos y agregue al menos un item');
      return;
    }

    setLoading(true);
    try {
      const { subtotal, descuento_monto, itbis, total } = calcularTotales();

      if (modoEdicion) {
        // MODO EDICIÓN
        // Obtener datos de la factura anterior
        const { data: facturaAnterior } = await supabase
          .from('facturas_venta')
          .select('balance_pendiente, cliente_id')
          .eq('id', nuevaFactura.id)
          .single();

        // Obtener items anteriores para devolver al inventario
        const { data: itemsAnteriores } = await supabase
          .from('items_factura_venta')
          .select('mercancia_id, cantidad')
          .eq('factura_venta_id', nuevaFactura.id);

        // Devolver productos al inventario
        for (const item of itemsAnteriores || []) {
          const { data: mercancia } = await supabase
            .from('mercancias')
            .select('stock_actual')
            .eq('id', item.mercancia_id)
            .single();

          if (mercancia) {
            await supabase
              .from('mercancias')
              .update({ stock_actual: mercancia.stock_actual + item.cantidad })
              .eq('id', item.mercancia_id);
          }
        }

        // Si la factura anterior tenía balance pendiente, restarlo del cliente y eliminar de cuentas_por_cobrar
        if (facturaAnterior && facturaAnterior.balance_pendiente > 0) {
          const { data: cliente } = await supabase
            .from('clientes')
            .select('balance_pendiente')
            .eq('id', facturaAnterior.cliente_id)
            .single();

          if (cliente) {
            await supabase
              .from('clientes')
              .update({ 
                balance_pendiente: Math.max(0, cliente.balance_pendiente - facturaAnterior.balance_pendiente) 
              })
              .eq('id', facturaAnterior.cliente_id);
          }

          // Eliminar registro anterior de cuentas_por_cobrar si existe (cualquier tipo de factura)
          await supabase
            .from('cuentas_por_cobrar')
            .delete()
            .eq('referencia', nuevaFactura.numero_factura)
            .in('tipo', ['Factura', 'factura_venta', 'factura']);
        }

        // Eliminar items anteriores
        await supabase
          .from('items_factura_venta')
          .delete()
          .eq('factura_venta_id', nuevaFactura.id);

        // Eliminar registro anterior de ventas_diarias
        await supabase
          .from('ventas_diarias')
          .delete()
          .eq('factura_venta_id', nuevaFactura.id);

        // Verificar stock disponible para nuevos items
        for (const item of nuevaFactura.items) {
          const { data: mercancia } = await supabase
            .from('mercancias')
            .select('stock_actual, nombre')
            .eq('id', item.mercancia_id)
            .single();

          if (mercancia.stock_actual < item.cantidad) {
            alert(`Stock insuficiente para ${mercancia.nombre}`);
            setLoading(false);
            return;
          }
        }

        // Determinar estado según tipo de venta
        const esContado = nuevaFactura.tipo_venta === 'contado';
        const estadoInicial = esContado ? 'pagada' : 'pendiente';
        const montoPagadoInicial = esContado ? total : 0;
        const balancePendienteInicial = esContado ? 0 : total;

        // Actualizar factura
        await supabase
          .from('facturas_venta')
          .update({
            numero_factura: nuevaFactura.numero_factura,
            cliente_id: nuevaFactura.cliente_id,
            fecha: nuevaFactura.fecha,
            subtotal,
            itbis,
            total,
            balance_pendiente: balancePendienteInicial,
            monto_pagado: montoPagadoInicial,
            estado: estadoInicial,
            descuento_porcentaje: nuevaFactura.tipo_venta === 'contado' ? parseFloat(nuevaFactura.descuento_porcentaje) : 0,
            descuento_monto: descuento_monto,
            divisa: nuevaFactura.divisa,
            tasa_cambio: parseFloat(nuevaFactura.tasa_cambio),
            notas: nuevaFactura.notas,
            firma_cliente: nuevaFactura.firma_cliente
          })
          .eq('id', nuevaFactura.id);

        // Insertar nuevos items y actualizar inventario
        for (const item of nuevaFactura.items) {
          await supabase.from('items_factura_venta').insert({
            factura_venta_id: nuevaFactura.id,
            mercancia_id: item.mercancia_id,
            cantidad: item.cantidad,
            precio_unitario: item.precio_unitario,
            subtotal: item.subtotal
          });

          const { data: mercancia } = await supabase
            .from('mercancias')
            .select('stock_actual')
            .eq('id', item.mercancia_id)
            .single();

          await supabase
            .from('mercancias')
            .update({ stock_actual: mercancia.stock_actual - item.cantidad })
            .eq('id', item.mercancia_id);
        }

        // Si es a crédito, actualizar balance del cliente con el nuevo total y registrar en cuentas_por_cobrar
        if (!esContado) {
          const { data: cliente } = await supabase
            .from('clientes')
            .select('balance_pendiente, nombre, cedula')
            .eq('id', nuevaFactura.cliente_id)
            .single();

          await supabase
            .from('clientes')
            .update({ balance_pendiente: (cliente.balance_pendiente || 0) + total })
            .eq('id', nuevaFactura.cliente_id);

          // Verificar si ya existe un registro en cuentas_por_cobrar para evitar duplicados
          const { data: cuentaExistente } = await supabase
            .from('cuentas_por_cobrar')
            .select('id')
            .eq('referencia', nuevaFactura.numero_factura)
            .eq('tipo', 'Factura')
            .single();

          const datosCuenta = {
            cliente_id: nuevaFactura.cliente_id,
            cliente: cliente.nombre,
            cedula: cliente.cedula || '',
            tipo: 'Factura',
            referencia: nuevaFactura.numero_factura,
            monto_total: total,
            monto_pendiente: total,
            fecha_emision: nuevaFactura.fecha,
            fecha_vencimiento: null,
            estado: 'Pendiente',
            divisa: nuevaFactura.divisa
          };

          if (cuentaExistente) {
            // Actualizar registro existente
            await supabase
              .from('cuentas_por_cobrar')
              .update(datosCuenta)
              .eq('id', cuentaExistente.id);
          } else {
            // Crear nuevo registro
            await supabase.from('cuentas_por_cobrar').insert(datosCuenta);
          }
        }

        // Registrar en ventas_diarias (nuevo registro) con divisa y tasa_cambio
        await supabase.from('ventas_diarias').insert({
          factura_venta_id: nuevaFactura.id,
          numero_factura: nuevaFactura.numero_factura,
          cliente_id: nuevaFactura.cliente_id,
          fecha: nuevaFactura.fecha,
          tipo_venta: nuevaFactura.tipo_venta,
          subtotal,
          itbis,
          total,
          metodo_pago: esContado ? nuevaFactura.metodo_pago : null,
          balance_pendiente: balancePendienteInicial,
          monto_pagado: montoPagadoInicial,
          estado: estadoInicial,
          divisa: nuevaFactura.divisa,
          tasa_cambio: parseFloat(nuevaFactura.tasa_cambio)
        });

        alert('Factura actualizada exitosamente');
      } else {
        // MODO CREACIÓN
        // Verificar stock disponible
        for (const item of nuevaFactura.items) {
          const { data: mercancia } = await supabase
            .from('mercancias')
            .select('stock_actual, nombre')
            .eq('id', item.mercancia_id)
            .single();

          if (mercancia.stock_actual < item.cantidad) {
            alert(`Stock insuficiente para ${mercancia.nombre}`);
            setLoading(false);
            return;
          }
        }

        // Determinar estado según tipo de venta
        const esContado = nuevaFactura.tipo_venta === 'contado';
        const estadoInicial = esContado ? 'pagada' : 'pendiente';
        const montoPagadoInicial = esContado ? total : 0;
        const balancePendienteInicial = esContado ? 0 : total;

        // Crear factura
        const { data: factura, error: errorFactura } = await supabase
          .from('facturas_venta')
          .insert({
            numero_factura: nuevaFactura.numero_factura,
            cliente_id: nuevaFactura.cliente_id,
            fecha: nuevaFactura.fecha,
            subtotal,
            itbis,
            total,
            balance_pendiente: balancePendienteInicial,
            monto_pagado: montoPagadoInicial,
            estado: estadoInicial,
            descuento_porcentaje: nuevaFactura.tipo_venta === 'contado' ? parseFloat(nuevaFactura.descuento_porcentaje) : 0,
            descuento_monto: descuento_monto,
            divisa: nuevaFactura.divisa,
            tasa_cambio: parseFloat(nuevaFactura.tasa_cambio),
            notas: nuevaFactura.notas,
            firma_cliente: nuevaFactura.firma_cliente
          })
          .select()
          .single();

        if (errorFactura) throw errorFactura;

        // Insertar items y actualizar inventario
        for (const item of nuevaFactura.items) {
          await supabase.from('items_factura_venta').insert({
            factura_venta_id: factura.id,
            mercancia_id: item.mercancia_id,
            cantidad: item.cantidad,
            precio_unitario: item.precio_unitario,
            subtotal: item.subtotal
          });

          const { data: mercancia } = await supabase
            .from('mercancias')
            .select('stock_actual')
            .eq('id', item.mercancia_id)
            .single();

          await supabase
            .from('mercancias')
            .update({ stock_actual: mercancia.stock_actual - item.cantidad })
            .eq('id', item.mercancia_id);
        }

        // Si es a crédito, actualizar balance del cliente y registrar en cuentas_por_cobrar
        if (!esContado) {
          const { data: cliente } = await supabase
            .from('clientes')
            .select('balance_pendiente, nombre, cedula')
            .eq('id', nuevaFactura.cliente_id)
            .single();

          await supabase
            .from('clientes')
            .update({ balance_pendiente: (cliente.balance_pendiente || 0) + total })
            .eq('id', nuevaFactura.cliente_id);

          // Verificar si ya existe un registro en cuentas_por_cobrar para evitar duplicados
          const { data: cuentaExistente } = await supabase
            .from('cuentas_por_cobrar')
            .select('id')
            .eq('referencia', nuevaFactura.numero_factura)
            .eq('tipo', 'Factura')
            .single();

          const datosCuenta = {
            cliente_id: nuevaFactura.cliente_id,
            cliente: cliente.nombre,
            cedula: cliente.cedula || '',
            tipo: 'Factura',
            referencia: nuevaFactura.numero_factura,
            monto_total: total,
            monto_pendiente: total,
            fecha_emision: nuevaFactura.fecha,
            fecha_vencimiento: null,
            estado: 'Pendiente',
            divisa: nuevaFactura.divisa
          };

          if (cuentaExistente) {
            // Actualizar registro existente
            await supabase
              .from('cuentas_por_cobrar')
              .update(datosCuenta)
              .eq('id', cuentaExistente.id);
          } else {
            // Crear nuevo registro
            await supabase.from('cuentas_por_cobrar').insert(datosCuenta);
          }
        }

        // Si es al contado, registrar el cobro automáticamente
        if (esContado) {
          await supabase.from('cobros_clientes').insert({
            factura_venta_id: factura.id,
            cliente_id: nuevaFactura.cliente_id,
            fecha: nuevaFactura.fecha,
            monto: total,
            metodo_pago: nuevaFactura.metodo_pago,
            referencia: `Pago contado - ${nuevaFactura.numero_factura}`,
            notas: 'Pago automático al contado'
          });

          // Registrar en Cuadre de Caja (verificar duplicados primero)
          // Obtener la divisa directamente de la factura guardada para asegurar que sea correcta
          // IMPORTANTE: Usar la divisa de la factura guardada, no del estado
          let divisaFactura = factura.divisa;
          
          // Si la factura no tiene divisa o es null/undefined, usar la del estado
          if (!divisaFactura || divisaFactura === null || divisaFactura === undefined) {
            divisaFactura = nuevaFactura.divisa || 'DOP';
          }
          
          // Asegurar que sea DOP o USD, nunca null o undefined
          if (divisaFactura !== 'DOP' && divisaFactura !== 'USD') {
            divisaFactura = 'DOP';
          }
          
          console.log('=== REGISTRANDO EN CUADRE DE CAJA ===');
          console.log('Divisa de factura guardada (BD):', factura.divisa);
          console.log('Divisa de nuevaFactura (estado):', nuevaFactura.divisa);
          console.log('Divisa final a usar:', divisaFactura);
          
          const cuadreDataContado = {
            fecha: nuevaFactura.fecha,
            tipo_movimiento: 'ingreso',
            concepto: 'venta_contado',
            referencia: nuevaFactura.numero_factura,
            monto: total,
            metodo_pago: nuevaFactura.metodo_pago,
            divisa: divisaFactura,
            descripcion: `Venta de contado - Factura ${nuevaFactura.numero_factura} - Cliente: ${clientes.find(c => c.id === nuevaFactura.cliente_id)?.nombre || 'N/A'}`,
            cliente_id: nuevaFactura.cliente_id
          };

          console.log('Insertando en cuadre de caja con divisa:', divisaFactura, 'Datos:', cuadreDataContado);

          // Verificar si ya existe un registro similar para evitar duplicados
          const { data: registrosExistentes } = await supabase
            .from('cuadre_caja')
            .select('id, divisa')
            .eq('referencia', nuevaFactura.numero_factura)
            .eq('concepto', 'venta_contado');

          // Si existe un registro pero tiene la divisa incorrecta, corregirlo
          if (registrosExistentes && registrosExistentes.length > 0) {
            const registroExistente = registrosExistentes[0];
            if (registroExistente.divisa !== divisaFactura) {
              console.log('Corrigiendo divisa de registro existente de', registroExistente.divisa, 'a', divisaFactura);
              await supabase
                .from('cuadre_caja')
                .update({ divisa: divisaFactura })
                .eq('id', registroExistente.id);
              console.log('Registro existente corregido');
            } else {
              console.log('Registro ya existe con divisa correcta:', divisaFactura);
            }
          }

          // Solo insertar si no existe ningún registro con esa referencia y concepto
          if (!registrosExistentes || registrosExistentes.length === 0) {
            // Intentar insertar con divisa explícita
            const { data: dataInsertada, error: cuadreErrorContado } = await supabase
              .from('cuadre_caja')
              .insert(cuadreDataContado)
              .select();
            
            if (cuadreErrorContado) {
              console.error('Error al registrar en cuadre de caja:', cuadreErrorContado);
              // Si falla por columna divisa, intentar sin ella y luego actualizar
              if (cuadreErrorContado.message && cuadreErrorContado.message.includes('divisa')) {
                const { divisa, ...cuadreDataSinDivisa } = cuadreDataContado;
                const { data: dataInsertadaSinDivisa, error: errorSinDivisa } = await supabase
                  .from('cuadre_caja')
                  .insert(cuadreDataSinDivisa)
                  .select();
                if (!errorSinDivisa && dataInsertadaSinDivisa && dataInsertadaSinDivisa.length > 0) {
                  // Actualizar el registro recién insertado con la divisa correcta
                  const { error: errorUpdate } = await supabase
                    .from('cuadre_caja')
                    .update({ divisa: divisaFactura })
                    .eq('id', dataInsertadaSinDivisa[0].id);
                  
                  if (errorUpdate) {
                    console.error('Error al actualizar divisa:', errorUpdate);
                  } else {
                    console.log('Divisa actualizada correctamente a:', divisaFactura);
                  }
                } else if (errorSinDivisa) {
                  console.error('Error al insertar sin divisa:', errorSinDivisa);
                }
              }
            } else if (dataInsertada && dataInsertada.length > 0) {
              const registroId = dataInsertada[0].id;
              console.log('Registro insertado con ID:', registroId);
              
              // FORZAR actualización de la divisa inmediatamente después de insertar
              // Esto asegura que incluso si hay un valor por defecto en la BD, se sobrescriba
              console.log('Forzando actualización de divisa a:', divisaFactura);
              const { error: errorUpdateForzado, data: dataUpdateForzado } = await supabase
                .from('cuadre_caja')
                .update({ divisa: divisaFactura })
                .eq('id', registroId)
                .select();
              
              if (errorUpdateForzado) {
                console.error('Error al forzar actualización de divisa:', errorUpdateForzado);
              } else {
                console.log('Divisa actualizada forzadamente a:', divisaFactura);
              }
              
              // Verificar que la divisa se guardó correctamente después de la actualización
              await new Promise(resolve => setTimeout(resolve, 200));
              
              const { data: registroVerificado, error: errorVerificacion } = await supabase
                .from('cuadre_caja')
                .select('divisa, referencia, concepto')
                .eq('id', registroId)
                .single();
              
              if (!errorVerificacion && registroVerificado) {
                console.log('Verificación final - Divisa en BD:', registroVerificado.divisa, 'Divisa esperada:', divisaFactura);
                
                if (registroVerificado.divisa !== divisaFactura) {
                  console.error('ERROR: La divisa NO coincide después de la actualización!');
                  console.error('Registro:', registroVerificado);
                  // Intentar actualizar una vez más
                  await supabase
                    .from('cuadre_caja')
                    .update({ divisa: divisaFactura })
                    .eq('id', registroId);
                } else {
                  console.log('✓ Divisa correcta confirmada:', divisaFactura);
                }
              }
            }
          } else {
            console.log('Registro ya existe en cuadre de caja, omitiendo inserción');
          }
        }

        // Registrar en ventas_diarias con divisa y tasa_cambio
        await supabase.from('ventas_diarias').insert({
          factura_venta_id: factura.id,
          numero_factura: nuevaFactura.numero_factura,
          cliente_id: nuevaFactura.cliente_id,
          fecha: nuevaFactura.fecha,
          tipo_venta: nuevaFactura.tipo_venta,
          subtotal,
          itbis,
          total,
          metodo_pago: esContado ? nuevaFactura.metodo_pago : null,
          balance_pendiente: balancePendienteInicial,
          monto_pagado: montoPagadoInicial,
          estado: estadoInicial,
          divisa: nuevaFactura.divisa,
          tasa_cambio: parseFloat(nuevaFactura.tasa_cambio)
        });

        alert(`Factura guardada exitosamente ${esContado ? '(Pagada al contado)' : '(A crédito)'}`);
      }

      setMostrarModal(false);
      setModoEdicion(false);
      setNuevaFactura({
        numero_factura: '',
        cliente_id: '',
        fecha: getFechaActual(), // Resetear con fecha actual del sistema
        tipo_venta: 'credito',
        metodo_pago: 'efectivo',
        descuento_porcentaje: 0,
        aplicar_itbis: true,
        divisa: 'DOP',
        tasa_cambio: 1.0000,
        notas: '',
        firma_cliente: null,
        items: []
      });
      cargarDatos();
    } catch (error) {
      console.error('Error:', error);
      alert('Error al guardar factura: ' + error.message);
    }
    setLoading(false);
  };

  const abrirPagos = async (factura) => {
    const { data: items } = await supabase
      .from('items_factura_venta')
      .select('*, mercancias(nombre, unidad_medida)')
      .eq('factura_venta_id', factura.id);

    const { data: pagos } = await supabase
      .from('cobros_clientes')
      .select('*')
      .eq('factura_venta_id', factura.id)
      .order('fecha', { ascending: false });

    setFacturaSeleccionada({ ...factura, items, pagos: pagos || [] });
    setMostrarPagos(true);
  };

  const verDetalles = async (factura) => {
    const { data: items } = await supabase
      .from('items_factura_venta')
      .select('*, mercancias(nombre, unidad_medida)')
      .eq('factura_venta_id', factura.id);

    setFacturaSeleccionada({ ...factura, items: items || [] });
    setMostrarDetalles(true);
  };

  const imprimirFactura = async (factura) => {
    const { data: items } = await supabase
      .from('items_factura_venta')
      .select('*, mercancias(nombre, unidad_medida)')
      .eq('factura_venta_id', factura.id);

    generarPDFFacturaVenta(factura, items || []);
  };

  const abrirEdicion = async (factura) => {
    const { data: items } = await supabase
      .from('items_factura_venta')
      .select('*, mercancias(nombre, unidad_medida)')
      .eq('factura_venta_id', factura.id);

    const itemsFormateados = items.map(item => ({
      mercancia_id: item.mercancia_id,
      mercancia_nombre: item.mercancias?.nombre,
      cantidad: item.cantidad,
      precio_unitario: item.precio_unitario,
      subtotal: item.subtotal
    }));

    setNuevaFactura({
      id: factura.id,
      numero_factura: factura.numero_factura,
      cliente_id: factura.cliente_id,
      fecha: factura.fecha,
      tipo_venta: factura.balance_pendiente > 0 ? 'credito' : 'contado',
      metodo_pago: 'efectivo',
      descuento_porcentaje: factura.descuento_porcentaje || 0,
      aplicar_itbis: factura.itbis > 0,
      divisa: factura.divisa || 'DOP',
      tasa_cambio: factura.tasa_cambio || 1.0000,
      notas: factura.notas || '',
      firma_cliente: factura.firma_cliente || null,
      items: itemsFormateados
    });
    setModoEdicion(true);
    setMostrarModal(true);
  };

  const registrarPago = async () => {
    if (!nuevoPago.monto || parseFloat(nuevoPago.monto) <= 0) {
      alert('Ingrese un monto válido');
      return;
    }

    if (parseFloat(nuevoPago.monto) > facturaSeleccionada.balance_pendiente) {
      alert('El monto no puede ser mayor al balance pendiente');
      return;
    }

    setLoading(true);
    try {
      // Registrar pago
      await supabase.from('cobros_clientes').insert({
        factura_venta_id: facturaSeleccionada.id,
        cliente_id: facturaSeleccionada.cliente_id,
        fecha: nuevoPago.fecha,
        monto: parseFloat(nuevoPago.monto),
        metodo_pago: nuevoPago.metodo_pago,
        referencia: nuevoPago.referencia,
        notas: nuevoPago.notas
      });

      // Actualizar factura
      const nuevoBalance = facturaSeleccionada.balance_pendiente - parseFloat(nuevoPago.monto);
      const montoPagado = (facturaSeleccionada.monto_pagado || 0) + parseFloat(nuevoPago.monto);
      const nuevoEstado = nuevoBalance === 0 ? 'pagada' : 'parcial';

      await supabase
        .from('facturas_venta')
        .update({
          balance_pendiente: nuevoBalance,
          monto_pagado: montoPagado,
          estado: nuevoEstado
        })
        .eq('id', facturaSeleccionada.id);

      // Actualizar balance del cliente
      const { data: cliente } = await supabase
        .from('clientes')
        .select('balance_pendiente')
        .eq('id', facturaSeleccionada.cliente_id)
        .single();

      await supabase
        .from('clientes')
        .update({ balance_pendiente: cliente.balance_pendiente - parseFloat(nuevoPago.monto) })
        .eq('id', facturaSeleccionada.cliente_id);

      // Actualizar ventas_diarias
      await supabase
        .from('ventas_diarias')
        .update({
          balance_pendiente: nuevoBalance,
          monto_pagado: montoPagado,
          estado: nuevoEstado
        })
        .eq('factura_venta_id', facturaSeleccionada.id);

      // Registrar en Cuadre de Caja (verificar duplicados primero)
      const cuadreData = {
        fecha: nuevoPago.fecha,
        tipo_movimiento: 'ingreso',
        concepto: 'pago_factura',
        referencia: facturaSeleccionada.numero_factura,
        monto: parseFloat(nuevoPago.monto),
        metodo_pago: nuevoPago.metodo_pago,
        divisa: facturaSeleccionada.divisa || 'DOP',
        descripcion: `Pago de factura a crédito - ${facturaSeleccionada.numero_factura} - Cliente: ${facturaSeleccionada.clientes?.nombre || 'N/A'} - Ref: ${nuevoPago.referencia || 'N/A'}`,
        cuenta_cobrar_id: null,
        cliente_id: facturaSeleccionada.cliente_id
      };

      // Verificar si ya existe un registro similar para evitar duplicados
      const { data: registrosExistentesPago } = await supabase
        .from('cuadre_caja')
        .select('id')
        .eq('referencia', facturaSeleccionada.numero_factura)
        .eq('concepto', 'pago_factura')
        .eq('fecha', nuevoPago.fecha)
        .eq('monto', parseFloat(nuevoPago.monto));

      // Solo insertar si no existe ningún registro con esos datos
      if (!registrosExistentesPago || registrosExistentesPago.length === 0) {
        // Intentar insertar con divisa
        const { data: dataInsertadaPago, error: cuadreError } = await supabase.from('cuadre_caja').insert(cuadreData).select();
        
        if (cuadreError) {
          console.error('Error al registrar en cuadre de caja:', cuadreError);
          // Si falla por columna divisa, intentar sin ella y luego actualizar
          if (cuadreError.message && cuadreError.message.includes('divisa')) {
            const { divisa, ...cuadreDataSinDivisa } = cuadreData;
            const { data: dataInsertadaSinDivisaPago, error: errorSinDivisa } = await supabase.from('cuadre_caja').insert(cuadreDataSinDivisa).select();
            if (!errorSinDivisa && dataInsertadaSinDivisaPago && dataInsertadaSinDivisaPago.length > 0) {
              // Actualizar el registro recién insertado con la divisa correcta
              await supabase
                .from('cuadre_caja')
                .update({ divisa: facturaSeleccionada.divisa || 'DOP' })
                .eq('id', dataInsertadaSinDivisaPago[0].id);
            } else if (errorSinDivisa) {
              console.error('Error al insertar sin divisa:', errorSinDivisa);
            }
          }
        } else if (dataInsertadaPago && dataInsertadaPago.length > 0) {
          console.log('Registro de pago insertado correctamente con divisa:', facturaSeleccionada.divisa || 'DOP');
        }
      } else {
        console.log('Registro de pago ya existe en cuadre de caja, omitiendo inserción');
      }

      alert('Pago registrado exitosamente');
      setNuevoPago({
        fecha: getFechaActual(),
        monto: '',
        metodo_pago: 'efectivo',
        referencia: '',
        notas: ''
      });
      setMostrarPagos(false);
      cargarDatos();
    } catch (error) {
      console.error('Error:', error);
      alert('Error al registrar pago: ' + error.message);
    }
    setLoading(false);
  };

  const eliminarFactura = async (factura) => {
    if (!confirm(`¿Está seguro de eliminar la factura ${factura.numero_factura}?`)) {
      return;
    }

    setLoading(true);
    try {
      // Obtener items de la factura para devolver al inventario
      const { data: items } = await supabase
        .from('items_factura_venta')
        .select('mercancia_id, cantidad')
        .eq('factura_venta_id', factura.id);

      // Devolver productos al inventario
      for (const item of items || []) {
        const { data: mercancia } = await supabase
          .from('mercancias')
          .select('stock_actual')
          .eq('id', item.mercancia_id)
          .single();

        if (mercancia) {
          await supabase
            .from('mercancias')
            .update({ stock_actual: mercancia.stock_actual + item.cantidad })
            .eq('id', item.mercancia_id);
        }
      }

      // Si era a crédito, restar del balance del cliente
      if (factura.balance_pendiente > 0) {
        const { data: cliente } = await supabase
          .from('clientes')
          .select('balance_pendiente')
          .eq('id', factura.cliente_id)
          .single();

        if (cliente) {
          await supabase
            .from('clientes')
            .update({ balance_pendiente: Math.max(0, cliente.balance_pendiente - factura.balance_pendiente) })
            .eq('id', factura.cliente_id);
        }
      }

      // Eliminar factura (cascade eliminará items y cobros)
      await supabase
        .from('facturas_venta')
        .delete()
        .eq('id', factura.id);

      alert('Factura eliminada exitosamente');
      cargarDatos();
    } catch (error) {
      console.error('Error:', error);
      alert('Error al eliminar factura: ' + error.message);
    }
    setLoading(false);
  };

  const facturasFiltradas = facturas.filter(f =>
    f.numero_factura.toLowerCase().includes(busqueda.toLowerCase()) ||
    f.clientes?.nombre.toLowerCase().includes(busqueda.toLowerCase())
  );

  const totales = facturas.reduce((acc, f) => ({
    total: acc.total + (f.total || 0),
    cobrado: acc.cobrado + (f.monto_pagado || 0),
    pendiente: acc.pendiente + (f.balance_pendiente || 0)
  }), { total: 0, cobrado: 0, pendiente: 0 });

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-blue-50 p-3 sm:p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header Moderno */}
        <div className="bg-white rounded-2xl shadow-xl p-4 sm:p-8 mb-4 sm:mb-6 border border-gray-100">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 sm:gap-0 mb-6 sm:mb-8">
            <div className="flex items-center gap-3 sm:gap-4">
              <div className="bg-gradient-to-br from-green-500 to-green-600 p-2 sm:p-3 rounded-xl shadow-lg">
                <FileText className="w-6 h-6 sm:w-8 sm:h-8 text-white" />
              </div>
              <div>
                <h1 className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-green-600 to-blue-600 bg-clip-text text-transparent">
                  Facturas de Venta
                </h1>
                <p className="text-xs sm:text-sm text-gray-500 mt-1">Gestión de ventas a clientes</p>
              </div>
            </div>
            <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 w-full sm:w-auto">
              <button
                onClick={generarPDF}
                className="bg-gradient-to-r from-blue-500 to-blue-600 text-white px-4 sm:px-6 py-2 sm:py-3 rounded-xl hover:from-blue-600 hover:to-blue-700 flex items-center justify-center gap-2 shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-105 text-sm sm:text-base"
              >
                <Printer className="w-4 h-4 sm:w-5 sm:h-5" />
                <span className="font-medium">Generar PDF</span>
              </button>
              <button
                onClick={() => setMostrarModal(true)}
                className="bg-gradient-to-r from-green-500 to-green-600 text-white px-4 sm:px-6 py-2 sm:py-3 rounded-xl hover:from-green-600 hover:to-green-700 flex items-center justify-center gap-2 shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-105 text-sm sm:text-base"
              >
                <Plus className="w-4 h-4 sm:w-5 sm:h-5" />
                <span className="font-medium">Nueva Factura</span>
              </button>
              <button
                onClick={eliminarDuplicados}
                disabled={isDeletingDuplicates}
                className="bg-gradient-to-r from-red-500 to-red-600 text-white px-4 sm:px-6 py-2 sm:py-3 rounded-xl hover:from-red-600 hover:to-red-700 flex items-center justify-center gap-2 shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-105 text-sm sm:text-base disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Trash2 className="w-4 h-4 sm:w-5 sm:h-5" />
                <span className="font-medium">{isDeletingDuplicates ? 'Eliminando...' : 'Eliminar Duplicados'}</span>
              </button>
            </div>
          </div>

          {/* Resumen Moderno */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
            <div className="bg-gradient-to-br from-blue-500 to-blue-600 p-4 sm:p-6 rounded-xl shadow-lg text-white transform hover:scale-105 transition-all duration-200">
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs sm:text-sm font-medium opacity-90">Total Facturado</p>
                <DollarSign className="w-4 h-4 sm:w-5 sm:h-5 opacity-75" />
              </div>
              <p className="text-2xl sm:text-3xl font-bold">{formatCurrency(totales.total)}</p>
              <p className="text-xs opacity-75 mt-1">{facturas.length} facturas emitidas</p>
            </div>
            <div className="bg-gradient-to-br from-green-500 to-green-600 p-4 sm:p-6 rounded-xl shadow-lg text-white transform hover:scale-105 transition-all duration-200">
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs sm:text-sm font-medium opacity-90">Total Cobrado</p>
                <CheckCircle className="w-4 h-4 sm:w-5 sm:h-5 opacity-75" />
              </div>
              <p className="text-2xl sm:text-3xl font-bold">{formatCurrency(totales.cobrado)}</p>
              <p className="text-xs opacity-75 mt-1">Pagos recibidos</p>
            </div>
            <div className="bg-gradient-to-br from-orange-500 to-orange-600 p-4 sm:p-6 rounded-xl shadow-lg text-white transform hover:scale-105 transition-all duration-200 sm:col-span-2 lg:col-span-1">
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs sm:text-sm font-medium opacity-90">Por Cobrar</p>
                <AlertCircle className="w-4 h-4 sm:w-5 sm:h-5 opacity-75" />
              </div>
              <p className="text-2xl sm:text-3xl font-bold">{formatCurrency(totales.pendiente)}</p>
              <p className="text-xs opacity-75 mt-1">Saldo pendiente</p>
            </div>
          </div>
        </div>

        {/* Búsqueda Moderna */}
        <div className="bg-white rounded-2xl shadow-lg p-4 sm:p-5 mb-4 sm:mb-6 border border-gray-100">
          <div className="relative">
            <Search className="absolute left-3 sm:left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4 sm:w-5 sm:h-5" />
            <input
              type="text"
              placeholder="Buscar por número de factura o cliente..."
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              className="w-full pl-10 sm:pl-12 pr-4 py-2 sm:py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-all duration-200 text-sm sm:text-base text-gray-700 placeholder-gray-400"
            />
          </div>
        </div>

        {/* Tabla Desktop / Cards Mobile */}
        <div className="bg-white rounded-2xl shadow-xl overflow-hidden border border-gray-100">
          {/* Desktop Table */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gradient-to-r from-gray-50 to-gray-100 border-b-2 border-gray-200">
                <tr>
                  <th className="px-4 lg:px-6 py-3 lg:py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Número</th>
                  <th className="px-4 lg:px-6 py-3 lg:py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Fecha</th>
                  <th className="px-4 lg:px-6 py-3 lg:py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Cliente</th>
                  <th className="px-4 lg:px-6 py-3 lg:py-4 text-right text-xs font-bold text-gray-700 uppercase tracking-wider">Total</th>
                  <th className="px-4 lg:px-6 py-3 lg:py-4 text-right text-xs font-bold text-gray-700 uppercase tracking-wider">Pagado</th>
                  <th className="px-4 lg:px-6 py-3 lg:py-4 text-right text-xs font-bold text-gray-700 uppercase tracking-wider">Pendiente</th>
                  <th className="px-4 lg:px-6 py-3 lg:py-4 text-center text-xs font-bold text-gray-700 uppercase tracking-wider">Estado</th>
                  <th className="px-4 lg:px-6 py-3 lg:py-4 text-center text-xs font-bold text-gray-700 uppercase tracking-wider">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {facturasFiltradas.map((factura) => (
                  <tr key={factura.id} className="hover:bg-gradient-to-r hover:from-green-50 hover:to-blue-50 transition-all duration-200">
                    <td className="px-4 lg:px-6 py-3 lg:py-4 text-sm font-bold text-gray-900">{factura.numero_factura}</td>
                    <td className="px-4 lg:px-6 py-3 lg:py-4 text-sm text-gray-600">{formatearFechaLocal(factura.fecha)}</td>
                    <td className="px-4 lg:px-6 py-3 lg:py-4 text-sm font-medium text-gray-700">{factura.clientes?.nombre}</td>
                    <td className="px-4 lg:px-6 py-3 lg:py-4 text-sm text-right font-semibold text-gray-900">{formatCurrency(factura.total, factura.divisa || 'DOP')}</td>
                    <td className="px-4 lg:px-6 py-3 lg:py-4 text-sm text-right font-semibold text-green-600">{formatCurrency(factura.monto_pagado || 0, factura.divisa || 'DOP')}</td>
                    <td className="px-4 lg:px-6 py-3 lg:py-4 text-sm text-right font-bold text-orange-600">{formatCurrency(factura.balance_pendiente, factura.divisa || 'DOP')}</td>
                    <td className="px-4 lg:px-6 py-3 lg:py-4 text-center">
                      <span className={`inline-flex items-center gap-1.5 px-2 sm:px-3 py-1 sm:py-1.5 rounded-full text-xs font-bold shadow-sm ${
                        factura.estado === 'pagada' ? 'bg-gradient-to-r from-green-400 to-green-500 text-white' :
                        factura.estado === 'parcial' ? 'bg-gradient-to-r from-yellow-400 to-yellow-500 text-white' :
                        'bg-gradient-to-r from-red-400 to-red-500 text-white'
                      }`}>
                        {factura.estado === 'pagada' ? <CheckCircle size={14} /> : <AlertCircle size={14} />}
                        {factura.estado === 'pagada' ? 'Pagada' : factura.estado === 'parcial' ? 'Parcial' : 'Pendiente'}
                      </span>
                    </td>
                    <td className="px-4 lg:px-6 py-3 lg:py-4 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          onClick={() => verDetalles(factura)}
                          className="bg-gradient-to-r from-blue-500 to-blue-600 text-white px-2 sm:px-3 py-1.5 sm:py-2 rounded-lg hover:from-blue-600 hover:to-blue-700 text-xs sm:text-sm shadow-md hover:shadow-lg transition-all duration-200 transform hover:scale-105"
                          title="Ver detalles"
                        >
                          <Eye size={14} />
                        </button>
                        <button
                          onClick={() => imprimirFactura(factura)}
                          className="bg-gradient-to-r from-purple-500 to-purple-600 text-white px-2 sm:px-3 py-1.5 sm:py-2 rounded-lg hover:from-purple-600 hover:to-purple-700 text-xs sm:text-sm shadow-md hover:shadow-lg transition-all duration-200 transform hover:scale-105"
                          title="Imprimir"
                        >
                          <Printer size={14} />
                        </button>
                        <button
                          onClick={() => abrirEdicion(factura)}
                          className="bg-gradient-to-r from-yellow-500 to-yellow-600 text-white px-2 sm:px-3 py-1.5 sm:py-2 rounded-lg hover:from-yellow-600 hover:to-yellow-700 text-xs sm:text-sm shadow-md hover:shadow-lg transition-all duration-200 transform hover:scale-105"
                          title="Editar"
                        >
                          <Edit size={14} />
                        </button>
                        <button
                          onClick={() => abrirPagos(factura)}
                          className="bg-gradient-to-r from-green-500 to-green-600 text-white px-2 sm:px-3 py-1.5 sm:py-2 rounded-lg hover:from-green-600 hover:to-green-700 text-xs sm:text-sm shadow-md hover:shadow-lg transition-all duration-200 transform hover:scale-105"
                          title="Cobros"
                        >
                          <DollarSign size={14} />
                        </button>
                        <button
                          onClick={() => eliminarFactura(factura)}
                          disabled={loading}
                          className="bg-gradient-to-r from-red-500 to-red-600 text-white px-2 sm:px-3 py-1.5 sm:py-2 rounded-lg hover:from-red-600 hover:to-red-700 text-xs sm:text-sm shadow-md hover:shadow-lg transition-all duration-200 transform hover:scale-105 disabled:opacity-50"
                          title="Eliminar"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile Cards */}
          <div className="md:hidden divide-y divide-gray-200">
            {facturasFiltradas.map((factura) => (
              <div key={factura.id} className="p-4 hover:bg-gradient-to-r hover:from-green-50 hover:to-blue-50 transition-all duration-200">
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <p className="text-sm font-bold text-gray-900">{factura.numero_factura}</p>
                    <p className="text-xs text-gray-500 mt-1">{formatearFechaLocal(factura.fecha)}</p>
                  </div>
                  <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-bold shadow-sm ${
                    factura.estado === 'pagada' ? 'bg-gradient-to-r from-green-400 to-green-500 text-white' :
                    factura.estado === 'parcial' ? 'bg-gradient-to-r from-yellow-400 to-yellow-500 text-white' :
                    'bg-gradient-to-r from-red-400 to-red-500 text-white'
                  }`}>
                    {factura.estado === 'pagada' ? <CheckCircle size={12} /> : <AlertCircle size={12} />}
                    {factura.estado === 'pagada' ? 'Pagada' : factura.estado === 'parcial' ? 'Parcial' : 'Pendiente'}
                  </span>
                </div>
                <p className="text-sm font-medium text-gray-700 mb-3">{factura.clientes?.nombre}</p>
                <div className="grid grid-cols-3 gap-2 mb-3 text-xs">
                  <div>
                    <p className="text-gray-500">Total</p>
                    <p className="font-semibold text-gray-900">{formatCurrency(factura.total, factura.divisa || 'DOP')}</p>
                  </div>
                  <div>
                    <p className="text-gray-500">Pagado</p>
                    <p className="font-semibold text-green-600">{formatCurrency(factura.monto_pagado || 0, factura.divisa || 'DOP')}</p>
                  </div>
                  <div>
                    <p className="text-gray-500">Pendiente</p>
                    <p className="font-bold text-orange-600">{formatCurrency(factura.balance_pendiente, factura.divisa || 'DOP')}</p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => verDetalles(factura)}
                    className="flex-1 bg-gradient-to-r from-blue-500 to-blue-600 text-white px-2 py-2 rounded-lg hover:from-blue-600 hover:to-blue-700 text-xs flex items-center justify-center gap-1.5 shadow-md hover:shadow-lg transition-all duration-200"
                  >
                    <Eye size={14} />
                    Ver
                  </button>
                  <button
                    onClick={() => imprimirFactura(factura)}
                    className="bg-gradient-to-r from-purple-500 to-purple-600 text-white px-2 py-2 rounded-lg hover:from-purple-600 hover:to-purple-700 text-xs shadow-md hover:shadow-lg transition-all duration-200"
                  >
                    <Printer size={14} />
                  </button>
                  <button
                    onClick={() => abrirEdicion(factura)}
                    className="bg-gradient-to-r from-yellow-500 to-yellow-600 text-white px-2 py-2 rounded-lg hover:from-yellow-600 hover:to-yellow-700 text-xs shadow-md hover:shadow-lg transition-all duration-200"
                  >
                    <Edit size={14} />
                  </button>
                  <button
                    onClick={() => abrirPagos(factura)}
                    className="bg-gradient-to-r from-green-500 to-green-600 text-white px-2 py-2 rounded-lg hover:from-green-600 hover:to-green-700 text-xs shadow-md hover:shadow-lg transition-all duration-200"
                  >
                    <DollarSign size={14} />
                  </button>
                  <button
                    onClick={() => eliminarFactura(factura)}
                    disabled={loading}
                    className="bg-gradient-to-r from-red-500 to-red-600 text-white px-2 py-2 rounded-lg hover:from-red-600 hover:to-red-700 text-xs shadow-md hover:shadow-lg transition-all duration-200 disabled:opacity-50"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Modal Nueva Factura */}
        {mostrarModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-2 sm:p-4 z-50">
            <div className="bg-white rounded-lg max-w-4xl w-full max-h-[95vh] sm:max-h-[90vh] overflow-y-auto">
              <div className="p-4 sm:p-6">
                <div className="flex justify-between items-center mb-4 sm:mb-6">
                  <h2 className="text-xl sm:text-2xl font-bold text-gray-800">
                    {modoEdicion ? 'Editar Factura de Venta' : 'Nueva Factura de Venta'}
                  </h2>
                  <button onClick={() => {
                    setMostrarModal(false);
                    setModoEdicion(false);
                  }} className="text-gray-500 hover:text-gray-700 p-1">
                    <X size={20} className="sm:w-6 sm:h-6" />
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 mb-4 sm:mb-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Número de Factura *</label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={nuevaFactura.numero_factura}
                        onChange={(e) => setNuevaFactura({ ...nuevaFactura, numero_factura: e.target.value })}
                        className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                        placeholder="AGV-004"
                      />
                      <button
                        type="button"
                        onClick={generarNumeroFactura}
                        className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 text-sm whitespace-nowrap"
                      >
                        Generar
                      </button>
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Cliente *</label>
                    <SearchableSelect
                      options={clientes}
                      value={nuevaFactura.cliente_id}
                      onChange={(value) => setNuevaFactura({ ...nuevaFactura, cliente_id: value })}
                      placeholder="Seleccione un cliente"
                      searchPlaceholder="Buscar cliente por nombre o cédula..."
                      displayField="nombre"
                      valueField="id"
                      secondaryField="cedula"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Fecha *</label>
                    <input
                      type="date"
                      value={nuevaFactura.fecha}
                      onChange={(e) => setNuevaFactura({ ...nuevaFactura, fecha: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Tipo de Venta *</label>
                    <select
                      value={nuevaFactura.tipo_venta}
                      onChange={(e) => setNuevaFactura({ ...nuevaFactura, tipo_venta: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                    >
                      <option value="credito">A Crédito</option>
                      <option value="contado">Al Contado</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Moneda *</label>
                    <select
                      value={nuevaFactura.divisa}
                      onChange={(e) => {
                        const nuevaDivisa = e.target.value;
                        setNuevaFactura({ 
                          ...nuevaFactura, 
                          divisa: nuevaDivisa,
                          tasa_cambio: nuevaDivisa === 'USD' ? nuevaFactura.tasa_cambio : 1.0000
                        });
                        // Resetear item actual para forzar reselección de precio
                        if (nuevoItem.mercancia_id) {
                          setNuevoItem({ mercancia_id: '', cantidad: '', precio_unitario: '', nivel_precio: '1' });
                        }
                      }}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                    >
                      <option value="DOP">🇩🇴 Pesos Dominicanos (DOP)</option>
                      <option value="USD">🇺🇸 Dólares Estadounidenses (USD)</option>
                    </select>
                  </div>
                  {nuevaFactura.divisa === 'USD' && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Tasa de Cambio (DOP/USD) *</label>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={nuevaFactura.tasa_cambio}
                        onChange={(e) => {
                          setNuevaFactura({ ...nuevaFactura, tasa_cambio: e.target.value });
                          // Si hay un producto seleccionado, recalcular el precio
                          if (nuevoItem.mercancia_id && nuevoItem.nivel_precio) {
                            const mercancia = mercancias.find(m => m.id === parseInt(nuevoItem.mercancia_id));
                            if (mercancia) {
                              let precioDOP = 0;
                              if (nuevoItem.nivel_precio === '1') precioDOP = mercancia.precio_1 || 0;
                              else if (nuevoItem.nivel_precio === '2') precioDOP = mercancia.precio_2 || 0;
                              else if (nuevoItem.nivel_precio === '3') precioDOP = mercancia.precio_3 || 0;
                              
                              const precioUSD = precioDOP / parseFloat(e.target.value || 1);
                              setNuevoItem({ ...nuevoItem, precio_unitario: precioUSD.toFixed(2) });
                            }
                          }
                        }}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                        placeholder="58.50"
                      />
                      <p className="text-xs text-gray-500 mt-1">💡 Esta tasa se usará para convertir los precios DOP a USD</p>
                    </div>
                  )}
                  {nuevaFactura.tipo_venta === 'contado' && (
                    <>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Método de Pago *</label>
                        <select
                          value={nuevaFactura.metodo_pago}
                          onChange={(e) => setNuevaFactura({ ...nuevaFactura, metodo_pago: e.target.value })}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                        >
                          <option value="efectivo">Efectivo</option>
                          <option value="transferencia">Transferencia</option>
                          <option value="cheque">Cheque</option>
                          <option value="tarjeta">Tarjeta</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Descuento (%)</label>
                        <input
                          type="number"
                          min="0"
                          max="100"
                          step="0.01"
                          value={nuevaFactura.descuento_porcentaje}
                          onChange={(e) => setNuevaFactura({ ...nuevaFactura, descuento_porcentaje: e.target.value })}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                          placeholder="0"
                        />
                      </div>
                    </>
                  )}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Notas</label>
                    <input
                      type="text"
                      value={nuevaFactura.notas}
                      onChange={(e) => setNuevaFactura({ ...nuevaFactura, notas: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                      placeholder="Notas adicionales"
                    />
                  </div>
                  <div className="flex items-center gap-2 pt-6">
                    <input
                      type="checkbox"
                      id="aplicar_itbis"
                      checked={nuevaFactura.aplicar_itbis}
                      onChange={(e) => setNuevaFactura({ ...nuevaFactura, aplicar_itbis: e.target.checked })}
                      className="w-4 h-4 text-green-600 border-gray-300 rounded focus:ring-green-500"
                    />
                    <label htmlFor="aplicar_itbis" className="text-sm font-medium text-gray-700">
                      Aplicar ITBIS (18%)
                    </label>
                  </div>
                </div>

                {/* Agregar Items */}
                <div className="border-t pt-4 sm:pt-6 mb-4 sm:mb-6">
                  <h3 className="text-base sm:text-lg font-semibold mb-3 sm:mb-4">Agregar Productos</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 sm:gap-4 mb-3 sm:mb-4">
                    <div className="sm:col-span-2">
                      <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-2">Producto</label>
                      <SearchableSelect
                        options={mercancias}
                        value={nuevoItem.mercancia_id}
                        onChange={(value) => {
                          const mercancia = mercancias.find(m => m.id === parseInt(value));
                          setNuevoItem({
                            ...nuevoItem,
                            mercancia_id: value,
                            precio_unitario: '' // Resetear precio para forzar selección
                          });
                        }}
                        placeholder="Seleccione un producto"
                        searchPlaceholder="Buscar por nombre o código..."
                        displayField="nombre"
                        valueField="id"
                        secondaryField="codigo"
                        className="mb-2"
                      />
                      <p className="text-xs text-gray-500">
                        {nuevoItem.mercancia_id && (() => {
                          const m = mercancias.find(m => m.id === parseInt(nuevoItem.mercancia_id));
                          return m ? `Stock: ${m.stock_actual} ${m.unidad_medida}` : '';
                        })()}
                      </p>
                    </div>
                    <div>
                      <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-2">Nivel de Precio</label>
                      <select
                        value={nuevoItem.nivel_precio}
                        onChange={(e) => {
                          const mercancia = mercancias.find(m => m.id === parseInt(nuevoItem.mercancia_id));
                          if (mercancia) {
                            const nivelPrecio = e.target.value;
                            let precioDOP = 0;
                            
                            // Obtener precio según nivel seleccionado
                            if (nivelPrecio === '1') precioDOP = mercancia.precio_1 || 0;
                            else if (nivelPrecio === '2') precioDOP = mercancia.precio_2 || 0;
                            else if (nivelPrecio === '3') precioDOP = mercancia.precio_3 || 0;
                            
                            // Si la factura es en USD, convertir usando tasa de cambio
                            const precioFinal = nuevaFactura.divisa === 'USD' 
                              ? (precioDOP / parseFloat(nuevaFactura.tasa_cambio || 1))
                              : precioDOP;
                            
                            setNuevoItem({
                              ...nuevoItem,
                              nivel_precio: nivelPrecio,
                              precio_unitario: precioFinal.toFixed(2)
                            });
                          }
                        }}
                        disabled={!nuevoItem.mercancia_id}
                        className="w-full px-3 sm:px-4 py-2 text-sm sm:text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 disabled:bg-gray-100"
                      >
                        <option value="1">Precio 1</option>
                        <option value="2">Precio 2</option>
                        <option value="3">Precio 3</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-2">Cantidad</label>
                      <input
                        type="number"
                        value={nuevoItem.cantidad}
                        onChange={(e) => setNuevoItem({ ...nuevoItem, cantidad: e.target.value })}
                        className="w-full px-3 sm:px-4 py-2 text-sm sm:text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                        placeholder="0"
                        min="0"
                        step="0.01"
                      />
                    </div>
                    <div>
                      <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-2">
                        Precio Unit. ({nuevaFactura.divisa})
                      </label>
                      <input
                        type="number"
                        value={nuevoItem.precio_unitario}
                        onChange={(e) => setNuevoItem({ ...nuevoItem, precio_unitario: e.target.value })}
                        className="w-full px-3 sm:px-4 py-2 text-sm sm:text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                        placeholder="0.00"
                        min="0"
                        step="0.01"
                        title="Puede editar el precio manualmente o seleccionar un nivel de precio"
                      />
                      <p className="text-xs text-gray-500 mt-1">✏️ Editable manualmente</p>
                    </div>
                  </div>
                  <button
                    onClick={agregarItem}
                    className="w-full sm:w-auto bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 flex items-center justify-center gap-2 text-sm sm:text-base"
                  >
                    <Plus size={18} className="sm:w-5 sm:h-5" />
                    Agregar Item
                  </button>
                </div>

                {/* Lista de Items */}
                {nuevaFactura.items.length > 0 && (
                  <div className="border-t pt-4 sm:pt-6 mb-4 sm:mb-6">
                    <h3 className="text-base sm:text-lg font-semibold mb-3 sm:mb-4">Items de la Factura</h3>
                    <div className="overflow-x-auto">
                      <table className="w-full min-w-[500px]">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-2 sm:px-4 py-2 text-left text-xs font-medium text-gray-500">Producto</th>
                            <th className="px-2 sm:px-4 py-2 text-right text-xs font-medium text-gray-500">Cantidad</th>
                            <th className="px-2 sm:px-4 py-2 text-right text-xs font-medium text-gray-500">Precio Unit.</th>
                            <th className="px-2 sm:px-4 py-2 text-right text-xs font-medium text-gray-500">Subtotal</th>
                            <th className="px-2 sm:px-4 py-2 text-center text-xs font-medium text-gray-500">Acción</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                          {nuevaFactura.items.map((item, index) => (
                            <tr key={index}>
                              <td className="px-2 sm:px-4 py-2 text-xs sm:text-sm">{item.mercancia_nombre}</td>
                              <td className="px-2 sm:px-4 py-2 text-xs sm:text-sm text-right">{item.cantidad}</td>
                              <td className="px-2 sm:px-4 py-2 text-xs sm:text-sm text-right">{formatCurrency(item.precio_unitario, nuevaFactura.divisa)}</td>
                              <td className="px-2 sm:px-4 py-2 text-xs sm:text-sm text-right font-medium">{formatCurrency(item.subtotal, nuevaFactura.divisa)}</td>
                              <td className="px-2 sm:px-4 py-2 text-center">
                                <button
                                  onClick={() => eliminarItem(index)}
                                  className="text-red-600 hover:text-red-800"
                                >
                                  <X size={16} className="sm:w-5 sm:h-5" />
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    {/* Totales */}
                    <div className="mt-4 border-t pt-4">
                      <div className="flex justify-end">
                        <div className="w-full sm:w-64">
                          <div className="flex justify-between mb-2 text-sm sm:text-base">
                            <span className="text-gray-600">Subtotal:</span>
                            <span className="font-medium">{formatCurrency(calcularTotales().subtotal, nuevaFactura.divisa)}</span>
                          </div>
                          {nuevaFactura.tipo_venta === 'contado' && parseFloat(nuevaFactura.descuento_porcentaje) > 0 && (
                            <div className="flex justify-between mb-2 text-green-600 text-sm sm:text-base">
                              <span>Descuento ({nuevaFactura.descuento_porcentaje}%):</span>
                              <span className="font-medium">-{formatCurrency(calcularTotales().descuento_monto, nuevaFactura.divisa)}</span>
                            </div>
                          )}
                          <div className="flex justify-between mb-2 text-sm sm:text-base">
                            <span className="text-gray-600">ITBIS (18%):</span>
                            <span className="font-medium">{formatCurrency(calcularTotales().itbis, nuevaFactura.divisa)}</span>
                          </div>
                          <div className="flex justify-between text-base sm:text-lg font-bold border-t pt-2">
                            <span>Total:</span>
                            <span className="text-green-600">{formatCurrency(calcularTotales().total, nuevaFactura.divisa)}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Botones */}
                <div className="flex flex-col sm:flex-row justify-between items-center gap-3 sm:gap-4">
                  <button
                    onClick={() => setMostrarFirma(true)}
                    className="w-full sm:w-auto bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 flex items-center justify-center gap-2 text-sm sm:text-base"
                  >
                    <PenTool size={18} />
                    {nuevaFactura.firma_cliente ? 'Modificar Firma' : 'Agregar Firma'}
                  </button>
                  <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 w-full sm:w-auto">
                    <button
                      onClick={() => setMostrarModal(false)}
                      className="w-full sm:w-auto px-6 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 text-sm sm:text-base"
                    >
                      Cancelar
                    </button>
                    <button
                      onClick={guardarFactura}
                      disabled={loading || nuevaFactura.items.length === 0}
                      className="w-full sm:w-auto bg-green-600 text-white px-6 py-2 rounded-lg hover:bg-green-700 disabled:bg-gray-400 text-sm sm:text-base"
                    >
                      {loading ? 'Guardando...' : modoEdicion ? 'Actualizar Factura' : 'Guardar Factura'}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Modal de Detalles */}
        {mostrarDetalles && facturaSeleccionada && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-2 sm:p-4 z-50">
            <div className="bg-white rounded-lg max-w-4xl w-full max-h-[95vh] sm:max-h-[90vh] overflow-y-auto">
              <div className="p-4 sm:p-6">
                <div className="flex justify-between items-center mb-4 sm:mb-6">
                  <h2 className="text-lg sm:text-2xl font-bold text-gray-800">
                    Detalles - Factura {facturaSeleccionada.numero_factura}
                  </h2>
                  <button onClick={() => setMostrarDetalles(false)} className="text-gray-500 hover:text-gray-700 p-1">
                    <X size={20} className="sm:w-6 sm:h-6" />
                  </button>
                </div>

                {/* Información de la Factura */}
                <div className="bg-gray-50 p-3 sm:p-4 rounded-lg mb-4 sm:mb-6">
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-4">
                    <div>
                      <p className="text-xs sm:text-sm text-gray-600">Cliente</p>
                      <p className="text-sm sm:text-base font-medium break-words">{facturaSeleccionada.clientes?.nombre}</p>
                    </div>
                    <div>
                      <p className="text-xs sm:text-sm text-gray-600">Fecha</p>
                      <p className="text-sm sm:text-base font-medium">{formatearFechaLocal(facturaSeleccionada.fecha)}</p>
                    </div>
                    <div>
                      <p className="text-xs sm:text-sm text-gray-600">Estado</p>
                      <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-bold shadow-sm ${
                        facturaSeleccionada.estado === 'pagada' ? 'bg-gradient-to-r from-green-400 to-green-500 text-white' :
                        facturaSeleccionada.estado === 'parcial' ? 'bg-gradient-to-r from-yellow-400 to-yellow-500 text-white' :
                        'bg-gradient-to-r from-red-400 to-red-500 text-white'
                      }`}>
                        {facturaSeleccionada.estado === 'pagada' ? <CheckCircle size={12} /> : <AlertCircle size={12} />}
                        {facturaSeleccionada.estado === 'pagada' ? 'Pagada' : facturaSeleccionada.estado === 'parcial' ? 'Parcial' : 'Pendiente'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Items de la Factura */}
                <div className="mb-4 sm:mb-6">
                  <h3 className="text-base sm:text-lg font-semibold mb-3 sm:mb-4">Productos</h3>
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[400px]">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-2 sm:px-4 py-2 text-left text-xs font-medium text-gray-500">Producto</th>
                          <th className="px-2 sm:px-4 py-2 text-right text-xs font-medium text-gray-500">Cantidad</th>
                          <th className="px-2 sm:px-4 py-2 text-right text-xs font-medium text-gray-500">Precio Unit.</th>
                          <th className="px-2 sm:px-4 py-2 text-right text-xs font-medium text-gray-500">Subtotal</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200">
                        {facturaSeleccionada.items?.map((item, index) => (
                          <tr key={index}>
                            <td className="px-2 sm:px-4 py-2 text-xs sm:text-sm">{item.mercancias?.nombre}</td>
                            <td className="px-2 sm:px-4 py-2 text-xs sm:text-sm text-right">{item.cantidad.toFixed(2)}</td>
                            <td className="px-2 sm:px-4 py-2 text-xs sm:text-sm text-right">{formatCurrency(item.precio_unitario, facturaSeleccionada.divisa || 'DOP')}</td>
                            <td className="px-2 sm:px-4 py-2 text-xs sm:text-sm text-right font-medium">{formatCurrency(item.subtotal, facturaSeleccionada.divisa || 'DOP')}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Totales */}
                <div className="border-t pt-4">
                  <div className="flex justify-end">
                    <div className="w-full sm:w-64">
                      <div className="flex justify-between mb-2 text-sm sm:text-base">
                        <span className="text-gray-600">Subtotal:</span>
                        <span className="font-medium">{formatCurrency(facturaSeleccionada.subtotal, facturaSeleccionada.divisa || 'DOP')}</span>
                      </div>
                      {facturaSeleccionada.descuento_monto > 0 && (
                        <div className="flex justify-between mb-2 text-green-600 text-sm sm:text-base">
                          <span>Descuento ({facturaSeleccionada.descuento_porcentaje}%):</span>
                          <span className="font-medium">-{formatCurrency(facturaSeleccionada.descuento_monto, facturaSeleccionada.divisa || 'DOP')}</span>
                        </div>
                      )}
                      <div className="flex justify-between mb-2 text-sm sm:text-base">
                        <span className="text-gray-600">ITBIS (18%):</span>
                        <span className="font-medium">{formatCurrency(facturaSeleccionada.itbis, facturaSeleccionada.divisa || 'DOP')}</span>
                      </div>
                      <div className="flex justify-between text-base sm:text-lg font-bold border-t pt-2 mb-2">
                        <span>Total:</span>
                        <span className="text-green-600">{formatCurrency(facturaSeleccionada.total, facturaSeleccionada.divisa || 'DOP')}</span>
                      </div>
                      {facturaSeleccionada.monto_pagado > 0 && (
                        <>
                          <div className="flex justify-between mb-2 text-sm sm:text-base">
                            <span className="text-gray-600">Monto Pagado:</span>
                            <span className="font-medium text-green-600">{formatCurrency(facturaSeleccionada.monto_pagado, facturaSeleccionada.divisa || 'DOP')}</span>
                          </div>
                          <div className="flex justify-between text-sm sm:text-base">
                            <span className="text-gray-600">Balance Pendiente:</span>
                            <span className="font-bold text-orange-600">{formatCurrency(facturaSeleccionada.balance_pendiente, facturaSeleccionada.divisa || 'DOP')}</span>
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                {/* Notas */}
                {facturaSeleccionada.notas && (
                  <div className="border-t pt-4 mt-4">
                    <h3 className="text-base sm:text-lg font-semibold mb-2">Notas</h3>
                    <p className="text-sm text-gray-600">{facturaSeleccionada.notas}</p>
                  </div>
                )}

                {/* Botones */}
                <div className="flex flex-col sm:flex-row justify-end gap-3 sm:gap-4 mt-6">
                  <button
                    onClick={() => {
                      imprimirFactura(facturaSeleccionada);
                    }}
                    className="w-full sm:w-auto bg-purple-600 text-white px-6 py-2 rounded-lg hover:bg-purple-700 flex items-center justify-center gap-2 text-sm sm:text-base"
                  >
                    <Printer size={18} />
                    Imprimir
                  </button>
                  <button
                    onClick={() => setMostrarDetalles(false)}
                    className="w-full sm:w-auto px-6 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 text-sm sm:text-base"
                  >
                    Cerrar
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Modal de Pagos */}
        {mostrarPagos && facturaSeleccionada && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-2 sm:p-4 z-50">
            <div className="bg-white rounded-lg max-w-4xl w-full max-h-[95vh] sm:max-h-[90vh] overflow-y-auto">
              <div className="p-4 sm:p-6">
                <div className="flex justify-between items-center mb-4 sm:mb-6">
                  <h2 className="text-lg sm:text-2xl font-bold text-gray-800">
                    Cobros - Factura {facturaSeleccionada.numero_factura}
                  </h2>
                  <button onClick={() => setMostrarPagos(false)} className="text-gray-500 hover:text-gray-700 p-1">
                    <X size={20} className="sm:w-6 sm:h-6" />
                  </button>
                </div>

                {/* Resumen de la Factura */}
                <div className="bg-gray-50 p-3 sm:p-4 rounded-lg mb-4 sm:mb-6">
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
                    <div>
                      <p className="text-xs sm:text-sm text-gray-600">Cliente</p>
                      <p className="text-sm sm:text-base font-medium break-words">{facturaSeleccionada.clientes?.nombre}</p>
                    </div>
                    <div>
                      <p className="text-xs sm:text-sm text-gray-600">Total</p>
                      <p className="text-sm sm:text-base font-medium">{formatCurrency(facturaSeleccionada.total, facturaSeleccionada.divisa || 'DOP')}</p>
                    </div>
                    <div>
                      <p className="text-xs sm:text-sm text-gray-600">Pagado</p>
                      <p className="text-sm sm:text-base font-medium text-green-600">{formatCurrency(facturaSeleccionada.monto_pagado || 0, facturaSeleccionada.divisa || 'DOP')}</p>
                    </div>
                    <div>
                      <p className="text-xs sm:text-sm text-gray-600">Pendiente</p>
                      <p className="text-sm sm:text-base font-medium text-orange-600">{formatCurrency(facturaSeleccionada.balance_pendiente, facturaSeleccionada.divisa || 'DOP')}</p>
                    </div>
                  </div>
                </div>

                {/* Registrar Nuevo Pago */}
                {facturaSeleccionada.balance_pendiente > 0 && (
                  <div className="border-t pt-4 sm:pt-6 mb-4 sm:mb-6">
                    <h3 className="text-base sm:text-lg font-semibold mb-3 sm:mb-4">Registrar Cobro</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 mb-3 sm:mb-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Fecha</label>
                        <input
                          type="date"
                          value={nuevoPago.fecha}
                          onChange={(e) => setNuevoPago({ ...nuevoPago, fecha: e.target.value })}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Monto</label>
                        <input
                          type="number"
                          value={nuevoPago.monto}
                          onChange={(e) => setNuevoPago({ ...nuevoPago, monto: e.target.value })}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                          placeholder="0.00"
                          min="0"
                          step="0.01"
                          max={facturaSeleccionada.balance_pendiente}
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Método de Pago</label>
                        <select
                          value={nuevoPago.metodo_pago}
                          onChange={(e) => setNuevoPago({ ...nuevoPago, metodo_pago: e.target.value })}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                        >
                          <option value="efectivo">Efectivo</option>
                          <option value="transferencia">Transferencia</option>
                          <option value="cheque">Cheque</option>
                          <option value="tarjeta">Tarjeta</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Referencia</label>
                        <input
                          type="text"
                          value={nuevoPago.referencia}
                          onChange={(e) => setNuevoPago({ ...nuevoPago, referencia: e.target.value })}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                          placeholder="Número de referencia"
                        />
                      </div>
                    </div>
                    <button
                      onClick={registrarPago}
                      disabled={loading}
                      className="w-full sm:w-auto bg-green-600 text-white px-6 py-2 rounded-lg hover:bg-green-700 disabled:bg-gray-400 text-sm sm:text-base"
                    >
                      {loading ? 'Registrando...' : 'Registrar Cobro'}
                    </button>
                  </div>
                )}

                {/* Historial de Pagos */}
                {facturaSeleccionada.pagos && facturaSeleccionada.pagos.length > 0 && (
                  <div className="border-t pt-4 sm:pt-6">
                    <h3 className="text-base sm:text-lg font-semibold mb-3 sm:mb-4">Historial de Cobros</h3>
                    <div className="overflow-x-auto">
                      <table className="w-full min-w-[400px]">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-2 sm:px-4 py-2 text-left text-xs font-medium text-gray-500">Fecha</th>
                            <th className="px-2 sm:px-4 py-2 text-right text-xs font-medium text-gray-500">Monto</th>
                            <th className="px-2 sm:px-4 py-2 text-left text-xs font-medium text-gray-500">Método</th>
                            <th className="px-2 sm:px-4 py-2 text-left text-xs font-medium text-gray-500">Referencia</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                          {facturaSeleccionada.pagos.map((pago) => (
                            <tr key={pago.id}>
                              <td className="px-2 sm:px-4 py-2 text-xs sm:text-sm">{formatearFechaLocal(pago.fecha)}</td>
                              <td className="px-2 sm:px-4 py-2 text-xs sm:text-sm text-right font-medium text-green-600">
                                {formatCurrency(pago.monto, facturaSeleccionada.divisa || 'DOP')}
                              </td>
                              <td className="px-2 sm:px-4 py-2 text-xs sm:text-sm capitalize">{pago.metodo_pago}</td>
                              <td className="px-2 sm:px-4 py-2 text-xs sm:text-sm break-words">{pago.referencia || '-'}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
        {/* Modal de Firma Digital */}
        {mostrarFirma && (
          <FirmaDigital
            firmaInicial={nuevaFactura.firma_cliente}
            onGuardar={(firmaDataURL) => {
              setNuevaFactura({ ...nuevaFactura, firma_cliente: firmaDataURL });
              setMostrarFirma(false);
            }}
            onCancelar={() => setMostrarFirma(false)}
          />
        )}
      </div>
    </div>
  );
}