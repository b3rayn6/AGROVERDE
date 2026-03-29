import { formatCurrency } from './formatters';
import { formatearFechaLocal } from './dateUtils';

export const generarPDFCompensacionesCliente = async (compensaciones, nombreCliente, supabase) => {
  if (typeof window === 'undefined') {
    console.warn('PDF generation is only supported in browser environment.');
    return;
  }

  // Cargar detalles completos de compensaciones con cuentas y pesadas
  const compensacionesDetalladas = await Promise.all(
    compensaciones.map(async (comp) => {
      // Obtener cuenta por cobrar
      const { data: cuenta } = await supabase
        .from('cuentas_por_cobrar')
        .select('referencia, tipo, monto_total')
        .eq('id', comp.cuenta_cobrar_id)
        .single();
      
      // Obtener pesada
      const { data: pesada } = await supabase
        .from('pesadas')
        .select('numero_pesada, fecha, fanegas, precio_fanega, valor_total')
        .eq('id', comp.pesada_id)
        .single();
      
      return {
        ...comp,
        cuenta,
        pesada
      };
    })
  );

  // Calcular totales
  const totalCompensado = compensacionesDetalladas.reduce((sum, c) => sum + parseFloat(c.monto_compensado || 0), 0);
  const totalNotasCredito = compensacionesDetalladas.reduce((sum, c) => sum + parseFloat(c.saldo_favor || 0), 0);

  const htmlContent = `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Compensaciones - ${nombreCliente}</title>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    
    body {
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
      font-size: 11pt;
      line-height: 1.4;
      color: #1a1a1a;
      padding: 20px;
      background: white;
    }
    
    .header {
      text-align: center;
      margin-bottom: 30px;
      padding-bottom: 20px;
      border-bottom: 3px solid #10b981;
    }
    
    .logo {
      font-size: 28pt;
      font-weight: bold;
      color: #059669;
      margin-bottom: 8px;
      letter-spacing: 2px;
    }
    
    .titulo {
      font-size: 20pt;
      font-weight: bold;
      color: #1f2937;
      margin-bottom: 5px;
    }
    
    .subtitulo {
      font-size: 10pt;
      color: #6b7280;
    }
    
    .info-cliente {
      background: linear-gradient(135deg, #10b981 0%, #059669 100%);
      color: white;
      padding: 20px;
      border-radius: 8px;
      margin-bottom: 25px;
    }
    
    .info-cliente .nombre {
      font-size: 18pt;
      font-weight: bold;
      margin-bottom: 8px;
    }
    
    .info-cliente .detalle {
      font-size: 10pt;
      opacity: 0.95;
    }
    
    .resumen {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 15px;
      margin-bottom: 25px;
    }
    
    .card-resumen {
      background: #f9fafb;
      border: 2px solid #e5e7eb;
      border-radius: 8px;
      padding: 15px;
      text-align: center;
    }
    
    .card-resumen.destacado {
      background: linear-gradient(135deg, #dbeafe 0%, #bfdbfe 100%);
      border-color: #3b82f6;
    }
    
    .card-resumen .etiqueta {
      font-size: 9pt;
      color: #6b7280;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      margin-bottom: 5px;
    }
    
    .card-resumen .valor {
      font-size: 18pt;
      font-weight: bold;
      color: #1f2937;
    }
    
    .card-resumen.destacado .valor {
      color: #1d4ed8;
    }
    
    .seccion-titulo {
      font-size: 14pt;
      font-weight: bold;
      color: #1f2937;
      margin: 25px 0 15px 0;
      padding-bottom: 8px;
      border-bottom: 2px solid #10b981;
      display: flex;
      align-items: center;
      gap: 10px;
    }
    
    .compensacion-item {
      background: white;
      border: 2px solid #e5e7eb;
      border-radius: 8px;
      padding: 15px;
      margin-bottom: 15px;
      page-break-inside: avoid;
    }
    
    .compensacion-item:hover {
      border-color: #10b981;
      box-shadow: 0 2px 8px rgba(16, 185, 129, 0.1);
    }
    
    .comp-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 12px;
      padding-bottom: 12px;
      border-bottom: 1px solid #e5e7eb;
    }
    
    .comp-fecha {
      background: #10b981;
      color: white;
      padding: 4px 12px;
      border-radius: 20px;
      font-size: 9pt;
      font-weight: 600;
    }
    
    .comp-monto {
      font-size: 16pt;
      font-weight: bold;
      color: #10b981;
    }
    
    .comp-detalles {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 15px;
      margin-bottom: 12px;
    }
    
    .detalle-box {
      background: #f9fafb;
      padding: 12px;
      border-radius: 6px;
      border-left: 3px solid #10b981;
    }
    
    .detalle-box.pesada {
      border-left-color: #3b82f6;
    }
    
    .detalle-box .titulo {
      font-size: 8pt;
      text-transform: uppercase;
      color: #6b7280;
      letter-spacing: 0.5px;
      margin-bottom: 6px;
      font-weight: 600;
    }
    
    .detalle-box .contenido {
      font-size: 10pt;
      color: #1f2937;
    }
    
    .detalle-box .contenido strong {
      font-weight: 700;
      color: #10b981;
    }
    
    .detalle-box.pesada .contenido strong {
      color: #3b82f6;
    }
    
    .comp-nota-credito {
      background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%);
      border: 2px solid #f59e0b;
      padding: 10px 15px;
      border-radius: 6px;
      margin-top: 10px;
      font-size: 9pt;
      color: #92400e;
      font-weight: 600;
    }
    
    .comp-notas {
      background: #eff6ff;
      border-left: 3px solid #3b82f6;
      padding: 10px 15px;
      border-radius: 4px;
      margin-top: 10px;
      font-size: 9pt;
      color: #1e3a8a;
      font-style: italic;
    }
    
    .total-general {
      background: linear-gradient(135deg, #10b981 0%, #059669 100%);
      color: white;
      padding: 20px;
      border-radius: 8px;
      margin-top: 25px;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    
    .total-general .label {
      font-size: 14pt;
      font-weight: 600;
    }
    
    .total-general .valor {
      font-size: 24pt;
      font-weight: bold;
    }
    
    .footer {
      margin-top: 40px;
      padding-top: 20px;
      border-top: 2px solid #e5e7eb;
      text-align: center;
      font-size: 9pt;
      color: #6b7280;
    }
    
    .footer .mensaje {
      margin-bottom: 8px;
      font-weight: 600;
      color: #10b981;
    }
    
    @media print {
      body {
        padding: 10px;
      }
      
      .compensacion-item {
        page-break-inside: avoid;
      }
    }
  </style>
</head>
<body>
  <div class="header">
    <div class="logo">🌱 AGROVERDE</div>
    <div class="titulo">Reporte de Compensaciones con Pesadas</div>
    <div class="subtitulo">Generado el ${formatearFechaLocal(new Date().toISOString().split('T')[0])}</div>
  </div>

  <div class="info-cliente">
    <div class="nombre">${nombreCliente}</div>
    <div class="detalle">
      Cliente • Historial de pagos realizados con pesadas registradas
    </div>
  </div>

  <div class="resumen">
    <div class="card-resumen">
      <div class="etiqueta">Total Compensaciones</div>
      <div class="valor">${compensacionesDetalladas.length}</div>
    </div>
    <div class="card-resumen destacado">
      <div class="etiqueta">Monto Total Compensado</div>
      <div class="valor">${formatCurrency(totalCompensado)}</div>
    </div>
    <div class="card-resumen">
      <div class="etiqueta">Notas de Crédito</div>
      <div class="valor">${formatCurrency(totalNotasCredito)}</div>
    </div>
  </div>

  <div class="seccion-titulo">
    📋 Detalle de Compensaciones
  </div>

  ${compensacionesDetalladas.map((comp, index) => `
    <div class="compensacion-item">
      <div class="comp-header">
        <div>
          <span class="comp-fecha">${formatearFechaLocal(comp.fecha)}</span>
        </div>
        <div class="comp-monto">${formatCurrency(comp.monto_compensado)}</div>
      </div>
      
      <div class="comp-detalles">
        <div class="detalle-box">
          <div class="titulo">📄 Cuenta por Cobrar</div>
          <div class="contenido">
            <strong>${comp.cuenta?.referencia || 'N/A'}</strong><br>
            Tipo: ${comp.cuenta?.tipo || 'N/A'}<br>
            Monto Original: ${formatCurrency(comp.cuenta?.monto_total || 0)}
          </div>
        </div>
        
        <div class="detalle-box pesada">
          <div class="titulo">⚖️ Pesada Utilizada</div>
          <div class="contenido">
            <strong>Pesada #${comp.pesada?.numero_pesada || 'S/N'}</strong><br>
            Fecha: ${formatearFechaLocal(comp.pesada?.fecha)}<br>
            Fanegas: ${parseFloat(comp.pesada?.fanegas || 0).toFixed(2)} @ ${formatCurrency(comp.pesada?.precio_fanega || 0)}<br>
            Valor Total: ${formatCurrency(comp.pesada?.valor_total || 0)}
          </div>
        </div>
      </div>
      
      ${comp.saldo_favor > 0 ? `
        <div class="comp-nota-credito">
          💳 Nota de Crédito Generada: ${formatCurrency(comp.saldo_favor)} • Saldo a favor aplicable a futuras transacciones
        </div>
      ` : ''}
      
      ${comp.notas ? `
        <div class="comp-notas">
          📝 ${comp.notas}
        </div>
      ` : ''}
    </div>
  `).join('')}

  ${compensacionesDetalladas.length === 0 ? `
    <div style="text-align: center; padding: 40px; color: #6b7280; background: #f9fafb; border-radius: 8px;">
      <div style="font-size: 48px; margin-bottom: 15px;">📭</div>
      <div style="font-size: 14pt; font-weight: 600; margin-bottom: 8px;">No hay compensaciones registradas</div>
      <div style="font-size: 10pt;">Este cliente aún no tiene compensaciones realizadas con pesadas</div>
    </div>
  ` : ''}

  <div class="total-general">
    <div class="label">💰 Total Compensado Acumulado:</div>
    <div class="valor">${formatCurrency(totalCompensado)}</div>
  </div>

  ${totalNotasCredito > 0 ? `
    <div style="background: #fef3c7; border: 2px solid #f59e0b; padding: 15px; border-radius: 8px; margin-top: 15px; text-align: center;">
      <div style="font-size: 11pt; font-weight: 600; color: #92400e; margin-bottom: 5px;">
        💳 Notas de Crédito Generadas
      </div>
      <div style="font-size: 18pt; font-weight: bold; color: #b45309;">
        ${formatCurrency(totalNotasCredito)}
      </div>
      <div style="font-size: 9pt; color: #92400e; margin-top: 5px;">
        Saldo a favor disponible para futuras compensaciones
      </div>
    </div>
  ` : ''}

  <div class="footer">
    <div class="mensaje">✅ Este documento refleja todas las compensaciones realizadas con pesadas registradas</div>
    <div>Agroverde • Sistema de Gestión Agrícola</div>
    <div>📞 Contacto: info@agroverde.com</div>
    <div style="margin-top: 10px; font-weight: 600; color: #1f2937;">
      Este documento tiene validez oficial
    </div>
  </div>
</body>
</html>
  `;

  // Abrir en nueva ventana e imprimir
  const printWindow = window.open('', '_blank');
  printWindow.document.write(htmlContent);
  printWindow.document.close();
  
  // Esperar a que se cargue y luego imprimir
  setTimeout(() => {
    printWindow.print();
  }, 250);
};
