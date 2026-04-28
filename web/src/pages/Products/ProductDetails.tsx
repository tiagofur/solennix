import React, { useEffect, useState, useCallback } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { eventService } from "@/services/eventService";
import {
  ArrowLeft,
  Edit,
  Package,
  DollarSign,
  Tag,
  Trash2,
  Wrench,
  Layers,
  TrendingUp,
  Calendar,
  CheckCircle,
  AlertTriangle,
  Users,
  Fuel,
} from "lucide-react";
import { logError } from "@/lib/errorHandler";
import { OptimizedImage } from "@/components/OptimizedImage";
import { Breadcrumb } from "@/components/Breadcrumb";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { SkeletonCard } from "@/components/Skeleton";
import clsx from "clsx";
import { useProduct, useProductIngredients, useDeleteProduct } from "@/hooks/queries/useProductQueries";
import type { ProductIngredientWithInventory } from "@/services/productService";
import { parseEventDate } from "@/lib/dateUtils";

type ProductIngredientRow = ProductIngredientWithInventory;

type EventWithClientName = { client?: { name: string } | null };

type DemandEntry = {
  date: string;
  eventId: string;
  eventName?: string;
  quantity: number;
  numPeople: number;
};

export const ProductDetails: React.FC = () => {
  const { t, i18n } = useTranslation(["products", "common", "clients"]);
  const { id } = useParams();
  const navigate = useNavigate();
  const { data: product, isLoading: productLoading, error: productError } = useProduct(id);
  const { data: ingredients = [] } = useProductIngredients(id);
  const deleteProductMutation = useDeleteProduct();
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
  const [demandForecast, setDemandForecast] = useState<DemandEntry[]>([]);
  const [demandLoading, setDemandLoading] = useState(false);

  const moneyLocale = i18n.language === "en" ? "en-US" : "es-MX";

  const loading = productLoading;
  const error = productError ? t("products:form.validation.loading_error") : null;

  const loadDemandForecast = useCallback(async (productId: string) => {
    try {
      setDemandLoading(true);

      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const allEvents = await eventService.getAll();
      const upcomingConfirmed = allEvents.filter(
        (e) => e.status === "confirmed" && parseEventDate(e.event_date) >= today,
      );

      if (upcomingConfirmed.length === 0) {
        setDemandForecast([]);
        return;
      }

      const entries: DemandEntry[] = [];

      await Promise.all(
        upcomingConfirmed.map(async (event) => {
          try {
            const products = await eventService.getProducts(event.id);
            const match = (products || []).find(
              (p: { product_id: string; quantity: number }) => p.product_id === productId,
            );
            if (match) {
              entries.push({
                date: event.event_date.slice(0, 10),
                eventId: event.id,
                eventName: (event as EventWithClientName).client?.name
                  ? `${t("common:nav.events")} - ${(event as EventWithClientName).client.name}`
                  : event.service_type || t("common:nav.events"),
                quantity: match.quantity,
                numPeople: event.num_people || 0,
              });
            }
          } catch {
            // skip failed events
          }
        }),
      );

      entries.sort((a, b) => a.date.localeCompare(b.date));
      setDemandForecast(entries);
    } catch (err) {
      logError("Error loading demand forecast", err);
    } finally {
      setDemandLoading(false);
    }
  }, [t]);

  useEffect(() => {
    if (id && product) {
      loadDemandForecast(id);
    }
  }, [id, product, loadDemandForecast]);

  const handleDeleteProduct = useCallback(() => {
    if (!id) return;
    deleteProductMutation.mutate(id, {
      onSuccess: () => navigate("/products"),
      onSettled: () => setConfirmDeleteOpen(false),
    });
  }, [id, deleteProductMutation, navigate]);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <div className="h-9 w-9 rounded-full bg-surface-alt animate-pulse" />
          <div className="space-y-1">
            <div className="h-7 w-48 rounded-md bg-surface-alt animate-pulse" />
            <div className="h-5 w-20 rounded-full bg-surface-alt animate-pulse" />
          </div>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="bg-card rounded-2xl border border-border p-5"
            >
              <div className="h-3 w-20 rounded-md bg-surface-alt animate-pulse mb-3" />
              <div className="h-8 w-16 rounded-md bg-surface-alt animate-pulse" />
            </div>
          ))}
        </div>
        <div className="bg-card rounded-2xl border border-border p-6">
          <SkeletonCard rows={3} />
        </div>
        <div className="bg-card rounded-2xl border border-border p-6">
          <SkeletonCard rows={4} />
        </div>
      </div>
    );
  }

  if (error || !product) {
    return (
      <div className="text-center p-8">
        <p className="text-error">{error || t("products:list.no_results")}</p>
        <button
          type="button"
          onClick={() => navigate("/products")}
          className="mt-4 text-primary hover:underline"
        >
          {t("products:details.back_to_products")}
        </button>
      </div>
    );
  }

  const unitCost = ingredients
    .filter((i: ProductIngredientRow) => i.type === "ingredient")
    .reduce(
      (sum: number, ing: ProductIngredientRow) =>
        sum + ing.quantity_required * (ing.unit_cost || 0),
      0,
    );

  const margin =
    product.base_price > 0
      ? ((product.base_price - unitCost) / product.base_price) * 100
      : 0;

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const in7Days = new Date(today);
  in7Days.setDate(in7Days.getDate() + 7);

  const demand7Days = demandForecast
    .filter((d) => {
      const date = new Date(d.date + "T00:00:00");
      return date >= today && date <= in7Days;
    })
    .reduce((sum, d) => sum + d.quantity, 0);

  const totalDemand = demandForecast.reduce((sum, d) => sum + d.quantity, 0);
  const estimatedRevenue = totalDemand * product.base_price;

  return (
    <div className="space-y-6">
      <ConfirmDialog
        open={confirmDeleteOpen}
        title={t("products:details.delete_confirm_title")}
        description={t("products:details.delete_confirm_desc")}
        confirmText={t("common:action.delete")}
        cancelText={t("common:action.cancel")}
        onConfirm={handleDeleteProduct}
        onCancel={() => setConfirmDeleteOpen(false)}
      />

      <Breadcrumb items={[{ label: t("products:title"), href: '/products' }, { label: product.name }]} />

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={() => navigate("/products")}
            className="p-2 rounded-full hover:bg-surface-alt text-text-secondary transition-colors"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-text">
              {product.name}
            </h1>
            <span className="px-2.5 py-0.5 mt-1 inline-flex text-xs font-semibold rounded-full bg-primary/10 text-primary border border-primary/20">
              {product.category}
            </span>
          </div>
        </div>
        <div className="flex gap-2">
          <Link
            to={`/products/${id}/edit`}
            className="inline-flex items-center px-4 py-2 border border-border rounded-xl bg-card text-sm font-medium text-text-secondary hover:bg-surface-alt transition-colors"
          >
            <Edit className="h-4 w-4 mr-2" />
            {t("common:action.edit")}
          </Link>
          <button
            type="button"
            onClick={() => setConfirmDeleteOpen(true)}
            className="inline-flex items-center px-4 py-2 border border-error/20 rounded-xl bg-error/5 text-sm font-medium text-error hover:bg-error/10 transition-colors"
          >
            <Trash2 className="h-4 w-4 mr-2" />
            {t("common:action.delete")}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-card rounded-2xl border border-border p-5 shadow-sm">
          <div className="flex items-center gap-2 mb-2">
            <DollarSign className="h-4 w-4 text-primary" />
            <p className="text-xs text-text-secondary uppercase tracking-wide">
              {t("products:form.base_price")}
            </p>
          </div>
          <p className="text-3xl font-black text-text">
            $
            {product.base_price.toLocaleString(moneyLocale, {
              minimumFractionDigits: 2,
            })}
          </p>
          <p className="text-xs text-text-secondary mt-1">{t("products:details.per_unit")}</p>
        </div>

        <div className="bg-card rounded-2xl border border-border p-5 shadow-sm">
          <div className="flex items-center gap-2 mb-2">
            <Layers className="h-4 w-4 text-text-secondary" />
            <p className="text-xs text-text-secondary uppercase tracking-wide">
              {t("products:details.unit_cost")}
            </p>
          </div>
          <p className="text-3xl font-black text-text">
            ${unitCost.toLocaleString(moneyLocale, { minimumFractionDigits: 2 })}
          </p>
          <p className="text-xs text-text-secondary mt-1">{t("products:details.in_supplies")}</p>
        </div>

        <div
          className={clsx(
            "rounded-2xl border p-5 shadow-sm",
            margin >= 50
              ? "bg-success/5 border-success/20"
              : margin >= 20
                ? "bg-card border-border"
                : "bg-warning/5 border-warning/20",
          )}
        >
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp
              className={clsx(
                "h-4 w-4",
                margin >= 50
                  ? "text-success"
                  : margin >= 20
                    ? "text-primary"
                    : "text-warning",
              )}
            />
            <p className="text-xs text-text-secondary uppercase tracking-wide">
              {t("products:details.margin")}
            </p>
          </div>
          <p
            className={clsx(
              "text-3xl font-black",
              margin >= 50
                ? "text-success"
                : margin >= 20
                  ? "text-text"
                  : "text-warning",
            )}
          >
            {margin.toFixed(1)}%
          </p>
          <p className="text-xs text-text-secondary mt-1">{t("products:details.margin_desc")}</p>
        </div>

        <div className="bg-card rounded-2xl border border-border p-5 shadow-sm">
          <div className="flex items-center gap-2 mb-2">
            <Calendar className="h-4 w-4 text-primary" />
            <p className="text-xs text-text-secondary uppercase tracking-wide">
              {t("products:details.upcoming_events")}
            </p>
          </div>
          {demandLoading ? (
            <div className="h-8 w-10 rounded-md bg-surface-alt animate-pulse" />
          ) : (
            <p className="text-3xl font-black text-text">
              {demandForecast.length}
            </p>
          )}
          <p className="text-xs text-text-secondary mt-1">{t("clients:details.confirmed")}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-card rounded-2xl border border-border p-6 shadow-sm">
            {product.image_url && (
              <OptimizedImage
                src={product.image_url}
                alt={product.name}
                className="w-full h-40 object-cover rounded-2xl mb-4"
              />
            )}
            {!product.image_url && (
              <div className="w-full h-40 rounded-2xl bg-primary/10 flex items-center justify-center mb-4">
                <Package className="h-12 w-12 text-primary opacity-40" />
              </div>
            )}
            <h2 className="text-sm font-semibold text-text-secondary uppercase tracking-wider mb-4 border-b border-border pb-2">
              {t("clients:details.general_info")}
            </h2>
            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <Tag className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs text-text-secondary">{t("products:form.category")}</p>
                  <p className="text-sm font-medium text-text">
                    {product.category}
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <DollarSign className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs text-text-secondary">{t("products:form.base_price")}</p>
                  <p className="text-sm font-medium text-text">
                    $
                    {product.base_price.toLocaleString(moneyLocale, {
                      minimumFractionDigits: 2,
                    })}
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Layers className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs text-text-secondary">{t("products:form.composition")}</p>
                  <p className="text-sm font-medium text-text">
                    {ingredients.length}{" "}
                    {t("products:list.ingredients")}
                    {ingredients.filter((i: ProductIngredientRow) => i.type === "supply")
                      .length > 0 &&
                      `, ${ingredients.filter((i: ProductIngredientRow) => i.type === "supply").length} ${t("products:form.add_supply")}`}
                    {ingredients.filter((i: ProductIngredientRow) => i.type === "equipment")
                      .length > 0 &&
                      `, ${ingredients.filter((i: ProductIngredientRow) => i.type === "equipment").length} ${t("products:form.equipment")}`}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {!demandLoading && (
            <div
              className={clsx(
                "rounded-2xl border p-5 shadow-sm",
                demand7Days > 0
                  ? "bg-primary/5 border-primary/20"
                  : demandForecast.length > 0
                    ? "bg-card border-border"
                    : "bg-card border-border",
              )}
            >
              <div className="flex items-start gap-3">
                {demand7Days > 0 ? (
                  <AlertTriangle className="h-6 w-6 text-primary shrink-0 mt-0.5" />
                ) : (
                  <CheckCircle className="h-6 w-6 text-success shrink-0 mt-0.5" />
                )}
                <div className="flex-1">
                  <p
                    className={clsx(
                      "font-semibold text-sm",
                      demand7Days > 0 ? "text-primary" : "text-success",
                    )}
                  >
                    {demand7Days > 0
                      ? t("products:details.demand_warning", { count: demand7Days })
                      : demandForecast.length > 0
                        ? t("products:details.demand_no_urgent")
                        : t("products:details.demand_no_events")}
                  </p>
                  <p className="text-sm text-text-secondary mt-1">
                    {demand7Days > 0 ? (
                      <>
                        {t("products:details.demand_high_this_week")}{" "}
                        {estimatedRevenue > 0 && (
                          <>
                            {t("products:details.estimated_revenue")}:{" "}
                            <strong className="text-text">
                              $
                              {estimatedRevenue.toLocaleString(moneyLocale, {
                                minimumFractionDigits: 2,
                              })}
                            </strong>
                            .
                          </>
                        )}
                      </>
                    ) : demandForecast.length > 0 ? (
                      <>
                        {t("products:details.demand_forecast_summary", { 
                          units: totalDemand, 
                          events: demandForecast.length 
                        })}
                      </>
                    ) : (
                      t("products:details.demand_no_data")
                    )}
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="lg:col-span-2 space-y-6">
          <div className="bg-card rounded-2xl border border-border p-6 shadow-sm">
            <div className="flex items-center gap-2 mb-4 pb-4 border-b border-border">
              <Calendar className="h-5 w-5 text-primary" />
              <h2 className="text-sm font-semibold text-text">
                {t("products:details.demand_by_date")}
              </h2>
              <span className="ml-auto text-xs text-text-secondary">
                {t("clients:details.confirmed")}
              </span>
            </div>

            {demandLoading ? (
              <SkeletonCard rows={3} />
            ) : demandForecast.length === 0 ? (
              <div className="text-center py-10">
                <Calendar className="h-9 w-9 text-text-secondary opacity-25 mx-auto mb-3" />
                <p className="text-sm text-text-secondary">
                  {t("products:details.demand_no_data")}
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {demandForecast.map((entry, idx) => {
                  const dateObj = new Date(entry.date + "T00:00:00");
                  const diffDays = Math.ceil(
                    (dateObj.getTime() - today.getTime()) /
                      (1000 * 60 * 60 * 24),
                  );
                  const isUrgent = diffDays <= 3;

                  return (
                    <div
                      key={`${entry.eventId}-${idx}`}
                      className={clsx(
                        "flex items-center justify-between px-4 py-3 rounded-xl border",
                        isUrgent
                          ? "bg-primary/5 border-primary/20"
                          : diffDays <= 7
                            ? "bg-warning/5 border-warning/20"
                            : "bg-surface-alt border-border",
                      )}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div
                          className={clsx(
                            "w-2 h-2 rounded-full shrink-0",
                            isUrgent
                              ? "bg-primary"
                              : diffDays <= 7
                                ? "bg-warning"
                                : "bg-primary/40",
                          )}
                        />
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-sm font-medium text-text">
                              {dateObj.toLocaleDateString(moneyLocale, {
                                day: "numeric",
                                month: "short",
                              })}
                            </span>
                            {diffDays === 0 && (
                              <span className="text-xs bg-primary/10 text-primary px-1.5 py-0.5 rounded-md">
                                {t("common:date.today")}
                              </span>
                            )}
                            {diffDays === 1 && (
                              <span className="text-xs bg-warning/10 text-warning px-1.5 py-0.5 rounded-md">
                                {t("common:date.tomorrow")}
                              </span>
                            )}
                            {diffDays > 1 && diffDays <= 7 && (
                              <span className="text-xs text-text-secondary">
                                {t("common:date.in_days", { count: diffDays })}
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-2 mt-0.5">
                            <Link
                              to={`/events/${entry.eventId}`}
                              className="text-xs text-text-secondary hover:text-primary truncate max-w-[160px] transition-colors"
                            >
                              {entry.eventName}
                            </Link>
                            {entry.numPeople > 0 && (
                              <span className="text-xs text-text-secondary flex items-center gap-1 shrink-0">
                                <Users className="h-3 w-3" />
                                {entry.numPeople}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="text-right shrink-0 ml-3">
                        <span className="text-sm font-bold text-text">
                          {entry.quantity} {t("products:list.units")}
                        </span>
                        <p className="text-xs text-text-secondary">
                          $
                          {(entry.quantity * product.base_price).toLocaleString(
                            moneyLocale,
                            {
                              minimumFractionDigits: 2,
                            },
                          )}
                        </p>
                      </div>
                    </div>
                  );
                })}

                {totalDemand > 0 && (
                  <div className="flex items-center justify-between px-4 py-3 mt-2 border-t border-border">
                    <div>
                      <span className="text-xs text-text-secondary uppercase tracking-wide">
                        {t("products:details.total_demand")}
                      </span>
                      <p className="text-xs text-text-secondary">
                        {demandForecast.length} {demandForecast.length !== 1 ? t("common:nav.events") : t("common:nav.events").slice(0,-1)}
                      </p>
                    </div>
                    <div className="text-right">
                      <span className="text-sm font-bold text-text">
                        {totalDemand} {t("products:list.units")}
                      </span>
                      <p className="text-xs text-text-secondary">
                        $
                        {estimatedRevenue.toLocaleString(moneyLocale, {
                          minimumFractionDigits: 2,
                        })}{" "}
                        {t("products:details.est_suffix")}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="bg-card rounded-2xl border border-border overflow-hidden shadow-sm">
            <div className="p-6 border-b border-border flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-2">
                <Layers className="h-5 w-5 text-primary" />
                <h2 className="text-lg font-semibold text-text">
                  {t("products:form.composition")}
                </h2>
              </div>
            </div>

            {ingredients.length === 0 ? (
              <div className="p-12 text-center">
                <Package className="h-12 w-12 text-text-secondary mx-auto mb-4 opacity-20" />
                <p className="text-text-secondary">
                  {t("products:details.no_ingredients")}
                </p>
                <Link
                  to={`/products/${id}/edit`}
                  className="text-primary hover:underline mt-2 inline-block text-sm"
                >
                  {t("products:details.configure_composition")}
                </Link>
              </div>
            ) : (
              <>
                <table className="min-w-full divide-y divide-border">
                  <thead className="bg-surface-alt">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-text-secondary uppercase tracking-wider">
                        {t("products:form.inventory")}
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-semibold text-text-secondary uppercase tracking-wider">
                        {t("products:list.quantity")}
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-semibold text-text-secondary uppercase tracking-wider">
                        {t("products:form.cost")} Est.
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {ingredients.map((ing: ProductIngredientRow) => (
                        <tr
                          key={ing.inventory_id}
                          className="hover:bg-surface-alt/50 transition-colors"
                        >
                          <td className="px-6 py-4">
                            <Link
                              to={`/inventory/${ing.inventory_id}`}
                              className="text-sm font-medium text-text hover:text-primary transition-colors"
                            >
                              {ing.ingredient_name || t("products:list.unknown")}
                            </Link>
                          </td>
                          <td className="px-6 py-4 text-right">
                            <span className="text-sm text-text font-bold">
                              {ing.quantity_required} {ing.unit || ""}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-right">
                            <span className="text-sm font-medium text-text">
                              {ing.unit_cost
                                ? `$${(ing.quantity_required * ing.unit_cost).toLocaleString(moneyLocale, { minimumFractionDigits: 2 })}`
                                : "—"}
                            </span>
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
                <div className="px-6 py-4 border-t border-border flex justify-between items-center">
                  <span className="text-sm text-text-secondary">
                    {t("products:form.total_unit_cost")}
                  </span>
                  <span className="text-lg font-bold text-text">
                    $
                    {unitCost.toLocaleString(moneyLocale, {
                      minimumFractionDigits: 2,
                    })}
                  </span>
                </div>
              </>
            )}
          </div>

          {ingredients.filter((i: ProductIngredientRow) => i.type === "supply").length > 0 && (
            <div className="bg-card rounded-2xl border border-border overflow-hidden shadow-sm">
              <div className="p-6 border-b border-border flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-2">
                  <Fuel className="h-5 w-5 text-warning" />
                  <h2 className="text-lg font-semibold text-text">
                    {t("products:form.event_supplies")}
                  </h2>
                </div>
                <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-medium bg-warning/10 text-warning">
                  {t("products:details.fixed_cost_per_event")}
                </span>
              </div>
              <table className="min-w-full divide-y divide-border">
                <thead className="bg-surface-alt">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-text-secondary uppercase tracking-wider">
                      {t("products:form.inventory")}
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-semibold text-text-secondary uppercase tracking-wider">
                      {t("products:list.quantity")}
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-semibold text-text-secondary uppercase tracking-wider">
                      {t("products:form.cost")}
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {ingredients
                    .filter((i: ProductIngredientRow) => i.type === "supply")
                    .map((ing: ProductIngredientRow) => (
                      <tr
                        key={ing.inventory_id}
                        className="hover:bg-surface-alt/50 transition-colors"
                      >
                        <td className="px-6 py-4">
                          <Link
                            to={`/inventory/${ing.inventory_id}`}
                            className="text-sm font-medium text-text hover:text-primary transition-colors"
                          >
                            {ing.ingredient_name || t("products:list.unknown")}
                          </Link>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <span className="text-sm text-text font-bold">
                            {ing.quantity_required} {ing.unit || ""}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <span className="text-sm font-medium text-warning">
                            {ing.unit_cost
                              ? `$${(ing.quantity_required * ing.unit_cost).toLocaleString(moneyLocale, { minimumFractionDigits: 2 })}`
                              : "—"}
                          </span>
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
              <div className="px-6 py-4 border-t border-border flex justify-between items-center">
                <span className="text-sm text-text-secondary">
                  {t("products:form.total_event_cost")}
                </span>
                <span className="text-lg font-bold text-warning">
                  $
                  {ingredients
                    .filter((i: ProductIngredientRow) => i.type === "supply")
                    .reduce(
                      (sum: number, ing: ProductIngredientRow) =>
                        sum + ing.quantity_required * (ing.unit_cost || 0),
                      0,
                    )
                    .toLocaleString(moneyLocale, { minimumFractionDigits: 2 })}
                </span>
              </div>
            </div>
          )}

          {ingredients.filter((i: ProductIngredientRow) => i.type === "equipment").length >
            0 && (
            <div className="bg-card rounded-2xl border border-border overflow-hidden shadow-sm">
              <div className="p-6 border-b border-border flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-2">
                  <Wrench className="h-5 w-5 text-info" />
                  <h2 className="text-lg font-semibold text-text">
                    {t("products:form.equipment")}
                  </h2>
                </div>
                <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-medium bg-info/10 text-info">
                  {t("products:form.reusable_no_cost")}
                </span>
              </div>
              <table className="min-w-full divide-y divide-border">
                <thead className="bg-surface-alt">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-text-secondary uppercase tracking-wider">
                      {t("products:form.equipment")}
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-semibold text-text-secondary uppercase tracking-wider">
                      {t("products:list.quantity")}
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-semibold text-text-secondary uppercase tracking-wider">
                      {t("products:form.capacity")}
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {ingredients
                    .filter((i: ProductIngredientRow) => i.type === "equipment")
                    .map((ing: ProductIngredientRow) => (
                      <tr
                        key={ing.inventory_id}
                        className="hover:bg-surface-alt/50 transition-colors"
                      >
                        <td className="px-6 py-4">
                          <Link
                            to={`/inventory/${ing.inventory_id}`}
                            className="text-sm font-medium text-text hover:text-primary transition-colors"
                          >
                            {ing.ingredient_name || t("products:list.unknown")}
                          </Link>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <span className="text-sm text-text font-bold">
                            {ing.quantity_required} {ing.unit || ""}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <span className="text-xs text-text-secondary">
                            {ing.capacity
                              ? t("products:form.capacity_help", { count: ing.capacity })
                              : t("products:form.capacity_fixed")}
                          </span>
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
