import React, { useEffect, useState, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { eventService } from "@/services/eventService";
import { Fuel, Layers, Wrench } from "lucide-react";
import { logError } from "@/lib/errorHandler";
import { Breadcrumb } from "@/components/Breadcrumb";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { getAssetUrl } from "@/lib/api";
import { useProduct, useProductIngredients, useDeleteProduct } from "@/hooks/queries/useProductQueries";
import type { ProductIngredientWithInventory } from "@/services/productService";
import { parseEventDate } from "@/lib/dateUtils";
import { groupIngredients } from "./lib/groupIngredients";
import { ProductDetailsSkeleton } from "./components/ProductDetailsSkeleton";
import { ProductDetailHeader } from "./components/ProductDetailHeader";
import { ProductKpiGrid } from "./components/ProductKpiGrid";
import { ProductImageCard } from "./components/ProductImageCard";
import { DemandAlertCard } from "./components/DemandAlertCard";
import { DemandForecastCard, type DemandEntry } from "./components/DemandForecastCard";
import { ProductIngredientTable } from "./components/ProductIngredientTable";

type EventWithClientName = { client?: { name: string } | null };

type ProductDetailPanelProps = {
  productId: string;
  /** When true the panel renders inside the split-pane rail: no breadcrumb, no
   * back button, and a successful delete calls `onDeleted` instead of navigating
   * away (the list stays mounted and clears its `selected` param). */
  embedded?: boolean;
  onDeleted?: () => void;
};

/**
 * Product detail body. Shared by the standalone route (`/products/:id`) and the
 * master-detail split pane rail (#879). Route coupling (useParams / navigate
 * back) lives only in the thin `ProductDetails` wrapper below.
 */
export const ProductDetailPanel: React.FC<ProductDetailPanelProps> = ({
  productId,
  embedded = false,
  onDeleted,
}) => {
  const { t, i18n } = useTranslation(["products", "common", "clients"]);
  const navigate = useNavigate();
  const { data: product, isLoading: productLoading, error: productError } = useProduct(productId);
  const { data: ingredients = [] } = useProductIngredients(productId);
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
    if (productId && product) {
      loadDemandForecast(productId);
    }
  }, [productId, product, loadDemandForecast]);

  const handleDeleteProduct = useCallback(() => {
    deleteProductMutation.mutate(productId, {
      onSuccess: () => {
        if (embedded) {
          onDeleted?.();
        } else {
          navigate("/products");
        }
      },
      onSettled: () => setConfirmDeleteOpen(false),
    });
  }, [productId, deleteProductMutation, navigate, embedded, onDeleted]);

  if (loading) {
    return <ProductDetailsSkeleton />;
  }

  if (error || !product) {
    return (
      <div className="text-center p-8">
        <p className="text-error">{error || t("products:list.no_results")}</p>
        {!embedded && (
          <button
            type="button"
            onClick={() => navigate("/products")}
            className="mt-4 text-primary hover:underline"
          >
            {t("products:details.back_to_products")}
          </button>
        )}
      </div>
    );
  }

  // Group ingredients once for all three tables + composition counts.
  const grouped = groupIngredients(ingredients as ProductIngredientWithInventory[]);
  const ingredientRows = grouped.ingredient;
  const supplyRows = grouped.supply;
  const equipmentRows = grouped.equipment;

  const unitCost = ingredientRows.reduce(
    (sum, ing) => sum + ing.quantity_required * (ing.unit_cost || 0),
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
  const productImageSrc = getAssetUrl(product.image_url);
  const supplyTotal = supplyRows.reduce(
    (sum, ing) => sum + ing.quantity_required * (ing.unit_cost || 0),
    0,
  );

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

      {!embedded && (
        <Breadcrumb items={[{ label: t("products:title"), href: '/products' }, { label: product.name }]} />
      )}

      <ProductDetailHeader
        product={product}
        embedded={embedded}
        onBack={() => navigate("/products")}
        onDeleteClick={() => setConfirmDeleteOpen(true)}
      />

      <ProductKpiGrid
        basePrice={product.base_price}
        unitCost={unitCost}
        margin={margin}
        demandCount={demandForecast.length}
        demandLoading={demandLoading}
        moneyLocale={moneyLocale}
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1 space-y-6">
          <ProductImageCard
            product={product}
            imageSrc={productImageSrc}
            ingredientCounts={{
              total: ingredients.length,
              supply: supplyRows.length,
              equipment: equipmentRows.length,
            }}
            moneyLocale={moneyLocale}
          />

          {!demandLoading && (
            <DemandAlertCard
              demand7Days={demand7Days}
              totalDemand={totalDemand}
              eventCount={demandForecast.length}
              estimatedRevenue={estimatedRevenue}
              moneyLocale={moneyLocale}
            />
          )}
        </div>

        <div className="lg:col-span-2 space-y-6">
          <DemandForecastCard
            entries={demandForecast}
            loading={demandLoading}
            today={today}
            moneyLocale={moneyLocale}
            basePrice={product.base_price}
            totalDemand={totalDemand}
            estimatedRevenue={estimatedRevenue}
          />

          <ProductIngredientTable
            icon={Layers}
            iconColor="text-primary"
            title={t("products:form.composition")}
            rows={ingredientRows}
            columns={[
              { type: 'inventory', header: t("products:form.inventory") },
              { type: 'quantity', header: t("products:list.quantity") },
              {
                type: 'cost',
                header: `${t("products:form.cost")} ${t("products:details.estimated_short")}`,
              },
            ]}
            emptyStateCta={{
              message: t("products:details.no_ingredients"),
              linkTo: `/products/${productId}/edit`,
              linkLabel: t("products:details.configure_composition"),
            }}
            footerLabel={t("products:form.total_unit_cost")}
            footerValue={unitCost}
            footerTone="default"
            moneyLocale={moneyLocale}
          />

          {supplyRows.length > 0 && (
            <ProductIngredientTable
              icon={Fuel}
              iconColor="text-warning"
              title={t("products:form.event_supplies")}
              badge={t("products:details.fixed_cost_per_event")}
              badgeTone="warning"
              rows={supplyRows}
              columns={[
                { type: 'inventory', header: t("products:form.inventory") },
                { type: 'quantity', header: t("products:list.quantity") },
                { type: 'cost', header: t("products:form.cost") },
              ]}
              footerLabel={t("products:form.total_event_cost")}
              footerValue={supplyTotal}
              footerTone="warning"
              moneyLocale={moneyLocale}
            />
          )}

          {equipmentRows.length > 0 && (
            <ProductIngredientTable
              icon={Wrench}
              iconColor="text-info"
              title={t("products:form.equipment")}
              badge={t("products:form.reusable_no_cost")}
              badgeTone="info"
              rows={equipmentRows}
              columns={[
                { type: 'inventory', header: t("products:form.equipment") },
                { type: 'quantity', header: t("products:list.quantity") },
                { type: 'capacity', header: t("products:form.capacity") },
              ]}
              moneyLocale={moneyLocale}
            />
          )}
        </div>
      </div>
    </div>
  );
};

/**
 * Route component for `/products/:id`. Thin wrapper around the shared
 * {@link ProductDetailPanel} — reads the id from the URL and renders the panel
 * in standalone (non-embedded) mode with breadcrumb + back navigation.
 */
export const ProductDetails: React.FC = () => {
  const { id } = useParams();
  if (!id) {
    return null;
  }
  return <ProductDetailPanel productId={id} />;
};
