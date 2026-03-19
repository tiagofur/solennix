package com.creapolis.solennix.feature.events.pdf

import android.content.Context
import android.graphics.Canvas
import android.graphics.Color
import android.graphics.Paint
import android.graphics.pdf.PdfDocument
import com.creapolis.solennix.core.model.Client
import com.creapolis.solennix.core.model.Event
import java.io.File
import java.io.FileOutputStream

object PdfGenerator {

    fun generateBudgetPdf(context: Context, event: Event, client: Client): File {
        val document = PdfDocument()
        val pageInfo = PdfDocument.PageInfo.Builder(595, 842, 1).create() // A4 Size
        val page = document.startPage(pageInfo)
        val canvas: Canvas = page.canvas
        val paint = Paint()

        // Header
        paint.color = Color.BLACK
        paint.textSize = 24f
        paint.isFakeBoldText = true
        canvas.drawText("PRESUPUESTO DE EVENTO", 50f, 50f, paint)

        paint.textSize = 12f
        paint.isFakeBoldText = false
        canvas.drawText("Solennix - Cada detalle importa", 50f, 75f, paint)

        // Client Info
        paint.textSize = 14f
        paint.isFakeBoldText = true
        canvas.drawText("CLIENTE", 50f, 120f, paint)
        paint.isFakeBoldText = false
        canvas.drawText(client.name, 50f, 140f, paint)
        canvas.drawText(client.email ?: "", 50f, 155f, paint)
        canvas.drawText(client.phone, 50f, 170f, paint)

        // Event Details
        canvas.drawText("Tipo de Servicio: ${event.serviceType}", 50f, 210f, paint)
        canvas.drawText("Fecha: ${event.eventDate}", 50f, 225f, paint)
        canvas.drawText("Personas: ${event.numPeople}", 50f, 240f, paint)

        // Total
        paint.textSize = 18f
        paint.isFakeBoldText = true
        canvas.drawText("TOTAL: $${event.totalAmount}", 400f, 750f, paint)

        document.finishPage(page)

        val file = File(context.cacheDir, "presupuesto_${event.id}.pdf")
        FileOutputStream(file).use { fos -> document.writeTo(fos) }
        document.close()

        return file
    }
}
