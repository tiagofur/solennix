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
} from "lucide-react";
import { logError } from "@/lib/errorHandler";
import { Breadcrumb } from "@/components/Breadcrumb";
import { EventGeneralInfo } from "./components/EventGeneralInfo";
import { EventProducts } from "./components/EventProducts";
import { EventExtras } from "./components/EventExtras";
import { EventFinancials } from "./components/EventFinancials";
import { EventEquipment } from "./components/EventEquipment";
import { EventStaff, type SelectedStaffAssignment } from "./components/EventStaff";
import { useStaff } from "@/hooks/queries/useStaffQueries";
import { staffService } from "@/services/staffService";
import { EventSupplies } from "./components/EventSupplies";
import { usePlanLimits } from "@/hooks/usePlanLimits";
import { useClients } from "@/hooks/queries/useClientQueries";
import { useProducts } from "@/hooks/queries/useProductQueries";
import { useInventoryItems } from "@/hooks/queries/useInventoryQueries";
import { useEvent, useEventProducts, useEventExtras, useEventEquipment, useEventSupplies } from "@/hooks/queries/useEventQueries";
import {
  EquipmentConflict,
  EquipmentSuggestion,
  SupplySuggestion,
  InventoryItem,
  EventProduct,
  EventExtra,
  EventEquipment as EventEquipmentEntity,
  EventSupply,
  ProductIngredient,
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

// Convert an ISO8601 UTC string (e.g. the backend's shift_start) to the
// browser-local HH:mm representation used by <input type="time">. Returns
// null when the input is empty/invalid so the field stays cleared.
const isoToLocalHHmm = (iso: string | null | undefined): string | null => {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  const hh = String(d.getHours()).padStart(2, "0");
  const mm = String(d.getMinutes()).padStart(2, "0");
  return `${hh}:${mm}`;
};

// Combine a YYYY-MM-DD event date with a HH:mm local time into an ISO8601
// UTC string. `dayOffset` shifts the day by N (used for overnight shifts).
// Returns null when either piece is missing.
const hhmmToUtcIso = (
  eventDate: string | null | undefined,
  hhmm: string | null,
  dayOffset = 0,
): string | null => {
  if (!eventDate || !hhmm) return null;
  const [h, m] = hhmm.split(":").map((n) => Number(n));
  if (Number.isNaN(h) || Number.isNaN(m)) return null;
  const [y, mo, d] = eventDate.split("-").map((n) => Number(n));
  if (Number.isNaN(y) || Number.isNaN(mo) || Number.isNaN(d)) return null;
  const local = new Date(y, mo - 1, d + dayOffset, h, m, 0, 0);
  if (Number.isNaN(local.getTime())) return null;
  return local.toISOString();
};

// Serialize a shift range, bumping the end by +1 day when the user chose an
// end time on or before the start (overnight turno). Backend enforces
// CHECK (shift_end > shift_start), so "19:00 → 02:00" would otherwise be
// rejected.
const serializeShift = (
  eventDate: string | null | undefined,
  start: string | null,
  end: string | null,
): { shiftStart: string | null; shiftEnd: string | null } => {
  const shiftStart = hhmmToUtcIso(eventDate, start);
  if (!end) return { shiftStart, shiftEnd: null };
  if (!start) return { shiftStart: null, shiftEnd: hhmmToUtcIso(eventDate, end) };
  const [sh, sm] = start.split(":").map(Number);
  const [eh, em] = end.split(":").map(Number);
  const overnight = eh * 60 + em <= sh * 60 + sm;
  return {
    shiftStart,
    shiftEnd: hhmmToUtcIso(eventDate, end, overnight ? 1 : 0),
  };
};

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

interface QuickQuoteState {
  fromQuickQuote: boolean;
  selectedProducts?: { product_id: string; quantity: number; price: number; discount: number }[];
  extras?: { description: string; cost: number; price: number; exclude_utility: boolean; include_in_checklist: boolean }[];
  discountType?: 'fixed' | 'percent';
  discountValue?: number;
  requiresInvoice?: boolean;
  numPeople?: number;
}

const STEPS = [
  { id: 1, title: "Información General", icon: Info },
  { id: 2, title: "Productos", icon: Utensils },
  { id: 3, title: "Extras", icon: PlusCircle },
  { id: 4, title: "Insumos y Equipo", icon: Package },
  { id: 5, title: "Finanzas y Contrato", icon: FileText },
];

// Fields belonging to each step. Steps 2-4 manage local state (selectedProducts,
// extras, selectedEquipment/Supplies) instead of form fields, so they have no
// zod fields to validate — step progression for those is always permitted.
const FIELDS_PER_STEP: Record<number, (keyof EventFormData)[]> = {
  1: [
    "client_id",
    "event_date",
    "start_time",
    "end_time",
    "service_type",
    "num_people",
    "status",
    "location",
    "city",
  ],
  2: [],
  3: [],
  4: [],
  5: [
    "discount",
    "requires_invoice",
    "tax_rate",
    "tax_amount",
    "total_amount",
    "deposit_percent",
    "cancellation_days",
    "refund_percent",
    "notes",
  ],
};

export const EventForm: React.FC = () => {
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const locationState = location.state as QuickQuoteState | null;
  const quickQuoteData = locationState?.fromQuickQuote ? locationState : null;

  const [activeStep, setActiveStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [isStepLoading, setIsStepLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Dropdown data via React Query (cached, shared)
  const { data: clientsRaw = [] } = useClients();
  const { data: productsRaw = [] } = useProducts();
  const { data: inventoryData = [] } = useInventoryItems();
  const clients = clientsRaw as Client[];
  const products = productsRaw as Product[];

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
      include_in_checklist: boolean;
    }[]
  >([]);

  // State for product unit costs
  const [productUnitCosts, setProductUnitCosts] = useState<{
    [key: string]: number;
  }>({});
  const [discountType, setDiscountType] = useState<"percent" | "fixed">(
    "percent",
  );

  // Derived inventory subsets from cached data
  const equipmentInventory = inventoryData.filter((i) => i.type === "equipment");
  const supplyInventory = inventoryData.filter((i) => i.type === "supply");

  // Equipment state
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
  const [selectedSupplies, setSelectedSupplies] = useState<
    {
      inventory_id: string;
      quantity: number;
      unit_cost: number;
      source: "stock" | "purchase";
      exclude_cost: boolean;
    }[]
  >([]);

  // Staff state — personal/colaboradores assigned to this event.
  const [selectedStaff, setSelectedStaff] = useState<SelectedStaffAssignment[]>([]);
  const { data: staffCatalog = [] } = useStaff();
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

  // --- Load edit-mode data via React Query ---
  const { data: existingEvent } = useEvent(id);
  const { data: existingEventProducts } = useEventProducts(id);
  const { data: existingEventExtras } = useEventExtras(id);
  const { data: existingEventEquipment } = useEventEquipment(id);
  const { data: existingEventSupplies } = useEventSupplies(id);

  // Staff for edit-mode — plain service call because there is no dedicated
  // hook yet and this query is scoped to a single event detail view.
  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    staffService.getByEvent(id).then((rows) => {
      if (cancelled) return;
      setSelectedStaff(
        rows.map((r) => ({
          staff_id: r.staff_id,
          fee_amount: r.fee_amount ?? null,
          role_override: r.role_override ?? "",
          notes: r.notes ?? "",
          // Shift ISO8601 UTC → HH:mm local para edición en UI.
          shift_start: r.shift_start ? isoToLocalHHmm(r.shift_start) : null,
          shift_end: r.shift_end ? isoToLocalHHmm(r.shift_end) : null,
          status: r.status ?? null,
        })),
      );
    }).catch(() => { /* empty list on error — parity with equipment */ });
    return () => { cancelled = true; };
  }, [id]);

  // Load unavailable dates (kept as direct call — small, calendar-specific)
  useEffect(() => {
    const endOfNextYear = new Date();
    endOfNextYear.setFullYear(endOfNextYear.getFullYear() + 1);
    unavailableDatesService.getDates("2020-01-01", endOfNextYear.toISOString().split("T")[0])
      .then(setUnavailableDates)
      .catch((err) => logError("Error loading unavailable dates", err));
  }, []);

  useEffect(() => {
    const clientIdParam = searchParams.get("clientId");
    if (clientIdParam && !id) {
      setValue("client_id", clientIdParam);
    }
  }, [searchParams, id, setValue]);

  // Populate form when existing event loads (edit mode)
  useEffect(() => {
    if (!existingEvent) return;
    setDiscountType(existingEvent.discount_type || "percent");
    reset({
      client_id: existingEvent.client_id || "",
      event_date: existingEvent.event_date || "",
      start_time: existingEvent.start_time || "",
      end_time: existingEvent.end_time || "",
      service_type: existingEvent.service_type || "",
      num_people: existingEvent.num_people || 100,
      status: existingEvent.status || "quoted",
      discount: existingEvent.discount || 0,
      requires_invoice: existingEvent.requires_invoice || false,
      tax_rate: existingEvent.tax_rate || 16,
      tax_amount: existingEvent.tax_amount || 0,
      total_amount: existingEvent.total_amount || 0,
      location: existingEvent.location || "",
      city: existingEvent.city || "",
      deposit_percent: existingEvent.deposit_percent ?? (user?.default_deposit_percent || 50),
      cancellation_days: existingEvent.cancellation_days ?? (user?.default_cancellation_days || 15),
      refund_percent: existingEvent.refund_percent ?? (user?.default_refund_percent || 0),
      notes: existingEvent.notes || "",
    });
  }, [existingEvent, reset, user]);

  // Populate items when they load (edit mode)
  useEffect(() => {
    if (existingEventProducts) {
      setSelectedProducts(
        existingEventProducts.map((ep: EventProduct) => ({
          product_id: ep.product_id,
          quantity: ep.quantity,
          price: ep.unit_price,
          discount: ep.discount || 0,
        })),
      );
    }
  }, [existingEventProducts]);

  useEffect(() => {
    if (existingEventExtras) {
      setExtras(
        existingEventExtras.map((e: EventExtra) => ({
          description: e.description,
          cost: e.cost,
          price: e.price,
          exclude_utility: e.exclude_utility || false,
          include_in_checklist: e.include_in_checklist !== false,
        })),
      );
    }
  }, [existingEventExtras]);

  useEffect(() => {
    if (existingEventEquipment) {
      setSelectedEquipment(
        existingEventEquipment.map((eq: EventEquipmentEntity) => ({
          inventory_id: eq.inventory_id,
          quantity: eq.quantity,
          notes: eq.notes || "",
        })),
      );
    }
  }, [existingEventEquipment]);

  useEffect(() => {
    if (existingEventSupplies) {
      setSelectedSupplies(
        existingEventSupplies.map((s: EventSupply) => ({
          inventory_id: s.inventory_id,
          quantity: s.quantity,
          unit_cost: s.unit_cost,
          source: s.source || "purchase",
          exclude_cost: s.exclude_cost || false,
        })),
      );
    }
  }, [existingEventSupplies]);

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
                ?.filter((ing: ProductIngredient) => ing.type === "ingredient")
                .reduce((sum: number, ing: ProductIngredient) => {
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
    // productUnitCosts is intentionally omitted from deps: it is read only
    // inside fetchMissingCosts to skip products whose cost is already cached,
    // and then written via the functional setProductUnitCosts updater. Including
    // it here would re-fire the effect after every successful fetch and risks
    // an infinite loop if any fetch consistently yields a still-missing entry.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    selectedProducts,
    extras,
    discountValue,
    discountType,
    requiresInvoiceValue,
    taxRateValue,
    setValue,
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

  const handleReorderProducts = (fromIndex: number, toIndex: number) => {
    setSelectedProducts((prev) => {
      const next = [...prev];
      const [moved] = next.splice(fromIndex, 1);
      next.splice(toIndex, 0, moved);
      return next;
    });
  };

  const handleProductChange = (index: number, field: string, value: string | number | boolean) => {
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
      { description: "", cost: 0, price: 0, exclude_utility: false, include_in_checklist: true },
    ]);
  };

  const handleRemoveExtra = (index: number) => {
    setExtras((prev) => prev.filter((_, i) => i !== index));
  };

  const handleReorderExtras = (fromIndex: number, toIndex: number) => {
    setExtras((prev) => {
      const next = [...prev];
      const [moved] = next.splice(fromIndex, 1);
      next.splice(toIndex, 0, moved);
      return next;
    });
  };

  const handleExtraChange = (index: number, field: string, value: string | number | boolean) => {
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
    // Invalidate clients cache so dropdown picks up the new client
    import("@/lib/queryClient").then(({ queryClient }) => {
      queryClient.invalidateQueries({ queryKey: ["clients"] });
    });
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

  // --- Staff handlers ---

  const handleAddStaff = () => {
    setSelectedStaff((prev) => [
      ...prev,
      {
        staff_id: "",
        fee_amount: null,
        role_override: "",
        notes: "",
        shift_start: null,
        shift_end: null,
        status: null,
      },
    ]);
  };

  const handleRemoveStaff = (index: number) => {
    setSelectedStaff((prev) => prev.filter((_, i) => i !== index));
  };

  // Ola 2 — expandir un equipo en filas, deduplicando contra los ya presentes.
  const handleAddTeamMembers = (rows: SelectedStaffAssignment[]) => {
    setSelectedStaff((prev) => {
      const existing = new Set(prev.map((r) => r.staff_id).filter(Boolean));
      const toAdd = rows.filter((r) => r.staff_id && !existing.has(r.staff_id));
      if (toAdd.length === 0) return prev;
      return [...prev, ...toAdd];
    });
  };

  const handleStaffChange = (
    index: number,
    field: keyof SelectedStaffAssignment,
    value: string | number | null,
  ) => {
    setSelectedStaff((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: value } as SelectedStaffAssignment;
      return next;
    });
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
    // Enter key on a non-final step must not silently advance the wizard or
    // trigger a save: route through nextStep() so step-scoped validation runs
    // before progressing. Only the final step actually saves.
    if (activeStep < STEPS.length) {
      await nextStep();
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
          selectedStaff
            .filter((s) => s.staff_id)
            .map((s) => {
              const shift = serializeShift(eventDateValue, s.shift_start, s.shift_end);
              return {
                staffId: s.staff_id,
                feeAmount: s.fee_amount,
                roleOverride: s.role_override || null,
                notes: s.notes || null,
                shiftStart: shift.shiftStart,
                shiftEnd: shift.shiftEnd,
                status: s.status, // null = preserve current value on upsert
              };
            }),
        );
      }

      navigate(`/events/${eventId}/summary`);
    } catch (err: unknown) {
      logError("Error saving event", err);
      setError(
        err instanceof Error ? err.message : "Error al guardar el evento. Por favor intenta de nuevo.",
      );
    } finally {
      setIsLoading(false);
    }
  };

  const nextStep = async () => {
    if (isStepLoading) return;
    setIsStepLoading(true);
    // Validate only the fields that belong to the CURRENT step. Without this
    // scope, methods.trigger() validates the entire form, which surfaces
    // errors on fields in steps the user has not yet reached.
    const fieldsToValidate = FIELDS_PER_STEP[activeStep] ?? [];
    const isValidStep =
      fieldsToValidate.length === 0
        ? true
        : await methods.trigger(fieldsToValidate);
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
      <Breadcrumb items={[{ label: 'Dashboard', href: '/dashboard' }, { label: id ? 'Editar Evento' : 'Nueva Cotización' }]} />
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
          <h1 className="text-2xl font-bold tracking-tight text-text">
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
                    {(err as { message?: string })?.message}
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
          <div className="bg-card shadow-xl border border-border p-6 rounded-2xl overflow-hidden min-h-[400px]">
            <div key={activeStep} className="animate-in fade-in slide-in-from-bottom-4 duration-500 ease-out">
              {activeStep === 1 && (
                <EventGeneralInfo
                  clients={clients}
                  clientIdValue={clientIdValue}
                  onClientCreated={handleClientCreated}
                  unavailableDates={unavailableDates}
                />
              )}
              {activeStep === 2 && (
                <EventProducts
                  products={products}
                  selectedProducts={selectedProducts}
                  productUnitCosts={productUnitCosts}
                  onAddProduct={handleAddProduct}
                  onRemoveProduct={handleRemoveProduct}
                  onProductChange={handleProductChange}
                  onReorder={handleReorderProducts}
                />
              )}
              {activeStep === 3 && (
                <EventExtras
                  extras={extras}
                  onAddExtra={handleAddExtra}
                  onRemoveExtra={handleRemoveExtra}
                  onExtraChange={handleExtraChange}
                  onReorder={handleReorderExtras}
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
                  <div className="border-t border-border" />
                  <EventStaff
                    staffCatalog={staffCatalog}
                    selectedStaff={selectedStaff}
                    eventDate={eventDateValue}
                    eventId={id ?? null}
                    onAdd={handleAddStaff}
                    onRemove={handleRemoveStaff}
                    onChange={handleStaffChange}
                    onAddTeamMembers={handleAddTeamMembers}
                  />
                </div>
              )}
              {activeStep === 5 && (
                <EventFinancials
                  selectedProducts={selectedProducts}
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
