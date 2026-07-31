import React, { useState, useMemo, useEffect, useRef } from "react";
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
import { useAuth } from "@/hooks/useAuth";
import { ArrowLeft, Info, Package, Sparkles, ShoppingCart, DollarSign } from "lucide-react";
import { logError } from "@/lib/errorHandler";
import { productUnitCostFromIngredients } from "@/lib/EventFinancials";
import { isoToLocalHHmm, serializeShift, isValidUuid } from "@/lib/eventShifts";
import { Breadcrumb } from "@/components/Breadcrumb";
import { EventGeneralInfo } from "./components/EventGeneralInfo";
import { EventProducts } from "./components/EventProducts";
import { EventExtras } from "./components/EventExtras";
import { EventFinancials } from "./components/EventFinancials";
import { EventEquipment } from "./components/EventEquipment";
import { EventStaff, type SelectedStaffAssignment } from "./components/EventStaff";
import { EventFormHeader } from "./components/EventFormHeader";
import { EventFormStepper } from "./components/EventFormStepper";
import { EventFormErrorBanners } from "./components/EventFormErrorBanners";
import { EventFormNavButtons } from "./components/EventFormNavButtons";
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
  EventProduct,
  EventExtra,
  EventEquipment as EventEquipmentEntity,
  EventSupply,
} from "@/types/entities";
import { UpgradeBanner } from "@/components/UpgradeBanner";
import { useUnavailableDatesByRange } from "@/hooks/queries/useUnavailableDatesQueries";
import { localToday, parseEventDate } from "@/lib/dateUtils";
import { buildBlockedDateList, advancePastBlockedDate } from "@/lib/blockedDates";

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

interface Product {
  id: string;
  name: string;
  category: string;
  base_price: number;
  staff_team_id?: string | null;
}

// Shift time helpers (isoToLocalHHmm / serializeShift / isValidUuid) live in
// @/lib/eventShifts.ts — pure, unit-testable, reused across the wizard.

type EventFormData = {
  client_id: string;
  event_date: string;
  start_time?: string | null;
  end_time?: string | null;
  service_type: string;
  num_people: number;
  status: "quoted" | "confirmed" | "completed" | "cancelled";
  discount: number;
  requires_invoice: boolean;
  tax_rate: number;
  tax_amount: number;
  total_amount: number;
  location?: string | null;
  city?: string | null;
  deposit_percent: number;
  cancellation_days: number;
  refund_percent: number;
  notes?: string | null;
};

interface QuickQuoteState {
  fromQuickQuote: boolean;
  selectedProducts?: { product_id: string; quantity: number; price: number; discount: number }[];
  extras?: { description: string; cost: number; price: number; exclude_utility: boolean; include_in_checklist: boolean }[];
  discountType?: 'fixed' | 'percent';
  discountValue?: number;
  requiresInvoice?: boolean;
  numPeople?: number;
}

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

import { useTranslation } from "react-i18next";

export const EventForm: React.FC = () => {
  const { t } = useTranslation(["events", "common"]);
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const locationState = location.state as QuickQuoteState | null;
  const quickQuoteData = locationState?.fromQuickQuote ? locationState : null;

  // Icons unified cross-platform (iOS SF Symbols + Android Material + lucide here)
  const STEPS = [
    { id: 1, title: t("events:form.steps.general"), icon: Info },
    { id: 2, title: t("events:form.steps.products"), icon: Package },
    { id: 3, title: t("events:form.steps.extras"), icon: Sparkles },
    { id: 4, title: t("events:form.steps.inventory_staff"), icon: ShoppingCart },
    { id: 5, title: t("events:form.steps.financials"), icon: DollarSign },
  ];

  // Zod Reactivo: validation schema inside useMemo to reflect language changes
  const eventSchema = useMemo(() => z.object({
    client_id: z.string().min(1, t("events:form.validation.client_required")),
    event_date: z.string().min(1, t("events:form.validation.date_required")),
    start_time: z.string().optional().nullable(),
    end_time: z.string().optional().nullable(),
    service_type: z.string().min(2, t("events:form.validation.service_required")),
    num_people: z.coerce.number().min(1, t("events:form.validation.people_min")),
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
  }), [t]);

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
    eventLimit: limit,
    loading: limitsLoading,
  } = usePlanLimits();

  // Unavailable Dates
  const endOfNextYear = useMemo(() => {
    const d = new Date();
    d.setFullYear(d.getFullYear() + 1);
    return d.toISOString().split("T")[0];
  }, []);
  const { data: unavailableDates = [] } = useUnavailableDatesByRange(
    "2020-01-01",
    endOfNextYear,
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
        searchParams.get("date") || localToday(),
      start_time: "",
      end_time: "",
      status: "quoted",
      discount: 0,
      requires_invoice: false,
      tax_rate: 16,
      tax_amount: 0,
      total_amount: 0,
      num_people: 0,
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

  // REQ-3/REQ-4: create-only auto-skip of a blocked local-today default.
  // Strict ordering (Web ADR-1 / design §4):
  //   1. edit mode (`id`) and explicit `?date=` prefill never auto-skip (REQ-4)
  //   2. Fix 1 DATA-READY GATE — react-query yields [] on the first render,
  //      so return WITHOUT latching the ref; the effect re-fires once blocked
  //      data resolves (deps include `unavailableDates`)
  //   3. run at most once per mount (ref latched only AFTER data is present)
  // The ref latches ONLY at the terminal decision, which always requires
  // non-empty data, so it can never latch on the empty first render.
  const autoSkipAppliedRef = useRef(false);
  useEffect(() => {
    if (id || searchParams.get("date")) return; // REQ-4
    if (!unavailableDates?.length) return; // Fix 1: data-ready gate
    if (autoSkipAppliedRef.current) return; // run once per mount
    const advanced = advancePastBlockedDate(
      localToday(),
      buildBlockedDateList(unavailableDates),
    );
    setValue("event_date", advanced);
    autoSkipAppliedRef.current = true;
  }, [unavailableDates, id, searchParams, setValue]);

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
      num_people: existingEvent.num_people || 0,
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
            const cost = productUnitCostFromIngredients(ingredients ?? []);
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

  // Ola 3 — si el product lleva staff_team_id, expandimos los miembros del
  // equipo como filas de staff en el form (snapshot at add-time). No bloquea
  // el add en error: logea y sigue. Dedupe vía handleAddTeamMembers.
  const expandProductTeam = async (product: Product) => {
    if (!product.staff_team_id) return;
    try {
      const team = await staffService.getTeam(product.staff_team_id);
      const members = [...(team.members ?? [])].sort((a, b) => a.position - b.position);
      const rows: SelectedStaffAssignment[] = members.map((m) => {
        const staff = staffCatalog.find((s) => s.id === m.staff_id);
        const staffRole = staff?.role_label ?? null;
        const teamRole = team.role_label ?? null;
        const roleOverride = staffRole ? "" : teamRole ?? "";
        return {
          staff_id: m.staff_id,
          fee_amount: null,
          role_override: roleOverride,
          notes: "",
          shift_start: null,
          shift_end: null,
          status: null,
        };
      });
      if (rows.length > 0) handleAddTeamMembers(rows);
    } catch (err) {
      logError("Error expanding product staff team", err);
    }
  };

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
      void expandProductTeam(product);
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
    let productToExpand: Product | null = null;
    setSelectedProducts((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: value };
      if (field === "product_id") {
        const product = products.find((p) => p.id === value);
        if (product) {
          next[index].price = product.base_price;
          next[index].discount = 0;
          // Ola 3 — si el nuevo product lleva team asociado, expandir.
          if (product.staff_team_id) productToExpand = product;
        }
      }
      return next;
    });
    if (productToExpand) void expandProductTeam(productToExpand);
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
      setError(t("events:form.error_unauthenticated"));
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Validate unavailable dates
      if (unavailableDates && unavailableDates.length > 0) {
        const eventDateObj = parseEventDate(data.event_date);
        const isUnavailable = unavailableDates.some((range) => {
          const start = parseEventDate(range.start_date);
          const end = parseEventDate(range.end_date);
          return eventDateObj >= start && eventDateObj <= end;
        });

        if (isUnavailable) {
          setError(t("events:form.error_unavailable_date"));
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
          throw new Error(t("events:form.error_create"));
        eventId = newEvent.id;
      }

      if (eventId) {
        const staffPayload = selectedStaff
          .filter((s) => s.staff_id)
          .map((s, index) => {
            const trimmedId = s.staff_id.trim();
            if (!isValidUuid(trimmedId)) {
              throw new Error(`Personal #${index + 1}: ID inválido`);
            }
            if (s.fee_amount != null && s.fee_amount < 0) {
              throw new Error(`Personal #${index + 1}: El pago no puede ser negativo`);
            }

            const shift = serializeShift(eventDateValue, s.shift_start, s.shift_end);
            return {
              staffId: trimmedId,
              feeAmount: s.fee_amount,
              roleOverride: s.role_override || null,
              notes: s.notes || null,
              shiftStart: shift.shiftStart,
              shiftEnd: shift.shiftEnd,
              status: s.status, // null = preserve current value on upsert
            };
          });

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
          staffPayload,
        );
      }

      const { queryClient } = await import("@/lib/queryClient");
      queryClient.invalidateQueries({ queryKey: ["events"] });
      queryClient.invalidateQueries({ queryKey: ["planLimits"] });

      navigate(`/events/${eventId}/summary`);
    } catch (err: unknown) {
      logError("Error saving event", err);
      setError(
        err instanceof Error ? err.message : t("events:form.error_save"),
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
        <span className="sr-only">{t("events:form.loading")}</span>
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
          {t("common:action.back")}
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
      <Breadcrumb items={[{ label: t('common:nav.dashboard'), href: '/dashboard' }, { label: id ? t('events:form.title_edit') : t('events:form.title_new') }]} />
      <EventFormHeader
        isEdit={Boolean(id)}
        eventId={id}
        onBack={() => navigate("/events?view=calendar")}
        onViewSummary={() => navigate(`/events/${id}/summary`)}
      />

      <EventFormStepper
        steps={STEPS}
        activeStep={activeStep}
        onSelectStep={(stepId) => setActiveStep(stepId)}
      />

      <EventFormErrorBanners
        error={error}
        errors={errors}
        isSubmitted={isSubmitted}
        isValid={isValid}
      />

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

          <EventFormNavButtons
            activeStep={activeStep}
            totalSteps={STEPS.length}
            isStepLoading={isStepLoading}
            isLoading={isLoading}
            onPrev={prevStep}
            onNext={nextStep}
            onSubmit={() => handleSubmit(onSubmit)()}
          />
        </form>
      </FormProvider>
    </div>
  );
};
