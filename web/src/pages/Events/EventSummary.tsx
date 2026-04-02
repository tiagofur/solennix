import React, { useCallback, useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { eventService } from "@/services/eventService";
import { productService } from "@/services/productService";
import { paymentService } from "@/services/paymentService";
import { eventPaymentService } from "@/services/eventPaymentService";
import { api } from "@/lib/api";
import {
  ArrowLeft,
  FileText,
  ShoppingCart,
  FileCheck,
  Download,
  DollarSign,
  Pencil,
  ChevronDown,
  Trash2,
  MoreVertical,
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
} from "lucide-react";
import { useToast } from "@/hooks/useToast";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { useAuth } from "@/contexts/AuthContext";
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
import { EventStatus } from "@/components/StatusDropdown";

import clsx from "clsx";
import { ContractTemplateError, renderContractTemplate } from "@/lib/contractTemplate";
import { renderFormattedReact } from "@/lib/inlineFormatting";

type ViewMode = "summary" | "ingredients" | "contract" | "payments" | "photos" | "checklist";

const STATUS_CONFIG: Record<
  EventStatus,
  { label: string; color: string; bg: string; dot: string }
> = {
  quoted: {
    label: "Cotizado",
    color: "text-status-quoted",
    bg: "bg-status-quoted/10 border-status-quoted/30",
    dot: "bg-status-quoted",
  },
  confirmed: {
    label: "Confirmado",
    color: "text-status-confirmed",
    bg: "bg-status-confirmed/10 border-status-confirmed/30",
    dot: "bg-status-confirmed",
  },
  completed: {
    label: "Completado",
    color: "text-status-completed",
    bg: "bg-status-completed/10 border-status-completed/30",
    dot: "bg-status-completed",
  },
  cancelled: {
    label: "Cancelado",
    color: "text-status-cancelled",
    bg: "bg-status-cancelled/10 border-status-cancelled/30",
    dot: "bg-status-cancelled",
  },
};

const ALL_STATUSES: EventStatus[] = [
  "quoted",
  "confirmed",
  "completed",
  "cancelled",
];

export const EventSummary: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user, profile } = useAuth();
  const [event, setEvent] = useState<any>(null);
  const [products, setProducts] = useState<any[]>([]);
  const [extras, setExtras] = useState<any[]>([]);
  const [equipment, setEquipment] = useState<any[]>([]);
  const [supplies, setSupplies] = useState<any[]>([]);
  const [ingredients, setIngredients] = useState<any[]>([]);
  const [payments, setPayments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<ViewMode>("summary");
  const [statusDropdownOpen, setStatusDropdownOpen] = useState(false);
  const [actionsDropdownOpen, setActionsDropdownOpen] = useState(false);
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
  const { addToast } = useToast();
  const [eventPhotos, setEventPhotos] = useState<string[]>([]);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const [lightboxPhoto, setLightboxPhoto] = useState<string | null>(null);
  const photoInputRef = React.useRef<HTMLInputElement>(null);
  const [autoOpenPayment, setAutoOpenPayment] = useState(false);
  const [paymentInitialAmount, setPaymentInitialAmount] = useState(0);
  const [checklistItems, setChecklistItems] = useState<{ id: string; name: string; quantity: number; unit: string; section: "equipment" | "stock" | "purchase" | "extra" }[]>([]);
  const [checkedIds, setCheckedIds] = useState<Set<string>>(new Set());

  const aggregateProductIngredients = useCallback(async (productIds: string[], productQuantities: Map<string, number>) => {
    try {
      const allProdIngredients = await productService.getIngredientsForProducts(productIds);
      const prodIngredients = allProdIngredients.filter((ing: any) => ing.type === 'ingredient');

      const aggregatedIngredients: any = {};
      prodIngredients.forEach((ing: any) => {
        const key = ing.inventory_id;
        const quantity = productQuantities.get(ing.product_id) || 0;
        const ingredientName = ing.ingredient_name || ing.inventory?.ingredient_name;
        const unit = ing.unit || ing.inventory?.unit;
        const unitCost = ing.unit_cost ?? ing.inventory?.unit_cost ?? 0;
        const currentStock = ing.inventory?.current_stock ?? 0;

        if (!aggregatedIngredients[key]) {
          aggregatedIngredients[key] = {
            name: ingredientName,
            unit,
            quantity: 0,
            cost: 0,
            currentStock,
          };
        }
        aggregatedIngredients[key].quantity += ing.quantity_required * quantity;
        aggregatedIngredients[key].cost += ing.quantity_required * quantity * unitCost;
      });

      setIngredients(Object.values(aggregatedIngredients));
    } catch (error) {
      logError("Error aggregating ingredients", error);
    }
  }, []);

  const loadData = useCallback(async (eventId: string) => {
    try {
      setLoading(true);
      const [eventData, productsData, extrasData, paymentsData, equipmentData, suppliesData] =
        await Promise.all([
          eventService.getById(eventId),
          eventService.getProducts(eventId),
          eventService.getExtras(eventId),
          paymentService.getByEventId(eventId),
          eventService.getEquipment(eventId),
          eventService.getSupplies(eventId),
        ]);

      setEvent(eventData);
      setProducts(productsData || []);
      setExtras(extrasData || []);
      setPayments(paymentsData || []);
      setEquipment(equipmentData || []);
      setSupplies(suppliesData || []);

      // Parse photos JSONB
      if (eventData.photos) {
        try {
          const parsed = typeof eventData.photos === 'string' ? JSON.parse(eventData.photos) : eventData.photos;
          setEventPhotos(Array.isArray(parsed) ? parsed : []);
        } catch {
          setEventPhotos([]);
        }
      } else {
        setEventPhotos([]);
      }

      const productQuantities = new Map<string, number>();
      (productsData || []).forEach((p: any) => {
        productQuantities.set(p.product_id, p.quantity || 0);
      });
      const productIds = Array.from(productQuantities.keys());
      await aggregateProductIngredients(productIds, productQuantities);

      // Build checklist items from equipment, ingredients (bring_to_event), supplies, and extras
      const clItems: typeof checklistItems = [];

      // Equipment
      (equipmentData || []).forEach((eq: any) => {
        clItems.push({
          id: `eq_${eq.id}`,
          name: eq.equipment_name || "Equipo",
          quantity: eq.quantity || 1,
          unit: eq.unit || "pza",
          section: "equipment",
        });
      });

      // Product ingredients with bring_to_event
      try {
        if (productIds.length > 0) {
          const allIngredients = await productService.getIngredientsForProducts(productIds);
          const aggregated: Record<string, { name: string; quantity: number; unit: string }> = {};
          (allIngredients || [])
            .filter((ing: any) => ing.type === "ingredient" && ing.bring_to_event)
            .forEach((ing: any) => {
              const key = ing.inventory_id;
              const qty = productQuantities.get(ing.product_id) || 0;
              if (!aggregated[key]) {
                aggregated[key] = { name: ing.ingredient_name || "Insumo", unit: ing.unit || "", quantity: 0 };
              }
              aggregated[key].quantity += (ing.quantity_required || 0) * qty;
            });
          Object.entries(aggregated).forEach(([invId, info]) => {
            clItems.push({
              id: `ing_${invId}`,
              name: info.name,
              quantity: info.quantity,
              unit: info.unit,
              section: "stock",
            });
          });
        }
      } catch {
        // Skip ingredient aggregation on error
      }

      // Supplies
      (suppliesData || []).forEach((s: any) => {
        clItems.push({
          id: `sup_${s.id}`,
          name: s.supply_name || "Insumo",
          quantity: s.quantity || 1,
          unit: s.unit || "und",
          section: s.source === "stock" ? "stock" : "purchase",
        });
      });

      // Extras with include_in_checklist
      (extrasData || []).filter((e: any) => e.include_in_checklist !== false && e.description).forEach((e: any) => {
        clItems.push({
          id: `ext_${e.id}`,
          name: e.description,
          quantity: 1,
          unit: "pza",
          section: "extra",
        });
      });

      setChecklistItems(clItems);

      // Restore checked state from localStorage
      const savedChecked = localStorage.getItem(`event_checklist_${eventId}`);
      if (savedChecked) {
        try {
          setCheckedIds(new Set(JSON.parse(savedChecked)));
        } catch {
          setCheckedIds(new Set());
        }
      } else {
        setCheckedIds(new Set());
      }
    } catch (error) {
      logError("Error loading summary", error);
    } finally {
      setLoading(false);
    }
  }, [aggregateProductIngredients]);

  useEffect(() => {
    if (id) {
      loadData(id);
    }
  }, [id, loadData]);

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = () => {
      setStatusDropdownOpen(false);
      setActionsDropdownOpen(false);
    };
    if (statusDropdownOpen || actionsDropdownOpen) {
      document.addEventListener("click", handleClickOutside);
    }
    return () => document.removeEventListener("click", handleClickOutside);
  }, [statusDropdownOpen, actionsDropdownOpen]);

  const handleStatusChange = async (newStatus: EventStatus) => {
    if (!id || !event || newStatus === event.status) return;
    try {
      setUpdatingStatus(true);
      await eventService.update(id, { status: newStatus });
      setEvent((prev: any) => ({ ...prev, status: newStatus }));
      addToast(`Estado actualizado a ${STATUS_CONFIG[newStatus].label}`, "success");
    } catch (error) {
      logError("Error updating status", error);
      addToast("Error al actualizar el estado.", "error");
    } finally {
      setUpdatingStatus(false);
      setStatusDropdownOpen(false);
    }
  };

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

  const handleDeleteEvent = async () => {
    if (!id) return;
    try {
      await eventService.delete(id);
      addToast("Evento eliminado correctamente.", "success");
      navigate("/dashboard");
    } catch (error) {
      logError("Error deleting event", error);
      addToast("Error al eliminar el evento.", "error");
    } finally {
      setConfirmDeleteOpen(false);
    }
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || !id) return;

    setIsUploadingPhoto(true);
    try {
      const newUrls: string[] = [];
      for (const file of Array.from(files)) {
        if (file.size > 10 * 1024 * 1024) {
          addToast(`${file.name} es demasiado grande (máximo 10MB)`, "error");
          continue;
        }
        const formData = new FormData();
        formData.append('file', file);
        const result = await api.postFormData<{ url: string }>('/uploads/image', formData);
        newUrls.push(result.url);
      }

      if (newUrls.length > 0) {
        const updated = [...eventPhotos, ...newUrls];
        await eventService.update(id, { photos: JSON.stringify(updated) });
        setEventPhotos(updated);
        addToast(`${newUrls.length} foto(s) agregada(s)`, "success");
      }
    } catch (err) {
      logError("Error uploading event photos", err);
      addToast("Error al subir fotos.", "error");
    } finally {
      setIsUploadingPhoto(false);
      if (photoInputRef.current) photoInputRef.current.value = "";
    }
  };

  const handleRemovePhoto = async (photoUrl: string) => {
    if (!id) return;
    try {
      const updated = eventPhotos.filter(p => p !== photoUrl);
      await eventService.update(id, { photos: JSON.stringify(updated) });
      setEventPhotos(updated);
      addToast("Foto eliminada.", "success");
    } catch (err) {
      logError("Error removing photo", err);
      addToast("Error al eliminar la foto.", "error");
    }
  };

  const handlePayOnline = async () => {
    if (!id) return;
    try {
      const { url } = await eventPaymentService.createCheckoutSession(id);
      window.location.href = url;
    } catch (error) {
      logError("Error creating checkout session", error);
      addToast("Error al iniciar el pago en línea. Verifica la configuración de Stripe.", "error");
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64" role="status" aria-live="polite">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" aria-hidden="true"></div>
        <span className="sr-only">Cargando resumen del evento...</span>
      </div>
    );
  }

  if (!event) {
    return (
      <div className="flex justify-center items-center h-64" role="alert">
        <p className="text-text-secondary">Evento no encontrado</p>
      </div>
    );
  }

  const totalProductCost = ingredients.reduce((sum, i) => sum + i.cost, 0);
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
      profile: profile as any,
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
  const statusCfg = STATUS_CONFIG[currentStatus] || STATUS_CONFIG.quoted;

  return (
    <div className="space-y-6 max-w-5xl mx-auto px-4 sm:px-8 py-8 transition-colors">
      <Breadcrumb items={[{ label: 'Dashboard', href: '/dashboard' }, { label: event?.service_type || 'Evento' }]} />
      <div className="print:hidden mb-8 space-y-4">
        {/* Action bar */}
        <div className="flex items-center justify-between gap-4">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="flex items-center text-text-secondary hover:text-text transition-colors shrink-0"
            aria-label="Volver a la página anterior"
          >
            <ArrowLeft className="h-5 w-5 mr-1" aria-hidden="true" />
            <span className="font-medium hidden sm:inline">Volver</span>
          </button>

          <div className="flex items-center gap-2">
            {/* Secondary Actions Dropdown */}
            <div className="relative shrink-0" onClick={(e) => e.stopPropagation()}>
              <button
                type="button"
                onClick={() => setActionsDropdownOpen(!actionsDropdownOpen)}
                className="h-10 w-10 sm:h-9 sm:w-9 flex items-center justify-center rounded-xl border border-border bg-surface hover:bg-surface-alt transition-colors text-text-secondary hover:text-text"
                aria-label="Más acciones"
                aria-expanded={actionsDropdownOpen}
                aria-haspopup="menu"
              >
                <MoreVertical className="h-4 w-4" aria-hidden="true" />
              </button>
              {actionsDropdownOpen && (
                <div className="absolute right-0 mt-1 w-56 sm:w-72 bg-card border border-border rounded-xl shadow-lg z-50 overflow-hidden py-1" role="menu">
                  <p className="px-4 py-2 text-xs font-semibold text-text-tertiary uppercase tracking-wider border-b border-border mb-1">
                    Exportar PDF
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      generateBudgetPDF(event, profile as any, products, extras);
                      setActionsDropdownOpen(false);
                    }}
                    className="w-full flex items-center px-4 py-2.5 text-sm text-text hover:bg-surface-alt dark:hover:bg-surface transition-colors"
                    role="menuitem"
                  >
                    <Download className="h-5 w-5 mr-3 text-text-secondary" />
                    Presupuesto
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      generateInvoicePDF(event, profile as any, products, extras);
                      setActionsDropdownOpen(false);
                    }}
                    className="w-full flex items-center px-4 py-2.5 text-sm text-text hover:bg-surface-alt dark:hover:bg-surface transition-colors"
                    role="menuitem"
                  >
                    <FileText className="h-5 w-5 mr-3 text-text-secondary" />
                    Generar Factura
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      // Include purchase supplies in shopping list
                      const purchaseSupplies = supplies
                        .filter((s: any) => s.source === 'purchase')
                        .map((s: any) => ({
                          name: s.supply_name || 'Insumo',
                          quantity: s.quantity,
                          unit: s.unit || 'und',
                        }));
                      generateShoppingListPDF(event, profile as any, [...ingredients, ...purchaseSupplies]);
                      setActionsDropdownOpen(false);
                    }}
                    className="w-full flex items-center px-4 py-2.5 text-sm text-text hover:bg-surface-alt dark:hover:bg-surface transition-colors"
                    role="menuitem"
                  >
                    <ShoppingCart className="h-5 w-5 mr-3 text-text-secondary" />
                    Lista de Insumos
                  </button>
                  <button
                    type="button"
                    onClick={async () => {
                      try {
                        const productIds = products.map((p: any) => p.product_id).filter(Boolean);
                        const productQuantities = new Map<string, number>();
                        products.forEach((p: any) => productQuantities.set(p.product_id, p.quantity || 0));
                        const allIngredients = productIds.length > 0
                          ? await productService.getIngredientsForProducts(productIds)
                          : [];
                        const aggregated: Record<string, { name: string; quantity: number; unit: string }> = {};
                        (allIngredients || [])
                          .filter((ing: any) => ing.type === 'ingredient' && ing.bring_to_event)
                          .forEach((ing: any) => {
                            const key = ing.inventory_id;
                            const qty = productQuantities.get(ing.product_id) || 0;
                            if (!aggregated[key]) {
                              aggregated[key] = { name: ing.ingredient_name || 'Insumo', unit: ing.unit || '', quantity: 0 };
                            }
                            aggregated[key].quantity += (ing.quantity_required || 0) * qty;
                          });
                        // Include ALL per-event supplies in checklist (stock + purchase)
                        const allEventSupplies = supplies
                          .map((s: any) => ({
                            name: s.supply_name || 'Insumo',
                            quantity: s.quantity,
                            unit: s.unit || 'und',
                          }));
                        generateChecklistPDF(event, profile as any, products, equipment, [...Object.values(aggregated), ...allEventSupplies], extras);
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
                    Checklist de Carga
                  </button>
                  <button
                    type="button"
                    disabled={!isDownpaymentMet}
                    onClick={() => {
                      try {
                        generateContractPDF(event, profile as any, undefined, products, payments);
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
                    Contrato {!isDownpaymentMet && "(Saldar Anticipo)"}
                  </button>
                  {viewMode === "payments" && payments.length > 0 && (
                    <button
                      type="button"
                      onClick={() => {
                        generatePaymentReportPDF(event, profile as any, payments);
                        setActionsDropdownOpen(false);
                      }}
                      className="w-full flex items-center px-4 py-2.5 text-sm text-text hover:bg-surface-alt dark:hover:bg-surface transition-colors"
                      role="menuitem"
                    >
                      <Download className="h-5 w-5 mr-3 text-text-secondary" />
                      Reporte de Pagos
                    </button>
                  )}
                  {remainingValue > 0 && currentStatus !== "cancelled" && (
                    <>
                      <div className="my-1 border-t border-border"></div>
                      <p className="px-4 py-2 text-xs font-semibold text-text-tertiary uppercase tracking-wider">
                        Cobro en Línea
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
                        Pagar con Stripe
                      </button>
                    </>
                  )}
                </div>
              )}
            </div>
            {/* Edit */}
            <button
              type="button"
              onClick={() => navigate(`/events/${id}/edit`)}
              className="inline-flex items-center gap-2 px-3 py-2 border border-border rounded-xl bg-card text-sm font-medium text-text-secondary hover:bg-surface-alt transition-colors"
              aria-label="Editar este evento"
            >
              <Pencil className="h-4 w-4" aria-hidden="true" />
              <span className="hidden sm:inline">Editar</span>
            </button>
            {/* Delete */}
            <button
              type="button"
              onClick={() => setConfirmDeleteOpen(true)}
              className="inline-flex items-center gap-2 px-3 py-2 border border-error/20 rounded-xl bg-error/5 text-sm font-medium text-error hover:bg-error/10 transition-colors"
              aria-label="Eliminar este evento"
            >
              <Trash2 className="h-4 w-4" aria-hidden="true" />
              <span className="hidden sm:inline">Eliminar</span>
            </button>
          </div>
        </div>

        {/* Tab bar */}
        <div className="flex bg-surface-alt dark:bg-surface-alt/50 rounded-2xl p-1.5 overflow-x-auto no-scrollbar shadow-sm" role="group" aria-label="Modos de visualización del evento">
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
            aria-label="Ver resumen del evento"
          >
            <FileText className="h-4 w-4 sm:mr-2" aria-hidden="true" />
            <span className="hidden sm:inline">Resumen</span>
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
            aria-label="Ver pagos del evento"
          >
            <DollarSign className="h-4 w-4 sm:mr-2" aria-hidden="true" />
            <span className="hidden sm:inline">Pagos</span>
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
            aria-label="Ver lista de insumos"
          >
            <ShoppingCart className="h-4 w-4 sm:mr-2" aria-hidden="true" />
            <span className="hidden sm:inline">Compras</span>
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
            aria-label="Ver contrato del evento"
          >
            <FileCheck className={clsx("h-4 w-4 sm:mr-2", !isDownpaymentMet && "text-warning")} aria-hidden="true" />
            <span className="hidden sm:inline">Contrato</span>
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
            aria-label="Ver fotos del evento"
          >
            <Camera className="h-4 w-4 sm:mr-2" aria-hidden="true" />
            <span className="hidden sm:inline">Fotos</span>
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
            aria-label="Ver checklist de carga"
          >
            <ClipboardList className="h-4 w-4 sm:mr-2" aria-hidden="true" />
            <span className="hidden sm:inline">Checklist</span>
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
          onStatusChange={handleStatusChange}
          eventData={event}
          profile={profile}
          initialAmount={paymentInitialAmount}
          autoOpenAdd={autoOpenPayment}
          onPaymentAdded={async () => {
            const paymentsData = await paymentService.getByEventId(id);
            setPayments(paymentsData || []);
          }}
        />
      )}

      {viewMode === "summary" && (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="bg-card shadow-sm rounded-3xl p-6 sm:p-8 border border-border">
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 border-b border-border pb-6">
              <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-text break-words line-clamp-2">
                {event.client?.name} - {event.service_type}
              </h1>

              {/* Status Badge + Dropdown */}
              <div
                className="relative shrink-0"
                onClick={(e) => e.stopPropagation()}
              >
                <button
                  type="button"
                  onClick={() => setStatusDropdownOpen((prev) => !prev)}
                  disabled={updatingStatus}
                  className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full border text-sm font-semibold transition-all ${statusCfg.bg} ${statusCfg.color} ${updatingStatus ? "opacity-60 cursor-not-allowed" : "hover:opacity-80 cursor-pointer"}`}
                  aria-label={`Estado del evento: ${statusCfg.label}. Click para cambiar`}
                  aria-expanded={statusDropdownOpen}
                  aria-haspopup="menu"
                >
                  <span
                    className={`w-2 h-2 rounded-full shrink-0 ${statusCfg.dot}`}
                    aria-hidden="true"
                  />
                  {statusCfg.label}
                  <ChevronDown
                    className={`h-3.5 w-3.5 transition-transform ${statusDropdownOpen ? "rotate-180" : ""}`}
                    aria-hidden="true"
                  />
                </button>

                {statusDropdownOpen && (
                  <div className="absolute right-0 mt-1 w-40 sm:w-44 bg-card border border-border rounded-lg shadow-lg z-50 overflow-hidden" role="menu" aria-label="Cambiar estado del evento">
                    {ALL_STATUSES.map((s) => {
                      const cfg = STATUS_CONFIG[s];
                      return (
                        <button
                          key={s}
                          type="button"
                          onClick={() => handleStatusChange(s)}
                          className={`w-full flex items-center gap-2 px-3 py-2.5 text-sm text-left transition-colors hover:bg-surface-alt ${
                            s === currentStatus
                              ? "font-semibold " + cfg.color
                              : "text-text"
                          }`}
                          role="menuitem"
                          aria-label={`Cambiar estado a ${cfg.label}`}
                          aria-current={s === currentStatus ? "true" : undefined}
                        >
                          <span
                            className={`w-2 h-2 rounded-full shrink-0 ${cfg.dot}`}
                            aria-hidden="true"
                          />
                          {cfg.label}
                          {s === currentStatus && (
                            <span className="ml-auto text-xs opacity-60" aria-hidden="true">
                              ✓
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-6 mt-8">
              <div className="space-y-1">
                <p className="text-xs font-bold text-text-tertiary uppercase tracking-wider">Fecha</p>
                <p className="font-bold text-text">{new Date(event.event_date + "T12:00:00").toLocaleDateString()}</p>
              </div>
              <div className="space-y-1">
                <p className="text-xs font-bold text-text-tertiary uppercase tracking-wider">Horario</p>
                <p className="font-bold text-text">{event.start_time && event.end_time ? `${event.start_time.slice(0, 5)} - ${event.end_time.slice(0, 5)}` : "No definido"}</p>
              </div>
              <div className="space-y-1">
                <p className="text-xs font-bold text-text-tertiary uppercase tracking-wider">Personas</p>
                <p className="font-bold text-text">{event.num_people} PAX</p>
              </div>
              <div className="space-y-1 text-right">
                <p className="text-xs font-bold text-text-tertiary uppercase tracking-wider">Estado</p>
                <p className={clsx("font-bold", statusCfg.color.replace('text-', 'text-'))}>{statusCfg.label}</p>
              </div>
            </div>

            <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-8 border-t border-border pt-8">
              <div className="space-y-2">
                <p className="text-xs font-bold text-text-tertiary uppercase tracking-wider">Cliente / Ubicación</p>
                <p className="font-bold text-lg text-text">{event.client?.name}</p>
                {event.location && (
                  <p className="text-sm text-text-secondary flex items-baseline gap-2">
                    <Building className="h-3.5 w-3.5 text-primary" />
                    {event.location}
                  </p>
                )}
              </div>
              <div className="space-y-2 md:text-right">
                <p className="text-xs font-bold text-text-tertiary uppercase tracking-wider">Contacto / Factura</p>
                <p className="font-bold text-text">{event.client?.phone || "Sin teléfono"}</p>
                <p className="text-sm text-text-secondary">
                  {event.requires_invoice ? `Requiere factura (IVA ${event.tax_rate || 16}%)` : "No requiere factura"}
                </p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="bg-card shadow-sm rounded-3xl p-6 sm:p-8 border border-border">
              <h2 className="text-lg font-bold mb-6 flex items-center gap-2 text-text">
                <ShoppingCart className="h-5 w-5 text-primary" />
                Productos
              </h2>
              <table className="w-full text-sm" aria-label="Productos incluidos en el evento">
                <thead>
                  <tr className="text-left text-text-tertiary border-b border-border">
                    <th className="pb-3 px-1 font-bold uppercase tracking-wider text-[10px]">Producto</th>
                    <th className="pb-3 px-1 text-right font-bold uppercase tracking-wider text-[10px]">Cant.</th>
                    <th className="pb-3 px-1 text-right font-bold uppercase tracking-wider text-[10px]">Precio</th>
                    <th className="pb-3 px-1 text-right font-bold uppercase tracking-wider text-[10px]">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {products.map((p) => (
                    <tr key={p.product_id} className="group hover:bg-surface-alt/50 transition-colors">
                      <td className="py-4 px-1 font-bold text-text">{p.products?.name}</td>
                      <td className="py-4 px-1 text-right text-text-secondary">{p.quantity}</td>
                      <td className="py-4 px-1 text-right text-text-secondary font-medium">
                        ${p.unit_price.toFixed(2)}
                      </td>
                      <td className="py-4 px-1 text-right font-bold text-text">
                        $
                        {(
                          (p.unit_price - ((p as any).discount || 0)) *
                          p.quantity
                        ).toFixed(2)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="bg-card shadow-sm rounded-3xl p-6 sm:p-8 border border-border">
              <h2 className="text-lg font-bold mb-6 flex items-center gap-2 text-text">
                <Zap className="h-5 w-5 text-primary" />
                Extras
              </h2>
              <table className="w-full text-sm" aria-label="Extras adicionales del evento">
                <thead>
                  <tr className="text-left text-text-tertiary border-b border-border">
                    <th className="pb-3 px-1 font-bold uppercase tracking-wider text-[10px]">Descripción</th>
                    <th className="pb-3 px-1 text-right font-bold uppercase tracking-wider text-[10px]">Precio</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {extras.map((e) => (
                    <tr key={e.id} className="hover:bg-surface-alt/50 transition-colors">
                      <td className="py-4 px-1 font-bold text-text">{e.description}</td>
                      <td className="py-4 px-1 text-right font-bold text-text">${e.price.toFixed(2)}</td>
                    </tr>
                  ))}
                  {extras.length === 0 && (
                    <tr>
                      <td
                        colSpan={2}
                        className="py-12 text-center text-text-tertiary italic"
                      >
                        Sin extras agregados
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Supplies section */}
          {supplies.length > 0 && (
            <div className="bg-card shadow-sm rounded-3xl p-6 sm:p-8 border border-border mt-8">
              <h2 className="text-lg font-bold mb-6 flex items-center gap-2 text-text">
                <Fuel className="h-5 w-5 text-warning" />
                Insumos por Evento
              </h2>
              <div className="space-y-3">
                {supplies.map((s: any) => (
                  <div key={s.id} className="flex items-center justify-between py-3 border-b border-border last:border-0">
                    <div>
                      <span className="font-bold text-text">{s.supply_name || 'Insumo'}</span>
                      <span className="text-text-secondary ml-2">
                        {s.quantity} {s.unit || 'und'} × ${s.unit_cost?.toFixed(2) || '0.00'}
                      </span>
                    </div>
                    <div className="flex items-center gap-3">
                      {s.exclude_cost && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium bg-surface-alt text-text-secondary">
                          Sin costo
                        </span>
                      )}
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium ${
                        s.source === 'stock'
                          ? 'bg-success/10 text-success'
                          : 'bg-status-quoted/10 text-status-quoted'
                      }`}>
                        {s.source === 'stock' ? 'Del stock' : 'Compra nueva'}
                      </span>
                      <span className={`font-bold ${
                        s.exclude_cost
                          ? 'line-through text-text-tertiary'
                          : 'text-warning'
                      }`}>
                        ${(s.quantity * (s.unit_cost || 0)).toFixed(2)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-4 pt-3 border-t border-border flex justify-between items-center">
                <span className="text-sm text-text-secondary">Costo total insumos</span>
                <span className="text-lg font-bold text-warning">
                  ${supplies.reduce((sum: number, s: any) => sum + (s.exclude_cost ? 0 : s.quantity * (s.unit_cost || 0)), 0).toFixed(2)}
                </span>
              </div>
            </div>
          )}

          {/* Equipment section */}
          {equipment.length > 0 && (
            <div className="bg-card shadow-sm rounded-3xl p-6 sm:p-8 border border-border mt-8">
              <h2 className="text-lg font-bold mb-6 flex items-center gap-2 text-text">
                <Wrench className="h-5 w-5 text-primary" />
                Equipo Asignado
              </h2>
              <div className="space-y-3">
                {equipment.map((eq: any) => (
                  <div key={eq.id} className="flex items-center justify-between py-3 border-b border-border last:border-0">
                    <div>
                      <span className="font-bold text-text">{eq.equipment_name || 'Equipo'}</span>
                      <span className="text-text-secondary ml-2">x{eq.quantity}</span>
                      {eq.notes && (
                        <p className="text-xs text-text-tertiary mt-0.5">{eq.notes}</p>
                      )}
                    </div>
                    <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium bg-surface-alt text-text-secondary">
                      Sin costo
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="mt-8 border-t border-border pt-2 print:hidden">
            <div className="bg-card shadow-lg rounded-3xl p-6 sm:p-8 border border-border overflow-hidden relative">
              <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none">
                <DollarSign className="h-32 w-32 text-primary" />
              </div>
              <h2 className="text-xl font-black mb-8 text-text tracking-tight uppercase">
                Resumen Financiero <span className="text-text-tertiary font-medium">Interno</span>
              </h2>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-8 relative z-10">
                <div className="space-y-1">
                  <p className="text-[10px] font-black text-text-tertiary uppercase tracking-tighter">Venta Bruta</p>
                  <p className="text-2xl font-black text-text">${netSales.toFixed(2)}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-[10px] font-black text-text-tertiary uppercase tracking-tighter">IVA</p>
                  <p className="text-2xl font-black text-text">${taxAmount.toFixed(2)}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-[10px] font-black text-text-tertiary uppercase tracking-tighter">Total Cobrado</p>
                  <p className="text-2xl font-black text-primary">${totalCharged.toFixed(2)}</p>
                </div>
                {event.deposit_percent > 0 && (
                  <div className="space-y-1">
                    <p className="text-[10px] font-black text-warning uppercase tracking-tighter">Cobrar Anticipo ({event.deposit_percent}%)</p>
                    <p className={clsx("text-2xl font-black", isDownpaymentMet ? "text-text" : "text-warning")}>
                      ${depositAmount.toFixed(2)}
                    </p>
                  </div>
                )}
                <div className="space-y-1">
                  <p className="text-[10px] font-black text-text-tertiary uppercase tracking-tighter">Utilidad Neta</p>
                  <p className="text-2xl font-black text-success">${profit.toFixed(2)}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-[10px] font-black text-text-tertiary uppercase tracking-tighter">Margen</p>
                  <p className="text-2xl font-black text-info">{margin.toFixed(1)}%</p>
                </div>
                <div className="space-y-1">
                  <p className="text-[10px] font-black text-text-tertiary uppercase tracking-tighter">Costos</p>
                  <p className="text-2xl font-black text-error">${totalCost.toFixed(2)}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-[10px] font-black text-text-tertiary uppercase tracking-tighter">Pagado</p>
                  <p className="text-2xl font-black text-success">${totalPaid.toFixed(2)}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-[10px] font-black text-text-tertiary uppercase tracking-tighter">Pendiente</p>
                  <p className={clsx("text-2xl font-black", remainingValue > 0 ? "text-error" : "text-text")}>
                    ${remainingValue.toFixed(2)}
                  </p>
                </div>
              </div>

              {/* Payment Progress Bar */}
              {totalCharged > 0 && (
                <div className="mt-8 pt-6 border-t border-border relative z-10">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold text-text-tertiary uppercase tracking-wider">Progreso de Cobro</span>
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
                    <span>Cobrado: ${totalPaid.toFixed(2)}</span>
                    <span>Total: ${totalCharged.toFixed(2)}</span>
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
                          $ Anticipo
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
                        $ Pago
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
          <div className="bg-card shadow-sm rounded-3xl p-6 sm:p-8 border border-border">
            <h1 className="text-2xl font-black text-text uppercase tracking-tight mb-2">
              Lista de Insumos
            </h1>
            <p className="text-text-secondary text-sm flex items-center gap-2">
              <ShoppingCart className="h-4 w-4 text-primary" />
              {event.service_type} • {new Date(event.event_date + "T12:00:00").toLocaleDateString()}
            </p>
          </div>

          <div className="bg-card shadow-sm rounded-3xl p-6 sm:p-8 border border-border overflow-hidden">
            <table className="w-full text-sm" aria-label="Insumos necesarios para el evento">
              <caption className="sr-only">Lista de insumos con cantidades necesarias para el evento</caption>
              <thead>
                <tr className="text-left text-text-secondary border-b border-border">
                  <th className="pb-3 pt-2">Insumo</th>
                  <th className="pb-3 pt-2 text-right">Necesario</th>
                  <th className="pb-3 pt-2 text-right">En Stock</th>
                  <th className="pb-3 pt-2 text-right">Acción</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {ingredients.map((ing) => {
                  const needsMore = ing.quantity > (ing.currentStock || 0);
                  return (
                    <tr key={`${ing.name}-${ing.unit}`} className="hover:bg-surface-alt/50 transition-colors">
                      <td className="py-3 font-medium text-text">
                        {ing.name}
                        <div className="text-[10px] text-text-secondary uppercase tracking-tight">{ing.unit}</div>
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
                            Comprar
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
                      No hay insumos calculados para los productos
                      seleccionados.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Per-event supplies: purchase */}
          {supplies.filter((s: any) => s.source === 'purchase').length > 0 && (
            <div className="bg-card shadow-sm rounded-3xl p-6 sm:p-8 border border-border overflow-hidden">
              <h2 className="text-lg font-bold text-text mb-1">Insumos por Evento — Compra Nueva</h2>
              <p className="text-xs text-text-secondary mb-4">Estos insumos deben comprarse para el evento</p>
              <table className="w-full text-sm" aria-label="Insumos por evento de compra nueva">
                <thead>
                  <tr className="text-left text-text-secondary border-b border-border">
                    <th className="pb-3 pt-2">Insumo</th>
                    <th className="pb-3 pt-2 text-right">Cantidad</th>
                    <th className="pb-3 pt-2 text-right">Costo Unit.</th>
                    <th className="pb-3 pt-2 text-right">Subtotal</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {supplies.filter((s: any) => s.source === 'purchase').map((s: any) => (
                    <tr key={s.id} className="hover:bg-surface-alt/50 transition-colors">
                      <td className="py-3 font-medium text-text">
                        {s.supply_name || 'Insumo'}
                        <div className="text-[10px] text-text-secondary uppercase tracking-tight">{s.unit || 'und'}</div>
                      </td>
                      <td className="py-3 text-right text-text font-bold">{s.quantity}</td>
                      <td className="py-3 text-right text-text-secondary">
                        ${(s.unit_cost || 0).toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="py-3 text-right text-text font-bold">
                        ${((s.quantity || 0) * (s.unit_cost || 0)).toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Per-event supplies: from stock */}
          {supplies.filter((s: any) => s.source === 'stock').length > 0 && (
            <div className="bg-card shadow-sm rounded-3xl p-6 sm:p-8 border border-border overflow-hidden">
              <h2 className="text-lg font-bold text-text mb-1">Insumos por Evento — Del Stock</h2>
              <p className="text-xs text-text-secondary mb-4">Estos insumos se toman del inventario existente</p>
              <table className="w-full text-sm" aria-label="Insumos por evento del stock">
                <thead>
                  <tr className="text-left text-text-secondary border-b border-border">
                    <th className="pb-3 pt-2">Insumo</th>
                    <th className="pb-3 pt-2 text-right">Cantidad</th>
                    <th className="pb-3 pt-2 text-right">En Stock</th>
                    <th className="pb-3 pt-2 text-right">Estado</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {supplies.filter((s: any) => s.source === 'stock').map((s: any) => {
                    const needsMore = s.quantity > (s.current_stock || 0);
                    return (
                      <tr key={s.id} className="hover:bg-surface-alt/50 transition-colors">
                        <td className="py-3 font-medium text-text">
                          {s.supply_name || 'Insumo'}
                          <div className="text-[10px] text-text-secondary uppercase tracking-tight">{s.unit || 'und'}</div>
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
                            <span className="text-error text-xs font-bold">Insuficiente</span>
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
                Contrato de Servicios
              </h1>
              <div className="w-24 h-1 bg-primary mx-auto mt-4"></div>
            </div>

          {contractPreviewMissingTokens.length > 0 ? (
            <div className="space-y-4 text-center">
              <p className="text-error font-semibold">
                Faltan datos para renderizar el contrato.
              </p>
              <p className="text-sm text-text-secondary">
                Completa estos campos en el evento o cliente: {contractPreviewMissingTokens.map((token) => `[${token}]`).join(", ")}
              </p>
            </div>
          ) : !isDownpaymentMet ? (
            <div className="flex flex-col items-center justify-center py-20 text-center space-y-4">
              <div className="bg-warning/10 p-6 rounded-full">
                <AlertCircle className="h-12 w-12 text-warning" />
              </div>
              <h3 className="text-2xl font-black text-text uppercase">Anticipo Requerido</h3>
              <p className="text-text-secondary max-w-md">
                Para visualizar y generar el contrato, es necesario cubrir el anticipo mínimo del 
                <span className="font-bold text-text mx-1">{event.deposit_percent}%</span> 
                (${depositAmount.toFixed(2)}).
              </p>
              <p className="text-sm text-warning font-bold">
                Faltan ${(depositAmount - totalPaid).toFixed(2)} por cobrar.
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
                Registrar Anticipo Ahora
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
                {profile?.business_name || profile?.name || "EL PROVEEDOR"}
              </p>
              <p className="text-sm text-text-secondary mt-1">
                Firma
              </p>
            </div>
            <div className="text-center border-t border-border pt-4">
              <p className="font-bold">{event.client?.name}</p>
              <p className="text-sm text-text-secondary mt-1">
                Firma de EL CLIENTE
              </p>
            </div>
          </div>
        </div>
      </div>
      )}

      {viewMode === "photos" && (
        <div className="bg-card shadow-sm rounded-3xl border border-border p-6 print:hidden">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-bold text-text">Fotos del Evento</h2>
            <button
              type="button"
              onClick={() => photoInputRef.current?.click()}
              disabled={isUploadingPhoto}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-xl text-white premium-gradient hover:opacity-90 shadow-sm transition-opacity disabled:opacity-50"
            >
              {isUploadingPhoto ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                  Subiendo...
                </>
              ) : (
                <>
                  <ImagePlus className="h-4 w-4 mr-2" aria-hidden="true" />
                  Agregar Fotos
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
              <p className="text-text-secondary">No hay fotos del evento.</p>
              <p className="text-sm text-text-secondary mt-1">
                Agrega fotos para documentar tu trabajo.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
              {eventPhotos.map((url, idx) => (
                <div key={idx} className="relative group aspect-square rounded-xl overflow-hidden bg-surface-alt">
                  <img
                    src={url}
                    alt={`Foto ${idx + 1} del evento`}
                    className="w-full h-full object-cover cursor-pointer hover:opacity-90 transition-opacity"
                    onClick={() => setLightboxPhoto(url)}
                  />
                  <button
                    type="button"
                    onClick={() => handleRemovePhoto(url)}
                    className="absolute top-2 right-2 bg-error text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-error/90"
                    aria-label={`Eliminar foto ${idx + 1}`}
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
          <div className="bg-card shadow-sm rounded-3xl p-6 sm:p-8 border border-border">
            <h1 className="text-2xl font-black text-text uppercase tracking-tight mb-2">
              Checklist de Carga
            </h1>
            <p className="text-text-secondary text-sm flex items-center gap-2">
              <ClipboardList className="h-4 w-4 text-primary" />
              {event.service_type} • {new Date(event.event_date + "T12:00:00").toLocaleDateString()}
            </p>

            {checklistItems.length > 0 && (
              <div className="mt-4">
                <div className="flex items-center justify-between text-sm mb-2">
                  <span className="text-text-secondary">
                    {checkedIds.size} de {checklistItems.length} completados
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
            <div className="bg-card shadow-sm rounded-3xl border border-border p-8 text-center">
              <ClipboardList className="mx-auto h-12 w-12 text-text-secondary mb-3" aria-hidden="true" />
              <p className="text-text-secondary">No hay elementos para el checklist.</p>
              <p className="text-sm text-text-secondary mt-1">
                Agrega productos, equipo o insumos al evento para generar el checklist.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Equipment section */}
              {checklistItems.filter((i) => i.section === "equipment").length > 0 && (
                <div className="bg-card shadow-sm rounded-3xl p-6 sm:p-8 border border-border">
                  <h2 className="text-sm font-black text-text uppercase tracking-tight mb-4 flex items-center gap-2">
                    <Wrench className="h-4 w-4 text-primary" aria-hidden="true" />
                    Equipo
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
                <div className="bg-card shadow-sm rounded-3xl p-6 sm:p-8 border border-border">
                  <h2 className="text-sm font-black text-text uppercase tracking-tight mb-4 flex items-center gap-2">
                    <Package className="h-4 w-4 text-primary" aria-hidden="true" />
                    Insumos de Almacén
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
                          {item.quantity.toFixed(2)} {item.unit}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Purchase supplies section */}
              {checklistItems.filter((i) => i.section === "purchase").length > 0 && (
                <div className="bg-card shadow-sm rounded-3xl p-6 sm:p-8 border border-border">
                  <h2 className="text-sm font-black text-text uppercase tracking-tight mb-4 flex items-center gap-2">
                    <ShoppingCart className="h-4 w-4 text-warning" aria-hidden="true" />
                    Insumos a Comprar
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
                <div className="bg-card shadow-sm rounded-3xl p-6 sm:p-8 border border-border">
                  <h2 className="text-sm font-black text-text uppercase tracking-tight mb-4 flex items-center gap-2">
                    <Zap className="h-4 w-4 text-primary" aria-hidden="true" />
                    Extras
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
          aria-label="Vista ampliada de foto"
        >
          <button
            type="button"
            onClick={() => setLightboxPhoto(null)}
            className="absolute top-4 right-4 text-white hover:text-white/70 transition-colors"
            aria-label="Cerrar vista ampliada"
          >
            <X className="h-8 w-8" />
          </button>
          <img
            src={lightboxPhoto}
            alt="Foto ampliada del evento"
            className="max-w-full max-h-[90vh] rounded-xl object-contain"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}

      <div className="mt-12 text-center text-xs text-text-secondary print:mt-12">
        <p>
          Generado por {profile?.business_name || "Solennix"} -{" "}
          {new Date().toLocaleString()}
        </p>
      </div>
      <ConfirmDialog
        open={confirmDeleteOpen}
        title="Eliminar Evento"
        description="¿Estás seguro de que deseas eliminar este evento? Esta acción no se puede deshacer y se perderán todos los datos asociados."
        confirmText="Eliminar permanentemente"
        cancelText="Cancelar"
        onConfirm={handleDeleteEvent}
        onCancel={() => setConfirmDeleteOpen(false)}
      />
    </div>
  );
};
