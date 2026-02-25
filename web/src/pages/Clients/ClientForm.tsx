import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { clientService } from "../../services/clientService";
import { useAuth } from "../../contexts/AuthContext";
import { ArrowLeft, Save } from "lucide-react";
import { logError } from "../../lib/errorHandler";
import { usePlanLimits } from "../../hooks/usePlanLimits";
import { UpgradeBanner } from "../../components/UpgradeBanner";

const clientSchema = z.object({
  name: z.string().min(2, "El nombre debe tener al menos 2 caracteres"),
  phone: z.string().min(10, "El teléfono debe tener al menos 10 dígitos"),
  email: z.string().email("Email inválido").optional().or(z.literal("")),
  address: z.string().optional(),
  city: z.string().optional(),
  notes: z.string().optional(),
});

type ClientFormData = z.infer<typeof clientSchema>;

export const ClientForm: React.FC = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { canCreateClient, clientsCount, clientLimit, loading: limitsLoading } = usePlanLimits();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<ClientFormData>({
    resolver: zodResolver(clientSchema),
  });

  useEffect(() => {
    if (id) {
      loadClient(id);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const loadClient = async (clientId: string) => {
    try {
      setIsLoading(true);
      const client = await clientService.getById(clientId);
      if (!client) {
        throw new Error('Cliente no encontrado');
      }
      reset({
        name: client.name || "",
        phone: client.phone || "",
        email: client.email || "",
        address: client.address || "",
        city: client.city || "",
        notes: client.notes || "",
      });
    } catch (err) {
      logError("Error loading client", err);
      setError("Error al cargar el cliente");
    } finally {
      setIsLoading(false);
    }
  };

  const onSubmit = async (data: ClientFormData) => {
    if (!user) return;

    setIsLoading(true);
    setError(null);

    try {
      if (id) {
        await clientService.update(id, {
          ...data,
          email: data.email || null, // Convert empty string to null
        });
      } else {
        await clientService.create({
          ...data,
          user_id: user.id,
          email: data.email || null,
        });
      }
      navigate("/clients");
    } catch (err: any) {
      logError("Error saving client", err);
      setError(err.message || "Error al guardar el cliente");
    } finally {
      setIsLoading(false);
    }
  };

  if (limitsLoading) {
    return (
      <div className="flex justify-center items-center h-64" role="status" aria-live="polite">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-orange" aria-hidden="true"></div>
        <span className="sr-only">Cargando límites de plan...</span>
      </div>
    );
  }

  if (!id && !canCreateClient) {
    return (
      <div className="max-w-4xl mx-auto py-8 px-4">
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="mb-6 flex items-center text-sm font-medium text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors"
          aria-label="Regresar a la página anterior"
        >
          <ArrowLeft className="h-4 w-4 mr-1" aria-hidden="true" />
          Regresar
        </button>
        <div className="flex justify-center mt-12">
          <UpgradeBanner type="limit-reached" resource="clients" currentUsage={clientsCount} limit={clientLimit} />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center">
          <button
            type="button"
            onClick={() => navigate("/clients")}
            className="mr-4 p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500 dark:text-gray-400"
            aria-label="Volver a la lista de clientes"
          >
            <ArrowLeft className="h-5 w-5" aria-hidden="true" />
          </button>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            {id ? "Editar Cliente" : "Nuevo Cliente"}
          </h1>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 shadow-sm px-4 py-5 sm:rounded-lg sm:p-6">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {error && (
            <div className="bg-red-50 dark:bg-red-900/20 border-l-4 border-red-400 p-4" role="alert">
              <div className="flex">
                <div className="ml-3">
                  <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
                </div>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 gap-y-6 gap-x-4 sm:grid-cols-6">
            <div className="sm:col-span-3">
              <label
                htmlFor="name"
                className="block text-sm font-medium text-gray-700 dark:text-gray-300"
              >
                Nombre Completo *
              </label>
              <div className="mt-1">
                <input
                  id="name"
                  type="text"
                  {...register("name")}
                  className="shadow-xs focus:ring-brand-orange focus:border-brand-orange block w-full sm:text-sm border-gray-300 dark:border-gray-600 rounded-md p-2 border bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  aria-required="true"
                  aria-invalid={errors.name ? "true" : "false"}
                  aria-describedby={errors.name ? "name-error" : undefined}
                />
                {errors.name && (
                  <p id="name-error" className="mt-2 text-sm text-red-600 dark:text-red-400" role="alert">
                    {errors.name.message}
                  </p>
                )}
              </div>
            </div>

            <div className="sm:col-span-3">
              <label
                htmlFor="phone"
                className="block text-sm font-medium text-gray-700 dark:text-gray-300"
              >
                Teléfono *
              </label>
              <div className="mt-1">
                <input
                  id="phone"
                  type="text"
                  {...register("phone")}
                  className="shadow-xs focus:ring-brand-orange focus:border-brand-orange block w-full sm:text-sm border-gray-300 dark:border-gray-600 rounded-md p-2 border bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  aria-required="true"
                  aria-invalid={errors.phone ? "true" : "false"}
                  aria-describedby={errors.phone ? "phone-error" : undefined}
                />
                {errors.phone && (
                  <p id="phone-error" className="mt-2 text-sm text-red-600 dark:text-red-400" role="alert">
                    {errors.phone.message}
                  </p>
                )}
              </div>
            </div>

            <div className="sm:col-span-4">
              <label
                htmlFor="email"
                className="block text-sm font-medium text-gray-700 dark:text-gray-300"
              >
                Email
              </label>
              <div className="mt-1">
                <input
                  id="email"
                  type="email"
                  {...register("email")}
                  className="shadow-xs focus:ring-brand-orange focus:border-brand-orange block w-full sm:text-sm border-gray-300 dark:border-gray-600 rounded-md p-2 border bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  aria-invalid={errors.email ? "true" : "false"}
                  aria-describedby={errors.email ? "email-error" : undefined}
                />
                {errors.email && (
                  <p id="email-error" className="mt-2 text-sm text-red-600 dark:text-red-400" role="alert">
                    {errors.email.message}
                  </p>
                )}
              </div>
            </div>

            <div className="sm:col-span-6">
              <label
                htmlFor="address"
                className="block text-sm font-medium text-gray-700 dark:text-gray-300"
              >
                Dirección
              </label>
              <div className="mt-1">
                <input
                  id="address"
                  type="text"
                  {...register("address")}
                  className="shadow-xs focus:ring-brand-orange focus:border-brand-orange block w-full sm:text-sm border-gray-300 dark:border-gray-600 rounded-md p-2 border bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              </div>
            </div>

            <div className="sm:col-span-6">
              <label
                htmlFor="city"
                className="block text-sm font-medium text-gray-700 dark:text-gray-300"
              >
                Ciudad
              </label>
              <div className="mt-1">
                <input
                  id="city"
                  type="text"
                  {...register("city")}
                  className="shadow-xs focus:ring-brand-orange focus:border-brand-orange block w-full sm:text-sm border-gray-300 dark:border-gray-600 rounded-md p-2 border bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              </div>
            </div>

            <div className="sm:col-span-6">
              <label
                htmlFor="notes"
                className="block text-sm font-medium text-gray-700 dark:text-gray-300"
              >
                Notas
              </label>
              <div className="mt-1">
                <textarea
                  id="notes"
                  {...register("notes")}
                  rows={3}
                  className="shadow-xs focus:ring-brand-orange focus:border-brand-orange block w-full sm:text-sm border-gray-300 dark:border-gray-600 rounded-md p-2 border bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              </div>
            </div>
          </div>

          <div className="flex justify-end">
            <button
              type="button"
              onClick={() => navigate("/clients")}
              className="bg-white dark:bg-gray-700 py-2 px-4 border border-gray-300 dark:border-gray-600 rounded-md shadow-xs text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-hidden focus:ring-2 focus:ring-offset-2 focus:ring-brand-orange mr-3"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="inline-flex justify-center py-2 px-4 border border-transparent shadow-xs text-sm font-medium rounded-md text-white bg-brand-orange hover:bg-orange-600 focus:outline-hidden focus:ring-2 focus:ring-offset-2 focus:ring-brand-orange disabled:opacity-50"
              aria-label={isLoading ? "Guardando cliente..." : "Guardar cliente"}
            >
              <Save className="h-5 w-5 mr-2" aria-hidden="true" />
              {isLoading ? "Guardando..." : "Guardar"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
