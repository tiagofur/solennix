import * as Print from "expo-print";
import * as Sharing from "expo-sharing";
import { format, parseISO } from "date-fns";
import { es } from "date-fns/locale";
import { Event, Client, EventProduct, EventExtra, Payment } from "../types/entities";
import { User } from "../contexts/AuthContext";
import { renderContractTemplate } from "./contractTemplate";
import { renderFormattedHTML } from "./inlineFormatting";

// ── Types ──────────────────────────────────────────────────────────

type EventWithClient = Event & { client?: Client | null };
type ProductItem = EventProduct & { products?: { name: string } | null };
type ExtraItem = EventExtra;
type Ingredient = { name: string; quantity: number; unit: string };

// ── Constants ──────────────────────────────────────────────────────

const DEFAULT_BRAND_COLOR = "#FF6B35";
const TEXT_COLOR = "#333333";
const GRAY_COLOR = "#666666";

const METHOD_MAP: Record<string, string> = {
  cash: "Efectivo",
  transfer: "Transferencia",
  card: "Tarjeta",
  check: "Cheque",
  efectivo: "Efectivo",
  transferencia: "Transferencia",
  tarjeta: "Tarjeta",
  cheque: "Cheque",
  other: "Otro",
};

// ── Helpers ────────────────────────────────────────────────────────

const formatCurrency = (amount: number): string => {
  try {
    return new Intl.NumberFormat("es-MX", {
      style: "currency",
      currency: "MXN",
    }).format(amount);
  } catch {
    return `$${amount.toFixed(2)}`;
  }
};

const formatDateES = (dateStr: string): string => {
  try {
    return format(parseISO(dateStr), "d 'de' MMMM, yyyy", { locale: es });
  } catch {
    return dateStr;
  }
};

const formatDateLongES = (date: Date): string => {
  return format(date, "d 'de' MMMM 'de' yyyy", { locale: es });
};

const esc = (str: string | null | undefined): string => {
  if (!str) return "";
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
};

const buildBaseStyles = (brandColor: string): string => `
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      color: ${TEXT_COLOR};
      font-size: 11px;
      line-height: 1.5;
      padding: 30px;
    }
    .header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 8px;
    }
    .header-left {
      display: flex;
      align-items: center;
      gap: 10px;
    }
    .header-logo { max-height: 50px; max-width: 120px; object-fit: contain; }
    .header-business { font-size: 18px; color: ${brandColor}; font-weight: 600; }
    .header-title { font-size: 22px; color: ${TEXT_COLOR}; font-weight: 700; text-transform: uppercase; }
    .header-line { border: none; border-top: 2px solid ${brandColor}; margin: 8px 0 20px; }

    .info-grid { display: flex; justify-content: space-between; margin-bottom: 18px; }
    .info-col { flex: 1; }
    .info-label { font-weight: 600; color: ${TEXT_COLOR}; }
    .info-value { color: ${GRAY_COLOR}; }
    .info-row { margin-bottom: 3px; }

    .section-title { font-size: 13px; color: ${brandColor}; font-weight: 700; margin: 16px 0 8px; }

    table { width: 100%; border-collapse: collapse; margin-bottom: 16px; }
    th {
      background: #f5f5f5;
      color: ${brandColor};
      font-weight: 600;
      text-align: left;
      padding: 6px 8px;
      border: 1px solid #ddd;
      font-size: 10px;
    }
    td { padding: 5px 8px; border: 1px solid #ddd; font-size: 10px; }
    .text-right { text-align: right; }
    .text-center { text-align: center; }

    .summary { margin-left: auto; width: 240px; margin-top: 8px; }
    .summary-row { display: flex; justify-content: space-between; padding: 3px 0; font-size: 11px; }
    .summary-row.total { font-weight: 700; font-size: 13px; border-top: 2px solid ${brandColor}; margin-top: 4px; padding-top: 6px; }
    .summary-row.discount { color: ${brandColor}; }

    .footer-note { font-size: 9px; color: ${GRAY_COLOR}; margin-top: 24px; text-align: center; }

    .signatures {
      display: flex;
      justify-content: space-around;
      margin-top: 60px;
      page-break-inside: avoid;
    }
    .signature-box { text-align: center; width: 200px; }
    .signature-line { border-top: 1px solid ${TEXT_COLOR}; margin-bottom: 6px; }
    .signature-label { font-weight: 600; font-size: 10px; }
    .signature-name { font-size: 9px; color: ${GRAY_COLOR}; }

    .clause { margin-bottom: 12px; page-break-inside: avoid; }
    .clause-title { font-weight: 700; margin-bottom: 4px; }

    .empty-msg { color: ${GRAY_COLOR}; font-style: italic; margin: 12px 0; }

    .badge-red { color: #b40000; font-weight: 700; }
    .badge-green { color: #009600; font-weight: 700; }

    @media print { body { padding: 20px; } }
  </style>
`;

const buildHeaderHTML = (
  profile: User | null,
  title: string,
): string => {
  const brandColor = profile?.brand_color || DEFAULT_BRAND_COLOR;
  const showBusinessName = profile?.show_business_name_in_pdf ?? true;
  const businessName = profile?.business_name || profile?.name || "EventosApp";

  let logoHtml = "";
  if (profile?.logo_url) {
    logoHtml = `<img class="header-logo" src="${esc(profile.logo_url)}" />`;
  }

  let nameHtml = "";
  if (showBusinessName || !profile?.logo_url) {
    nameHtml = `<span class="header-business">${esc(businessName)}</span>`;
  }

  return `
    <div class="header">
      <div class="header-left">${logoHtml}${nameHtml}</div>
      <div class="header-title">${esc(title)}</div>
    </div>
    <hr class="header-line" />
  `;
};

const wrapHTML = (brandColor: string, body: string): string => `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  ${buildBaseStyles(brandColor)}
</head>
<body>${body}</body>
</html>
`;

const generateAndSharePDF = async (
  html: string,
  fileName: string,
): Promise<void> => {
  const { uri } = await Print.printToFileAsync({ html, base64: false });
  const canShare = await Sharing.isAvailableAsync();
  if (canShare) {
    await Sharing.shareAsync(uri, {
      mimeType: "application/pdf",
      dialogTitle: fileName,
      UTI: "com.adobe.pdf",
    });
  } else {
    await Print.printAsync({ html });
  }
};

// ── PDF Templates ──────────────────────────────────────────────────

export const generateBudgetPDF = async (
  event: EventWithClient,
  profile: User | null,
  products: ProductItem[],
  extras: ExtraItem[],
): Promise<void> => {
  const brandColor = profile?.brand_color || DEFAULT_BRAND_COLOR;
  const clientName = event.client?.name || "N/A";

  // Product rows
  const productRows = products
    .map((p) => {
      const total = (p.unit_price - (p.discount || 0)) * p.quantity;
      return `<tr>
        <td>${esc(p.products?.name || "Producto")}</td>
        <td class="text-center">${p.quantity}</td>
        <td class="text-right">${formatCurrency(p.unit_price)}</td>
        <td class="text-right">${formatCurrency(total)}</td>
      </tr>`;
    })
    .join("");

  const extraRows = extras
    .map(
      (e) => `<tr>
        <td>${esc(e.description)}</td>
        <td class="text-center">1</td>
        <td class="text-right">${formatCurrency(e.price)}</td>
        <td class="text-right">${formatCurrency(e.price)}</td>
      </tr>`,
    )
    .join("");

  const hasItems = products.length > 0 || extras.length > 0;

  const tableHTML = hasItems
    ? `<table>
        <thead><tr>
          <th>Descripción</th>
          <th class="text-center">Cant.</th>
          <th class="text-right">Precio Unit.</th>
          <th class="text-right">Total</th>
        </tr></thead>
        <tbody>${productRows}${extraRows}</tbody>
      </table>`
    : `<p class="empty-msg">No hay productos o servicios registrados.</p>`;

  // Financial summary
  const subtotal = event.total_amount + (event.discount || 0);
  const hasDiscount = event.discount && event.discount > 0;
  const showTax = event.requires_invoice || (event.tax_amount && event.tax_amount > 0);

  let summaryRows = `<div class="summary-row"><span>Subtotal:</span><span>${formatCurrency(subtotal)}</span></div>`;
  if (hasDiscount) {
    summaryRows += `<div class="summary-row discount"><span>Descuento:</span><span>-${formatCurrency(event.discount)}</span></div>`;
  }
  if (showTax) {
    summaryRows += `<div class="summary-row"><span>IVA (${event.tax_rate || 16}%):</span><span>${formatCurrency(event.tax_amount || 0)}</span></div>`;
  }
  summaryRows += `<div class="summary-row total"><span>Total:</span><span>${formatCurrency(event.total_amount)}</span></div>`;

  const body = `
    ${buildHeaderHTML(profile, "Presupuesto")}
    <div class="info-grid">
      <div class="info-col">
        <div class="info-row"><span class="info-label">Cliente: </span><span class="info-value">${esc(clientName)}</span></div>
        <div class="info-row"><span class="info-label">Teléfono: </span><span class="info-value">${esc(event.client?.phone || "N/A")}</span></div>
        <div class="info-row"><span class="info-label">Email: </span><span class="info-value">${esc(event.client?.email || "N/A")}</span></div>
      </div>
      <div class="info-col">
        <div class="info-row"><span class="info-label">Fecha: </span><span class="info-value">${formatDateES(event.event_date)}</span></div>
        <div class="info-row"><span class="info-label">Horario: </span><span class="info-value">${esc(event.start_time || "Por definir")} - ${esc(event.end_time || "Por definir")}</span></div>
        <div class="info-row"><span class="info-label">Personas: </span><span class="info-value">${event.num_people}</span></div>
      </div>
    </div>

    <div class="section-title">Productos y Servicios</div>
    ${tableHTML}
    <div class="summary">${summaryRows}</div>
    <p class="footer-note">Este presupuesto tiene una validez de 15 días.</p>
  `;

  const html = wrapHTML(brandColor, body);
  await generateAndSharePDF(html, `Presupuesto_${clientName}.pdf`);
};

// ────────────────────────────────────────────────────────────────────

export const generateContractPDF = async (
  event: EventWithClient,
  profile: User | null,
): Promise<void> => {
  const brandColor = profile?.brand_color || DEFAULT_BRAND_COLOR;
  const providerName = profile?.business_name || profile?.name || "EL PROVEEDOR";
  const clientName = event.client?.name || "EL CLIENTE";

  const renderedContract = renderContractTemplate({
    event,
    profile,
    template: profile?.contract_template,
    strict: false,
  });

  const contractParagraphs = renderedContract
    .split(/\n\n+/)
    .filter((p) => p.trim())
    .map((p) => `<p style="margin:0 0 8px 0;">${renderFormattedHTML(p)}</p>`)
    .join("\n");

  const body = `
    ${buildHeaderHTML(profile, "Contrato de Servicios")}
    <div style="margin-bottom:16px;">${contractParagraphs}</div>

    <div class="signatures">
      <div class="signature-box">
        <div class="signature-line"></div>
        <div class="signature-label">EL PROVEEDOR</div>
        <div class="signature-name">${esc(providerName)}</div>
      </div>
      <div class="signature-box">
        <div class="signature-line"></div>
        <div class="signature-label">EL CLIENTE</div>
        <div class="signature-name">${esc(clientName)}</div>
      </div>
    </div>
  `;

  const html = wrapHTML(brandColor, body);
  await generateAndSharePDF(html, `Contrato_${clientName}.pdf`);
};

// ────────────────────────────────────────────────────────────────────

export const generateShoppingListPDF = async (
  event: Event,
  profile: User | null,
  ingredients: Ingredient[],
): Promise<void> => {
  const brandColor = profile?.brand_color || DEFAULT_BRAND_COLOR;
  const eventDateFormatted = formatDateES(event.event_date);

  const rows =
    ingredients.length > 0
      ? ingredients
          .map(
            (i) => `<tr>
              <td>${esc(i.name)}</td>
              <td class="text-center">${i.quantity.toFixed(2)}</td>
              <td class="text-center">${esc(i.unit)}</td>
            </tr>`,
          )
          .join("")
      : "";

  const tableHTML =
    ingredients.length > 0
      ? `<table>
          <thead><tr>
            <th>Insumo</th>
            <th class="text-center">Cantidad</th>
            <th class="text-center">Unidad</th>
          </tr></thead>
          <tbody>${rows}</tbody>
        </table>`
      : `<p class="empty-msg">No hay insumos calculados.</p>`;

  const body = `
    ${buildHeaderHTML(profile, "Lista de Insumos")}
    <div style="margin-bottom:16px; color:${GRAY_COLOR};">
      <p>Evento: ${esc(event.service_type)}</p>
      <p>Fecha: ${eventDateFormatted}</p>
      <p>Personas: ${event.num_people}</p>
    </div>
    ${tableHTML}
  `;

  const html = wrapHTML(brandColor, body);
  const datePart = event.event_date.slice(0, 10);
  await generateAndSharePDF(
    html,
    `Compras_${event.service_type}_${datePart}.pdf`,
  );
};

// ────────────────────────────────────────────────────────────────────

export const generatePaymentReportPDF = async (
  event: EventWithClient,
  profile: User | null,
  payments: Payment[],
): Promise<void> => {
  const brandColor = profile?.brand_color || DEFAULT_BRAND_COLOR;
  const businessName = profile?.business_name || "Recibido por";

  const paymentRows =
    payments.length > 0
      ? payments
          .map((p) => {
            const method =
              METHOD_MAP[p.payment_method] || p.payment_method || "—";
            return `<tr>
              <td>${esc(p.payment_date)}</td>
              <td>${method}</td>
              <td>${esc(p.notes || "—")}</td>
              <td class="text-right">${formatCurrency(p.amount)}</td>
            </tr>`;
          })
          .join("")
      : "";

  const tableHTML =
    payments.length > 0
      ? `<table>
          <thead><tr>
            <th>Fecha</th>
            <th>Método</th>
            <th>Nota</th>
            <th class="text-right">Monto</th>
          </tr></thead>
          <tbody>${paymentRows}</tbody>
        </table>`
      : `<p class="empty-msg">No hay pagos registrados.</p>`;

  const totalPaid = payments.reduce((sum, p) => sum + p.amount, 0);
  const balance = event.total_amount - totalPaid;

  const balanceHTML =
    balance > 0
      ? `<div class="summary-row"><span class="badge-red">Saldo Pendiente:</span><span class="badge-red">${formatCurrency(balance)}</span></div>`
      : `<div class="summary-row"><span class="badge-green">Completado:</span><span class="badge-green">${formatCurrency(Math.abs(balance))}</span></div>`;

  const body = `
    ${buildHeaderHTML(profile, "Reporte de Pagos")}
    <div class="info-grid">
      <div class="info-col">
        <div class="info-row"><span class="info-label">Cliente: </span><span class="info-value">${esc(event.client?.name || "N/A")}</span></div>
        <div class="info-row"><span class="info-label">Evento: </span><span class="info-value">${esc(event.service_type)}</span></div>
      </div>
      <div class="info-col">
        <div class="info-row"><span class="info-label">Fecha: </span><span class="info-value">${formatDateES(event.event_date)}</span></div>
        <div class="info-row"><span class="info-label">Total del Evento: </span><span class="info-value">${formatCurrency(event.total_amount)}</span></div>
      </div>
    </div>

    ${tableHTML}

    <div class="summary">
      <div class="summary-row"><span>Total Pagado:</span><span>${formatCurrency(totalPaid)}</span></div>
      ${balanceHTML}
    </div>

    <div class="signatures">
      <div class="signature-box">
        <div class="signature-line"></div>
        <div class="signature-name">${esc(businessName)}</div>
      </div>
    </div>
  `;

  const html = wrapHTML(brandColor, body);
  const datePart = event.event_date.slice(0, 10);
  await generateAndSharePDF(html, `Recibo_Pagos_${datePart}.pdf`);
};

// ────────────────────────────────────────────────────────────────────

export const generateInvoicePDF = async (
  event: EventWithClient,
  profile: User | null,
  products: ProductItem[],
  extras: ExtraItem[],
): Promise<void> => {
  const brandColor = profile?.brand_color || DEFAULT_BRAND_COLOR;
  const invoiceNumber = `INV-${(event.id?.slice(0, 8) || String(Date.now())).toUpperCase()}`;
  const invoiceDate = formatDateLongES(new Date());
  const clientName = event.client?.name || "N/A";

  // Products table
  const productRows = products
    .map((p) => {
      const subtotal = (p.unit_price - (p.discount || 0)) * p.quantity;
      return `<tr>
        <td>${esc(p.products?.name || "Producto")}</td>
        <td class="text-center">${p.quantity}</td>
        <td class="text-right">${formatCurrency(p.unit_price)}</td>
        <td class="text-right">${p.discount ? formatCurrency(p.discount) : "$0.00"}</td>
        <td class="text-right">${formatCurrency(subtotal)}</td>
      </tr>`;
    })
    .join("");

  const extraRows = extras
    .map(
      (e) => `<tr>
        <td>${esc(e.description)}</td>
        <td class="text-center">1</td>
        <td class="text-right">${formatCurrency(e.price)}</td>
        <td class="text-right">$0.00</td>
        <td class="text-right">${formatCurrency(e.price)}</td>
      </tr>`,
    )
    .join("");

  const hasItems = products.length > 0 || extras.length > 0;

  const conceptsTable = hasItems
    ? `<table>
        <thead><tr>
          <th>Descripción</th>
          <th class="text-center">Cant.</th>
          <th class="text-right">Precio Unit.</th>
          <th class="text-right">Desc.</th>
          <th class="text-right">Subtotal</th>
        </tr></thead>
        <tbody>${productRows}${extraRows}</tbody>
      </table>`
    : `<p class="empty-msg">No hay conceptos registrados.</p>`;

  // Financial summary
  const subtotalBeforeTax = event.total_amount - (event.tax_amount || 0);
  const hasDiscount = event.discount && event.discount > 0;
  const showTax = event.requires_invoice || (event.tax_amount && event.tax_amount > 0);

  let summaryRows = `<div class="summary-row"><span>Subtotal:</span><span>${formatCurrency(subtotalBeforeTax)}</span></div>`;
  if (hasDiscount) {
    summaryRows += `<div class="summary-row discount"><span>Descuento:</span><span>-${formatCurrency(event.discount)}</span></div>`;
  }
  if (showTax) {
    summaryRows += `<div class="summary-row"><span>IVA (${event.tax_rate || 16}%):</span><span>${formatCurrency(event.tax_amount || 0)}</span></div>`;
  }
  summaryRows += `<div class="summary-row total" style="color:${brandColor}"><span>TOTAL:</span><span>${formatCurrency(event.total_amount)}</span></div>`;

  const body = `
    ${buildHeaderHTML(profile, "Factura")}

    <div style="text-align:right; margin-bottom:16px;">
      <div><span class="info-label">No. Factura: </span>${invoiceNumber}</div>
      <div><span class="info-label">Fecha Emisión: </span>${invoiceDate}</div>
    </div>

    <div class="section-title">DATOS DEL EMISOR</div>
    <div style="margin-bottom:12px;">
      <p>Razón Social: ${esc(profile?.business_name || profile?.name || "N/A")}</p>
      ${profile?.email ? `<p>Email: ${esc(profile.email)}</p>` : ""}
      <p>RFC: [Pendiente de configurar en ajustes]</p>
      <p>Régimen Fiscal: [Pendiente de configurar en ajustes]</p>
    </div>

    <div class="section-title">DATOS DEL RECEPTOR</div>
    <div style="margin-bottom:12px;">
      <p>Cliente: ${esc(clientName)}</p>
      ${event.client?.phone ? `<p>Teléfono: ${esc(event.client.phone)}</p>` : ""}
      ${event.client?.email ? `<p>Email: ${esc(event.client.email)}</p>` : ""}
      ${event.client?.address ? `<p>Dirección: ${esc(event.client.address)}</p>` : ""}
    </div>

    <div class="section-title">DETALLES DEL EVENTO</div>
    <div style="margin-bottom:12px;">
      <p>Fecha del Evento: ${formatDateES(event.event_date)}</p>
      <p>Servicio: ${esc(event.service_type)}</p>
      <p>Personas: ${event.num_people}</p>
      ${event.location ? `<p>Ubicación: ${esc(event.location)}</p>` : ""}
    </div>

    <div class="section-title">CONCEPTOS</div>
    ${conceptsTable}

    <div class="summary">${summaryRows}</div>

    <p style="margin-top:12px; font-size:10px; color:${GRAY_COLOR};">Forma de Pago: Pendiente de liquidar</p>

    <div class="footer-note" style="margin-top:40px;">
      <p style="font-style:italic;">Este documento es una factura simplificada. Para factura fiscal completa, solicitar con RFC y datos fiscales.</p>
      <p>Generado el ${invoiceDate}</p>
    </div>
  `;

  const html = wrapHTML(brandColor, body);
  await generateAndSharePDF(
    html,
    `Factura_${invoiceNumber}_${clientName}.pdf`,
  );
};
