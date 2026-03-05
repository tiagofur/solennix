import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useForm, Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { inventoryService } from "../../services/inventoryService";
import { useAuth } from "../../contexts/AuthContext";
import { ArrowLeft, Save } from "lucide-react";
import { logError } from "../../lib/errorHandler";
import { usePlanLimits } from "../../hooks/usePlanLimits";
import { UpgradeBanner } from "../../components/UpgradeBanner";

const inventorySchema = z.object({
  ingredient_name: z
    .string()
    .min(2, "El nombre debe tener al menos 2 caracteres"),
  type: z.enum(["ingredient", "equipment"]),
  current_stock: z.coerce
    .number()
    .min(0, "El stock no puede ser negativo"),
  minimum_stock: z.coerce
    .number()
    .min(0, "El stock mínimo no puede ser negativo"),
  unit: z.string().min(1, "La unidad es requerida"),
  unit_cost: z.coerce
    .number()
    .min(0, "El costo no puede ser negativo")
    .optional(),
});

type InventoryFormData = z.infer<typeof inventorySchema>;

export const InventoryForm: React.FC = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { canCreateCatalogItem, catalogCount, catalogLimit, loading: limitsLoading } = usePlanLimits();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<InventoryFormData>({
    resolver: zodResolver(inventorySchema) as Resolver<InventoryFormData>,
    defaultValues: {
      type: "ingredient",
      current_stock: 0,
      minimum_stock: 0,
      unit_cost: 0,
    },
  });

  useEffect(() => {
    if (id) {
      loadItem(id);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const loadItem = async (itemId: string) => {
    try {
      setIsLoading(true);
      const item = await inventoryService.getById(itemId);
      if (!item) {
        throw new Error('Item no encontrado');
      }
      reset({
        ingredient_name: item.ingredient_name || "",
        type: (item.type as "ingredient" | "equipment") || "ingredient",
        current_stock: item.current_stock || 0,
        minimum_stock: item.minimum_stock || 0,
        unit: item.unit || "",
        unit_cost: item.unit_cost || 0,
      });
    } catch (err) {
      logError("Error loading item", err);
      setError("Error al cargar el ítem");
    } finally {
      setIsLoading(false);
    }
  };

  const onSubmit = async (data: InventoryFormData) => {
    if (!user) return;

    setIsLoading(true);
    setError(null);

    try {
      if (id) {
        await inventoryService.update(id, {
          ...data,
          type: data.type || "ingredient",
          unit_cost: data.unit_cost || null,
        });
      } else {
        await inventoryService.create({
          ...data,
          user_id: user.id,
          type: data.type || "ingredient",
          unit_cost: data.unit_cost || null,
        });
      }
      navigate("/inventory");
    } catch (err: any) {
      logError("Error saving item", err);
      setError(err.message || "Error al guardar el ítem");
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

  if (!id && !canCreateCatalogItem) {
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
          <UpgradeBanner type="limit-reached" resource="catalog" currentUsage={catalogCount} limit={catalogLimit} />
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
            onClick={() => navigate("/inventory")}
            className="mr-4 p-2 rounded-full hover:bg-surface-alt text-text-secondary transition-colors"
            aria-label="Volver a la lista de inventario"
          >
            <ArrowLeft className="h-5 w-5" aria-hidden="true" />
          </button>
          <h1 className="text-2xl font-bold text-text">
            {id ? "Editar Ítem" : "Nuevo Ítem"}
          </h1>
        </div>
      </div>

      <div className="bg-card shadow-sm border border-border px-4 py-8 rounded-3xl sm:p-10">
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
            <div className="sm:col-span-4">
              <label
                htmlFor="ingredient_name"
                className="block text-sm font-medium text-text-secondary mb-2"
              >
                Nombre del Ítem *
              </label>
              <input
                id="ingredient_name"
                type="text"
                {...register("ingredient_name")}
                className="w-full rounded-xl shadow-sm border border-border bg-card text-text p-3 transition-shadow focus:ring-2 focus:ring-brand-orange/20"
                aria-required="true"
                aria-invalid={errors.ingredient_name ? "true" : "false"}
                aria-describedby={errors.ingredient_name ? "ingredient_name-error" : undefined}
              />
              {errors.ingredient_name && (
                <p id="ingredient_name-error" className="mt-2 text-sm text-red-600 dark:text-red-400" role="alert">
                  {errors.ingredient_name.message}
                </p>
              )}
            </div>

            <div className="sm:col-span-2">
              <label
                htmlFor="type"
                className="block text-sm font-medium text-text-secondary mb-2"
              >
                Tipo *
              </label>
              <select
                id="type"
                {...register("type")}
                className="w-full rounded-xl shadow-sm border border-border bg-card text-text p-3 transition-shadow focus:ring-2 focus:ring-brand-orange/20"
                aria-required="true"
                aria-invalid={errors.type ? "true" : "false"}
                aria-describedby={errors.type ? "type-error" : undefined}
              >
                <option value="ingredient">Insumo (Consumible)</option>
                <option value="equipment">
                  Activo / Equipo (Retornable)
                </option>
              </select>
              {errors.type && (
                <p id="type-error" className="mt-2 text-sm text-red-600 dark:text-red-400" role="alert">
                  {errors.type.message}
                </p>
              )}
            </div>

            <div className="sm:col-span-2">
              <label
                htmlFor="unit"
                className="block text-sm font-medium text-text-secondary mb-2"
              >
                Unidad (kg, l, pza, etc.) *
              </label>
              <input
                id="unit"
                type="text"
                {...register("unit")}
                className="w-full rounded-xl shadow-sm border border-border bg-card text-text p-3 transition-shadow focus:ring-2 focus:ring-brand-orange/20"
                placeholder="Ej. kg, Litros"
                aria-required="true"
                aria-invalid={errors.unit ? "true" : "false"}
                aria-describedby={errors.unit ? "unit-error" : undefined}
              />
              {errors.unit && (
                <p id="unit-error" className="mt-2 text-sm text-red-600 dark:text-red-400" role="alert">
                  {errors.unit.message}
                </p>
              )}
            </div>

            <div className="sm:col-span-2">
              <label
                htmlFor="current_stock"
                className="block text-sm font-medium text-text-secondary mb-2"
              >
                Stock Actual *
              </label>
              <input
                id="current_stock"
                type="number"
                step="0.01"
                {...register("current_stock")}
                className="w-full rounded-xl shadow-sm border border-border bg-card text-text p-3 transition-shadow focus:ring-2 focus:ring-brand-orange/20"
                aria-required="true"
                aria-invalid={errors.current_stock ? "true" : "false"}
                aria-describedby={errors.current_stock ? "current_stock-error" : undefined}
              />
              {errors.current_stock && (
                <p id="current_stock-error" className="mt-2 text-sm text-red-600 dark:text-red-400" role="alert">
                  {errors.current_stock.message}
                </p>
              )}
            </div>

            <div className="sm:col-span-2">
              <label
                htmlFor="minimum_stock"
                className="block text-sm font-medium text-text-secondary mb-2"
              >
                Stock Mínimo *
              </label>
              <input
                id="minimum_stock"
                type="number"
                step="0.01"
                {...register("minimum_stock")}
                className="w-full rounded-xl shadow-sm border border-border bg-card text-text p-3 transition-shadow focus:ring-2 focus:ring-brand-orange/20"
                aria-required="true"
                aria-invalid={errors.minimum_stock ? "true" : "false"}
                aria-describedby={errors.minimum_stock ? "minimum_stock-error" : undefined}
              />
              {errors.minimum_stock && (
                <p id="minimum_stock-error" className="mt-2 text-sm text-red-600 dark:text-red-400" role="alert">
                  {errors.minimum_stock.message}
                </p>
              )}
            </div>

            <div className="sm:col-span-2">
              <label
                htmlFor="unit_cost"
                className="block text-sm font-medium text-text-secondary mb-2"
              >
                Costo Unitario ($)
              </label>
              <input
                id="unit_cost"
                type="number"
                step="0.01"
                {...register("unit_cost")}
                className="w-full rounded-xl shadow-sm border border-border bg-card text-text p-3 transition-shadow focus:ring-2 focus:ring-brand-orange/20"
                aria-invalid={errors.unit_cost ? "true" : "false"}
                aria-describedby={errors.unit_cost ? "unit_cost-error" : undefined}
              />
              {errors.unit_cost && (
                <p id="unit_cost-error" className="mt-2 text-sm text-red-600 dark:text-red-400" role="alert">
                  {errors.unit_cost.message}
                </p>
              )}
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-6 border-t border-border">
            <button
              type="button"
              onClick={() => navigate("/inventory")}
              className="bg-card py-2.5 px-6 border border-border rounded-xl shadow-sm text-sm font-medium text-text-secondary hover:bg-surface-alt transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="inline-flex justify-center py-2.5 px-8 border border-transparent shadow-sm text-sm font-medium rounded-xl text-white bg-brand-orange hover:bg-orange-600 focus:outline-hidden focus:ring-2 focus:ring-offset-2 focus:ring-brand-orange disabled:opacity-50 transition-colors"
              aria-label={isLoading ? "Guardando ítem..." : "Guardar ítem"}
            >
              <Save className="h-5 w-5 mr-2" aria-hidden="true" />
              {isLoading ? "Guardando..." : "Guardar Ítem"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
