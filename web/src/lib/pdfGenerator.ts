import { jsPDF } from "jspdf";
import autoTable from 'jspdf-autotable';
import { Event, Client, User, EventProduct, EventExtra, Payment } from '@/types/entities';
import { format } from 'date-fns';
import { es, enUS } from 'date-fns/locale';
import { logError } from '@/lib/errorHandler';
import { renderContractTemplate } from '@/lib/contractTemplate';
import { parseInlineFormatting, renderFormattedJsPDF } from '@/lib/inlineFormatting';
import { getAssetUrl } from '@/lib/api';
import { parseEventDate } from '@/lib/dateUtils';

type EventWithClient = Event & {
  client?: Client | null;
};
type UserProfile = User & {
  stripe_customer_id?: string | null;
  created_at?: string;
  updated_at?: string;
  contract_template?: string | null;
};
// Backend returns a flat `product_name?: string` via SQL join on
// GET /api/events/{id}/products (see backend/internal/models/models.go:114).
// EventProduct from the OpenAPI contract already declares it, so no extension
// is needed — we just alias for clarity.
type ProductItem = EventProduct;
type ExtraItem = EventExtra;

const DEFAULT_BRAND_COLOR = '#C4A265'; // Dorado de la marca
const TEXT_COLOR = '#333333';
const GRAY_COLOR = '#666666';

// Helper para formatear moneda
const formatCurrency = (amount: number, lang: string = 'es') => {
  const locale = lang === 'en' ? 'en-US' : 'es-MX';
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: 'MXN',
  }).format(amount);
};

const pdfT = (key: string, lang: string = 'es'): string => {
  const translations: Record<string, Record<string, string>> = {
    es: {
      budget: 'Presupuesto',
      invoice: 'Factura',
      contract: 'Contrato',
      shopping_list: 'Lista de Insumos',
      payment_report: 'Reporte de Pagos',
      checklist: 'Checklist de Carga',
      client: 'Cliente:',
      phone: 'Teléfono:',
      email: 'Email:',
      date: 'Fecha:',
      schedule: 'Horario:',
      people: 'Personas:',
      not_defined: 'Por definir',
      products_services: 'Productos y Servicios',
      product: 'Producto',
      description: 'Descripción',
      qty: 'Cant.',
      unit_price: 'Precio Unit.',
      total: 'Total',
      no_products: 'No hay productos o servicios registrados.',
      no_concepts: 'No hay conceptos registrados.',
      subtotal: 'Subtotal:',
      discount: 'Descuento:',
      discount_short: 'Desc.',
      tax: 'IVA',
      validity: 'Este presupuesto tiene una validez de 15 días.',
      provider_role: 'EL PROVEEDOR',
      client_role: 'EL CLIENTE',
      signature: 'Firma',
      supply: 'Insumo',
      required: 'Cantidad',
      unit: 'Unidad',
      no_supplies: 'No hay insumos calculados.',
      event: 'Evento:',
      method: 'Método:',
      note: 'Nota:',
      monto: 'Monto:',
      no_payments: 'No hay pagos registrados.',
      total_paid: 'Total Pagado:',
      pending_balance: 'Saldo Pendiente:',
      excess_balance: 'Saldo Favor / Completado:',
      received_by: 'Recibido por',
      invoice_no: 'No. Factura:',
      emission_date: 'Fecha Emisión:',
      issuer_data: 'DATOS DEL EMISOR',
      receiver_data: 'DATOS DEL RECEPTOR',
      business_name: 'Razón Social:',
      address: 'Dirección:',
      event_details: 'DETALLES DEL EVENTO',
      event_date: 'Fecha del Evento:',
      service: 'Servicio:',
      location: 'Ubicación:',
      concepts: 'CONCEPTOS',
      payment_method: 'Forma de Pago:',
      payment_pending: 'Pendiente de liquidar',
      simplified_invoice_note: 'Este documento es una factura simplificada. Para factura fiscal completa, solicitar con RFC y datos fiscales.',
      generated_at: 'Generado el',
      loading_checklist: 'Checklist de Carga',
      products_section: 'PRODUCTOS',
      equipment_section: 'EQUIPO',
      supplies_to_carry: 'INSUMOS PARA LLEVAR',
      extras_section: 'EXTRAS',
      notes: 'Notas',
      location_header: 'Lugar:',
      time_header: 'Hora:'
    },
    en: {
      budget: 'Quote',
      invoice: 'Invoice',
      contract: 'Contract',
      shopping_list: 'Shopping List',
      payment_report: 'Payment Report',
      checklist: 'Loading Checklist',
      client: 'Client:',
      phone: 'Phone:',
      email: 'Email:',
      date: 'Date:',
      schedule: 'Schedule:',
      people: 'People:',
      not_defined: 'To be defined',
      products_services: 'Products & Services',
      product: 'Product',
      description: 'Description',
      qty: 'Qty',
      unit_price: 'Unit Price',
      total: 'Total',
      no_products: 'No products or services registered.',
      no_concepts: 'No concepts registered.',
      subtotal: 'Subtotal:',
      discount: 'Discount:',
      discount_short: 'Disc.',
      tax: 'Tax',
      validity: 'This quote is valid for 15 days.',
      provider_role: 'THE PROVIDER',
      client_role: 'THE CLIENT',
      signature: 'Signature',
      supply: 'Supply',
      required: 'Required',
      unit: 'Unit',
      no_supplies: 'No supplies calculated.',
      event: 'Event:',
      method: 'Method:',
      note: 'Note:',
      monto: 'Amount:',
      no_payments: 'No payments registered.',
      total_paid: 'Total Paid:',
      pending_balance: 'Pending Balance:',
      excess_balance: 'Excess / Completed Balance:',
      received_by: 'Received by',
      invoice_no: 'Invoice No:',
      emission_date: 'Issue Date:',
      issuer_data: 'ISSUER DATA',
      receiver_data: 'RECEIVER DATA',
      business_name: 'Business Name:',
      address: 'Address:',
      event_details: 'EVENT DETAILS',
      event_date: 'Event Date:',
      service: 'Service:',
      location: 'Location:',
      concepts: 'CONCEPTS',
      payment_method: 'Payment Method:',
      payment_pending: 'Pending payment',
      simplified_invoice_note: 'This document is a simplified invoice. For a full tax invoice, request with tax ID details.',
      generated_at: 'Generated on',
      loading_checklist: 'Loading Checklist',
      products_section: 'PRODUCTS',
      equipment_section: 'EQUIPMENT',
      supplies_to_carry: 'SUPPLIES TO CARRY',
      extras_section: 'EXTRAS',
      notes: 'Notes',
      location_header: 'Location:',
      time_header: 'Time:'
    }
  };
  return translations[lang]?.[key] || translations['es'][key] || key;
};

const pdfLabel = (key: string, lang: string = 'es'): string => pdfT(key, lang).replace(/:$/, '');

const discountLabel = (discount: number, discountType: string | undefined, lang: string): string => {
  const label = pdfLabel('discount', lang);
  return discountType === 'percent' ? `${label} (${discount}%):` : `${label}:`;
};

// Helper para agregar encabezado común
const addHeader = (doc: jsPDF, profile: UserProfile | null, title: string): number => {
  const pageWidth = doc.internal.pageSize.width;
  let startX = 20;

  // Render logo if present
  const logoUrl = getAssetUrl(profile?.logo_url);
  if (logoUrl) {
    try {
      // jsPDF auto detects format, we reserve a max 30x30 bounding box
      // To maintain aspect ratio perfectly, we need the original dimensions.
      // Since jsPDF addImage in FAST mode can stretch if we force width/height, 
      // we use an HTML Image element to get real dimensions first.

      const imgProps = doc.getImageProperties(logoUrl);
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

      doc.addImage(logoUrl, imgProps.fileType, 20, yPos, width, height, undefined, 'FAST');
      startX = 20 + width + 5; // Shift text to right of logo dynamically
    } catch (error) {
      logError('Error adding logo to PDF', error);
      // Fallback: don't shift text if logo fails
    }
  }

  const brandColor = profile?.brand_color || DEFAULT_BRAND_COLOR;
  const showBusinessName = profile?.show_business_name_in_pdf ?? true;

  // Business Name
  if (showBusinessName || !logoUrl) {
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
  extras: ExtraItem[],
  lang: string = 'es'
) => {
  const doc = new jsPDF();
  let currentY = addHeader(doc, profile, pdfT('budget', lang));

  const brandColor = profile?.brand_color || DEFAULT_BRAND_COLOR;

  // Header Details
  const pageWidth = doc.internal.pageSize.width;
  doc.setFontSize(10);
  doc.setTextColor(TEXT_COLOR);

  // Details table simulation
  doc.setFont('helvetica', 'bold');
  doc.text(pdfT('client', lang), 20, currentY);
  doc.text(pdfT('phone', lang), 20, currentY + 7);
  doc.text(pdfT('email', lang), 20, currentY + 14);

  doc.setFont('helvetica', 'normal');
  doc.text(event.client?.name || 'N/A', 40, currentY);
  doc.text(event.client?.phone || 'N/A', 40, currentY + 7);
  doc.text(event.client?.email || 'N/A', 40, currentY + 14);

  doc.setFont('helvetica', 'bold');
  doc.text(pdfT('date', lang), pageWidth / 2, currentY);
  doc.text(pdfT('schedule', lang), pageWidth / 2, currentY + 7);
  doc.text(pdfT('people', lang), pageWidth / 2, currentY + 14);

  doc.setFont('helvetica', 'normal');
  const eventDate = new Date(event.event_date + "T12:00:00");
  const dateLocale = lang === 'en' ? enUS : es;
  doc.text(format(eventDate, lang === 'en' ? "MMMM do, yyyy" : "d 'de' MMMM, yyyy", { locale: dateLocale }), pageWidth / 2 + 25, currentY);
  doc.text(`${event.start_time || pdfT('not_defined', lang)} - ${event.end_time || pdfT('not_defined', lang)}`, pageWidth / 2 + 25, currentY + 7);
  doc.text(event.num_people.toString(), pageWidth / 2 + 25, currentY + 14);

  currentY += 25;

  // Products Table
  doc.setFontSize(14);
  doc.setTextColor(brandColor);
  doc.text(pdfT('products_services', lang), 20, currentY);
  currentY += 7;

  const productRows = products.map((p) => [
    p.product_name || pdfT('product', lang),
    p.quantity.toString(),
    formatCurrency(p.unit_price, lang),
    formatCurrency((p.unit_price - (p.discount || 0)) * p.quantity, lang)
  ]);

  // Tabla de Extras
  const extraRows = extras.map((e) => [
    e.description,
    "1",
    formatCurrency(e.price, lang),
    formatCurrency(e.price, lang)
  ]);

  const body = [...productRows, ...extraRows];

  if (body.length > 0) {
    autoTable(doc, {
      startY: currentY,
      margin: { left: 20, right: 20 },
      head: [[pdfT('description', lang), pdfT('qty', lang), pdfT('unit_price', lang), pdfT('total', lang)]],
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
    doc.text(pdfT('no_products', lang), 20, currentY);
    currentY += 10;
  }

  // Totales
  const summaryX = pageWidth - 20 - 60; // Right aligned, width of 60

  doc.setDrawColor(GRAY_COLOR);
  doc.setLineWidth(0.1);
  doc.line(summaryX, currentY - 5, pageWidth - 20, currentY - 5);

  doc.setFontSize(10);
  doc.setTextColor(TEXT_COLOR);

  // Compute discount honoring discount_type — antes se usaba event.discount
  // directo, pero cuando discount_type === 'percent' ese valor es el %
  // (ej: 10), no el monto. El PDF mostraba "-$10.00" para un 10% — cliente
  // firmaba/recibia un numero que no coincidia con la pantalla de Finanzas.
  const rawDiscount = event.discount || 0;
  const taxAmount = event.tax_amount || 0;
  const subtotalForDiscount = event.total_amount - taxAmount
    + (event.discount_type === 'fixed' ? rawDiscount : 0);
  const discountAmount = event.discount_type === 'percent'
    ? subtotalForDiscount * rawDiscount / 100
    : rawDiscount;
  const preDiscountSubtotal = (event.total_amount - taxAmount) + discountAmount;

  doc.setFont('helvetica', 'normal');
  doc.text(pdfT('subtotal', lang), summaryX, currentY);
  doc.text(formatCurrency(preDiscountSubtotal, lang), pageWidth - 20, currentY, { align: 'right' });

  if (rawDiscount > 0) {
    currentY += 7;
    doc.setTextColor(brandColor);
    doc.text(discountLabel(rawDiscount, event.discount_type, lang), summaryX, currentY);
    doc.text(`-${formatCurrency(discountAmount, lang)}`, pageWidth - 20, currentY, { align: 'right' });
    doc.setTextColor(TEXT_COLOR);
  }

  if (event.requires_invoice) {
    currentY += 7;
    doc.text(`${pdfT('tax', lang)} (${event.tax_rate || 16}%):`, summaryX, currentY);
    doc.text(formatCurrency(taxAmount, lang), pageWidth - 20, currentY, { align: 'right' });
  }


  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.setTextColor(GRAY_COLOR);

  const pageHeight = doc.internal.pageSize.height;
  doc.text(pdfT('validity', lang), 20, pageHeight - 10);

  doc.save(`${pdfT('budget', lang)}_${event.client?.name || 'Cliente'}.pdf`);
};

export const generateContractPDF = (
  event: EventWithClient,
  profile: UserProfile | null,
  contractTemplate?: string,
  products?: ProductItem[],
  payments?: Payment[],
  lang: string = 'es'
) => {
  const doc = new jsPDF();
  let currentY = addHeader(doc, profile, pdfT('contract', lang));

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
    payments,
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
    doc.text(pdfT('provider_role', lang), 50, signY + 5, { align: 'center' });
    doc.text(providerName, 50, signY + 10, { align: 'center', maxWidth: 60 });
    doc.line(130, signY, 190, signY);
    doc.text(pdfT('client_role', lang), 160, signY + 5, { align: 'center' });
    doc.text(clientName, 160, signY + 10, { align: 'center', maxWidth: 60 });
  }

  doc.save(`${pdfT('contract', lang)}_${event.client?.name || 'Cliente'}.pdf`);
};

export const generateShoppingListPDF = (
  event: Event,
  profile: UserProfile | null,
  ingredients: { name: string; quantity: number; unit: string }[],
  lang: string = 'es'
) => {
  const doc = new jsPDF();
  let currentY = addHeader(doc, profile, pdfT('shopping_list', lang));

  const brandColor = profile?.brand_color || DEFAULT_BRAND_COLOR;

  // Event Info
  doc.setFontSize(10);
  doc.setTextColor(GRAY_COLOR);
  doc.setFont('helvetica', 'normal');
  const localDate = parseEventDate(event.event_date);
  const dateLocale = lang === 'en' ? enUS : es;
  doc.text(`${pdfT('event', lang)} ${event.service_type}`, 20, currentY);
  doc.text(`${pdfT('date', lang)} ${format(localDate, lang === 'en' ? "MMMM do, yyyy" : "d 'de' MMMM, yyyy", { locale: dateLocale })}`, 20, currentY + 5);
  doc.text(`${pdfT('people', lang)} ${event.num_people}`, 20, currentY + 10);

  currentY += 20;

  // Table
  if (ingredients.length > 0) {
    autoTable(doc, {
      startY: currentY,
      margin: { left: 20, right: 20 },
      head: [[pdfT('supply', lang), pdfT('required', lang), pdfT('unit', lang)]],
      body: ingredients.map(i => [i.name, i.quantity.toFixed(2), i.unit]),
      headStyles: { fillColor: [245, 245, 245], textColor: brandColor },
      styles: { fontSize: 10 },
      theme: 'grid',
    });
  } else {
    doc.text(pdfT('no_supplies', lang), 20, currentY);
  }

  doc.save(`${pdfT('shopping_list', lang)}_${event.service_type}_${format(localDate, 'yyyy-MM-dd')}.pdf`);
};

export const generatePaymentReportPDF = (
  event: EventWithClient,
  profile: UserProfile | null,
  payments: Payment[],
  lang: string = 'es'
) => {
  const doc = new jsPDF();
  let currentY = addHeader(doc, profile, pdfT('payment_report', lang));

  const brandColor = profile?.brand_color || DEFAULT_BRAND_COLOR;

  // Event & Client Info
  doc.setFontSize(10);
  doc.setTextColor(GRAY_COLOR);

  const localDate = parseEventDate(event.event_date);

  // Left Column
  doc.text(`${pdfT('client', lang)} ${event.client?.name || 'N/A'}`, 20, currentY);
  doc.text(`${pdfT('event', lang)} ${event.service_type}`, 20, currentY + 5);

  // Right Column
  const rightColX = doc.internal.pageSize.width / 2 + 10;
  const dateLocale = lang === 'en' ? enUS : es;
  doc.text(`${pdfT('date', lang)} ${format(localDate, lang === 'en' ? "MMMM do, yyyy" : "d 'de' MMMM, yyyy", { locale: dateLocale })}`, rightColX, currentY);
  doc.text(`${pdfT('total', lang)}: ${formatCurrency(event.total_amount, lang)}`, rightColX, currentY + 5);

  currentY += 20;

  // Payments Table
  if (payments.length > 0) {
    autoTable(doc, {
      startY: currentY,
      margin: { left: 20, right: 20 },
      head: [[pdfLabel('date', lang), pdfLabel('method', lang), pdfLabel('note', lang), pdfLabel('monto', lang)]],
      body: payments.map(p => {
        // Adjust timezone if needed or just display as YYYY-MM-DD
        const pDateStr = p.payment_date;

        const methodMap: Record<string, string> = {
          cash: lang === 'en' ? 'Cash' : 'Efectivo',
          transfer: lang === 'en' ? 'Transfer' : 'Transferencia',
          card: lang === 'en' ? 'Card' : 'Tarjeta',
          check: lang === 'en' ? 'Check' : 'Cheque',
          other: lang === 'en' ? 'Other' : 'Otro'
        };

        return [
          pDateStr,
          methodMap[p.payment_method] || p.payment_method,
          p.notes || '-',
          formatCurrency(p.amount, lang)
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
    doc.text(pdfT('no_payments', lang), 20, currentY);
    currentY += 20;
  }

  // Summary
  const totalPaid = payments.reduce((sum, p) => sum + p.amount, 0);
  const balance = event.total_amount - totalPaid;

  const rightMargin = doc.internal.pageSize.width - 20;
  doc.setFontSize(11);
  doc.setTextColor(TEXT_COLOR);

  doc.text(`${pdfT('total_paid', lang)} ${formatCurrency(totalPaid, lang)}`, rightMargin, currentY, { align: 'right' });
  currentY += 6;

  doc.setFont('helvetica', 'bold');
  if (balance > 0) {
    doc.setTextColor(180, 0, 0); // Windows red-ish
    doc.text(`${pdfT('pending_balance', lang)} ${formatCurrency(balance, lang)}`, rightMargin, currentY, { align: 'right' });
  } else {
    doc.setTextColor(0, 150, 0); // Green
    doc.text(`${pdfT('excess_balance', lang)} ${formatCurrency(Math.abs(balance), lang)}`, rightMargin, currentY, { align: 'right' });
  }

  // Footer signature area
  const pageHeight = doc.internal.pageSize.height;
  const signY = pageHeight - 40;

  doc.setDrawColor(GRAY_COLOR);
  doc.line(70, signY, 140, signY);
  doc.setFontSize(9);
  doc.setTextColor(GRAY_COLOR);
  doc.setFont('helvetica', 'normal');
  doc.text(profile?.business_name || pdfT('received_by', lang), 105, signY + 5, { align: 'center' });

  doc.save(`${pdfT('payment_report', lang)}_${format(localDate, 'yyyy-MM-dd')}.pdf`);
};

// ===== FACTURA — no implementada (adjunto externo vía SAT/gobierno) =====
// generateInvoicePDF fue removida. Solennix no genera facturas fiscales desde la app.
// El campo requires_invoice en eventos se usa solo para el cobro (IVA incluido).

// ===== CHECKLIST DE CARGA =====
export const generateChecklistPDF = (
  event: EventWithClient,
  profile: UserProfile | null,
  products: ProductItem[],
  equipment: { equipment_name?: string; quantity: number; notes?: string | null }[],
  checklistIngredients: { name: string; quantity: number; unit: string }[],
  extras: ExtraItem[],
  lang: string = 'es'
) => {
  const doc = new jsPDF();
  let currentY = addHeader(doc, profile, pdfT('loading_checklist', lang));

  const brandColor = profile?.brand_color || DEFAULT_BRAND_COLOR;

  // Event Info
  doc.setFontSize(10);
  doc.setTextColor(GRAY_COLOR);
  doc.setFont('helvetica', 'normal');
  const localDate = parseEventDate(event.event_date);
  const dateLocale = lang === 'en' ? enUS : es;

  doc.text(`${pdfT('event', lang)} ${event.service_type}`, 20, currentY);
  doc.text(`${pdfT('date', lang)} ${format(localDate, lang === 'en' ? "MMMM do, yyyy" : "d 'de' MMMM, yyyy", { locale: dateLocale })}`, 20, currentY + 5);
  if (event.start_time) doc.text(`${pdfT('time_header', lang)} ${event.start_time.slice(0, 5)}${event.end_time ? ' - ' + event.end_time.slice(0, 5) : ''}`, 20, currentY + 10);
  if (event.client?.name) doc.text(`${pdfT('client', lang)} ${event.client.name}`, 20, currentY + 15);
  if (event.location) doc.text(`${pdfT('location_header', lang)} ${event.location}${event.city ? ', ' + event.city : ''}`, 20, currentY + 20);

  currentY += 30;

  const checkboxCol = '     '; // Empty space for checkbox square

  // Section: PRODUCTOS
  if (products.length > 0) {
    doc.setFontSize(12);
    doc.setTextColor(brandColor);
    doc.setFont('helvetica', 'bold');
    doc.text(pdfT('products_section', lang), 20, currentY);
    currentY += 3;

    autoTable(doc, {
      startY: currentY,
      margin: { left: 20, right: 20 },
      head: [['\u2610', pdfT('product', lang), pdfT('required', lang)]],
      body: products.map(p => [checkboxCol, p.product_name || pdfT('product', lang), String(p.quantity)]),
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
    doc.text(pdfT('equipment_section', lang), 20, currentY);
    currentY += 3;

    autoTable(doc, {
      startY: currentY,
      margin: { left: 20, right: 20 },
      head: [['\u2610', pdfT('equipment_section', lang), pdfT('qty', lang), pdfT('notes', lang)]],
      body: equipment.map(eq => [checkboxCol, eq.equipment_name || pdfT('equipment_section', lang), String(eq.quantity), eq.notes || '']),
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
    doc.text(pdfT('supplies_to_carry', lang), 20, currentY);
    currentY += 3;

    autoTable(doc, {
      startY: currentY,
      margin: { left: 20, right: 20 },
      head: [['\u2610', pdfT('supply', lang), pdfT('required', lang), pdfT('unit', lang)]],
      body: checklistIngredients.map(i => [checkboxCol, i.name, i.quantity.toFixed(2), i.unit]),
      headStyles: { fillColor: [245, 245, 245], textColor: brandColor },
      styles: { fontSize: 10 },
      columnStyles: { 0: { cellWidth: 12, halign: 'center' } },
      theme: 'grid',
    });
    currentY = (doc as any).lastAutoTable.finalY + 8;
  }

  // Section: EXTRAS
  const physicalExtras = extras.filter(e => e.description && e.include_in_checklist !== false);
  if (physicalExtras.length > 0) {
    doc.setFontSize(12);
    doc.setTextColor(brandColor);
    doc.setFont('helvetica', 'bold');
    doc.text(pdfT('extras_section', lang), 20, currentY);
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

