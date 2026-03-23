package com.creapolis.solennix.feature.clients.pdf

import android.content.Context
import android.graphics.Canvas
import android.graphics.Color
import android.graphics.Paint
import android.graphics.Typeface
import android.graphics.pdf.PdfDocument
import com.creapolis.solennix.core.model.DiscountType
import com.creapolis.solennix.core.model.User
import com.creapolis.solennix.core.model.Client
import com.creapolis.solennix.feature.clients.viewmodel.QuoteExtra
import com.creapolis.solennix.feature.clients.viewmodel.QuoteItem
import java.io.File
import java.io.FileOutputStream
import java.text.NumberFormat
import java.time.LocalDate
import java.time.format.DateTimeFormatter
import java.util.Locale
import java.util.UUID

/**
 * Generates a professional Quick Quote PDF (A4 format).
 * Self-contained PDF constants to avoid cross-module dependencies.
 */
object QuickQuotePdfGenerator {

    // Page dimensions (A4 in points)
    private const val PAGE_WIDTH = 595
    private const val PAGE_HEIGHT = 842
    private const val MARGIN_LEFT = 50f
    private const val MARGIN_RIGHT = 50f
    private const val MARGIN_TOP = 50f
    private const val MARGIN_BOTTOM = 50f
    private const val CONTENT_WIDTH = PAGE_WIDTH - MARGIN_LEFT - MARGIN_RIGHT

    // Colors
    private val COLOR_PRIMARY = Color.parseColor("#C4A265")
    private val COLOR_TEXT_PRIMARY = Color.parseColor("#1A1A1A")
    private val COLOR_TEXT_SECONDARY = Color.parseColor("#7A7670")
    private val COLOR_DIVIDER = Color.parseColor("#E5E5E5")
    private val COLOR_TABLE_HEADER_BG = Color.parseColor("#F5F4F1")
    private val COLOR_TABLE_ALT_ROW = Color.parseColor("#FAFAFA")

    // Font sizes
    private const val FONT_TITLE = 24f
    private const val FONT_SECTION_HEADER = 14f
    private const val FONT_BODY = 11f
    private const val FONT_SMALL = 9f
    private const val FONT_CAPTION = 8f

    // Spacing
    private const val LINE_HEIGHT = 16f
    private const val SECTION_SPACING = 24f
    private const val PARAGRAPH_SPACING = 12f

    private val currencyFormatter = NumberFormat.getCurrencyInstance(Locale("es", "MX"))
    private val dateFormatter = DateTimeFormatter.ofPattern("d 'de' MMMM 'de' yyyy", Locale("es", "MX"))

    fun generate(
        context: Context,
        client: Client?,
        items: List<QuoteItem>,
        extras: List<QuoteExtra>,
        numPeople: Int?,
        subtotalProducts: Double,
        extrasTotal: Double,
        discountAmount: Double,
        discountType: DiscountType,
        discountValue: Double,
        requiresInvoice: Boolean,
        taxRate: Double,
        taxAmount: Double,
        total: Double,
        user: User?,
        clientName: String? = null,
        clientPhone: String? = null,
        clientEmail: String? = null
    ): File {
        val document = PdfDocument()
        val manager = PageManager(document)

        manager.startNewPage()

        // Header
        drawHeader(manager, user)

        // Title
        manager.drawText("COTIZACION RAPIDA", titlePaint())
        manager.moveDown(4f)
        val folio = UUID.randomUUID().toString().take(8).uppercase()
        manager.drawText("Folio: $folio", secondaryPaint())
        manager.drawText("Fecha: ${LocalDate.now().format(dateFormatter)}", secondaryPaint())
        manager.moveDown(SECTION_SPACING)

        // Client info (if available)
        if (client != null) {
            manager.drawSectionHeader("CLIENTE")
            manager.drawLabelValue("Nombre:", client.name)
            client.email?.takeIf { it.isNotBlank() }?.let { manager.drawLabelValue("Email:", it) }
            manager.drawLabelValue("Telefono:", client.phone)
            client.address?.takeIf { it.isNotBlank() }?.let { manager.drawLabelValue("Direccion:", it) }
            manager.moveDown(PARAGRAPH_SPACING)
        } else if (!clientName.isNullOrBlank()) {
            manager.drawSectionHeader("CLIENTE")
            manager.drawLabelValue("Nombre:", clientName)
            clientEmail?.takeIf { it.isNotBlank() }?.let { manager.drawLabelValue("Email:", it) }
            clientPhone?.takeIf { it.isNotBlank() }?.let { manager.drawLabelValue("Telefono:", it) }
            manager.moveDown(PARAGRAPH_SPACING)
        }

        // Event details
        if (numPeople != null && numPeople > 0) {
            manager.drawSectionHeader("DETALLES")
            manager.drawLabelValue("Personas:", numPeople.toString())
            manager.moveDown(PARAGRAPH_SPACING)
        }

        // Products table
        if (items.isNotEmpty()) {
            manager.drawSectionHeader("PRODUCTOS / SERVICIOS")

            val colWidths = listOf(220f, 70f, 100f, 100f)
            manager.drawTableHeader(
                listOf(
                    "Producto" to colWidths[0],
                    "Cant." to colWidths[1],
                    "Precio Unit." to colWidths[2],
                    "Subtotal" to colWidths[3]
                )
            )

            items.forEachIndexed { index, item ->
                manager.drawTableRow(
                    listOf(
                        item.productName.take(35) to colWidths[0],
                        item.quantity.toString() to colWidths[1],
                        currencyFormatter.format(item.unitPrice) to colWidths[2],
                        currencyFormatter.format(item.subtotal) to colWidths[3]
                    ),
                    isAlternate = index % 2 == 1
                )
            }
            manager.moveDown(PARAGRAPH_SPACING)
        }

        // Extras table
        if (extras.isNotEmpty()) {
            manager.drawSectionHeader("EXTRAS / ADICIONALES")

            val extrasColWidths = listOf(220f, 70f, 100f, 100f)
            manager.drawTableHeader(
                listOf(
                    "Descripcion" to extrasColWidths[0],
                    "Cant." to extrasColWidths[1],
                    "Precio Unit." to extrasColWidths[2],
                    "Total" to extrasColWidths[3]
                )
            )

            extras.forEachIndexed { index, extra ->
                manager.drawTableRow(
                    listOf(
                        extra.description.take(35) to extrasColWidths[0],
                        "1" to extrasColWidths[1],
                        currencyFormatter.format(extra.price) to extrasColWidths[2],
                        currencyFormatter.format(extra.price) to extrasColWidths[3]
                    ),
                    isAlternate = index % 2 == 1
                )
            }
            manager.moveDown(PARAGRAPH_SPACING)
        }

        // Financial summary
        manager.drawSectionHeader("RESUMEN")
        manager.drawSummaryRow("Subtotal Productos:", currencyFormatter.format(subtotalProducts))

        if (extrasTotal > 0) {
            manager.drawSummaryRow("Subtotal Extras:", currencyFormatter.format(extrasTotal))
        }

        if (discountAmount > 0) {
            val discountText = when (discountType) {
                DiscountType.PERCENT -> "Descuento (${discountValue.toInt()}%):"
                DiscountType.FIXED -> "Descuento:"
            }
            manager.drawSummaryRow(discountText, "-${currencyFormatter.format(discountAmount)}")
        }

        if (requiresInvoice && taxAmount > 0) {
            manager.drawSummaryRow("IVA (${taxRate.toInt()}%):", currencyFormatter.format(taxAmount))
        }

        manager.moveDown(8f)
        manager.drawLine()
        manager.drawSummaryRow("TOTAL:", currencyFormatter.format(total), isBold = true)

        // Disclaimer
        manager.moveDown(SECTION_SPACING)
        manager.drawText(
            "Esta cotizacion es informativa y no constituye un compromiso.",
            captionPaint()
        )
        manager.drawText(
            "Los precios pueden estar sujetos a cambios. Para confirmar, solicite un presupuesto formal.",
            captionPaint()
        )

        // Footer
        manager.drawFooter("Solennix - Cada detalle importa • www.solennix.com")

        // Save
        manager.finishDocument()
        val file = File(context.cacheDir, "cotizacion_rapida_$folio.pdf")
        FileOutputStream(file).use { fos -> document.writeTo(fos) }
        document.close()

        return file
    }

    private fun drawHeader(manager: PageManager, user: User?) {
        val businessName = user?.businessName ?: "Solennix"
        manager.canvas.drawText(businessName, MARGIN_LEFT, manager.currentY, titlePaint())
        manager.moveDown(LINE_HEIGHT + 8f)
        manager.drawPrimaryLine()
        manager.moveDown(SECTION_SPACING)
    }

    // --- Paint factories ---

    private fun titlePaint(): Paint = Paint().apply {
        color = COLOR_PRIMARY
        textSize = FONT_TITLE
        typeface = Typeface.create(Typeface.DEFAULT, Typeface.BOLD)
        isAntiAlias = true
    }

    private fun sectionHeaderPaint(): Paint = Paint().apply {
        color = COLOR_PRIMARY
        textSize = FONT_SECTION_HEADER
        typeface = Typeface.create(Typeface.DEFAULT, Typeface.BOLD)
        isAntiAlias = true
    }

    private fun bodyPaint(): Paint = Paint().apply {
        color = COLOR_TEXT_PRIMARY
        textSize = FONT_BODY
        typeface = Typeface.DEFAULT
        isAntiAlias = true
    }

    private fun bodyBoldPaint(): Paint = Paint().apply {
        color = COLOR_TEXT_PRIMARY
        textSize = FONT_BODY
        typeface = Typeface.create(Typeface.DEFAULT, Typeface.BOLD)
        isAntiAlias = true
    }

    private fun secondaryPaint(): Paint = Paint().apply {
        color = COLOR_TEXT_SECONDARY
        textSize = FONT_BODY
        typeface = Typeface.DEFAULT
        isAntiAlias = true
    }

    private fun captionPaint(): Paint = Paint().apply {
        color = COLOR_TEXT_SECONDARY
        textSize = FONT_CAPTION
        typeface = Typeface.DEFAULT
        isAntiAlias = true
    }

    private fun linePaint(): Paint = Paint().apply {
        color = COLOR_DIVIDER
        strokeWidth = 1f
        style = Paint.Style.STROKE
    }

    private fun primaryLinePaint(): Paint = Paint().apply {
        color = COLOR_PRIMARY
        strokeWidth = 2f
        style = Paint.Style.STROKE
    }

    private fun fillPaint(color: Int): Paint = Paint().apply {
        this.color = color
        style = Paint.Style.FILL
    }

    // --- Lightweight page manager (self-contained) ---

    private class PageManager(private val document: PdfDocument) {
        private var currentPage: PdfDocument.Page? = null
        private var pageNumber = 0
        var currentY = MARGIN_TOP

        val canvas: Canvas
            get() = currentPage?.canvas ?: startNewPage()

        fun startNewPage(): Canvas {
            currentPage?.let { document.finishPage(it) }
            pageNumber++
            val pageInfo = PdfDocument.PageInfo.Builder(PAGE_WIDTH, PAGE_HEIGHT, pageNumber).create()
            currentPage = document.startPage(pageInfo)
            currentY = MARGIN_TOP
            return currentPage!!.canvas
        }

        fun ensureSpace(requiredHeight: Float): Boolean {
            if (currentY + requiredHeight > PAGE_HEIGHT - MARGIN_BOTTOM) {
                startNewPage()
                return true
            }
            return false
        }

        fun finishDocument() {
            currentPage?.let { document.finishPage(it) }
        }

        fun moveDown(amount: Float) {
            currentY += amount
        }

        fun drawText(text: String, paint: Paint = bodyPaint()) {
            ensureSpace(LINE_HEIGHT)
            canvas.drawText(text, MARGIN_LEFT, currentY, paint)
            currentY += LINE_HEIGHT
        }

        fun drawSectionHeader(text: String) {
            ensureSpace(30f)
            currentY += SECTION_SPACING / 2
            canvas.drawText(text, MARGIN_LEFT, currentY, sectionHeaderPaint())
            currentY += 4f
            drawPrimaryLine()
            currentY += 8f
        }

        fun drawLabelValue(label: String, value: String) {
            ensureSpace(LINE_HEIGHT)
            canvas.drawText(label, MARGIN_LEFT, currentY, bodyBoldPaint())
            canvas.drawText(value, MARGIN_LEFT + 120f, currentY, bodyPaint())
            currentY += LINE_HEIGHT
        }

        fun drawLine() {
            canvas.drawLine(MARGIN_LEFT, currentY, PAGE_WIDTH - MARGIN_RIGHT, currentY, linePaint())
            currentY += 8f
        }

        fun drawPrimaryLine() {
            canvas.drawLine(MARGIN_LEFT, currentY, PAGE_WIDTH - MARGIN_RIGHT, currentY, primaryLinePaint())
            currentY += 4f
        }

        fun drawTableHeader(columns: List<Pair<String, Float>>) {
            ensureSpace(24f)
            canvas.drawRect(
                MARGIN_LEFT, currentY - 12f,
                PAGE_WIDTH - MARGIN_RIGHT, currentY + 8f,
                fillPaint(COLOR_TABLE_HEADER_BG)
            )
            var xPos = MARGIN_LEFT + 4f
            val paint = bodyBoldPaint()
            for ((text, width) in columns) {
                canvas.drawText(text, xPos, currentY, paint)
                xPos += width
            }
            currentY += 16f
        }

        fun drawTableRow(values: List<Pair<String, Float>>, isAlternate: Boolean = false) {
            ensureSpace(20f)
            if (isAlternate) {
                canvas.drawRect(
                    MARGIN_LEFT, currentY - 10f,
                    PAGE_WIDTH - MARGIN_RIGHT, currentY + 6f,
                    fillPaint(COLOR_TABLE_ALT_ROW)
                )
            }
            var xPos = MARGIN_LEFT + 4f
            val paint = bodyPaint()
            for ((text, width) in values) {
                canvas.drawText(text, xPos, currentY, paint)
                xPos += width
            }
            currentY += 14f
        }

        fun drawSummaryRow(label: String, value: String, isBold: Boolean = false) {
            ensureSpace(LINE_HEIGHT)
            val labelPaint = if (isBold) bodyBoldPaint() else bodyPaint()
            val valuePaint = if (isBold) bodyBoldPaint() else bodyPaint()

            canvas.drawText(label, PAGE_WIDTH - MARGIN_RIGHT - 200f, currentY, labelPaint)
            val valueWidth = valuePaint.measureText(value)
            canvas.drawText(value, PAGE_WIDTH - MARGIN_RIGHT - valueWidth, currentY, valuePaint)
            currentY += LINE_HEIGHT
        }

        fun drawFooter(text: String) {
            val paint = captionPaint()
            val textWidth = paint.measureText(text)
            canvas.drawText(text, (PAGE_WIDTH - textWidth) / 2f, PAGE_HEIGHT - MARGIN_BOTTOM / 2, paint)
        }
    }
}
