import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { inventoryService } from "../../services/inventoryService";
import { useAuth } from "../../contexts/AuthContext";
import { ArrowLeft, Save } from "lucide-react";

const inventorySchema = z.object({
  ingredient_name: z
    .string()
    .min(2, "El nombre debe tener al menos 2 caracteres"),
  type: z.enum(["ingredient", "equipment"]),
  current_stock: z.coerce.number().min(0, "El stock no puede ser negativo"),
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

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<InventoryFormData>({
    resolver: zodResolver(inventorySchema) as any,
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
      console.error("Error loading item:", err);
      setError("Error al cargar el ingrediente");
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
      console.error("Error saving item:", err);
      setError(err.message || "Error al guardar el ingrediente");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center">
          <button
            onClick={() => navigate("/inventory")}
            className="mr-4 p-2 rounded-full hover:bg-gray-100 text-gray-500"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <h1 className="text-2xl font-bold text-gray-900">
            {id ? "Editar Ingrediente" : "Nuevo Ingrediente"}
          </h1>
        </div>
      </div>

      <div className="bg-white shadow px-4 py-5 sm:rounded-lg sm:p-6">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {error && (
            <div className="bg-red-50 border-l-4 border-red-400 p-4">
              <div className="flex">
                <div className="ml-3">
                  <p className="text-sm text-red-700">{error}</p>
                </div>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 gap-y-6 gap-x-4 sm:grid-cols-6">
            <div className="sm:col-span-4">
              <label
                htmlFor="ingredient_name"
                className="block text-sm font-medium text-gray-700"
              >
                Nombre del Ítem *
              </label>
              <div className="mt-1">
                <input
                  type="text"
                  {...register("ingredient_name")}
                  className="shadow-sm focus:ring-brand-orange focus:border-brand-orange block w-full sm:text-sm border-gray-300 rounded-md p-2 border"
                />
                {errors.ingredient_name && (
                  <p className="mt-2 text-sm text-red-600">
                    {errors.ingredient_name.message}
                  </p>
                )}
              </div>
            </div>

            <div className="sm:col-span-2">
              <label
                htmlFor="type"
                className="block text-sm font-medium text-gray-700"
              >
                Tipo *
              </label>
              <div className="mt-1">
                <select
                  {...register("type")}
                  className="shadow-sm focus:ring-brand-orange focus:border-brand-orange block w-full sm:text-sm border-gray-300 rounded-md p-2 border"
                >
                  <option value="ingredient">Ingrediente (Consumible)</option>
                  <option value="equipment">
                    Activo / Equipo (Retornable)
                  </option>
                </select>
                {errors.type && (
                  <p className="mt-2 text-sm text-red-600">
                    {errors.type.message}
                  </p>
                )}
              </div>
            </div>

            <div className="sm:col-span-2">
              <label
                htmlFor="unit"
                className="block text-sm font-medium text-gray-700"
              >
                Unidad (kg, l, pza, etc.) *
              </label>
              <div className="mt-1">
                <input
                  type="text"
                  {...register("unit")}
                  className="shadow-sm focus:ring-brand-orange focus:border-brand-orange block w-full sm:text-sm border-gray-300 rounded-md p-2 border"
                />
                {errors.unit && (
                  <p className="mt-2 text-sm text-red-600">
                    {errors.unit.message}
                  </p>
                )}
              </div>
            </div>

            <div className="sm:col-span-2">
              <label
                htmlFor="current_stock"
                className="block text-sm font-medium text-gray-700"
              >
                Stock Actual *
              </label>
              <div className="mt-1">
                <input
                  type="number"
                  step="0.01"
                  {...register("current_stock")}
                  className="shadow-sm focus:ring-brand-orange focus:border-brand-orange block w-full sm:text-sm border-gray-300 rounded-md p-2 border"
                />
                {errors.current_stock && (
                  <p className="mt-2 text-sm text-red-600">
                    {errors.current_stock.message}
                  </p>
                )}
              </div>
            </div>

            <div className="sm:col-span-2">
              <label
                htmlFor="minimum_stock"
                className="block text-sm font-medium text-gray-700"
              >
                Stock Mínimo *
              </label>
              <div className="mt-1">
                <input
                  type="number"
                  step="0.01"
                  {...register("minimum_stock")}
                  className="shadow-sm focus:ring-brand-orange focus:border-brand-orange block w-full sm:text-sm border-gray-300 rounded-md p-2 border"
                />
                {errors.minimum_stock && (
                  <p className="mt-2 text-sm text-red-600">
                    {errors.minimum_stock.message}
                  </p>
                )}
              </div>
            </div>

            <div className="sm:col-span-2">
              <label
                htmlFor="unit_cost"
                className="block text-sm font-medium text-gray-700"
              >
                Costo Unitario ($)
              </label>
              <div className="mt-1">
                <input
                  type="number"
                  step="0.01"
                  {...register("unit_cost")}
                  className="shadow-sm focus:ring-brand-orange focus:border-brand-orange block w-full sm:text-sm border-gray-300 rounded-md p-2 border"
                />
                {errors.unit_cost && (
                  <p className="mt-2 text-sm text-red-600">
                    {errors.unit_cost.message}
                  </p>
                )}
              </div>
            </div>
          </div>

          <div className="flex justify-end">
            <button
              type="button"
              onClick={() => navigate("/inventory")}
              className="bg-white py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-orange mr-3"
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
