import React, { useRef, useState } from "react";
import { Camera, X, ImagePlus } from "lucide-react";
import { useTranslation } from "react-i18next";
import { OptimizedImage } from "@/components/OptimizedImage";
import { useToast } from "@/hooks/useToast";
import { api, getAssetUrl } from "@/lib/api";
import { logError } from "@/lib/errorHandler";
import {
  useEventPhotos,
  useAddEventPhoto,
  useDeleteEventPhoto,
} from "@/hooks/queries/useEventQueries";

export interface EventPhotosViewProps {
  eventId: string;
}

/**
 * `viewMode === "photos"` block + the full-screen lightbox.
 * Self-contained: owns upload state, the file input ref, and the
 * upload/remove handlers, and calls the photo hooks directly.
 *
 * The parent only needs to pass `eventId` and mount this component when
 * the photos tab is active.
 */
export const EventPhotosView: React.FC<EventPhotosViewProps> = ({ eventId }) => {
  const { t } = useTranslation(['events', 'common']);
  const { addToast } = useToast();

  const { data: eventPhotosRaw = [] } = useEventPhotos(eventId);
  const eventPhotos = Array.isArray(eventPhotosRaw) ? eventPhotosRaw : [];
  const addEventPhotoMutation = useAddEventPhoto(eventId);
  const deleteEventPhotoMutation = useDeleteEventPhoto(eventId);

  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const [lightboxPhoto, setLightboxPhoto] = useState<string | null>(null);
  const photoInputRef = useRef<HTMLInputElement>(null);

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || !eventId) return;

    setIsUploadingPhoto(true);
    try {
      let uploadedCount = 0;
      for (const file of Array.from(files)) {
        if (file.size > 10 * 1024 * 1024) {
          addToast(t('events:summary.photos.error_too_large', { name: file.name }), "error");
          continue;
        }
        // Step 1: upload the binary to the generic uploads endpoint to
        // obtain a persistent URL. This endpoint is shared by all upload
        // flows (client photos, product images, logos) and is intentionally
        // decoupled from any resource.
        const formData = new FormData();
        formData.append('file', file);
        const uploaded = await api.postFormData<{ url: string }>('/uploads/image', formData);

        // Step 2: register the photo on the event via the dedicated
        // endpoint. The backend assigns the id and timestamps and appends
        // it to the event.photos array server-side; the Web never has to
        // serialize the array itself.
        await addEventPhotoMutation.mutateAsync({ url: uploaded.url });
        uploadedCount += 1;
      }

      if (uploadedCount > 0) {
        addToast(t('events:summary.photos.uploaded_success', { count: uploadedCount }), "success");
      }
    } catch (err) {
      logError("Error uploading event photos", err);
      addToast(t('events:summary.photos.error_uploading'), "error");
    } finally {
      setIsUploadingPhoto(false);
      if (photoInputRef.current) photoInputRef.current.value = "";
    }
  };

  const handleRemovePhoto = async (photoId: string) => {
    if (!eventId) return;
    try {
      await deleteEventPhotoMutation.mutateAsync(photoId);
      addToast(t('events:summary.photos.deleted_success'), "success");
    } catch (err) {
      logError("Error removing photo", err);
      addToast(t('events:summary.photos.error_deleting'), "error");
    }
  };

  return (
    <>
      <div className="bg-card shadow-sm rounded-2xl border border-border p-6 print:hidden">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-bold text-text">{t('events:summary.photos.title')}</h2>
          <button
            type="button"
            onClick={() => photoInputRef.current?.click()}
            disabled={isUploadingPhoto}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-xl text-white premium-gradient hover:opacity-90 shadow-sm transition-opacity disabled:opacity-50"
          >
            {isUploadingPhoto ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                {t('common:uploading')}...
              </>
            ) : (
              <>
                <ImagePlus className="h-4 w-4 mr-2" aria-hidden="true" />
                {t('events:summary.photos.add_photos')}
              </>
            )}
          </button>
          <input
            ref={photoInputRef}
            type="file"
            accept="image/*"
            multiple
            disabled={isUploadingPhoto}
            className="hidden"
            onChange={handlePhotoUpload}
          />
        </div>

        {eventPhotos.length === 0 ? (
          <div className="text-center py-12">
            <Camera className="mx-auto h-12 w-12 text-text-secondary mb-3" aria-hidden="true" />
            <p className="text-text-secondary">{t('events:summary.photos.no_photos')}</p>
            <p className="text-sm text-text-secondary mt-1">
              {t('events:summary.photos.add_photos_desc')}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {eventPhotos.map((photo, idx) => {
              const resolvedUrl = getAssetUrl(photo.url) || photo.url;
              return (
                <div key={photo.id || `photo-${idx}`} className="relative group aspect-square rounded-xl overflow-hidden bg-surface-alt">
                  <OptimizedImage
                    src={resolvedUrl}
                    alt={`Foto ${idx + 1} del evento`}
                    className="w-full h-full object-cover cursor-pointer hover:opacity-90 transition-opacity"
                    onClick={() => setLightboxPhoto(resolvedUrl)}
                  />
                  <button
                    type="button"
                    onClick={() => handleRemovePhoto(photo.id)}
                    className="absolute top-2 right-2 bg-error text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-error/90"
                    aria-label={t('events:summary.photos.delete_aria', { index: idx + 1 })}
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Lightbox */}
      {lightboxPhoto && (
        <div
          className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4"
          onClick={() => setLightboxPhoto(null)}
          role="dialog"
          aria-label={t('events:summary.photos.lightbox_aria')}
        >
          <button
            type="button"
            onClick={() => setLightboxPhoto(null)}
            className="absolute top-4 right-4 text-white hover:text-white/70 transition-colors"
            aria-label={t('common:actions.close')}
          >
            <X className="h-8 w-8" />
          </button>
          <img
            src={lightboxPhoto}
            alt={t('events:summary.photos.lightbox_img_alt')}
            className="max-w-full max-h-[90vh] rounded-xl object-contain"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </>
  );
};
