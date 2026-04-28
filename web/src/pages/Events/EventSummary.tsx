import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { productService } from "@/services/productService";
import { eventPaymentService } from "@/services/eventPaymentService";
import { api } from "@/lib/api";
import {
  ArrowLeft,
  FileText,
  ShoppingCart,
  FileCheck,
  Download,
  DollarSign,
  Trash2,
  MoreVertical,
  UserCog,
  Building,
  Zap,
  CreditCard,
  Camera,
  X,
  ImagePlus,
  Wrench,
  ClipboardList,
  AlertCircle,
  Fuel,
  CheckSquare,
  Square,
  Package,
  Edit,
  Calendar,
  Clock,
  Users,
  Receipt,
} from "lucide-react";
import { useToast } from "@/hooks/useToast";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { OptimizedImage } from "@/components/OptimizedImage";
import { useAuth } from "@/hooks/useAuth";
import {
  generateBudgetPDF,
  generateContractPDF,
  generateShoppingListPDF,
  generateChecklistPDF,
  generateInvoicePDF,
  generatePaymentReportPDF,
} from "@/lib/pdfGenerator";
import { logError } from "@/lib/errorHandler";
import { Breadcrumb } from "@/components/Breadcrumb";
import { getEventTotalCharged, getEventTaxAmount, getEventNetSales } from "@/lib/finance";
import { Payments } from "./components/Payments";
import { ClientPortalShareCard } from "./components/ClientPortalShareCard";
import { StatusDropdown, EventStatus } from "@/components/StatusDropdown";
import { SkeletonLine } from "@/components/Skeleton";
import { useQuery } from "@tanstack/react-query";
import {
  useEvent,
  useEventProducts,
  useEventExtras,
  useEventEquipment,
  useEventSupplies,
  useDeleteEvent,
  useEventPhotos,
  useAddEventPhoto,
  useDeleteEventPhoto,
} from "@/hooks/queries/useEventQueries";
import { useEventStaff } from "@/hooks/queries/useStaffQueries";
import { usePaymentsByEvent } from "@/hooks/queries/usePaymentQueries";
import { useTranslation } from "react-i18next";
import { queryKeys } from "@/hooks/queries/queryKeys";

import clsx from "clsx";
import { ContractTemplateError, renderContractTemplate } from "@/lib/contractTemplate";
import { renderFormattedReact } from "@/lib/inlineFormatting";
import type { Event, Client, User, EventExtra, EventEquipment, EventSupply, EventStaff as EventStaffType, ProductIngredient } from "@/types/entities";
import { aggregateIngredients } from "./lib/aggregateIngredients";

// API response types — backend returns `client` (singular)
type EventWithClient = Event & { client?: Client | null };

// Matches UserProfile in pdfGenerator (User + optional billing/template fields)
type UserProfile = User & {
  stripe_customer_id?: string | null;
  contract_template?: string | null;
};

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
  const { addToast } = useToast();

  const { t, i18n } = useTranslation(['events', 'common']);
  const moneyLocale = i18n.language === 'en' ? 'en-US' : 'es-MX';
  // ── 6 parallel queries via React Query ──
  const { data: eventRaw = null, isLoading: eventLoading } = useEvent(id);
  const event = eventRaw as EventWithClient | null;
  const { data: productsRaw = [], isLoading: productsLoading } = useEventProducts(id);
  const products = Array.isArray(productsRaw) ? productsRaw : [];
  const { data: extrasRaw = [] } = useEventExtras(id);
  const extras = Array.isArray(extrasRaw) ? extrasRaw : [];
  const { data: equipmentRaw = [] } = useEventEquipment(id);
  const equipment = Array.isArray(equipmentRaw) ? equipmentRaw : [];
  const { data: suppliesRaw = [] } = useEventSupplies(id);
  const supplies = Array.isArray(suppliesRaw) ? suppliesRaw : [];
  const { data: eventPhotosRaw = [] } = useEventPhotos(id);
  const eventPhotos = Array.isArray(eventPhotosRaw) ? eventPhotosRaw : [];
  const { data: eventStaffRaw = [] } = useEventStaff(id);
  const eventStaff = Array.isArray(eventStaffRaw) ? eventStaffRaw : [];
  const addEventPhotoMutation = useAddEventPhoto(id);
  const deleteEventPhotoMutation = useDeleteEventPhoto(id);
  const { data: paymentsRaw = [] } = usePaymentsByEvent(id);
  const payments = Array.isArray(paymentsRaw) ? paymentsRaw : [];
  const deleteEventMutation = useDeleteEvent();

  const loading = eventLoading || productsLoading;

  // ── Local UI state ──
  const [viewMode, setViewMode] = useState<ViewMode>("summary");
  const [actionsDropdownOpen, setActionsDropdownOpen] = useState(false);
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const [lightboxPhoto, setLightboxPhoto] = useState<string | null>(null);
  const photoInputRef = React.useRef<HTMLInputElement>(null);
  const [autoOpenPayment, setAutoOpenPayment] = useState(false);
  const [paymentInitialAmount, setPaymentInitialAmount] = useState(0);
  const [checklistItems, setChecklistItems] = useState<{ id: string; name: string; quantity: number; unit: string; section: "equipment" | "stock" | "purchase" | "extra" }[]>([]);
  const [checkedIds, setCheckedIds] = useState<Set<string>>(new Set());

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

  const allProdIngredients = Array.isArray(allProdIngredientsRaw) ? allProdIngredientsRaw : [];

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

  // Photos are now fetched from the dedicated endpoint via useEventPhotos().
  // The legacy path that parsed event.photos as JSON was removed — the
  // backend owns the photo list server-side, so the Web never has to
  // serialize or deserialize the array itself.

  // ── Build checklist items from cached query data (no additional fetches) ──
  useEffect(() => {
    if (!event) return;
    const clItems: typeof checklistItems = [];

    // Equipment
    (equipment as EventEquipment[]).forEach((eq) => {
      clItems.push({ id: `eq_${eq.id}`, name: eq.equipment_name || "Equipo", quantity: eq.quantity || 1, unit: eq.unit || "pza", section: "equipment" });
    });

    // Product ingredients with bring_to_event (from already-cached allProdIngredients)
    const aggregated: Record<string, { name: string; quantity: number; unit: string }> = {};
    (allProdIngredients || [])
      .filter((ing: ProductIngredientWithInventory) => ing.type === "ingredient" && ing.bring_to_event)
      .forEach((ing: ProductIngredientWithInventory) => {
        const key = ing.inventory_id;
        const qty = productQuantities.get(ing.product_id) || 0;
        if (!aggregated[key]) {
          aggregated[key] = { name: ing.ingredient_name || "Insumo", unit: ing.unit || "", quantity: 0 };
        }
        aggregated[key].quantity += (ing.quantity_required || 0) * qty;
      });
    Object.entries(aggregated).forEach(([invId, info]) => {
      clItems.push({ id: `ing_${invId}`, name: info.name, quantity: info.quantity, unit: info.unit, section: "stock" });
    });

    // Supplies
    (supplies as EventSupply[]).forEach((s) => {
      clItems.push({ id: `sup_${s.id}`, name: s.supply_name || "Insumo", quantity: s.quantity || 1, unit: s.unit || "und", section: s.source === "stock" ? "stock" : "purchase" });
    });

    // Extras with include_in_checklist
    (extras as EventExtra[]).filter((e) => e.include_in_checklist !== false && e.description).forEach((e) => {
      clItems.push({ id: `ext_${e.id}`, name: e.description, quantity: 1, unit: "pza", section: "extra" });
    });

    setChecklistItems(clItems);

    // Restore checked state from localStorage
    const savedChecked = localStorage.getItem(`event_checklist_${id}`);
    if (savedChecked) {
      try { setCheckedIds(new Set(JSON.parse(savedChecked))); } catch { setCheckedIds(new Set()); }
    } else {
      setCheckedIds(new Set());
    }
  }, [event, equipment, supplies, extras, allProdIngredients, productQuantities, id]);

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = () => {
      setActionsDropdownOpen(false);
    };
    if (actionsDropdownOpen) {
      document.addEventListener("click", handleClickOutside);
    }
    return () => document.removeEventListener("click", handleClickOutside);
  }, [actionsDropdownOpen]);

  // StatusDropdown handles its own API call; onStatusChange is optional

  const toggleChecklistItem = useCallback((itemId: string) => {
    setCheckedIds((prev) => {
      const next = new Set(prev);
      if (next.has(itemId)) {
        next.delete(itemId);
      } else {
        next.add(itemId);
      }
      localStorage.setItem(`event_checklist_${id}`, JSON.stringify(Array.from(next)));
      return next;
    });
  }, [id]);

  const checklistProgress = checklistItems.length > 0 ? checkedIds.size / checklistItems.length : 0;

  const handleDeleteEvent = () => {
    if (!id) return;
    deleteEventMutation.mutate(id, {
      onSuccess: () => navigate("/dashboard"),
      onSettled: () => setConfirmDeleteOpen(false),
    });
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || !id) return;

    setIsUploadingPhoto(true);
    try {
      let uploadedCount = 0;
      for (const file of Array.from(files)) {
        if (file.size > 10 * 1024 * 1024) {
          addToast(`${file.name} es demasiado grande (máximo 10MB)`, "error");
          continue;
        }
        // Step 1: upload the binary to the generic uploads endpoint to
        // obtain a persistent URL. This endpoint is shared by all upload
        // flows (client photos, product images, logos) and is intentionally
        // decoupled from any resource.
        const formData = new FormData();
        formData.append('file', file);
        const uploaded = await api.postFormData<{ url: string }>('/uploads/image', formData);

        // Step 2: register the photo on the event via the dedicated
        // endpoint. The backend assigns the id and timestamps and appends
        // it to the event.photos array server-side; the Web never has to
        // serialize the array itself.
        await addEventPhotoMutation.mutateAsync({ url: uploaded.url });
        uploadedCount += 1;
      }

      if (uploadedCount > 0) {
        addToast(t('events:summary.photos.uploaded_success', { count: uploadedCount }), "success");
      }
    } catch (err) {
      logError("Error uploading event photos", err);
      addToast(t('events:summary.photos.error_uploading'), "error");
    } finally {
      setIsUploadingPhoto(false);
      if (photoInputRef.current) photoInputRef.current.value = "";
    }
  };

  const handleRemovePhoto = async (photoId: string) => {
    if (!id) return;
    try {
      await deleteEventPhotoMutation.mutateAsync(photoId);
      addToast(t('events:summary.photos.deleted_success'), "success");
    } catch (err) {
      logError("Error removing photo", err);
      addToast(t('events:summary.photos.error_deleting'), "error");
    }
  };

  const handlePayOnline = async () => {
    if (!id) return;
    try {
      const { url } = await eventPaymentService.createCheckoutSession(id);
      window.location.href = url;
    } catch (error) {
      logError("Error creating checkout session", error);
      addToast(t('events:summary.payments.stripe_error'), "error");
    }
  };

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

  const totalProductCost = ingredients.reduce((sum, i) => sum + (i.cost ?? 0), 0);
  const totalExtrasCost = extras.reduce((sum, e) => sum + e.cost, 0);
  const totalCost = totalProductCost + totalExtrasCost;
  const totalCharged = getEventTotalCharged(event);
  const taxAmount = getEventTaxAmount(event);
  const netSales = getEventNetSales(event);
  const revenueExTax = netSales;
  const profit = revenueExTax - totalCost;
  const margin = revenueExTax > 0 ? (profit / revenueExTax) * 100 : 0;

  const totalPaid = payments.reduce((sum, p) => sum + p.amount, 0);
  const remainingValue = totalCharged - totalPaid;
  const depositAmount = totalCharged * ((event.deposit_percent || 0) / 100);
  const isDownpaymentMet = totalPaid >= (depositAmount - 0.1);

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
          <div className="relative shrink-0" onClick={(e) => e.stopPropagation()}>
            <button
              type="button"
              onClick={() => setActionsDropdownOpen(!actionsDropdownOpen)}
              className="h-10 w-10 sm:h-9 sm:w-9 flex items-center justify-center rounded-xl border border-border bg-card hover:bg-surface-alt transition-colors text-text-secondary hover:text-text"
              aria-label={t('common:actions.more')}
              aria-expanded={actionsDropdownOpen}
              aria-haspopup="menu"
            >
              <MoreVertical className="h-4 w-4" aria-hidden="true" />
            </button>
            {actionsDropdownOpen && (
              <div className="absolute right-0 mt-1 w-56 sm:w-72 bg-card border border-border rounded-xl shadow-lg z-50 overflow-hidden py-1" role="menu">
                <p className="px-4 py-2 text-xs font-semibold text-text-tertiary uppercase tracking-wider border-b border-border mb-1">
                  {t('events:summary.actions.export_pdf')}
                </p>
                <button
                  type="button"
                  onClick={() => {
                    generateBudgetPDF(event, profile as UserProfile | null, products, extras, i18n.language);
                    setActionsDropdownOpen(false);
                  }}
                  className="w-full flex items-center px-4 py-2.5 text-sm text-text hover:bg-surface-alt dark:hover:bg-surface transition-colors"
                  role="menuitem"
                >
                  <Download className="h-5 w-5 mr-3 text-text-secondary" />
                  {t('events:summary.actions.budget')}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    generateInvoicePDF(event, profile as UserProfile | null, products, extras, i18n.language);
                    setActionsDropdownOpen(false);
                  }}
                  className="w-full flex items-center px-4 py-2.5 text-sm text-text hover:bg-surface-alt dark:hover:bg-surface transition-colors"
                  role="menuitem"
                >
                  <FileText className="h-5 w-5 mr-3 text-text-secondary" />
                  {t('events:summary.actions.invoice')}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const purchaseSupplies = supplies
                      .filter((s: EventSupply) => s.source === 'purchase')
                      .map((s: EventSupply) => ({
                        name: s.supply_name || 'Insumo',
                        quantity: s.quantity,
                        unit: s.unit || 'und',
                      }));
                    generateShoppingListPDF(event, profile as UserProfile | null, [...ingredients, ...purchaseSupplies], i18n.language);
                    setActionsDropdownOpen(false);
                  }}
                  className="w-full flex items-center px-4 py-2.5 text-sm text-text hover:bg-surface-alt dark:hover:bg-surface transition-colors"
                  role="menuitem"
                >
                  <ShoppingCart className="h-5 w-5 mr-3 text-text-secondary" />
                  {t('events:summary.actions.shopping_list')}
                </button>
                <button
                  type="button"
                  onClick={async () => {
                    try {
                      const productQuantities = new Map<string, number>();
                      products.forEach((p: EventProductWithDetails) => productQuantities.set(p.product_id, p.quantity || 0));
                      // Use cached ingredients from React Query instead of refetching
                      const allIngredients = allProdIngredients || [];
                      const aggregated: Record<string, { name: string; quantity: number; unit: string }> = {};
                      (allIngredients || [])
                        .filter((ing: ProductIngredientWithInventory) => ing.type === 'ingredient' && ing.bring_to_event)
                        .forEach((ing: ProductIngredientWithInventory) => {
                          const key = ing.inventory_id;
                          const qty = productQuantities.get(ing.product_id) || 0;
                          if (!aggregated[key]) {
                            aggregated[key] = { name: ing.ingredient_name || 'Insumo', unit: ing.unit || '', quantity: 0 };
                          }
                          aggregated[key].quantity += (ing.quantity_required || 0) * qty;
                        });
                      const allEventSupplies = supplies
                        .map((s: EventSupply) => ({
                          name: s.supply_name || 'Insumo',
                          quantity: s.quantity,
                          unit: s.unit || 'und',
                        }));
                      generateChecklistPDF(event, profile as UserProfile | null, products, equipment, [...Object.values(aggregated), ...allEventSupplies], extras, i18n.language);
                    } catch (err) {
                      logError("Error generating checklist", err);
                      addToast("Error al generar checklist.", "error");
                    }
                    setActionsDropdownOpen(false);
                  }}
                  className="w-full flex items-center px-4 py-2.5 text-sm text-text hover:bg-surface-alt dark:hover:bg-surface transition-colors"
                  role="menuitem"
                >
                  <ClipboardList className="h-5 w-5 mr-3 text-text-secondary" />
                  {t('events:summary.actions.checklist')}
                </button>
                <button
                  type="button"
                  disabled={!isDownpaymentMet}
                  onClick={() => {
                    try {
                      generateContractPDF(event, profile as UserProfile | null, undefined, products, payments, i18n.language);
                    } catch (error) {
                      const message =
                        error instanceof ContractTemplateError
                          ? `Faltan datos del contrato: ${error.missingTokens.map((t) => `[${t}]`).join(", ")}`
                          : "Error al generar contrato.";
                      addToast(message, "error");
                      return;
                    }
                    setActionsDropdownOpen(false);
                  }}
                  className={clsx(
                    "w-full flex items-center px-4 py-2.5 text-sm transition-colors",
                    !isDownpaymentMet
                      ? "text-text-tertiary cursor-not-allowed bg-surface-alt/50"
                      : "text-text hover:bg-surface-alt dark:hover:bg-surface"
                  )}
                  role="menuitem"
                >
                  <FileCheck className={clsx("h-5 w-5 mr-3", !isDownpaymentMet ? "text-warning/50" : "text-text-secondary")} />
                  {t('events:summary.actions.contract')} {!isDownpaymentMet && `(${t('events:summary.actions.settle_downpayment')})`}
                </button>
                {viewMode === "payments" && payments.length > 0 && (
                  <button
                    type="button"
                    onClick={() => {
                      generatePaymentReportPDF(event, profile as UserProfile | null, payments, i18n.language);
                      setActionsDropdownOpen(false);
                    }}
                    className="w-full flex items-center px-4 py-2.5 text-sm text-text hover:bg-surface-alt dark:hover:bg-surface transition-colors"
                    role="menuitem"
                  >
                    <Download className="h-5 w-5 mr-3 text-text-secondary" />
                    {t('events:summary.actions.payment_report')}
                  </button>
                )}
                {remainingValue > 0 && currentStatus !== "cancelled" && (
                  <>
                    <div className="my-1 border-t border-border"></div>
                    <p className="px-4 py-2 text-xs font-semibold text-text-tertiary uppercase tracking-wider">
                      {t('events:summary.actions.online_payment')}
                    </p>
                    <button
                      type="button"
                      onClick={() => {
                        handlePayOnline();
                        setActionsDropdownOpen(false);
                      }}
                      className="w-full flex items-center px-4 py-2.5 text-sm text-text hover:bg-surface-alt dark:hover:bg-surface transition-colors"
                      role="menuitem"
                    >
                      <CreditCard className="h-5 w-5 mr-3 text-text-secondary" />
                      {t('events:summary.actions.pay_with_stripe')}
                    </button>
                  </>
                )}
              </div>
            )}
          </div>
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
      <div className="print:hidden flex justify-center">
        <div className="inline-flex bg-surface-alt dark:bg-surface-alt/50 rounded-2xl p-1.5 overflow-x-auto no-scrollbar shadow-sm" role="group" aria-label="Modos de visualización del evento">
          <button
            type="button"
            onClick={() => setViewMode("summary")}
            className={clsx(
              "px-4 py-2 rounded-xl text-sm font-bold flex items-center transition-all whitespace-nowrap",
              viewMode === "summary"
                ? "bg-card text-primary shadow-sm"
                : "text-text-secondary hover:text-text hover:bg-surface-alt"
            )}
            aria-pressed={viewMode === "summary"}
            aria-label={t('events:summary.tabs.summary')}
          >
            <FileText className="h-4 w-4 sm:mr-2" aria-hidden="true" />
            <span className="hidden sm:inline">{t('events:summary.tabs.summary')}</span>
          </button>
          <button
            type="button"
            onClick={() => setViewMode("payments")}
            className={clsx(
              "px-4 py-2 rounded-xl text-sm font-bold flex items-center transition-all whitespace-nowrap",
              viewMode === "payments"
                ? "bg-card text-primary shadow-sm"
                : "text-text-secondary hover:text-text hover:bg-surface-alt"
            )}
            aria-pressed={viewMode === "payments"}
            aria-label={t('events:summary.tabs.payments')}
          >
            <DollarSign className="h-4 w-4 sm:mr-2" aria-hidden="true" />
            <span className="hidden sm:inline">{t('events:summary.tabs.payments')}</span>
          </button>
          <button
            type="button"
            onClick={() => setViewMode("ingredients")}
            className={clsx(
              "px-4 py-2 rounded-xl text-sm font-bold flex items-center transition-all whitespace-nowrap",
              viewMode === "ingredients"
                ? "bg-card text-primary shadow-sm"
                : "text-text-secondary hover:text-text hover:bg-surface-alt"
            )}
            aria-pressed={viewMode === "ingredients"}
            aria-label={t('events:summary.tabs.shopping')}
          >
            <ShoppingCart className="h-4 w-4 sm:mr-2" aria-hidden="true" />
            <span className="hidden sm:inline">{t('events:summary.tabs.shopping')}</span>
          </button>
          <button
            type="button"
            onClick={() => setViewMode("contract")}
            className={clsx(
              "px-4 py-2 rounded-xl text-sm font-bold flex items-center transition-all whitespace-nowrap",
              viewMode === "contract"
                ? "bg-card text-primary shadow-sm"
                : "text-text-secondary hover:text-text hover:bg-surface-alt",
              !isDownpaymentMet && "opacity-50 grayscale-[0.5]"
            )}
            aria-pressed={viewMode === "contract"}
            aria-label={t('events:summary.tabs.contract')}
          >
            <FileCheck className={clsx("h-4 w-4 sm:mr-2", !isDownpaymentMet && "text-warning")} aria-hidden="true" />
            <span className="hidden sm:inline">{t('events:summary.tabs.contract')}</span>
          </button>
          <button
            type="button"
            onClick={() => setViewMode("photos")}
            className={clsx(
              "px-4 py-2 rounded-xl text-sm font-bold flex items-center transition-all whitespace-nowrap",
              viewMode === "photos"
                ? "bg-card text-primary shadow-sm"
                : "text-text-secondary hover:text-text hover:bg-surface-alt"
            )}
            aria-pressed={viewMode === "photos"}
            aria-label={t('events:summary.tabs.photos')}
          >
            <Camera className="h-4 w-4 sm:mr-2" aria-hidden="true" />
            <span className="hidden sm:inline">{t('events:summary.tabs.photos')}</span>
            {eventPhotos.length > 0 && (
              <span className="ml-1.5 bg-primary/10 text-primary text-xs font-bold rounded-full px-1.5 py-0.5">
                {eventPhotos.length}
              </span>
            )}
          </button>
          <button
            type="button"
            onClick={() => setViewMode("checklist")}
            className={clsx(
              "px-4 py-2 rounded-xl text-sm font-bold flex items-center transition-all whitespace-nowrap",
              viewMode === "checklist"
                ? "bg-card text-primary shadow-sm"
                : "text-text-secondary hover:text-text hover:bg-surface-alt"
            )}
            aria-pressed={viewMode === "checklist"}
            aria-label={t('events:summary.tabs.checklist')}
          >
            <ClipboardList className="h-4 w-4 sm:mr-2" aria-hidden="true" />
            <span className="hidden sm:inline">{t('events:summary.tabs.checklist')}</span>
            {checklistItems.length > 0 && (
              <span className="ml-1.5 bg-primary/10 text-primary text-xs font-bold rounded-full px-1.5 py-0.5">
                {Math.round(checklistProgress * 100)}%
              </span>
            )}
          </button>
        </div>
      </div>

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
                  {totalCharged.toLocaleString(moneyLocale, { style: 'currency', currency: 'MXN', minimumFractionDigits: 0 })}
                </p>
                <p className="text-xs text-text-secondary mt-0.5">{t('events:financials.total_charged')}</p>
              </div>
              <div className="px-4 py-4 text-center">
                <p className={clsx("text-2xl font-black", remainingValue > 0 ? "text-warning" : "text-success")}>
                  {totalPaid.toLocaleString(moneyLocale, { style: 'currency', currency: 'MXN', minimumFractionDigits: 0 })}
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
                  <dd className="mt-1 font-bold text-text">{new Date(event.event_date + "T12:00:00").toLocaleDateString(moneyLocale === 'en-US' ? 'en-US' : 'es-MX', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</dd>
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
                <div>
                  <dt className="text-xs font-semibold text-text-tertiary uppercase tracking-wide flex items-center gap-1.5">
                    <Receipt className="h-3.5 w-3.5" /> {t('events:financials.invoice')}
                  </dt>
                  <dd className="mt-1 font-bold text-text">
                    {event.requires_invoice ? t('events:financials.requires_invoice_rate', { rate: event.tax_rate || 16 }) : t('events:financials.no_invoice')}
                  </dd>
                </div>
                {event.deposit_percent > 0 && (
                  <div>
                    <dt className="text-xs font-semibold text-text-tertiary uppercase tracking-wide flex items-center gap-1.5">
                      <DollarSign className="h-3.5 w-3.5" /> {t('events:financials.deposit')}
                    </dt>
                    <dd className="mt-1 font-bold text-text">
                      {event.deposit_percent}% — {depositAmount.toLocaleString(moneyLocale, { style: 'currency', currency: 'MXN' })}
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
              <table className="w-full text-sm" aria-label="Productos incluidos en el evento">
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
                        {p.unit_price.toLocaleString(moneyLocale, { style: 'currency', currency: 'MXN' })}
                      </td>
                      <td className="py-4 px-1 text-right font-bold text-text">
                        {(
                          (p.unit_price - (p.discount || 0)) *
                          p.quantity
                        ).toLocaleString(moneyLocale, { style: 'currency', currency: 'MXN' })}
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
              <table className="w-full text-sm" aria-label="Extras adicionales del evento">
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
                      <td className="py-4 px-1 text-right font-bold text-text">{e.price.toLocaleString(moneyLocale, { style: 'currency', currency: 'MXN' })}</td>
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
                        {s.quantity} {s.unit || t('common:unit_short')} × {s.unit_cost?.toLocaleString(moneyLocale, { style: 'currency', currency: 'MXN' }) || '$0.00'}
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
                        {(s.quantity * (s.unit_cost || 0)).toLocaleString(moneyLocale, { style: 'currency', currency: 'MXN' })}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-4 pt-3 border-t border-border flex justify-between items-center">
                <span className="text-sm text-text-secondary">{t('events:summary.total_supplies_cost')}</span>
                <span className="text-lg font-bold text-warning">
                  {supplies.reduce((sum: number, s: EventSupply) => sum + (s.exclude_cost ? 0 : s.quantity * (s.unit_cost || 0)), 0).toLocaleString(moneyLocale, { style: 'currency', currency: 'MXN' })}
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
                          {s.fee_amount.toLocaleString(moneyLocale, { style: 'currency', currency: 'MXN' })}
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

          <div className="print:hidden">
            <div className="bg-card shadow-lg rounded-2xl p-6 sm:p-8 border border-border overflow-hidden relative">
              <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none">
                <DollarSign className="h-32 w-32 text-primary" />
              </div>
              <h2 className="text-lg font-bold mb-6 flex items-center gap-2 text-text">
                <DollarSign className="h-5 w-5 text-primary" />
                {t('events:financials.title')}
              </h2>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-6 relative z-10">
                <div className="space-y-1">
                  <p className="text-xs font-semibold text-text-tertiary uppercase tracking-wide">{t('events:financials.net_sales')}</p>
                  <p className="text-xl font-black text-text">{netSales.toLocaleString(moneyLocale, { style: 'currency', currency: 'MXN' })}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs font-semibold text-text-tertiary uppercase tracking-wide">{t('events:financials.tax')}</p>
                  <p className="text-xl font-black text-text">{taxAmount.toLocaleString(moneyLocale, { style: 'currency', currency: 'MXN' })}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs font-semibold text-text-tertiary uppercase tracking-wide">{t('events:financials.costs')}</p>
                  <p className="text-xl font-black text-error">{totalCost.toLocaleString(moneyLocale, { style: 'currency', currency: 'MXN' })}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs font-semibold text-text-tertiary uppercase tracking-wide">{t('events:financials.net_profit')}</p>
                  <p className="text-xl font-black text-success">{profit.toLocaleString(moneyLocale, { style: 'currency', currency: 'MXN' })}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs font-semibold text-text-tertiary uppercase tracking-wide">{t('common:pending')}</p>
                  <p className={clsx("text-xl font-black", remainingValue > 0 ? "text-warning" : "text-success")}>
                    {remainingValue.toLocaleString(moneyLocale, { style: 'currency', currency: 'MXN' })}
                  </p>
                </div>
              </div>

              {/* Payment Progress Bar */}
              {totalCharged > 0 && (
                <div className="mt-8 pt-6 border-t border-border relative z-10">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-semibold text-text-tertiary uppercase tracking-wide">{t('events:summary.payment_progress')}</span>
                    <span className="text-sm font-bold text-text">
                      {Math.min(100, ((totalPaid / totalCharged) * 100)).toFixed(0)}%
                    </span>
                  </div>
                  <div className="w-full bg-surface-alt rounded-full h-3 overflow-hidden">
                    <div
                      className={clsx(
                        "h-full rounded-full transition-all duration-500",
                        totalPaid >= totalCharged ? "bg-success" : "bg-primary"
                      )}
                      style={{ width: `${Math.min(100, (totalPaid / totalCharged) * 100)}%` }}
                    />
                  </div>
                  <div className="flex items-center justify-between mt-2 text-xs text-text-secondary">
                    <span>{t('events:summary.charged')}: {totalPaid.toLocaleString(moneyLocale, { style: 'currency', currency: 'MXN' })}</span>
                    <span>{t('common:total')}: {totalCharged.toLocaleString(moneyLocale, { style: 'currency', currency: 'MXN' })}</span>
                  </div>
                  {remainingValue > 0 && currentStatus !== "cancelled" && (
                    <div className="flex flex-wrap gap-3 mt-3">
                       {event.deposit_percent > 0 && !isDownpaymentMet && (
                        <button
                          type="button"
                          onClick={() => {
                            setPaymentInitialAmount(depositAmount - totalPaid);
                            setAutoOpenPayment(true);
                            setViewMode("payments");
                          }}
                          className="flex items-center gap-2 px-4 py-2 bg-warning text-white rounded-xl text-sm font-bold hover:bg-warning/90 transition-colors shadow-md shadow-warning/20"
                        >
                          <DollarSign className="h-4 w-4" />
                          {t('events:summary.actions.deposit_short')}
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => {
                          setPaymentInitialAmount(0);
                          setAutoOpenPayment(false);
                          setViewMode("payments");
                        }}
                        className="flex items-center gap-2 px-4 py-2 bg-surface-alt text-text border border-border rounded-xl text-sm font-bold hover:bg-surface-alt/80 transition-colors"
                      >
                        <DollarSign className="h-4 w-4" />
                        {t('events:summary.actions.payment_short')}
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {viewMode === "ingredients" && (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="bg-card shadow-sm rounded-2xl p-6 sm:p-8 border border-border">
            <h1 className="text-2xl font-black text-text uppercase tracking-tight mb-2">
              {t('events:summary.supplies_list')}
            </h1>
            <p className="text-text-secondary text-sm flex items-center gap-2">
              <ShoppingCart className="h-4 w-4 text-primary" />
              {event.service_type} • {new Date(event.event_date + "T12:00:00").toLocaleDateString(moneyLocale === 'en-US' ? 'en-US' : 'es-MX')}
            </p>
          </div>

          <div className="bg-card shadow-sm rounded-2xl p-6 sm:p-8 border border-border overflow-hidden">
            <table className="w-full text-sm" aria-label="Insumos necesarios para el evento">
              <caption className="sr-only">Lista de insumos con cantidades necesarias para el evento</caption>
              <thead>
                <tr className="text-left text-text-secondary border-b border-border">
                  <th className="pb-3 pt-2">{t('common:supply')}</th>
                  <th className="pb-3 pt-2 text-right">{t('common:required')}</th>
                  <th className="pb-3 pt-2 text-right">{t('common:in_stock')}</th>
                  <th className="pb-3 pt-2 text-right">{t('common:action')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {ingredients.map((ing) => {
                  const needsMore = ing.quantity > (ing.currentStock || 0);
                  return (
                    <tr key={`${ing.name}-${ing.unit}`} className="hover:bg-surface-alt/50 transition-colors">
                      <td className="py-3 font-medium text-text">
                        {ing.name}
                        <div className="text-xs text-text-secondary uppercase tracking-tight">{ing.unit || t('common:unit_short')}</div>
                      </td>
                      <td className="py-3 text-right text-text font-bold">
                        {ing.quantity.toFixed(2)}
                      </td>
                      <td className="py-3 text-right">
                        <span className={clsx(
                          "px-2 py-0.5 rounded-full text-xs font-semibold",
                          needsMore 
                            ? "bg-error/10 text-error border border-error/20"
                            : "bg-success/10 text-success border border-success/20"
                        )}>
                          {(ing.currentStock || 0).toFixed(2)}
                        </span>
                      </td>
                      <td className="py-3 text-right">
                        {needsMore ? (
                          <Link 
                            to="/inventory" 
                            className="text-primary hover:text-primary/80 font-bold text-xs underline decoration-dotted"
                          >
                            {t('common:buy')}
                          </Link>
                        ) : (
                          <span className="text-text-secondary text-xs">OK</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
                {ingredients.length === 0 && (
                  <tr>
                    <td
                      colSpan={3}
                      className="py-4 text-center text-text-secondary italic"
                    >
                      {t('events:summary.no_supplies_calculated')}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Per-event supplies: purchase */}
          {supplies.filter((s: EventSupply) => s.source === 'purchase').length > 0 && (
            <div className="bg-card shadow-sm rounded-2xl p-6 sm:p-8 border border-border overflow-hidden">
              <h2 className="text-lg font-bold text-text mb-1">{t('events:summary.supplies_purchase_title')}</h2>
              <p className="text-xs text-text-secondary mb-4">{t('events:summary.supplies_purchase_desc')}</p>
              <table className="w-full text-sm" aria-label="Insumos por evento de compra nueva">
                <thead>
                  <tr className="text-left text-text-secondary border-b border-border">
                    <th className="pb-3 pt-2">{t('common:supply')}</th>
                    <th className="pb-3 pt-2 text-right">{t('common:quantity')}</th>
                    <th className="pb-3 pt-2 text-right">{t('common:unit_cost')}</th>
                    <th className="pb-3 pt-2 text-right">{t('common:subtotal')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {supplies.filter((s: EventSupply) => s.source === 'purchase').map((s: EventSupply, idx) => (
                    <tr key={s.id || `purchase-${idx}`} className="hover:bg-surface-alt/50 transition-colors">
                      <td className="py-3 font-medium text-text">
                        {s.supply_name || t('common:supply')}
                        <div className="text-xs text-text-secondary uppercase tracking-tight">{s.unit || t('common:unit_short')}</div>
                      </td>
                      <td className="py-3 text-right text-text font-bold">{s.quantity}</td>
                      <td className="py-3 text-right text-text-secondary">
                        {(s.unit_cost || 0).toLocaleString(moneyLocale, { style: 'currency', currency: 'MXN' })}
                      </td>
                      <td className="py-3 text-right text-text font-bold">
                        {((s.quantity || 0) * (s.unit_cost || 0)).toLocaleString(moneyLocale, { style: 'currency', currency: 'MXN' })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Per-event supplies: from stock */}
          {supplies.filter((s: EventSupply) => s.source === 'stock').length > 0 && (
            <div className="bg-card shadow-sm rounded-2xl p-6 sm:p-8 border border-border overflow-hidden">
              <h2 className="text-lg font-bold text-text mb-1">{t('events:summary.supplies_stock_title')}</h2>
              <p className="text-xs text-text-secondary mb-4">{t('events:summary.supplies_stock_desc')}</p>
              <table className="w-full text-sm" aria-label="Insumos por evento del stock">
                <thead>
                  <tr className="text-left text-text-secondary border-b border-border">
                    <th className="pb-3 pt-2">{t('common:supply')}</th>
                    <th className="pb-3 pt-2 text-right">{t('common:quantity')}</th>
                    <th className="pb-3 pt-2 text-right">{t('common:in_stock')}</th>
                    <th className="pb-3 pt-2 text-right">{t('common:status')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {supplies.filter((s: EventSupply) => s.source === 'stock').map((s: EventSupply, idx) => {
                    const needsMore = s.quantity > (s.current_stock || 0);
                    return (
                      <tr key={s.id || `stock-${idx}`} className="hover:bg-surface-alt/50 transition-colors">
                        <td className="py-3 font-medium text-text">
                          {s.supply_name || 'Insumo'}
                          <div className="text-xs text-text-secondary uppercase tracking-tight">{s.unit || 'und'}</div>
                        </td>
                        <td className="py-3 text-right text-text font-bold">{s.quantity}</td>
                        <td className="py-3 text-right">
                          <span className={clsx(
                            "px-2 py-0.5 rounded-full text-xs font-semibold",
                            needsMore
                              ? "bg-error/10 text-error border border-error/20"
                              : "bg-success/10 text-success border border-success/20"
                          )}>
                            {(s.current_stock || 0)}
                          </span>
                        </td>
                        <td className="py-3 text-right">
                          {needsMore ? (
                            <span className="text-error text-xs font-bold">{t('common:insufficient')}</span>
                          ) : (
                            <span className="text-success text-xs font-bold">OK</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {viewMode === "contract" && (
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="bg-card shadow-xl rounded-[40px] p-12 sm:p-20 border border-border font-serif text-text leading-relaxed max-w-4xl mx-auto relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-2 bg-primary"></div>
            <div className="text-center mb-16">
              <h1 className="text-3xl font-black uppercase tracking-[0.2em] text-text">
                {t('events:summary.contract_title')}
              </h1>
              <div className="w-24 h-1 bg-primary mx-auto mt-4"></div>
            </div>

          {contractPreviewMissingTokens.length > 0 ? (
            <div className="space-y-4 text-center">
              <p className="text-error font-semibold">
                {t('events:summary.contract_missing_data')}
              </p>
              <p className="text-sm text-text-secondary">
                {t('events:summary.contract_complete_fields')}: {contractPreviewMissingTokens.map((token) => `[${token}]`).join(", ")}
              </p>
            </div>
          ) : !isDownpaymentMet ? (
            <div className="flex flex-col items-center justify-center py-20 text-center space-y-4">
              <div className="bg-warning/10 p-6 rounded-full">
                <AlertCircle className="h-12 w-12 text-warning" />
              </div>
              <h3 className="text-2xl font-black text-text uppercase">{t('events:summary.deposit_required')}</h3>
              <p className="text-text-secondary max-w-md">
                {t('events:summary.deposit_required_desc', { percent: event.deposit_percent })}
                ({depositAmount.toLocaleString(moneyLocale, { style: 'currency', currency: 'MXN' })}).
              </p>
              <p className="text-sm text-warning font-bold">
                {t('events:summary.deposit_missing', { amount: (depositAmount - totalPaid).toLocaleString(moneyLocale, { style: 'currency', currency: 'MXN' }) })}
              </p>
              <button
                type="button"
                onClick={() => {
                  setPaymentInitialAmount(depositAmount - totalPaid);
                  setAutoOpenPayment(true);
                  setViewMode("payments");
                }}
                className="mt-4 px-8 py-3 bg-primary text-white rounded-2xl font-bold shadow-lg shadow-primary/20 hover:opacity-90 transition-all active:scale-95"
              >
                {t('events:summary.actions.register_deposit_now')}
              </button>
            </div>
          ) : (
            <div className="space-y-4 text-justify whitespace-pre-line">
              {contractPreview.split(/\n\n+/).map((paragraph, index) => (
                <p key={index}>{renderFormattedReact(paragraph)}</p>
              ))}
            </div>
          )}

          <div className="grid grid-cols-2 gap-16 mt-24 pt-12">
            <div className="text-center border-t border-border pt-4">
              <p className="font-bold">
                {profile?.business_name || profile?.name || t('events:summary.the_provider')}
              </p>
              <p className="text-sm text-text-secondary mt-1">
                {t('events:summary.signature')}
              </p>
            </div>
            <div className="text-center border-t border-border pt-4">
              <p className="font-bold">{event.client?.name}</p>
              <p className="text-sm text-text-secondary mt-1">
                {t('events:summary.signature_client')}
              </p>
            </div>
          </div>
        </div>
      </div>
      )}

      {viewMode === "photos" && (
        <div className="bg-card shadow-sm rounded-2xl border border-border p-6 print:hidden">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-bold text-text">{t('events:summary.photos.title')}</h2>
            <button
              type="button"
              onClick={() => photoInputRef.current?.click()}
              disabled={isUploadingPhoto}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-xl text-white premium-gradient hover:opacity-90 shadow-sm transition-opacity disabled:opacity-50"
            >
              {isUploadingPhoto ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                  {t('common:uploading')}...
                </>
              ) : (
                <>
                  <ImagePlus className="h-4 w-4 mr-2" aria-hidden="true" />
                  {t('events:summary.photos.add_photos')}
                </>
              )}
            </button>
            <input
              ref={photoInputRef}
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={handlePhotoUpload}
            />
          </div>

          {eventPhotos.length === 0 ? (
            <div className="text-center py-12">
              <Camera className="mx-auto h-12 w-12 text-text-secondary mb-3" aria-hidden="true" />
              <p className="text-text-secondary">{t('events:summary.photos.no_photos')}</p>
              <p className="text-sm text-text-secondary mt-1">
                {t('events:summary.photos.add_photos_desc')}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
              {eventPhotos.map((photo, idx) => (
                <div key={photo.id || `photo-${idx}`} className="relative group aspect-square rounded-xl overflow-hidden bg-surface-alt">
                  <OptimizedImage
                    src={photo.url}
                    alt={`Foto ${idx + 1} del evento`}
                    className="w-full h-full object-cover cursor-pointer hover:opacity-90 transition-opacity"
                    onClick={() => setLightboxPhoto(photo.url)}
                  />
                  <button
                    type="button"
                    onClick={() => handleRemovePhoto(photo.id)}
                    className="absolute top-2 right-2 bg-error text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-error/90"
                    aria-label={t('events:summary.photos.delete_aria', { index: idx + 1 })}
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {viewMode === "checklist" && (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
          {/* Header card */}
          <div className="bg-card shadow-sm rounded-2xl p-6 sm:p-8 border border-border">
            <h1 className="text-2xl font-black text-text uppercase tracking-tight mb-2">
              {t('events:summary.checklist_title')}
            </h1>
            <p className="text-text-secondary text-sm flex items-center gap-2">
              <ClipboardList className="h-4 w-4 text-primary" />
              {event.service_type} • {new Date(event.event_date + "T12:00:00").toLocaleDateString(moneyLocale === 'en-US' ? 'en-US' : 'es-MX')}
            </p>

            {checklistItems.length > 0 && (
              <div className="mt-4">
                <div className="flex items-center justify-between text-sm mb-2">
                  <span className="text-text-secondary">
                    {t('events:summary.checklist_count', { current: checkedIds.size, total: checklistItems.length })}
                  </span>
                  <span className="font-bold text-primary">
                    {Math.round(checklistProgress * 100)}%
                  </span>
                </div>
                <div className="w-full bg-surface-alt rounded-full h-3 overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-500 ease-out premium-gradient"
                    style={{ width: `${Math.round(checklistProgress * 100)}%` }}
                  />
                </div>
              </div>
            )}
          </div>

          {checklistItems.length === 0 ? (
            <div className="bg-card shadow-sm rounded-2xl border border-border p-8 text-center">
              <ClipboardList className="mx-auto h-12 w-12 text-text-secondary mb-3" aria-hidden="true" />
              <p className="text-text-secondary">{t('events:summary.checklist_empty')}</p>
              <p className="text-sm text-text-secondary mt-1">
                {t('events:summary.checklist_empty_desc')}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Equipment section */}
              {checklistItems.filter((i) => i.section === "equipment").length > 0 && (
                <div className="bg-card shadow-sm rounded-2xl p-6 sm:p-8 border border-border">
                  <h2 className="text-sm font-black text-text uppercase tracking-tight mb-4 flex items-center gap-2">
                    <Wrench className="h-4 w-4 text-primary" aria-hidden="true" />
                    {t('common:equipment')}
                  </h2>
                  <div className="space-y-1">
                    {checklistItems.filter((i) => i.section === "equipment").map((item) => (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => toggleChecklistItem(item.id)}
                        className={clsx(
                          "w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-colors text-left",
                          checkedIds.has(item.id)
                            ? "bg-success/5 hover:bg-success/10"
                            : "hover:bg-surface-alt"
                        )}
                      >
                        {checkedIds.has(item.id) ? (
                          <CheckSquare className="h-5 w-5 text-success shrink-0" />
                        ) : (
                          <Square className="h-5 w-5 text-text-secondary shrink-0" />
                        )}
                        <span className={clsx(
                          "flex-1 text-sm font-medium",
                          checkedIds.has(item.id) ? "line-through text-text-secondary" : "text-text"
                        )}>
                          {item.name}
                        </span>
                        <span className="text-xs text-text-secondary shrink-0">
                          {item.quantity} {item.unit}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Stock supplies section */}
              {checklistItems.filter((i) => i.section === "stock").length > 0 && (
                <div className="bg-card shadow-sm rounded-2xl p-6 sm:p-8 border border-border">
                  <h2 className="text-sm font-black text-text uppercase tracking-tight mb-4 flex items-center gap-2">
                    <Package className="h-4 w-4 text-primary" aria-hidden="true" />
                    {t('events:summary.warehouse_supplies')}
                  </h2>
                  <div className="space-y-1">
                    {checklistItems.filter((i) => i.section === "stock").map((item) => (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => toggleChecklistItem(item.id)}
                        className={clsx(
                          "w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-colors text-left",
                          checkedIds.has(item.id)
                            ? "bg-success/5 hover:bg-success/10"
                            : "hover:bg-surface-alt"
                        )}
                      >
                        {checkedIds.has(item.id) ? (
                          <CheckSquare className="h-5 w-5 text-success shrink-0" />
                        ) : (
                          <Square className="h-5 w-5 text-text-secondary shrink-0" />
                        )}
                        <span className={clsx(
                          "flex-1 text-sm font-medium",
                          checkedIds.has(item.id) ? "line-through text-text-secondary" : "text-text"
                        )}>
                          {item.name}
                        </span>
                        <span className="text-xs text-text-secondary shrink-0">
                          {item.quantity.toFixed(2)} {item.unit || t('common:unit_short')}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Purchase supplies section */}
              {checklistItems.filter((i) => i.section === "purchase").length > 0 && (
                <div className="bg-card shadow-sm rounded-2xl p-6 sm:p-8 border border-border">
                  <h2 className="text-sm font-black text-text uppercase tracking-tight mb-4 flex items-center gap-2">
                    <ShoppingCart className="h-4 w-4 text-warning" aria-hidden="true" />
                    {t('events:summary.supplies_to_buy')}
                  </h2>
                  <div className="space-y-1">
                    {checklistItems.filter((i) => i.section === "purchase").map((item) => (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => toggleChecklistItem(item.id)}
                        className={clsx(
                          "w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-colors text-left",
                          checkedIds.has(item.id)
                            ? "bg-success/5 hover:bg-success/10"
                            : "hover:bg-surface-alt"
                        )}
                      >
                        {checkedIds.has(item.id) ? (
                          <CheckSquare className="h-5 w-5 text-success shrink-0" />
                        ) : (
                          <Square className="h-5 w-5 text-text-secondary shrink-0" />
                        )}
                        <span className={clsx(
                          "flex-1 text-sm font-medium",
                          checkedIds.has(item.id) ? "line-through text-text-secondary" : "text-text"
                        )}>
                          {item.name}
                        </span>
                        <span className="text-xs text-text-secondary shrink-0">
                          {item.quantity} {item.unit}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Extras section */}
              {checklistItems.filter((i) => i.section === "extra").length > 0 && (
                <div className="bg-card shadow-sm rounded-2xl p-6 sm:p-8 border border-border">
                  <h2 className="text-sm font-black text-text uppercase tracking-tight mb-4 flex items-center gap-2">
                    <Zap className="h-4 w-4 text-primary" aria-hidden="true" />
                    {t('events:general.extras')}
                  </h2>
                  <div className="space-y-1">
                    {checklistItems.filter((i) => i.section === "extra").map((item) => (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => toggleChecklistItem(item.id)}
                        className={clsx(
                          "w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-colors text-left",
                          checkedIds.has(item.id)
                            ? "bg-success/5 hover:bg-success/10"
                            : "hover:bg-surface-alt"
                        )}
                      >
                        {checkedIds.has(item.id) ? (
                          <CheckSquare className="h-5 w-5 text-success shrink-0" />
                        ) : (
                          <Square className="h-5 w-5 text-text-secondary shrink-0" />
                        )}
                        <span className={clsx(
                          "flex-1 text-sm font-medium",
                          checkedIds.has(item.id) ? "line-through text-text-secondary" : "text-text"
                        )}>
                          {item.name}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Lightbox */}
      {lightboxPhoto && (
        <div
          className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4"
          onClick={() => setLightboxPhoto(null)}
          role="dialog"
          aria-label={t('events:summary.photos.lightbox_aria')}
        >
          <button
            type="button"
            onClick={() => setLightboxPhoto(null)}
            className="absolute top-4 right-4 text-white hover:text-white/70 transition-colors"
            aria-label={t('common:actions.close')}
          >
            <X className="h-8 w-8" />
          </button>
          <img
            src={lightboxPhoto}
            alt={t('events:summary.photos.lightbox_img_alt')}
            className="max-w-full max-h-[90vh] rounded-xl object-contain"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}

      <div className="mt-12 text-center text-xs text-text-secondary print:mt-12">
        <p>
          {t('events:summary.generated_by', { business: profile?.business_name || "Solennix" })} -{" "}
          {new Date().toLocaleString(moneyLocale === 'en-US' ? 'en-US' : 'es-MX')}
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
