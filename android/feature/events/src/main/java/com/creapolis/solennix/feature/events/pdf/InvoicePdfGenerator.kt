package com.creapolis.solennix.feature.events.pdf

import android.content.Context
import android.graphics.pdf.PdfDocument
import com.creapolis.solennix.core.model.Client
import com.creapolis.solennix.core.model.DiscountType
import com.creapolis.solennix.core.model.Event
import com.creapolis.solennix.core.model.EventExtra
import com.creapolis.solennix.core.model.EventProduct
import com.creapolis.solennix.core.model.Payment
import com.creapolis.solennix.core.model.User
import java.io.File
import java.io.FileOutputStream

/**
 * Generates a professional invoice PDF for an event.
 */
object InvoicePdfGenerator {

    fun generate(
        context: Context,
        event: Event,
        client: Client,
        products: List<EventProduct>,
        extras: List<EventExtra>,
        payments: List<Payment>,
        user: User?,
        invoiceNumber: String? = null
    ): File {
        val document = PdfDocument()
        val manager = PdfPageManager(document)

        // Start first page
        manager.startNewPage()

        // Header
        drawHeader(manager, user)

        // Title
        manager.drawTitle("FACTURA")
        val folio = invoiceNumber ?: "INV-${event.id.take(8).uppercase()}"
        manager.drawText("Folio: $folio", PdfConstants.secondaryTextPaint())
        manager.drawText("Fecha de emisión: ${PdfConstants.formatDate(java.time.LocalDate.now().toString())}", PdfConstants.secondaryTextPaint())
        manager.moveDown(PdfConstants.SECTION_SPACING)

        // Business Info (if available)
        user?.businessName?.let { businessName ->
            manager.drawSectionHeader("EMISOR")
            manager.drawLabelValue("Empresa:", businessName)
            manager.moveDown(PdfConstants.PARAGRAPH_SPACING)
        }

        // Client Info
        manager.drawSectionHeader("CLIENTE")
        manager.drawLabelValue("Nombre:", client.name)
        client.email?.let { manager.drawLabelValue("Email:", it) }
        manager.drawLabelValue("Teléfono:", client.phone)
        client.address?.let { manager.drawLabelValue("Dirección:", it) }
        manager.moveDown(PdfConstants.PARAGRAPH_SPACING)

        // Event Reference
        manager.drawSectionHeader("REFERENCIA DEL EVENTO")
        manager.drawLabelValue("Servicio:", event.serviceType)
        manager.drawLabelValue("Fecha:", PdfConstants.formatDate(event.eventDate))
        event.location?.let { manager.drawLabelValue("Ubicación:", it) }
        manager.drawLabelValue("Personas:", event.numPeople.toString())
        manager.moveDown(PdfConstants.PARAGRAPH_SPACING)

        // Products Table
        if (products.isNotEmpty()) {
            manager.drawSectionHeader("CONCEPTOS")

            val colWidths = listOf(220f, 60f, 80f, 80f, 80f)
            manager.drawTableHeader(listOf(
                "Descripción" to colWidths[0],
                "Cant." to colWidths[1],
                "Precio Unit." to colWidths[2],
                "Desc." to colWidths[3],
                "Importe" to colWidths[4]
            ))

            products.forEachIndexed { index, product ->
                val unitPrice = product.unitPrice
                val discount = product.discount ?: 0.0
                val total = product.totalPrice ?: (product.quantity * unitPrice * (1 - discount / 100))

                manager.drawTableRow(
                    listOf(
                        product.productId.take(30) to colWidths[0],
                        product.quantity.toString() to colWidths[1],
                        PdfConstants.formatCurrency(unitPrice) to colWidths[2],
                        "${discount.toInt()}%" to colWidths[3],
                        PdfConstants.formatCurrency(total) to colWidths[4]
                    ),
                    isAlternate = index % 2 == 1
                )
            }
            manager.moveDown(PdfConstants.PARAGRAPH_SPACING)
        }

        // Extras Table
        if (extras.isNotEmpty()) {
            manager.drawSectionHeader("CARGOS ADICIONALES")

            val colWidths = listOf(380f, 140f)
            manager.drawTableHeader(listOf(
                "Descripción" to colWidths[0],
                "Importe" to colWidths[1]
            ))

            extras.forEachIndexed { index, extra ->
                manager.drawTableRow(
                    listOf(
                        extra.description to colWidths[0],
                        PdfConstants.formatCurrency(extra.price) to colWidths[1]
                    ),
                    isAlternate = index % 2 == 1
                )
            }
            manager.moveDown(PdfConstants.PARAGRAPH_SPACING)
        }

        // Financial Summary
        manager.drawSectionHeader("DESGLOSE")

        val productsTotal = products.sumOf { it.totalPrice ?: (it.quantity * it.unitPrice) }
        val extrasTotal = extras.sumOf { it.price }
        val subtotal = productsTotal + extrasTotal

        manager.drawSummaryRow("Subtotal:", PdfConstants.formatCurrency(subtotal))

        // Discount
        if (event.discount > 0) {
            val discountText = if (event.discountType == DiscountType.PERCENT) {
                "Descuento (${event.discount.toInt()}%):"
            } else {
                "Descuento:"
            }
            val discountAmount = if (event.discountType == DiscountType.PERCENT) {
                subtotal * event.discount / 100
            } else {
                event.discount
            }
            manager.drawSummaryRow(discountText, "-${PdfConstants.formatCurrency(discountAmount)}")
        }

        // Tax
        if (event.requiresInvoice && event.taxRate > 0) {
            val taxableAmount = event.totalAmount / (1 + event.taxRate / 100)
            val taxAmount = event.totalAmount - taxableAmount
            manager.drawSummaryRow("Base imponible:", PdfConstants.formatCurrency(taxableAmount))
            manager.drawSummaryRow("IVA (${event.taxRate.toInt()}%):", PdfConstants.formatCurrency(taxAmount))
        }

        manager.moveDown(8f)
        manager.drawLine()
        manager.drawSummaryRow("TOTAL:", PdfConstants.formatCurrency(event.totalAmount), isBold = true)

        // Payments Summary
        val totalPaid = payments.sumOf { it.amount }
        val remaining = event.totalAmount - totalPaid

        manager.moveDown(PdfConstants.SECTION_SPACING)
        manager.drawSectionHeader("ESTADO DE PAGO")
        manager.drawSummaryRow("Total Pagado:", PdfConstants.formatCurrency(totalPaid))
        manager.drawSummaryRow("Saldo Pendiente:", PdfConstants.formatCurrency(remaining), isBold = remaining > 0)

        // Payment History
        if (payments.isNotEmpty()) {
            manager.moveDown(PdfConstants.PARAGRAPH_SPACING)
            manager.drawText("Historial de pagos:", PdfConstants.bodyBoldPaint())
            payments.forEach { payment ->
                manager.drawText(
                    "  • ${PdfConstants.formatShortDate(payment.paymentDate)} - ${payment.paymentMethod.replaceFirstChar { it.uppercase() }}: ${PdfConstants.formatCurrency(payment.amount)}",
                    PdfConstants.bodyPaint()
                )
            }
        }

        // Notes
        event.notes?.let { notes ->
            if (notes.isNotBlank()) {
                manager.moveDown(PdfConstants.SECTION_SPACING)
                manager.drawSectionHeader("OBSERVACIONES")
                manager.drawMultilineText(notes)
            }
        }

        // Footer
        manager.drawFooter("Solennix - Factura $folio • www.solennix.com")

        // Save document
        manager.finishDocument()
        val file = File(context.cacheDir, "factura_${event.id.take(8)}.pdf")
        FileOutputStream(file).use { fos -> document.writeTo(fos) }
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
}
