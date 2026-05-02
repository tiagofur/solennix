import React, { useEffect, useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { eventService } from "../../services/eventService";
import { productService } from "../../services/productService";
import { InventoryItem } from "../../types/entities";
import {
  ArrowLeft,
  Edit,
  Package,
  DollarSign,
  PackageCheck,
  Trash2,
  AlertTriangle,
  Calendar,
  TrendingDown,
  CheckCircle,
  Settings2,
} from "lucide-react";
import { logError } from "../../lib/errorHandler";
import { Breadcrumb } from "../../components/Breadcrumb";
import { useToast } from "../../hooks/useToast";
import { ConfirmDialog } from "../../components/ConfirmDialog";
import { Modal } from "../../components/Modal";
import { SkeletonCard } from "../../components/Skeleton";
import clsx from "clsx";
import { useInventoryItem, useDeleteInventoryItem, useUpdateInventoryItem } from "../../hooks/queries/useInventoryQueries";
import { parseEventDate } from "../../lib/dateUtils";

type DemandEntry = { date: string; quantity: number };

import { useTranslation } from "react-i18next";

export const InventoryDetails: React.FC = () => {
  const { t, i18n } = useTranslation(["inventory", "common"]);
  const { id } = useParams();
  const navigate = useNavigate();
  const { data: item, isLoading: itemLoading, error: itemError } = useInventoryItem(id);
  const deleteItemMutation = useDeleteInventoryItem();
  const updateItemMutation = useUpdateInventoryItem();
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
  const [adjustOpen, setAdjustOpen] = useState(false);
  const [adjustValue, setAdjustValue] = useState(0);
  const [demandForecast, setDemandForecast] = useState<DemandEntry[]>([]);
  const [demandLoading, setDemandLoading] = useState(false);
  const { addToast } = useToast();

  const moneyLocale = i18n.language === "en" ? "en-US" : "es-MX";

  const loading = itemLoading;
  const error = itemError ? t("common:error.load_failed") : null;

  useEffect(() => {
    if (id && item) {
      loadDemandForecast(id, item);
    }
  }, [id, item]);

  const loadDemandForecast = async (itemId: string, currentItem: InventoryItem) => {
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

      // Get products for each upcoming confirmed event (in parallel)
      const eventProductsMap: Record<string, { productId: string; quantity: number }[]> = {};
      await Promise.all(
        upcomingConfirmed.map(async (event) => {
          try {
            const products = await eventService.getProducts(event.id);
            eventProductsMap[event.id] = (products || []).map((p: { product_id: string; quantity: number }) => ({
              productId: p.product_id,
              quantity: p.quantity,
            }));
          } catch {
            eventProductsMap[event.id] = [];
          }
        }),
      );

      const allProductIds = [
        ...new Set(
          Object.values(eventProductsMap).flatMap((ps) => ps.map((p) => p.productId)),
        ),
      ];

      if (allProductIds.length === 0) {
        setDemandForecast([]);
        return;
      }

      // Batch fetch ingredients for all products
      const allIngredients = await productService.getIngredientsForProducts(allProductIds);

      // Map: productId → quantity_required for THIS inventory item
      const productDemandMap: Record<string, number> = {};
      for (const ing of allIngredients || []) {
        if (ing.inventory_id === itemId) {
          productDemandMap[ing.product_id] =
            (productDemandMap[ing.product_id] || 0) + ing.quantity_required;
        }
      }

      // Calculate demand per event date
      const demandByDate: Record<string, number> = {};
      for (const event of upcomingConfirmed) {
        const products = eventProductsMap[event.id] || [];
        let eventDemand = 0;
        for (const ep of products) {
          const perUnit = productDemandMap[ep.productId] || 0;
          if (currentItem.type === 'supply') {
            // Per-event supplies: fixed quantity, not scaled by product qty
            eventDemand += perUnit;
          } else {
            eventDemand += perUnit * ep.quantity;
          }
        }
        if (eventDemand > 0) {
          const dateKey = event.event_date.slice(0, 10);
          demandByDate[dateKey] = (demandByDate[dateKey] || 0) + eventDemand;
        }
      }

      const forecast = Object.entries(demandByDate)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([date, quantity]) => ({ date, quantity }));

      setDemandForecast(forecast);
    } catch (err) {
      logError("Error loading demand forecast", err);
    } finally {
      setDemandLoading(false);
    }
  };

  const handleDeleteItem = () => {
    if (!id) return;
    deleteItemMutation.mutate(id, {
      onSuccess: () => navigate("/inventory"),
      onSettled: () => setConfirmDeleteOpen(false),
    });
  };

  const openAdjustModal = () => {
    if (item) {
      setAdjustValue(item.current_stock);
      setAdjustOpen(true);
    }
  };

  const handleAdjustStock = () => {
    if (!id || !item || adjustValue < 0) return;
    updateItemMutation.mutate(
      { id, data: { ...item, current_stock: adjustValue } },
      {
        onSuccess: () => {
          addToast(t("common:action.save_success"), "success");
          setAdjustOpen(false);
        },
      },
    );
  };

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
            <div key={i} className="bg-card rounded-2xl border border-border p-5">
              <div className="h-3 w-20 rounded-md bg-surface-alt animate-pulse mb-3" />
              <div className="h-8 w-16 rounded-md bg-surface-alt animate-pulse" />
            </div>
          ))}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-card rounded-2xl border border-border p-6">
            <SkeletonCard rows={4} />
          </div>
          <div className="bg-card rounded-2xl border border-border p-6">
            <SkeletonCard rows={3} />
          </div>
        </div>
      </div>
    );
  }

  if (error || !item) {
    return (
      <div className="text-center p-8">
        <p className="text-error">{error || t("inventory:list.no_results")}</p>
        <button
          type="button"
          onClick={() => navigate("/inventory")}
          className="mt-4 text-primary hover:underline"
        >
          {t("common:action.back")}
        </button>
      </div>
    );
  }

  const isLowStock = item.minimum_stock > 0 && item.current_stock < item.minimum_stock;

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
  const stockAfter7Days = item.current_stock - demand7Days;

  const fmtQty = (n: number) =>
    n % 1 === 0 ? String(n) : n.toFixed(2);

  return (
    <div className="space-y-6">
      <ConfirmDialog
        open={confirmDeleteOpen}
        title={t("inventory:details.delete_confirm_title")}
        description={t("inventory:details.delete_confirm_desc")}
        confirmText={t("common:action.delete")}
        cancelText={t("common:action.cancel")}
        onConfirm={handleDeleteItem}
        onCancel={() => setConfirmDeleteOpen(false)}
      />

      <Modal
        isOpen={adjustOpen}
        onClose={() => setAdjustOpen(false)}
        title={t("common:action.edit")}
        maxWidth="sm"
      >
        <div className="space-y-5">
          <div className="text-center">
            <p className="text-sm text-text-secondary mb-1">
              {item.ingredient_name}
            </p>
            <p className="text-xs text-text-secondary">
              {t("inventory:form.current_stock")}: <strong className="text-text">{item.current_stock} {item.unit}</strong>
            </p>
          </div>

          <div>
            <label htmlFor="adjust-stock" className="block text-sm font-medium text-text-secondary mb-1.5">
              {t("inventory:form.current_stock")}
            </label>
            <input
              id="adjust-stock"
              type="number"
              min="0"
              step="any"
              value={adjustValue}
              onChange={(e) => setAdjustValue(Math.max(0, Number(e.target.value)))}
              className="w-full rounded-xl border border-border bg-card text-text text-center text-2xl font-bold py-3 focus:ring-2 focus:ring-primary/40 focus:border-primary transition-all"
              autoFocus
            />
          </div>

          <div className="flex justify-center gap-2">
            {[-10, -1, 1, 10].map((delta) => (
              <button
                key={delta}
                type="button"
                onClick={() => setAdjustValue((prev) => Math.max(0, prev + delta))}
                className={clsx(
                  "px-4 py-2 text-sm font-bold rounded-xl border transition-colors",
                  delta > 0
                    ? "border-success/30 bg-success/5 text-success hover:bg-success/10"
                    : "border-error/30 bg-error/5 text-error hover:bg-error/10",
                )}
              >
                {delta > 0 ? `+${delta}` : delta}
              </button>
            ))}
          </div>

          {adjustValue !== item.current_stock && (
            <p className="text-center text-xs text-text-secondary">
              {t("common:status.pending")}:{" "}
              <span className={clsx("font-semibold", adjustValue > item.current_stock ? "text-success" : "text-error")}>
                {adjustValue > item.current_stock ? "+" : ""}{adjustValue - item.current_stock} {item.unit}
              </span>
            </p>
          )}

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={() => setAdjustOpen(false)}
              className="flex-1 px-4 py-2.5 text-sm font-medium rounded-xl border border-border bg-card text-text-secondary hover:bg-surface-alt transition-colors"
            >
              {t("common:action.cancel")}
            </button>
            <button
              type="button"
              onClick={handleAdjustStock}
              disabled={updateItemMutation.isPending || adjustValue === item.current_stock}
              className="flex-1 px-4 py-2.5 text-sm font-bold rounded-xl text-white premium-gradient shadow-md shadow-primary/20 hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              {updateItemMutation.isPending ? t("common:action.saving") : t("common:action.save")}
            </button>
          </div>
        </div>
      </Modal>

      <Breadcrumb items={[{ label: t("inventory:title"), href: '/inventory' }, { label: item.ingredient_name }]} />

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={() => navigate("/inventory")}
            className="p-2 rounded-full hover:bg-surface-alt text-text-secondary transition-colors"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-text">
              {item.ingredient_name}
            </h1>
            <span
              className={clsx(
                "px-2.5 py-0.5 mt-1 inline-flex text-xs font-semibold rounded-full border",
                item.type === "equipment"
                  ? "bg-info/10 text-info border-info/20"
                  : item.type === "supply"
                  ? "bg-warning/10 text-warning border-warning/20"
                  : "bg-success/10 text-success border-success/20",
              )}
            >
              {item.type === "equipment" ? t("inventory:list.type_equipment") : item.type === "supply" ? t("inventory:list.type_supply") : t("inventory:list.type_ingredient")}
            </span>
          </div>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={openAdjustModal}
            className="inline-flex items-center px-4 py-2 text-sm font-bold rounded-xl text-white premium-gradient shadow-md shadow-primary/20 hover:shadow-lg hover:shadow-primary/30 transition-all hover:scale-[1.02]"
          >
            <Settings2 className="h-4 w-4 mr-2" />
            {t("common:action.edit")}
          </button>
          <Link
            to={`/inventory/${id}/edit`}
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
        <div
          className={clsx(
            "rounded-2xl border p-5 shadow-sm",
            isLowStock ? "bg-error/5 border-error/30" : "bg-card border-border",
          )}
        >
          <div className="flex items-center gap-2 mb-2">
            <Package className={clsx("h-4 w-4", isLowStock ? "text-error" : "text-primary")} />
            <p className="text-xs text-text-secondary uppercase tracking-wide">{t("inventory:list.stock")}</p>
          </div>
          <p className={clsx("text-3xl font-black", isLowStock ? "text-error" : "text-text")}>
            {item.current_stock}
          </p>
          <p className="text-xs text-text-secondary mt-1">{item.unit}</p>
          {isLowStock && (
            <p className="text-xs text-error font-medium mt-1.5 flex items-center gap-1">
              <AlertTriangle className="h-3 w-3" /> {t("inventory:details.stats.alert_title")}
            </p>
          )}
        </div>

        <div className="bg-card rounded-2xl border border-border p-5 shadow-sm">
          <div className="flex items-center gap-2 mb-2">
            <TrendingDown className="h-4 w-4 text-text-secondary" />
            <p className="text-xs text-text-secondary uppercase tracking-wide">{t("inventory:list.min_stock")}</p>
          </div>
          <p className="text-3xl font-black text-text">{item.minimum_stock}</p>
          <p className="text-xs text-text-secondary mt-1">{item.unit}</p>
        </div>

        <div className="bg-card rounded-2xl border border-border p-5 shadow-sm">
          <div className="flex items-center gap-2 mb-2">
            <DollarSign className="h-4 w-4 text-primary" />
            <p className="text-xs text-text-secondary uppercase tracking-wide">{t("inventory:list.unit_cost")}</p>
          </div>
          <p className="text-3xl font-black text-text">
            ${item.unit_cost?.toLocaleString(moneyLocale, { minimumFractionDigits: 2 }) ?? "0.00"}
          </p>
          <p className="text-xs text-text-secondary mt-1">{t("inventory:form.unit")}: {item.unit}</p>
        </div>

        <div className="bg-card rounded-2xl border border-border p-5 shadow-sm">
          <div className="flex items-center gap-2 mb-2">
            <PackageCheck className="h-4 w-4 text-primary" />
            <p className="text-xs text-text-secondary uppercase tracking-wide">{t("inventory:details.stats.stock_value")}</p>
          </div>
          <p className="text-3xl font-black text-text">
            $
            {(item.current_stock * (item.unit_cost || 0)).toLocaleString(moneyLocale, {
              minimumFractionDigits: 2,
            })}
          </p>
          <p className="text-xs text-text-secondary mt-1">{t("common:status.total")}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-card rounded-2xl border border-border p-6 shadow-sm">
          <div className="flex items-center gap-2 mb-4 pb-4 border-b border-border">
            <Calendar className="h-5 w-5 text-primary" />
            <h2 className="text-sm font-semibold text-text">{t("inventory:details.history")}</h2>
            <span className="ml-auto text-xs text-text-secondary">{t("inventory:details.confirmed_events")}</span>
          </div>

          {demandLoading ? (
            <SkeletonCard rows={3} />
          ) : demandForecast.length === 0 ? (
            <div className="text-center py-10">
              <Calendar className="h-9 w-9 text-text-secondary opacity-25 mx-auto mb-3" />
              <p className="text-sm text-text-secondary">
                {t("inventory:details.no_confirmed_events_using_item")}
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {demandForecast.map(({ date, quantity }) => {
                const dateObj = new Date(date + "T00:00:00");
                const diffDays = Math.ceil(
                  (dateObj.getTime() - today.getTime()) / (1000 * 60 * 60 * 24),
                );
                const accumulated = demandForecast
                  .filter((d) => new Date(d.date + "T00:00:00") <= dateObj)
                  .reduce((s, d) => s + d.quantity, 0);
                const stockAtDate = item.current_stock - accumulated + quantity;
                const isUrgent = stockAtDate < quantity;

                return (
                  <div
                    key={date}
                    className={clsx(
                      "flex items-center justify-between px-4 py-3 rounded-xl border",
                      isUrgent
                        ? "bg-error/5 border-error/20"
                        : diffDays <= 7
                          ? "bg-warning/5 border-warning/20"
                          : "bg-surface-alt border-border",
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={clsx(
                          "w-2 h-2 rounded-full shrink-0",
                          isUrgent
                            ? "bg-error"
                            : diffDays <= 7
                              ? "bg-warning"
                              : "bg-primary/40",
                        )}
                      />
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
                        <span className="text-xs text-text-secondary">{t("common:date.in_days", { count: diffDays })}</span>
                      )}
                    </div>
                    <span
                      className={clsx(
                        "text-sm font-bold",
                        isUrgent ? "text-error" : "text-text",
                      )}
                    >
                      {fmtQty(quantity)} {item.unit}
                    </span>
                  </div>
                );
              })}

              {totalDemand > 0 && (
                <div className="flex items-center justify-between px-4 py-2 mt-2 border-t border-border">
                  <span className="text-xs text-text-secondary uppercase tracking-wide">
                    {t("common:status.total")}
                  </span>
                  <span className="text-sm font-bold text-text">
                    {fmtQty(totalDemand)} {item.unit}
                  </span>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="space-y-4">
          {!demandLoading && (
            <div
              className={clsx(
                "rounded-2xl border p-5 shadow-sm",
                demand7Days > 0 && stockAfter7Days < 0
                  ? "bg-error/5 border-error/30"
                  : demand7Days > 0 && stockAfter7Days < item.minimum_stock
                    ? "bg-warning/5 border-warning/30"
                    : isLowStock && demand7Days === 0
                      ? "bg-error/5 border-error/30"
                      : "bg-card border-border",
              )}
            >
              <div className="flex items-start gap-3">
                {demand7Days > 0 && stockAfter7Days < 0 ? (
                  <AlertTriangle className="h-6 w-6 text-error shrink-0 mt-0.5" />
                ) : demand7Days > 0 && stockAfter7Days < item.minimum_stock ? (
                  <AlertTriangle className="h-6 w-6 text-warning shrink-0 mt-0.5" />
                ) : isLowStock && demand7Days === 0 ? (
                  <AlertTriangle className="h-6 w-6 text-error shrink-0 mt-0.5" />
                ) : (
                  <CheckCircle className="h-6 w-6 text-success shrink-0 mt-0.5" />
                )}
                <div className="flex-1">
                  <p
                    className={clsx(
                      "font-semibold text-sm",
                      demand7Days > 0 && stockAfter7Days < 0
                        ? "text-error"
                        : demand7Days > 0 && stockAfter7Days < item.minimum_stock
                          ? "text-warning"
                          : isLowStock && demand7Days === 0
                            ? "text-error"
                            : "text-success",
                    )}
                  >
                    {demand7Days > 0 && stockAfter7Days < 0
                      ? t("inventory:details.stats.alert_title")
                      : demand7Days > 0 && stockAfter7Days < item.minimum_stock
                        ? t("inventory:details.stats.alert_desc")
                        : isLowStock && demand7Days === 0
                          ? t("inventory:details.stats.alert_title")
                          : demand7Days > 0
                            ? t("inventory:details.stock_enough_week")
                            : t("inventory:list.no_alerts")}
                  </p>
                  <p className="text-sm text-text-secondary mt-1">
                    {demand7Days > 0 ? (
                      <>
                        {t("inventory:details.stats.forecast_usage")}{" "}
                        <strong className="text-text">
                          {fmtQty(demand7Days)} {item.unit}
                        </strong>{" "}
                        {t("common:date.in_days", { count: 7 })}. {t("inventory:list.stock")}{" "}
                        <strong className="text-text">
                          {item.current_stock} {item.unit}
                        </strong>
                        .
                        {stockAfter7Days < 0 && (
                          <span className="text-error font-medium">
                            {" "}
                            {t("common:status.missing")} {fmtQty(Math.abs(stockAfter7Days))} {item.unit}.
                          </span>
                        )}
                      </>
                    ) : isLowStock ? (
                      <>
                        {t("inventory:details.stats.alert_desc")} (
                        <strong className="text-text">
                          {item.current_stock} {item.unit}
                        </strong>
                        ) {t("inventory:details.minimum_recommended")} (
                        <strong className="text-text">
                          {item.minimum_stock} {item.unit}
                        </strong>
                        ).
                      </>
                    ) : (
                      t("inventory:list.no_alerts")
                    )}
                  </p>
                </div>
              </div>
            </div>
          )}

          <div className="bg-card rounded-2xl border border-border p-5 shadow-sm">
            <h3 className="text-sm font-semibold text-text-secondary uppercase tracking-wider mb-4">
              {t("inventory:list.stock")}
            </h3>
            {(() => {
              const maxBar = Math.max(
                item.current_stock,
                item.minimum_stock,
                demand7Days,
                1,
              );
              const stockPct = Math.min(100, (item.current_stock / maxBar) * 100);
              const minPct = Math.min(100, (item.minimum_stock / maxBar) * 100);
              const demandPct = Math.min(100, (demand7Days / maxBar) * 100);
              return (
                <div className="space-y-4">
                  <div>
                    <div className="flex justify-between text-xs text-text-secondary mb-1.5">
                      <span>{t("inventory:details.stock_actual")}</span>
                      <span className="font-medium text-text">
                        {item.current_stock} {item.unit}
                      </span>
                    </div>
                    <div className="h-2.5 bg-surface-alt rounded-full overflow-hidden">
                      <div
                        className={clsx(
                          "h-full rounded-full transition-all duration-500",
                          isLowStock ? "bg-error" : "bg-primary",
                        )}
                        style={{ width: `${stockPct}%` }}
                      />
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between text-xs text-text-secondary mb-1.5">
                      <span>{t("inventory:details.minimum_recommended")}</span>
                      <span className="font-medium text-text">
                        {item.minimum_stock} {item.unit}
                      </span>
                    </div>
                    <div className="h-2.5 bg-surface-alt rounded-full overflow-hidden">
                      <div
                        className="h-full bg-warning rounded-full transition-all duration-500"
                        style={{ width: `${minPct}%` }}
                      />
                    </div>
                  </div>

                  {!demandLoading && demand7Days > 0 && (
                    <div>
                      <div className="flex justify-between text-xs text-text-secondary mb-1.5">
                        <span>{t("inventory:details.stats.forecast_usage")}</span>
                        <span className="font-medium text-text">
                          {fmtQty(demand7Days)} {item.unit}
                        </span>
                      </div>
                      <div className="h-2.5 bg-surface-alt rounded-full overflow-hidden">
                        <div
                          className={clsx(
                            "h-full rounded-full transition-all duration-500",
                            stockAfter7Days < 0 ? "bg-error" : "bg-warning",
                          )}
                          style={{ width: `${demandPct}%` }}
                        />
                      </div>
                    </div>
                  )}
                </div>
              );
            })()}
          </div>
        </div>
      </div>
    </div>
  );
};
