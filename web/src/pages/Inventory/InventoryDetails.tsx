import React, { useEffect, useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { inventoryService } from "../../services/inventoryService";
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
} from "lucide-react";
import { logError } from "../../lib/errorHandler";
import { useToast } from "../../hooks/useToast";
import { ConfirmDialog } from "../../components/ConfirmDialog";
import { SkeletonCard } from "../../components/Skeleton";
import clsx from "clsx";

type DemandEntry = { date: string; quantity: number };

export const InventoryDetails: React.FC = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [item, setItem] = useState<InventoryItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
  const [demandForecast, setDemandForecast] = useState<DemandEntry[]>([]);
  const [demandLoading, setDemandLoading] = useState(false);
  const { addToast } = useToast();

  useEffect(() => {
    if (id) {
      loadItem(id);
    }
  }, [id]);

  const loadItem = async (itemId: string) => {
    try {
      setLoading(true);
      const itemData = await inventoryService.getById(itemId);
      setItem(itemData);
      loadDemandForecast(itemId);
    } catch (err) {
      logError("Error fetching inventory item details", err);
      setError("Error al cargar los datos del ítem.");
    } finally {
      setLoading(false);
    }
  };

  const loadDemandForecast = async (itemId: string) => {
    try {
      setDemandLoading(true);

      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const allEvents = await eventService.getAll();
      const upcomingConfirmed = allEvents.filter(
        (e) => e.status === "confirmed" && new Date(e.event_date) >= today,
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
            eventProductsMap[event.id] = (products || []).map((p: any) => ({
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
          eventDemand += perUnit * ep.quantity;
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

  const handleDeleteItem = async () => {
    if (!id) return;
    try {
      await inventoryService.delete(id);
      addToast("Ítem eliminado correctamente.", "success");
      navigate("/inventory");
    } catch (err) {
      logError("Error deleting inventory item", err);
      addToast("Error al eliminar el ítem de inventario.", "error");
    } finally {
      setConfirmDeleteOpen(false);
    }
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
            <div key={i} className="bg-card rounded-3xl border border-border p-5">
              <div className="h-3 w-20 rounded-md bg-surface-alt animate-pulse mb-3" />
              <div className="h-8 w-16 rounded-md bg-surface-alt animate-pulse" />
            </div>
          ))}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-card rounded-3xl border border-border p-6">
            <SkeletonCard rows={4} />
          </div>
          <div className="bg-card rounded-3xl border border-border p-6">
            <SkeletonCard rows={3} />
          </div>
        </div>
      </div>
    );
  }

  if (error || !item) {
    return (
      <div className="text-center p-8">
        <p className="text-error">{error || "Ítem de inventario no encontrado"}</p>
        <button
          onClick={() => navigate("/inventory")}
          className="mt-4 text-primary hover:underline"
        >
          Volver a inventario
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
        title="Eliminar ítem"
        description="¿Estás seguro de que deseas eliminar este ítem del inventario? Esta acción no se puede deshacer."
        confirmText="Eliminar"
        cancelText="Cancelar"
        onConfirm={handleDeleteItem}
        onCancel={() => setConfirmDeleteOpen(false)}
      />

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate("/inventory")}
            className="p-2 rounded-full hover:bg-surface-alt text-text-secondary transition-colors"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div>
            <h1 className="text-2xl font-black tracking-tight text-text">
              {item.ingredient_name}
            </h1>
            <span
              className={clsx(
                "px-2.5 py-0.5 mt-1 inline-flex text-xs font-semibold rounded-full border",
                item.type === "equipment"
                  ? "bg-purple-500/10 text-purple-500 border-purple-500/20"
                  : item.type === "supply"
                  ? "bg-warning/10 text-warning border-warning/20"
                  : "bg-primary/10 text-primary border-primary/20",
              )}
            >
              {item.type === "equipment" ? "Activo / Equipo" : item.type === "supply" ? "Insumo por Evento" : "Insumo Consumible"}
            </span>
          </div>
        </div>
        <div className="flex gap-2">
          <Link
            to={`/inventory/${id}/edit`}
            className="inline-flex items-center px-4 py-2 border border-border rounded-xl bg-card text-sm font-medium text-text-secondary hover:bg-surface-alt transition-colors"
          >
            <Edit className="h-4 w-4 mr-2" />
            Editar
          </Link>
          <button
            onClick={() => setConfirmDeleteOpen(true)}
            className="inline-flex items-center px-4 py-2 border border-error/20 rounded-xl bg-error/5 text-sm font-medium text-error hover:bg-error/10 transition-colors"
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Eliminar
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div
          className={clsx(
            "rounded-3xl border p-5 shadow-sm",
            isLowStock ? "bg-error/5 border-error/30" : "bg-card border-border",
          )}
        >
          <div className="flex items-center gap-2 mb-2">
            <Package className={clsx("h-4 w-4", isLowStock ? "text-error" : "text-primary")} />
            <p className="text-xs text-text-secondary uppercase tracking-wide">Stock Actual</p>
          </div>
          <p className={clsx("text-3xl font-black", isLowStock ? "text-error" : "text-text")}>
            {item.current_stock}
          </p>
          <p className="text-xs text-text-secondary mt-1">{item.unit}</p>
          {isLowStock && (
            <p className="text-xs text-error font-medium mt-1.5 flex items-center gap-1">
              <AlertTriangle className="h-3 w-3" /> Bajo mínimo
            </p>
          )}
        </div>

        <div className="bg-card rounded-3xl border border-border p-5 shadow-sm">
          <div className="flex items-center gap-2 mb-2">
            <TrendingDown className="h-4 w-4 text-text-secondary" />
            <p className="text-xs text-text-secondary uppercase tracking-wide">Stock Mínimo</p>
          </div>
          <p className="text-3xl font-black text-text">{item.minimum_stock}</p>
          <p className="text-xs text-text-secondary mt-1">{item.unit}</p>
        </div>

        <div className="bg-card rounded-3xl border border-border p-5 shadow-sm">
          <div className="flex items-center gap-2 mb-2">
            <DollarSign className="h-4 w-4 text-primary" />
            <p className="text-xs text-text-secondary uppercase tracking-wide">Costo Unitario</p>
          </div>
          <p className="text-3xl font-black text-text">
            ${item.unit_cost?.toLocaleString("es-MX", { minimumFractionDigits: 2 }) ?? "0.00"}
          </p>
          <p className="text-xs text-text-secondary mt-1">por {item.unit}</p>
        </div>

        <div className="bg-card rounded-3xl border border-border p-5 shadow-sm">
          <div className="flex items-center gap-2 mb-2">
            <PackageCheck className="h-4 w-4 text-primary" />
            <p className="text-xs text-text-secondary uppercase tracking-wide">Valor en Stock</p>
          </div>
          <p className="text-3xl font-black text-text">
            $
            {(item.current_stock * (item.unit_cost || 0)).toLocaleString("es-MX", {
              minimumFractionDigits: 2,
            })}
          </p>
          <p className="text-xs text-text-secondary mt-1">valor total</p>
        </div>
      </div>

      {/* Main content */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Demand forecast */}
        <div className="bg-card rounded-3xl border border-border p-6 shadow-sm">
          <div className="flex items-center gap-2 mb-4 pb-4 border-b border-border">
            <Calendar className="h-5 w-5 text-primary" />
            <h2 className="text-sm font-semibold text-text">Demanda por Fecha</h2>
            <span className="ml-auto text-xs text-text-secondary">Eventos confirmados</span>
          </div>

          {demandLoading ? (
            <SkeletonCard rows={3} />
          ) : demandForecast.length === 0 ? (
            <div className="text-center py-10">
              <Calendar className="h-9 w-9 text-text-secondary opacity-25 mx-auto mb-3" />
              <p className="text-sm text-text-secondary">
                Sin eventos confirmados que usen este ítem.
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
                        {dateObj.toLocaleDateString("es-MX", {
                          day: "numeric",
                          month: "short",
                        })}
                      </span>
                      {diffDays === 0 && (
                        <span className="text-xs bg-primary/10 text-primary px-1.5 py-0.5 rounded-md">
                          Hoy
                        </span>
                      )}
                      {diffDays === 1 && (
                        <span className="text-xs bg-warning/10 text-warning px-1.5 py-0.5 rounded-md">
                          Mañana
                        </span>
                      )}
                      {diffDays > 1 && diffDays <= 7 && (
                        <span className="text-xs text-text-secondary">en {diffDays} días</span>
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
                    Total demanda
                  </span>
                  <span className="text-sm font-bold text-text">
                    {fmtQty(totalDemand)} {item.unit}
                  </span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Right column: alert + stock bars */}
        <div className="space-y-4">
          {/* 7-day supply alert */}
          {!demandLoading && (
            <div
              className={clsx(
                "rounded-3xl border p-5 shadow-sm",
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
                      ? "¡Stock insuficiente para los próximos 7 días!"
                      : demand7Days > 0 && stockAfter7Days < item.minimum_stock
                        ? "Stock quedará bajo el mínimo tras eventos próximos"
                        : isLowStock && demand7Days === 0
                          ? "Stock por debajo del mínimo recomendado"
                          : demand7Days > 0
                            ? "Stock suficiente para los próximos 7 días"
                            : "Sin demanda en los próximos 7 días"}
                  </p>
                  <p className="text-sm text-text-secondary mt-1">
                    {demand7Days > 0 ? (
                      <>
                        Necesitas{" "}
                        <strong className="text-text">
                          {fmtQty(demand7Days)} {item.unit}
                        </strong>{" "}
                        en los próximos 7 días. Tienes{" "}
                        <strong className="text-text">
                          {item.current_stock} {item.unit}
                        </strong>
                        .
                        {stockAfter7Days < 0 && (
                          <span className="text-error font-medium">
                            {" "}
                            Faltan {fmtQty(Math.abs(stockAfter7Days))} {item.unit}.
                          </span>
                        )}
                      </>
                    ) : isLowStock ? (
                      <>
                        Tu stock actual (
                        <strong className="text-text">
                          {item.current_stock} {item.unit}
                        </strong>
                        ) está por debajo del mínimo recomendado (
                        <strong className="text-text">
                          {item.minimum_stock} {item.unit}
                        </strong>
                        ).
                      </>
                    ) : (
                      "No hay eventos confirmados que requieran este ítem en los próximos 7 días."
                    )}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Stock health bars */}
          <div className="bg-card rounded-3xl border border-border p-5 shadow-sm">
            <h3 className="text-sm font-semibold text-text-secondary uppercase tracking-wider mb-4">
              Nivel de Stock
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
                      <span>Stock actual</span>
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
                      <span>Mínimo recomendado</span>
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
                        <span>Demanda próximos 7 días</span>
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
