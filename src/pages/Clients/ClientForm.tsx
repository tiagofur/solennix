import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { clientService } from "../../services/clientService";
import { useAuth } from "../../contexts/AuthContext";
import { ArrowLeft, Save } from "lucide-react";
import { logError } from "../../lib/errorHandler";

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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center">
          <button
            onClick={() => navigate("/clients")}
            className="mr-4 p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500 dark:text-gray-400"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            {id ? "Editar Cliente" : "Nuevo Cliente"}
          </h1>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 shadow px-4 py-5 sm:rounded-lg sm:p-6">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {error && (
            <div className="bg-red-50 dark:bg-red-900/20 border-l-4 border-red-400 p-4">
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
                  type="text"
                  {...register("name")}
                  className="shadow-sm focus:ring-brand-orange focus:border-brand-orange block w-full sm:text-sm border-gray-300 dark:border-gray-600 rounded-md p-2 border bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
                {errors.name && (
                  <p className="mt-2 text-sm text-red-600 dark:text-red-400">
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
                  type="text"
                  {...register("phone")}
                  className="shadow-sm focus:ring-brand-orange focus:border-brand-orange block w-full sm:text-sm border-gray-300 dark:border-gray-600 rounded-md p-2 border bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
                {errors.phone && (
                  <p className="mt-2 text-sm text-red-600 dark:text-red-400">
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
                  type="email"
                  {...register("email")}
                  className="shadow-sm focus:ring-brand-orange focus:border-brand-orange block w-full sm:text-sm border-gray-300 dark:border-gray-600 rounded-md p-2 border bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
                {errors.email && (
                  <p className="mt-2 text-sm text-red-600 dark:text-red-400">
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
                  type="text"
                  {...register("address")}
                  className="shadow-sm focus:ring-brand-orange focus:border-brand-orange block w-full sm:text-sm border-gray-300 dark:border-gray-600 rounded-md p-2 border bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
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
                  type="text"
                  {...register("city")}
                  className="shadow-sm focus:ring-brand-orange focus:border-brand-orange block w-full sm:text-sm border-gray-300 dark:border-gray-600 rounded-md p-2 border bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
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
                  {...register("notes")}
                  rows={3}
                  className="shadow-sm focus:ring-brand-orange focus:border-brand-orange block w-full sm:text-sm border-gray-300 dark:border-gray-600 rounded-md p-2 border bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              </div>
            </div>
          </div>

          <div className="flex justify-end">
            <button
              type="button"
              onClick={() => navigate("/clients")}
              className="bg-white dark:bg-gray-700 py-2 px-4 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-orange mr-3"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-brand-orange hover:bg-orange-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-orange disabled:opacity-50"
            >
              <Save className="h-5 w-5 mr-2" />
              {isLoading ? "Guardando..." : "Guardar"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
