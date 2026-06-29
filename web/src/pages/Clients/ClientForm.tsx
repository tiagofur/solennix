import React, { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useTranslation } from "react-i18next";
import { useAuth } from "../../contexts/AuthContext";
import { ArrowLeft, Save, Camera, X } from "lucide-react";
import { Breadcrumb } from "../../components/Breadcrumb";
import { logError } from "../../lib/errorHandler";
import { usePlanLimits } from "../../hooks/usePlanLimits";
import { UpgradeBanner } from "../../components/UpgradeBanner";
import { Button } from "../../components/Button";
import { Card } from "../../components/Card";
import { Input } from "../../components/Input";
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
    control,
    formState: { errors },
  } = useForm<ClientFormData>({
    resolver: zodResolver(clientSchema),
  });

  const watchedName = useWatch({ control, name: "name" });

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
      setError(t("clients:form.validation.photo_too_large"));
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
        setError(t("clients:form.validation.photo_upload_error"));
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
      <Breadcrumb items={[{ label: t("clients:title"), href: '/clients' }, { label: id ? (watchedName || t("clients:details.edit")) : t("clients:new_client") }]} />
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

      <Card variant="glass" padding="lg">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {error && (
            <div className="bg-error/5 border-l-4 border-error p-4 rounded-r-xl" role="alert">
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
                <p className="text-xs text-text-secondary text-center mt-2">{t("clients:form.photo_optional")}</p>
              </div>
            </div>

            <div className="sm:col-span-6">
              <Input
                id="name"
                label={t("clients:form.name") + " *"}
                placeholder={t("clients:form.name")}
                error={errors.name?.message}
                {...register("name")}
              />
            </div>

            <div className="sm:col-span-3">
              <Input
                id="email"
                type="email"
                label={t("clients:form.email")}
                placeholder="example@mail.com"
                error={errors.email?.message}
                {...register("email")}
              />
            </div>

            <div className="sm:col-span-3">
              <Input
                id="phone"
                label={t("clients:form.phone") + " *"}
                placeholder="00 0000 0000"
                error={errors.phone?.message}
                {...register("phone")}
              />
            </div>

            <div className="sm:col-span-4">
              <Input
                id="address"
                label={t("clients:form.address")}
                placeholder={t("clients:form.address")}
                {...register("address")}
              />
            </div>

            <div className="sm:col-span-2">
              <Input
                id="city"
                label={t("clients:form.city")}
                placeholder={t("clients:form.city")}
                {...register("city")}
              />
            </div>

            <div className="sm:col-span-6 flex flex-col gap-1.5">
              <label htmlFor="notes" className="text-xs font-bold text-text-secondary px-1 uppercase tracking-wider">
                {t("clients:form.notes")}
              </label>
              <textarea
                id="notes"
                {...register("notes")}
                rows={4}
                className="w-full px-4 py-3 rounded-xl border border-border bg-surface hover:border-border-strong focus:border-primary focus:bg-surface focus:outline-hidden focus:ring-4 focus:ring-primary/10 text-sm text-text placeholder-text-tertiary transition-all"
                placeholder={t("clients:form.notes_placeholder")}
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-6 border-t border-border">
            <Button
              type="button"
              variant="glass"
              onClick={() => navigate("/clients")}
            >
              {t("common:action.cancel")}
            </Button>
            <Button
              type="submit"
              variant="primary"
              loading={isLoading}
            >
              <Save className="h-5 w-5 mr-2" aria-hidden="true" />
              {isLoading ? t("common:action.saving") : t("common:action.save")}
            </Button>
          </div>
        </form>
      </Card>


    </div>
  );
};
