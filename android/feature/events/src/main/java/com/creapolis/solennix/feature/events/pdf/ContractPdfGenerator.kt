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

/**
 * Generates a professional service contract PDF for an event.
 */
object ContractPdfGenerator {

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

        // Header
        drawHeader(manager, user)

        // Title
        manager.drawTitle("CONTRATO DE SERVICIOS")
        manager.drawText("Folio: ${event.id.take(8).uppercase()}", PdfConstants.secondaryTextPaint())
        manager.drawText("Fecha: ${PdfConstants.formatDate(event.createdAt.ifEmpty { event.eventDate })}", PdfConstants.secondaryTextPaint())
        manager.moveDown(PdfConstants.SECTION_SPACING)

        // Parties
        manager.drawSectionHeader("PARTES")
        val businessName = user?.businessName ?: "Solennix"
        manager.drawMultilineText(
            "El presente contrato se celebra entre $businessName (en adelante \"EL PRESTADOR\") " +
            "y ${client.name} (en adelante \"EL CLIENTE\")."
        )
        manager.moveDown(PdfConstants.PARAGRAPH_SPACING)

        // Client Info
        manager.drawSectionHeader("DATOS DEL CLIENTE")
        manager.drawLabelValue("Nombre:", client.name)
        client.email?.let { manager.drawLabelValue("Email:", it) }
        manager.drawLabelValue("Teléfono:", client.phone)
        client.address?.let { manager.drawLabelValue("Dirección:", it) }
        manager.moveDown(PdfConstants.PARAGRAPH_SPACING)

        // Event Details
        manager.drawSectionHeader("DETALLES DEL EVENTO")
        manager.drawLabelValue("Tipo de Servicio:", event.serviceType)
        manager.drawLabelValue("Fecha del Evento:", PdfConstants.formatDate(event.eventDate))
        event.startTime?.let { manager.drawLabelValue("Hora de Inicio:", it) }
        manager.drawLabelValue("Número de Personas:", event.numPeople.toString())
        event.location?.let { manager.drawLabelValue("Ubicación:", it) }
        event.city?.let { manager.drawLabelValue("Ciudad:", it) }
        manager.moveDown(PdfConstants.PARAGRAPH_SPACING)

        // Services
        if (products.isNotEmpty()) {
            manager.drawSectionHeader("SERVICIOS CONTRATADOS")
            products.forEach { product ->
                val total = product.totalPrice ?: (product.quantity * product.unitPrice)
                manager.drawText(
                    "• ${product.productId} - Cantidad: ${product.quantity} - ${PdfConstants.formatCurrency(total)}",
                    PdfConstants.bodyPaint()
                )
            }
            manager.moveDown(PdfConstants.PARAGRAPH_SPACING)
        }

        // Extras
        if (extras.isNotEmpty()) {
            manager.drawSectionHeader("SERVICIOS ADICIONALES")
            extras.forEach { extra ->
                manager.drawText(
                    "• ${extra.description} - ${PdfConstants.formatCurrency(extra.price)}",
                    PdfConstants.bodyPaint()
                )
            }
            manager.moveDown(PdfConstants.PARAGRAPH_SPACING)
        }

        // Financial Summary
        manager.drawSectionHeader("CONDICIONES ECONÓMICAS")

        val productsTotal = products.sumOf { it.totalPrice ?: (it.quantity * it.unitPrice) }
        val extrasTotal = extras.sumOf { it.price }
        val subtotal = productsTotal + extrasTotal

        manager.drawSummaryRow("Subtotal:", PdfConstants.formatCurrency(subtotal))

        if (event.discount > 0) {
            val discountAmount = if (event.discountType == DiscountType.PERCENT) {
                subtotal * event.discount / 100
            } else {
                event.discount
            }
            val discountText = if (event.discountType == DiscountType.PERCENT) {
                "Descuento (${event.discount.toInt()}%):"
            } else {
                "Descuento:"
            }
            manager.drawSummaryRow(discountText, "-${PdfConstants.formatCurrency(discountAmount)}")
        }

        manager.moveDown(8f)
        manager.drawLine()
        manager.drawSummaryRow("TOTAL:", PdfConstants.formatCurrency(event.totalAmount), isBold = true)
        manager.moveDown(PdfConstants.PARAGRAPH_SPACING)

        // Deposit
        user?.defaultDepositPercent?.let { depositPercent ->
            if (depositPercent > 0) {
                val depositAmount = event.totalAmount * depositPercent / 100
                manager.drawText(
                    "Anticipo requerido (${depositPercent.toInt()}%): ${PdfConstants.formatCurrency(depositAmount)}",
                    PdfConstants.boldPaint()
                )
                manager.moveDown(PdfConstants.PARAGRAPH_SPACING)
            }
        }

        // Terms and Conditions
        manager.drawSectionHeader("TÉRMINOS Y CONDICIONES")

        val terms = listOf(
            "1. El anticipo deberá ser cubierto para confirmar la reservación del evento.",
            "2. El saldo restante deberá liquidarse antes del inicio del evento.",
            "3. Cambios en el número de personas deberán notificarse con 72 horas de anticipación.",
            "4. En caso de cancelación, el anticipo no será reembolsable.",
            "5. EL PRESTADOR se compromete a entregar los servicios descritos en las condiciones acordadas.",
            "6. Cualquier servicio adicional no incluido en este contrato será cotizado por separado."
        )

        terms.forEach { term ->
            manager.drawMultilineText(term)
            manager.moveDown(4f)
        }
        manager.moveDown(PdfConstants.PARAGRAPH_SPACING)

        // Notes
        event.notes?.let { notes ->
            if (notes.isNotBlank()) {
                manager.drawSectionHeader("NOTAS ESPECIALES")
                manager.drawMultilineText(notes)
                manager.moveDown(PdfConstants.PARAGRAPH_SPACING)
            }
        }

        // Signatures
        manager.moveDown(PdfConstants.SECTION_SPACING)
        drawSignatureSection(manager, businessName, client.name)

        // Footer
        manager.drawFooter("Solennix - Contrato de Servicios • www.solennix.com")

        // Save document
        manager.finishDocument()
        val file = File(context.cacheDir, "contrato_${event.id.take(8)}.pdf")
        document.writeTo(FileOutputStream(file))
        document.close()

        return file
    }

    private fun drawHeader(manager: PdfPageManager, user: User?) {
        val businessName = user?.businessName ?: "Solennix"
        manager.canvas.drawText(
            businessName,
            PdfConstants.MARGIN_LEFT,
            manager.currentY,
            PdfConstants.titlePaint()
        )
        manager.moveDown(PdfConstants.LINE_HEIGHT_NORMAL + 8f)
        manager.drawPrimaryLine()
        manager.moveDown(PdfConstants.SECTION_SPACING)
    }

    private fun drawSignatureSection(manager: PdfPageManager, businessName: String, clientName: String) {
        val signatureWidth = 200f
        val startX1 = PdfConstants.MARGIN_LEFT + 30f
        val startX2 = PdfConstants.PAGE_WIDTH - PdfConstants.MARGIN_RIGHT - signatureWidth - 30f

        // Signature lines
        val linePaint = android.graphics.Paint().apply {
            color = PdfConstants.COLOR_TEXT_SECONDARY
            strokeWidth = 1f
        }

        manager.canvas.drawLine(
            startX1, manager.currentY,
            startX1 + signatureWidth, manager.currentY,
            linePaint
        )
        manager.canvas.drawLine(
            startX2, manager.currentY,
            startX2 + signatureWidth, manager.currentY,
            linePaint
        )

        manager.moveDown(PdfConstants.LINE_HEIGHT_SMALL)

        // Labels
        val labelPaint = PdfConstants.secondaryTextPaint().apply {
            textAlign = android.graphics.Paint.Align.CENTER
        }
        manager.canvas.drawText(
            "EL PRESTADOR",
            startX1 + signatureWidth / 2,
            manager.currentY,
            labelPaint
        )
        manager.canvas.drawText(
            "EL CLIENTE",
            startX2 + signatureWidth / 2,
            manager.currentY,
            labelPaint
        )

        manager.moveDown(PdfConstants.LINE_HEIGHT_NORMAL)

        // Names below
        val namePaint = PdfConstants.bodyPaint().apply {
            textAlign = android.graphics.Paint.Align.CENTER
        }
        manager.canvas.drawText(
            businessName,
            startX1 + signatureWidth / 2,
            manager.currentY,
            namePaint
        )
        manager.canvas.drawText(
            clientName,
            startX2 + signatureWidth / 2,
            manager.currentY,
            namePaint
        )
    }
}
