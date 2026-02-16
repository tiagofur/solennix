import { jsPDF } from "jspdf";
import autoTable from 'jspdf-autotable';
import { Database } from '../types/supabase';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

type Event = Database['public']['Tables']['events']['Row'] & {
  clients?: Database['public']['Tables']['clients']['Row'] | null;
};
type Profile = Database['public']['Tables']['users']['Row'];
type ProductItem = Database['public']['Tables']['event_products']['Row'] & {
  products: { name: string } | null;
};
type ExtraItem = Database['public']['Tables']['event_extras']['Row'];

const BRAND_COLOR = '#FF6B35'; // Naranja de la marca
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
  
  // Business Name
  doc.setFontSize(20);
  doc.setTextColor(BRAND_COLOR);
  doc.text(profile?.business_name || profile?.name || 'EventosApp', 20, 20);
  
  // Title
  doc.setFontSize(24);
  doc.setTextColor(TEXT_COLOR);
  doc.text(title.toUpperCase(), pageWidth - 20, 20, { align: 'right' });
  
  // Line separator
  doc.setDrawColor(BRAND_COLOR);
  doc.setLineWidth(1);
  doc.line(20, 25, pageWidth - 20, 25);
  
  return 35; // Returns Y position for next content
};

export const generateBudgetPDF = (
  event: Event,
  profile: Profile | null,
  products: ProductItem[],
  extras: ExtraItem[]
) => {
  const doc = new jsPDF();
  let currentY = addHeader(doc, profile, 'Presupuesto');
  
  // Info del Cliente y Evento
  doc.setFontSize(10);
  doc.setTextColor(GRAY_COLOR);
  
  // Columna Izquierda (Cliente)
  doc.setFont('helvetica', 'bold');
  doc.text('INFORMACIÓN DEL CLIENTE', 20, currentY);
  doc.setFont('helvetica', 'normal');
  doc.text(event.clients?.name || 'Cliente no registrado', 20, currentY + 5);
  if (event.clients?.phone) doc.text(`Tel: ${event.clients.phone}`, 20, currentY + 10);
  if (event.clients?.email) doc.text(`Email: ${event.clients.email}`, 20, currentY + 15);
  
  // Columna Derecha (Evento)
  const rightColX = doc.internal.pageSize.width / 2 + 10;
  doc.setFont('helvetica', 'bold');
  doc.text('DETALLES DEL EVENTO', rightColX, currentY);
  doc.setFont('helvetica', 'normal');
  const eventDate = new Date(event.event_date);
  // Ajuste de zona horaria simple para visualización (evitar desfase por UTC)
  const userTimezoneOffset = eventDate.getTimezoneOffset() * 60000;
  const localDate = new Date(eventDate.getTime() + userTimezoneOffset);

  doc.text(`Fecha: ${format(localDate, "d 'de' MMMM, yyyy", { locale: es })}`, rightColX, currentY + 5);
  doc.text(`Tipo: ${event.service_type}`, rightColX, currentY + 10);
  doc.text(`Personas: ${event.num_people}`, rightColX, currentY + 15);
  
  currentY += 25;

  // Tabla de Productos
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
      head: [['Descripción', 'Cant.', 'Precio Unit.', 'Total']],
      body: body,
      headStyles: { fillColor: BRAND_COLOR },
      styles: { fontSize: 9 },
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
  const pageWidth = doc.internal.pageSize.width;
  const rightMargin = pageWidth - 20;
  
  doc.setFontSize(10);
  doc.setTextColor(TEXT_COLOR);
  
  const totalRevenue = event.total_amount || 0;
  const taxAmount = event.tax_amount || 0;
  // Si requiere factura, el total incluye IVA, así que el subtotal es menos el IVA.
  // Si no requiere, el total es neto.
  const subtotal = event.requires_invoice ? totalRevenue - taxAmount : totalRevenue;

  doc.text(`Subtotal: ${formatCurrency(subtotal)}`, rightMargin, currentY, { align: 'right' });
  
  if (event.requires_invoice) {
    currentY += 5;
    doc.text(`IVA (${event.tax_rate || 16}%): ${formatCurrency(taxAmount)}`, rightMargin, currentY, { align: 'right' });
  }
  
  currentY += 7;
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text(`TOTAL: ${formatCurrency(totalRevenue)}`, rightMargin, currentY, { align: 'right' });
  
  // Pie de página
  const pageHeight = doc.internal.pageSize.height;
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(GRAY_COLOR);
  doc.text('Este presupuesto tiene una validez de 15 días.', 20, pageHeight - 10);
  
  doc.save(`Presupuesto_${event.clients?.name || 'Cliente'}.pdf`);
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
  const clientName = event.clients?.name || 'EL CLIENTE';
  
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
  
  doc.save(`Contrato_${event.clients?.name || 'Cliente'}.pdf`);
};
