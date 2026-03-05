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
} from "lucide-react";
import { useToast } from "@/hooks/useToast";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { useAuth } from "@/contexts/AuthContext";
import {
  generateBudgetPDF,
  generateContractPDF,
  generateShoppingListPDF,
  generateInvoicePDF,
  generatePaymentReportPDF,
} from "@/lib/pdfGenerator";
import { logError } from "@/lib/errorHandler";
import { getEventTotalCharged, getEventTaxAmount, getEventNetSales } from "@/lib/finance";
import { Payments } from "./components/Payments";

import clsx from "clsx";
import { ContractTemplateError, renderContractTemplate } from "@/lib/contractTemplate";
import { renderFormattedReact } from "@/lib/inlineFormatting";

type ViewMode = "summary" | "ingredients" | "contract" | "payments" | "photos";

type EventStatus = "quoted" | "confirmed" | "completed" | "cancelled";

const STATUS_CONFIG: Record<
  EventStatus,
  { label: string; color: string; bg: string; dot: string }
> = {
  quoted: {
    label: "Cotizado",
    color: "text-amber-700 dark:text-amber-300",
    bg: "bg-amber-100 dark:bg-amber-900/30 border-amber-300 dark:border-amber-700",
    dot: "bg-amber-500",
  },
  confirmed: {
    label: "Confirmado",
    color: "text-blue-700 dark:text-blue-300",
    bg: "bg-blue-100 dark:bg-blue-900/30 border-blue-300 dark:border-blue-700",
    dot: "bg-blue-500",
  },
  completed: {
    label: "Completado",
    color: "text-green-700 dark:text-green-300",
    bg: "bg-green-100 dark:bg-green-900/30 border-green-300 dark:border-green-700",
    dot: "bg-green-500",
  },
  cancelled: {
    label: "Cancelado",
    color: "text-red-700 dark:text-red-300",
    bg: "bg-red-100 dark:bg-red-900/30 border-red-300 dark:border-red-700",
    dot: "bg-red-500",
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

  const loadData = useCallback(async (eventId: string) => {
    try {
      setLoading(true);
      const [eventData, productsData, extrasData, paymentsData, equipmentData] =
        await Promise.all([
          eventService.getById(eventId),
          eventService.getProducts(eventId),
          eventService.getExtras(eventId),
          paymentService.getByEventId(eventId),
          eventService.getEquipment(eventId),
        ]);

      setEvent(eventData);
      setProducts(productsData || []);
      setExtras(extrasData || []);
      setPayments(paymentsData || []);
      setEquipment(equipmentData || []);

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
    } catch (error) {
      logError("Error loading summary", error);
    } finally {
      setLoading(false);
    }
  }, []);

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

  const aggregateProductIngredients = async (productIds: string[], productQuantities: Map<string, number>) => {
    try {
      const allProdIngredients = await productService.getIngredientsForProducts(productIds);
      const prodIngredients = allProdIngredients.filter((ing: any) => ing.type !== 'equipment');

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
  };

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
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-orange" aria-hidden="true"></div>
        <span className="sr-only">Cargando resumen del evento...</span>
      </div>
    );
  }

  if (!event) {
    return (
      <div className="flex justify-center items-center h-64" role="alert">
        <p className="text-gray-600 dark:text-gray-400">Evento no encontrado</p>
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

  let contractPreview = "";
  let contractPreviewMissingTokens: string[] = [];

  try {
    contractPreview = renderContractTemplate({
      event,
      profile: profile as any,
      template: profile?.contract_template,
      strict: true,
      products,
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
      <div className="flex flex-col md:flex-row justify-between items-center gap-6 print:hidden mb-8">
        <div className="flex flex-col sm:flex-row items-center gap-4 w-full md:w-auto">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="flex items-center text-text-secondary hover:text-text transition-colors shrink-0 mr-2"
            aria-label="Volver a la página anterior"
          >
            <ArrowLeft className="h-5 w-5 mr-1" aria-hidden="true" />
            <span className="font-medium">Volver</span>
          </button>

          <div className="flex bg-surface-alt dark:bg-surface-alt/50 rounded-2xl p-1.5 w-full sm:w-auto overflow-x-auto no-scrollbar shadow-sm" role="group" aria-label="Modos de visualización del evento">
            <button
              type="button"
              onClick={() => setViewMode("summary")}
              className={clsx(
                "px-4 py-2 rounded-xl text-sm font-bold flex items-center transition-all whitespace-nowrap",
                viewMode === "summary"
                  ? "bg-white dark:bg-gray-600 text-brand-orange shadow-sm"
                  : "text-text-secondary hover:text-text hover:bg-white/50 dark:hover:bg-gray-600/30"
              )}
              aria-pressed={viewMode === "summary"}
              aria-label="Ver resumen del evento"
            >
              <FileText className="h-4 w-4 mr-2" aria-hidden="true" />
              Resumen
            </button>
            <button
              type="button"
              onClick={() => setViewMode("payments")}
              className={clsx(
                "px-4 py-2 rounded-xl text-sm font-bold flex items-center transition-all whitespace-nowrap",
                viewMode === "payments"
                  ? "bg-white dark:bg-gray-600 text-brand-orange shadow-sm"
                  : "text-text-secondary hover:text-text hover:bg-white/50 dark:hover:bg-gray-600/30"
              )}
              aria-pressed={viewMode === "payments"}
              aria-label="Ver pagos del evento"
            >
              <DollarSign className="h-4 w-4 mr-2" aria-hidden="true" />
              Pagos
            </button>
            <button
              type="button"
              onClick={() => setViewMode("ingredients")}
              className={clsx(
                "px-4 py-2 rounded-xl text-sm font-bold flex items-center transition-all whitespace-nowrap",
                viewMode === "ingredients"
                  ? "bg-white dark:bg-gray-600 text-brand-orange shadow-sm"
                  : "text-text-secondary hover:text-text hover:bg-white/50 dark:hover:bg-gray-600/30"
              )}
              aria-pressed={viewMode === "ingredients"}
              aria-label="Ver lista de insumos"
            >
              <ShoppingCart className="h-4 w-4 mr-2" aria-hidden="true" />
              Compras
            </button>
            <button
              type="button"
              onClick={() => setViewMode("contract")}
              className={clsx(
                "px-4 py-2 rounded-xl text-sm font-bold flex items-center transition-all whitespace-nowrap",
                viewMode === "contract"
                  ? "bg-white dark:bg-gray-600 text-brand-orange shadow-sm"
                  : "text-text-secondary hover:text-text hover:bg-white/50 dark:hover:bg-gray-600/30"
              )}
              aria-pressed={viewMode === "contract"}
              aria-label="Ver contrato del evento"
            >
              <FileCheck className="h-4 w-4 mr-2" aria-hidden="true" />
              Contrato
            </button>
            <button
              type="button"
              onClick={() => setViewMode("photos")}
              className={clsx(
                "px-4 py-2 rounded-xl text-sm font-bold flex items-center transition-all whitespace-nowrap",
                viewMode === "photos"
                  ? "bg-white dark:bg-gray-600 text-brand-orange shadow-sm"
                  : "text-text-secondary hover:text-text hover:bg-white/50 dark:hover:bg-gray-600/30"
              )}
              aria-pressed={viewMode === "photos"}
              aria-label="Ver fotos del evento"
            >
              <Camera className="h-4 w-4 mr-2" aria-hidden="true" />
              Fotos
              {eventPhotos.length > 0 && (
                <span className="ml-1.5 bg-brand-orange/10 text-brand-orange text-xs font-bold rounded-full px-1.5 py-0.5">
                  {eventPhotos.length}
                </span>
              )}
            </button>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Edit Event Button - Primary */}
          <button
            type="button"
            onClick={() => navigate(`/events/${id}/edit`)}
            className="flex items-center px-4 py-2 bg-brand-orange text-white rounded-2xl hover:bg-brand-orange/90 text-sm font-bold shadow-md shadow-brand-orange/20 transition-all active:scale-95"
            aria-label="Editar este evento"
          >
            <Pencil className="h-4 w-4 mr-2" aria-hidden="true" />
            Editar
          </button>

          {/* Secondary Actions Dropdown */}
          <div className="relative" onClick={(e) => e.stopPropagation()}>
            <button
              type="button"
              onClick={() => setActionsDropdownOpen(!actionsDropdownOpen)}
              className="flex items-center px-4 py-2 bg-card border border-border rounded-2xl hover:bg-surface text-text text-sm font-bold shadow-sm transition-all"
              aria-label="Más acciones"
              aria-expanded={actionsDropdownOpen}
              aria-haspopup="menu"
            >
              <MoreVertical className="h-4 w-4 mr-2" aria-hidden="true" />
              Acciones
              <ChevronDown className={`ml-2 h-4 w-4 transition-transform ${actionsDropdownOpen ? "rotate-180" : ""}`} />
            </button>

            {actionsDropdownOpen && (
              <div className="absolute right-0 mt-1 w-56 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-lg z-50 overflow-hidden py-1" role="menu">
                <p className="px-4 py-2 text-xs font-semibold text-text-tertiary uppercase tracking-wider border-b border-border mb-1">
                  Exportar PDF
                </p>
                <button
                  type="button"
                  onClick={() => {
                    generateBudgetPDF(event, profile as any, products, extras);
                    setActionsDropdownOpen(false);
                  }}
                  className="w-full flex items-center px-4 py-2 text-sm text-text hover:bg-surface-alt dark:hover:bg-surface transition-colors"
                  role="menuitem"
                >
                  <Download className="h-4 w-4 mr-3 text-text-secondary" />
                  Presupuesto
                </button>
                <button
                  type="button"
                  onClick={() => {
                    generateInvoicePDF(event, profile as any, products, extras);
                    setActionsDropdownOpen(false);
                  }}
                  className="w-full flex items-center px-4 py-2 text-sm text-text hover:bg-surface-alt dark:hover:bg-surface transition-colors"
                  role="menuitem"
                >
                  <FileText className="h-4 w-4 mr-3 text-text-secondary" />
                  Generar Factura
                </button>
                <button
                  type="button"
                  onClick={() => {
                    generateShoppingListPDF(event, profile as any, ingredients);
                    setActionsDropdownOpen(false);
                  }}
                  className="w-full flex items-center px-4 py-2 text-sm text-text hover:bg-surface-alt dark:hover:bg-surface transition-colors"
                  role="menuitem"
                >
                  <ShoppingCart className="h-4 w-4 mr-3 text-text-secondary" />
                  Lista de Insumos
                </button>
                <button
                  type="button"
                  onClick={() => {
                    try {
                      generateContractPDF(event, profile as any, undefined, products);
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
                  className="w-full flex items-center px-4 py-2 text-sm text-text hover:bg-surface-alt dark:hover:bg-surface transition-colors"
                  role="menuitem"
                >
                  <FileCheck className="h-4 w-4 mr-3 text-text-secondary" />
                  Contrato
                </button>
                {viewMode === "payments" && payments.length > 0 && (
                  <button
                    type="button"
                    onClick={() => {
                      generatePaymentReportPDF(event, profile as any, payments);
                      setActionsDropdownOpen(false);
                    }}
                    className="w-full flex items-center px-4 py-2 text-sm text-text hover:bg-surface-alt dark:hover:bg-surface transition-colors"
                    role="menuitem"
                  >
                    <Download className="h-4 w-4 mr-3 text-text-secondary" />
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
                      className="w-full flex items-center px-4 py-2 text-sm text-text hover:bg-surface-alt dark:hover:bg-surface transition-colors"
                      role="menuitem"
                    >
                      <CreditCard className="h-4 w-4 mr-3 text-text-secondary" />
                      Pagar con Stripe
                    </button>
                  </>
                )}
                <div className="my-1 border-t border-border"></div>
                <button
                  type="button"
                  onClick={() => {
                    setConfirmDeleteOpen(true);
                    setActionsDropdownOpen(false);
                  }}
                  className="w-full flex items-center px-4 py-2 text-sm text-error hover:bg-error/10 transition-colors"
                  role="menuitem"
                >
                  <Trash2 className="h-4 w-4 mr-3" />
                  Eliminar Evento
                </button>
              </div>
            )}
          </div>
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
        />
      )}

      {viewMode === "summary" && (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="bg-card shadow-sm rounded-3xl p-6 sm:p-8 border border-border">
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 border-b border-border pb-6">
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
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
                  <div className="absolute right-0 mt-1 w-44 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg z-50 overflow-hidden" role="menu" aria-label="Cambiar estado del evento">
                    {ALL_STATUSES.map((s) => {
                      const cfg = STATUS_CONFIG[s];
                      return (
                        <button
                          key={s}
                          type="button"
                          onClick={() => handleStatusChange(s)}
                          className={`w-full flex items-center gap-2 px-3 py-2.5 text-sm text-left transition-colors hover:bg-gray-50 dark:hover:bg-gray-700 ${
                            s === currentStatus
                              ? "font-semibold " + cfg.color
                              : "text-gray-700 dark:text-gray-200"
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

            <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mt-8">
              <div className="space-y-1">
                <p className="text-xs font-bold text-text-tertiary uppercase tracking-wider">Fecha</p>
                <p className="font-bold text-text">{new Date(event.event_date).toLocaleDateString()}</p>
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
                    <Building className="h-3.5 w-3.5 text-brand-orange" />
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
                <ShoppingCart className="h-5 w-5 text-brand-orange" />
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
                  {products.map((p, i) => (
                    <tr key={i} className="group hover:bg-surface-alt/50 transition-colors">
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
                <Zap className="h-5 w-5 text-brand-orange" />
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
                  {extras.map((e, i) => (
                    <tr key={i} className="hover:bg-surface-alt/50 transition-colors">
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

          {/* Equipment section */}
          {equipment.length > 0 && (
            <div className="bg-card shadow-sm rounded-3xl p-6 sm:p-8 border border-border mt-8">
              <h2 className="text-lg font-bold mb-6 flex items-center gap-2 text-text">
                <Wrench className="h-5 w-5 text-brand-orange" />
                Equipo Asignado
              </h2>
              <div className="space-y-3">
                {equipment.map((eq: any, i: number) => (
                  <div key={i} className="flex items-center justify-between py-3 border-b border-border last:border-0">
                    <div>
                      <span className="font-bold text-text">{eq.equipment_name || 'Equipo'}</span>
                      <span className="text-text-secondary ml-2">x{eq.quantity}</span>
                      {eq.notes && (
                        <p className="text-xs text-text-tertiary mt-0.5">{eq.notes}</p>
                      )}
                    </div>
                    <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400">
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
                <DollarSign className="h-32 w-32 text-brand-orange" />
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
                  <p className="text-2xl font-black text-brand-orange">${totalCharged.toFixed(2)}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-[10px] font-black text-text-tertiary uppercase tracking-tighter">Utilidad Neta</p>
                  <p className="text-2xl font-black text-emerald-500">${profit.toFixed(2)}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-[10px] font-black text-text-tertiary uppercase tracking-tighter">Margen</p>
                  <p className="text-2xl font-black text-blue-500">{margin.toFixed(1)}%</p>
                </div>
                <div className="space-y-1">
                  <p className="text-[10px] font-black text-text-tertiary uppercase tracking-tighter">Costos</p>
                  <p className="text-2xl font-black text-red-500">${totalCost.toFixed(2)}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-[10px] font-black text-text-tertiary uppercase tracking-tighter">Pagado</p>
                  <p className="text-2xl font-black text-emerald-600">${totalPaid.toFixed(2)}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-[10px] font-black text-text-tertiary uppercase tracking-tighter">Pendiente</p>
                  <p className={clsx("text-2xl font-black", remainingValue > 0 ? "text-red-600" : "text-text")}>
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
                  <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3 overflow-hidden">
                    <div
                      className={clsx(
                        "h-full rounded-full transition-all duration-500",
                        totalPaid >= totalCharged ? "bg-emerald-500" : "bg-brand-orange"
                      )}
                      style={{ width: `${Math.min(100, (totalPaid / totalCharged) * 100)}%` }}
                    />
                  </div>
                  <div className="flex items-center justify-between mt-2 text-xs text-text-secondary">
                    <span>Cobrado: ${totalPaid.toFixed(2)}</span>
                    <span>Total: ${totalCharged.toFixed(2)}</span>
                  </div>
                  {remainingValue > 0 && currentStatus !== "cancelled" && (
                    <button
                      type="button"
                      onClick={() => setViewMode("payments")}
                      className="mt-3 flex items-center gap-2 px-4 py-2 bg-brand-orange/10 text-brand-orange rounded-xl text-sm font-bold hover:bg-brand-orange/20 transition-colors"
                    >
                      <DollarSign className="h-4 w-4" />
                      Registrar pago por ${remainingValue.toFixed(2)}
                    </button>
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
              <ShoppingCart className="h-4 w-4 text-brand-orange" />
              {event.service_type} • {new Date(event.event_date).toLocaleDateString()}
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
                {ingredients.map((ing, i) => {
                  const needsMore = ing.quantity > (ing.currentStock || 0);
                  return (
                    <tr key={i} className="hover:bg-surface-alt/50 transition-colors">
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
                            ? "bg-red-500/10 text-red-500 border border-red-500/20" 
                            : "bg-green-500/10 text-green-500 border border-green-500/20"
                        )}>
                          {(ing.currentStock || 0).toFixed(2)}
                        </span>
                      </td>
                      <td className="py-3 text-right">
                        {needsMore ? (
                          <Link 
                            to="/inventory" 
                            className="text-brand-orange hover:text-orange-600 font-bold text-xs underline decoration-dotted"
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
                      className="py-4 text-center text-gray-500 dark:text-gray-400 italic"
                    >
                      No hay insumos calculados para los productos
                      seleccionados.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {viewMode === "contract" && (
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="bg-card shadow-xl rounded-[40px] p-12 sm:p-20 border border-border font-serif text-text leading-relaxed max-w-4xl mx-auto relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-2 bg-brand-orange"></div>
            <div className="text-center mb-16">
              <h1 className="text-3xl font-black uppercase tracking-[0.2em] text-text">
                Contrato de Servicios
              </h1>
              <div className="w-24 h-1 bg-brand-orange mx-auto mt-4"></div>
            </div>

          {contractPreviewMissingTokens.length > 0 ? (
            <div className="space-y-4 text-center">
              <p className="text-red-600 dark:text-red-400 font-semibold">
                Faltan datos para renderizar el contrato.
              </p>
              <p className="text-sm text-text-secondary">
                Completa estos campos en el evento o cliente: {contractPreviewMissingTokens.map((token) => `[${token}]`).join(", ")}
              </p>
            </div>
          ) : (
            <div className="space-y-4 text-justify whitespace-pre-line">
              {contractPreview.split(/\n\n+/).map((paragraph, index) => (
                <p key={index}>{renderFormattedReact(paragraph)}</p>
              ))}
            </div>
          )}

          <div className="grid grid-cols-2 gap-16 mt-24 pt-12">
            <div className="text-center border-t border-gray-400 dark:border-gray-500 pt-4">
              <p className="font-bold">
                {profile?.business_name || profile?.name || "EL PROVEEDOR"}
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                Firma
              </p>
            </div>
            <div className="text-center border-t border-gray-400 dark:border-gray-500 pt-4">
              <p className="font-bold">{event.client?.name}</p>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
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
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-xl text-white bg-brand-orange hover:bg-orange-600 shadow-sm transition-colors disabled:opacity-50"
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
                    className="absolute top-2 right-2 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600"
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
            className="absolute top-4 right-4 text-white hover:text-gray-300 transition-colors"
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

      <div className="mt-12 text-center text-xs text-gray-400 dark:text-gray-400 print:mt-12">
        <p>
          Generado por {profile?.business_name || "EventosApp"} -{" "}
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
