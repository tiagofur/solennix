import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
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
  Eye,
  ArrowUp,
  ArrowDown,
} from "lucide-react";
import { RowActionMenu } from "../../components/RowActionMenu";
import { exportToCsv } from "../../lib/exportCsv";
import clsx from "clsx";
import { ConfirmDialog } from "../../components/ConfirmDialog";
import Empty from "../../components/Empty";
import { useToast } from "../../hooks/useToast";
import { SkeletonTable } from "../../components/Skeleton";
import { Modal } from "../../components/Modal";
import { useInventoryItems, useDeleteInventoryItem, useUpdateInventoryItem } from "../../hooks/queries/useInventoryQueries";

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

const InlineStockCell: React.FC<{
  item: InventoryItem;
  isLowStock: boolean;
  onSave: (newStock: number) => void;
}> = ({ item, isLowStock, onSave }) => {
  const { t } = useTranslation(["inventory"]);
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(String(item.current_stock));

  const handleSave = () => {
    setEditing(false);
    const newStock = Math.max(0, Number(value) || 0);
    if (newStock !== item.current_stock) {
      onSave(newStock);
    }
  };

  if (editing) {
    return (
      <input
        type="number"
        min="0"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onBlur={handleSave}
        onKeyDown={(e) => { if (e.key === 'Enter') handleSave(); if (e.key === 'Escape') setEditing(false); }}
        className="w-20 text-sm border border-primary rounded-lg px-2 py-1 bg-card text-text focus:ring-2 focus:ring-primary/20 focus:outline-none"
        autoFocus
        aria-label={t("inventory:list.edit_stock_aria", { name: item.ingredient_name })}
      />
    );
  }

  return (
    <div className="flex items-center">
      <button
        type="button"
        onClick={() => { setValue(String(item.current_stock)); setEditing(true); }}
        className={clsx(
          "text-sm font-medium hover:underline hover:text-primary transition-colors cursor-text",
          isLowStock ? "text-error font-bold" : "text-text",
        )}
        aria-label={`Click para editar stock de ${item.ingredient_name}: ${item.current_stock}`}
        title="Click para editar"
      >
        {item.current_stock}
      </button>
      {isLowStock && (
        <AlertTriangle className="h-4 w-4 text-error ml-2" aria-hidden="true" />
      )}
    </div>
  );
};


export const InventoryList: React.FC = () => {
  const { t, i18n } = useTranslation(["inventory", "common"]);
  const navigate = useNavigate();
  const { data: rawItems, isLoading: loading } = useInventoryItems();
  const items = rawItems ?? [];
  const deleteItem = useDeleteInventoryItem();
  const updateItem = useUpdateInventoryItem();
  const [searchTerm, setSearchTerm] = useState("");
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const [adjustingItem, setAdjustingItem] = useState<InventoryItem | null>(
    null,
  );
  const [adjustmentValue, setAdjustmentValue] = useState<string>("");
  const { addToast } = useToast();

  const moneyLocale = i18n.language === "en" ? "en-US" : "es-MX";

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

  const lowStockItems = (items || []).filter(
    (item) =>
      item.minimum_stock > 0 && item.current_stock < item.minimum_stock,
  );

  const requestDelete = (id: string) => {
    setPendingDeleteId(id);
    setConfirmOpen(true);
  };

  const confirmDelete = () => {
    if (!pendingDeleteId) return;
    const id = pendingDeleteId;
    setConfirmOpen(false);
    setPendingDeleteId(null);
    deleteItem.mutate(id);
  };

  const handleAdjustStock = () => {
    if (!adjustingItem || !adjustmentValue) return;

    const change = parseFloat(adjustmentValue);
    if (isNaN(change)) {
      addToast(t("inventory:form.validation.cost_min"), "error");
      return;
    }

    const newStock = Math.max(0, adjustingItem.current_stock + change);
    updateItem.mutate(
      {
        id: adjustingItem.id,
        data: {
          ingredient_name: adjustingItem.ingredient_name,
          current_stock: newStock,
          minimum_stock: adjustingItem.minimum_stock,
          unit: adjustingItem.unit,
          unit_cost: adjustingItem.unit_cost,
          type: adjustingItem.type,
        },
      },
      {
        onSuccess: () => {
          addToast(t("inventory:details.usage_in_products"), "success");
          setAdjustingItem(null);
          setAdjustmentValue("");
        },
      },
    );
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

  const renderMobileSortBar = (
    sort: { key: SortKey; order: SortOrder },
    setSort: React.Dispatch<React.SetStateAction<{ key: SortKey; order: SortOrder }>>,
  ) => {
    const sortLabels: Record<SortKey, string> = {
      ingredient_name: t("inventory:form.name"),
      current_stock: t("inventory:list.stock"),
      minimum_stock: t("inventory:list.min_stock"),
      unit_cost: t("inventory:list.unit_cost"),
    };
    const sortKeys = Object.keys(sortLabels) as SortKey[];
    return (
      <div className="flex items-center gap-2 px-4 py-2 border-b border-border sm:hidden">
        <span className="text-xs text-text-secondary font-medium whitespace-nowrap">{t("common:action.search")}:</span>
        <select
          className="flex-1 text-xs bg-surface-alt border border-border rounded-lg px-2 py-1.5 text-text focus:outline-none focus:ring-2 focus:ring-primary/30"
          value={`${sort.key}-${sort.order}`}
          onChange={(e) => {
            const [key, order] = e.target.value.split("-") as [SortKey, SortOrder];
            setSort({ key, order });
          }}
          aria-label="Ordenar ítems"
        >
          {sortKeys.map((key) => (
            <React.Fragment key={key}>
              <option value={`${key}-asc`}>{sortLabels[key]} ↑</option>
              <option value={`${key}-desc`}>{sortLabels[key]} ↓</option>
            </React.Fragment>
          ))}
        </select>
      </div>
    );
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
    tableLabel: string,
  ) => (
    <div className="overflow-x-auto">
      <table
        className="min-w-full divide-y divide-border"
        aria-label={tableLabel}
      >
        <thead className="bg-surface-alt">
          <tr>
            <th
              scope="col"
              className="px-6 py-3 text-left text-xs font-semibold text-text-secondary cursor-pointer hover:bg-surface-alt/50 transition-colors"
              onClick={() => onSort("ingredient_name")}
              aria-sort={getSortAriaSort("ingredient_name", sort)}
            >
              {t("inventory:form.name")} {renderSortIcon("ingredient_name", sort)}
            </th>
            <th
              scope="col"
              className="px-6 py-3 text-left text-xs font-semibold text-text-secondary cursor-pointer hover:bg-surface-alt/50 transition-colors"
              onClick={() => onSort("current_stock")}
              aria-sort={getSortAriaSort("current_stock", sort)}
            >
              {t("inventory:list.stock")} {renderSortIcon("current_stock", sort)}
            </th>
            <th
              scope="col"
              className="px-6 py-3 text-left text-xs font-semibold text-text-secondary cursor-pointer hover:bg-surface-alt/50 transition-colors"
              onClick={() => onSort("minimum_stock")}
              aria-sort={getSortAriaSort("minimum_stock", sort)}
            >
              {t("inventory:list.min_stock")} {renderSortIcon("minimum_stock", sort)}
            </th>
            <th
              scope="col"
              className="px-6 py-3 text-left text-xs font-semibold text-text-secondary cursor-pointer hover:bg-surface-alt/50 transition-colors"
              onClick={() => onSort("unit_cost")}
              aria-sort={getSortAriaSort("unit_cost", sort)}
            >
              {t("inventory:list.unit_cost")} {renderSortIcon("unit_cost", sort)}
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
                className="group hover:bg-surface-alt/50 transition-colors cursor-pointer"
                onClick={() => navigate(`/inventory/${item.id}`)}
              >
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm font-medium text-text">
                    {item.ingredient_name}
                  </div>
                  <div className="text-sm text-text-secondary">
                    {t("inventory:form.unit")}: {item.unit}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                  <InlineStockCell
                    item={item}
                    isLowStock={isLowStock}
                    onSave={(newStock) => {
                      updateItem.mutate({
                        id: item.id,
                        data: {
                          ingredient_name: item.ingredient_name,
                          current_stock: newStock,
                          minimum_stock: item.minimum_stock,
                          unit: item.unit,
                          unit_cost: item.unit_cost,
                          type: item.type,
                        },
                      }, {
                        onSuccess: () => addToast(t("common:action.save_success"), "success"),
                      });
                    }}
                  />
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-text-secondary">
                  {item.minimum_stock}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-text-secondary">
                  ${item.unit_cost?.toLocaleString(moneyLocale, { minimumFractionDigits: 2 }) || "0.00"}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                  <div className="opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity">
                    <RowActionMenu items={[
                      { label: t("common:action.view"), icon: Eye, onClick: () => navigate(`/inventory/${item.id}`) },
                      { label: t("common:action.edit"), icon: Edit, onClick: () => navigate(`/inventory/${item.id}/edit`) },
                      { label: t("common:action.delete"), icon: Trash2, onClick: () => requestDelete(item.id), variant: 'destructive' as const },
                    ]} />
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
        title={t("inventory:details.delete_confirm_title")}
        description={t("inventory:details.delete_confirm_desc")}
        confirmText={t("common:action.delete")}
        cancelText={t("common:action.cancel")}
        onConfirm={confirmDelete}
        onCancel={() => {
          setConfirmOpen(false);
          setPendingDeleteId(null);
        }}
      />
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <h1 className="text-2xl font-bold text-text tracking-tight">{t("inventory:title")}</h1>
        <div className="flex flex-wrap items-center gap-2">
          {items.length > 0 && (
            <button
              type="button"
              onClick={() =>
                exportToCsv(
                  "inventario",
                  [
                    t("inventory:form.name"),
                    t("inventory:form.type"),
                    t("inventory:list.stock"),
                    t("inventory:list.min_stock"),
                    t("inventory:form.unit"),
                    t("inventory:list.unit_cost"),
                  ],
                  items.map((i) => [
                    i.ingredient_name,
                    i.type === "equipment"
                      ? t("inventory:list.type_equipment")
                      : i.type === "supply"
                        ? t("inventory:list.type_supply")
                        : t("inventory:list.type_ingredient"),
                    i.current_stock,
                    i.minimum_stock,
                    i.unit,
                    i.unit_cost?.toFixed(2),
                  ]),
                )
              }
              className="inline-flex items-center justify-center px-4 py-2 border border-border text-sm font-medium rounded-xl text-text-secondary bg-card hover:bg-surface-alt shadow-sm transition-colors"
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
            {t("inventory:new_item")}
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
            <span className="font-bold">{t("inventory:details.stats.alert_title")}:</span>{" "}
            {lowStockItems.length} {t("inventory:title").toLowerCase()} {t("inventory:details.stats.alert_desc")}
          </div>
          <span className="text-xs font-semibold underline shrink-0">
            {showLowStockOnly ? t("common:action.view_all") : t("common:action.view_alerts")}
          </span>
        </button>
      )}

      <div className="relative max-w-md">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <Search className="h-5 w-5 text-text-secondary" aria-hidden="true" />
        </div>
        <input
          id="inventory-search"
          type="search"
          className="block w-full pl-10 pr-3 py-2 border border-border rounded-xl leading-5 bg-card text-text placeholder-text-secondary focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary sm:text-sm transition duration-150 ease-in-out"
          placeholder={t("inventory:list.search_placeholder")}
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      {loading ? (
        <div className="bg-card shadow-sm overflow-hidden rounded-2xl border border-border">
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
        <div className="bg-card shadow-sm overflow-hidden rounded-2xl border border-border">
          <Empty
            icon={Package}
            title={t("inventory:list.no_results")}
            description={
              searchTerm || showLowStockOnly
                ? showLowStockOnly ? t("inventory:list.no_alerts") : t("inventory:list.no_results")
                : t("inventory:list.add_first")
            }
            action={
              !searchTerm && !showLowStockOnly ? (
                <Link
                  to="/inventory/new"
                  className="inline-flex items-center justify-center px-4 py-2 text-sm font-bold rounded-xl text-white premium-gradient shadow-md shadow-primary/20 hover:shadow-lg transition-all hover:scale-[1.02]"
                >
                  <Plus className="h-5 w-5 mr-2" aria-hidden="true" />
                  {t("inventory:new_item")}
                </Link>
              ) : undefined
            }
          />
        </div>
      ) : (
        <div className="space-y-8">
          <section>
            <div className="flex items-center gap-3 mb-3">
              <div className="flex items-center justify-center w-9 h-9 rounded-xl bg-primary/10">
                <ShoppingBasket
                  className="h-5 w-5 text-primary"
                  aria-hidden="true"
                />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-text">{t("inventory:list.type_ingredient")}</h2>
                <p className="text-xs text-text-secondary">
                  {ingredients.length}{" "}
                  {t("inventory:list.type_ingredient").toLowerCase()}
                </p>
              </div>
            </div>
            <div className="bg-card shadow-sm overflow-hidden rounded-2xl border border-border">
              {ingredients.length === 0 ? (
                <div className="px-6 py-8 text-center text-sm text-text-secondary">
                  {t("inventory:list.no_results")}
                </div>
              ) : (
                <>
                  {renderMobileSortBar(ingredientSort, setIngredientSort)}
                  {renderTable(ingredients, ingredientSort, handleIngredientSort, t("inventory:list.type_ingredient"))}
                </>
              )}
            </div>
          </section>

          <section>
            <div className="flex items-center gap-3 mb-3">
              <div className="flex items-center justify-center w-9 h-9 rounded-xl bg-warning/10">
                <Fuel className="h-5 w-5 text-warning" aria-hidden="true" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-text">
                  {t("inventory:list.type_supply")}
                </h2>
                <p className="text-xs text-text-secondary">
                  {supplies.length}{" "}
                  {t("inventory:list.type_supply").toLowerCase()}
                </p>
              </div>
            </div>
            <div className="bg-card shadow-sm overflow-hidden rounded-2xl border border-border">
              {supplies.length === 0 ? (
                <div className="px-6 py-8 text-center text-sm text-text-secondary">
                  {t("inventory:list.no_results")}
                </div>
              ) : (
                <>
                  {renderMobileSortBar(supplySort, setSupplySort)}
                  {renderTable(supplies, supplySort, handleSupplySort, t("inventory:list.type_supply"))}
                </>
              )}
            </div>
          </section>

          <section>
            <div className="flex items-center gap-3 mb-3">
              <div className="flex items-center justify-center w-9 h-9 rounded-xl bg-info/10">
                <Wrench
                  className="h-5 w-5 text-info"
                  aria-hidden="true"
                />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-text">{t("inventory:list.type_equipment")}</h2>
                <p className="text-xs text-text-secondary">
                  {equipment.length}{" "}
                  {t("inventory:list.type_equipment").toLowerCase()}
                </p>
              </div>
            </div>
            <div className="bg-card shadow-sm overflow-hidden rounded-2xl border border-border">
              {equipment.length === 0 ? (
                <div className="px-6 py-8 text-center text-sm text-text-secondary">
                  {t("inventory:list.no_results")}
                </div>
              ) : (
                <>
                  {renderMobileSortBar(equipmentSort, setEquipmentSort)}
                  {renderTable(equipment, equipmentSort, handleEquipmentSort, t("inventory:list.type_equipment"))}
                </>
              )}
            </div>
          </section>
        </div>
      )}

      <Modal
        isOpen={!!adjustingItem}
        onClose={() => setAdjustingItem(null)}
        title={t("common:action.edit")}
        maxWidth="sm"
      >
        {adjustingItem && (
          <div className="space-y-4">
            <p className="text-sm text-text-secondary">
              {adjustingItem.ingredient_name} ({adjustingItem.current_stock}{" "}
              {adjustingItem.unit})
            </p>
            <div>
              <label className="block text-xs font-semibold text-text-secondary mb-1">
                {t("inventory:form.current_stock")}
              </label>
              <input
                type="number"
                autoFocus
                className="w-full bg-surface-alt border border-border rounded-xl p-3 text-text focus:ring-2 focus:ring-primary/20 outline-none"
                placeholder={t("inventory:list.example_placeholder")}
                value={adjustmentValue}
                onChange={(e) => setAdjustmentValue(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleAdjustStock();
                }}
              />
            </div>
            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => setAdjustingItem(null)}
                className="flex-1 py-2.5 rounded-xl border border-border text-sm font-medium text-text-secondary hover:bg-surface-alt transition-colors"
              >
                {t("common:action.cancel")}
              </button>
              <button
                type="button"
                onClick={handleAdjustStock}
                className="flex-1 py-2.5 rounded-xl premium-gradient text-white text-sm font-semibold transition-all shadow-lg shadow-primary/20 hover:shadow-primary/30"
              >
                {t("common:action.confirm")}
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};
