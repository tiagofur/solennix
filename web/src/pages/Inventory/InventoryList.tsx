import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { inventoryService } from "../../services/inventoryService";
import { InventoryItem } from "../../types/entities";
import {
  Plus,
  Search,
  Edit,
  Trash2,
  AlertTriangle,
  Download,
  Package,
  Wrench,
  ShoppingBasket,
  Fuel,
} from "lucide-react";
import { exportToCsv } from "../../lib/exportCsv";
import clsx from "clsx";
import { ConfirmDialog } from "../../components/ConfirmDialog";
import { logError } from "../../lib/errorHandler";
import Empty from "../../components/Empty";
import { useToast } from "../../hooks/useToast";
import { ArrowUp, ArrowDown } from "lucide-react";
import { SkeletonTable } from "../../components/Skeleton";

type SortKey =
  | "ingredient_name"
  | "current_stock"
  | "minimum_stock"
  | "unit_cost";
type SortOrder = "asc" | "desc";

function sortItems(
  items: InventoryItem[],
  key: SortKey,
  order: SortOrder,
): InventoryItem[] {
  return [...items].sort((a, b) => {
    switch (key) {
      case "current_stock":
        return order === "asc"
          ? a.current_stock - b.current_stock
          : b.current_stock - a.current_stock;
      case "minimum_stock":
        return order === "asc"
          ? a.minimum_stock - b.minimum_stock
          : b.minimum_stock - a.minimum_stock;
      case "unit_cost": {
        const diff = (a.unit_cost ?? 0) - (b.unit_cost ?? 0);
        return order === "asc" ? diff : -diff;
      }
      case "ingredient_name":
      default: {
        const strDiff = a.ingredient_name.localeCompare(b.ingredient_name);
        return order === "asc" ? strDiff : -strDiff;
      }
    }
  });
}

export const InventoryList: React.FC = () => {
  const navigate = useNavigate();
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const [adjustingItem, setAdjustingItem] = useState<InventoryItem | null>(
    null,
  );
  const [adjustmentValue, setAdjustmentValue] = useState<string>("");
  const { addToast } = useToast();

  const [showLowStockOnly, setShowLowStockOnly] = useState(false);
  const [ingredientSort, setIngredientSort] = useState<{
    key: SortKey;
    order: SortOrder;
  }>({ key: "ingredient_name", order: "asc" });
  const [equipmentSort, setEquipmentSort] = useState<{
    key: SortKey;
    order: SortOrder;
  }>({ key: "ingredient_name", order: "asc" });
  const [supplySort, setSupplySort] = useState<{
    key: SortKey;
    order: SortOrder;
  }>({ key: "ingredient_name", order: "asc" });

  useEffect(() => {
    fetchInventory();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchInventory = async () => {
    try {
      const data = await inventoryService.getAll();
      setItems(data || []);
    } catch (error) {
      logError("Error fetching inventory", error);
      addToast("Error al cargar el inventario.", "error");
    } finally {
      setLoading(false);
    }
  };

  const lowStockItems = (items || []).filter(
    (item) =>
      item.minimum_stock > 0 && item.current_stock < item.minimum_stock,
  );

  const requestDelete = (id: string) => {
    setPendingDeleteId(id);
    setConfirmOpen(true);
  };

  const confirmDelete = async () => {
    if (!pendingDeleteId) return;
    const id = pendingDeleteId;
    setConfirmOpen(false);
    setPendingDeleteId(null);

    try {
      await inventoryService.delete(id);
      setItems((prev) => prev.filter((i) => i.id !== id));
      addToast("Ítem de inventario eliminado correctamente.", "success");
    } catch (error) {
      logError("Error deleting item", error);
      addToast("Error al eliminar el ítem de inventario.", "error");
    }
  };

  const handleAdjustStock = async () => {
    if (!adjustingItem || !adjustmentValue) return;

    const change = parseFloat(adjustmentValue);
    if (isNaN(change)) {
      addToast("Por favor ingresa un número válido.", "error");
      return;
    }

    try {
      const newStock = Math.max(0, adjustingItem.current_stock + change);
      await inventoryService.update(adjustingItem.id, {
        ingredient_name: adjustingItem.ingredient_name,
        current_stock: newStock,
        minimum_stock: adjustingItem.minimum_stock,
        unit: adjustingItem.unit,
        unit_cost: adjustingItem.unit_cost,
        type: adjustingItem.type,
      });

      setItems((prev) =>
        prev.map((item) =>
          item.id === adjustingItem.id
            ? { ...item, current_stock: newStock }
            : item,
        ),
      );

      addToast(
        `Stock de ${adjustingItem.ingredient_name} actualizado.`,
        "success",
      );
      setAdjustingItem(null);
      setAdjustmentValue("");
    } catch (error) {
      logError("Error adjusting stock", error);
      addToast("Error al actualizar el stock.", "error");
    }
  };

  const filteredItems = (items || []).filter((item) => {
    const matchesSearch = item.ingredient_name
      .toLowerCase()
      .includes(searchTerm.toLowerCase());
    const matchesLowStock =
      !showLowStockOnly ||
      (item.minimum_stock > 0 && item.current_stock < item.minimum_stock);
    return matchesSearch && matchesLowStock;
  });

  const ingredients = sortItems(
    filteredItems.filter((item) => item.type === "ingredient"),
    ingredientSort.key,
    ingredientSort.order,
  );
  const equipment = sortItems(
    filteredItems.filter((item) => item.type === "equipment"),
    equipmentSort.key,
    equipmentSort.order,
  );
  const supplies = sortItems(
    filteredItems.filter((item) => item.type === "supply"),
    supplySort.key,
    supplySort.order,
  );

  const handleIngredientSort = (key: SortKey) => {
    setIngredientSort((prev) => ({
      key,
      order: prev.key === key && prev.order === "asc" ? "desc" : "asc",
    }));
  };

  const handleEquipmentSort = (key: SortKey) => {
    setEquipmentSort((prev) => ({
      key,
      order: prev.key === key && prev.order === "asc" ? "desc" : "asc",
    }));
  };

  const handleSupplySort = (key: SortKey) => {
    setSupplySort((prev) => ({
      key,
      order: prev.key === key && prev.order === "asc" ? "desc" : "asc",
    }));
  };

  const renderSortIcon = (
    key: SortKey,
    sort: { key: SortKey; order: SortOrder },
  ) => {
    if (sort.key !== key) return null;
    return sort.order === "asc" ? (
      <ArrowUp className="inline h-3 w-3 ml-1" aria-hidden="true" />
    ) : (
      <ArrowDown className="inline h-3 w-3 ml-1" aria-hidden="true" />
    );
  };

  const getSortAriaSort = (
    key: SortKey,
    sort: { key: SortKey; order: SortOrder },
  ): "ascending" | "descending" | "none" => {
    if (sort.key !== key) return "none";
    return sort.order === "asc" ? "ascending" : "descending";
  };

  const renderTable = (
    sectionItems: InventoryItem[],
    sort: { key: SortKey; order: SortOrder },
    onSort: (key: SortKey) => void,
  ) => (
    <div className="overflow-x-auto">
      <table
        className="min-w-full divide-y divide-border"
        aria-label="Tabla de inventario"
      >
        <thead className="bg-surface-alt">
          <tr>
            <th
              scope="col"
              className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider cursor-pointer hover:bg-surface-alt/50 transition-colors"
              onClick={() => onSort("ingredient_name")}
              aria-sort={getSortAriaSort("ingredient_name", sort)}
            >
              Ítem {renderSortIcon("ingredient_name", sort)}
            </th>
            <th
              scope="col"
              className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider cursor-pointer hover:bg-surface-alt/50 transition-colors"
              onClick={() => onSort("current_stock")}
              aria-sort={getSortAriaSort("current_stock", sort)}
            >
              Stock Actual {renderSortIcon("current_stock", sort)}
            </th>
            <th
              scope="col"
              className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider cursor-pointer hover:bg-surface-alt/50 transition-colors"
              onClick={() => onSort("minimum_stock")}
              aria-sort={getSortAriaSort("minimum_stock", sort)}
            >
              Stock Mínimo {renderSortIcon("minimum_stock", sort)}
            </th>
            <th
              scope="col"
              className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider cursor-pointer hover:bg-surface-alt/50 transition-colors"
              onClick={() => onSort("unit_cost")}
              aria-sort={getSortAriaSort("unit_cost", sort)}
            >
              Costo Unitario {renderSortIcon("unit_cost", sort)}
            </th>
            <th scope="col" className="relative px-6 py-3 text-text-secondary">
              <span className="sr-only">Acciones</span>
            </th>
          </tr>
        </thead>
        <tbody className="bg-card divide-y divide-border">
          {sectionItems.map((item) => {
            const isLowStock =
              item.minimum_stock > 0 &&
              item.current_stock < item.minimum_stock;
            return (
              <tr
                key={item.id}
                className="hover:bg-surface-alt/50 transition-colors cursor-pointer"
                onClick={() => navigate(`/inventory/${item.id}`)}
              >
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm font-medium text-text">
                    {item.ingredient_name}
                  </div>
                  <div className="text-sm text-text-secondary">
                    Unidad: {item.unit}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center">
                    <span
                      className={clsx(
                        "text-sm font-medium",
                        isLowStock ? "text-error font-bold" : "text-text",
                      )}
                    >
                      {item.current_stock}
                    </span>
                    {isLowStock && (
                      <AlertTriangle
                        className="h-4 w-4 text-error ml-2"
                        aria-hidden="true"
                      />
                    )}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-text-secondary">
                  {item.minimum_stock}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-text-secondary">
                  ${item.unit_cost?.toFixed(2) || "0.00"}
                </td>
                <td
                  className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium"
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="flex justify-end space-x-2">
                    <button
                      type="button"
                      onClick={() => {
                        setAdjustingItem(item);
                        setAdjustmentValue("");
                      }}
                      className="text-primary hover:bg-primary/10 p-1.5 rounded-lg transition-colors mr-1"
                      title="Ajustar Stock"
                    >
                      <Plus className="h-4 w-4" />
                    </button>
                    <Link
                      to={`/inventory/${item.id}/edit`}
                      className="p-1.5 text-text-secondary hover:text-primary hover:bg-surface-alt rounded-lg transition-colors inline-block"
                      aria-label={`Editar ${item.ingredient_name}`}
                    >
                      <Edit className="h-5 w-5" aria-hidden="true" />
                    </Link>
                    <button
                      type="button"
                      onClick={() => requestDelete(item.id)}
                      className="p-1.5 text-text-secondary hover:text-error hover:bg-error/10 rounded-lg transition-colors inline-block"
                      aria-label={`Eliminar ${item.ingredient_name}`}
                    >
                      <Trash2 className="h-5 w-5" aria-hidden="true" />
                    </button>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );

  return (
    <div className="space-y-6">
      <ConfirmDialog
        open={confirmOpen}
        title="Eliminar ítem"
        description="Esta acción no se puede deshacer."
        confirmText="Eliminar"
        cancelText="Cancelar"
        onConfirm={confirmDelete}
        onCancel={() => {
          setConfirmOpen(false);
          setPendingDeleteId(null);
        }}
      />
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <h1 className="text-2xl font-bold text-text">Inventario</h1>
        <div className="flex flex-wrap items-center gap-2">
          {items.length > 0 && (
            <button
              type="button"
              onClick={() =>
                exportToCsv(
                  "inventario",
                  [
                    "Nombre",
                    "Tipo",
                    "Stock Actual",
                    "Stock Mínimo",
                    "Unidad",
                    "Costo Unitario",
                  ],
                  items.map((i) => [
                    i.ingredient_name,
                    i.type === "equipment"
                      ? "Equipo"
                      : i.type === "supply"
                        ? "Insumo por Evento"
                        : "Insumo",
                    i.current_stock,
                    i.minimum_stock,
                    i.unit,
                    i.unit_cost?.toFixed(2),
                  ]),
                )
              }
              className="inline-flex items-center justify-center px-4 py-2 border border-border text-sm font-medium rounded-xl text-text-secondary bg-card hover:bg-surface-alt shadow-sm transition-colors"
              aria-label="Exportar inventario a CSV"
            >
              <Download className="h-4 w-4 mr-2" aria-hidden="true" />
              CSV
            </button>
          )}
          <Link
            to="/inventory/new"
            className="inline-flex items-center justify-center px-4 py-2 text-sm font-bold rounded-xl text-white premium-gradient shadow-md shadow-primary/20 hover:shadow-lg hover:shadow-primary/30 transition-all hover:scale-[1.02]"
          >
            <Plus className="h-5 w-5 mr-2" aria-hidden="true" />
            Nuevo Ítem
          </Link>
        </div>
      </div>

      {lowStockItems.length > 0 && (
        <button
          type="button"
          onClick={() => setShowLowStockOnly((v) => !v)}
          className="w-full flex items-center gap-3 bg-error/5 border border-error/30 text-error rounded-2xl p-4 hover:bg-error/10 transition-colors text-left"
          aria-pressed={showLowStockOnly}
        >
          <AlertTriangle
            className="h-5 w-5 shrink-0 mt-0.5"
            aria-hidden="true"
          />
          <div className="text-sm flex-1">
            <span className="font-bold">Stock bajo detectado:</span>{" "}
            {lowStockItems.length} ítem{lowStockItems.length !== 1 ? "s" : ""}{" "}
            por debajo del nivel mínimo.
          </div>
          <span className="text-xs font-semibold underline shrink-0">
            {showLowStockOnly ? "Ver todos" : "Ver alertas"}
          </span>
        </button>
      )}

      <div className="relative max-w-md">
        <label htmlFor="inventory-search" className="sr-only">
          Buscar en inventario
        </label>
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <Search className="h-5 w-5 text-text-secondary" aria-hidden="true" />
        </div>
        <input
          id="inventory-search"
          type="search"
          className="block w-full pl-10 pr-3 py-2 border border-border rounded-xl leading-5 bg-card text-text placeholder-text-secondary focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary sm:text-sm transition duration-150 ease-in-out"
          placeholder="Buscar en inventario..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          aria-label="Buscar ítems por nombre"
        />
      </div>

      {loading ? (
        <div className="bg-card shadow-sm overflow-hidden rounded-3xl border border-border">
          <SkeletonTable
            rows={6}
            columns={[
              { width: "w-40" },
              { width: "w-20" },
              { width: "w-20" },
              { width: "w-24" },
              { width: "w-20" },
            ]}
          />
        </div>
      ) : filteredItems.length === 0 ? (
        <div className="bg-card shadow-sm overflow-hidden rounded-3xl border border-border">
          <Empty
            icon={Package}
            title="No se encontraron ítems"
            description={
              searchTerm || showLowStockOnly
                ? "Intenta ajustar los filtros de búsqueda."
                : "Comienza agregando tu primer ítem al inventario."
            }
            action={
              !searchTerm && !showLowStockOnly ? (
                <Link
                  to="/inventory/new"
                  className="inline-flex items-center justify-center px-4 py-2 text-sm font-bold rounded-xl text-white premium-gradient shadow-md shadow-primary/20 hover:shadow-lg transition-all hover:scale-[1.02]"
                >
                  <Plus className="h-5 w-5 mr-2" aria-hidden="true" />
                  Agregar Ítem
                </Link>
              ) : undefined
            }
          />
        </div>
      ) : (
        <div className="space-y-8">
          {/* Consumibles / Ingredientes Section */}
          <section>
            <div className="flex items-center gap-3 mb-3">
              <div className="flex items-center justify-center w-9 h-9 rounded-xl bg-primary/10">
                <ShoppingBasket
                  className="h-5 w-5 text-primary"
                  aria-hidden="true"
                />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-text">Consumibles</h2>
                <p className="text-xs text-text-secondary">
                  {ingredients.length}{" "}
                  {ingredients.length === 1 ? "insumo" : "insumos"}
                </p>
              </div>
            </div>
            <div className="bg-card shadow-sm overflow-hidden rounded-3xl border border-border">
              {ingredients.length === 0 ? (
                <div className="px-6 py-8 text-center text-sm text-text-secondary">
                  No hay insumos
                  {searchTerm
                    ? " que coincidan con la búsqueda"
                    : " registrados"}
                  .
                </div>
              ) : (
                renderTable(ingredients, ingredientSort, handleIngredientSort)
              )}
            </div>
          </section>

          {/* Insumos por Evento Section */}
          <section>
            <div className="flex items-center gap-3 mb-3">
              <div className="flex items-center justify-center w-9 h-9 rounded-xl bg-warning/10">
                <Fuel className="h-5 w-5 text-warning" aria-hidden="true" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-text">
                  Insumos por Evento
                </h2>
                <p className="text-xs text-text-secondary">
                  {supplies.length}{" "}
                  {supplies.length === 1 ? "insumo" : "insumos"} de costo fijo
                  por evento
                </p>
              </div>
            </div>
            <div className="bg-card shadow-sm overflow-hidden rounded-3xl border border-border">
              {supplies.length === 0 ? (
                <div className="px-6 py-8 text-center text-sm text-text-secondary">
                  No hay insumos por evento
                  {searchTerm
                    ? " que coincidan con la búsqueda"
                    : " registrados"}
                  .
                </div>
              ) : (
                renderTable(supplies, supplySort, handleSupplySort)
              )}
            </div>
          </section>

          {/* Equipos Section */}
          <section>
            <div className="flex items-center gap-3 mb-3">
              <div className="flex items-center justify-center w-9 h-9 rounded-xl bg-purple-500/10">
                <Wrench
                  className="h-5 w-5 text-purple-500"
                  aria-hidden="true"
                />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-text">Equipos</h2>
                <p className="text-xs text-text-secondary">
                  {equipment.length}{" "}
                  {equipment.length === 1 ? "equipo" : "equipos"}
                </p>
              </div>
            </div>
            <div className="bg-card shadow-sm overflow-hidden rounded-3xl border border-border">
              {equipment.length === 0 ? (
                <div className="px-6 py-8 text-center text-sm text-text-secondary">
                  No hay equipos
                  {searchTerm
                    ? " que coincidan con la búsqueda"
                    : " registrados"}
                  .
                </div>
              ) : (
                renderTable(equipment, equipmentSort, handleEquipmentSort)
              )}
            </div>
          </section>
        </div>
      )}

      {/* Stock Adjustment Modal */}
      {adjustingItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-card w-full max-w-sm rounded-3xl border border-border shadow-2xl p-6 animate-in fade-in zoom-in duration-200">
            <h2 className="text-xl font-bold text-text mb-2">Ajustar Stock</h2>
            <p className="text-sm text-text-secondary mb-4">
              {adjustingItem.ingredient_name} ({adjustingItem.current_stock}{" "}
              {adjustingItem.unit})
            </p>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-text-secondary mb-1">
                  Cantidad a sumar/restar
                </label>
                <input
                  type="number"
                  autoFocus
                  className="w-full bg-surface-alt border border-border rounded-xl p-3 text-text focus:ring-2 focus:ring-primary/20 outline-none"
                  placeholder="Ej: +10 o -5"
                  value={adjustmentValue}
                  onChange={(e) => setAdjustmentValue(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleAdjustStock();
                    if (e.key === "Escape") setAdjustingItem(null);
                  }}
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setAdjustingItem(null)}
                  className="flex-1 py-2.5 rounded-xl border border-border text-sm font-medium text-text-secondary hover:bg-surface-alt transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleAdjustStock}
                  className="flex-1 py-2.5 rounded-xl premium-gradient text-white text-sm font-semibold transition-all shadow-lg shadow-primary/20 hover:shadow-primary/30"
                >
                  Confirmar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
