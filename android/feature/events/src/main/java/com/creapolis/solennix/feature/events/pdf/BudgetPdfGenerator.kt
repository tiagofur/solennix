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
 * Generates a professional budget/quote PDF for an event.
 */
object BudgetPdfGenerator {

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

        // Start first page
        manager.startNewPage()

        // Header
        drawHeader(manager, user)

        // Title
        manager.drawTitle("PRESUPUESTO")
        manager.drawText("Folio: ${event.id.take(8).uppercase()}", PdfConstants.secondaryTextPaint())
        manager.drawText("Fecha: ${PdfConstants.formatDate(event.createdAt.ifEmpty { event.eventDate })}", PdfConstants.secondaryTextPaint())
        manager.moveDown(PdfConstants.SECTION_SPACING)

        // Client Info
        manager.drawSectionHeader("CLIENTE")
        manager.drawLabelValue("Nombre:", client.name)
        client.email?.let { manager.drawLabelValue("Email:", it) }
        manager.drawLabelValue("Teléfono:", client.phone)
        client.address?.let { manager.drawLabelValue("Dirección:", it) }
        manager.moveDown(PdfConstants.PARAGRAPH_SPACING)

        // Event Info
        manager.drawSectionHeader("DETALLES DEL EVENTO")
        manager.drawLabelValue("Tipo:", event.serviceType)
        manager.drawLabelValue("Fecha:", PdfConstants.formatDate(event.eventDate))
        event.startTime?.let { manager.drawLabelValue("Hora:", it) }
        manager.drawLabelValue("Personas:", event.numPeople.toString())
        event.location?.let { manager.drawLabelValue("Ubicación:", it) }
        event.city?.let { manager.drawLabelValue("Ciudad:", it) }
        manager.moveDown(PdfConstants.PARAGRAPH_SPACING)

        // Products Table
        if (products.isNotEmpty()) {
            manager.drawSectionHeader("PRODUCTOS / SERVICIOS")

            val colWidths = listOf(220f, 60f, 80f, 80f, 80f)
            manager.drawTableHeader(listOf(
                "Descripción" to colWidths[0],
                "Cant." to colWidths[1],
                "Precio Unit." to colWidths[2],
                "Desc." to colWidths[3],
                "Total" to colWidths[4]
            ))

            products.forEachIndexed { index, product ->
                val unitPrice = product.unitPrice
                val discount = product.discount ?: 0.0
                val total = product.totalPrice ?: (product.quantity * unitPrice * (1 - discount / 100))

                manager.drawTableRow(
                    listOf(
                        (product.productName ?: "Producto").take(30) to colWidths[0],
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
            manager.drawSectionHeader("EXTRAS / ADICIONALES")

            val colWidths = listOf(360f, 80f, 80f)
            manager.drawTableHeader(listOf(
                "Descripción" to colWidths[0],
                "Costo" to colWidths[1],
                "Precio" to colWidths[2]
            ))

            extras.forEachIndexed { index, extra ->
                manager.drawTableRow(
                    listOf(
                        extra.description to colWidths[0],
                        PdfConstants.formatCurrency(extra.cost) to colWidths[1],
                        PdfConstants.formatCurrency(extra.price) to colWidths[2]
                    ),
                    isAlternate = index % 2 == 1
                )
            }
            manager.moveDown(PdfConstants.PARAGRAPH_SPACING)
        }

        // Summary
        manager.drawSectionHeader("RESUMEN")

        val productsTotal = products.sumOf { it.totalPrice ?: (it.quantity * it.unitPrice) }
        val extrasTotal = extras.sumOf { it.price }
        val subtotal = productsTotal + extrasTotal

        manager.drawSummaryRow("Subtotal Productos:", PdfConstants.formatCurrency(productsTotal))
        if (extras.isNotEmpty()) {
            manager.drawSummaryRow("Subtotal Extras:", PdfConstants.formatCurrency(extrasTotal))
        }
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

        manager.moveDown(8f)
        manager.drawLine()
        manager.drawSummaryRow("TOTAL:", PdfConstants.formatCurrency(event.totalAmount), isBold = true)

        // Deposit info
        user?.defaultDepositPercent?.let { depositPercent ->
            if (depositPercent > 0) {
                manager.moveDown(PdfConstants.SECTION_SPACING)
                val depositAmount = event.totalAmount * depositPercent / 100
                manager.drawText("Anticipo requerido (${depositPercent.toInt()}%): ${PdfConstants.formatCurrency(depositAmount)}",
                    PdfConstants.secondaryTextPaint())
            }
        }

        // Notes
        event.notes?.let { notes ->
            if (notes.isNotBlank()) {
                manager.moveDown(PdfConstants.SECTION_SPACING)
                manager.drawSectionHeader("NOTAS")
                manager.drawMultilineText(notes)
            }
        }

        // Footer
        manager.drawFooter("Solennix - Cada detalle importa • www.solennix.com")

        // Save document
        manager.finishDocument()
        val file = File(context.cacheDir, "presupuesto_${event.id.take(8)}.pdf")
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
