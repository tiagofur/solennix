package com.creapolis.solennix.feature.events.pdf

import android.content.Context
import android.graphics.pdf.PdfDocument
import com.creapolis.solennix.core.model.Client
import com.creapolis.solennix.core.model.Event
import com.creapolis.solennix.core.model.Payment
import com.creapolis.solennix.core.model.User
import com.creapolis.solennix.core.model.extensions.toPaymentMethodLabel
import java.io.File
import java.io.FileOutputStream

/**
 * Generates a payment report/receipt PDF for an event.
 * Shows all payments made and remaining balance.
 */
object PaymentReportPdfGenerator {

    fun generate(
        context: Context,
        event: Event,
        client: Client,
        payments: List<Payment>,
        user: User?
    ): File {
        val document = PdfDocument()
        val manager = PdfPageManager(document)

        manager.startNewPage()

        // Header
        drawHeader(manager, user)

        // Title
        manager.drawTitle("REPORTE DE PAGOS")
        manager.drawText("Folio: ${event.id.take(8).uppercase()}", PdfConstants.secondaryTextPaint())
        manager.drawText("Fecha: ${PdfConstants.formatDate(System.currentTimeMillis().toString())}", PdfConstants.secondaryTextPaint())
        manager.moveDown(PdfConstants.SECTION_SPACING)

        // Client Info
        manager.drawSectionHeader("CLIENTE")
        manager.drawLabelValue("Nombre:", client.name)
        client.email?.let { manager.drawLabelValue("Email:", it) }
        manager.drawLabelValue("Teléfono:", client.phone)
        manager.moveDown(PdfConstants.PARAGRAPH_SPACING)

        // Event Info
        manager.drawSectionHeader("EVENTO")
        manager.drawLabelValue("Tipo:", event.serviceType)
        manager.drawLabelValue("Fecha:", PdfConstants.formatDate(event.eventDate))
        event.location?.let { manager.drawLabelValue("Ubicación:", it) }
        manager.moveDown(PdfConstants.PARAGRAPH_SPACING)

        // Payments Table
        manager.drawSectionHeader("HISTORIAL DE PAGOS")

        if (payments.isNotEmpty()) {
            val colWidths = listOf(120f, 120f, 100f, 180f)
            manager.drawTableHeader(listOf(
                "Fecha" to colWidths[0],
                "Método" to colWidths[1],
                "Monto" to colWidths[2],
                "Notas" to colWidths[3]
            ))

            payments.forEachIndexed { index, payment ->
                manager.drawTableRow(
                    listOf(
                        PdfConstants.formatDate(payment.paymentDate) to colWidths[0],
                        formatPaymentMethod(payment.paymentMethod) to colWidths[1],
                        PdfConstants.formatCurrency(payment.amount) to colWidths[2],
                        (payment.notes ?: "-").take(30) to colWidths[3]
                    ),
                    isAlternate = index % 2 == 1
                )
            }
        } else {
            manager.drawText("No hay pagos registrados.", PdfConstants.secondaryTextPaint())
        }
        manager.moveDown(PdfConstants.SECTION_SPACING)

        // Summary
        manager.drawSectionHeader("RESUMEN FINANCIERO")

        val totalPaid = payments.sumOf { it.amount }
        val totalAmount = event.totalAmount
        val remaining = totalAmount - totalPaid

        manager.drawSummaryRow("Total del Evento:", PdfConstants.formatCurrency(totalAmount))
        manager.drawSummaryRow("Total Pagado:", PdfConstants.formatCurrency(totalPaid))
        manager.moveDown(8f)
        manager.drawLine()

        val remainingLabel = if (remaining > 0) "Saldo Pendiente:" else "Saldo a Favor:"
        manager.drawSummaryRow(
            remainingLabel,
            PdfConstants.formatCurrency(kotlin.math.abs(remaining)),
            isBold = true
        )

        // Payment Status
        manager.moveDown(PdfConstants.SECTION_SPACING)
        val status = when {
            remaining <= 0 -> "✓ PAGADO EN SU TOTALIDAD"
            totalPaid > 0 -> "◐ PAGO PARCIAL"
            else -> "○ PENDIENTE DE PAGO"
        }
        manager.drawText(status, PdfConstants.boldPaint())

        // Deposit Info
        user?.defaultDepositPercent?.let { depositPercent ->
            if (depositPercent > 0 && remaining > 0) {
                manager.moveDown(PdfConstants.SECTION_SPACING)
                val requiredDeposit = totalAmount * depositPercent / 100
                val depositPaid = totalPaid >= requiredDeposit

                if (!depositPaid) {
                    manager.drawText(
                        "Anticipo requerido (${depositPercent.toInt()}%): ${PdfConstants.formatCurrency(requiredDeposit)}",
                        PdfConstants.secondaryTextPaint()
                    )
                } else {
                    manager.drawText(
                        "✓ Anticipo cubierto",
                        PdfConstants.secondaryTextPaint()
                    )
                }
            }
        }

        // Notes
        manager.moveDown(PdfConstants.SECTION_SPACING)
        manager.drawSectionHeader("NOTAS")
        manager.drawMultilineText(
            "Este documento es un comprobante de los pagos realizados. " +
            "Para cualquier aclaración, favor de contactar a ${user?.businessName ?: "Solennix"}."
        )

        // Footer
        manager.drawFooter("Solennix - Reporte de Pagos • www.solennix.com")

        // Save document
        manager.finishDocument()
        val file = File(context.cacheDir, "pagos_${event.id.take(8)}.pdf")
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

    private fun formatPaymentMethod(method: String): String {
        return method.toPaymentMethodLabel()
    }
}
