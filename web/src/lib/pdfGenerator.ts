import { jsPDF } from "jspdf";
import autoTable from 'jspdf-autotable';
import { Event, Client, User, EventProduct, EventExtra, Payment } from '@/types/entities';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { logError } from '@/lib/errorHandler';
import { renderContractTemplate } from '@/lib/contractTemplate';
import { parseInlineFormatting, renderFormattedJsPDF } from '@/lib/inlineFormatting';

type EventWithClient = Event & {
  client?: Client | null;
};
type UserProfile = User & {
  stripe_customer_id?: string | null;
  created_at?: string;
  updated_at?: string;
  contract_template?: string | null;
};
type ProductItem = EventProduct & {
  products: { name: string } | null;
};
type ExtraItem = EventExtra;

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
const addHeader = (doc: jsPDF, profile: UserProfile | null, title: string): number => {
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
      logError('Error adding logo to PDF', error);
      // Fallback: don't shift text if logo fails
    }
  }

  const brandColor = profile?.brand_color || DEFAULT_BRAND_COLOR;
  const showBusinessName = profile?.show_business_name_in_pdf ?? true;

  // Business Name
  if (showBusinessName || !profile?.logo_url) {
    doc.setFontSize(20);
    doc.setTextColor(brandColor);
    doc.text(profile?.business_name || profile?.name || 'Solennix', startX, 22);
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
  event: EventWithClient,
  profile: UserProfile | null,
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
  doc.setFont('helvetica', 'bold');
  doc.text('Cliente:', 20, currentY);
  doc.text('Teléfono:', 20, currentY + 7);
  doc.text('Email:', 20, currentY + 14);

  doc.setFont('helvetica', 'normal');
  doc.text(event.client?.name || 'N/A', 40, currentY);
  doc.text(event.client?.phone || 'N/A', 40, currentY + 7);
  doc.text(event.client?.email || 'N/A', 40, currentY + 14);

  doc.setFont('helvetica', 'bold');
  doc.text('Fecha:', pageWidth / 2, currentY);
  doc.text('Horario:', pageWidth / 2, currentY + 7);
  doc.text('Personas:', pageWidth / 2, currentY + 14);

  doc.setFont('helvetica', 'normal');
  const eventDate = new Date(event.event_date + "T12:00:00");
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

  doc.setFont('helvetica', 'normal');
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


  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.setTextColor(GRAY_COLOR);

  const pageHeight = doc.internal.pageSize.height;
  doc.text('Este presupuesto tiene una validez de 15 días.', 20, pageHeight - 10);

  doc.save(`Presupuesto_${event.client?.name || 'Cliente'}.pdf`);
};

export const generateContractPDF = (
  event: EventWithClient,
  profile: UserProfile | null,
  contractTemplate?: string,
  products?: ProductItem[],
) => {
  const doc = new jsPDF();
  let currentY = addHeader(doc, profile, 'Contrato');

  doc.setFontSize(10);
  doc.setTextColor(TEXT_COLOR);

  const providerName = profile?.business_name || profile?.name || 'EL PROVEEDOR';
  const clientName = event.client?.name || 'EL CLIENTE';

  const text = renderContractTemplate({
    event,
    profile,
    template: contractTemplate ?? profile?.contract_template,
    strict: false,
    products,
  });

  const pageHeight = doc.internal.pageSize.height;
  const maxWidth = 170;
  const fontSize = 10;

  currentY += 10;

  // Render contract text paragraph-by-paragraph with inline formatting support
  const paragraphs = text.split(/\n\n+/);
  for (const paragraph of paragraphs) {
    const trimmed = paragraph.trim();
    if (!trimmed) continue;

    if (currentY > pageHeight - 60) {
      doc.addPage();
      currentY = 20;
    }

    // Check if the paragraph has any inline formatting
    const segments = parseInlineFormatting(trimmed);
    const hasFormatting = segments.some(s => s.bold || s.italic || s.underline);

    if (hasFormatting) {
      currentY = renderFormattedJsPDF(doc, trimmed, 20, currentY, maxWidth, fontSize);
    } else {
      const splitText = doc.splitTextToSize(trimmed, maxWidth);
      doc.text(splitText, 20, currentY);
      currentY += splitText.length * (fontSize * 0.5);
    }

    currentY += 2; // paragraph spacing
  }

  // Firmas
  const signY = Math.max(currentY + 20, pageHeight - 40);
  if (signY > pageHeight - 15) {
    doc.addPage();
    const newSignY = 40;
    doc.line(20, newSignY, 80, newSignY);
    doc.text('EL PROVEEDOR', 50, newSignY + 5, { align: 'center' });
    doc.text(providerName, 50, newSignY + 10, { align: 'center', maxWidth: 60 });
    doc.line(130, newSignY, 190, newSignY);
    doc.text('EL CLIENTE', 160, newSignY + 5, { align: 'center' });
    doc.text(clientName, 160, newSignY + 10, { align: 'center', maxWidth: 60 });
  } else {
    doc.line(20, signY, 80, signY);
    doc.text('EL PROVEEDOR', 50, signY + 5, { align: 'center' });
    doc.text(providerName, 50, signY + 10, { align: 'center', maxWidth: 60 });
    doc.line(130, signY, 190, signY);
    doc.text('EL CLIENTE', 160, signY + 5, { align: 'center' });
    doc.text(clientName, 160, signY + 10, { align: 'center', maxWidth: 60 });
  }

  doc.save(`Contrato_${event.client?.name || 'Cliente'}.pdf`);
};

export const generateShoppingListPDF = (
  event: Event,
  profile: UserProfile | null,
  ingredients: { name: string; quantity: number; unit: string }[]
) => {
  const doc = new jsPDF();
  let currentY = addHeader(doc, profile, 'Lista de Insumos');

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
      head: [['Insumo', 'Cantidad', 'Unidad']],
      body: ingredients.map(i => [i.name, i.quantity.toFixed(2), i.unit]),
      headStyles: { fillColor: [245, 245, 245], textColor: brandColor },
      styles: { fontSize: 10 },
      theme: 'grid',
    });
  } else {
    doc.text('No hay insumos calculados.', 20, currentY);
  }

  doc.save(`Insumos_${event.service_type}_${format(localDate, 'yyyy-MM-dd')}.pdf`);
};

export const generatePaymentReportPDF = (
  event: EventWithClient,
  profile: UserProfile | null,
  payments: Payment[]
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

export const generateInvoicePDF = (
  event: EventWithClient,
  profile: UserProfile | null,
  products: ProductItem[],
  extras: ExtraItem[]
) => {
  const doc = new jsPDF();
  let currentY = addHeader(doc, profile, 'Factura');

  const brandColor = profile?.brand_color || DEFAULT_BRAND_COLOR;
  const pageWidth = doc.internal.pageSize.width;

  // Invoice Number and Date
  doc.setFontSize(10);
  doc.setTextColor(TEXT_COLOR);

  const invoiceNumber = `INV-${event.id?.slice(0, 8).toUpperCase() || Date.now()}`;
  const invoiceDate = format(new Date(), "d 'de' MMMM, yyyy", { locale: es });

  doc.setFont('helvetica', 'bold');
  doc.text('No. Factura:', pageWidth - 80, currentY);
  doc.text('Fecha Emisión:', pageWidth - 80, currentY + 7);

  doc.setFont('helvetica', 'normal');
  doc.text(invoiceNumber, pageWidth - 20, currentY, { align: 'right' });
  doc.text(invoiceDate, pageWidth - 20, currentY + 7, { align: 'right' });

  currentY += 20;

  // Provider Info (Emisor)
  doc.setFontSize(12);
  doc.setTextColor(brandColor);
  doc.setFont('helvetica', 'bold');
  doc.text('DATOS DEL EMISOR', 20, currentY);

  currentY += 7;
  doc.setFontSize(10);
  doc.setTextColor(TEXT_COLOR);
  doc.setFont('helvetica', 'normal');

  doc.text(`Razón Social: ${profile?.business_name || profile?.name || 'N/A'}`, 20, currentY);
  currentY += 6;

  if (profile?.email) {
    doc.text(`Email: ${profile.email}`, 20, currentY);
    currentY += 6;
  }

  // RFC placeholder (could be added to profile in the future)
  doc.text('RFC: [Pendiente de configurar en ajustes]', 20, currentY);
  currentY += 6;

  doc.text('Régimen Fiscal: [Pendiente de configurar en ajustes]', 20, currentY);
  currentY += 10;

  // Client Info (Receptor)
  doc.setFontSize(12);
  doc.setTextColor(brandColor);
  doc.setFont('helvetica', 'bold');
  doc.text('DATOS DEL RECEPTOR', 20, currentY);

  currentY += 7;
  doc.setFontSize(10);
  doc.setTextColor(TEXT_COLOR);
  doc.setFont('helvetica', 'normal');

  doc.text(`Cliente: ${event.client?.name || 'N/A'}`, 20, currentY);
  currentY += 6;

  if (event.client?.phone) {
    doc.text(`Teléfono: ${event.client.phone}`, 20, currentY);
    currentY += 6;
  }

  if (event.client?.email) {
    doc.text(`Email: ${event.client.email}`, 20, currentY);
    currentY += 6;
  }

  if (event.client?.address) {
    doc.text(`Dirección: ${event.client.address}`, 20, currentY);
    currentY += 6;
  }

  currentY += 10;

  // Event Details
  doc.setFontSize(12);
  doc.setTextColor(brandColor);
  doc.setFont('helvetica', 'bold');
  doc.text('DETALLES DEL EVENTO', 20, currentY);

  currentY += 7;
  doc.setFontSize(10);
  doc.setTextColor(TEXT_COLOR);
  doc.setFont('helvetica', 'normal');

  const eventDate = new Date(event.event_date + "T12:00:00");
  doc.text(`Fecha del Evento: ${format(eventDate, "d 'de' MMMM, yyyy", { locale: es })}`, 20, currentY);
  currentY += 6;
  doc.text(`Servicio: ${event.service_type}`, 20, currentY);
  currentY += 6;
  doc.text(`Personas: ${event.num_people}`, 20, currentY);
  currentY += 6;

  if (event.location) {
    doc.text(`Ubicación: ${event.location}`, 20, currentY);
    currentY += 6;
  }

  currentY += 10;

  // Products/Services Table
  doc.setFontSize(14);
  doc.setTextColor(brandColor);
  doc.setFont('helvetica', 'bold');
  doc.text('CONCEPTOS', 20, currentY);
  currentY += 7;

  const productRows = products.map((p) => [
    p.products?.name || 'Producto',
    p.quantity.toString(),
    formatCurrency(p.unit_price),
    p.discount ? formatCurrency(p.discount) : '$0.00',
    formatCurrency((p.unit_price - (p.discount || 0)) * p.quantity)
  ]);

  const extraRows = extras.map((e) => [
    e.description,
    "1",
    formatCurrency(e.price),
    '$0.00',
    formatCurrency(e.price)
  ]);

  const body = [...productRows, ...extraRows];

  if (body.length > 0) {
    autoTable(doc, {
      startY: currentY,
      margin: { left: 20, right: 20 },
      head: [['Descripción', 'Cant.', 'Precio Unit.', 'Desc.', 'Subtotal']],
      body: body,
      headStyles: { fillColor: [245, 245, 245], textColor: brandColor },
      styles: { cellPadding: 2, fontSize: 9 },
      columnStyles: {
        0: { halign: 'left', cellWidth: 70 },
        1: { halign: 'center', cellWidth: 20 },
        2: { halign: 'right', cellWidth: 30 },
        3: { halign: 'right', cellWidth: 25 },
        4: { halign: 'right', cellWidth: 30 },
      },
      theme: 'grid',
    });

    currentY = (doc as any).lastAutoTable.finalY + 10;
  } else {
    currentY += 10;
    doc.text('No hay conceptos registrados.', 20, currentY);
    currentY += 10;
  }

  // Totals Summary
  const summaryX = pageWidth - 20 - 70;

  doc.setDrawColor(GRAY_COLOR);
  doc.setLineWidth(0.1);
  doc.line(summaryX, currentY - 5, pageWidth - 20, currentY - 5);

  doc.setFontSize(10);
  doc.setTextColor(TEXT_COLOR);
  doc.setFont('helvetica', 'normal');

  // Subtotal before tax
  const subtotalBeforeTax = event.total_amount - (event.tax_amount || 0);
  doc.text('Subtotal:', summaryX, currentY);
  doc.text(formatCurrency(subtotalBeforeTax), pageWidth - 20, currentY, { align: 'right' });

  currentY += 7;

  if (event.discount && event.discount > 0) {
    doc.setTextColor(brandColor);
    doc.text('Descuento:', summaryX, currentY);
    doc.text(`-${formatCurrency(event.discount)}`, pageWidth - 20, currentY, { align: 'right' });
    currentY += 7;
    doc.setTextColor(TEXT_COLOR);
  }

  // Tax (IVA)
  if (event.requires_invoice || event.tax_amount) {
    doc.text(`IVA (${event.tax_rate || 16}%):`, summaryX, currentY);
    doc.text(formatCurrency(event.tax_amount || 0), pageWidth - 20, currentY, { align: 'right' });
    currentY += 7;
  }

  // Total
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.setTextColor(brandColor);
  currentY += 2;
  doc.text('TOTAL:', summaryX, currentY);
  doc.text(formatCurrency(event.total_amount), pageWidth - 20, currentY, { align: 'right' });

  currentY += 10;

  // Payment Method
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(TEXT_COLOR);
  doc.text('Forma de Pago: Pendiente de liquidar', summaryX, currentY);

  // Footer
  const pageHeight = doc.internal.pageSize.height;
  doc.setFontSize(8);
  doc.setTextColor(GRAY_COLOR);
  doc.setFont('helvetica', 'italic');
  doc.text('Este documento es una factura simplificada. Para factura fiscal completa, solicitar con RFC y datos fiscales.', pageWidth / 2, pageHeight - 15, { align: 'center' });
  doc.text(`Generado el ${invoiceDate}`, pageWidth / 2, pageHeight - 10, { align: 'center' });

  doc.save(`Factura_${invoiceNumber}_${event.client?.name || 'Cliente'}.pdf`);
};

// ===== CHECKLIST DE CARGA =====
export const generateChecklistPDF = (
  event: EventWithClient,
  profile: UserProfile | null,
  products: ProductItem[],
  equipment: { equipment_name?: string; quantity: number; notes?: string | null }[],
  checklistIngredients: { name: string; quantity: number; unit: string }[],
  extras: ExtraItem[]
) => {
  const doc = new jsPDF();
  let currentY = addHeader(doc, profile, 'Checklist de Carga');

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
  if (event.start_time) doc.text(`Hora: ${event.start_time.slice(0, 5)}${event.end_time ? ' - ' + event.end_time.slice(0, 5) : ''}`, 20, currentY + 10);
  if (event.client?.name) doc.text(`Cliente: ${event.client.name}`, 20, currentY + 15);
  if (event.location) doc.text(`Lugar: ${event.location}${event.city ? ', ' + event.city : ''}`, 20, currentY + 20);

  currentY += 30;

  const checkboxCol = '     '; // Empty space for checkbox square

  // Section: PRODUCTOS
  if (products.length > 0) {
    doc.setFontSize(12);
    doc.setTextColor(brandColor);
    doc.setFont('helvetica', 'bold');
    doc.text('PRODUCTOS', 20, currentY);
    currentY += 3;

    autoTable(doc, {
      startY: currentY,
      margin: { left: 20, right: 20 },
      head: [['\u2610', 'Producto', 'Cantidad']],
      body: products.map(p => [checkboxCol, p.products?.name || 'Producto', String(p.quantity)]),
      headStyles: { fillColor: [245, 245, 245], textColor: brandColor },
      styles: { fontSize: 10 },
      columnStyles: { 0: { cellWidth: 12, halign: 'center' } },
      theme: 'grid',
    });
    currentY = (doc as any).lastAutoTable.finalY + 8;
  }

  // Section: EQUIPO
  if (equipment.length > 0) {
    doc.setFontSize(12);
    doc.setTextColor(brandColor);
    doc.setFont('helvetica', 'bold');
    doc.text('EQUIPO', 20, currentY);
    currentY += 3;

    autoTable(doc, {
      startY: currentY,
      margin: { left: 20, right: 20 },
      head: [['\u2610', 'Equipo', 'Cant.', 'Notas']],
      body: equipment.map(eq => [checkboxCol, eq.equipment_name || 'Equipo', String(eq.quantity), eq.notes || '']),
      headStyles: { fillColor: [245, 245, 245], textColor: brandColor },
      styles: { fontSize: 10 },
      columnStyles: { 0: { cellWidth: 12, halign: 'center' } },
      theme: 'grid',
    });
    currentY = (doc as any).lastAutoTable.finalY + 8;
  }

  // Section: INSUMOS PARA LLEVAR
  if (checklistIngredients.length > 0) {
    doc.setFontSize(12);
    doc.setTextColor(brandColor);
    doc.setFont('helvetica', 'bold');
    doc.text('INSUMOS PARA LLEVAR', 20, currentY);
    currentY += 3;

    autoTable(doc, {
      startY: currentY,
      margin: { left: 20, right: 20 },
      head: [['\u2610', 'Insumo', 'Cantidad', 'Unidad']],
      body: checklistIngredients.map(i => [checkboxCol, i.name, i.quantity.toFixed(2), i.unit]),
      headStyles: { fillColor: [245, 245, 245], textColor: brandColor },
      styles: { fontSize: 10 },
      columnStyles: { 0: { cellWidth: 12, halign: 'center' } },
      theme: 'grid',
    });
    currentY = (doc as any).lastAutoTable.finalY + 8;
  }

  // Section: EXTRAS
  const physicalExtras = extras.filter(e => e.description);
  if (physicalExtras.length > 0) {
    doc.setFontSize(12);
    doc.setTextColor(brandColor);
    doc.setFont('helvetica', 'bold');
    doc.text('EXTRAS', 20, currentY);
    currentY += 3;

    autoTable(doc, {
      startY: currentY,
      margin: { left: 20, right: 20 },
      head: [['\u2610', 'Descripción']],
      body: physicalExtras.map(e => [checkboxCol, e.description]),
      headStyles: { fillColor: [245, 245, 245], textColor: brandColor },
      styles: { fontSize: 10 },
      columnStyles: { 0: { cellWidth: 12, halign: 'center' } },
      theme: 'grid',
    });
    currentY = (doc as any).lastAutoTable.finalY + 8;
  }

  // Notes area
  if (currentY < doc.internal.pageSize.height - 40) {
    doc.setFontSize(10);
    doc.setTextColor(GRAY_COLOR);
    doc.setFont('helvetica', 'normal');
    doc.text('Notas:', 20, currentY + 5);
    doc.line(20, currentY + 12, doc.internal.pageSize.width - 20, currentY + 12);
    doc.line(20, currentY + 22, doc.internal.pageSize.width - 20, currentY + 22);
  }

  doc.save(`Checklist_${event.service_type}_${format(localDate, 'yyyy-MM-dd')}.pdf`);
};

