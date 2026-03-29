// Función para generar PDF de Facturas de Venta
export const generarPDFFacturasVenta = (facturas) => {
  if (typeof window === 'undefined') {
    console.warn('PDF generation is only supported in browser environment.');
    return;
  }

  const formatCurrency = (value, currency = 'DOP') => {
    if (value === null || value === undefined || isNaN(value)) {
      return currency === 'USD' ? 'USD 0.00' : 'RD$ 0.00';
    }
    
    const number = parseFloat(value);
    
    // Formatear el número con comas y decimales
    const formatted = number.toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
    
    // Retornar con el prefijo de moneda correcto
    return currency === 'USD' ? `USD ${formatted}` : `RD$ ${formatted}`;
  };

  const totalGeneral = facturas.reduce((sum, f) => sum + parseFloat(f.total || 0), 0);
  const totalCobrado = facturas.reduce((sum, f) => sum + parseFloat(f.monto_pagado || 0), 0);
  const totalPendiente = facturas.reduce((sum, f) => sum + parseFloat(f.balance_pendiente || 0), 0);

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <title>Facturas de Venta</title>
      <style>
        @media print {
          @page { margin: 1cm; }
          body { margin: 0; }
        }
        body {
          font-family: Arial, sans-serif;
          padding: 20px;
          color: #333;
        }
        .header {
          display: flex;
          align-items: center;
          gap: 20px;
          margin-bottom: 30px;
          border-bottom: 3px solid #16a34a;
          padding-bottom: 15px;
        }
        .logo {
          flex-shrink: 0;
        }
        .logo img {
          height: 120px;
          width: auto;
          object-fit: contain;
        }
        .header-content {
          flex: 1;
          text-align: center;
        }
        .header h1 {
          color: #16a34a;
          margin: 0 0 10px 0;
          font-size: 28px;
        }
        .header p {
          margin: 5px 0;
          color: #666;
          font-size: 14px;
        }
        .resumen {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 15px;
          margin: 20px 0;
        }
        .resumen-card {
          background-color: #dcfce7;
          padding: 15px;
          border-radius: 8px;
          text-align: center;
        }
        .resumen-card h3 {
          margin: 0 0 5px 0;
          font-size: 12px;
          color: #666;
        }
        .resumen-card p {
          margin: 0;
          font-size: 20px;
          font-weight: bold;
          color: #16a34a;
        }
        table {
          width: 100%;
          border-collapse: collapse;
          margin-top: 20px;
          font-size: 11px;
        }
        th {
          background-color: #16a34a;
          color: white;
          padding: 10px 8px;
          text-align: left;
          font-weight: bold;
        }
        td {
          padding: 8px;
          border-bottom: 1px solid #ddd;
        }
        tr:hover {
          background-color: #f9fafb;
        }
        .estado {
          display: inline-block;
          padding: 4px 12px;
          border-radius: 12px;
          font-size: 10px;
          font-weight: bold;
        }
        .estado-pendiente {
          background-color: #fee2e2;
          color: #991b1b;
        }
        .estado-pagada {
          background-color: #dcfce7;
          color: #166534;
        }
        .estado-parcial {
          background-color: #fef3c7;
          color: #92400e;
        }
        .footer {
          margin-top: 30px;
          text-align: center;
          color: #666;
          font-size: 12px;
          border-top: 1px solid #ddd;
          padding-top: 15px;
        }
      </style>
    </head>
    <body>
      <div class="header">
        <div class="logo">
          <img src="https://sensible-spoonbill-485.convex.cloud/api/storage/f2c37282-23ea-45e1-8f03-4f60c1d96017" alt="Agroverde">
        </div>
        <div class="header-content">
          <h1>📋 Facturas de Venta</h1>
          <p>Fecha de generación: ${new Date().toLocaleDateString('es-ES', { 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
          })}</p>
          <p><strong>Fecha de impresión: ${new Date().toLocaleString('es-ES', { 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit'
          })}</strong></p>
          <p>Total de facturas: ${facturas.length}</p>
        </div>
      </div>

      <div class="resumen">
        <div class="resumen-card">
          <h3>Total Facturado</h3>
          <p>${formatCurrency(totalGeneral)}</p>
        </div>
        <div class="resumen-card">
          <h3>Total Cobrado</h3>
          <p>${formatCurrency(totalCobrado)}</p>
        </div>
        <div class="resumen-card">
          <h3>Por Cobrar</h3>
          <p>${formatCurrency(totalPendiente)}</p>
        </div>
      </div>

      <table>
        <thead>
          <tr>
            <th>Fecha</th>
            <th>Número</th>
            <th>Cliente</th>
            <th>Subtotal</th>
            <th>ITBIS</th>
            <th>Total</th>
            <th>Pagado</th>
            <th>Pendiente</th>
            <th>Estado</th>
          </tr>
        </thead>
        <tbody>
          ${facturas.map(factura => {
            const currency = factura.divisa || 'DOP';
            return `
            <tr>
              <td>${new Date(factura.fecha).toLocaleDateString()}</td>
              <td>${factura.numero_factura}</td>
              <td>${factura.clientes?.nombre || factura.cliente_nombre || 'N/A'}</td>
              <td>${formatCurrency(factura.subtotal, currency)}</td>
              <td>${formatCurrency(factura.itbis, currency)}</td>
              <td>${formatCurrency(factura.total, currency)}</td>
              <td>${formatCurrency(factura.monto_pagado || 0, currency)}</td>
              <td>${formatCurrency(factura.balance_pendiente, currency)}</td>
              <td><span class="estado estado-${factura.estado}">${factura.estado}</span></td>
            </tr>
          `}).join('')}
        </tbody>
      </table>

      <div class="footer">
        <p>Sistema de Gestión de Arroz - Reporte generado automáticamente</p>
        <p><strong>Fecha de impresión: ${new Date().toLocaleString('es-ES', { 
          year: 'numeric', 
          month: 'long', 
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit'
        })}</strong></p>
      </div>
    </body>
    </html>
  `;

  const ventana = window.open('', '_blank');
  ventana.document.write(html);
  ventana.document.close();
  ventana.print();
};

// Función para generar PDF de Ventas Diarias
export const generarPDFVentasDiarias = (ventas) => {
  if (typeof window === 'undefined') {
    console.warn('PDF generation is only supported in browser environment.');
    return;
  }

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('es-DO', {
      style: 'currency',
      currency: 'DOP',
      minimumFractionDigits: 2
    }).format(value);
  };

  const totalVentas = ventas.reduce((sum, v) => sum + parseFloat(v.total || 0), 0);
  const totalCobrado = ventas.reduce((sum, v) => sum + parseFloat(v.monto_pagado || 0), 0);
  const porCobrar = ventas.reduce((sum, v) => sum + parseFloat(v.balance_pendiente || 0), 0);

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <title>Ventas Diarias</title>
      <style>
        @media print {
          @page { margin: 1cm; }
          body { margin: 0; }
        }
        body {
          font-family: Arial, sans-serif;
          padding: 20px;
          color: #333;
        }
        .header {
          text-align: center;
          margin-bottom: 30px;
          border-bottom: 3px solid #16a34a;
          padding-bottom: 15px;
        }
        .header h1 {
          color: #16a34a;
          margin: 0 0 10px 0;
          font-size: 28px;
        }
        .header p {
          margin: 5px 0;
          color: #666;
          font-size: 14px;
        }
        .resumen {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 15px;
          margin: 20px 0;
        }
        .resumen-card {
          background-color: #dcfce7;
          padding: 15px;
          border-radius: 8px;
          text-align: center;
        }
        .resumen-card h3 {
          margin: 0 0 5px 0;
          font-size: 12px;
          color: #666;
        }
        .resumen-card p {
          margin: 0;
          font-size: 20px;
          font-weight: bold;
          color: #16a34a;
        }
        table {
          width: 100%;
          border-collapse: collapse;
          margin-top: 20px;
          font-size: 11px;
        }
        th {
          background-color: #16a34a;
          color: white;
          padding: 10px 8px;
          text-align: left;
          font-weight: bold;
        }
        td {
          padding: 8px;
          border-bottom: 1px solid #ddd;
        }
        tr:hover {
          background-color: #f9fafb;
        }
        .tipo {
          display: inline-block;
          padding: 4px 12px;
          border-radius: 12px;
          font-size: 10px;
          font-weight: bold;
        }
        .tipo-contado {
          background-color: #dcfce7;
          color: #166534;
        }
        .tipo-credito {
          background-color: #dbeafe;
          color: #1e40af;
        }
        .estado {
          display: inline-block;
          padding: 4px 12px;
          border-radius: 12px;
          font-size: 10px;
          font-weight: bold;
        }
        .estado-pendiente {
          background-color: #fee2e2;
          color: #991b1b;
        }
        .estado-pagada {
          background-color: #dcfce7;
          color: #166534;
        }
        .estado-parcial {
          background-color: #fef3c7;
          color: #92400e;
        }
        .footer {
          margin-top: 30px;
          text-align: center;
          color: #666;
          font-size: 12px;
          border-top: 1px solid #ddd;
          padding-top: 15px;
        }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>🛒 Ventas Diarias</h1>
        <p>Fecha de generación: ${new Date().toLocaleDateString('es-ES', { 
          year: 'numeric', 
          month: 'long', 
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        })}</p>
        <p><strong>Fecha de impresión: ${new Date().toLocaleString('es-ES', { 
          year: 'numeric', 
          month: 'long', 
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit'
        })}</strong></p>
        <p>Total de ventas: ${ventas.length}</p>
      </div>

      <div class="resumen">
        <div class="resumen-card">
          <h3>Total Ventas</h3>
          <p>${formatCurrency(totalVentas)}</p>
        </div>
        <div class="resumen-card">
          <h3>Total Cobrado</h3>
          <p>${formatCurrency(totalCobrado)}</p>
        </div>
        <div class="resumen-card">
          <h3>Por Cobrar</h3>
          <p>${formatCurrency(porCobrar)}</p>
        </div>
      </div>

      <table>
        <thead>
          <tr>
            <th>Fecha</th>
            <th>Número</th>
            <th>Cliente</th>
            <th>Tipo</th>
            <th>Total</th>
            <th>Balance</th>
            <th>Estado</th>
          </tr>
        </thead>
        <tbody>
          ${ventas.map(venta => `
            <tr>
              <td>${new Date(venta.fecha).toLocaleDateString()}</td>
              <td>${venta.numero_venta}</td>
              <td>${venta.cliente_nombre}</td>
              <td><span class="tipo tipo-${venta.tipo_venta}">${venta.tipo_venta === 'contado' ? 'Contado' : 'Crédito'}</span></td>
              <td>${formatCurrency(venta.total)}</td>
              <td>${formatCurrency(venta.balance_pendiente)}</td>
              <td><span class="estado estado-${venta.estado}">${venta.estado === 'pagada' ? 'Pagada' : venta.estado === 'parcial' ? 'Parcial' : 'Pendiente'}</span></td>
            </tr>
          `).join('')}
        </tbody>
      </table>

      <div class="footer">
        <p>Sistema de Gestión de Arroz - Reporte generado automáticamente</p>
        <p><strong>Fecha de impresión: ${new Date().toLocaleString('es-ES', { 
          year: 'numeric', 
          month: 'long', 
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit'
        })}</strong></p>
      </div>
    </body>
    </html>
  `;

  const ventana = window.open('', '_blank');
  ventana.document.write(html);
  ventana.document.close();
  ventana.print();
};

// Función para generar PDF de Cuentas por Cobrar - ACTUALIZADA CON MONTO E INTERÉS
export const generarPDFCuentasPorCobrar = (cuentas, totales) => {
  if (typeof window === 'undefined') {
    console.warn('PDF generation is only supported in browser environment.');
    return;
  }

  const formatCurrency = (value, currency = 'DOP') => {
    if (value === null || value === undefined || isNaN(value)) {
      return currency === 'USD' ? 'USD 0.00' : 'RD$ 0.00';
    }
    
    const number = parseFloat(value);
    
    // Formatear el número con comas y decimales
    const formatted = number.toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
    
    // Retornar con el prefijo de moneda correcto
    return currency === 'USD' ? `USD ${formatted}` : `RD$ ${formatted}`;
  };

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <title>Cuentas por Cobrar</title>
      <style>
        @media print {
          @page { margin: 1cm; }
          body { margin: 0; }
        }
        body {
          font-family: Arial, sans-serif;
          padding: 20px;
          color: #333;
        }
        .header {
          display: flex;
          align-items: center;
          gap: 20px;
          margin-bottom: 30px;
          border-bottom: 3px solid #ea580c;
          padding-bottom: 15px;
        }
        .logo {
          flex-shrink: 0;
        }
        .logo img {
          height: 120px;
          width: auto;
          object-fit: contain;
        }
        .header-content {
          flex: 1;
          text-align: center;
        }
        .header h1 {
          color: #ea580c;
          margin: 0 0 10px 0;
          font-size: 28px;
        }
        .header p {
          margin: 5px 0;
          color: #666;
          font-size: 14px;
        }
        .resumen {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 15px;
          margin: 20px 0;
        }
        .resumen-card {
          background-color: #ffedd5;
          padding: 15px;
          border-radius: 8px;
          text-align: center;
        }
        .resumen-card h3 {
          margin: 0 0 5px 0;
          font-size: 12px;
          color: #666;
        }
        .resumen-card p {
          margin: 0;
          font-size: 20px;
          font-weight: bold;
          color: #ea580c;
        }
        table {
          width: 100%;
          border-collapse: collapse;
          margin-top: 20px;
          font-size: 9px;
        }
        th {
          background-color: #ea580c;
          color: white;
          padding: 10px 5px;
          text-align: left;
          font-weight: bold;
        }
        td {
          padding: 8px 5px;
          border-bottom: 1px solid #ddd;
        }
        tr:hover {
          background-color: #f9fafb;
        }
        .tipo {
          display: inline-block;
          padding: 4px 8px;
          border-radius: 12px;
          font-size: 8px;
          font-weight: bold;
        }
        .tipo-financiamiento {
          background-color: #dcfce7;
          color: #166534;
        }
        .tipo-factura {
          background-color: #dbeafe;
          color: #1e40af;
        }
        .estado {
          display: inline-block;
          padding: 4px 8px;
          border-radius: 12px;
          font-size: 8px;
          font-weight: bold;
        }
        .estado-pendiente {
          background-color: #fee2e2;
          color: #991b1b;
        }
        .estado-pagado {
          background-color: #dcfce7;
          color: #166534;
        }
        .estado-parcial {
          background-color: #fef3c7;
          color: #92400e;
        }
        .footer {
          margin-top: 30px;
          text-align: center;
          color: #666;
          font-size: 12px;
          border-top: 1px solid #ddd;
          padding-top: 15px;
        }
        .text-right {
          text-align: right;
        }
      </style>
    </head>
    <body>
      <div class="header">
        <div class="logo">
          <img src="https://sensible-spoonbill-485.convex.cloud/api/storage/f2c37282-23ea-45e1-8f03-4f60c1d96017" alt="Agroverde">
        </div>
        <div class="header-content">
          <h1>💰 Cuentas por Cobrar</h1>
          <p>Fecha de generación: ${new Date().toLocaleDateString('es-ES', { 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
          })}</p>
          <p><strong>Fecha de impresión: ${new Date().toLocaleString('es-ES', { 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit'
          })}</strong></p>
          <p>Total de cuentas: ${cuentas.length}</p>
        </div>
      </div>

      <div class="resumen">
        <div class="resumen-card">
          <h3>Total por Cobrar</h3>
          <p>${formatCurrency(totales.total)}</p>
        </div>
        <div class="resumen-card">
          <h3>Total Cobrado</h3>
          <p>${formatCurrency(totales.cobrado)}</p>
        </div>
        <div class="resumen-card">
          <h3>Pendiente</h3>
          <p>${formatCurrency(totales.pendiente)}</p>
        </div>
      </div>

      <table>
        <thead>
          <tr>
            <th>Tipo</th>
            <th>Referencia</th>
            <th>Fecha</th>
            <th>Cliente</th>
            <th class="text-right">Monto</th>
            <th class="text-right">Interés</th>
            <th class="text-right">Total</th>
            <th>Vencimiento</th>
            <th>Estado</th>
          </tr>
        </thead>
        <tbody>
          ${cuentas.map(cuenta => {
            const currency = cuenta.divisa || 'DOP';
            return `
            <tr>
              <td><span class="tipo tipo-${cuenta.tipo.toLowerCase()}">${cuenta.tipo}</span></td>
              <td>${cuenta.referencia || '-'}</td>
              <td>${new Date(cuenta.fecha_emision).toLocaleDateString()}</td>
              <td>${cuenta.clientes?.nombre || '-'}</td>
              <td class="text-right">${formatCurrency(cuenta.monto_principal || 0, currency)}</td>
              <td class="text-right">${formatCurrency(cuenta.monto_interes || 0, currency)}</td>
              <td class="text-right">${formatCurrency(cuenta.monto_total, currency)}</td>
              <td>${cuenta.fecha_vencimiento ? new Date(cuenta.fecha_vencimiento).toLocaleDateString() : '-'}</td>
              <td><span class="estado estado-${cuenta.estado.toLowerCase()}">${cuenta.estado}</span></td>
            </tr>
          `}).join('')}
        </tbody>
      </table>

      <div class="footer">
        <p>Sistema de Gestión de Arroz - Reporte generado automáticamente</p>
        <p><strong>Fecha de impresión: ${new Date().toLocaleString('es-ES', { 
          year: 'numeric', 
          month: 'long', 
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit'
        })}</strong></p>
      </div>
    </body>
    </html>
  `;

  const ventana = window.open('', '_blank');
  ventana.document.write(html);
  ventana.document.close();
  ventana.print();
};

// Función para generar PDF de Cliente Individual
export const generarPDFCliente = async (cliente) => {
  if (typeof window === 'undefined') {
    console.warn('PDF generation is only supported in browser environment.');
    return;
  }

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('es-DO', {
      style: 'currency',
      currency: 'DOP',
      minimumFractionDigits: 2
    }).format(value);
  };

  const limiteCredito = parseFloat(cliente.limite_credito) || 0;
  const balancePendiente = parseFloat(cliente.balance_pendiente) || 0;
  const creditoDisponible = limiteCredito - balancePendiente;

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <title>Información del Cliente - ${cliente.nombre}</title>
      <style>
        @media print {
          @page { margin: 1cm; }
          body { margin: 0; }
        }
        body {
          font-family: Arial, sans-serif;
          padding: 20px;
          color: #333;
        }
        .header {
          text-align: center;
          margin-bottom: 30px;
          border-bottom: 3px solid #2563eb;
          padding-bottom: 15px;
        }
        .header h1 {
          color: #2563eb;
          margin: 0 0 10px 0;
          font-size: 28px;
        }
        .header p {
          margin: 5px 0;
          color: #666;
          font-size: 14px;
        }
        .info-section {
          background-color: #f8fafc;
          padding: 20px;
          border-radius: 8px;
          margin-bottom: 20px;
        }
        .info-section h2 {
          color: #2563eb;
          margin: 0 0 15px 0;
          font-size: 18px;
          border-bottom: 2px solid #2563eb;
          padding-bottom: 8px;
        }
        .info-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 15px;
        }
        .info-item {
          display: flex;
          flex-direction: column;
        }
        .info-item label {
          font-size: 12px;
          color: #666;
          margin-bottom: 4px;
          font-weight: bold;
        }
        .info-item value {
          font-size: 14px;
          color: #333;
        }
        .resumen {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 15px;
          margin: 20px 0;
        }
        .resumen-card {
          padding: 15px;
          border-radius: 8px;
          text-align: center;
        }
        .resumen-card.azul {
          background-color: #dbeafe;
        }
        .resumen-card.rojo {
          background-color: #fee2e2;
        }
        .resumen-card.verde {
          background-color: #dcfce7;
        }
        .resumen-card h3 {
          margin: 0 0 5px 0;
          font-size: 12px;
          color: #666;
        }
        .resumen-card p {
          margin: 0;
          font-size: 20px;
          font-weight: bold;
        }
        .resumen-card.azul p {
          color: #1e40af;
        }
        .resumen-card.rojo p {
          color: #991b1b;
        }
        .resumen-card.verde p {
          color: #166534;
        }
        .footer {
          margin-top: 30px;
          text-align: center;
          color: #666;
          font-size: 12px;
          border-top: 1px solid #ddd;
          padding-top: 15px;
        }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>👤 Información del Cliente</h1>
        <p>Fecha de generación: ${new Date().toLocaleDateString('es-ES', { 
          year: 'numeric', 
          month: 'long', 
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        })}</p>
        <p><strong>Fecha de impresión: ${new Date().toLocaleString('es-ES', { 
          year: 'numeric', 
          month: 'long', 
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit'
        })}</strong></p>
      </div>

      <div class="info-section">
        <h2>Datos Personales</h2>
        <div class="info-grid">
          <div class="info-item">
            <label>Nombre Completo:</label>
            <value>${cliente.nombre}</value>
          </div>
          <div class="info-item">
            <label>Cédula:</label>
            <value>${cliente.cedula || 'No registrada'}</value>
          </div>
          <div class="info-item">
            <label>Teléfono:</label>
            <value>${cliente.telefono || 'No registrado'}</value>
          </div>
          <div class="info-item">
            <label>Email:</label>
            <value>${cliente.email || 'No registrado'}</value>
          </div>
          <div class="info-item" style="grid-column: span 2;">
            <label>Dirección:</label>
            <value>${cliente.direccion || 'No registrada'}</value>
          </div>
        </div>
      </div>

      <div class="info-section">
        <h2>Información Financiera</h2>
        <div class="resumen">
          <div class="resumen-card azul">
            <h3>Límite de Crédito</h3>
            <p>${formatCurrency(limiteCredito)}</p>
          </div>
          <div class="resumen-card rojo">
            <h3>Balance Pendiente</h3>
            <p>${formatCurrency(balancePendiente)}</p>
          </div>
          <div class="resumen-card verde">
            <h3>Crédito Disponible</h3>
            <p>${formatCurrency(creditoDisponible)}</p>
          </div>
        </div>
      </div>

      <div class="footer">
        <p>Sistema de Gestión de Arroz - Reporte generado automáticamente</p>
        <p>Este documento es confidencial y solo debe ser usado para fines internos</p>
        <p><strong>Fecha de impresión: ${new Date().toLocaleString('es-ES', { 
          year: 'numeric', 
          month: 'long', 
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit'
        })}</strong></p>
      </div>
    </body>
    </html>
  `;

  const ventana = window.open('', '_blank');
  ventana.document.write(html);
  ventana.document.close();
  ventana.print();
};
