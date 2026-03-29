// Función para generar PDF de Cuentas por Cobrar de un Cliente (para Compensación con Pesadas)
export const generarPDFCuentasPorCobrarCliente = (cuentas, cliente) => {
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

  const totalDeuda = cuentas.reduce((sum, c) => sum + parseFloat(c.monto_pendiente || 0), 0);
  const totalOriginal = cuentas.reduce((sum, c) => sum + parseFloat(c.monto_total || 0), 0);
  const totalPagado = totalOriginal - totalDeuda;

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <title>Cuentas por Cobrar - ${cliente}</title>
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
          border-bottom: 3px solid #2563eb;
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
          color: #2563eb;
          margin: 0 0 10px 0;
          font-size: 28px;
        }
        .header p {
          margin: 5px 0;
          color: #666;
          font-size: 14px;
        }
        .cliente-info {
          background-color: #dbeafe;
          padding: 20px;
          border-radius: 8px;
          margin-bottom: 30px;
        }
        .cliente-info h2 {
          margin: 0 0 15px 0;
          color: #1e40af;
          font-size: 24px;
        }
        .resumen {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 15px;
          margin-top: 15px;
        }
        .resumen-card {
          background-color: white;
          padding: 15px;
          border-radius: 8px;
          text-align: center;
          border: 1px solid #93c5fd;
        }
        .resumen-card h3 {
          margin: 0 0 5px 0;
          font-size: 12px;
          color: #666;
        }
        .resumen-card p {
          margin: 0;
          font-size: 18px;
          font-weight: bold;
          color: #2563eb;
        }
        .resumen-card.destacado p {
          font-size: 24px;
          color: #dc2626;
        }
        table {
          width: 100%;
          border-collapse: collapse;
          margin-top: 20px;
          font-size: 12px;
        }
        th {
          background-color: #2563eb;
          color: white;
          padding: 12px;
          text-align: left;
          font-weight: bold;
        }
        td {
          padding: 10px 12px;
          border-bottom: 1px solid #ddd;
        }
        tr:hover {
          background-color: #f9fafb;
        }
        .estado {
          display: inline-block;
          padding: 4px 12px;
          border-radius: 12px;
          font-size: 11px;
          font-weight: bold;
        }
        .estado-Pendiente {
          background-color: #fee2e2;
          color: #991b1b;
        }
        .estado-Pagada {
          background-color: #dcfce7;
          color: #166534;
        }
        .total-row {
          background-color: #dbeafe;
          font-weight: bold;
          font-size: 14px;
        }
        .total-row td {
          padding: 15px 12px;
          border-top: 2px solid #2563eb;
        }
        .footer {
          margin-top: 30px;
          text-align: center;
          color: #666;
          font-size: 12px;
          border-top: 1px solid #ddd;
          padding-top: 15px;
        }
        .aviso {
          background-color: #fef3c7;
          border-left: 4px solid #f59e0b;
          padding: 15px;
          margin-top: 30px;
          border-radius: 4px;
        }
        .aviso h3 {
          margin: 0 0 10px 0;
          color: #92400e;
          font-size: 16px;
        }
        .aviso p {
          margin: 5px 0;
          color: #78350f;
          font-size: 13px;
        }
      </style>
    </head>
    <body>
      <div class="header">
        <div class="logo">
          <img src="https://sensible-spoonbill-485.convex.cloud/api/storage/f2c37282-23ea-45e1-8f03-4f60c1d96017" alt="Agroverde">
        </div>
        <div class="header-content">
          <h1>📋 Estado de Cuenta</h1>
          <p>Fecha de emisión: ${new Date().toLocaleDateString('es-ES', { 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
          })}</p>
          <p><strong>Cuentas por Cobrar Activas</strong></p>
        </div>
      </div>

      <div class="cliente-info">
        <h2>Cliente: ${cliente}</h2>
        <div class="resumen">
          <div class="resumen-card">
            <h3>Total Cuentas</h3>
            <p>${cuentas.length}</p>
          </div>
          <div class="resumen-card">
            <h3>Monto Original</h3>
            <p>${formatCurrency(totalOriginal)}</p>
          </div>
          <div class="resumen-card">
            <h3>Total Pagado</h3>
            <p>${formatCurrency(totalPagado)}</p>
          </div>
          <div class="resumen-card destacado">
            <h3>SALDO PENDIENTE</h3>
            <p>${formatCurrency(totalDeuda)}</p>
          </div>
        </div>
      </div>

      <h2 style="margin-top: 30px; color: #2563eb; font-size: 20px;">Detalle de Cuentas por Cobrar</h2>
      <table>
        <thead>
          <tr>
            <th>Referencia</th>
            <th>Fecha Emisión</th>
            <th>Tipo</th>
            <th>Monto Total</th>
            <th>Monto Pagado</th>
            <th>Saldo Pendiente</th>
            <th>Días</th>
            <th>Estado</th>
          </tr>
        </thead>
        <tbody>
          ${cuentas.map(cuenta => {
            const diasVencido = Math.floor((new Date() - new Date(cuenta.fecha_emision)) / (1000 * 60 * 60 * 24));
            const montoPagado = parseFloat(cuenta.monto_total || 0) - parseFloat(cuenta.monto_pendiente || 0);
            return `
              <tr>
                <td><strong>${cuenta.referencia}</strong></td>
                <td>${new Date(cuenta.fecha_emision).toLocaleDateString()}</td>
                <td>${cuenta.tipo || 'N/A'}</td>
                <td>${formatCurrency(cuenta.monto_total)}</td>
                <td>${formatCurrency(montoPagado)}</td>
                <td style="color: #dc2626; font-weight: bold;">${formatCurrency(cuenta.monto_pendiente)}</td>
                <td>${diasVencido} días</td>
                <td><span class="estado estado-${cuenta.estado}">${cuenta.estado}</span></td>
              </tr>
            `;
          }).join('')}
          <tr class="total-row">
            <td colspan="3" style="text-align: right;"><strong>TOTALES:</strong></td>
            <td><strong>${formatCurrency(totalOriginal)}</strong></td>
            <td><strong>${formatCurrency(totalPagado)}</strong></td>
            <td style="color: #dc2626;"><strong>${formatCurrency(totalDeuda)}</strong></td>
            <td colspan="2"></td>
          </tr>
        </tbody>
      </table>

      ${cuentas.some(c => c.notas) ? `
        <div style="margin-top: 30px;">
          <h3 style="color: #2563eb; margin-bottom: 15px;">Notas Adicionales:</h3>
          ${cuentas.filter(c => c.notas).map(c => `
            <div style="background-color: #f9fafb; padding: 10px; margin-bottom: 10px; border-left: 3px solid #2563eb; border-radius: 4px;">
              <strong>${c.referencia}:</strong> ${c.notas}
            </div>
          `).join('')}
        </div>
      ` : ''}

      <div class="aviso">
        <h3>⚠️ Información Importante</h3>
        <p>• Este documento muestra el estado actualizado de sus cuentas por cobrar al día de hoy.</p>
        <p>• Las cuentas pueden ser compensadas con pesadas registradas en el sistema.</p>
        <p>• Para más información o aclarar dudas, contacte con nuestro departamento de cuentas.</p>
      </div>

      <div class="footer">
        <p>Sistema de Gestión de Arroz - Estado de Cuenta generado automáticamente</p>
        <p><strong>Este documento tiene validez oficial</strong></p>
      </div>
    </body>
    </html>
  `;

  const ventana = window.open('', '_blank');
  ventana.document.write(html);
  ventana.document.close();
  ventana.print();
};
