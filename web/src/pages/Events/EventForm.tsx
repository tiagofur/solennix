import React, { useEffect, useState } from "react";
import {
  useNavigate,
  useParams,
  useSearchParams,
  useLocation,
} from "react-router-dom";
import { useForm, FormProvider, useWatch, Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { eventService } from "@/services/eventService";
import { clientService } from "@/services/clientService";
import { productService } from "@/services/productService";
import { useAuth } from "@/contexts/AuthContext";
import {
  ArrowLeft,
  Save,
  FileText,
  ChevronRight,
  CheckCircle,
  AlertCircle,
  Info,
  Utensils,
  PlusCircle,
  Package,
  Calculator,
} from "lucide-react";
import { logError } from "@/lib/errorHandler";
import { EventGeneralInfo } from "./components/EventGeneralInfo";
import { EventProducts } from "./components/EventProducts";
import { EventExtras } from "./components/EventExtras";
import { EventFinancials } from "./components/EventFinancials";
import { EventEquipment } from "./components/EventEquipment";
import { EventSupplies } from "./components/EventSupplies";
import { inventoryService } from "@/services/inventoryService";
import { usePlanLimits } from "@/hooks/usePlanLimits";
import {
  EquipmentConflict,
  EquipmentSuggestion,
  SupplySuggestion,
  InventoryItem,
} from "@/types/entities";
import { UpgradeBanner } from "@/components/UpgradeBanner";
import { unavailableDatesService } from "@/services/unavailableDatesService";

// Local types to avoid Supabase dependency
interface Client {
  id: string;
  name: string;
  phone: string;
  email?: string | null;
  address?: string | null;
  city?: string | null;
  total_events: number | null;
  total_spent: number | null;
}

interface UnavailableDate {
  id: string;
  start_date: string;
  end_date: string;
  reason?: string;
}

interface Product {
  id: string;
  name: string;
  category: string;
  base_price: number;
}

const eventSchema = z.object({
  client_id: z.string().min(1, "Selecciona un cliente"),
  event_date: z.string().min(1, "Selecciona una fecha"),
  start_time: z.string().optional().nullable(),
  end_time: z.string().optional().nullable(),
  service_type: z.string().min(2, "Tipo de servicio requerido"),
  num_people: z.coerce.number().min(1, "Mínimo 1 persona"),
  status: z.enum(["quoted", "confirmed", "completed", "cancelled"]),
  discount: z.coerce.number().min(0).default(0),
  requires_invoice: z.boolean().default(false),
  tax_rate: z.coerce.number().min(0).max(100).default(16),
  tax_amount: z.coerce.number().min(0).default(0),
  total_amount: z.coerce.number().min(0).default(0),
  location: z.string().optional().nullable(),
  city: z.string().optional().nullable(),
  deposit_percent: z.coerce.number().min(0).max(100).default(50),
  cancellation_days: z.coerce.number().min(0).default(15),
  refund_percent: z.coerce.number().min(0).max(100).default(0),
  notes: z.string().optional().nullable(),
});

type EventFormData = z.infer<typeof eventSchema>;

const STEPS = [
  { id: 1, title: "Información General", icon: Info },
  { id: 2, title: "Productos", icon: Utensils },
  { id: 3, title: "Extras", icon: PlusCircle },
  { id: 4, title: "Insumos y Equipo", icon: Package },
  { id: 5, title: "Finanzas y Contrato", icon: FileText },
];

export const EventForm: React.FC = () => {
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const quickQuoteData = (location.state as any)?.fromQuickQuote
    ? (location.state as any)
    : null;

  const [activeStep, setActiveStep] = useState(1);
  const [clients, setClients] = useState<Client[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isStepLoading, setIsStepLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Plan Limits
  const {
    canCreateEvent,
    eventsThisMonth,
    limit,
    loading: limitsLoading,
  } = usePlanLimits();

  // Unavailable Dates
  const [unavailableDates, setUnavailableDates] = useState<UnavailableDate[]>(
    [],
  );

  // Local state for items
  const [selectedProducts, setSelectedProducts] = useState<
    { product_id: string; quantity: number; price: number; discount: number }[]
  >([]);

  const [extras, setExtras] = useState<
    {
      description: string;
      cost: number;
      price: number;
      exclude_utility: boolean;
    }[]
  >([]);

  // State for product unit costs
  const [productUnitCosts, setProductUnitCosts] = useState<{
    [key: string]: number;
  }>({});
  const [discountType, setDiscountType] = useState<"percent" | "fixed">(
    "percent",
  );

  // Equipment state
  const [equipmentInventory, setEquipmentInventory] = useState<InventoryItem[]>(
    [],
  );
  const [selectedEquipment, setSelectedEquipment] = useState<
    { inventory_id: string; quantity: number; notes: string }[]
  >([]);
  const [equipmentConflicts, setEquipmentConflicts] = useState<
    EquipmentConflict[]
  >([]);
  const [equipmentSuggestions, setEquipmentSuggestions] = useState<
    EquipmentSuggestion[]
  >([]);

  // Supply state
  const [supplyInventory, setSupplyInventory] = useState<InventoryItem[]>([]);
  const [selectedSupplies, setSelectedSupplies] = useState<
    {
      inventory_id: string;
      quantity: number;
      unit_cost: number;
      source: "stock" | "purchase";
      exclude_cost: boolean;
    }[]
  >([]);
  const [supplySuggestions, setSupplySuggestions] = useState<
    SupplySuggestion[]
  >([]);

  const methods = useForm<EventFormData>({
    resolver: zodResolver(eventSchema) as Resolver<EventFormData>,
    defaultValues: {
      client_id: "",
      service_type: "",
      event_date:
        searchParams.get("date") || new Date().toISOString().split("T")[0],
      start_time: "",
      end_time: "",
      status: "quoted",
      discount: 0,
      requires_invoice: false,
      tax_rate: 16,
      tax_amount: 0,
      total_amount: 0,
      num_people: 100,
      location: "",
      city: "",
      deposit_percent: user?.default_deposit_percent || 50,
      cancellation_days: user?.default_cancellation_days || 15,
      refund_percent: user?.default_refund_percent || 0,
      notes: "",
    },
  });

  const {
    handleSubmit,
    reset,
    setValue,
    control,
    formState: { errors, isValid, isSubmitted },
  } = methods;

  const discountValue = useWatch({ control, name: "discount" }) || 0;
  const clientIdValue = useWatch({ control, name: "client_id" });
  const locationValue = useWatch({ control, name: "location" });
  const cityValue = useWatch({ control, name: "city" });
  const requiresInvoiceValue =
    useWatch({ control, name: "requires_invoice" }) || false;
  const taxRateValue = useWatch({ control, name: "tax_rate" }) || 16;
  const eventDateValue = useWatch({ control, name: "event_date" });
  const startTimeValue = useWatch({ control, name: "start_time" });
  const endTimeValue = useWatch({ control, name: "end_time" });

  // --- Effects ---

  useEffect(() => {
    const loadDependencies = async () => {
      try {
        const [clientsData, productsData, inventoryData] = await Promise.all([
          clientService.getAll(),
          productService.getAll(),
          inventoryService.getAll(),
        ]);
        setClients((clientsData as Client[]) || []);
        setProducts((productsData as Product[]) || []);
        const allInventory = (inventoryData as InventoryItem[]) || [];
        setEquipmentInventory(
          allInventory.filter((i) => i.type === "equipment"),
        );
        setSupplyInventory(allInventory.filter((i) => i.type === "supply"));

        // Load unavailable dates
        const endOfNextYear = new Date();
        endOfNextYear.setFullYear(endOfNextYear.getFullYear() + 1);
        const dates = await unavailableDatesService.getDates(
          "2020-01-01",
          endOfNextYear.toISOString().split("T")[0],
        );
        setUnavailableDates(dates);
      } catch (err) {
        logError("Error loading dependencies", err);
      }
    };
    loadDependencies();
  }, []);

  useEffect(() => {
    const clientIdParam = searchParams.get("clientId");
    if (clientIdParam && !id) {
      setValue("client_id", clientIdParam);
    }
  }, [searchParams, id, setValue]);

  useEffect(() => {
    const loadEvent = async (eventId: string) => {
      try {
        setIsLoading(true);
        const event = await eventService.getById(eventId);
        if (!event) throw new Error("Evento no encontrado");

        setDiscountType(event.discount_type || "percent");
        reset({
          client_id: event.client_id || "",
          event_date: event.event_date || "",
          start_time: event.start_time || "",
          end_time: event.end_time || "",
          service_type: event.service_type || "",
          num_people: event.num_people || 100,
          status: (event.status as any) || "quoted",
          discount: event.discount || 0,
          requires_invoice: event.requires_invoice || false,
          tax_rate: event.tax_rate || 16,
          tax_amount: event.tax_amount || 0,
          total_amount: event.total_amount || 0,
          location: event.location || "",
          city: event.city || "",
          deposit_percent:
            event.deposit_percent ?? (user?.default_deposit_percent || 50),
          cancellation_days:
            event.cancellation_days ?? (user?.default_cancellation_days || 15),
          refund_percent:
            event.refund_percent ?? (user?.default_refund_percent || 0),
          notes: event.notes || "",
        });

        const [eventProducts, eventExtras, eventEquipment, eventSupplies] =
          await Promise.all([
            eventService.getProducts(eventId),
            eventService.getExtras(eventId),
            eventService.getEquipment(eventId),
            eventService.getSupplies(eventId),
          ]);

        if (eventProducts) {
          setSelectedProducts(
            eventProducts.map((ep: any) => ({
              product_id: ep.product_id,
              quantity: ep.quantity,
              price: ep.unit_price,
              discount: ep.discount || 0,
            })),
          );
        }

        if (eventExtras) {
          setExtras(
            eventExtras.map((e: any) => ({
              description: e.description,
              cost: e.cost,
              price: e.price,
              exclude_utility: e.exclude_utility || false,
            })),
          );
        }

        if (eventEquipment) {
          setSelectedEquipment(
            eventEquipment.map((eq: any) => ({
              inventory_id: eq.inventory_id,
              quantity: eq.quantity,
              notes: eq.notes || "",
            })),
          );
        }

        if (eventSupplies) {
          setSelectedSupplies(
            eventSupplies.map((s: any) => ({
              inventory_id: s.inventory_id,
              quantity: s.quantity,
              unit_cost: s.unit_cost,
              source: s.source || "purchase",
              exclude_cost: s.exclude_cost || false,
            })),
          );
        }
      } catch (err) {
        logError("Error loading event", err);
        setError("Error al cargar el evento.");
      } finally {
        setIsLoading(false);
      }
    };

    if (id) {
      loadEvent(id);
    }
  }, [id, reset, user]);

  useEffect(() => {
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

    const discountableBase = productsSubtotal + normalExtrasTotal;
    const discountAmount =
      discountType === "percent"
        ? Math.round(discountableBase * (discountValue / 100) * 100) / 100
        : Math.min(discountValue, discountableBase);
    const discountedBase =
      Math.round((discountableBase - discountAmount) * 100) / 100;

    const baseTotal =
      Math.round((discountedBase + passThroughExtrasTotal) * 100) / 100;
    const taxAmount = requiresInvoiceValue
      ? Math.round(baseTotal * (taxRateValue / 100) * 100) / 100
      : 0;
    const total = Math.round((baseTotal + taxAmount) * 100) / 100;

    setValue("tax_amount", taxAmount);
    setValue("total_amount", total);

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
                .reduce((sum, ing: any) => {
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
        logError("Error fetching ingredients for products", err);
      }
    };

    fetchMissingCosts();
  }, [
    selectedProducts,
    extras,
    discountValue,
    discountType,
    requiresInvoiceValue,
    taxRateValue,
    setValue,
    productUnitCosts,
  ]);

  useEffect(() => {
    if (clientIdValue && !locationValue && !cityValue) {
      const selectedClient = clients.find((c) => c.id === clientIdValue);
      if (selectedClient) {
        if (selectedClient.address)
          setValue("location", selectedClient.address);
        if (selectedClient.city) setValue("city", selectedClient.city);
      }
    }
  }, [clientIdValue, clients, locationValue, cityValue, setValue]);

  // Pre-fill from Quick Quote
  useEffect(() => {
    if (quickQuoteData && !id) {
      if (quickQuoteData.selectedProducts?.length > 0) {
        setSelectedProducts(quickQuoteData.selectedProducts);
      }
      if (quickQuoteData.extras?.length > 0) {
        setExtras(quickQuoteData.extras);
      }
      if (quickQuoteData.numPeople) {
        setValue("num_people", quickQuoteData.numPeople);
      }
      if (quickQuoteData.discountValue) {
        setValue("discount", quickQuoteData.discountValue);
      }
      if (quickQuoteData.discountType) {
        setDiscountType(quickQuoteData.discountType);
      }
      if (quickQuoteData.requiresInvoice) {
        setValue("requires_invoice", true);
      }
    }
  }, [quickQuoteData, id, setValue]);

  const handleAddProduct = () => {
    if (products.length > 0) {
      const product = products[0];
      setSelectedProducts([
        ...selectedProducts,
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
    setExtras([
      ...extras,
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

  const handleClientCreated = (newClient: Client) => {
    setClients((prev) => [...prev, newClient]);
    // Use queueMicrotask to set value after React state update flushes
    queueMicrotask(() => {
      setValue("client_id", newClient.id, { shouldValidate: true });
    });
  };

  // --- Equipment handlers ---

  const handleAddEquipment = () => {
    setSelectedEquipment((prev) => [
      ...prev,
      { inventory_id: "", quantity: 1, notes: "" },
    ]);
  };

  const handleRemoveEquipment = (index: number) => {
    setSelectedEquipment((prev) => prev.filter((_, i) => i !== index));
  };

  const handleEquipmentChange = (
    index: number,
    field: string,
    value: string | number,
  ) => {
    setSelectedEquipment((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: value };
      return next;
    });
  };

  const handleQuickAddSuggestion = (
    inventoryId: string,
    suggestedQty: number,
  ) => {
    if (!selectedEquipment.some((eq) => eq.inventory_id === inventoryId)) {
      setSelectedEquipment((prev) => [
        ...prev,
        { inventory_id: inventoryId, quantity: suggestedQty, notes: "" },
      ]);
    }
  };

  // --- Supply handlers ---

  const handleAddSupply = () => {
    setSelectedSupplies((prev) => [
      ...prev,
      {
        inventory_id: "",
        quantity: 1,
        unit_cost: 0,
        source: "purchase",
        exclude_cost: false,
      },
    ]);
  };

  const handleRemoveSupply = (index: number) => {
    setSelectedSupplies((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSupplyChange = (
    index: number,
    field: string,
    value: string | number | boolean,
  ) => {
    setSelectedSupplies((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: value };
      return next;
    });
  };

  const handleQuickAddSupplySuggestion = (
    inventoryId: string,
    suggestedQty: number,
    unitCost: number,
  ) => {
    if (!selectedSupplies.some((s) => s.inventory_id === inventoryId)) {
      setSelectedSupplies((prev) => [
        ...prev,
        {
          inventory_id: inventoryId,
          quantity: suggestedQty,
          unit_cost: unitCost,
          source: "purchase",
          exclude_cost: false,
        },
      ]);
    }
  };

  // Auto-suggest equipment when products change
  useEffect(() => {
    const productItems = selectedProducts
      .filter((p) => p.product_id)
      .map((p) => ({ product_id: p.product_id, quantity: p.quantity }));
    if (productItems.length === 0) {
      setEquipmentSuggestions([]);
      return;
    }
    const fetchSuggestions = async () => {
      try {
        const suggestions =
          await eventService.getEquipmentSuggestions(productItems);
        setEquipmentSuggestions(suggestions || []);
      } catch {
        // Silently ignore suggestion errors
      }
    };
    fetchSuggestions();
  }, [selectedProducts]);

  // Auto-suggest supplies when products change
  useEffect(() => {
    const productItems = selectedProducts
      .filter((p) => p.product_id)
      .map((p) => ({ product_id: p.product_id, quantity: p.quantity }));
    if (productItems.length === 0) {
      setSupplySuggestions([]);
      return;
    }
    const fetchSupplySuggestions = async () => {
      try {
        const suggestions =
          await eventService.getSupplySuggestions(productItems);
        setSupplySuggestions(suggestions || []);
      } catch {
        // Silently ignore suggestion errors
      }
    };
    fetchSupplySuggestions();
  }, [selectedProducts]);

  // Check equipment conflicts (debounced)
  useEffect(() => {
    const selectedIds = selectedEquipment
      .map((eq) => eq.inventory_id)
      .filter(Boolean);
    if (selectedIds.length === 0 || !eventDateValue) {
      setEquipmentConflicts([]);
      return;
    }
    const timer = setTimeout(async () => {
      try {
        const conflicts = await eventService.checkEquipmentConflicts({
          event_date: eventDateValue,
          start_time: startTimeValue || undefined,
          end_time: endTimeValue || undefined,
          inventory_ids: selectedIds,
          exclude_event_id: id || undefined,
        });
        setEquipmentConflicts(conflicts || []);
      } catch {
        // Silently ignore conflict check errors
      }
    }, 500);
    return () => clearTimeout(timer);
  }, [selectedEquipment, eventDateValue, startTimeValue, endTimeValue, id]);

  const onSubmit = async (data: EventFormData) => {
    if (activeStep < STEPS.length) {
      setActiveStep((prev) => Math.min(prev + 1, STEPS.length));
      return;
    }

    if (!user) {
      setError("Usuario no autenticado.");
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Validate unavailable dates
      if (unavailableDates && unavailableDates.length > 0) {
        const eventDateObj = new Date(data.event_date);
        const isUnavailable = unavailableDates.some((range) => {
          const start = new Date(range.start_date);
          const end = new Date(range.end_date);
          return eventDateObj >= start && eventDateObj <= end;
        });

        if (isUnavailable) {
          setError("La fecha seleccionada no está disponible.");
          setIsLoading(false);
          return;
        }
      }

      const payload = {
        ...data,
        discount_type: discountType,
        start_time: data.start_time?.trim() ? data.start_time : null,
        end_time: data.end_time?.trim() ? data.end_time : null,
        user_id: user.id,
      };

      let eventId = id;

      if (id) {
        await eventService.update(id, payload);
      } else {
        const newEvent = await eventService.create(payload);
        if (!newEvent || !newEvent.id)
          throw new Error("Error al crear el evento.");
        eventId = newEvent.id;
      }

      if (eventId) {
        await eventService.updateItems(
          eventId,
          selectedProducts.map((p) => ({
            productId: p.product_id,
            quantity: p.quantity,
            unitPrice: p.price,
            discount: p.discount,
          })),
          extras,
          selectedEquipment
            .filter((eq) => eq.inventory_id)
            .map((eq) => ({
              inventoryId: eq.inventory_id,
              quantity: eq.quantity,
              notes: eq.notes || undefined,
            })),
          selectedSupplies
            .filter((s) => s.inventory_id)
            .map((s) => ({
              inventoryId: s.inventory_id,
              quantity: s.quantity,
              unitCost: s.unit_cost,
              source: s.source,
              excludeCost: s.exclude_cost,
            })),
        );
      }

      navigate(`/events/${eventId}/summary`);
    } catch (err: any) {
      logError("Error saving event", err);
      setError(
        err.message ||
          "Error al guardar el evento. Por favor intenta de nuevo.",
      );
    } finally {
      setIsLoading(false);
    }
  };

  const nextStep = async () => {
    if (isStepLoading) return;
    setIsStepLoading(true);
    const isValidStep = await methods.trigger();
    if (isValidStep) {
      setActiveStep((prev) => Math.min(prev + 1, STEPS.length));
    }
    setIsStepLoading(false);
  };

  const prevStep = () => {
    setActiveStep((prev) => Math.max(prev - 1, 1));
  };

  if (isLoading || limitsLoading) {
    return (
      <div
        className="flex justify-center items-center h-64"
        role="status"
        aria-live="polite"
      >
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        <span className="sr-only">Cargando formulario de evento...</span>
      </div>
    );
  }

  // If creating new event and limit is reached
  if (!id && !canCreateEvent) {
    return (
      <div className="max-w-4xl mx-auto py-8 px-4">
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="mb-6 flex items-center text-sm font-medium text-text-secondary hover:text-text transition-colors"
        >
          <ArrowLeft className="h-4 w-4 mr-1" aria-hidden="true" />
          Regresar
        </button>
        <div className="flex justify-center mt-12">
          <UpgradeBanner
            type="limit-reached"
            currentUsage={eventsThisMonth}
            limit={limit}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center">
          <button
            type="button"
            onClick={() => navigate("/calendar")}
            className="mr-4 p-2 rounded-full hover:bg-surface-alt text-text-secondary"
            aria-label="Volver al calendario"
          >
            <ArrowLeft className="h-5 w-5" aria-hidden="true" />
          </button>
          <h1 className="text-2xl font-black tracking-tight text-text">
            {id ? "Editar Evento" : "Nuevo Evento"}
          </h1>
        </div>
        {id && (
          <button
            type="button"
            onClick={() => navigate(`/events/${id}/summary`)}
            className="inline-flex items-center px-4 py-2 border border-border rounded-xl shadow-xs text-sm font-medium text-text-secondary bg-card hover:bg-surface-alt transition-colors"
          >
            <FileText className="-ml-1 mr-2 h-5 w-5" aria-hidden="true" />
            Ver Resumen
          </button>
        )}
      </div>

      <nav aria-label="Progreso del formulario de evento" className="mb-8">
        <div className="relative">
          {/* Progress Line */}
          <div
            className="absolute top-1/2 left-0 w-full h-1 bg-border -translate-y-1/2 rounded-full overflow-hidden"
            aria-hidden="true"
          >
            <div
              className="h-full bg-primary transition-all duration-500 ease-in-out"
              style={{ width: `${((activeStep - 1) / (STEPS.length - 1)) * 100}%` }}
            />
          </div>

          <ol role="list" className="relative flex justify-between w-full">
            {STEPS.map((step) => {
              const Icon = step.icon;
              const isCompleted = activeStep > step.id;
              const isActive = activeStep === step.id;

              return (
                <li key={step.id} className="relative">
                  <button
                    type="button"
                    onClick={() => {
                      if (activeStep > step.id) setActiveStep(step.id);
                    }}
                    disabled={activeStep < step.id}
                    className="group flex flex-col items-center focus:outline-hidden"
                  >
                    <span
                      className={`relative z-10 w-12 h-12 flex items-center justify-center rounded-2xl transition-all duration-500 ${
                        isCompleted
                          ? "bg-primary text-white shadow-lg shadow-primary/20"
                          : isActive
                            ? "bg-card border-2 border-primary text-primary shadow-xl ring-4 ring-primary/10 scale-110"
                            : "bg-surface-alt border-2 border-border text-text-tertiary"
                      }`}
                    >
                      {isCompleted ? (
                        <CheckCircle className="w-6 h-6" aria-hidden="true" />
                      ) : (
                        <Icon className="w-6 h-6" aria-hidden="true" />
                      )}
                      
                      {isActive && (
                        <span className="absolute -inset-1 rounded-2xl animate-pulse bg-primary/20 blur-sm -z-10" />
                      )}
                    </span>
                    <span
                      className={`mt-3 text-xs font-black uppercase tracking-widest transition-colors duration-300 ${
                        isActive ? "text-primary" : "text-text-secondary"
                      }`}
                    >
                      {step.title}
                    </span>
                  </button>
                </li>
              );
            })}
          </ol>
        </div>
      </nav>

      {error && (
        <div
          className="bg-error/5 border-l-4 border-error p-4 rounded-md"
          role="alert"
        >
          <div className="flex">
            <AlertCircle className="h-5 w-5 text-error" aria-hidden="true" />
            <div className="ml-3">
              <p className="text-sm text-error">{error}</p>
            </div>
          </div>
        </div>
      )}

      {isSubmitted && !isValid && (
        <div
          className="bg-error/5 border border-error/20 p-5 rounded-2xl animate-in fade-in slide-in-from-top-2 duration-500"
          role="alert"
        >
          <div className="flex gap-4">
            <div className="p-2 bg-error/10 rounded-xl h-fit">
              <AlertCircle className="h-6 w-6 text-error" aria-hidden="true" />
            </div>
            <div>
              <p className="text-sm text-error font-black uppercase tracking-tight mb-2">
                Errores en el formulario
              </p>
              <p className="text-sm text-text-secondary mb-3">
                Por favor revisa todos los pasos antes de guardar el evento.
              </p>
              <ul className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1 list-none">
                {Object.entries(errors).map(([key, err]) => (
                  <li key={key} className="text-xs text-error/80 flex items-center">
                    <span className="mr-2 opacity-50">●</span>
                    {(err as any).message}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}

      <FormProvider {...methods}>
        <form
          onSubmit={handleSubmit(onSubmit)}
          className="space-y-6"
          onKeyDown={(e) => {
            if (
              e.key === "Enter" &&
              (e.target as HTMLElement).tagName !== "TEXTAREA"
            ) {
              e.preventDefault();
            }
          }}
        >
          <div className="bg-card shadow-xl border border-border p-6 rounded-3xl overflow-hidden min-h-[400px]">
            <div key={activeStep} className="animate-in fade-in slide-in-from-bottom-4 duration-500 ease-out">
              {activeStep === 1 && (
                <EventGeneralInfo
                  clients={clients as any}
                  clientIdValue={clientIdValue}
                  onClientCreated={handleClientCreated as any}
                  unavailableDates={unavailableDates}
                />
              )}
              {activeStep === 2 && (
                <EventProducts
                  products={products as any}
                  selectedProducts={selectedProducts}
                  productUnitCosts={productUnitCosts}
                  onAddProduct={handleAddProduct}
                  onRemoveProduct={handleRemoveProduct}
                  onProductChange={handleProductChange}
                />
              )}
              {activeStep === 3 && (
                <EventExtras
                  extras={extras}
                  onAddExtra={handleAddExtra}
                  onRemoveExtra={handleRemoveExtra}
                  onExtraChange={handleExtraChange}
                />
              )}
              {activeStep === 4 && (
                <div className="space-y-8">
                  <EventSupplies
                    supplyInventory={supplyInventory}
                    selectedSupplies={selectedSupplies}
                    suggestions={supplySuggestions}
                    onAddSupply={handleAddSupply}
                    onRemoveSupply={handleRemoveSupply}
                    onSupplyChange={handleSupplyChange}
                    onQuickAddSuggestion={handleQuickAddSupplySuggestion}
                  />
                  <div className="border-t border-border" />
                  <EventEquipment
                    equipmentInventory={equipmentInventory}
                    selectedEquipment={selectedEquipment}
                    conflicts={equipmentConflicts}
                    suggestions={equipmentSuggestions}
                    onAddEquipment={handleAddEquipment}
                    onRemoveEquipment={handleRemoveEquipment}
                    onEquipmentChange={handleEquipmentChange}
                    onQuickAddSuggestion={handleQuickAddSuggestion}
                  />
                </div>
              )}
              {activeStep === 5 && (
                <EventFinancials
                  selectedProducts={selectedProducts as any}
                  extras={extras}
                  productUnitCosts={productUnitCosts}
                  supplyCost={selectedSupplies.reduce(
                    (sum, s) =>
                      sum + (s.exclude_cost ? 0 : s.quantity * s.unit_cost),
                    0,
                  )}
                  discountType={discountType}
                  onDiscountTypeChange={setDiscountType}
                />
              )}
            </div>
          </div>

          <div className="flex justify-between pt-4">
            <button
              type="button"
              onClick={prevStep}
              disabled={activeStep === 1}
              className={`px-4 py-2 border border-border rounded-xl shadow-sm text-sm font-medium text-text-secondary bg-card hover:bg-surface-alt transition-colors ${activeStep === 1 ? "invisible" : ""}`}
              aria-label="Volver al paso anterior del formulario"
            >
              Anterior
            </button>

            {activeStep < STEPS.length ? (
              <button
                type="button"
                onClick={nextStep}
                disabled={isStepLoading}
                className="inline-flex justify-center py-2 px-4 border border-transparent shadow-xs text-sm font-medium rounded-xl text-white premium-gradient hover:opacity-90 focus:outline-hidden focus:ring-2 focus:ring-offset-2 focus:ring-primary disabled:opacity-50 transition-opacity"
                aria-label="Ir al siguiente paso del formulario"
              >
                {isStepLoading ? "Cargando..." : "Siguiente"}
                <ChevronRight className="ml-2 h-4 w-4" aria-hidden="true" />
              </button>
            ) : (
              <button
                type="button"
                onClick={handleSubmit(onSubmit)}
                disabled={isLoading || isStepLoading}
                className="inline-flex justify-center py-2 px-4 border border-transparent shadow-xs text-sm font-medium rounded-xl text-white bg-success hover:bg-success/90 focus:outline-hidden focus:ring-2 focus:ring-offset-2 focus:ring-success/50 disabled:opacity-50 transition-colors"
              >
                <Save className="h-5 w-5 mr-2" aria-hidden="true" />
                {isLoading ? "Guardando..." : "Guardar Evento"}
              </button>
            )}
          </div>
        </form>
      </FormProvider>
    </div>
  );
};
