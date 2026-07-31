import React, { useEffect, useMemo, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { productService } from "@/services/productService";
import {
  ArrowLeft,
  ShoppingCart,
  DollarSign,
  Trash2,
  UserCog,
  Building,
  Zap,
  Wrench,
  Fuel,
  Edit,
  Calendar,
  Clock,
  Users,
} from "lucide-react";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { useAuth } from "@/hooks/useAuth";
import { logError } from "@/lib/errorHandler";
import { Breadcrumb } from "@/components/Breadcrumb";
import { getEventTotalCharged, getEventTaxAmount, getEventNetSales, localeFromLanguage, PAYMENT_COMPLETION_EPSILON } from "@/lib/finance";
import { computeEventFinancials, productUnitCostFromIngredients } from "@/lib/EventFinancials";
import { Payments } from "./components/Payments";
import { ClientPortalShareCard } from "./components/ClientPortalShareCard";
import { EventActionsMenu } from "./components/EventActionsMenu";
import { EventTabBar } from "./components/EventTabBar";
import { FinancialsCard } from "./components/FinancialsCard";
import { IngredientsView } from "./components/IngredientsView";
import { ContractView, type UserProfile } from "./components/ContractView";
import { EventPhotosView } from "./components/EventPhotosView";
import { EventChecklistView } from "./components/EventChecklistView";
import { StatusDropdown, EventStatus } from "@/components/StatusDropdown";
import { SkeletonLine } from "@/components/Skeleton";
import { useQuery } from "@tanstack/react-query";
import {
  useEvent,
  useEventProducts,
  useEventExtras,
  useEventEquipment,
  useEventSupplies,
  useEventPhotos,
  useDeleteEvent,
} from "@/hooks/queries/useEventQueries";
import { useEventStaff } from "@/hooks/queries/useStaffQueries";
import { usePaymentsByEvent } from "@/hooks/queries/usePaymentQueries";
import { useTranslation } from "react-i18next";
import { queryKeys } from "@/hooks/queries/queryKeys";

import clsx from "clsx";
import { ContractTemplateError, renderContractTemplate } from "@/lib/contractTemplate";
import type { Event, Client, EventExtra, EventEquipment, EventSupply, EventStaff as EventStaffType, ProductIngredient } from "@/types/entities";
import { aggregateIngredients } from "./lib/aggregateIngredients";

// API response types — backend returns `client` (singular)
type EventWithClient = Event & { client?: Client | null };

interface EventProductWithDetails {
  id: string;
  event_id: string;
  product_id: string;
  quantity: number;
  unit_price: number;
  discount: number;
  total_price: number | null;
  created_at: string;
  // Backend attaches `product_name` via SQL join on GET /api/events/{id}/products
  // (see backend/internal/models/models.go:114). The previous shape `products: { name }`
  // was legacy and the backend never returned it — Web PDFs/UI showed "Producto"
  // fallback in production because of this mismatch.
  product_name?: string | null;
  cost?: number;
}

// Some API responses still return nested inventory object alongside flattened fields
type ProductIngredientWithInventory = ProductIngredient & {
  inventory?: { ingredient_name?: string; unit?: string; unit_cost?: number; current_stock?: number } | null;
};

type ViewMode = "summary" | "ingredients" | "contract" | "payments" | "photos" | "checklist";


export const EventSummary: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user, profile } = useAuth();

  const { t, i18n } = useTranslation(['events', 'common']);
  const moneyLocale = localeFromLanguage(i18n.language);
  // ── 6 parallel queries via React Query ──
  const { data: eventRaw = null, isLoading: eventLoading } = useEvent(id);
  const event = eventRaw as EventWithClient | null;
  // Currency for all money displays: event-specified → user default → MXN
  const eventCurrency = event?.currency || user?.default_currency || 'MXN';
  const { data: productsRaw = [], isLoading: productsLoading } = useEventProducts(id);
  const products = useMemo(() => (Array.isArray(productsRaw) ? productsRaw : []), [productsRaw]);
  const { data: extrasRaw = [] } = useEventExtras(id);
  const extras = useMemo(() => (Array.isArray(extrasRaw) ? extrasRaw : []), [extrasRaw]);
  const { data: equipmentRaw = [] } = useEventEquipment(id);
  const equipment = useMemo(() => (Array.isArray(equipmentRaw) ? equipmentRaw : []), [equipmentRaw]);
  const { data: suppliesRaw = [] } = useEventSupplies(id);
  const supplies = useMemo(() => (Array.isArray(suppliesRaw) ? suppliesRaw : []), [suppliesRaw]);
  // Read-only photos count for the tab badge. The full photo list + upload
  // flow live inside EventPhotosView; this just subscribes to the same
  // (deduped) query so the badge stays in sync even off the photos tab.
  const { data: eventPhotosRaw = [] } = useEventPhotos(id);
  const eventPhotosCount = Array.isArray(eventPhotosRaw) ? eventPhotosRaw.length : 0;
  const { data: eventStaffRaw = [] } = useEventStaff(id);
  const eventStaff = Array.isArray(eventStaffRaw) ? eventStaffRaw : [];
  const { data: paymentsRaw = [] } = usePaymentsByEvent(id);
  const payments = Array.isArray(paymentsRaw) ? paymentsRaw : [];
  const deleteEventMutation = useDeleteEvent();

  const loading = eventLoading || productsLoading;

  // ── Local UI state ──
  const [viewMode, setViewMode] = useState<ViewMode>("summary");
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
  const [autoOpenPayment, setAutoOpenPayment] = useState(false);
  const [paymentInitialAmount, setPaymentInitialAmount] = useState(0);
  // Live checklist progress, reported by EventChecklistView while the
  // checklist tab is mounted. Defaults to 0 (nothing checked) on other tabs.
  const [checklistProgress, setChecklistProgress] = useState(0);

  // ── Derived: product quantities map (stable via sorted JSON key) ──
  const productIdsSorted = useMemo(
    () => (products as EventProductWithDetails[]).map((p) => p.product_id).sort(),
    [products],
  );

  const productQuantities = useMemo(() => {
    const map = new Map<string, number>();
    (products as EventProductWithDetails[]).forEach((p) => {
      map.set(p.product_id, p.quantity || 0);
    });
    return map;
  }, [products]);

  // ── Dependent query: fetch all ingredients for event products ──
  const { data: allProdIngredientsRaw = [], error: allProdIngredientsError } = useQuery({
    queryKey: queryKeys.products.ingredientsBatch(productIdsSorted),
    queryFn: () => productService.getIngredientsForProducts(productIdsSorted),
    enabled: productIdsSorted.length > 0,
  });

  const allProdIngredients = useMemo(
    () => (Array.isArray(allProdIngredientsRaw) ? allProdIngredientsRaw : []),
    [allProdIngredientsRaw],
  );

  useEffect(() => {
    if (allProdIngredientsError) {
      logError("Error aggregating ingredients", allProdIngredientsError);
    }
  }, [allProdIngredientsError]);

  // ── Derived: aggregated ingredients (pure computation, no fetch) ──
  const ingredients = useMemo(
    () => aggregateIngredients(allProdIngredients as ProductIngredientWithInventory[], productQuantities),
    [allProdIngredients, productQuantities],
  );

  // ── Derived: checklist items (pure build from cached query data) ──
  // Computed here (not inside EventChecklistView) so the always-visible tab
  // badge can show the item count even when the checklist tab isn't mounted.
  // EventChecklistView owns the interactive checked-state on top of this list.
  const checklistItems = useMemo(() => {
    if (!event) return [];
    const clItems: { id: string; name: string; quantity: number; unit: string; section: "equipment" | "stock" | "purchase" | "extra" }[] = [];

    (equipment as EventEquipment[]).forEach((eq) => {
      clItems.push({ id: `eq_${eq.id}`, name: eq.equipment_name || t('events:summary.equipment_fallback'), quantity: eq.quantity || 1, unit: eq.unit || t('events:summary.unit_piece'), section: "equipment" });
    });

    const aggregated: Record<string, { name: string; quantity: number; unit: string }> = {};
    (allProdIngredients || [])
      .filter((ing: ProductIngredientWithInventory) => ing.type === "ingredient" && ing.bring_to_event)
      .forEach((ing: ProductIngredientWithInventory) => {
        const key = ing.inventory_id;
        const qty = productQuantities.get(ing.product_id) || 0;
        if (!aggregated[key]) {
          aggregated[key] = { name: ing.ingredient_name || t('events:summary.supply_fallback'), unit: ing.unit || "", quantity: 0 };
        }
        aggregated[key].quantity += (ing.quantity_required || 0) * qty;
      });
    Object.entries(aggregated).forEach(([invId, info]) => {
      clItems.push({ id: `ing_${invId}`, name: info.name, quantity: info.quantity, unit: info.unit, section: "stock" });
    });

    (supplies as EventSupply[]).forEach((s) => {
      clItems.push({ id: `sup_${s.id}`, name: s.supply_name || t('events:summary.supply_fallback'), quantity: s.quantity || 1, unit: s.unit || t('events:summary.unit_each'), section: s.source === "stock" ? "stock" : "purchase" });
    });

    (extras as EventExtra[]).filter((e) => e.include_in_checklist !== false && e.description).forEach((e) => {
      clItems.push({ id: `ext_${e.id}`, name: e.description, quantity: 1, unit: t('events:summary.unit_piece'), section: "extra" });
    });

    return clItems;
  }, [event, equipment, supplies, extras, allProdIngredients, productQuantities, t]);

  // Photos are fetched inside EventPhotosView (self-contained).

  const handleDeleteEvent = () => {
    if (!id) return;
    deleteEventMutation.mutate(id, {
      onSuccess: () => navigate("/dashboard"),
      onSettled: () => setConfirmDeleteOpen(false),
    });
  };

  // StatusDropdown handles its own API call; onStatusChange is optional

  if (loading) {
    return (
      <div className="space-y-6 max-w-5xl mx-auto px-4 sm:px-8 py-8" role="status" aria-live="polite">
        <SkeletonLine className="h-4 w-48" />
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <SkeletonLine className="h-10 w-10 rounded-full" />
            <SkeletonLine className="h-7 w-64" />
          </div>
          <div className="flex gap-2">
            <SkeletonLine className="h-9 w-20 rounded-xl" />
            <SkeletonLine className="h-9 w-24 rounded-xl" />
          </div>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="bg-card rounded-2xl border border-border p-5">
              <SkeletonLine className="h-3 w-20 mb-2" />
              <SkeletonLine className="h-7 w-28" />
            </div>
          ))}
        </div>
        <div className="bg-card rounded-2xl border border-border p-6">
          <SkeletonLine className="h-5 w-48 mb-2" />
          <SkeletonLine className="h-3 w-64 mb-6" />
          <div className="grid grid-cols-2 gap-4">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i}>
                <SkeletonLine className="h-3 w-16 mb-1" />
                <SkeletonLine className="h-5 w-32" />
              </div>
            ))}
          </div>
        </div>
        <span className="sr-only">{t('events:summary.loading')}</span>
      </div>
    );
  }

  if (!event) {
    return (
      <div className="flex flex-col items-center justify-center h-64 space-y-4" role="alert">
        <div className="bg-surface-alt p-4 rounded-full">
          <Calendar className="h-10 w-10 text-text-tertiary" />
        </div>
        <p className="text-lg font-semibold text-text">{t('events:summary.not_found_title')}</p>
        <p className="text-sm text-text-secondary">{t('events:summary.not_found_desc')}</p>
        <button
          type="button"
          onClick={() => navigate("/events")}
          className="mt-2 inline-flex items-center px-4 py-2 text-sm font-medium text-primary hover:text-primary-dark transition-colors"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          {t('events:summary.back_to_events')}
        </button>
      </div>
    );
  }

  const financials = computeEventFinancials({
    products: (products as EventProductWithDetails[]).map((p) => ({
      quantity: p.quantity || 1,
      unitPrice: p.unit_price,
      lineDiscount: p.discount || 0,
      unitCost: productUnitCostFromIngredients(
        (allProdIngredients as ProductIngredientWithInventory[]).filter(
          (ing) => ing.product_id === p.product_id,
        ),
      ),
    })),
    extras: (extras as EventExtra[]).map((e) => ({
      price: e.price,
      cost: e.cost,
      excludeUtility: e.exclude_utility ?? false,
    })),
    supplies: (supplies as EventSupply[]).map((s) => ({
      quantity: s.quantity || 0,
      unitCost: s.unit_cost || 0,
      excludeCost: s.exclude_cost ?? false,
    })),
    globalDiscountType: (event.discount_type as "percent" | "fixed") || "percent",
    globalDiscount: event.discount || 0,
    requiresInvoice: event.requires_invoice ?? false,
    taxRate: event.tax_rate || 0,
  });
  const totalCost = financials.totalCost;
  const profit = financials.netProfit;
  const margin = financials.profitMargin;
  const totalCharged = getEventTotalCharged(event);
  const taxAmount = getEventTaxAmount(event);
  const netSales = getEventNetSales(event);

  const totalPaid = payments.reduce((sum, p) => sum + p.amount, 0);
  const remainingValue = totalCharged - totalPaid;
  const depositAmount = totalCharged * ((event.deposit_percent || 0) / 100);
  const isDownpaymentMet = totalPaid >= (depositAmount - PAYMENT_COMPLETION_EPSILON);

  let contractPreview = "";
  let contractPreviewMissingTokens: string[] = [];

  try {
    contractPreview = renderContractTemplate({
      event,
      profile: profile as UserProfile | null,
      template: profile?.contract_template,
      strict: true,
      products,
      payments,
    });
  } catch (error) {
    if (error instanceof ContractTemplateError) {
      contractPreviewMissingTokens = error.missingTokens;
    }
  }

  const currentStatus = (event.status || "quoted") as EventStatus;

  return (
    <div className="space-y-6 max-w-5xl mx-auto px-4 sm:px-8 py-8 transition-colors">
      <Breadcrumb items={[{ label: t('common:nav.events'), href: '/events' }, { label: `${event.client?.name || ''} — ${event?.service_type || t('common:event')}` }]} />

      {/* Header: Back + Title + StatusDropdown + Actions */}
      <div className="print:hidden flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center">
          <button
            type="button"
            onClick={() => navigate("/events")}
            className="mr-4 p-2 rounded-full hover:bg-surface-alt text-text-secondary transition-colors"
            aria-label={t('events:summary.back_aria')}
          >
            <ArrowLeft className="h-5 w-5" aria-hidden="true" />
          </button>
          <h1 className="text-2xl font-black tracking-tight text-text">
            {event.service_type}
          </h1>
          {id && (
            <div className="ml-3">
              <StatusDropdown
                eventId={id}
                currentStatus={currentStatus}
                onStatusChange={() => {}}
              />
            </div>
          )}
        </div>
        <div className="flex items-center space-x-2">
          {/* Actions Dropdown (PDFs) */}
          <EventActionsMenu
            eventId={id}
            isDownpaymentMet={isDownpaymentMet}
            viewMode={viewMode}
            paymentsCount={payments.length}
          />
          {/* Edit */}
          <Link
            to={`/events/${id}/edit`}
            className="inline-flex items-center px-4 py-2 border border-border rounded-xl shadow-sm text-sm font-medium text-text-secondary bg-card hover:bg-surface-alt transition-colors"
            aria-label={t('common:actions.edit')}
          >
            <Edit className="h-5 w-5 mr-2" aria-hidden="true" />
            {t('common:actions.edit')}
          </Link>
          {/* Delete */}
          <button
            type="button"
            onClick={() => setConfirmDeleteOpen(true)}
            className="inline-flex items-center px-4 py-2 border border-error/20 text-sm font-medium rounded-xl text-error bg-error/5 hover:bg-error/10 transition-colors"
            aria-label={t('common:actions.delete')}
          >
            <Trash2 className="h-5 w-5 mr-2" aria-hidden="true" />
            {t('common:actions.delete')}
          </button>
        </div>
      </div>

      {/* Tab bar */}
      <EventTabBar
        viewMode={viewMode}
        onViewModeChange={setViewMode}
        photosCount={eventPhotosCount}
        checklistItemsCount={checklistItems.length}
        checklistProgress={checklistProgress}
        isDownpaymentMet={isDownpaymentMet}
      />


      {viewMode === "payments" && id && user && (
        <Payments
          eventId={id}
          totalAmount={event.total_amount}
          userId={user.id}
          eventStatus={currentStatus}
          onStatusChange={() => {}}
          eventData={{ deposit_percent: event.deposit_percent }}
          initialAmount={paymentInitialAmount}
          autoOpenAdd={autoOpenPayment}
          onAutoOpenConsumed={() => setAutoOpenPayment(false)}
          currency={event.currency}
          onPaymentAdded={() => {
            import("@/lib/queryClient").then(({ queryClient: qc }) => {
              qc.invalidateQueries({ queryKey: queryKeys.payments.byEvent(id!) });
            });
          }}
        />
      )}

      {viewMode === "summary" && (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
          {/* Client portal share link (PRD/12 feature A) */}
          {id && <ClientPortalShareCard eventId={id} />}

          {/* KPI Cards */}
          <div className="bg-card shadow-sm overflow-hidden rounded-2xl border border-border">
            <div className="grid grid-cols-2 sm:grid-cols-4 divide-y sm:divide-y-0 sm:divide-x divide-border">
              <div className="px-4 py-4 text-center">
                <p className="text-2xl font-black text-primary">
                  {totalCharged.toLocaleString(moneyLocale, { style: 'currency', currency: eventCurrency, minimumFractionDigits: 0 })}
                </p>
                <p className="text-xs text-text-secondary mt-0.5">{t('events:financials.total_charged')}</p>
              </div>
              <div className="px-4 py-4 text-center">
                <p className={clsx("text-2xl font-black", remainingValue > 0 ? "text-warning" : "text-success")}>
                  {totalPaid.toLocaleString(moneyLocale, { style: 'currency', currency: eventCurrency, minimumFractionDigits: 0 })}
                </p>
                <p className="text-xs text-text-secondary mt-0.5">{t('events:summary.paid')}</p>
              </div>
              <div className="px-4 py-4 text-center">
                <p className={clsx("text-2xl font-black", margin >= 30 ? "text-success" : margin >= 15 ? "text-warning" : "text-error")}>
                  {margin.toFixed(0)}%
                </p>
                <p className="text-xs text-text-secondary mt-0.5">{t('events:financials.margin')}</p>
              </div>
              <div className="px-4 py-4 text-center">
                <p className="text-2xl font-black text-text">
                  {event.num_people}
                </p>
                <p className="text-xs text-text-secondary mt-0.5">{t('events:general.people')}</p>
              </div>
            </div>
          </div>

          {/* Information Card */}
          <div className="bg-card shadow-sm overflow-hidden rounded-2xl border border-border">
            <div className="px-4 py-5 sm:px-6">
              <h3 className="text-lg leading-6 font-semibold text-text">
                {t('events:summary.info_title')}
              </h3>
              <p className="mt-1 max-w-2xl text-sm text-text-secondary">
                {t('events:summary.info_desc')}
              </p>
            </div>
            <div className="border-t border-border px-4 py-5 sm:px-6">
              <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-5">
                <div>
                  <dt className="text-xs font-semibold text-text-tertiary uppercase tracking-wide flex items-center gap-1.5">
                    <Calendar className="h-3.5 w-3.5" /> {t('events:general.date')}
                  </dt>
                  <dd className="mt-1 font-bold text-text">{new Date(event.event_date + "T12:00:00").toLocaleDateString(moneyLocale, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</dd>
                </div>
                <div>
                  <dt className="text-xs font-semibold text-text-tertiary uppercase tracking-wide flex items-center gap-1.5">
                    <Clock className="h-3.5 w-3.5" /> {t('events:general.schedule')}
                  </dt>
                  <dd className="mt-1 font-bold text-text">{event.start_time && event.end_time ? `${event.start_time.slice(0, 5)} — ${event.end_time.slice(0, 5)}` : t('common:not_defined')}</dd>
                </div>
                <div>
                  <dt className="text-xs font-semibold text-text-tertiary uppercase tracking-wide flex items-center gap-1.5">
                    <Users className="h-3.5 w-3.5" /> {t('events:general.client')}
                  </dt>
                  <dd className="mt-1 font-bold text-text">
                    {event.client?.id ? (
                      <Link to={`/clients/${event.client.id}`} className="text-primary hover:text-primary-dark transition-colors">
                        {event.client.name}
                      </Link>
                    ) : (
                      event.client?.name || t('events:summary.no_client')
                    )}
                    {event.client?.phone && (
                      <span className="text-sm text-text-secondary ml-2">• {event.client.phone}</span>
                    )}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs font-semibold text-text-tertiary uppercase tracking-wide flex items-center gap-1.5">
                    <Building className="h-3.5 w-3.5" /> {t('events:general.location')}
                  </dt>
                  <dd className="mt-1 font-bold text-text">{event.location || t('common:not_defined')}</dd>
                </div>
                {event.deposit_percent > 0 && (
                  <div>
                    <dt className="text-xs font-semibold text-text-tertiary uppercase tracking-wide flex items-center gap-1.5">
                      <DollarSign className="h-3.5 w-3.5" /> {t('events:financials.deposit')}
                    </dt>
                    <dd className="mt-1 font-bold text-text">
                      {event.deposit_percent}% — {depositAmount.toLocaleString(moneyLocale, { style: 'currency', currency: eventCurrency })}
                      {isDownpaymentMet ? (
                        <span className="ml-2 text-xs text-success font-semibold">{t('events:summary.covered')}</span>
                      ) : (
                        <span className="ml-2 text-xs text-warning font-semibold">{t('common:pending')}</span>
                      )}
                    </dd>
                  </div>
                )}
                {event.notes && (
                  <div className="sm:col-span-2">
                    <dt className="text-xs font-semibold text-text-tertiary uppercase tracking-wide">{t('common:notes')}</dt>
                    <dd className="mt-1 text-sm text-text-secondary">{event.notes}</dd>
                  </div>
                )}
              </dl>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="bg-card shadow-sm rounded-2xl p-6 sm:p-8 border border-border">
              <h2 className="text-lg font-bold mb-6 flex items-center gap-2 text-text">
                <ShoppingCart className="h-5 w-5 text-primary" />
                {t('common:products')}
              </h2>
              <table className="w-full text-sm" aria-label={t('events:summary.aria_products_included')}>
                <thead>
                  <tr className="text-left text-text-tertiary border-b border-border">
                    <th className="pb-3 px-1 font-semibold uppercase tracking-wide text-xs">{t('common:product')}</th>
                    <th className="pb-3 px-1 text-right font-semibold uppercase tracking-wide text-xs">{t('common:quantity_short')}</th>
                    <th className="pb-3 px-1 text-right font-semibold uppercase tracking-wide text-xs">{t('common:price')}</th>
                    <th className="pb-3 px-1 text-right font-semibold uppercase tracking-wide text-xs">{t('common:total')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {products.map((p, idx) => (
                    <tr key={`${p.product_id}-${idx}`} className="group hover:bg-surface-alt/50 transition-colors">
                      <td className="py-4 px-1 font-bold text-text">{p.product_name || t('common:product')}</td>
                      <td className="py-4 px-1 text-right text-text-secondary">{p.quantity}</td>
                      <td className="py-4 px-1 text-right text-text-secondary font-medium">
                        {p.unit_price.toLocaleString(moneyLocale, { style: 'currency', currency: eventCurrency })}
                      </td>
                      <td className="py-4 px-1 text-right font-bold text-text">
                        {(
                          (p.unit_price - (p.discount || 0)) *
                          p.quantity
                        ).toLocaleString(moneyLocale, { style: 'currency', currency: eventCurrency })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="bg-card shadow-sm rounded-2xl p-6 sm:p-8 border border-border">
              <h2 className="text-lg font-bold mb-6 flex items-center gap-2 text-text">
                <Zap className="h-5 w-5 text-primary" />
                {t('events:general.extras')}
              </h2>
              <table className="w-full text-sm" aria-label={t("common:a11y.event_extras_table")}>
                <thead>
                  <tr className="text-left text-text-tertiary border-b border-border">
                    <th className="pb-3 px-1 font-semibold uppercase tracking-wide text-xs">{t('common:description')}</th>
                    <th className="pb-3 px-1 text-right font-semibold uppercase tracking-wide text-xs">{t('common:price')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {extras.map((e, idx) => (
                    <tr key={e.id || `extra-${idx}`} className="hover:bg-surface-alt/50 transition-colors">
                      <td className="py-4 px-1 font-bold text-text">{e.description}</td>
                      <td className="py-4 px-1 text-right font-bold text-text">{e.price.toLocaleString(moneyLocale, { style: 'currency', currency: eventCurrency })}</td>
                    </tr>
                  ))}
                  {extras.length === 0 && (
                    <tr>
                      <td
                        colSpan={2}
                        className="py-12 text-center text-text-tertiary italic"
                      >
                        {t('events:summary.no_extras')}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Supplies section */}
          {supplies.length > 0 && (
            <div className="bg-card shadow-sm rounded-2xl p-6 sm:p-8 border border-border mt-8">
              <h2 className="text-lg font-bold mb-6 flex items-center gap-2 text-text">
                <Fuel className="h-5 w-5 text-warning" />
                {t('events:summary.supplies_title')}
              </h2>
              <div className="space-y-3">
                {supplies.map((s: EventSupply, idx) => (
                  <div key={s.id || `supply-${idx}`} className="flex items-center justify-between py-3 border-b border-border last:border-0">
                    <div>
                      <span className="font-bold text-text">{s.supply_name || t('common:supply')}</span>
                      <span className="text-text-secondary ml-2">
                        {s.quantity} {s.unit || t('common:unit_short')} × {s.unit_cost?.toLocaleString(moneyLocale, { style: 'currency', currency: eventCurrency }) || '$0.00'}
                      </span>
                    </div>
                    <div className="flex items-center gap-3">
                      {s.exclude_cost && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium bg-surface-alt text-text-secondary">
                          {t('events:summary.no_cost')}
                        </span>
                      )}
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium ${
                        s.source === 'stock'
                          ? 'bg-success/10 text-success'
                          : 'bg-status-quoted/10 text-status-quoted'
                      }`}>
                        {s.source === 'stock' ? t('events:summary.from_stock') : t('events:summary.new_purchase')}
                      </span>
                      <span className={`font-bold ${
                        s.exclude_cost
                          ? 'line-through text-text-tertiary'
                          : 'text-warning'
                      }`}>
                        {(s.quantity * (s.unit_cost || 0)).toLocaleString(moneyLocale, { style: 'currency', currency: eventCurrency })}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-4 pt-3 border-t border-border flex justify-between items-center">
                <span className="text-sm text-text-secondary">{t('events:summary.total_supplies_cost')}</span>
                <span className="text-lg font-bold text-warning">
                  {supplies.reduce((sum: number, s: EventSupply) => sum + (s.exclude_cost ? 0 : s.quantity * (s.unit_cost || 0)), 0).toLocaleString(moneyLocale, { style: 'currency', currency: eventCurrency })}
                </span>
              </div>
            </div>
          )}

          {/* Equipment section */}
          {equipment.length > 0 && (
            <div className="bg-card shadow-sm rounded-2xl p-6 sm:p-8 border border-border mt-8">
              <h2 className="text-lg font-bold mb-6 flex items-center gap-2 text-text">
                <Wrench className="h-5 w-5 text-primary" />
                {t('events:summary.assigned_equipment')}
              </h2>
              <div className="space-y-3">
                {equipment.map((eq: EventEquipment, idx) => (
                  <div key={eq.id || `equipment-${idx}`} className="flex items-center justify-between py-3 border-b border-border last:border-0">
                    <div>
                      <span className="font-bold text-text">{eq.equipment_name || t('common:equipment')}</span>
                      <span className="text-text-secondary ml-2">x{eq.quantity}</span>
                      {eq.notes && (
                        <p className="text-xs text-text-tertiary mt-0.5">{eq.notes}</p>
                      )}
                    </div>
                    <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium bg-surface-alt text-text-secondary">
                      {t('events:summary.no_cost')}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Staff section */}
          {eventStaff.length > 0 && (
            <div className="bg-card shadow-sm rounded-2xl p-6 sm:p-8 border border-border mt-8">
              <h2 className="text-lg font-bold mb-6 flex items-center gap-2 text-text">
                <UserCog className="h-5 w-5 text-primary" />
                {t('events:summary.assigned_staff')}
              </h2>
              <div className="space-y-3">
                {eventStaff.map((s: EventStaffType, idx) => (
                  <button
                    key={s.id || `staff-${idx}`}
                    type="button"
                    onClick={() => navigate(`/staff/${s.staff_id}`)}
                    className="w-full flex items-center justify-between py-3 border-b border-border last:border-0 text-left hover:bg-surface-alt/50 rounded-md px-2 -mx-2 transition-colors cursor-pointer print:pointer-events-none print:hover:bg-transparent"
                  >
                    <div>
                      <span className="font-bold text-text">{s.staff_name || t('common:staff')}</span>
                      {(s.role_override || s.staff_role_label) && (
                        <span className="text-text-secondary ml-2">· {s.role_override || s.staff_role_label}</span>
                      )}
                      {s.notes && (
                        <p className="text-xs text-text-tertiary mt-0.5">{s.notes}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-3">
                      {s.staff_phone && (
                        <a
                          href={`tel:${s.staff_phone}`}
                          onClick={(e) => e.stopPropagation()}
                          className="text-xs text-primary hover:underline"
                        >
                          {s.staff_phone}
                        </a>
                      )}
                      {s.fee_amount != null && s.fee_amount > 0 ? (
                        <span className="font-bold text-warning">
                          {s.fee_amount.toLocaleString(moneyLocale, { style: 'currency', currency: eventCurrency })}
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium bg-surface-alt text-text-secondary">
                          {t('events:summary.no_cost')}
                        </span>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          <FinancialsCard
            netSales={netSales}
            taxAmount={taxAmount}
            totalCost={totalCost}
            profit={profit}
            remainingValue={remainingValue}
            totalPaid={totalPaid}
            totalCharged={totalCharged}
            moneyLocale={moneyLocale}
            eventCurrency={eventCurrency}
            currentStatus={currentStatus}
            isDownpaymentMet={isDownpaymentMet}
            depositPercent={event.deposit_percent || 0}
            onRegisterDeposit={(amount) => {
              setPaymentInitialAmount(amount);
              setAutoOpenPayment(true);
              setViewMode("payments");
            }}
            onAddPayment={() => {
              setPaymentInitialAmount(0);
              setAutoOpenPayment(false);
              setViewMode("payments");
            }}
          />
        </div>
      )}

      {viewMode === "ingredients" && (
        <IngredientsView
          event={event}
          ingredients={ingredients}
          supplies={supplies}
          moneyLocale={moneyLocale}
          eventCurrency={eventCurrency}
        />
      )}

      {viewMode === "contract" && (
        <ContractView
          contractPreview={contractPreview}
          contractPreviewMissingTokens={contractPreviewMissingTokens}
          isDownpaymentMet={isDownpaymentMet}
          depositAmount={depositAmount}
          totalPaid={totalPaid}
          moneyLocale={moneyLocale}
          eventCurrency={eventCurrency}
          event={event}
          profile={profile as UserProfile | null}
          onRegisterDeposit={(amount) => {
            setPaymentInitialAmount(amount);
            setAutoOpenPayment(true);
            setViewMode("payments");
          }}
        />
      )}

      {viewMode === "photos" && id && (
        <EventPhotosView eventId={id} />
      )}

      {viewMode === "checklist" && (
        <EventChecklistView
          eventId={id}
          event={event}
          checklistItems={checklistItems}
          moneyLocale={moneyLocale}
          onProgressChange={(_checked, _total, progress) =>
            setChecklistProgress(progress)
          }
        />
      )}

      <div className="mt-12 text-center text-xs text-text-secondary print:mt-12">
        <p>
          {t('events:summary.generated_by', { business: profile?.business_name || "Solennix" })} -{" "}
          {new Date().toLocaleString(moneyLocale)}
        </p>
      </div>
      <ConfirmDialog
        open={confirmDeleteOpen}
        title={t('events:summary.delete_confirm_title')}
        description={t('events:summary.delete_confirm_desc')}
        confirmText={t('common:actions.delete_permanent')}
        cancelText={t('common:actions.cancel')}
        onConfirm={handleDeleteEvent}
        onCancel={() => setConfirmDeleteOpen(false)}
      />
    </div>
  );
};
