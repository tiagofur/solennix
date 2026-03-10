import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useForm, FormProvider } from "react-hook-form";
import {
  FileDown,
  ArrowRight,
  ChevronDown,
  ChevronUp,
  Users,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { productService } from "@/services/productService";
import { logError } from "@/lib/errorHandler";
import { generateBudgetPDF } from "@/lib/pdfGenerator";
import { EventProducts } from "@/pages/Events/components/EventProducts";
import { EventExtras } from "@/pages/Events/components/EventExtras";

interface Product {
  id: string;
  name: string;
  category: string;
  base_price: number;
}

interface SelectedProduct {
  product_id: string;
  quantity: number;
  price: number;
  discount: number;
}

interface SelectedExtra {
  description: string;
  cost: number;
  price: number;
  exclude_utility: boolean;
}

export const QuickQuotePage: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  // Minimal form for EventProducts compatibility (uses watch('num_people'))
  const methods = useForm({ defaultValues: { num_people: 100 } });

  // Data
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Items
  const [selectedProducts, setSelectedProducts] = useState<SelectedProduct[]>(
    [],
  );
  const [extras, setExtras] = useState<SelectedExtra[]>([]);
  const [productUnitCosts, setProductUnitCosts] = useState<
    Record<string, number>
  >({});

  // Financials
  const [discountType, setDiscountType] = useState<"percent" | "fixed">(
    "percent",
  );
  const [discountValue, setDiscountValue] = useState(0);
  const [requiresInvoice, setRequiresInvoice] = useState(false);
  const [taxRate] = useState(16);

  // Optional client info
  const [clientName, setClientName] = useState("");
  const [clientPhone, setClientPhone] = useState("");
  const [clientEmail, setClientEmail] = useState("");
  const [showClientInfo, setShowClientInfo] = useState(false);

  // Load products
  useEffect(() => {
    const load = async () => {
      try {
        const data = await productService.getAll();
        setProducts(data.filter((p: any) => p.is_active !== false));
      } catch (err) {
        logError("Error loading products", err);
      } finally {
        setIsLoading(false);
      }
    };
    load();
  }, []);

  // Fetch product unit costs when products change
  useEffect(() => {
    const fetchMissingCosts = async () => {
      const missing = selectedProducts
        .filter(
          (p) => p.product_id && productUnitCosts[p.product_id] === undefined,
        )
        .map((p) => p.product_id);

      if (missing.length === 0) return;

      try {
        const costs = await Promise.all(
          missing.map(async (productId) => {
            const ingredients = await productService.getIngredients(productId);
            const cost =
              ingredients
                ?.filter((ing: any) => ing.type === "ingredient")
                .reduce((sum: number, ing: any) => {
                  const unitCost = ing.unit_cost ?? 0;
                  return sum + ing.quantity_required * unitCost;
                }, 0) || 0;
            return { productId, cost };
          }),
        );

        setProductUnitCosts((prev) => {
          const next = { ...prev };
          costs.forEach(({ productId, cost }) => {
            next[productId] = cost;
          });
          return next;
        });
      } catch (err) {
        logError("Error fetching ingredient costs", err);
      }
    };

    fetchMissingCosts();
  }, [selectedProducts, productUnitCosts]);

  // Financial calculations (same logic as EventForm)
  const financials = useMemo(() => {
    const productsSubtotal = selectedProducts.reduce(
      (sum, item) => sum + (item.price - (item.discount || 0)) * item.quantity,
      0,
    );

    const normalExtrasTotal = extras
      .filter((e) => !e.exclude_utility)
      .reduce((sum, item) => sum + item.price, 0);

    const passThroughExtrasTotal = extras
      .filter((e) => e.exclude_utility)
      .reduce((sum, item) => sum + item.price, 0);

    const extrasTotal = extras.reduce((sum, item) => sum + item.price, 0);

    const discountableBase = productsSubtotal + normalExtrasTotal;
    const discountAmount =
      discountType === "percent"
        ? Math.round(discountableBase * (discountValue / 100) * 100) / 100
        : Math.min(discountValue, discountableBase);
    const discountedBase =
      Math.round((discountableBase - discountAmount) * 100) / 100;

    const baseTotal =
      Math.round((discountedBase + passThroughExtrasTotal) * 100) / 100;
    const taxAmount = requiresInvoice
      ? Math.round(baseTotal * (taxRate / 100) * 100) / 100
      : 0;
    const total = Math.round((baseTotal + taxAmount) * 100) / 100;

    // Costs
    const productCost = selectedProducts.reduce(
      (sum, p) => sum + (productUnitCosts[p.product_id] || 0) * p.quantity,
      0,
    );
    const extrasCost = extras.reduce((sum, e) => sum + e.cost, 0);
    const totalCost = productCost + extrasCost;

    const revenue = total - (requiresInvoice ? taxAmount : 0);
    const profit = revenue - totalCost;
    const passThroughRevenue = extras
      .filter((e) => e.exclude_utility)
      .reduce((sum, e) => sum + e.price, 0);
    const adjustedRevenue = revenue - passThroughRevenue;
    const margin = adjustedRevenue > 0 ? (profit / adjustedRevenue) * 100 : 0;

    return {
      productsSubtotal,
      extrasTotal,
      discountAmount,
      taxAmount,
      total,
      productCost,
      extrasCost,
      totalCost,
      profit,
      margin,
    };
  }, [
    selectedProducts,
    extras,
    discountValue,
    discountType,
    requiresInvoice,
    taxRate,
    productUnitCosts,
  ]);

  const hasItems = selectedProducts.length > 0 || extras.length > 0;

  // Handlers
  const handleAddProduct = () => {
    if (products.length > 0) {
      const product = products[0];
      setSelectedProducts((prev) => [
        ...prev,
        {
          product_id: product.id,
          quantity: 1,
          price: product.base_price,
          discount: 0,
        },
      ]);
    }
  };

  const handleRemoveProduct = (index: number) => {
    setSelectedProducts((prev) => prev.filter((_, i) => i !== index));
  };

  const handleProductChange = (index: number, field: string, value: any) => {
    setSelectedProducts((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: value };
      if (field === "product_id") {
        const product = products.find((p) => p.id === value);
        if (product) {
          next[index].price = product.base_price;
          next[index].discount = 0;
        }
      }
      return next;
    });
  };

  const handleAddExtra = () => {
    setExtras((prev) => [
      ...prev,
      { description: "", cost: 0, price: 0, exclude_utility: false },
    ]);
  };

  const handleRemoveExtra = (index: number) => {
    setExtras((prev) => prev.filter((_, i) => i !== index));
  };

  const handleExtraChange = (index: number, field: string, value: any) => {
    setExtras((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: value };
      if (field === "exclude_utility" && value === true) {
        next[index].price = next[index].cost;
      }
      if (field === "cost" && next[index].exclude_utility) {
        next[index].price = Number(value);
      }
      return next;
    });
  };

  const handleExportPDF = () => {
    const today = new Date().toISOString().split("T")[0];
    const mockEvent = {
      id: "quick-quote",
      user_id: user?.id || "",
      client_id: "",
      event_date: today,
      start_time: null,
      end_time: null,
      service_type: "Cotización Rápida",
      num_people: methods.getValues("num_people") || 1,
      status: "quoted" as const,
      discount: discountValue,
      discount_type: discountType,
      requires_invoice: requiresInvoice,
      tax_rate: taxRate,
      tax_amount: financials.taxAmount,
      total_amount: financials.total,
      location: null,
      city: null,
      deposit_percent: null,
      cancellation_days: null,
      refund_percent: null,
      notes: null,
      photos: null,
      created_at: today,
      updated_at: today,
      client: clientName
        ? {
            id: "",
            user_id: "",
            name: clientName,
            phone: clientPhone,
            email: clientEmail || null,
            address: null,
            city: null,
            notes: null,
            total_events: 0,
            total_spent: 0,
            created_at: today,
            updated_at: today,
          }
        : null,
    };

    const productItems = selectedProducts.map((sp) => ({
      ...sp,
      id: "",
      event_id: "",
      products: {
        name: products.find((p) => p.id === sp.product_id)?.name || "Producto",
      },
    }));

    const extraItems = extras.map((e) => ({
      ...e,
      id: "",
      event_id: "",
    }));

    generateBudgetPDF(
      mockEvent as any,
      user as any,
      productItems as any,
      extraItems as any,
    );
  };

  const handleConvertToEvent = () => {
    navigate("/events/new", {
      state: {
        fromQuickQuote: true,
        selectedProducts,
        extras,
        discountType,
        discountValue,
        requiresInvoice,
        numPeople: methods.getValues("num_people"),
      },
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <FormProvider {...methods}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-bold text-text">Cotización Rápida</h1>
            <p className="text-sm text-text-secondary mt-1">
              Arma una cotización sin registrar cliente ni fecha
            </p>
          </div>
          <div className="flex flex-wrap gap-2 sm:justify-end">
            <button
              type="button"
              onClick={handleExportPDF}
              disabled={!hasItems}
              className="inline-flex items-center px-4 py-2 border border-border shadow-xs text-sm font-medium rounded-xl text-text-secondary bg-card hover:bg-surface-alt transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <FileDown className="h-4 w-4 mr-2" />
              Exportar PDF
            </button>
            <button
              type="button"
              onClick={handleConvertToEvent}
              disabled={!hasItems}
              className="inline-flex items-center px-4 py-2 border border-transparent shadow-xs text-sm font-medium rounded-xl text-white bg-primary hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ArrowRight className="h-4 w-4 mr-2" />
              Convertir a Evento
            </button>
          </div>
        </div>

        {/* Optional client info */}
        <div className="mb-6">
          <button
            type="button"
            onClick={() => setShowClientInfo(!showClientInfo)}
            className="flex items-center gap-2 text-sm text-text-secondary hover:text-text transition-colors"
          >
            {showClientInfo ? (
              <ChevronUp className="h-4 w-4" />
            ) : (
              <ChevronDown className="h-4 w-4" />
            )}
            Datos del cliente (opcional, para el PDF)
          </button>
          {showClientInfo && (
            <div className="mt-3 grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label
                  htmlFor="client-name"
                  className="block text-xs text-text-secondary mb-1"
                >
                  Nombre
                </label>
                <input
                  id="client-name"
                  type="text"
                  value={clientName}
                  onChange={(e) => setClientName(e.target.value)}
                  placeholder="Nombre del cliente"
                  className="block w-full text-sm border-border rounded-xl shadow-xs transition-shadow focus:ring-2 focus:ring-primary/20 p-2 bg-card text-text border"
                />
              </div>
              <div>
                <label
                  htmlFor="client-phone"
                  className="block text-xs text-text-secondary mb-1"
                >
                  Teléfono
                </label>
                <input
                  id="client-phone"
                  type="tel"
                  value={clientPhone}
                  onChange={(e) => setClientPhone(e.target.value)}
                  placeholder="Teléfono"
                  className="block w-full text-sm border-border rounded-xl shadow-xs transition-shadow focus:ring-2 focus:ring-primary/20 p-2 bg-card text-text border"
                />
              </div>
              <div>
                <label
                  htmlFor="client-email"
                  className="block text-xs text-text-secondary mb-1"
                >
                  Email
                </label>
                <input
                  id="client-email"
                  type="email"
                  value={clientEmail}
                  onChange={(e) => setClientEmail(e.target.value)}
                  placeholder="Email"
                  className="block w-full text-sm border-border rounded-xl shadow-xs transition-shadow focus:ring-2 focus:ring-primary/20 p-2 bg-card text-text border"
                />
              </div>
            </div>
          )}
        </div>

        {/* Main content */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          {/* Left: Products, Extras, Discount controls */}
          <div className="lg:col-span-3 space-y-6">
            {/* Num people */}
            <div className="bg-card p-4 rounded-xl shadow-xs border border-border">
              <label
                htmlFor="num-people"
                className="flex items-center gap-2 text-sm font-medium text-text-secondary mb-2"
              >
                <Users className="h-4 w-4" />
                Número de Personas
              </label>
              <input
                id="num-people"
                type="number"
                min="1"
                {...methods.register("num_people", { valueAsNumber: true })}
                className="block w-full sm:w-32 text-sm border-border rounded-xl shadow-xs transition-shadow focus:ring-2 focus:ring-primary/20 p-2 bg-card text-text border"
              />
            </div>

            {/* Products */}
            <div className="bg-card p-4 sm:p-6 rounded-xl shadow-xs border border-border">
              <EventProducts
                products={products}
                selectedProducts={selectedProducts}
                productUnitCosts={productUnitCosts}
                onAddProduct={handleAddProduct}
                onRemoveProduct={handleRemoveProduct}
                onProductChange={handleProductChange}
              />
            </div>

            {/* Extras */}
            <div className="bg-card p-4 sm:p-6 rounded-xl shadow-xs border border-border">
              <EventExtras
                extras={extras}
                onAddExtra={handleAddExtra}
                onRemoveExtra={handleRemoveExtra}
                onExtraChange={handleExtraChange}
              />
            </div>

            {/* Discount & Invoice controls */}
            <div className="bg-card p-4 sm:p-6 rounded-xl shadow-xs border border-border space-y-4">
              <h3 className="text-lg font-medium text-text">
                Descuento y Facturación
              </h3>

              <div className="flex items-center gap-3">
                <input
                  id="requires-invoice"
                  type="checkbox"
                  checked={requiresInvoice}
                  onChange={(e) => setRequiresInvoice(e.target.checked)}
                  className="h-4 w-4 text-primary border-border rounded-sm focus:ring-primary bg-card"
                />
                <label
                  htmlFor="requires-invoice"
                  className="text-sm text-text-secondary"
                >
                  Requiere factura (IVA {taxRate}%)
                </label>
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <label
                    htmlFor="discount-value"
                    className="text-sm font-medium text-text-secondary"
                  >
                    Descuento General
                  </label>
                  <div className="flex rounded-lg border border-border overflow-hidden text-xs">
                    <button
                      type="button"
                      onClick={() => setDiscountType("percent")}
                      className={`px-2.5 py-1 transition-colors ${discountType === "percent" ? "bg-primary text-white" : "bg-card text-text-secondary hover:bg-surface-alt"}`}
                    >
                      %
                    </button>
                    <button
                      type="button"
                      onClick={() => setDiscountType("fixed")}
                      className={`px-2.5 py-1 transition-colors ${discountType === "fixed" ? "bg-primary text-white" : "bg-card text-text-secondary hover:bg-surface-alt"}`}
                    >
                      $
                    </button>
                  </div>
                </div>
                <input
                  id="discount-value"
                  type="number"
                  min="0"
                  max={discountType === "percent" ? 100 : undefined}
                  step="0.01"
                  value={discountValue}
                  onChange={(e) => setDiscountValue(Number(e.target.value))}
                  className="block w-full sm:w-48 text-sm border-border rounded-xl shadow-xs transition-shadow focus:ring-2 focus:ring-primary/20 p-2 bg-card text-text border"
                />
              </div>
            </div>
          </div>

          {/* Right: Financial summary (sticky) */}
          <div className="lg:col-span-2">
            <div className="lg:sticky lg:top-24 bg-surface-alt p-6 rounded-3xl shadow-sm border border-border">
              <h4 className="text-lg font-medium text-text mb-4">Resumen</h4>

              <div className="space-y-3 text-sm">
                <div className="flex justify-between text-text-secondary">
                  <span>Subtotal Productos:</span>
                  <span>${financials.productsSubtotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-text-secondary">
                  <span>Subtotal Extras:</span>
                  <span>${financials.extrasTotal.toFixed(2)}</span>
                </div>

                {financials.discountAmount > 0 && (
                  <div className="flex justify-between text-success font-medium">
                    <span>
                      Descuento{" "}
                      {discountType === "percent" ? `(${discountValue}%)` : ""}:
                    </span>
                    <span>-${financials.discountAmount.toFixed(2)}</span>
                  </div>
                )}

                {requiresInvoice && (
                  <div className="flex justify-between text-text-secondary">
                    <span>IVA ({taxRate}%):</span>
                    <span>${financials.taxAmount.toFixed(2)}</span>
                  </div>
                )}

                <div className="border-t border-border pt-3 flex justify-between text-xl font-bold text-text">
                  <span>Total:</span>
                  <span className="text-primary">
                    ${financials.total.toFixed(2)}
                  </span>
                </div>
              </div>

              {/* Internal metrics */}
              <div className="mt-6 pt-4 border-t border-border">
                <h5 className="text-xs font-semibold text-text-secondary uppercase tracking-wider mb-3">
                  Métricas de Rentabilidad (Interno)
                </h5>

                <div className="grid grid-cols-2 gap-y-2 text-sm">
                  <div className="text-text-secondary">Costo Productos:</div>
                  <div className="text-right font-medium text-text">
                    ${financials.productCost.toFixed(2)}
                  </div>

                  <div className="text-text-secondary">Costo Extras:</div>
                  <div className="text-right font-medium text-text">
                    ${financials.extrasCost.toFixed(2)}
                  </div>

                  <div className="text-text-secondary font-medium border-t border-border pt-2">
                    Costo Total:
                  </div>
                  <div className="text-right font-medium text-text border-t border-border pt-2">
                    ${financials.totalCost.toFixed(2)}
                  </div>

                  <div className="text-text-secondary">Utilidad Neta:</div>
                  <div className="text-right font-bold text-success">
                    ${financials.profit.toFixed(2)}
                  </div>

                  <div className="text-text-secondary">Margen:</div>
                  <div className="text-right font-bold text-info">
                    {financials.margin.toFixed(1)}%
                  </div>
                </div>
              </div>

              {/* Empty state */}
              {!hasItems && (
                <div className="mt-6 text-center text-text-secondary text-sm">
                  Agrega productos o extras para ver el resumen
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </FormProvider>
  );
};
