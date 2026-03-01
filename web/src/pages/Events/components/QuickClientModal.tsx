import React, { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { X, Save, Loader2 } from "lucide-react";
import { clientService } from "../../../services/clientService";
import { useAuth } from "../../../contexts/AuthContext";
import { logError } from "../../../lib/errorHandler";
import { Client } from "../../../types/entities";

const quickClientSchema = z.object({
  name: z.string().min(2, "El nombre debe tener al menos 2 caracteres"),
  phone: z.string().min(10, "El teléfono debe tener al menos 10 dígitos"),
  email: z.string().email("Email inválido").optional().or(z.literal("")),
});

type QuickClientFormData = z.infer<typeof quickClientSchema>;

interface QuickClientModalProps {
  isOpen: boolean;
  onClose: () => void;
  onClientCreated: (client: Client) => void;
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
  } = useForm<QuickClientFormData>({
    resolver: zodResolver(quickClientSchema),
  });

  const onSubmit = async (data: QuickClientFormData) => {
    if (!user) return;

    setIsLoading(true);
    setError(null);

    try {
      const newClient = await clientService.create({
        ...data,
        user_id: user.id,
        email: data.email || null,
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

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
        <div className="fixed inset-0 transition-opacity" aria-hidden="true">
          <div
            className="absolute inset-0 bg-gray-500 opacity-75"
            onClick={onClose}
          ></div>
        </div>

        <span
          className="hidden sm:inline-block sm:align-middle sm:h-screen"
          aria-hidden="true"
        >
          &#8203;
        </span>

        <div
          className="inline-block align-bottom bg-white dark:bg-gray-800 rounded-3xl text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full border border-gray-100 dark:border-gray-700"
          role="dialog"
          aria-modal="true"
          aria-labelledby="quick-client-modal-title"
          aria-describedby="quick-client-modal-description"
        >
          <div className="bg-white dark:bg-gray-800 px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
            <div className="flex justify-between items-center mb-4">
              <h3
                id="quick-client-modal-title"
                className="text-lg leading-6 font-medium text-gray-900 dark:text-white"
              >
                Nuevo Cliente Rápido
              </h3>
              <button
                type="button"
                onClick={onClose}
                className="text-gray-400 hover:text-gray-500 focus:outline-hidden"
                aria-label="Cerrar modal"
              >
                <X className="h-6 w-6" aria-hidden="true" />
              </button>
            </div>

            <p id="quick-client-modal-description" className="sr-only">
              Formulario para crear un nuevo cliente rápidamente con nombre,
              teléfono y email opcional
            </p>

            {error && (
              <div
                className="mb-4 bg-red-50 dark:bg-red-900/20 border-l-4 border-red-400 p-4"
                role="alert"
              >
                <div className="flex">
                  <div className="ml-3">
                    <p className="text-sm text-red-700 dark:text-red-300">
                      {error}
                    </p>
                  </div>
                </div>
              </div>
            )}

            <div>
              <div className="space-y-4">
                <div>
                  <label
                    htmlFor="quick-client-name"
                    className="block text-sm font-medium text-gray-700 dark:text-gray-300"
                  >
                    Nombre Completo *
                  </label>
                  <input
                    id="quick-client-name"
                    type="text"
                    {...register("name")}
                    className="mt-1 block w-full border border-gray-300 dark:border-gray-600 rounded-xl shadow-xs py-2 px-3 bg-white dark:bg-gray-700 text-gray-900 dark:text-white transition-shadow focus:ring-2 focus:ring-brand-orange/20 sm:text-sm"
                    aria-required="true"
                    aria-invalid={errors.name ? "true" : "false"}
                    aria-describedby={
                      errors.name ? "quick-client-name-error" : undefined
                    }
                  />
                  {errors.name && (
                    <p
                      id="quick-client-name-error"
                      className="mt-1 text-sm text-red-600 dark:text-red-400"
                      role="alert"
                    >
                      {errors.name.message}
                    </p>
                  )}
                </div>

                <div>
                  <label
                    htmlFor="quick-client-phone"
                    className="block text-sm font-medium text-gray-700 dark:text-gray-300"
                  >
                    Teléfono *
                  </label>
                  <input
                    id="quick-client-phone"
                    type="text"
                    {...register("phone")}
                    className="mt-1 block w-full border border-gray-300 dark:border-gray-600 rounded-xl shadow-xs py-2 px-3 bg-white dark:bg-gray-700 text-gray-900 dark:text-white transition-shadow focus:ring-2 focus:ring-brand-orange/20 sm:text-sm"
                    aria-required="true"
                    aria-invalid={errors.phone ? "true" : "false"}
                    aria-describedby={
                      errors.phone ? "quick-client-phone-error" : undefined
                    }
                  />
                  {errors.phone && (
                    <p
                      id="quick-client-phone-error"
                      className="mt-1 text-sm text-red-600 dark:text-red-400"
                      role="alert"
                    >
                      {errors.phone.message}
                    </p>
                  )}
                </div>

                <div>
                  <label
                    htmlFor="quick-client-email"
                    className="block text-sm font-medium text-gray-700 dark:text-gray-300"
                  >
                    Email
                  </label>
                  <input
                    id="quick-client-email"
                    type="email"
                    {...register("email")}
                    className="mt-1 block w-full border border-gray-300 dark:border-gray-600 rounded-xl shadow-xs py-2 px-3 bg-white dark:bg-gray-700 text-gray-900 dark:text-white transition-shadow focus:ring-2 focus:ring-brand-orange/20 sm:text-sm"
                    aria-invalid={errors.email ? "true" : "false"}
                    aria-describedby={
                      errors.email ? "quick-client-email-error" : undefined
                    }
                  />
                  {errors.email && (
                    <p
                      id="quick-client-email-error"
                      className="mt-1 text-sm text-red-600 dark:text-red-400"
                      role="alert"
                    >
                      {errors.email.message}
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="bg-gray-50 dark:bg-gray-700/50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
            <button
              type="button"
              onClick={handleSubmit(onSubmit)}
              disabled={isLoading}
              className="w-full inline-flex justify-center rounded-xl border border-transparent shadow-xs px-4 py-2 bg-brand-orange text-base font-medium text-white hover:bg-orange-600 transition-colors focus:ring-2 focus:ring-offset-2 focus:ring-brand-orange/20 sm:ml-3 sm:w-auto sm:text-sm disabled:opacity-50"
              aria-label={
                isLoading ? "Guardando cliente..." : "Guardar cliente"
              }
            >
              {isLoading ? (
                <>
                  <Loader2
                    className="animate-spin -ml-1 mr-2 h-4 w-4"
                    aria-hidden="true"
                  />
                  Guardando...
                </>
              ) : (
                <>
                  <Save className="-ml-1 mr-2 h-4 w-4" aria-hidden="true" />
                  Guardar
                </>
              )}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="mt-3 w-full inline-flex justify-center rounded-xl border border-gray-300 dark:border-gray-600 shadow-xs px-4 py-2 bg-white dark:bg-gray-800 text-base font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors focus:ring-2 focus:ring-offset-2 focus:ring-brand-orange/20 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
            >
              Cancelar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
