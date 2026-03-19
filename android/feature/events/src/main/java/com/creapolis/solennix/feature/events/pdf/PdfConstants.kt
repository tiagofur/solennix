package com.creapolis.solennix.feature.events.pdf

import android.graphics.Canvas
import android.graphics.Color
import android.graphics.Paint
import android.graphics.Typeface
import android.graphics.pdf.PdfDocument
import java.text.NumberFormat
import java.time.LocalDate
import java.time.format.DateTimeFormatter
import java.util.Locale

/**
 * Constants and helper utilities for PDF generation.
 * Based on A4 page size (595 x 842 points).
 */
object PdfConstants {
    // Page dimensions (A4 in points)
    const val PAGE_WIDTH = 595
    const val PAGE_HEIGHT = 842

    // Margins
    const val MARGIN_LEFT = 50f
    const val MARGIN_RIGHT = 50f
    const val MARGIN_TOP = 50f
    const val MARGIN_BOTTOM = 50f
    const val CONTENT_WIDTH = PAGE_WIDTH - MARGIN_LEFT - MARGIN_RIGHT

    // Colors
    val COLOR_PRIMARY = Color.parseColor("#C4A265")
    val COLOR_PRIMARY_DARK = Color.parseColor("#B8965A")
    val COLOR_TEXT_PRIMARY = Color.parseColor("#1A1A1A")
    val COLOR_TEXT_SECONDARY = Color.parseColor("#7A7670")
    val COLOR_DIVIDER = Color.parseColor("#E5E5E5")
    val COLOR_SUCCESS = Color.parseColor("#22C55E")
    val COLOR_WARNING = Color.parseColor("#F59E0B")
    val COLOR_TABLE_HEADER_BG = Color.parseColor("#F5F4F1")
    val COLOR_TABLE_ALT_ROW = Color.parseColor("#FAFAFA")

    // Font sizes
    const val FONT_TITLE = 24f
    const val FONT_SUBTITLE = 18f
    const val FONT_SECTION_HEADER = 14f
    const val FONT_BODY = 11f
    const val FONT_SMALL = 9f
    const val FONT_CAPTION = 8f

    // Line spacing
    const val LINE_HEIGHT_NORMAL = 16f
    const val LINE_HEIGHT_SMALL = 12f
    const val SECTION_SPACING = 24f
    const val PARAGRAPH_SPACING = 12f

    // Currency formatter
    private val currencyFormatter = NumberFormat.getCurrencyInstance(Locale("es", "MX"))

    // Date formatter
    private val dateFormatter = DateTimeFormatter.ofPattern("d 'de' MMMM 'de' yyyy", Locale("es", "MX"))
    private val shortDateFormatter = DateTimeFormatter.ofPattern("dd/MM/yyyy", Locale("es", "MX"))

    fun formatCurrency(amount: Double): String = currencyFormatter.format(amount)

    fun formatDate(date: String): String {
        return try {
            val localDate = LocalDate.parse(date.take(10))
            localDate.format(dateFormatter)
        } catch (e: Exception) {
            date
        }
    }

    fun formatShortDate(date: String): String {
        return try {
            val localDate = LocalDate.parse(date.take(10))
            localDate.format(shortDateFormatter)
        } catch (e: Exception) {
            date
        }
    }

    // Paint configurations
    fun titlePaint(): Paint = Paint().apply {
        color = COLOR_PRIMARY
        textSize = FONT_TITLE
        typeface = Typeface.create(Typeface.DEFAULT, Typeface.BOLD)
        isAntiAlias = true
    }

    fun subtitlePaint(): Paint = Paint().apply {
        color = COLOR_TEXT_PRIMARY
        textSize = FONT_SUBTITLE
        typeface = Typeface.create(Typeface.DEFAULT, Typeface.BOLD)
        isAntiAlias = true
    }

    fun sectionHeaderPaint(): Paint = Paint().apply {
        color = COLOR_PRIMARY
        textSize = FONT_SECTION_HEADER
        typeface = Typeface.create(Typeface.DEFAULT, Typeface.BOLD)
        isAntiAlias = true
    }

    fun bodyPaint(): Paint = Paint().apply {
        color = COLOR_TEXT_PRIMARY
        textSize = FONT_BODY
        typeface = Typeface.DEFAULT
        isAntiAlias = true
    }

    fun bodyBoldPaint(): Paint = Paint().apply {
        color = COLOR_TEXT_PRIMARY
        textSize = FONT_BODY
        typeface = Typeface.create(Typeface.DEFAULT, Typeface.BOLD)
        isAntiAlias = true
    }

    fun boldPaint(): Paint = Paint().apply {
        color = COLOR_TEXT_PRIMARY
        textSize = FONT_BODY
        typeface = Typeface.create(Typeface.DEFAULT, Typeface.BOLD)
        isAntiAlias = true
    }

    fun secondaryTextPaint(): Paint = Paint().apply {
        color = COLOR_TEXT_SECONDARY
        textSize = FONT_BODY
        typeface = Typeface.DEFAULT
        isAntiAlias = true
    }

    fun smallPaint(): Paint = Paint().apply {
        color = COLOR_TEXT_SECONDARY
        textSize = FONT_SMALL
        typeface = Typeface.DEFAULT
        isAntiAlias = true
    }

    fun captionPaint(): Paint = Paint().apply {
        color = COLOR_TEXT_SECONDARY
        textSize = FONT_CAPTION
        typeface = Typeface.DEFAULT
        isAntiAlias = true
    }

    fun linePaint(): Paint = Paint().apply {
        color = COLOR_DIVIDER
        strokeWidth = 1f
        style = Paint.Style.STROKE
    }

    fun primaryLinePaint(): Paint = Paint().apply {
        color = COLOR_PRIMARY
        strokeWidth = 2f
        style = Paint.Style.STROKE
    }

    fun fillPaint(color: Int): Paint = Paint().apply {
        this.color = color
        style = Paint.Style.FILL
    }
}

/**
 * Helper class for managing PDF page creation and content positioning.
 */
class PdfPageManager(
    private val document: PdfDocument,
    private val pageWidth: Int = PdfConstants.PAGE_WIDTH,
    private val pageHeight: Int = PdfConstants.PAGE_HEIGHT
) {
    private var currentPage: PdfDocument.Page? = null
    private var pageNumber = 0
    var currentY = PdfConstants.MARGIN_TOP

    val canvas: Canvas
        get() = currentPage?.canvas ?: startNewPage()

    fun startNewPage(): Canvas {
        currentPage?.let { document.finishPage(it) }
        pageNumber++
        val pageInfo = PdfDocument.PageInfo.Builder(pageWidth, pageHeight, pageNumber).create()
        currentPage = document.startPage(pageInfo)
        currentY = PdfConstants.MARGIN_TOP
        return currentPage?.canvas ?: startNewPage()
    }

    fun ensureSpace(requiredHeight: Float): Boolean {
        if (currentY + requiredHeight > pageHeight - PdfConstants.MARGIN_BOTTOM) {
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

    // Drawing helpers
    fun drawTitle(text: String) {
        ensureSpace(40f)
        canvas.drawText(text, PdfConstants.MARGIN_LEFT, currentY, PdfConstants.titlePaint())
        currentY += PdfConstants.LINE_HEIGHT_NORMAL + 8f
    }

    fun drawSubtitle(text: String) {
        ensureSpace(30f)
        canvas.drawText(text, PdfConstants.MARGIN_LEFT, currentY, PdfConstants.subtitlePaint())
        currentY += PdfConstants.LINE_HEIGHT_NORMAL + 4f
    }

    fun drawSectionHeader(text: String) {
        ensureSpace(30f)
        currentY += PdfConstants.SECTION_SPACING / 2
        canvas.drawText(text, PdfConstants.MARGIN_LEFT, currentY, PdfConstants.sectionHeaderPaint())
        currentY += 4f
        drawPrimaryLine()
        currentY += 8f
    }

    fun drawText(text: String, paint: Paint = PdfConstants.bodyPaint()) {
        ensureSpace(PdfConstants.LINE_HEIGHT_NORMAL)
        canvas.drawText(text, PdfConstants.MARGIN_LEFT, currentY, paint)
        currentY += PdfConstants.LINE_HEIGHT_NORMAL
    }

    fun drawTextRight(text: String, paint: Paint = PdfConstants.bodyPaint()) {
        val textWidth = paint.measureText(text)
        canvas.drawText(text, pageWidth - PdfConstants.MARGIN_RIGHT - textWidth, currentY, paint)
    }

    fun drawLabelValue(label: String, value: String) {
        ensureSpace(PdfConstants.LINE_HEIGHT_NORMAL)
        canvas.drawText(label, PdfConstants.MARGIN_LEFT, currentY, PdfConstants.bodyBoldPaint())
        canvas.drawText(value, PdfConstants.MARGIN_LEFT + 120f, currentY, PdfConstants.bodyPaint())
        currentY += PdfConstants.LINE_HEIGHT_NORMAL
    }

    fun drawLine() {
        canvas.drawLine(
            PdfConstants.MARGIN_LEFT, currentY,
            pageWidth - PdfConstants.MARGIN_RIGHT, currentY,
            PdfConstants.linePaint()
        )
        currentY += 8f
    }

    fun drawPrimaryLine() {
        canvas.drawLine(
            PdfConstants.MARGIN_LEFT, currentY,
            pageWidth - PdfConstants.MARGIN_RIGHT, currentY,
            PdfConstants.primaryLinePaint()
        )
        currentY += 4f
    }

    fun drawTableHeader(columns: List<Pair<String, Float>>) {
        ensureSpace(24f)
        // Background
        canvas.drawRect(
            PdfConstants.MARGIN_LEFT, currentY - 12f,
            pageWidth - PdfConstants.MARGIN_RIGHT, currentY + 8f,
            PdfConstants.fillPaint(PdfConstants.COLOR_TABLE_HEADER_BG)
        )

        var xPos = PdfConstants.MARGIN_LEFT + 4f
        val paint = PdfConstants.bodyBoldPaint()
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
                PdfConstants.MARGIN_LEFT, currentY - 10f,
                pageWidth - PdfConstants.MARGIN_RIGHT, currentY + 6f,
                PdfConstants.fillPaint(PdfConstants.COLOR_TABLE_ALT_ROW)
            )
        }

        var xPos = PdfConstants.MARGIN_LEFT + 4f
        val paint = PdfConstants.bodyPaint()
        for ((text, width) in values) {
            canvas.drawText(text, xPos, currentY, paint)
            xPos += width
        }
        currentY += 14f
    }

    fun drawSummaryRow(label: String, value: String, isBold: Boolean = false) {
        ensureSpace(PdfConstants.LINE_HEIGHT_NORMAL)
        val labelPaint = if (isBold) PdfConstants.bodyBoldPaint() else PdfConstants.bodyPaint()
        val valuePaint = if (isBold) PdfConstants.bodyBoldPaint() else PdfConstants.bodyPaint()

        canvas.drawText(label, pageWidth - PdfConstants.MARGIN_RIGHT - 200f, currentY, labelPaint)
        val valueWidth = valuePaint.measureText(value)
        canvas.drawText(value, pageWidth - PdfConstants.MARGIN_RIGHT - valueWidth, currentY, valuePaint)
        currentY += PdfConstants.LINE_HEIGHT_NORMAL
    }

    fun drawFooter(text: String) {
        val paint = PdfConstants.captionPaint()
        val textWidth = paint.measureText(text)
        canvas.drawText(
            text,
            (pageWidth - textWidth) / 2f,
            pageHeight - PdfConstants.MARGIN_BOTTOM / 2,
            paint
        )
    }

    fun drawCheckbox(text: String, checked: Boolean = false) {
        ensureSpace(PdfConstants.LINE_HEIGHT_NORMAL)
        val box = if (checked) "☑" else "☐"
        canvas.drawText("$box  $text", PdfConstants.MARGIN_LEFT, currentY, PdfConstants.bodyPaint())
        currentY += PdfConstants.LINE_HEIGHT_NORMAL
    }

    fun drawMultilineText(text: String, maxWidth: Float = PdfConstants.CONTENT_WIDTH) {
        val paint = PdfConstants.bodyPaint()
        val words = text.split(" ")
        var line = ""

        for (word in words) {
            val testLine = if (line.isEmpty()) word else "$line $word"
            if (paint.measureText(testLine) > maxWidth) {
                if (line.isNotEmpty()) {
                    ensureSpace(PdfConstants.LINE_HEIGHT_NORMAL)
                    canvas.drawText(line, PdfConstants.MARGIN_LEFT, currentY, paint)
                    currentY += PdfConstants.LINE_HEIGHT_NORMAL
                }
                line = word
            } else {
                line = testLine
            }
        }
        if (line.isNotEmpty()) {
            ensureSpace(PdfConstants.LINE_HEIGHT_NORMAL)
            canvas.drawText(line, PdfConstants.MARGIN_LEFT, currentY, paint)
            currentY += PdfConstants.LINE_HEIGHT_NORMAL
        }
    }
}
