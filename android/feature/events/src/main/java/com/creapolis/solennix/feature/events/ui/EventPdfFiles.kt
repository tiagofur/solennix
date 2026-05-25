package com.creapolis.solennix.feature.events.ui

import android.content.Context
import android.content.Intent
import android.widget.Toast
import androidx.core.content.FileProvider
import com.creapolis.solennix.feature.events.R
import com.creapolis.solennix.feature.events.viewmodel.EventDetailViewModel
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import java.io.File

suspend fun downloadEventPdfToCache(
    context: Context,
    viewModel: EventDetailViewModel,
    type: String,
    filename: String
): File {
    val bytes = withContext(Dispatchers.IO) {
        viewModel.downloadEventPdf(type)
    }

    return withContext(Dispatchers.IO) {
        File(context.cacheDir, filename).apply {
            writeBytes(bytes)
        }
    }
}

fun openPdfFile(context: Context, file: File) {
    try {
        val uri = FileProvider.getUriForFile(
            context,
            "${context.packageName}.fileprovider",
            file
        )
        val intent = Intent(Intent.ACTION_VIEW).apply {
            setDataAndType(uri, "application/pdf")
            addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION)
        }
        context.startActivity(Intent.createChooser(intent, context.getString(R.string.events_pdf_open_chooser)))
    } catch (e: Exception) {
        Toast.makeText(context, context.getString(R.string.events_pdf_no_app), Toast.LENGTH_SHORT).show()
    }
}

fun sharePdfFile(context: Context, file: File, chooserTitle: String) {
    val uri = FileProvider.getUriForFile(
        context,
        "${context.packageName}.fileprovider",
        file
    )
    val shareIntent = Intent(Intent.ACTION_SEND).apply {
        type = "application/pdf"
        putExtra(Intent.EXTRA_STREAM, uri)
        addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION)
    }
    context.startActivity(Intent.createChooser(shareIntent, chooserTitle))
}