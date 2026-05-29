package com.creapolis.solennix.feature.events.viewmodel

import android.content.Context
import android.net.Uri
import android.provider.OpenableColumns
import androidx.lifecycle.viewModelScope
import com.creapolis.solennix.core.data.util.ImageCompressor
import com.creapolis.solennix.core.model.EventPhoto
import com.creapolis.solennix.feature.events.R
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext

fun EventDetailViewModel.loadPhotos() {
    viewModelScope.launch {
        _isPhotosLoading.value = true
        try {
            val photos = eventRepository.getEventPhotos(eventId)
            _photos.value = photos
        } catch (e: Exception) {
            _errorMessage.value = tr(R.string.events_detail_error_load_photos, e.message.orEmpty())
        } finally {
            _isPhotosLoading.value = false
        }
    }
}

fun EventDetailViewModel.uploadPhoto(context: Context, uri: Uri, caption: String? = null) {
    viewModelScope.launch {
        _isPhotoUploading.value = true
        try {
            val contentResolver = context.contentResolver
            val mimeType = contentResolver.getType(uri) ?: "image/jpeg"
            val fileName = getFileName(context, uri) ?: "event_photo.jpg"
            val inputStream = contentResolver.openInputStream(uri)
            val bytes = inputStream?.readBytes()
            inputStream?.close()

            if (bytes != null) {
                val compressedBytes = withContext(Dispatchers.Default) {
                    ImageCompressor.compress(
                        bytes = bytes,
                        cropAspectRatio = 4 to 3
                    )
                }

                val uploadResponse = eventRepository.uploadImage(
                    compressedBytes,
                    fileName,
                    mimeType
                )

                val newPhoto = eventRepository.uploadEventPhoto(
                    eventId,
                    uploadResponse.url,
                    caption
                )
                _photos.value = _photos.value + newPhoto
            } else {
                _errorMessage.value = tr(R.string.events_detail_error_read_image)
            }
        } catch (e: Exception) {
            _errorMessage.value = tr(R.string.events_detail_error_upload_photo, e.message.orEmpty())
        } finally {
            _isPhotoUploading.value = false
        }
    }
}

fun EventDetailViewModel.deletePhoto(photo: EventPhoto) {
    viewModelScope.launch {
        try {
            eventRepository.deleteEventPhoto(eventId, photo.id)
            _photos.value = _photos.value.filter { it.id != photo.id }
        } catch (e: Exception) {
            _errorMessage.value = tr(R.string.events_detail_error_delete_photo, e.message.orEmpty())
        }
    }
}

private fun EventDetailViewModel.getFileName(context: Context, uri: Uri): String? {
    var name: String? = null
    val cursor = context.contentResolver.query(uri, null, null, null, null)
    cursor?.use {
        if (it.moveToFirst()) {
            val index = it.getColumnIndex(OpenableColumns.DISPLAY_NAME)
            if (index >= 0) {
                name = it.getString(index)
            }
        }
    }
    return name
}
