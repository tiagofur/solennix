import React, { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Save, Loader2 } from "lucide-react";
import { clientService } from "../../../services/clientService";
import { useAuth } from "../../../contexts/AuthContext";
import { Modal } from "../../../components/Modal";

import { logError } from "../../../lib/errorHandler";

import { useTranslation } from "react-i18next";
import { useMemo } from "react";

interface QuickClientModalProps {
  isOpen: boolean;
  onClose: () => void;
  onClientCreated: (client: any) => void;
}

interface ClientFormData {
  name: string;
  phone: string;
  email?: string;
}

export const QuickClientModal: React.FC<QuickClientModalProps> = ({
  isOpen,
  onClose,
  onClientCreated,
}) => {
  const { t } = useTranslation(['events', 'common']);
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const clientSchema = useMemo(() => z.object({
    name: z.string().min(2, t('events:quick_client.validation.name_min')),
    phone: z.string().min(10, t('events:quick_client.validation.phone_min')),
    email: z.string().email(t('events:quick_client.validation.email_invalid')).or(z.literal("")).optional(),
  }), [t]);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<ClientFormData>({
    resolver: zodResolver(clientSchema),
    defaultValues: {
      name: "",
      phone: "",
      email: "",
    },
  });

  const onSubmit = async (data: ClientFormData) => {
    if (!user) return;

    try {
      setIsLoading(true);
      setError(null);
      const newClient = await clientService.create({
        ...data,
        email: data.email || null,
      });

      if (newClient) {
        onClientCreated(newClient);
        reset();
        onClose();
      }
    } catch (err: any) {
      logError("Error creating quick client", err);
      setError(err.message || t('events:quick_client.error_creating'));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={t('events:quick_client.title')}
      maxWidth="md"
      titleId="quick-client-modal-title"
      descriptionId="quick-client-modal-description"
    >
      <form onSubmit={handleSubmit(onSubmit)} id="quick-client-modal-description" className="space-y-6">
        {error && (
          <div
            className="bg-error/5 border-l-4 border-error p-4 rounded-xl"
            role="alert"
          >
            <p className="text-sm text-error font-medium">{error}</p>
          </div>
        )}

        <div className="space-y-4">
          <div>
            <label
              htmlFor="quick-client-name"
              className="block text-sm font-bold text-text-secondary mb-1.5"
            >
              {t('events:quick_client.name')} *
            </label>
            <input
              id="quick-client-name"
              type="text"
              {...register("name")}
              placeholder={t('events:quick_client.name_placeholder')}
              className="w-full border border-border rounded-xl px-4 py-2.5 bg-surface text-text transition-all focus:ring-2 focus:ring-primary/20 focus:border-primary outline-hidden"
              aria-required="true"
              aria-invalid={errors.name ? "true" : "false"}
            />
            {errors.name && (
              <p className="mt-1.5 text-xs text-error font-bold flex items-center">
                <span className="mr-1">●</span> {errors.name.message}
              </p>
            )}
          </div>

          <div>
            <label
              htmlFor="quick-client-phone"
              className="block text-sm font-bold text-text-secondary mb-1.5"
            >
              {t('events:quick_client.phone')} *
            </label>
            <input
              id="quick-client-phone"
              type="text"
              {...register("phone")}
              placeholder={t('events:quick_client.phone_placeholder')}
              className="w-full border border-border rounded-xl px-4 py-2.5 bg-surface text-text transition-all focus:ring-2 focus:ring-primary/20 focus:border-primary outline-hidden"
              aria-required="true"
              aria-invalid={errors.phone ? "true" : "false"}
            />
            {errors.phone && (
              <p className="mt-1.5 text-xs text-error font-bold flex items-center">
                <span className="mr-1">●</span> {errors.phone.message}
              </p>
            )}
          </div>

          <div>
            <label
              htmlFor="quick-client-email"
              className="block text-sm font-bold text-text-secondary mb-1.5"
            >
              {t('events:quick_client.email')}
            </label>
            <input
              id="quick-client-email"
              type="text"
              {...register("email")}
              placeholder={t('events:quick_client.email_placeholder')}
              className="w-full border border-border rounded-xl px-4 py-2.5 bg-surface text-text transition-all focus:ring-2 focus:ring-primary/20 focus:border-primary outline-hidden"
              aria-invalid={errors.email ? "true" : "false"}
            />
            {errors.email && (
              <p className="mt-1.5 text-xs text-error font-bold flex items-center">
                <span className="mr-1">●</span> {errors.email.message}
              </p>
            )}
          </div>
        </div>

        <div className="pt-6 border-t border-border flex flex-col-reverse sm:flex-row sm:justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="inline-flex justify-center px-6 py-2.5 rounded-xl border border-border bg-surface-alt text-text-secondary font-bold hover:bg-surface transition-colors"
          >
            {t('common:action.cancel')}
          </button>
          <button
            type="submit"
            disabled={isLoading}
            className="inline-flex items-center justify-center px-6 py-2.5 rounded-xl premium-gradient text-white font-black shadow-lg shadow-primary/20 hover:opacity-90 transition-all disabled:opacity-50"
            aria-label={isLoading ? t('events:quick_client.saving') : t('events:quick_client.save')}
          >
            {isLoading ? (
              <>
                <Loader2 className="animate-spin -ml-1 mr-2 h-4 w-4" />
                {t('common:action.saving')}
              </>
            ) : (
              <>
                <Save className="-ml-1 mr-2 h-4 w-4" />
                {t('common:action.save')}
              </>
            )}
          </button>
        </div>
      </form>
    </Modal>
  );
};
