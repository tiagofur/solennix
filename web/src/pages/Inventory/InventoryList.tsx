import React, { useMemo, useState, useCallback } from "react";
import { useNavigate, Link, useSearchParams } from "react-router-dom";
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
  MousePointerClick,
  type LucideIcon,
} from "lucide-react";
import { RowActionMenu } from "../../components/RowActionMenu";
import { exportToCsv } from "../../lib/exportCsv";
import clsx from "clsx";
import { ConfirmDialog } from "../../components/ConfirmDialog";
import Empty from "../../components/Empty";
import { SplitPane } from "../../components/SplitPane";
import { useIsXl } from "../../hooks/useBreakpoint";
import { useToast } from "../../hooks/useToast";
import { SkeletonTable } from "../../components/Skeleton";
import { Modal } from "../../components/Modal";
import { Button } from "../../components/Button";
import { BulkActionBar } from "../../components/BulkActionBar";
import { Card } from "../../components/Card";
import { Input } from "../../components/Input";
import { Pagination } from "../../components/Pagination";
import { usePagination } from "../../hooks/usePagination";
import { useRowSelection } from "../../hooks/useRowSelection";
import { useInventoryItems, useDeleteInventoryItem, useUpdateInventoryItem } from "../../hooks/queries/useInventoryQueries";
import { InventoryDetailPanel } from "./InventoryDetails";

type SortKey =
  | "ingredient_name"
  | "current_stock"
  | "minimum_stock"
  | "unit_cost";
type SortOrder = "asc" | "desc";
type InventoryType = InventoryItem["type"];

const ITEMS_PER_PAGE = 10;

const TYPE_VISUALS: Record<
  InventoryType,
  { icon: LucideIcon; bg: string; color: string; labelKey: string }
> = {
  ingredient: {
    icon: ShoppingBasket,
    bg: "bg-primary/10",
    color: "text-primary",
    labelKey: "inventory:list.type_ingredient",
  },
  supply: {
    icon: Fuel,
    bg: "bg-warning/10",
    color: "text-warning",
    labelKey: "inventory:list.type_supply",
  },
  equipment: {
    icon: Wrench,
    bg: "bg-info/10",
    color: "text-info",
    labelKey: "inventory:list.type_equipment",
  },
};

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

const InventoryTypeIcon: React.FC<{ type: InventoryType }> = ({ type }) => {
  const { t } = useTranslation(["inventory"]);
  const visual = TYPE_VISUALS[type] ?? TYPE_VISUALS.ingredient;
  const Icon = visual.icon;

  return (
    <div
      className={clsx(
        "flex items-center justify-center w-9 h-9 rounded-xl shrink-0",
        visual.bg,
      )}
      title={t(visual.labelKey)}
    >
      <Icon className={clsx("h-4 w-4", visual.color)} aria-hidden="true" />
      <span className="sr-only">{t(visual.labelKey)}</span>
    </div>
  );
};

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
        aria-label={t("inventory:list.inline_edit_aria", { name: item.ingredient_name, stock: item.current_stock })}
        title={t("inventory:list.inline_edit_title")}
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
  // Master-detail split pane (#879): at xl+, selecting a row opens detail in
  // the right rail via the `selected` URL param; below xl rows navigate.
  const isXl = useIsXl();
  const [searchParams, setSearchParams] = useSearchParams();
  const selectedId = searchParams.get("selected");

  const selectItem = useCallback(
    (itemId: string) => {
      setSearchParams(
        (prev) => {
          prev.set("selected", itemId);
          return prev;
        },
        { replace: true },
      );
    },
    [setSearchParams],
  );

  const clearSelected = useCallback(() => {
    setSearchParams(
      (prev) => {
        prev.delete("selected");
        return prev;
      },
      { replace: true },
    );
  }, [setSearchParams]);

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

  const [activeScope, setActiveScope] = useState<"all" | "ingredient" | "supply" | "equipment">("all");

  const scopeChips = [
    { label: t("inventory:list.scope_all"), value: "all" },
    { label: t("inventory:list.scope_ingredient"), value: "ingredient" },
    { label: t("inventory:list.scope_supply"), value: "supply" },
    { label: t("inventory:list.scope_equipment"), value: "equipment" },
  ];

  const [showLowStockOnly, setShowLowStockOnly] = useState(false);
  const [listSort, setListSort] = useState<{
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
      addToast(t("inventory:list.invalid_adjustment"), "error");
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
          addToast(t("inventory:list.stock_adjusted"), "success");
          setAdjustingItem(null);
          setAdjustmentValue("");
        },
      },
    );
  };

  const filteredItems = useMemo(
    () =>
      (items || []).filter((item) => {
        const matchesSearch = item.ingredient_name
          .toLowerCase()
          .includes(searchTerm.toLowerCase());
        const matchesLowStock =
          !showLowStockOnly ||
          (item.minimum_stock > 0 && item.current_stock < item.minimum_stock);
        const matchesScope = activeScope === "all" || item.type === activeScope;
        return matchesSearch && matchesLowStock && matchesScope;
      }),
    [items, searchTerm, showLowStockOnly, activeScope],
  );

  const sortedItems = useMemo(
    () => sortItems(filteredItems, listSort.key, listSort.order),
    [filteredItems, listSort],
  );

  const {
    currentData: paginatedItems,
    currentPage,
    totalPages,
    totalItems,
    handlePageChange,
  } = usePagination({
    data: sortedItems,
    itemsPerPage: ITEMS_PER_PAGE,
    initialSortKey: "",
  });

  // Multi-select for bulk actions (#885) — desktop only column.
  const selection = useRowSelection(paginatedItems.map((item) => item.id));

  const bulkDelete = () => {
    selection.selectedArray.forEach((id) => deleteItem.mutate(id));
    selection.clear();
  };

  const exportSelected = () => {
    const selectedItems = items.filter((item) => selection.selected.has(item.id));
    exportToCsv(
      t("inventory:list.csv_filename"),
      [
        t("inventory:form.name"),
        t("inventory:form.type"),
        t("inventory:list.stock"),
        t("inventory:list.min_stock"),
        t("inventory:form.unit"),
        t("inventory:list.unit_cost"),
      ],
      selectedItems.map((i) => [
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
    );
  };

  const handleSort = (key: SortKey) => {
    setListSort((prev) => ({
      key,
      order: prev.key === key && prev.order === "asc" ? "desc" : "asc",
    }));
    handlePageChange(1);
  };

  const resetToFirstPage = () => handlePageChange(1);

  const renderMobileSortBar = () => {
    const sortLabels: Record<SortKey, string> = {
      ingredient_name: t("inventory:form.name_accessible"),
      current_stock: t("inventory:list.stock"),
      minimum_stock: t("inventory:list.min_stock"),
      unit_cost: t("inventory:list.unit_cost"),
    };
    const sortKeys = Object.keys(sortLabels) as SortKey[];
    return (
      <div className="flex items-center gap-2 px-4 py-2 border-b border-border sm:hidden">
        <span className="text-xs text-text-secondary font-medium whitespace-nowrap">{t("inventory:list.sort_label")}:</span>
        <select
          className="flex-1 text-xs bg-surface-alt border border-border rounded-lg px-2 py-1.5 text-text focus:outline-none focus:ring-2 focus:ring-primary/30"
          value={`${listSort.key}-${listSort.order}`}
          onChange={(e) => {
            const [key, order] = e.target.value.split("-") as [SortKey, SortOrder];
            setListSort({ key, order });
            resetToFirstPage();
          }}
          aria-label={t("inventory:list.sort_items")}
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

  const renderSortIcon = (key: SortKey) => {
    if (listSort.key !== key) return null;
    return listSort.order === "asc" ? (
      <ArrowUp className="inline h-3 w-3 ml-1" aria-hidden="true" />
    ) : (
      <ArrowDown className="inline h-3 w-3 ml-1" aria-hidden="true" />
    );
  };

  const getSortAriaSort = (key: SortKey): "ascending" | "descending" | "none" => {
    if (listSort.key !== key) return "none";
    return listSort.order === "asc" ? "ascending" : "descending";
  };

  // Master-detail split pane (#879): the list chrome is identical on every
  // breakpoint; at xl+ it becomes the left rail with the detail panel on the
  // right. Below xl the detail is hidden and rows navigate to the full page.
  const detailPanel = selectedId ? (
    <InventoryDetailPanel itemId={selectedId} embedded onDeleted={clearSelected} />
  ) : (
    <Empty
      icon={MousePointerClick}
      showImage={false}
      title={t("common:split.select_item")}
      description={t("common:split.select_item_hint")}
      className="h-full justify-center"
    />
  );

  const listContent = (
    <div className="space-y-6">
      <ConfirmDialog
        open={confirmOpen}
        title={t("inventory:details.delete_confirm_title")}
        description={t("inventory:details.delete_confirm_desc")}
        confirmText={t("common:actions.delete_permanent")}
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
            <Button
              variant="glass"
              onClick={() =>
                exportToCsv(
                  t("inventory:list.csv_filename"),
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
            >
              <Download className="h-4 w-4 mr-2" aria-hidden="true" />
              {t("inventory:list.export_csv")}
            </Button>
          )}
          <Link
            to="/inventory/new"
            className="inline-flex items-center justify-center font-semibold transition-all active-ios-scale px-5 py-2.5 text-sm rounded-xl gap-2 bg-linear-to-br from-primary to-primary-dark text-on-primary shadow-xs hover:shadow-sm active:opacity-90"
          >
            <Plus className="h-5 w-5 mr-2" aria-hidden="true" />
            {t("inventory:new_item")}
          </Link>
        </div>
      </div>

      {lowStockItems.length > 0 && (
        <button
          type="button"
          onClick={() => {
            setShowLowStockOnly((v) => !v);
            resetToFirstPage();
          }}
          className="w-full flex items-center gap-3 bg-error/5 border border-error/20 text-error rounded-2xl p-4 hover:bg-error/10 transition-colors text-left"
          aria-pressed={showLowStockOnly}
        >
          <AlertTriangle
            className="h-5 w-5 shrink-0 mt-0.5"
            aria-hidden="true"
          />
          <div className="text-sm flex-1">
            <span className="font-bold">{t("inventory:details.stats.alert_title")}:</span>{" "}
             {t("inventory:list.low_stock_count", { count: lowStockItems.length })} {t("inventory:details.stats.alert_desc")}
          </div>
          <span className="text-xs font-semibold underline shrink-0">
            {showLowStockOnly ? t("common:action.view_all") : t("common:action.view_alerts")}
          </span>
        </button>
      )}

      <div className="relative max-w-md">
        <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-text-secondary pointer-events-none z-10" aria-hidden="true" />
        <Input
          id="inventory-search"
          type="search"
          className="pl-11 pr-10 bg-card/60 hover:bg-surface-alt/40 focus:bg-card focus:border-primary"
          placeholder={t("inventory:list.search_placeholder")}
          value={searchTerm}
          onChange={(e) => {
            setSearchTerm(e.target.value);
            resetToFirstPage();
          }}
        />
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="flex flex-wrap gap-2">
          {scopeChips.map((chip) => (
            <button
              key={chip.value}
              type="button"
              onClick={() => {
                setActiveScope(chip.value as typeof activeScope);
                resetToFirstPage();
              }}
              className={clsx(
                "px-4 py-1.5 rounded-full text-xs font-semibold border transition-all duration-200 active-ios-scale",
                activeScope === chip.value
                  ? "bg-primary text-on-primary border-primary shadow-xs"
                  : "bg-surface-alt/70 text-text-secondary border-border hover:border-border-strong hover:bg-surface-alt"
              )}
            >
              {chip.label}
            </button>
          ))}
        </div>
      </div>

      <Card variant="glass" padding="none" className="overflow-hidden">
        {loading ? (
          <SkeletonTable
            rows={6}
            columns={[
              { width: "w-10" },
              { width: "w-40" },
              { width: "w-20" },
              { width: "w-20" },
              { width: "w-24" },
              { width: "w-20" },
            ]}
          />
        ) : filteredItems.length === 0 ? (
          <Empty
            icon={Package}
            title={
              searchTerm || showLowStockOnly
                ? showLowStockOnly
                  ? t("inventory:list.no_alerts")
                  : t("inventory:list.no_results")
                : activeScope === "ingredient"
                ? t("inventory:list.scope_empty_ingredient")
                : activeScope === "equipment"
                ? t("inventory:list.scope_empty_equipment")
                : activeScope === "supply"
                ? t("inventory:list.scope_empty_supply")
                : t("inventory:list.empty_title")
            }
            description={
              searchTerm || showLowStockOnly
                ? showLowStockOnly
                  ? t("inventory:list.no_alerts")
                  : t("inventory:list.search_desc")
                : activeScope === "ingredient"
                ? t("inventory:list.scope_empty_ingredient_desc")
                : activeScope === "equipment"
                ? t("inventory:list.scope_empty_equipment_desc")
                : activeScope === "supply"
                ? t("inventory:list.scope_empty_supply_desc")
                : t("inventory:list.add_first")
            }
            action={
              !searchTerm && !showLowStockOnly ? (
                <Link
                  to="/inventory/new"
                  className="inline-flex items-center justify-center px-4 py-2 text-sm font-bold rounded-xl text-white premium-gradient shadow-md shadow-primary/20 hover:shadow-lg transition-all hover:scale-[1.02]"
                >
                  <Plus className="h-5 w-5 mr-2" aria-hidden="true" />
                  <span aria-hidden="true">{t("inventory:list.empty_action")}</span>
                  <span className="sr-only">{t("inventory:new_item_accessible")}</span>
                </Link>
              ) : undefined
            }
          />
        ) : (
          <>
            {renderMobileSortBar()}
            <div className="overflow-x-auto">
              <table className="data-table" aria-label={t("inventory:title")}>
                <caption className="sr-only">
                  {t("common:pagination.showing")} {currentPage} {t("common:pagination.of")} {totalPages}
                </caption>
                <thead>
                  <tr>
                    {/* Multi-select checkbox (#885) — desktop only */}
                    <th scope="col" className="px-2 py-3 w-10 text-center hidden lg:table-cell">
                      <input
                        type="checkbox"
                        className="h-4 w-4 rounded border-border text-primary focus:ring-primary cursor-pointer align-middle"
                        checked={selection.allSelected}
                        ref={(el) => { if (el) el.indeterminate = selection.someSelected; }}
                        onChange={selection.toggleAll}
                        aria-label={t("common:a11y.select_all_items")}
                      />
                    </th>
                    <th
                      scope="col"
                      className="px-6 py-3 text-left text-xs font-semibold text-text-secondary cursor-pointer hover:bg-surface-alt/50 transition-colors"
                      onClick={() => handleSort("ingredient_name")}
                      aria-sort={getSortAriaSort("ingredient_name")}
                    >
                      {t("inventory:list.name_column")} {renderSortIcon("ingredient_name")}
                    </th>
                    <th
                      scope="col"
                      className="px-6 py-3 text-left text-xs font-semibold text-text-secondary cursor-pointer hover:bg-surface-alt/50 transition-colors"
                      onClick={() => handleSort("current_stock")}
                      aria-sort={getSortAriaSort("current_stock")}
                    >
                      {t("inventory:list.stock")} {renderSortIcon("current_stock")}
                    </th>
                    <th
                      scope="col"
                      className="px-6 py-3 text-left text-xs font-semibold text-text-secondary cursor-pointer hover:bg-surface-alt/50 transition-colors"
                      onClick={() => handleSort("minimum_stock")}
                      aria-sort={getSortAriaSort("minimum_stock")}
                    >
                      {t("inventory:list.min_stock")} {renderSortIcon("minimum_stock")}
                    </th>
                    <th
                      scope="col"
                      className="px-6 py-3 text-left text-xs font-semibold text-text-secondary cursor-pointer hover:bg-surface-alt/50 transition-colors"
                      onClick={() => handleSort("unit_cost")}
                      aria-sort={getSortAriaSort("unit_cost")}
                    >
                      {t("inventory:list.unit_cost")} {renderSortIcon("unit_cost")}
                    </th>
                    <th scope="col" className="relative px-6 py-3 text-text-secondary">
                      <span className="sr-only">{t("inventory:list.actions")}</span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedItems.map((item) => {
                    const isLowStock =
                      item.minimum_stock > 0 &&
                      item.current_stock < item.minimum_stock;
                    const isActiveRow = item.id === selectedId;
                    return (
                      <tr
                        key={item.id}
                        className={`group cursor-pointer transition-colors ${isActiveRow ? "bg-surface-alt ring-1 ring-inset ring-primary/30" : "hover:bg-surface-alt/50"}`}
                        onClick={() => (isXl ? selectItem(item.id) : navigate(`/inventory/${item.id}`))}
                        aria-current={isActiveRow ? "true" : undefined}
                      >
                        {/* Multi-select checkbox (#885) — desktop only */}
                        <td className="px-2 py-4 w-10 text-center hidden lg:table-cell" onClick={(e) => e.stopPropagation()}>
                          <input
                            type="checkbox"
                            className="h-4 w-4 rounded border-border text-primary focus:ring-primary cursor-pointer align-middle"
                            checked={selection.selected.has(item.id)}
                            onChange={() => selection.toggle(item.id)}
                            aria-label={`Seleccionar ${item.ingredient_name}`}
                          />
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center gap-3">
                            <InventoryTypeIcon type={item.type} />
                            <div>
                              <div className="text-sm font-medium text-text">
                                {item.ingredient_name}
                              </div>
                              <div className="text-sm text-text-secondary">
                                {t("inventory:form.unit")}: {item.unit}
                              </div>
                            </div>
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
                                 onSuccess: () => addToast(t("inventory:list.stock_updated"), "success"),
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
                              { label: t("common:action.view"), icon: Eye, onClick: () => (isXl ? selectItem(item.id) : navigate(`/inventory/${item.id}`)) },
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
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              totalItems={totalItems}
              itemsPerPage={ITEMS_PER_PAGE}
              onPageChange={handlePageChange}
            />
          </>
        )}
      </Card>

      {/* Bulk actions bar (#885) — desktop only */}
      <BulkActionBar count={selection.count} onClear={selection.clear}>
        <Button variant="glass" size="sm" onClick={exportSelected}>
          <Download className="h-4 w-4 mr-2" aria-hidden="true" />
          {t("common:action.download")}
        </Button>
        <Button variant="danger" size="sm" onClick={bulkDelete}>
          <Trash2 className="h-4 w-4 mr-2" aria-hidden="true" />
          {t("common:action.delete")}
        </Button>
      </BulkActionBar>

      <Modal
        isOpen={!!adjustingItem}
        onClose={() => setAdjustingItem(null)}
        title={t("inventory:list.adjust_stock")}
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
                placeholder={t("inventory:list.adjust_stock_placeholder")}
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

  if (isXl) {
    return (
      <SplitPane
        master={listContent}
        detail={detailPanel}
        masterClassName="xl:overflow-y-auto xl:min-h-0 xl:pr-1"
      />
    );
  }

  return listContent;
};