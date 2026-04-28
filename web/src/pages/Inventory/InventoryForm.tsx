import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useForm, Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useAuth } from "../../contexts/AuthContext";
import { ArrowLeft, Save } from "lucide-react";
import { Breadcrumb } from "../../components/Breadcrumb";
import { usePlanLimits } from "../../hooks/usePlanLimits";
import { UpgradeBanner } from "../../components/UpgradeBanner";
import { useInventoryItem, useCreateInventoryItem, useUpdateInventoryItem } from "../../hooks/queries/useInventoryQueries";

import { useTranslation } from "react-i18next";
import { useMemo } from "react";

type InventoryFormData = {
  ingredient_name: string;
  type: "ingredient" | "equipment" | "supply";
  current_stock: number;
  minimum_stock: number;
  unit: string;
  unit_cost?: number;
};

export const InventoryForm: React.FC = () => {
  const { t } = useTranslation(["inventory", "common"]);
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const [isCustomUnit, setIsCustomUnit] = useState(false);

  const COMMON_UNITS = useMemo(() => [
    { value: "pieza", label: t("inventory:form.unit_pieza", { defaultValue: "Pieza (pza)" }) },
    { value: "kg", label: t("inventory:form.unit_kg", { defaultValue: "Kilogramos (kg)" }) },
    { value: "g", label: t("inventory:form.unit_g", { defaultValue: "Gramos (g)" }) },
    { value: "l", label: t("inventory:form.unit_l", { defaultValue: "Litros (l)" }) },
    { value: "ml", label: t("inventory:form.unit_ml", { defaultValue: "Mililitros (ml)" }) },
    { value: "caja", label: t("inventory:form.unit_caja", { defaultValue: "Caja" }) },
    { value: "paquete", label: t("inventory:form.unit_paquete", { defaultValue: "Paquete" }) },
    { value: "servicio", label: t("inventory:form.unit_servicio", { defaultValue: "Servicio" }) },
    { value: "hora", label: t("inventory:form.unit_hora", { defaultValue: "Hora" }) },
    { value: "dia", label: t("inventory:form.unit_dia", { defaultValue: "Día" }) },
  ], [t]);

  const inventorySchema = useMemo(() => z.object({
    ingredient_name: z
      .string()
      .min(2, t("inventory:form.validation.name_min")),
    type: z.enum(["ingredient", "equipment", "supply"]),
    current_stock: z.coerce.number().min(0, t("inventory:form.validation.stock_min")),
    minimum_stock: z.coerce
      .number()
      .min(0, t("inventory:form.validation.minimum_stock_min")),
    unit: z.string().min(1, t("inventory:form.validation.unit_required")),
    unit_cost: z.coerce
      .number()
      .min(0, t("inventory:form.validation.cost_min"))
      .optional(),
  }), [t]);

  const {
    canCreateInventoryItem,
    inventoryCount,
    inventoryLimit,
    loading: limitsLoading,
  } = usePlanLimits();

  const { data: existingItem, isLoading: isLoadingItem } = useInventoryItem(id);
  const createItem = useCreateInventoryItem();
  const updateItemMutation = useUpdateInventoryItem();

  const isLoading = isLoadingItem || createItem.isPending || updateItemMutation.isPending;

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm<InventoryFormData>({
    resolver: zodResolver(inventorySchema) as Resolver<InventoryFormData>,
    defaultValues: {
      type: "ingredient",
      current_stock: 0,
      minimum_stock: 0,
      unit: "",
      unit_cost: 0,
    },
  });

  useEffect(() => {
    if (existingItem) {
      const isCommon = COMMON_UNITS.some((u) => u.value === existingItem.unit);
      setIsCustomUnit(existingItem.unit ? !isCommon : false);

      reset({
        ingredient_name: existingItem.ingredient_name || "",
        type:
          (existingItem.type as "ingredient" | "equipment" | "supply") || "ingredient",
        current_stock: existingItem.current_stock || 0,
        minimum_stock: existingItem.minimum_stock || 0,
        unit: existingItem.unit || "",
        unit_cost: existingItem.unit_cost || 0,
      });
    }
  }, [existingItem, reset, COMMON_UNITS]);

  const onSubmit = (data: InventoryFormData) => {
    if (!user) return;
    setError(null);

    const payload = {
      ...data,
      type: data.type || "ingredient",
      unit_cost: data.unit_cost || null,
    };

    if (id) {
      updateItemMutation.mutate(
        { id, data: payload },
        { onSuccess: () => navigate("/inventory") },
      );
    } else {
      createItem.mutate(
        payload,
        { onSuccess: () => navigate("/inventory") },
      );
    }
  };

  if (limitsLoading) {
    return (
      <div
        className="flex justify-center items-center h-64"
        role="status"
        aria-live="polite"
      >
        <div
          className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"
          aria-hidden="true"
        ></div>
        <span className="ml-3 text-sm text-text-secondary">Cargando límites de plan...</span>
      </div>
    );
  }

  if (!id && !canCreateInventoryItem) {
    return (
      <div className="max-w-4xl mx-auto py-8 px-4">
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="mb-6 flex items-center text-sm font-medium text-text-secondary hover:text-text transition-colors"
          aria-label={t("inventory:form.back_previous", { defaultValue: "Regresar a la página anterior" })}
        >
          <ArrowLeft className="h-4 w-4 mr-1" aria-hidden="true" />
          Regresar
        </button>
        <div className="flex justify-center mt-12">
          <UpgradeBanner
            type="limit-reached"
             resource="catalog"
            currentUsage={inventoryCount}
            limit={inventoryLimit}
          />
        </div>
      </div>
    );
  }

  const title = id ? t("inventory:edit_item_accessible") : t("inventory:new_item");

  return (
    <div className="space-y-6">
      <Breadcrumb items={[{ label: t("inventory:title"), href: '/inventory' }, { label: id ? (watch("ingredient_name") || title) : title }]} />
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center">
          <button
            type="button"
            onClick={() => navigate("/inventory")}
            className="mr-4 p-2 rounded-full hover:bg-surface-alt text-text-secondary transition-colors"
            aria-label={t("inventory:form.back_to_list", { defaultValue: "Volver a la lista de inventario" })}
          >
            <ArrowLeft className="h-5 w-5" aria-hidden="true" />
          </button>
          <h1 className="text-2xl font-bold text-text tracking-tight">
            {title}
          </h1>
        </div>
      </div>

      <div className="bg-card shadow-sm border border-border px-4 py-8 rounded-2xl sm:p-10">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {error && (
            <div
              className="bg-error/5 border-l-4 border-error p-4"
              role="alert"
            >
              <div className="flex">
                <div className="ml-3">
                  <p className="text-sm text-error">{error}</p>
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
                {t("inventory:form.name")} *
              </label>
              <input
                id="ingredient_name"
                type="text"
                {...register("ingredient_name")}
                className="w-full rounded-xl shadow-sm border border-border bg-card text-text p-3 transition-shadow focus:ring-2 focus:ring-primary/20"
                aria-label={t("inventory:form.name_accessible")}
                aria-required="true"
                aria-invalid={errors.ingredient_name ? "true" : "false"}
              />
              {errors.ingredient_name && (
                <p
                  className="mt-2 text-sm text-error"
                  role="alert"
                >
                  {errors.ingredient_name.message}
                </p>
              )}
            </div>

            <div className="sm:col-span-2">
              <label
                htmlFor="type"
                className="block text-sm font-medium text-text-secondary mb-2"
              >
                {t("inventory:form.type")} *
              </label>
              <select
                id="type"
                {...register("type")}
                className="w-full rounded-xl shadow-sm border border-border bg-card text-text p-3 transition-shadow focus:ring-2 focus:ring-primary/20"
                aria-required="true"
              >
                <option value="ingredient">Insumo (Consumible)</option>
                <option value="supply">
                  Insumo por Evento (Costo fijo por evento)
                </option>
                <option value="equipment">Activo / Equipo (Retornable)</option>
              </select>
              {errors.type && (
                <p
                  className="mt-2 text-sm text-error"
                  role="alert"
                >
                  {errors.type.message}
                </p>
              )}
            </div>

            <div className="sm:col-span-2">
              <label
                htmlFor="unit"
                className="block text-sm font-medium text-text-secondary mb-2"
              >
                {t("inventory:form.unit")} *
              </label>
              {!isCustomUnit ? (
                <select
                  id="unit"
                  {...register("unit", {
                    onChange: (e) => {
                      if (e.target.value === "otro") {
                        setIsCustomUnit(true);
                        setValue("unit", "", { shouldValidate: true });
                      }
                    },
                  })}
                  className="w-full rounded-xl shadow-sm border border-border bg-card text-text p-3 transition-shadow focus:ring-2 focus:ring-primary/20"
                  aria-required="true"
                >
                  <option value="" disabled>
                    {t("common:action.select")}
                  </option>
                  {COMMON_UNITS.map((u) => (
                    <option key={u.value} value={u.value}>
                      {u.label}
                    </option>
                  ))}
                  <option value="otro">{t("common:action.other")}...</option>
                </select>
              ) : (
                <div className="flex gap-2 relative">
                  <input
                    id="unit"
                    type="text"
                    {...register("unit")}
                    className="w-full rounded-xl shadow-sm border border-border bg-card text-text p-3 transition-shadow focus:ring-2 focus:ring-primary/20"
                    placeholder={t("inventory:form.unit_placeholder")}
                    aria-required="true"
                    autoFocus
                  />
                  <button
                    type="button"
                    onClick={() => {
                      setIsCustomUnit(false);
                      setValue("unit", "pieza", { shouldValidate: true });
                    }}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-text-secondary hover:text-text text-sm bg-card px-1"
                  >
                    {t("common:action.back")}
                  </button>
                </div>
              )}
              {errors.unit && (
                <p
                  className="mt-2 text-sm text-error"
                  role="alert"
                >
                  {errors.unit.message}
                </p>
              )}
            </div>

            <div className="sm:col-span-2">
              <label
                htmlFor="current_stock"
                className="block text-sm font-medium text-text-secondary mb-2"
              >
                {t("inventory:form.current_stock")} *
              </label>
              <input
                id="current_stock"
                type="number"
                step="0.01"
                {...register("current_stock")}
                className="w-full rounded-xl shadow-sm border border-border bg-card text-text p-3 transition-shadow focus:ring-2 focus:ring-primary/20"
                aria-required="true"
              />
              {errors.current_stock && (
                <p
                  className="mt-2 text-sm text-error"
                  role="alert"
                >
                  {errors.current_stock.message}
                </p>
              )}
            </div>

            <div className="sm:col-span-2">
              <label
                htmlFor="minimum_stock"
                className="block text-sm font-medium text-text-secondary mb-2"
              >
                {t("inventory:form.minimum_stock")} *
              </label>
              <input
                id="minimum_stock"
                type="number"
                step="0.01"
                {...register("minimum_stock")}
                className="w-full rounded-xl shadow-sm border border-border bg-card text-text p-3 transition-shadow focus:ring-2 focus:ring-primary/20"
                aria-required="true"
              />
              {errors.minimum_stock && (
                <p
                  className="mt-2 text-sm text-error"
                  role="alert"
                >
                  {errors.minimum_stock.message}
                </p>
              )}
            </div>

            <div className="sm:col-span-2">
              <label
                htmlFor="unit_cost"
                className="block text-sm font-medium text-text-secondary mb-2"
              >
                {t("inventory:form.cost")}
              </label>
              <input
                id="unit_cost"
                type="number"
                step="0.01"
                {...register("unit_cost")}
                className="w-full rounded-xl shadow-sm border border-border bg-card text-text p-3 transition-shadow focus:ring-2 focus:ring-primary/20"
              />
              {errors.unit_cost && (
                <p
                  className="mt-2 text-sm text-error"
                  role="alert"
                >
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
              {t("common:action.cancel")}
            </button>
            <button
              type="submit"
              disabled={isLoading}
              aria-label={isLoading ? "Guardando ítem" : t("common:action.save")}
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
