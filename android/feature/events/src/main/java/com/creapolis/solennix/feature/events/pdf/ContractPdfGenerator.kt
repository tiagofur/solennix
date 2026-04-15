package com.creapolis.solennix.feature.events.pdf

import android.content.Context
import android.graphics.pdf.PdfDocument
import com.creapolis.solennix.core.model.Client
import com.creapolis.solennix.core.model.DiscountType
import com.creapolis.solennix.core.model.Event
import com.creapolis.solennix.core.model.EventExtra
import com.creapolis.solennix.core.model.EventProduct
import com.creapolis.solennix.core.model.User
import java.io.File
import java.io.FileOutputStream
import java.time.LocalDate
import java.time.format.DateTimeFormatter
import java.util.Locale

object ContractPdfGenerator {

    private val TOKEN_REGEX = Regex("\\[([^\\[\\]]+)\\]")
    private val DATE_FMT = DateTimeFormatter.ofPattern("d 'de' MMMM 'de' yyyy", Locale("es", "MX"))

    fun generate(
        context: Context,
        event: Event,
        client: Client,
        products: List<EventProduct>,
        extras: List<EventExtra>,
        user: User?
    ): File {
        val document = PdfDocument()
        val manager = PdfPageManager(document)
        manager.startNewPage()
        drawHeader(manager, user)

        val template = user?.contractTemplate?.takeIf { it.isNotBlank() }
        if (template != null) {
            renderFromTemplate(manager, template, event, client, products, user)
        } else {
            renderHardcoded(manager, event, client, products, extras, user)
        }

        val businessName = user?.businessName ?: "Solennix"
        drawSignatureSection(manager, businessName, client.name)
        manager.drawFooter("Solennix - Contrato de Servicios")
        manager.finishDocument()
        val file = File(context.cacheDir, "contrato_${event.id.take(8)}.pdf")
        FileOutputStream(file).use { fos -> document.writeTo(fos) }
        document.close()
        return file
    }

    private fun renderFromTemplate(
        manager: PdfPageManager, template: String,
        event: Event, client: Client, products: List<EventProduct>, user: User?
    ) {
        val tokens = buildTokenMap(event, client, products, user)
        val rendered = TOKEN_REGEX.replace(template) { match ->
            val label = match.groupValues[1].trim()
            tokens[label] ?: tokens[normalize(label)] ?: match.value
        }
        rendered.split("\n").forEach { line ->
            if (line.isBlank()) manager.moveDown(PdfConstants.PARAGRAPH_SPACING)
            else manager.drawMultilineText(line)
        }
        manager.moveDown(PdfConstants.SECTION_SPACING)
    }

    private fun normalize(s: String) = s.trim().lowercase()
        .replace("á","a").replace("é","e").replace("í","i")
        .replace("ó","o").replace("ú","u").replace("ñ","n")

    private fun buildTokenMap(
        event: Event, client: Client, products: List<EventProduct>, user: User?
    ): Map<String, String> {
        val name = user?.name ?: ""
        val biz = user?.businessName?.takeIf { it.isNotBlank() } ?: name
        val t0 = event.startTime?.takeIf { it.isNotBlank() }
        val t1 = event.endTime?.takeIf { it.isNotBlank() }
        val range = if (t0 != null && t1 != null) "$t0 - $t1" else t0 ?: t1 ?: ""
        val dep = event.depositPercent ?: user?.defaultDepositPercent
        val ref = event.refundPercent ?: user?.defaultRefundPercent
        val can = event.cancellationDays ?: user?.defaultCancellationDays
        val svc = if (products.isNotEmpty())
            products.joinToString(", ") { "${it.quantity.toInt()} ${it.productName ?: "Producto"}" }
        else ""
        val city = event.city?.takeIf { it.isNotBlank() } ?: client.city?.takeIf { it.isNotBlank() } ?: ""
        val today = DATE_FMT.format(LocalDate.now())
        return mapOf(
            "Nombre del proveedor" to name,
            "Nombre comercial del proveedor" to biz,
            "Email del proveedor" to (user?.email ?: ""),
            "Fecha actual" to today,
            "Fecha del evento" to PdfConstants.formatDate(event.eventDate),
            "Hora de inicio" to (t0 ?: ""),
            "Hora de fin" to (t1 ?: ""),
            "Horario del evento" to range,
            "Tipo de servicio" to event.serviceType,
            "Número de personas" to event.numPeople.toString(),
            "Lugar del evento" to (event.location ?: ""),
            "Ciudad del evento" to (event.city ?: ""),
            "Servicios del evento" to svc,
            "Monto total del evento" to PdfConstants.formatCurrency(event.totalAmount),
            "Porcentaje de anticipo" to (dep?.toInt()?.toString() ?: ""),
            "Porcentaje de reembolso" to (ref?.toInt()?.toString() ?: ""),
            "Días de cancelación" to (can?.toInt()?.toString() ?: ""),
            "Total pagado" to "",
            "Nombre del cliente" to client.name,
            "Teléfono del cliente" to client.phone,
            "Email del cliente" to (client.email ?: ""),
            "Dirección del cliente" to (client.address ?: ""),
            "Ciudad del cliente" to (client.city ?: ""),
            "Ciudad del contrato" to city,
        )
    }

    private fun renderHardcoded(
        manager: PdfPageManager, event: Event, client: Client,
        products: List<EventProduct>, extras: List<EventExtra>, user: User?
    ) {
        manager.drawTitle("CONTRATO DE SERVICIOS")
        manager.drawText("Folio: ${event.id.take(8).uppercase()}", PdfConstants.secondaryTextPaint())
        manager.drawText("Fecha: ${PdfConstants.formatDate(event.createdAt.ifEmpty { event.eventDate })}", PdfConstants.secondaryTextPaint())
        manager.moveDown(PdfConstants.SECTION_SPACING)
        val bn = user?.businessName ?: "Solennix"
        manager.drawSectionHeader("PARTES")
        manager.drawMultilineText("El presente contrato se celebra entre $bn (en adelante \"EL PRESTADOR\") y ${client.name} (en adelante \"EL CLIENTE\").")
        manager.moveDown(PdfConstants.PARAGRAPH_SPACING)
        manager.drawSectionHeader("DATOS DEL CLIENTE")
        manager.drawLabelValue("Nombre:", client.name)
        client.email?.let { manager.drawLabelValue("Email:", it) }
        manager.drawLabelValue("Telefono:", client.phone)
        client.address?.let { manager.drawLabelValue("Direccion:", it) }
        manager.moveDown(PdfConstants.PARAGRAPH_SPACING)
        manager.drawSectionHeader("DETALLES DEL EVENTO")
        manager.drawLabelValue("Tipo de Servicio:", event.serviceType)
        manager.drawLabelValue("Fecha del Evento:", PdfConstants.formatDate(event.eventDate))
        event.startTime?.let { manager.drawLabelValue("Hora de Inicio:", it) }
        manager.drawLabelValue("Numero de Personas:", event.numPeople.toString())
        event.location?.let { manager.drawLabelValue("Ubicacion:", it) }
        event.city?.let { manager.drawLabelValue("Ciudad:", it) }
        manager.moveDown(PdfConstants.PARAGRAPH_SPACING)
        if (products.isNotEmpty()) {
            manager.drawSectionHeader("SERVICIOS CONTRATADOS")
            products.forEach { p ->
                val total = p.totalPrice ?: (p.quantity * p.unitPrice)
                manager.drawText("- ${p.productName ?: "Producto"} x${p.quantity.toInt()} - ${PdfConstants.formatCurrency(total)}", PdfConstants.bodyPaint())
            }
            manager.moveDown(PdfConstants.PARAGRAPH_SPACING)
        }
        if (extras.isNotEmpty()) {
            manager.drawSectionHeader("EXTRAS")
            extras.forEach { e -> manager.drawText("- ${e.description} - ${PdfConstants.formatCurrency(e.price)}", PdfConstants.bodyPaint()) }
            manager.moveDown(PdfConstants.PARAGRAPH_SPACING)
        }
        manager.drawSectionHeader("CONDICIONES ECONOMICAS")
        val sub = products.sumOf { it.totalPrice ?: (it.quantity * it.unitPrice) } + extras.sumOf { it.price }
        manager.drawSummaryRow("Subtotal:", PdfConstants.formatCurrency(sub))
        if (event.discount > 0) {
            val da = if (event.discountType == DiscountType.PERCENT) sub * event.discount / 100 else event.discount
            val dt = if (event.discountType == DiscountType.PERCENT) "Descuento (${event.discount.toInt()}%):" else "Descuento:"
            manager.drawSummaryRow(dt, "-${PdfConstants.formatCurrency(da)}")
        }
        manager.moveDown(8f)
        manager.drawLine()
        manager.drawSummaryRow("TOTAL:", PdfConstants.formatCurrency(event.totalAmount), isBold = true)
        manager.moveDown(PdfConstants.PARAGRAPH_SPACING)
        user?.defaultDepositPercent?.let { pct ->
            if (pct > 0) {
                val a = event.totalAmount * pct / 100
                manager.drawText("Anticipo requerido (${pct.toInt()}%): ${PdfConstants.formatCurrency(a)}", PdfConstants.boldPaint())
                manager.moveDown(PdfConstants.PARAGRAPH_SPACING)
            }
        }
        event.notes?.let { if (it.isNotBlank()) { manager.drawSectionHeader("NOTAS"); manager.drawMultilineText(it); manager.moveDown(PdfConstants.PARAGRAPH_SPACING) } }
        manager.moveDown(PdfConstants.SECTION_SPACING)
    }

    private fun drawHeader(manager: PdfPageManager, user: User?) {
        val bn = user?.businessName ?: "Solennix"
        manager.canvas.drawText(bn, PdfConstants.MARGIN_LEFT, manager.currentY, PdfConstants.titlePaint())
        manager.moveDown(PdfConstants.LINE_HEIGHT_NORMAL + 8f)
        manager.drawPrimaryLine()
        manager.moveDown(PdfConstants.SECTION_SPACING)
    }

    private fun drawSignatureSection(manager: PdfPageManager, businessName: String, clientName: String) {
        val sw = 200f
        val x1 = PdfConstants.MARGIN_LEFT + 30f
        val x2 = PdfConstants.PAGE_WIDTH - PdfConstants.MARGIN_RIGHT - sw - 30f
        val lp = android.graphics.Paint().apply { color = PdfConstants.COLOR_TEXT_SECONDARY; strokeWidth = 1f }
        manager.canvas.drawLine(x1, manager.currentY, x1 + sw, manager.currentY, lp)
        manager.canvas.drawLine(x2, manager.currentY, x2 + sw, manager.currentY, lp)
        manager.moveDown(PdfConstants.LINE_HEIGHT_SMALL)
        val lbl = PdfConstants.secondaryTextPaint().apply { textAlign = android.graphics.Paint.Align.CENTER }
        manager.canvas.drawText("EL PRESTADOR", x1 + sw / 2, manager.currentY, lbl)
        manager.canvas.drawText("EL CLIENTE", x2 + sw / 2, manager.currentY, lbl)
        manager.moveDown(PdfConstants.LINE_HEIGHT_NORMAL)
        val np = PdfConstants.bodyPaint().apply { textAlign = android.graphics.Paint.Align.CENTER }
        manager.canvas.drawText(businessName, x1 + sw / 2, manager.currentY, np)
        manager.canvas.drawText(clientName, x2 + sw / 2, manager.currentY, np)
    }
}