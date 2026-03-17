package com.creapolis.solennix.feature.events.pdf

import android.content.Context
import android.graphics.Paint
import android.graphics.RectF
import android.graphics.pdf.PdfDocument
import com.creapolis.solennix.core.model.Client
import com.creapolis.solennix.core.model.Event
import com.creapolis.solennix.core.model.InventoryItem
import com.creapolis.solennix.core.model.User
import java.io.File
import java.io.FileOutputStream

/**
 * Generates an equipment list PDF for event setup and tracking.
 * Shows inventory items assigned to the event with return tracking.
 */
object EquipmentListPdfGenerator {

    fun generate(
        context: Context,
        event: Event,
        client: Client,
        inventoryItems: List<InventoryItem>,
        user: User?
    ): File {
        val document = PdfDocument()
        val manager = PdfPageManager(document)

        manager.startNewPage()

        // Header
        drawHeader(manager, user)

        // Title
        manager.drawTitle("LISTA DE EQUIPO")
        manager.drawText("Folio: ${event.id.take(8).uppercase()}", PdfConstants.secondaryTextPaint())
        manager.drawText("Fecha evento: ${PdfConstants.formatDate(event.eventDate)}", PdfConstants.secondaryTextPaint())
        manager.moveDown(PdfConstants.SECTION_SPACING)

        // Event Info
        manager.drawSectionHeader("INFORMACIÓN DEL EVENTO")
        manager.drawLabelValue("Cliente:", client.name)
        manager.drawLabelValue("Teléfono:", client.phone)
        manager.drawLabelValue("Tipo:", event.serviceType)
        event.location?.let { manager.drawLabelValue("Ubicación:", it) }
        event.city?.let { manager.drawLabelValue("Ciudad:", it) }
        event.startTime?.let { manager.drawLabelValue("Hora:", it) }
        manager.moveDown(PdfConstants.PARAGRAPH_SPACING)

        // Equipment Table
        manager.drawSectionHeader("EQUIPO ASIGNADO")

        if (inventoryItems.isNotEmpty()) {
            val colWidths = listOf(200f, 60f, 80f, 80f, 100f)
            manager.drawTableHeader(listOf(
                "Artículo" to colWidths[0],
                "Cant." to colWidths[1],
                "Entrega" to colWidths[2],
                "Devuelto" to colWidths[3],
                "Estado" to colWidths[4]
            ))

            inventoryItems.forEachIndexed { index, item ->
                manager.drawTableRow(
                    listOf(
                        item.name.take(30) to colWidths[0],
                        item.quantity.toString() to colWidths[1],
                        "☐" to colWidths[2],
                        "☐" to colWidths[3],
                        "______" to colWidths[4]
                    ),
                    isAlternate = index % 2 == 1
                )
            }
        } else {
            manager.drawText("No hay equipo asignado a este evento.", PdfConstants.secondaryTextPaint())
        }
        manager.moveDown(PdfConstants.SECTION_SPACING)

        // Legend
        manager.drawSectionHeader("LEYENDA DE ESTADO")
        manager.drawText("B = Bueno | R = Regular | D = Dañado | P = Perdido", PdfConstants.secondaryTextPaint())
        manager.moveDown(PdfConstants.PARAGRAPH_SPACING)

        // Delivery Section
        manager.drawSectionHeader("ENTREGA DEL EQUIPO")
        manager.drawLabelValue("Fecha de Entrega:", "_____________________")
        manager.drawLabelValue("Hora de Entrega:", "_____________________")
        manager.drawLabelValue("Responsable:", "_____________________")
        manager.moveDown(PdfConstants.PARAGRAPH_SPACING)

        // Return Section
        manager.drawSectionHeader("DEVOLUCIÓN DEL EQUIPO")
        manager.drawLabelValue("Fecha de Devolución:", "_____________________")
        manager.drawLabelValue("Hora de Devolución:", "_____________________")
        manager.drawLabelValue("Recibió:", "_____________________")
        manager.moveDown(PdfConstants.PARAGRAPH_SPACING)

        // Observations
        manager.drawSectionHeader("OBSERVACIONES")
        repeat(4) {
            manager.drawLine()
            manager.moveDown(PdfConstants.LINE_HEIGHT_NORMAL)
        }
        manager.moveDown(PdfConstants.PARAGRAPH_SPACING)

        // Damages Section
        manager.drawSectionHeader("DAÑOS / FALTANTES")
        repeat(3) {
            manager.drawLine()
            manager.moveDown(PdfConstants.LINE_HEIGHT_NORMAL)
        }

        // Signatures
        manager.moveDown(PdfConstants.SECTION_SPACING)
        drawSignatureSection(manager)

        // Footer
        manager.drawFooter("Solennix - Lista de Equipo • ${PdfConstants.formatDate(System.currentTimeMillis().toString())}")

        // Save document
        manager.finishDocument()
        val file = File(context.cacheDir, "equipo_${event.id.take(8)}.pdf")
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

    private fun drawSignatureSection(manager: PdfPageManager) {
        val signatureWidth = 180f
        val gap = 30f
        val totalWidth = signatureWidth * 3 + gap * 2
        val startX = (PdfConstants.PAGE_WIDTH - totalWidth) / 2

        // Signature lines
        val linePaint = Paint().apply {
            color = PdfConstants.COLOR_TEXT_SECONDARY
            strokeWidth = 1f
        }

        val positions = listOf(
            startX,
            startX + signatureWidth + gap,
            startX + (signatureWidth + gap) * 2
        )
        val labels = listOf("Entregó", "Recibió (Cliente)", "Devolvió (Cliente)")

        positions.forEachIndexed { index, x ->
            manager.canvas.drawLine(
                x, manager.currentY,
                x + signatureWidth, manager.currentY,
                linePaint
            )
        }

        manager.moveDown(PdfConstants.LINE_HEIGHT_SMALL)

        // Labels
        val labelPaint = PdfConstants.secondaryTextPaint().apply {
            textAlign = Paint.Align.CENTER
        }

        positions.forEachIndexed { index, x ->
            manager.canvas.drawText(
                labels[index],
                x + signatureWidth / 2,
                manager.currentY,
                labelPaint
            )
        }
    }
}
