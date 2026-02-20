import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { eventService } from "../../services/eventService";
import { productService } from "../../services/productService";
import { paymentService } from "../../services/paymentService";
import {
  ArrowLeft,
  FileText,
  ShoppingCart,
  FileCheck,
  Download,
  DollarSign,
  Pencil,
  ChevronDown,
} from "lucide-react";
import { useAuth } from "../../contexts/AuthContext";
import {
  generateBudgetPDF,
  generateContractPDF,
  generateShoppingListPDF,
} from "../../lib/pdfGenerator";
import { logError } from "../../lib/errorHandler";
import {
  getEventNetSales,
  getEventTaxAmount,
  getEventTotalCharged,
} from "../../lib/finance";
import { Payments } from "./components/Payments";

type ViewMode = "summary" | "ingredients" | "contract" | "payments";

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
  const [ingredients, setIngredients] = useState<any[]>([]);
  const [payments, setPayments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<ViewMode>("summary");
  const [statusDropdownOpen, setStatusDropdownOpen] = useState(false);
  const [updatingStatus, setUpdatingStatus] = useState(false);

  useEffect(() => {
    if (id) {
      loadData(id);
    }
  }, [id]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = () => setStatusDropdownOpen(false);
    if (statusDropdownOpen) {
      document.addEventListener("click", handleClickOutside);
    }
    return () => document.removeEventListener("click", handleClickOutside);
  }, [statusDropdownOpen]);

  const loadData = async (eventId: string) => {
    try {
      setLoading(true);
      const [eventData, productsData, extrasData, paymentsData] =
        await Promise.all([
          eventService.getById(eventId),
          eventService.getProducts(eventId),
          eventService.getExtras(eventId),
          paymentService.getByEventId(eventId),
        ]);

      setEvent(eventData);
      setProducts(productsData || []);
      setExtras(extrasData || []);
      setPayments(paymentsData || []);

      // Calculate aggregated ingredients
      const aggregatedIngredients: any = {};
      const productQuantities = new Map<string, number>();
      (productsData || []).forEach((p: any) => {
        productQuantities.set(p.product_id, p.quantity || 0);
      });

      const productIds = Array.from(productQuantities.keys());
      const prodIngredients =
        await productService.getIngredientsForProducts(productIds);

      prodIngredients.forEach((ing: any) => {
        const key = ing.inventory_id;
        const quantity = productQuantities.get(ing.product_id) || 0;
        const ingredientName =
          ing.ingredient_name || ing.inventory?.ingredient_name;
        const unit = ing.unit || ing.inventory?.unit;
        const unitCost = ing.unit_cost ?? ing.inventory?.unit_cost ?? 0;

        if (!aggregatedIngredients[key]) {
          aggregatedIngredients[key] = {
            name: ingredientName,
            unit,
            quantity: 0,
            cost: 0,
          };
        }
        aggregatedIngredients[key].quantity += ing.quantity_required * quantity;
        aggregatedIngredients[key].cost +=
          ing.quantity_required * quantity * unitCost;
      });

      setIngredients(Object.values(aggregatedIngredients));
    } catch (error) {
      logError("Error loading summary", error);
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (newStatus: EventStatus) => {
    if (!id || !event || newStatus === event.status) return;
    try {
      setUpdatingStatus(true);
      await eventService.update(id, { status: newStatus });
      setEvent((prev: any) => ({ ...prev, status: newStatus }));
    } catch (error) {
      logError("Error updating status", error);
    } finally {
      setUpdatingStatus(false);
      setStatusDropdownOpen(false);
    }
  };

  if (loading) return <div>Cargando resumen...</div>;
  if (!event) return <div>Evento no encontrado</div>;

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

  const timeRange =
    event.start_time || event.end_time
      ? `${event.start_time || ""}${event.start_time && event.end_time ? " - " : ""}${event.end_time || ""}`
      : "";

  const currentStatus = (event.status || "quoted") as EventStatus;
  const statusCfg = STATUS_CONFIG[currentStatus] || STATUS_CONFIG.quoted;

  return (
    <div className="space-y-6 max-w-4xl mx-auto p-8 bg-white dark:bg-gray-800 shadow-lg my-8 print:shadow-none print:my-0 print:max-w-none print:p-0 transition-colors">
      <div className="flex flex-col md:flex-row justify-between items-center gap-4 print:hidden mb-6">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white"
          >
            <ArrowLeft className="h-4 w-4 mr-2" /> Volver
          </button>

          <div className="flex bg-gray-100 dark:bg-gray-700 rounded-lg p-1 overflow-x-auto max-w-[250px] sm:max-w-none">
            <button
              onClick={() => setViewMode("summary")}
              className={`px-3 py-1.5 rounded-md text-sm font-medium flex items-center transition-colors whitespace-nowrap ${
                viewMode === "summary"
                  ? "bg-white dark:bg-gray-600 text-brand-orange shadow-sm"
                  : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
              }`}
            >
              <FileText className="h-4 w-4 mr-2" />
              Resumen
            </button>
            <button
              onClick={() => setViewMode("payments")}
              className={`px-3 py-1.5 rounded-md text-sm font-medium flex items-center transition-colors whitespace-nowrap ${
                viewMode === "payments"
                  ? "bg-white dark:bg-gray-600 text-brand-orange shadow-sm"
                  : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
              }`}
            >
              <DollarSign className="h-4 w-4 mr-2" />
              Pagos
            </button>
            <button
              onClick={() => setViewMode("ingredients")}
              className={`px-3 py-1.5 rounded-md text-sm font-medium flex items-center transition-colors whitespace-nowrap ${
                viewMode === "ingredients"
                  ? "bg-white dark:bg-gray-600 text-brand-orange shadow-sm"
                  : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
              }`}
            >
              <ShoppingCart className="h-4 w-4 mr-2" />
              Compras
            </button>
            <button
              onClick={() => setViewMode("contract")}
              className={`px-3 py-1.5 rounded-md text-sm font-medium flex items-center transition-colors whitespace-nowrap ${
                viewMode === "contract"
                  ? "bg-white dark:bg-gray-600 text-brand-orange shadow-sm"
                  : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
              }`}
            >
              <FileCheck className="h-4 w-4 mr-2" />
              Contrato
            </button>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Edit Event Button */}
          <button
            onClick={() => navigate(`/events/${id}/edit`)}
            className="flex items-center px-3 py-2 bg-brand-orange text-white rounded hover:bg-orange-600 text-sm font-medium shadow-sm transition-colors"
            title="Editar Evento"
          >
            <Pencil className="h-4 w-4 mr-2" />
            Editar
          </button>

          {viewMode === "summary" && (
            <button
              onClick={() =>
                generateBudgetPDF(event, profile, products, extras)
              }
              className="flex items-center px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded hover:bg-gray-50 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 text-sm font-medium shadow-sm transition-colors"
              title="Descargar Presupuesto en PDF"
            >
              <Download className="h-4 w-4 mr-2" />
              Presupuesto
            </button>
          )}

          {viewMode === "ingredients" && (
            <button
              onClick={() =>
                generateShoppingListPDF(event, profile, ingredients)
              }
              className="flex items-center px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded hover:bg-gray-50 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 text-sm font-medium shadow-sm transition-colors"
              title="Descargar Lista de Compras en PDF"
            >
              <ShoppingCart className="h-4 w-4 mr-2" />
              Lista de Compras
            </button>
          )}

          {viewMode === "contract" && (
            <button
              onClick={() => generateContractPDF(event, profile as any)}
              className="flex items-center px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded hover:bg-gray-50 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 text-sm font-medium shadow-sm transition-colors"
              title="Descargar Contrato en PDF"
            >
              <FileCheck className="h-4 w-4 mr-2" />
              Contrato
            </button>
          )}
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
        <div className="space-y-8">
          <div className="border-b dark:border-gray-700 pb-6">
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                {event.clients?.name} - {event.service_type}
              </h1>

              {/* Status Badge + Dropdown */}
              <div
                className="relative flex-shrink-0"
                onClick={(e) => e.stopPropagation()}
              >
                <button
                  onClick={() => setStatusDropdownOpen((prev) => !prev)}
                  disabled={updatingStatus}
                  className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full border text-sm font-semibold transition-all ${statusCfg.bg} ${statusCfg.color} ${updatingStatus ? "opacity-60 cursor-not-allowed" : "hover:opacity-80 cursor-pointer"}`}
                >
                  <span
                    className={`w-2 h-2 rounded-full flex-shrink-0 ${statusCfg.dot}`}
                  />
                  {statusCfg.label}
                  <ChevronDown
                    className={`h-3.5 w-3.5 transition-transform ${statusDropdownOpen ? "rotate-180" : ""}`}
                  />
                </button>

                {statusDropdownOpen && (
                  <div className="absolute right-0 mt-1 w-44 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg z-50 overflow-hidden">
                    {ALL_STATUSES.map((s) => {
                      const cfg = STATUS_CONFIG[s];
                      return (
                        <button
                          key={s}
                          onClick={() => handleStatusChange(s)}
                          className={`w-full flex items-center gap-2 px-3 py-2.5 text-sm text-left transition-colors hover:bg-gray-50 dark:hover:bg-gray-700 ${
                            s === currentStatus
                              ? "font-semibold " + cfg.color
                              : "text-gray-700 dark:text-gray-200"
                          }`}
                        >
                          <span
                            className={`w-2 h-2 rounded-full flex-shrink-0 ${cfg.dot}`}
                          />
                          {cfg.label}
                          {s === currentStatus && (
                            <span className="ml-auto text-xs opacity-60">
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

            <div className="grid grid-cols-2 gap-4 mt-4 text-sm text-gray-600 dark:text-gray-300">
              <div>
                <p>
                  <span className="font-semibold">Fecha:</span>{" "}
                  {new Date(event.event_date).toLocaleDateString()}
                </p>
                {timeRange && (
                  <p>
                    <span className="font-semibold">Horario:</span> {timeRange}
                  </p>
                )}
                <p>
                  <span className="font-semibold">Personas:</span>{" "}
                  {event.num_people}
                </p>
                {event.location && (
                  <p>
                    <span className="font-semibold">Ubicación:</span>{" "}
                    {event.location}
                  </p>
                )}
              </div>
              <div className="text-right">
                <p>
                  <span className="font-semibold">Cliente:</span>{" "}
                  {event.clients?.name}
                </p>
                <p>
                  <span className="font-semibold">Factura:</span>{" "}
                  {event.requires_invoice
                    ? `Sí (IVA ${event.tax_rate || 16}%)`
                    : "No"}
                </p>
                <p>
                  <span className="font-semibold">Teléfono:</span>{" "}
                  {event.clients?.phone}
                </p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div>
              <h2 className="text-lg font-bold mb-4 border-b dark:border-gray-700 pb-2 text-gray-900 dark:text-white">
                Productos
              </h2>
              <table className="w-full text-sm text-gray-600 dark:text-gray-300">
                <thead>
                  <tr className="text-left text-gray-500 dark:text-gray-400">
                    <th className="pb-2">Producto</th>
                    <th className="pb-2 text-right">Cant.</th>
                    <th className="pb-2 text-right">Precio Unit.</th>
                    <th className="pb-2 text-right">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y dark:divide-gray-700">
                  {products.map((p, i) => (
                    <tr key={i}>
                      <td className="py-2">{p.products?.name}</td>
                      <td className="py-2 text-right">{p.quantity}</td>
                      <td className="py-2 text-right">
                        ${p.unit_price.toFixed(2)}
                      </td>
                      <td className="py-2 text-right">
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

            <div>
              <h2 className="text-lg font-bold mb-4 border-b dark:border-gray-700 pb-2 text-gray-900 dark:text-white">
                Extras
              </h2>
              <table className="w-full text-sm text-gray-600 dark:text-gray-300">
                <thead>
                  <tr className="text-left text-gray-500 dark:text-gray-400">
                    <th className="pb-2">Descripción</th>
                    <th className="pb-2 text-right">Precio</th>
                  </tr>
                </thead>
                <tbody className="divide-y dark:divide-gray-700">
                  {extras.map((e, i) => (
                    <tr key={i}>
                      <td className="py-2">{e.description}</td>
                      <td className="py-2 text-right">${e.price.toFixed(2)}</td>
                    </tr>
                  ))}
                  {extras.length === 0 && (
                    <tr>
                      <td
                        colSpan={2}
                        className="py-2 text-gray-500 dark:text-gray-400 italic"
                      >
                        Sin extras
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div className="mt-8 border-t dark:border-gray-700 pt-6 print:hidden">
            <h2 className="text-lg font-bold mb-4 text-gray-900 dark:text-white">
              Resumen Financiero (Interno)
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 bg-gray-100 dark:bg-gray-700 p-4 rounded">
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Venta (sin IVA)
                </p>
                <p className="text-xl font-bold text-gray-900 dark:text-white">
                  ${netSales.toFixed(2)}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400">IVA</p>
                <p className="text-xl font-bold text-gray-900 dark:text-white">
                  ${taxAmount.toFixed(2)}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Total cobrado {event.requires_invoice ? "(con IVA)" : ""}
                </p>
                <p className="text-xl font-bold text-gray-900 dark:text-white">
                  ${totalCharged.toFixed(2)}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Total Pagado
                </p>
                <p className="text-xl font-bold text-emerald-600 dark:text-emerald-400">
                  ${totalPaid.toFixed(2)}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Faltante por Pagar
                </p>
                <p
                  className={`text-xl font-bold ${remainingValue > 0 ? "text-orange-600 dark:text-orange-400" : "text-gray-900 dark:text-white"}`}
                >
                  ${remainingValue.toFixed(2)}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Costos Totales
                </p>
                <p className="text-xl font-bold text-red-600 dark:text-red-400">
                  ${totalCost.toFixed(2)}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Utilidad
                </p>
                <p className="text-xl font-bold text-green-600 dark:text-green-400">
                  ${profit.toFixed(2)}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Margen
                </p>
                <p className="text-xl font-bold text-blue-600 dark:text-blue-400">
                  {margin.toFixed(1)}%
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {viewMode === "ingredients" && (
        <div className="space-y-6">
          <div className="border-b dark:border-gray-700 pb-4">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              Lista de Compras e Ingredientes
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-2">
              Evento: {event.service_type} -{" "}
              {new Date(event.event_date).toLocaleDateString()}
            </p>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-gray-500 dark:text-gray-400 border-b dark:border-gray-700">
                  <th className="pb-3 pt-2">Ingrediente</th>
                  <th className="pb-3 pt-2 text-right">Cantidad Necesaria</th>
                  <th className="pb-3 pt-2 text-right">Unidad</th>
                </tr>
              </thead>
              <tbody className="divide-y dark:divide-gray-700">
                {ingredients.map((ing, i) => (
                  <tr key={i}>
                    <td className="py-3 font-medium text-gray-900 dark:text-white">
                      {ing.name}
                    </td>
                    <td className="py-3 text-right text-gray-900 dark:text-white font-bold">
                      {ing.quantity.toFixed(2)}
                    </td>
                    <td className="py-3 text-right text-gray-500 dark:text-gray-400">
                      {ing.unit}
                    </td>
                  </tr>
                ))}
                {ingredients.length === 0 && (
                  <tr>
                    <td
                      colSpan={3}
                      className="py-4 text-center text-gray-500 dark:text-gray-400 italic"
                    >
                      No hay ingredientes calculados para los productos
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
        <div className="space-y-8 font-serif text-gray-800 dark:text-gray-200 leading-relaxed max-w-3xl mx-auto">
          <div className="text-center mb-12">
            <h1 className="text-2xl font-bold uppercase tracking-widest border-b-2 border-gray-900 dark:border-gray-100 pb-2 inline-block">
              Contrato de Servicios
            </h1>
          </div>

          <div className="space-y-4 text-justify">
            <p>
              En la ciudad de{" "}
              <strong>{event.city || "___________________"}</strong>, a los{" "}
              {new Date().getDate()} días del mes de{" "}
              {new Date().toLocaleString("es-ES", { month: "long" })} de{" "}
              {new Date().getFullYear()}, comparecen por una parte{" "}
              <strong>
                {profile?.business_name || profile?.name || user?.email}
              </strong>{" "}
              (en adelante "EL PROVEEDOR"), y por la otra parte{" "}
              <strong>{event.clients?.name}</strong> (en adelante "EL CLIENTE"),
              quienes convienen en celebrar el presente Contrato de Prestación
              de Servicios, sujeto a las siguientes cláusulas:
            </p>

            <h3 className="font-bold text-lg mt-6">PRIMERA: OBJETO</h3>
            <p>
              EL PROVEEDOR se compromete a prestar los servicios de{" "}
              <strong>{event.service_type}</strong> para el evento que se
              llevará a cabo el día{" "}
              <strong>{new Date(event.event_date).toLocaleDateString()}</strong>
              .
            </p>

            <h3 className="font-bold text-lg mt-6">
              SEGUNDA: DETALLES DEL EVENTO
            </h3>
            <ul className="list-disc pl-6 space-y-1">
              <li>
                <strong>Fecha:</strong>{" "}
                {new Date(event.event_date).toLocaleDateString()}
              </li>
              {timeRange && (
                <li>
                  <strong>Horario:</strong> {timeRange}
                </li>
              )}
              <li>
                <strong>Cantidad de Personas:</strong> {event.num_people}
              </li>
              <li>
                <strong>Ubicación:</strong>{" "}
                {event.location || event.clients?.address || "A definir"}
              </li>
              <li>
                <strong>Factura:</strong>{" "}
                {event.requires_invoice
                  ? `Sí (IVA ${event.tax_rate || 16}%)`
                  : "No"}
              </li>
            </ul>

            <h3 className="font-bold text-lg mt-6">
              TERCERA: PRODUCTOS Y SERVICIOS
            </h3>
            <p>El servicio incluye lo siguiente:</p>
            <ul className="list-disc pl-6 space-y-1">
              {products.map((p, i) => (
                <li key={i}>
                  {p.quantity}x {p.products?.name}
                </li>
              ))}
              {extras.map((e, i) => (
                <li key={`e-${i}`}>{e.description}</li>
              ))}
            </ul>

            <h3 className="font-bold text-lg mt-6">
              CUARTA: COSTO Y FORMA DE PAGO
            </h3>
            <p>
              El costo total del servicio es de{" "}
              <strong>${event.total_amount.toFixed(2)}</strong>.
            </p>
            <p>
              EL CLIENTE se compromete a realizar un anticipo del{" "}
              <strong>{event.deposit_percent ?? 50}%</strong> para reservar la
              fecha, y liquidar el saldo restante antes del inicio del evento.
            </p>

            <h3 className="font-bold text-lg mt-6">QUINTA: CANCELACIONES</h3>
            <p>
              En caso de cancelación por parte de EL CLIENTE con menos de{" "}
              <strong>{event.cancellation_days ?? 15}</strong> días de
              anticipación, el anticipo no será reembolsado.
            </p>
            {event.refund_percent > 0 && (
              <p>
                Si la cancelación se realiza con la debida anticipación, se
                reembolsará el <strong>{event.refund_percent}%</strong> del
                anticipo entregado.
              </p>
            )}
          </div>

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
              <p className="font-bold">{event.clients?.name}</p>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                Firma de EL CLIENTE
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="mt-12 text-center text-xs text-gray-400 dark:text-gray-500 print:mt-12">
        <p>
          Generado por {profile?.business_name || "EventosApp"} -{" "}
          {new Date().toLocaleString()}
        </p>
      </div>
    </div>
  );
};
