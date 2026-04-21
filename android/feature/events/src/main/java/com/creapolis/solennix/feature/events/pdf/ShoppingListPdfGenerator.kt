package com.creapolis.solennix.feature.events.pdf

import android.content.Context
import android.graphics.pdf.PdfDocument
import com.creapolis.solennix.core.model.Client
import com.creapolis.solennix.core.model.Event
import com.creapolis.solennix.core.model.EventSupply
import com.creapolis.solennix.core.model.SupplySource
import com.creapolis.solennix.core.model.User
import java.io.File
import java.io.FileOutputStream

/**
 * Generates a shopping list PDF for event supplies that need to be purchased.
 */
object ShoppingListPdfGenerator {

    fun generate(
        context: Context,
        event: Event,
        client: Client,
        supplies: List<EventSupply>,
        user: User?
    ): File {
        val document = PdfDocument()
        val manager = PdfPageManager(document)

        // Filter only items that need to be purchased
        val purchaseItems = supplies.filter { it.source == SupplySource.PURCHASE }

        // Start first page
        manager.startNewPage()

        // Header
        drawHeader(manager, user)

        // Title
        manager.drawTitle("LISTA DE COMPRAS")
        manager.drawText("Evento: ${event.serviceType}", PdfConstants.secondaryTextPaint())
        manager.drawText("Fecha: ${PdfConstants.formatDate(event.eventDate)}", PdfConstants.secondaryTextPaint())
        manager.moveDown(PdfConstants.SECTION_SPACING)

        // Client Info
        manager.drawSectionHeader("CLIENTE")
        manager.drawLabelValue("Nombre:", client.name)
        event.location?.let { manager.drawLabelValue("Ubicación:", it) }
        manager.moveDown(PdfConstants.PARAGRAPH_SPACING)

        if (purchaseItems.isEmpty()) {
            manager.moveDown(PdfConstants.SECTION_SPACING)
            manager.drawText("No hay artículos pendientes de compra.", PdfConstants.bodyPaint())
        } else {
            // Shopping Items Table
            manager.drawSectionHeader("ARTÍCULOS A COMPRAR")

            val colWidths = listOf(240f, 80f, 80f, 120f)
            manager.drawTableHeader(listOf(
                "Artículo" to colWidths[0],
                "Cantidad" to colWidths[1],
                "Costo Unit." to colWidths[2],
                "Costo Total" to colWidths[3]
            ))

            var totalCost = 0.0
            purchaseItems.forEachIndexed { index, supply ->
                val itemCost = supply.quantity * supply.unitCost
                totalCost += itemCost
                // Fallback al UUID pelado se veia feo en el PDF ("Insumo sin
                // nombre" es mas amigable si supplyName viene nulo del backend).
                val name = supply.supplyName?.takeIf { it.isNotBlank() } ?: "Insumo sin nombre"
                val qtyText = "${supply.quantity}${supply.unit?.let { " $it" } ?: ""}"

                manager.drawTableRow(
                    listOf(
                        name to colWidths[0],
                        qtyText to colWidths[1],
                        PdfConstants.formatCurrency(supply.unitCost) to colWidths[2],
                        PdfConstants.formatCurrency(itemCost) to colWidths[3]
                    ),
                    isAlternate = index % 2 == 1
                )
            }

            // Total
            manager.moveDown(PdfConstants.PARAGRAPH_SPACING)
            manager.drawLine()
            manager.drawSummaryRow("TOTAL ESTIMADO:", PdfConstants.formatCurrency(totalCost), isBold = true)

            // Checklist section
            manager.moveDown(PdfConstants.SECTION_SPACING)
            manager.drawSectionHeader("LISTA DE VERIFICACIÓN")
            purchaseItems.forEach { supply ->
                val name = supply.supplyName ?: supply.inventoryId
                manager.drawCheckbox("$name - ${supply.quantity} ${supply.unit ?: ""}")
            }
        }

        // Notes section
        event.notes?.let { notes ->
            if (notes.isNotBlank()) {
                manager.moveDown(PdfConstants.SECTION_SPACING)
                manager.drawSectionHeader("NOTAS")
                manager.drawMultilineText(notes)
            }
        }

        // Footer
        manager.drawFooter("Solennix - Lista de Compras • ${PdfConstants.formatShortDate(event.eventDate)}")

        // Save document
        manager.finishDocument()
        val file = File(context.cacheDir, "lista_compras_${event.id.take(8)}.pdf")
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
