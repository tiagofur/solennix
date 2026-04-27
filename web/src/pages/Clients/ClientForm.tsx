import React, { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useTranslation } from "react-i18next";
import { useAuth } from "../../contexts/AuthContext";
import { ArrowLeft, Save, Camera, X } from "lucide-react";
import { Breadcrumb } from "../../components/Breadcrumb";
import { logError } from "../../lib/errorHandler";
import { usePlanLimits } from "../../hooks/usePlanLimits";
import { UpgradeBanner } from "../../components/UpgradeBanner";
import { useClient, useCreateClient, useUpdateClient, useUploadClientPhoto } from "../../hooks/queries/useClientQueries";

export const ClientForm: React.FC = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { t } = useTranslation(["clients", "common"]);
  const { user } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { canCreateClient, clientsCount, clientLimit, loading: limitsLoading } = usePlanLimits();

  const { data: existingClient, isLoading: isLoadingClient } = useClient(id);
  const createClient = useCreateClient();
  const updateClient = useUpdateClient();
  const uploadPhoto = useUploadClientPhoto();

  const clientSchema = useMemo(() => z.object({
    name: z.string().min(2, t("clients:form.validation.name_min")),
    phone: z.string().min(10, t("clients:form.validation.phone_min")),
    email: z.string().email(t("clients:form.validation.email_invalid")).optional().or(z.literal("")),
    address: z.string().optional(),
    city: z.string().optional(),
    notes: z.string().optional(),
  }), [t]);

  type ClientFormData = z.infer<typeof clientSchema>;

  const isLoading = isLoadingClient || createClient.isPending || updateClient.isPending;

  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors },
  } = useForm<ClientFormData>({
    resolver: zodResolver(clientSchema),
  });

  useEffect(() => {
    if (existingClient) {
      reset({
        name: existingClient.name || "",
        phone: existingClient.phone || "",
        email: existingClient.email || "",
        address: existingClient.address || "",
        city: existingClient.city || "",
        notes: existingClient.notes || "",
      });
      if (existingClient.photo_url) {
        setPhotoUrl(existingClient.photo_url);
        setPhotoPreview(existingClient.photo_url);
      }
    }
  }, [existingClient, reset]);

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
      setError(t("common:error.generic")); // Or add specific key if needed
      return;
    }

    // Show local preview immediately
    const reader = new FileReader();
    reader.onloadend = () => setPhotoPreview(reader.result as string);
    reader.readAsDataURL(file);

    uploadPhoto.mutate(file, {
      onSuccess: (result) => setPhotoUrl(result.url),
      onError: (err) => {
        logError("Error uploading photo", err);
        setError(t("common:error.network"));
        setPhotoPreview(photoUrl); // revert preview
      },
    });
  };

  const removePhoto = () => {
    setPhotoUrl(null);
    setPhotoPreview(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const onSubmit = (data: ClientFormData) => {
    if (!user) return;
    setError(null);

    const payload = {
      ...data,
      email: data.email || null,
      photo_url: photoUrl || null,
    };

    if (id) {
      updateClient.mutate(
        { id, data: payload },
        { onSuccess: () => navigate("/clients") },
      );
    } else {
      createClient.mutate(
        payload,
        { onSuccess: () => navigate("/clients") },
      );
    }
  };

  if (limitsLoading) {
    return (
      <div className="flex justify-center items-center h-64" role="status" aria-live="polite">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" aria-hidden="true"></div>
        <span className="sr-only">{t("common:action.loading")}</span>
      </div>
    );
  }

  if (!id && !canCreateClient) {
    return (
      <div className="max-w-4xl mx-auto py-8 px-4">
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="mb-6 flex items-center text-sm font-medium text-text-secondary hover:text-text transition-colors"
        >
          <ArrowLeft className="h-4 w-4 mr-1" aria-hidden="true" />
          {t("common:action.back")}
        </button>
        <div className="flex justify-center mt-12">
          <UpgradeBanner type="limit-reached" resource="clients" currentUsage={clientsCount} limit={clientLimit} />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Breadcrumb items={[{ label: t("clients:title"), href: '/clients' }, { label: id ? (watch("name") || t("clients:details.edit")) : t("clients:new_client") }]} />
      <div className="flex items-center justify-between">
        <div className="flex items-center">
          <button
            type="button"
            onClick={() => navigate("/clients")}
            className="mr-4 p-2 rounded-full hover:bg-surface-alt text-text-secondary"
          >
            <ArrowLeft className="h-5 w-5" aria-hidden="true" />
          </button>
          <h1 className="text-2xl font-bold text-text tracking-tight">
            {id ? t("clients:details.edit") : t("clients:new_client")}
          </h1>
        </div>
      </div>

      <div className="bg-card shadow-sm border border-border px-4 py-8 rounded-2xl sm:p-10">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {error && (
            <div className="bg-error/5 border-l-4 border-error p-4" role="alert">
              <div className="flex">
                <div className="ml-3">
                  <p className="text-sm text-error">{error}</p>
                </div>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 gap-y-6 gap-x-6 sm:grid-cols-6">
            <div className="sm:col-span-6 flex justify-center">
              <div className="relative">
                <div
                  className="h-24 w-24 rounded-full bg-surface-alt flex items-center justify-center overflow-hidden border-2 border-border cursor-pointer hover:opacity-80 transition-opacity"
                  onClick={() => fileInputRef.current?.click()}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') fileInputRef.current?.click(); }}
                >
                  {photoPreview ? (
                    <img src={photoPreview} alt="" className="h-full w-full object-cover" />
                  ) : (
                    <Camera className="h-8 w-8 text-text-secondary" aria-hidden="true" />
                  )}
                  {uploadPhoto.isPending && (
                    <div className="absolute inset-0 bg-black/40 rounded-full flex items-center justify-center">
                      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-white" />
                    </div>
                  )}
                </div>
                {photoPreview && (
                  <button
                    type="button"
                    onClick={removePhoto}
                    className="absolute -top-1 -right-1 bg-error text-white rounded-full p-0.5 hover:bg-error/90 transition-colors"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handlePhotoChange}
                />
                <p className="text-xs text-text-secondary text-center mt-2">Photo (optional)</p>
              </div>
            </div>

            <div className="sm:col-span-6">
              <label htmlFor="name" className="block text-sm font-medium text-text-secondary mb-2">
                {t("clients:form.name")} *
              </label>
              <input
                id="name"
                type="text"
                {...register("name")}
                className="w-full shadow-sm rounded-xl p-3 border border-border bg-card text-text transition-shadow focus:ring-2 focus:ring-primary/20"
                placeholder={t("clients:form.name")}
                aria-invalid={errors.name ? "true" : "false"}
              />
              {errors.name && (
                <p className="mt-2 text-sm text-error" role="alert">
                  {errors.name.message}
                </p>
              )}
            </div>

            <div className="sm:col-span-3">
              <label htmlFor="email" className="block text-sm font-medium text-text-secondary mb-2">
                {t("clients:form.email")}
              </label>
              <input
                id="email"
                type="email"
                {...register("email")}
                className="w-full shadow-sm rounded-xl p-3 border border-border bg-card text-text transition-shadow focus:ring-2 focus:ring-primary/20"
                placeholder="example@mail.com"
                aria-invalid={errors.email ? "true" : "false"}
              />
              {errors.email && (
                <p className="mt-2 text-sm text-error" role="alert">
                  {errors.email.message}
                </p>
              )}
            </div>

            <div className="sm:col-span-3">
              <label htmlFor="phone" className="block text-sm font-medium text-text-secondary mb-2">
                {t("clients:form.phone")} *
              </label>
              <input
                id="phone"
                type="text"
                {...register("phone")}
                className="w-full shadow-sm rounded-xl p-3 border border-border bg-card text-text transition-shadow focus:ring-2 focus:ring-primary/20"
                placeholder="00 0000 0000"
                aria-invalid={errors.phone ? "true" : "false"}
              />
              {errors.phone && (
                <p className="mt-2 text-sm text-error" role="alert">
                  {errors.phone.message}
                </p>
              )}
            </div>

            <div className="sm:col-span-4">
              <label htmlFor="address" className="block text-sm font-medium text-text-secondary mb-2">
                {t("clients:form.address")}
              </label>
              <input
                id="address"
                type="text"
                {...register("address")}
                className="w-full shadow-sm rounded-xl p-3 border border-border bg-card text-text transition-shadow focus:ring-2 focus:ring-primary/20"
                placeholder={t("clients:form.address")}
              />
            </div>

            <div className="sm:col-span-2">
              <label htmlFor="city" className="block text-sm font-medium text-text-secondary mb-2">
                City
              </label>
              <input
                id="city"
                type="text"
                {...register("city")}
                className="w-full shadow-sm rounded-xl p-3 border border-border bg-card text-text transition-shadow focus:ring-2 focus:ring-primary/20"
                placeholder="City"
              />
            </div>

            <div className="sm:col-span-6">
              <label htmlFor="notes" className="block text-sm font-medium text-text-secondary mb-2">
                {t("clients:form.notes")}
              </label>
              <textarea
                id="notes"
                {...register("notes")}
                rows={4}
                className="w-full shadow-sm rounded-xl p-3 border border-border bg-card text-text transition-shadow focus:ring-2 focus:ring-primary/20"
                placeholder={t("clients:form.notes_placeholder")}
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-6 border-t border-border">
            <button
              type="button"
              onClick={() => navigate("/clients")}
              className="bg-card py-2.5 px-6 border border-border rounded-xl shadow-sm text-sm font-medium text-text-secondary hover:bg-surface-alt transition-colors"
            >
              {t("common:action.cancel")}
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="inline-flex justify-center py-2.5 px-8 border border-transparent shadow-sm text-sm font-medium rounded-xl text-white premium-gradient hover:opacity-90 focus:outline-hidden focus:ring-2 focus:ring-offset-2 focus:ring-primary/40 disabled:opacity-50 transition-opacity"
            >
              <Save className="h-5 w-5 mr-2" aria-hidden="true" />
              {isLoading ? t("common:action.saving") : t("common:action.save")}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
