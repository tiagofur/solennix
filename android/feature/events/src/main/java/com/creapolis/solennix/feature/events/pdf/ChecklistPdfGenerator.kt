package com.creapolis.solennix.feature.events.pdf

import android.content.Context
import android.graphics.Paint
import android.graphics.RectF
import android.graphics.pdf.PdfDocument
import com.creapolis.solennix.core.model.Client
import com.creapolis.solennix.core.model.Event
import com.creapolis.solennix.core.model.EventProduct
import com.creapolis.solennix.core.model.InventoryItem
import com.creapolis.solennix.core.model.User
import java.io.File
import java.io.FileOutputStream

/**
 * Generates a loading checklist PDF for event setup.
 * Shows products/equipment with checkboxes for verification.
 */
object ChecklistPdfGenerator {

    fun generate(
        context: Context,
        event: Event,
        client: Client,
        products: List<EventProduct>,
        inventoryItems: List<InventoryItem>,
        user: User?
    ): File {
        val document = PdfDocument()
        val manager = PdfPageManager(document)

        manager.startNewPage()

        // Header
        drawHeader(manager, user)

        // Title
        manager.drawTitle("LISTA DE CARGA")
        manager.drawText("Folio: ${event.id.take(8).uppercase()}", PdfConstants.secondaryTextPaint())
        manager.drawText("Fecha evento: ${PdfConstants.formatDate(event.eventDate)}", PdfConstants.secondaryTextPaint())
        manager.moveDown(PdfConstants.SECTION_SPACING)

        // Event Info
        manager.drawSectionHeader("INFORMACIÓN DEL EVENTO")
        manager.drawLabelValue("Cliente:", client.name)
        manager.drawLabelValue("Tipo:", event.serviceType)
        event.location?.let { manager.drawLabelValue("Ubicación:", it) }
        event.city?.let { manager.drawLabelValue("Ciudad:", it) }
        event.startTime?.let { manager.drawLabelValue("Hora:", it) }
        manager.drawLabelValue("Personas:", event.numPeople.toString())
        manager.moveDown(PdfConstants.PARAGRAPH_SPACING)

        // Products Checklist
        if (products.isNotEmpty()) {
            manager.drawSectionHeader("PRODUCTOS / SERVICIOS")

            products.forEach { product ->
                drawChecklistItem(
                    manager,
                    text = "${product.productId} x${product.quantity}",
                    notes = null
                )
            }
            manager.moveDown(PdfConstants.PARAGRAPH_SPACING)
        }

        // Equipment Checklist
        if (inventoryItems.isNotEmpty()) {
            manager.drawSectionHeader("EQUIPO / INVENTARIO")

            inventoryItems.forEach { item ->
                drawChecklistItem(
                    manager,
                    text = "${item.name} (${item.quantity} disponible)",
                    notes = item.notes
                )
            }
            manager.moveDown(PdfConstants.PARAGRAPH_SPACING)
        }

        // General Items Section
        manager.drawSectionHeader("ITEMS GENERALES")
        val generalItems = listOf(
            "Manteles y servilletas",
            "Utensilios de servicio",
            "Contenedores de transporte",
            "Hielo y conservadores",
            "Decoración acordada",
            "Uniformes del personal"
        )
        generalItems.forEach { item ->
            drawChecklistItem(manager, text = item, notes = null)
        }
        manager.moveDown(PdfConstants.PARAGRAPH_SPACING)

        // Notes Section
        manager.drawSectionHeader("NOTAS ADICIONALES")
        event.notes?.let { notes ->
            if (notes.isNotBlank()) {
                manager.drawMultilineText(notes)
                manager.moveDown(PdfConstants.PARAGRAPH_SPACING)
            }
        }

        // Empty lines for additional notes
        repeat(5) {
            manager.drawLine()
            manager.moveDown(PdfConstants.LINE_HEIGHT_NORMAL)
        }

        // Signatures
        manager.moveDown(PdfConstants.SECTION_SPACING * 2)
        drawSignatureSection(manager)

        // Footer
        manager.drawFooter("Solennix - Lista de Carga • ${PdfConstants.formatDate(System.currentTimeMillis().toString())}")

        // Save document
        manager.finishDocument()
        val file = File(context.cacheDir, "checklist_${event.id.take(8)}.pdf")
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

    private fun drawChecklistItem(manager: PdfPageManager, text: String, notes: String?) {
        val checkboxSize = 14f
        val checkboxY = manager.currentY - checkboxSize + 2f

        // Draw checkbox
        val checkboxPaint = Paint().apply {
            style = Paint.Style.STROKE
            strokeWidth = 1.5f
            color = PdfConstants.COLOR_PRIMARY
        }
        manager.canvas.drawRect(
            RectF(
                PdfConstants.MARGIN_LEFT,
                checkboxY,
                PdfConstants.MARGIN_LEFT + checkboxSize,
                checkboxY + checkboxSize
            ),
            checkboxPaint
        )

        // Draw text
        manager.canvas.drawText(
            text,
            PdfConstants.MARGIN_LEFT + checkboxSize + 12f,
            manager.currentY,
            PdfConstants.bodyPaint()
        )
        manager.moveDown(PdfConstants.LINE_HEIGHT_NORMAL)

        // Draw notes if present
        notes?.let {
            if (it.isNotBlank()) {
                manager.canvas.drawText(
                    "   → $it",
                    PdfConstants.MARGIN_LEFT + checkboxSize + 12f,
                    manager.currentY,
                    PdfConstants.secondaryTextPaint()
                )
                manager.moveDown(PdfConstants.LINE_HEIGHT_SMALL)
            }
        }
    }

    private fun drawSignatureSection(manager: PdfPageManager) {
        val signatureWidth = 200f
        val startX1 = PdfConstants.MARGIN_LEFT + 30f
        val startX2 = PdfConstants.PAGE_WIDTH - PdfConstants.MARGIN_RIGHT - signatureWidth - 30f

        // Signature lines
        val linePaint = Paint().apply {
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
            textAlign = Paint.Align.CENTER
        }
        manager.canvas.drawText(
            "Responsable de Carga",
            startX1 + signatureWidth / 2,
            manager.currentY,
            labelPaint
        )
        manager.canvas.drawText(
            "Supervisor",
            startX2 + signatureWidth / 2,
            manager.currentY,
            labelPaint
        )
    }
}
