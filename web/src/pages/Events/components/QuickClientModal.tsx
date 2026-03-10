import React, { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Save, Loader2 } from "lucide-react";
import { clientService } from "../../../services/clientService";
import { useAuth } from "../../../contexts/AuthContext";
import { Modal } from "../../../components/Modal";

import { logError } from "../../../lib/errorHandler";

const clientSchema = z.object({
  name: z.string().min(2, "El nombre debe tener al menos 2 caracteres"),
  phone: z.string().min(10, "El teléfono debe tener al menos 10 dígitos"),
  email: z.string().email("Email inválido").or(z.literal("")).optional(),
});

type ClientFormData = z.infer<typeof clientSchema>;

interface QuickClientModalProps {
  isOpen: boolean;
  onClose: () => void;
  onClientCreated: (client: any) => void;
}

export const QuickClientModal: React.FC<QuickClientModalProps> = ({
  isOpen,
  onClose,
  onClientCreated,
}) => {
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
        user_id: user.id,
      });

      if (newClient) {
        onClientCreated(newClient);
        reset();
        onClose();
      }
    } catch (err: any) {
      logError("Error creating quick client", err);
      setError(err.message || "Error al crear el cliente");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Nuevo Cliente Rápido"
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
              Nombre Completo *
            </label>
            <input
              id="quick-client-name"
              type="text"
              {...register("name")}
              placeholder="Ej. Juan Pérez"
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
              Teléfono *
            </label>
            <input
              id="quick-client-phone"
              type="text"
              {...register("phone")}
              placeholder="10 dígitos"
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
              Email
            </label>
            <input
              id="quick-client-email"
              type="text"
              {...register("email")}
              placeholder="ejemplo@correo.com"
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
            Cancelar
          </button>
          <button
            type="submit"
            disabled={isLoading}
            className="inline-flex items-center justify-center px-6 py-2.5 rounded-xl premium-gradient text-white font-black shadow-lg shadow-primary/20 hover:opacity-90 transition-all disabled:opacity-50"
            aria-label={isLoading ? "Guardando cliente..." : "Guardar cliente"}
          >
            {isLoading ? (
              <>
                <Loader2 className="animate-spin -ml-1 mr-2 h-4 w-4" />
                Guardando...
              </>
            ) : (
              <>
                <Save className="-ml-1 mr-2 h-4 w-4" />
                Guardar
              </>
            )}
          </button>
        </div>
      </form>
    </Modal>
  );
};
