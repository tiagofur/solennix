import { jsPDF } from "jspdf";
import autoTable from 'jspdf-autotable';
import { Database } from '../types/supabase';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

type Event = Database['public']['Tables']['events']['Row'] & {
  client?: Database['public']['Tables']['clients']['Row'] | null;
};
type Profile = Database['public']['Tables']['users']['Row'] & {
  stripe_customer_id?: string | null;
  created_at?: string;
  updated_at?: string;
};
type ProductItem = Database['public']['Tables']['event_products']['Row'] & {
  products: { name: string } | null;
};
type ExtraItem = Database['public']['Tables']['event_extras']['Row'];

const DEFAULT_BRAND_COLOR = '#FF6B35'; // Naranja de la marca
const TEXT_COLOR = '#333333';
const GRAY_COLOR = '#666666';

// Helper para formatear moneda
const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: 'MXN',
  }).format(amount);
};

// Helper para agregar encabezado común
const addHeader = (doc: jsPDF, profile: Profile | null, title: string): number => {
  const pageWidth = doc.internal.pageSize.width;
  let startX = 20;

  // Render logo if present
  if (profile?.logo_url) {
    try {
      // jsPDF auto detects format, we reserve a max 30x30 bounding box
      // To maintain aspect ratio perfectly, we need the original dimensions.
      // Since jsPDF addImage in FAST mode can stretch if we force width/height, 
      // we use an HTML Image element to get real dimensions first.
      
      const imgProps = doc.getImageProperties(profile.logo_url);
      const maxWidth = 30;
      const maxHeight = 30;
      
      let width = imgProps.width;
      let height = imgProps.height;
      
      // Scale down if needed while preserving aspect ratio
      if (width > maxWidth || height > maxHeight) {
        const ratio = Math.min(maxWidth / width, maxHeight / height);
        width = width * ratio;
        height = height * ratio;
      }
      
      // Center vertically in the 30px height header space (y = 10 to 40)
      const yPos = 10 + (maxHeight - height) / 2;
      
      doc.addImage(profile.logo_url, imgProps.fileType, 20, yPos, width, height, undefined, 'FAST');
      startX = 20 + width + 5; // Shift text to right of logo dynamically
    } catch (error) {
      console.error('Error adding logo to PDF', error);
      // Fallback: don't shift text if logo fails
    }
  }
  
  const brandColor = profile?.brand_color || DEFAULT_BRAND_COLOR;
  const showBusinessName = profile?.show_business_name_in_pdf ?? true;
  
  // Business Name
  if (showBusinessName || !profile?.logo_url) {
    doc.setFontSize(20);
    doc.setTextColor(brandColor);
    doc.text(profile?.business_name || profile?.name || 'EventosApp', startX, 22);
  }
  
  // Title
  doc.setFontSize(24);
  doc.setTextColor(TEXT_COLOR);
  doc.text(title.toUpperCase(), pageWidth - 20, 22, { align: 'right' });
  
  // Line separator
  doc.setDrawColor(brandColor);
  doc.setLineWidth(1);
  doc.line(20, 32, pageWidth - 20, 32);
  
  return 42; // Returns Y position for next content
};

export const generateBudgetPDF = (
  event: Event,
  profile: Profile | null,
  products: ProductItem[],
  extras: ExtraItem[]
) => {
  const doc = new jsPDF();
  let currentY = addHeader(doc, profile, 'Presupuesto');
  
  const brandColor = profile?.brand_color || DEFAULT_BRAND_COLOR;

  // Header Details
  const pageWidth = doc.internal.pageSize.width;
  doc.setFontSize(10);
  doc.setTextColor(TEXT_COLOR);
  
  // Details table simulation
  doc.setFont(undefined, 'bold');
  doc.text('Cliente:', 20, currentY);
  doc.text('Teléfono:', 20, currentY + 7);
  doc.text('Email:', 20, currentY + 14);
  
  doc.setFont(undefined, 'normal');
  doc.text(event.client?.name || 'N/A', 40, currentY);
  doc.text(event.client?.phone || 'N/A', 40, currentY + 7);
  doc.text(event.client?.email || 'N/A', 40, currentY + 14);
  
  doc.setFont(undefined, 'bold');
  doc.text('Fecha:', pageWidth / 2, currentY);
  doc.text('Horario:', pageWidth / 2, currentY + 7);
  doc.text('Personas:', pageWidth / 2, currentY + 14);
  
  doc.setFont(undefined, 'normal');
  const eventDate = new Date(event.event_date);
  doc.text(format(eventDate, "d 'de' MMMM, yyyy", { locale: es }), pageWidth / 2 + 25, currentY);
  doc.text(`${event.start_time || 'Por definir'} - ${event.end_time || 'Por definir'}`, pageWidth / 2 + 25, currentY + 7);
  doc.text(event.num_people.toString(), pageWidth / 2 + 25, currentY + 14);
  
  currentY += 25;

  // Products Table
  doc.setFontSize(14);
  doc.setTextColor(brandColor);
  doc.text('Productos y Servicios', 20, currentY);
  currentY += 7;

  const productRows = products.map((p) => [
    p.products?.name || 'Producto',
    p.quantity.toString(),
    formatCurrency(p.unit_price),
    formatCurrency((p.unit_price - (p.discount || 0)) * p.quantity)
  ]);
  
  // Tabla de Extras
  const extraRows = extras.map((e) => [
    e.description,
    "1",
    formatCurrency(e.price),
    formatCurrency(e.price)
  ]);
  
  const body = [...productRows, ...extraRows];
  
  if (body.length > 0) {
    autoTable(doc, {
      startY: currentY,
      margin: { left: 20, right: 20 },
      head: [['Descripción', 'Cant.', 'Precio Unit.', 'Total']],
      body: body,
      headStyles: { fillColor: [245, 245, 245], textColor: brandColor },
      styles: { cellPadding: 2, fontSize: 10 },
      columnStyles: {
        0: { halign: 'left' },
        1: { halign: 'center' },
        2: { halign: 'right' },
        3: { halign: 'right' },
      },
      theme: 'grid',
    });
    
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    currentY = (doc as any).lastAutoTable.finalY + 10;
  } else {
    currentY += 10;
    doc.text('No hay productos o servicios registrados.', 20, currentY);
    currentY += 10;
  }
  
  // Totales
  const summaryX = pageWidth - 20 - 60; // Right aligned, width of 60
  
  doc.setDrawColor(GRAY_COLOR);
  doc.setLineWidth(0.1);
  doc.line(summaryX, currentY - 5, pageWidth - 20, currentY - 5);
  
  doc.setFontSize(10);
  doc.setTextColor(TEXT_COLOR);
  
  doc.setFont(undefined, 'normal');
  doc.text('Subtotal:', summaryX, currentY);
  doc.text(formatCurrency(event.total_amount + (event.discount || 0)), pageWidth - 20, currentY, { align: 'right' });
  
  if (event.discount && event.discount > 0) {
    currentY += 7;
    doc.setTextColor(brandColor);
    doc.text('Descuento:', summaryX, currentY);
    doc.text(`-${formatCurrency(event.discount)}`, pageWidth - 20, currentY, { align: 'right' });
    doc.setTextColor(TEXT_COLOR);
  }

  if (event.requires_invoice) {
    currentY += 7;
    doc.text(`IVA (${event.tax_rate || 16}%):`, summaryX, currentY);
    doc.text(formatCurrency(event.tax_amount || 0), pageWidth - 20, currentY, { align: 'right' });
  }
  

  doc.setFont(undefined, 'bold');
  doc.setFontSize(12);
  doc.setTextColor(GRAY_COLOR);
  
  const pageHeight = doc.internal.pageSize.height;
  doc.text('Este presupuesto tiene una validez de 15 días.', 20, pageHeight - 10);
  
  doc.save(`Presupuesto_${event.client?.name || 'Cliente'}.pdf`);
};

export const generateContractPDF = (
  event: Event,
  profile: Profile | null
) => {
  const doc = new jsPDF();
  const currentY = addHeader(doc, profile, 'Contrato');
  
  doc.setFontSize(10);
  doc.setTextColor(TEXT_COLOR);
  
  const city = event.city || profile?.business_name || 'la ciudad';
  const dateStr = format(new Date(), "d 'de' MMMM 'de' yyyy", { locale: es });
  const providerName = profile?.business_name || profile?.name || 'EL PROVEEDOR';
  const clientName = event.client?.name || 'EL CLIENTE';
  
  const eventDate = new Date(event.event_date);
  const userTimezoneOffset = eventDate.getTimezoneOffset() * 60000;
  const localDate = new Date(eventDate.getTime() + userTimezoneOffset);
  const eventDateStr = format(localDate, "d 'de' MMMM 'de' yyyy", { locale: es });

  const text = `En ${city}, a los ${dateStr}, comparecen por una parte ${providerName} (en adelante "EL PROVEEDOR"), y por la otra parte ${clientName} (en adelante "EL CLIENTE"), quienes convienen en celebrar el presente Contrato de Prestación de Servicios.

PRIMERA: OBJETO.
EL PROVEEDOR se compromete a prestar los servicios de ${event.service_type} para el evento que se llevará a cabo el día ${eventDateStr}.

SEGUNDA: DETALLES DEL EVENTO.
El evento contará con aproximadamente ${event.num_people} personas.
Ubicación: ${event.location || 'A definir'}.
Horario: ${event.start_time || 'A definir'} - ${event.end_time || 'A definir'}.

TERCERA: COSTO Y FORMA DE PAGO.
El costo total del servicio es de ${formatCurrency(event.total_amount)}.
EL CLIENTE realizará un anticipo del ${event.deposit_percent ?? 50}% para reservar la fecha, debiendo liquidar el saldo restante antes del inicio del evento.

CUARTA: CANCELACIONES.
En caso de cancelación por parte de EL CLIENTE con menos de ${event.cancellation_days ?? 15} días de anticipación, el anticipo no será reembolsado.
${event.refund_percent && event.refund_percent > 0 ? `Si la cancelación se realiza con la debida anticipación, se reembolsará el ${event.refund_percent}% del anticipo entregado.` : ''}

QUINTA: ACEPTACIÓN.
Ambas partes aceptan los términos y condiciones del presente contrato.`;

  const splitText = doc.splitTextToSize(text, 170);
  doc.text(splitText, 20, currentY + 10);
  
  // Firmas
  const pageHeight = doc.internal.pageSize.height;
  const signY = pageHeight - 40;
  
  doc.line(20, signY, 80, signY);
  doc.text('EL PROVEEDOR', 50, signY + 5, { align: 'center' });
  doc.text(providerName, 50, signY + 10, { align: 'center', maxWidth: 60 });
  
  doc.line(130, signY, 190, signY);
  doc.text('EL CLIENTE', 160, signY + 5, { align: 'center' });
  doc.text(clientName, 160, signY + 10, { align: 'center', maxWidth: 60 });
  
  doc.save(`Contrato_${event.client?.name || 'Cliente'}.pdf`);
};

export const generateShoppingListPDF = (
  event: Event,
  profile: Profile | null,
  ingredients: { name: string; quantity: number; unit: string }[]
) => {
  const doc = new jsPDF();
  let currentY = addHeader(doc, profile, 'Lista de Compras');
  
  const brandColor = profile?.brand_color || DEFAULT_BRAND_COLOR;

  // Event Info
  doc.setFontSize(10);
  doc.setTextColor(GRAY_COLOR);
  doc.setFont('helvetica', 'normal');
  const eventDate = new Date(event.event_date);
  const userTimezoneOffset = eventDate.getTimezoneOffset() * 60000;
  const localDate = new Date(eventDate.getTime() + userTimezoneOffset);
  
  doc.text(`Evento: ${event.service_type}`, 20, currentY);
  doc.text(`Fecha: ${format(localDate, "d 'de' MMMM, yyyy", { locale: es })}`, 20, currentY + 5);
  doc.text(`Personas: ${event.num_people}`, 20, currentY + 10);
  
  currentY += 20;

  // Table
  if (ingredients.length > 0) {
    autoTable(doc, {
      startY: currentY,
      margin: { left: 20, right: 20 },
      head: [['Ingrediente', 'Cantidad', 'Unidad']],
      body: ingredients.map(i => [i.name, i.quantity.toFixed(2), i.unit]),
      headStyles: { fillColor: [245, 245, 245], textColor: brandColor },
      styles: { fontSize: 10 },
      theme: 'grid',
    });
  } else {
    doc.text('No hay ingredientes calculados.', 20, currentY);
  }

  doc.save(`Compras_${event.service_type}_${format(localDate, 'yyyy-MM-dd')}.pdf`);
};

export const generatePaymentReportPDF = (
  event: Event,
  profile: Profile | null,
  payments: Database['public']['Tables']['payments']['Row'][]
) => {
  const doc = new jsPDF();
  let currentY = addHeader(doc, profile, 'Reporte de Pagos');

  const brandColor = profile?.brand_color || DEFAULT_BRAND_COLOR;

  // Event & Client Info
  doc.setFontSize(10);
  doc.setTextColor(GRAY_COLOR);
  
  const eventDate = new Date(event.event_date);
  const userTimezoneOffset = eventDate.getTimezoneOffset() * 60000;
  const localDate = new Date(eventDate.getTime() + userTimezoneOffset);

  // Left Column
  doc.text(`Cliente: ${event.client?.name || 'N/A'}`, 20, currentY);
  doc.text(`Evento: ${event.service_type}`, 20, currentY + 5);
  
  // Right Column
  const rightColX = doc.internal.pageSize.width / 2 + 10;
  doc.text(`Fecha: ${format(localDate, "d 'de' MMMM, yyyy", { locale: es })}`, rightColX, currentY);
  doc.text(`Total del Evento: ${formatCurrency(event.total_amount)}`, rightColX, currentY + 5);

  currentY += 20;

  // Payments Table
  if (payments.length > 0) {
    autoTable(doc, {
      startY: currentY,
      margin: { left: 20, right: 20 },
      head: [['Fecha', 'Método', 'Nota', 'Monto']],
      body: payments.map(p => {
        // Adjust timezone if needed or just display as YYYY-MM-DD
        const pDateStr = p.payment_date; 
        
        const methodMap: Record<string, string> = {
          cash: 'Efectivo',
          transfer: 'Transferencia',
          card: 'Tarjeta',
          check: 'Cheque',
          other: 'Otro'
        };

        return [
          pDateStr,
          methodMap[p.payment_method] || p.payment_method,
          p.notes || '-',
          formatCurrency(p.amount)
        ];
      }),
      headStyles: { fillColor: [245, 245, 245], textColor: brandColor },
      styles: { cellPadding: 2, fontSize: 10 },
      columnStyles: {
        3: { halign: 'right' },
      },
      theme: 'grid',
    });
    
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    currentY = (doc as any).lastAutoTable.finalY + 10;
  } else {
    doc.text('No hay pagos registrados.', 20, currentY);
    currentY += 20;
  }

  // Summary
  const totalPaid = payments.reduce((sum, p) => sum + p.amount, 0);
  const balance = event.total_amount - totalPaid;
  
  const rightMargin = doc.internal.pageSize.width - 20;
  doc.setFontSize(11);
  doc.setTextColor(TEXT_COLOR);
  
  doc.text(`Total Pagado: ${formatCurrency(totalPaid)}`, rightMargin, currentY, { align: 'right' });
  currentY += 6;
  
  doc.setFont('helvetica', 'bold');
  if (balance > 0) {
    doc.setTextColor(180, 0, 0); // Windows red-ish
    doc.text(`Saldo Pendiente: ${formatCurrency(balance)}`, rightMargin, currentY, { align: 'right' });
  } else {
    doc.setTextColor(0, 150, 0); // Green
    doc.text(`Saldo Favor / Completado: ${formatCurrency(Math.abs(balance))}`, rightMargin, currentY, { align: 'right' });
  }

  // Footer signature area
  const pageHeight = doc.internal.pageSize.height;
  const signY = pageHeight - 40;
  
  doc.setDrawColor(GRAY_COLOR);
  doc.line(70, signY, 140, signY);
  doc.setFontSize(9);
  doc.setTextColor(GRAY_COLOR);
  doc.setFont('helvetica', 'normal');
  doc.text(profile?.business_name || 'Recibido por', 105, signY + 5, { align: 'center' });

  doc.save(`Recibo_Pagos_${format(localDate, 'yyyy-MM-dd')}.pdf`);
};

