import 'dart:io';
import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import 'package:path_provider/path_provider.dart';
import 'package:share_plus/share_plus.dart';
import 'package:syncfusion_flutter_pdf/pdf.dart';

import 'package:eventosapp/features/events/domain/entities/event_entity.dart';
import 'package:eventosapp/features/events/domain/entities/event_product_entity.dart';
import 'package:eventosapp/features/events/domain/entities/event_extra_entity.dart';

// Brand color naranja
const _brandR = 255;
const _brandG = 107;
const _brandB = 53;

String _formatCurrency(double amount) {
  return NumberFormat.currency(locale: 'es_MX', symbol: r'$').format(amount);
}

String _formatDate(DateTime date) {
  return DateFormat("d 'de' MMMM 'de' yyyy", 'es').format(date);
}

// ─────────────────────────────────────────────
// PRESUPUESTO PDF
// ─────────────────────────────────────────────
Future<void> generateBudgetPDF({
  required EventEntity event,
  required List<EventProductEntity> products,
  required List<EventExtraEntity> extras,
  String businessName = 'EventosApp',
}) async {
  final document = PdfDocument();
  final page = document.pages.add();
  final graphics = page.graphics;
  final pageWidth = page.getClientSize().width;

  final brandColor = PdfColor(_brandR, _brandG, _brandB);
  final grayColor = PdfColor(102, 102, 102);
  final textColor = PdfColor(51, 51, 51);

  final boldFont =
      PdfStandardFont(PdfFontFamily.helvetica, 10, style: PdfFontStyle.bold);
  final regularFont = PdfStandardFont(PdfFontFamily.helvetica, 9);
  final titleFont =
      PdfStandardFont(PdfFontFamily.helvetica, 20, style: PdfFontStyle.bold);
  final headerFont =
      PdfStandardFont(PdfFontFamily.helvetica, 24, style: PdfFontStyle.bold);

  double y = 20;

  // ── Encabezado ──
  graphics.drawString(
    businessName,
    titleFont,
    brush: PdfSolidBrush(brandColor),
    bounds: Rect.fromLTWH(20, y, pageWidth / 2, 25),
  );
  graphics.drawString(
    'PRESUPUESTO',
    headerFont,
    brush: PdfSolidBrush(textColor),
    bounds: Rect.fromLTWH(0, y, pageWidth - 20, 25),
    format: PdfStringFormat(alignment: PdfTextAlignment.right),
  );
  y += 30;

  // Línea separadora
  graphics.drawLine(
    PdfPen(brandColor, width: 1.5),
    Offset(20, y),
    Offset(pageWidth - 20, y),
  );
  y += 12;

  // ── Info cliente & evento (2 columnas) ──
  final halfW = (pageWidth - 40) / 2;
  final rightX = 20 + halfW + 10;

  graphics.drawString('INFORMACIÓN DEL CLIENTE', boldFont,
      brush: PdfSolidBrush(grayColor), bounds: Rect.fromLTWH(20, y, halfW, 12));
  graphics.drawString('DETALLES DEL EVENTO', boldFont,
      brush: PdfSolidBrush(grayColor),
      bounds: Rect.fromLTWH(rightX, y, halfW, 12));
  y += 14;

  graphics.drawString(event.clientName, regularFont,
      brush: PdfSolidBrush(textColor), bounds: Rect.fromLTWH(20, y, halfW, 12));
  graphics.drawString(
    'Fecha: ${_formatDate(event.eventDate)}',
    regularFont,
    brush: PdfSolidBrush(textColor),
    bounds: Rect.fromLTWH(rightX, y, halfW, 12),
  );
  y += 12;

  graphics.drawString(
    'Tipo: ${event.serviceType}',
    regularFont,
    brush: PdfSolidBrush(textColor),
    bounds: Rect.fromLTWH(rightX, y, halfW, 12),
  );
  y += 12;

  graphics.drawString(
    'Personas: ${event.numPeople}',
    regularFont,
    brush: PdfSolidBrush(textColor),
    bounds: Rect.fromLTWH(rightX, y, halfW, 12),
  );
  y += 20;

  // ── Tabla de productos y extras ──
  final grid = PdfGrid();
  grid.columns.add(count: 4);
  grid.columns[0].width = pageWidth * 0.45;
  grid.columns[1].width = pageWidth * 0.10;
  grid.columns[2].width = pageWidth * 0.20;
  grid.columns[3].width = pageWidth * 0.25;

  final headerRow = grid.headers.add(1)[0];
  headerRow.cells[0].value = 'Descripción';
  headerRow.cells[1].value = 'Cant.';
  headerRow.cells[2].value = 'Precio Unit.';
  headerRow.cells[3].value = 'Total';

  final headerStyle = PdfGridCellStyle(
    backgroundBrush: PdfSolidBrush(brandColor),
    textBrush: PdfSolidBrush(PdfColor(255, 255, 255)),
    font: boldFont,
  );
  for (int i = 0; i < 4; i++) {
    headerRow.cells[i].style = headerStyle;
    headerRow.cells[i].stringFormat =
        PdfStringFormat(alignment: PdfTextAlignment.center);
  }

  for (final p in products) {
    final row = grid.rows.add();
    row.cells[0].value = p.productName;
    row.cells[1].value = p.quantity.toStringAsFixed(0);
    row.cells[2].value = _formatCurrency(p.unitPrice);
    row.cells[3].value =
        _formatCurrency((p.unitPrice - p.discount) * p.quantity);
  }

  for (final e in extras) {
    final row = grid.rows.add();
    row.cells[0].value = e.description;
    row.cells[1].value = '1';
    row.cells[2].value = _formatCurrency(e.price);
    row.cells[3].value = _formatCurrency(e.price);
  }

  grid.style = PdfGridStyle(
    font: regularFont,
    cellPadding: PdfPaddings(left: 5, right: 5, top: 3, bottom: 3),
  );

  final result = grid.draw(
    page: page,
    bounds: Rect.fromLTWH(20, y, pageWidth - 40, 0),
  );
  y = result!.bounds.bottom + 12;

  // ── Totales ──
  final subtotal = event.requiresInvoice
      ? event.totalAmount - event.taxAmount
      : event.totalAmount;

  graphics.drawString(
    'Subtotal: ${_formatCurrency(subtotal)}',
    regularFont,
    brush: PdfSolidBrush(textColor),
    bounds: Rect.fromLTWH(0, y, pageWidth - 20, 12),
    format: PdfStringFormat(alignment: PdfTextAlignment.right),
  );
  y += 14;

  if (event.requiresInvoice) {
    graphics.drawString(
      'IVA (${event.taxRate.toStringAsFixed(0)}%): ${_formatCurrency(event.taxAmount)}',
      regularFont,
      brush: PdfSolidBrush(textColor),
      bounds: Rect.fromLTWH(0, y, pageWidth - 20, 12),
      format: PdfStringFormat(alignment: PdfTextAlignment.right),
    );
    y += 14;
  }

  graphics.drawString(
    'TOTAL: ${_formatCurrency(event.totalAmount)}',
    boldFont,
    brush: PdfSolidBrush(brandColor),
    bounds: Rect.fromLTWH(0, y, pageWidth - 20, 14),
    format: PdfStringFormat(alignment: PdfTextAlignment.right),
  );

  // Pie
  final pageH = page.getClientSize().height;
  graphics.drawString(
    'Este presupuesto tiene una validez de 15 días.',
    PdfStandardFont(PdfFontFamily.helvetica, 8),
    brush: PdfSolidBrush(grayColor),
    bounds: Rect.fromLTWH(20, pageH - 20, pageWidth - 40, 12),
  );

  await _saveAndShare(document, 'Presupuesto_${event.clientName}.pdf');
  document.dispose();
}

// ─────────────────────────────────────────────
// CONTRATO PDF
// ─────────────────────────────────────────────
Future<void> generateContractPDF({
  required EventEntity event,
  required List<EventProductEntity> products,
  required List<EventExtraEntity> extras,
  String businessName = 'EventosApp',
}) async {
  final document = PdfDocument();
  final page = document.pages.add();
  final graphics = page.graphics;
  final pageWidth = page.getClientSize().width;
  final pageH = page.getClientSize().height;

  final brandColor = PdfColor(_brandR, _brandG, _brandB);
  final grayColor = PdfColor(102, 102, 102);
  final textColor = PdfColor(51, 51, 51);

  final boldFont =
      PdfStandardFont(PdfFontFamily.helvetica, 10, style: PdfFontStyle.bold);
  final regularFont = PdfStandardFont(PdfFontFamily.helvetica, 9);
  final titleFont =
      PdfStandardFont(PdfFontFamily.helvetica, 20, style: PdfFontStyle.bold);
  final headerFont =
      PdfStandardFont(PdfFontFamily.helvetica, 24, style: PdfFontStyle.bold);
  final bodyFont = PdfStandardFont(PdfFontFamily.helvetica, 9);

  double y = 20;

  // ── Encabezado ──
  graphics.drawString(
    businessName,
    titleFont,
    brush: PdfSolidBrush(brandColor),
    bounds: Rect.fromLTWH(20, y, pageWidth / 2, 25),
  );
  graphics.drawString(
    'CONTRATO',
    headerFont,
    brush: PdfSolidBrush(textColor),
    bounds: Rect.fromLTWH(0, y, pageWidth - 20, 25),
    format: PdfStringFormat(alignment: PdfTextAlignment.right),
  );
  y += 30;

  graphics.drawLine(
    PdfPen(brandColor, width: 1.5),
    Offset(20, y),
    Offset(pageWidth - 20, y),
  );
  y += 15;

  // ── Cuerpo del contrato ──
  final today = _formatDate(DateTime.now());
  final eventDateStr = _formatDate(event.eventDate);
  final city = event.city?.isNotEmpty == true ? event.city! : 'la ciudad';

  final body =
      '''En $city, a los $today, comparecen por una parte $businessName (en adelante "EL PROVEEDOR"), y por la otra parte ${event.clientName} (en adelante "EL CLIENTE"), quienes convienen en celebrar el presente Contrato de Prestación de Servicios.

PRIMERA: OBJETO.
EL PROVEEDOR se compromete a prestar los servicios de ${event.serviceType} para el evento que se llevará a cabo el día $eventDateStr.

SEGUNDA: DETALLES DEL EVENTO.
El evento contará con aproximadamente ${event.numPeople} personas.
Ubicación: ${event.location.isNotEmpty ? event.location : 'A definir'}.
Horario: ${event.startTime} - ${event.endTime}.

TERCERA: SERVICIOS CONTRATADOS.
${products.map((p) => '  • ${p.quantity.toStringAsFixed(0)}x ${p.productName}').join('\n')}${extras.isNotEmpty ? '\n\nExtras:\n${extras.map((e) => '  • ${e.description}').join('\n')}' : ''}

CUARTA: COSTO Y FORMA DE PAGO.
El costo total del servicio es de ${_formatCurrency(event.totalAmount)}.
EL CLIENTE realizará un anticipo del ${event.depositPercent.toStringAsFixed(0)}% (${_formatCurrency(event.depositAmount)}) para reservar la fecha, debiendo liquidar el saldo restante antes del inicio del evento.

QUINTA: CANCELACIONES.
En caso de cancelación por parte de EL CLIENTE con menos de ${event.cancellationDays.toStringAsFixed(0)} días de anticipación, el anticipo no será reembolsado.${event.refundPercent > 0 ? '\nSi la cancelación se realiza con la debida anticipación, se reembolsará el ${event.refundPercent.toStringAsFixed(0)}% del anticipo entregado.' : ''}

SEXTA: ACEPTACIÓN.
Ambas partes aceptan los términos y condiciones del presente contrato, firmando de conformidad.''';

  final textElement = PdfTextElement(
    text: body,
    font: bodyFont,
    brush: PdfSolidBrush(textColor),
    format: PdfStringFormat(lineSpacing: 4),
  );

  textElement.draw(
    page: page,
    bounds: Rect.fromLTWH(20, y, pageWidth - 40, pageH - y - 70),
  );

  // ── Firmas ──
  final signY = pageH - 55;
  graphics.drawLine(PdfPen(textColor), Offset(20, signY), Offset(90, signY));
  graphics.drawString('EL PROVEEDOR', regularFont,
      brush: PdfSolidBrush(grayColor),
      bounds: Rect.fromLTWH(20, signY + 4, 70, 10),
      format: PdfStringFormat(alignment: PdfTextAlignment.center));
  graphics.drawString(businessName, boldFont,
      brush: PdfSolidBrush(textColor),
      bounds: Rect.fromLTWH(20, signY + 16, 70, 10),
      format: PdfStringFormat(alignment: PdfTextAlignment.center));

  graphics.drawLine(PdfPen(textColor), Offset(pageWidth - 90, signY),
      Offset(pageWidth - 20, signY));
  graphics.drawString('EL CLIENTE', regularFont,
      brush: PdfSolidBrush(grayColor),
      bounds: Rect.fromLTWH(pageWidth - 90, signY + 4, 70, 10),
      format: PdfStringFormat(alignment: PdfTextAlignment.center));
  graphics.drawString(event.clientName, boldFont,
      brush: PdfSolidBrush(textColor),
      bounds: Rect.fromLTWH(pageWidth - 90, signY + 16, 70, 10),
      format: PdfStringFormat(alignment: PdfTextAlignment.center));

  await _saveAndShare(document, 'Contrato_${event.clientName}.pdf');
  document.dispose();
}

// ─────────────────────────────────────────────
// Helper: guardar y compartir
// ─────────────────────────────────────────────
Future<void> _saveAndShare(PdfDocument document, String filename) async {
  final bytes = await document.save();
  final dir = await getApplicationDocumentsDirectory();
  final file = File('${dir.path}/$filename');
  await file.writeAsBytes(bytes);
  await Share.shareXFiles([XFile(file.path)], text: filename);
}
