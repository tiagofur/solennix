import React, { useEffect, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { useForm, FormProvider, useWatch, Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { eventService } from "../../services/eventService";
import { clientService } from "../../services/clientService";
import { productService } from "../../services/productService";
import { useAuth } from "../../contexts/AuthContext";
import {
  ArrowLeft,
  Save,
  FileText,
  ChevronRight,
  CheckCircle,
  AlertCircle,
} from "lucide-react";
import { logError } from "../../lib/errorHandler";
import { EventGeneralInfo } from "./components/EventGeneralInfo";
import { EventProducts } from "./components/EventProducts";
import { EventExtras } from "./components/EventExtras";
import { EventFinancials } from "./components/EventFinancials";
import { usePlanLimits } from "../../hooks/usePlanLimits";
import { UpgradeBanner } from "../../components/UpgradeBanner";

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
  { id: 1, title: "Información General" },
  { id: 2, title: "Productos" },
  { id: 3, title: "Extras" },
  { id: 4, title: "Finanzas y Contrato" },
];

export const EventForm: React.FC = () => {
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [activeStep, setActiveStep] = useState(1);
  const [clients, setClients] = useState<Client[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isStepLoading, setIsStepLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Plan Limits
  const { canCreateEvent, isBasicPlan, eventsThisMonth, limit, loading: limitsLoading } = usePlanLimits();

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

  const methods = useForm<EventFormData>({
    resolver: zodResolver(eventSchema) as Resolver<EventFormData>,
    defaultValues: {
      client_id: "",
      service_type: "",
      event_date: searchParams.get("date") || new Date().toISOString().split("T")[0],
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

  const { handleSubmit, reset, setValue, control, formState: { errors, isValid, isSubmitted } } = methods;

  const discountValue = useWatch({ control, name: "discount" }) || 0;
  const clientIdValue = useWatch({ control, name: "client_id" });
  const locationValue = useWatch({ control, name: "location" });
  const cityValue = useWatch({ control, name: "city" });
  const requiresInvoiceValue = useWatch({ control, name: "requires_invoice" }) || false;
  const taxRateValue = useWatch({ control, name: "tax_rate" }) || 16;

  // --- Effects ---

  useEffect(() => {
    const loadDependencies = async () => {
      try {
        const [clientsData, productsData] = await Promise.all([
          clientService.getAll(),
          productService.getAll(),
        ]);
        setClients(clientsData as any || []);
        setProducts(productsData as any || []);
      } catch (err) {
        logError("Error loading dependencies", err);
      }
    };
    loadDependencies();
  }, []);

  useEffect(() => {
    const clientIdParam = searchParams.get("clientId");
    if (clientIdParam && clients.length > 0) {
      setValue("client_id", clientIdParam);
    }
  }, [searchParams, clients, setValue]);

  useEffect(() => {
    const loadEvent = async (eventId: string) => {
      try {
        setIsLoading(true);
        const event = await eventService.getById(eventId);
        if (!event) throw new Error('Evento no encontrado');
        
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
          deposit_percent: event.deposit_percent ?? (user?.default_deposit_percent || 50),
          cancellation_days: event.cancellation_days ?? (user?.default_cancellation_days || 15),
          refund_percent: event.refund_percent ?? (user?.default_refund_percent || 0),
          notes: event.notes || "",
        });

        const [eventProducts, eventExtras] = await Promise.all([
          eventService.getProducts(eventId),
          eventService.getExtras(eventId),
        ]);

        if (eventProducts) {
          setSelectedProducts(eventProducts.map((ep: any) => ({
            product_id: ep.product_id,
            quantity: ep.quantity,
            price: ep.unit_price,
            discount: ep.discount || 0,
          })));
        }

        if (eventExtras) {
          setExtras(eventExtras.map((e: any) => ({
            description: e.description,
            cost: e.cost,
            price: e.price,
            exclude_utility: e.exclude_utility || false,
          })));
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
      0
    );

    const normalExtrasTotal = extras
      .filter((e) => !e.exclude_utility)
      .reduce((sum, item) => sum + item.price, 0);

    const passThroughExtrasTotal = extras
      .filter((e) => e.exclude_utility)
      .reduce((sum, item) => sum + item.price, 0);

    const discountableBase = productsSubtotal + normalExtrasTotal;
    const discountedBase = Math.round(discountableBase * (1 - discountValue / 100) * 100) / 100;

    const baseTotal = Math.round((discountedBase + passThroughExtrasTotal) * 100) / 100;
    const taxAmount = requiresInvoiceValue ? Math.round(baseTotal * (taxRateValue / 100) * 100) / 100 : 0;
    const total = Math.round((baseTotal + taxAmount) * 100) / 100;

    setValue("tax_amount", taxAmount);
    setValue("total_amount", total);

    const fetchMissingCosts = async () => {
      const missing = selectedProducts
        .filter((p) => p.product_id && productUnitCosts[p.product_id] === undefined)
        .map((p) => p.product_id);

      if (missing.length === 0) return;

      try {
        const costs = await Promise.all(
          missing.map(async (productId) => {
            const ingredients = await productService.getIngredients(productId);
            const cost = ingredients?.reduce((sum, ing: any) => {
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
  }, [selectedProducts, extras, discountValue, requiresInvoiceValue, taxRateValue, setValue, productUnitCosts]);

  useEffect(() => {
    if (clientIdValue && !locationValue && !cityValue) {
      const selectedClient = clients.find((c) => c.id === clientIdValue);
      if (selectedClient) {
        if (selectedClient.address) setValue("location", selectedClient.address);
        if (selectedClient.city) setValue("city", selectedClient.city);
      }
    }
  }, [clientIdValue, clients, locationValue, cityValue, setValue]);

  const handleAddProduct = () => {
    if (products.length > 0) {
      const product = products[0];
      setSelectedProducts([
        ...selectedProducts,
        { product_id: product.id, quantity: 1, price: product.base_price, discount: 0 },
      ]);
    }
  };

  const handleRemoveProduct = (index: number) => {
    setSelectedProducts(prev => prev.filter((_, i) => i !== index));
  };

  const handleProductChange = (index: number, field: string, value: any) => {
    setSelectedProducts(prev => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: value };
      if (field === "product_id") {
        const product = products.find(p => p.id === value);
        if (product) {
          next[index].price = product.base_price;
          next[index].discount = 0;
        }
      }
      return next;
    });
  };

  const handleAddExtra = () => {
    setExtras([...extras, { description: "", cost: 0, price: 0, exclude_utility: false }]);
  };

  const handleRemoveExtra = (index: number) => {
    setExtras(prev => prev.filter((_, i) => i !== index));
  };

  const handleExtraChange = (index: number, field: string, value: any) => {
    setExtras(prev => {
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
    setClients(prev => [...prev, newClient]);
    // Use queueMicrotask to set value after React state update flushes
    queueMicrotask(() => {
      setValue("client_id", newClient.id, { shouldValidate: true });
    });
  };

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
      const payload = {
        ...data,
        start_time: data.start_time?.trim() ? data.start_time : null,
        end_time: data.end_time?.trim() ? data.end_time : null,
        user_id: user.id,
      };

      let eventId = id;

      if (id) {
        await eventService.update(id, payload);
      } else {
        const newEvent = await eventService.create(payload);
        if (!newEvent || !newEvent.id) throw new Error("Error al crear el evento.");
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
        );
      }

      navigate(`/events/${eventId}/summary`);
    } catch (err: any) {
      logError("Error saving event", err);
      setError(err.message || "Error al guardar el evento. Por favor intenta de nuevo.");
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
    setActiveStep(prev => Math.max(prev - 1, 1));
  };

  if (isLoading || limitsLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-orange"></div>
      </div>
    );
  }

  // If creating new event and limit is reached
  if (!id && !canCreateEvent) {
      return (
          <div className="max-w-4xl mx-auto py-8 px-4">
              <button
                  onClick={() => navigate(-1)}
                  className="mb-6 flex items-center text-sm font-medium text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors"
              >
                  <ArrowLeft className="h-4 w-4 mr-1" />
                  Regresar
              </button>
              <div className="flex justify-center mt-12">
                  <UpgradeBanner type="limit-reached" currentUsage={eventsThisMonth} limit={limit} />
              </div>
          </div>
      );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center">
          <button
            onClick={() => navigate("/calendar")}
            className="mr-4 p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500 dark:text-gray-400"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            {id ? "Editar Evento" : "Nuevo Evento"}
          </h1>
        </div>
        {id && (
          <button
            onClick={() => navigate(`/events/${id}/summary`)}
            className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-xs text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-hidden focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            <FileText className="-ml-1 mr-2 h-5 w-5" />
            Ver Resumen
          </button>
        )}
      </div>

      <nav aria-label="Progress">
        <ol role="list" className="bg-white dark:bg-gray-800 rounded-lg shadow-xs md:flex md:divide-y-0 md:divide-x dark:divide-gray-700 overflow-hidden">
          {STEPS.map((step, stepIdx) => (
            <li key={step.id} className="relative md:flex-1 md:flex">
              <button
                type="button"
                onClick={() => {
                  if (activeStep > step.id) setActiveStep(step.id);
                }}
                disabled={activeStep < step.id}
                className="group flex items-center w-full"
              >
                <span className="px-6 py-4 flex items-center text-sm font-medium">
                  <span
                    className={`shrink-0 w-10 h-10 flex items-center justify-center rounded-full border-2 ${
                      activeStep > step.id
                        ? "bg-brand-orange border-brand-orange"
                        : activeStep === step.id
                        ? "border-brand-orange text-brand-orange"
                        : "border-gray-300 dark:border-gray-600 text-gray-500 dark:text-gray-400"
                    }`}
                  >
                    {activeStep > step.id ? (
                      <CheckCircle className="w-6 h-6 text-white" />
                    ) : (
                      <span>{step.id}</span>
                    )}
                  </span>
                  <span className={`ml-4 text-sm font-medium ${
                    activeStep >= step.id ? 'text-gray-900 dark:text-white' : 'text-gray-500 dark:text-gray-400'
                  }`}>
                    {step.title}
                  </span>
                </span>
              </button>
              {stepIdx !== STEPS.length - 1 && (
                <div className="hidden md:block absolute top-0 right-0 h-full w-5" aria-hidden="true">
                  <svg className="h-full w-full text-gray-300 dark:text-gray-700" viewBox="0 0 22 80" fill="none" preserveAspectRatio="none">
                    <path d="M0 -2L20 40L0 82" vectorEffect="non-scaling-stroke" stroke="currentcolor" strokeLinejoin="round" />
                  </svg>
                </div>
              )}
            </li>
          ))}
        </ol>
      </nav>

      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border-l-4 border-red-400 p-4 rounded-md">
          <div className="flex">
            <AlertCircle className="h-5 w-5 text-red-500" />
            <div className="ml-3">
              <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
            </div>
          </div>
        </div>
      )}

      {isSubmitted && !isValid && (
        <div className="bg-amber-50 dark:bg-amber-900/20 border-l-4 border-amber-400 p-4 rounded-md">
          <div className="flex">
            <AlertCircle className="h-5 w-5 text-amber-500" />
            <div className="ml-3">
              <p className="text-sm text-amber-700 dark:text-amber-300 font-medium">Hay errores en el formulario. Por favor revisa todos los pasos.</p>
              <ul className="mt-2 text-xs text-amber-600 dark:text-amber-400 list-disc list-inside">
                {Object.entries(errors).map(([key, err]) => (
                  <li key={key}>{key}: {(err as any).message}</li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}

      <FormProvider {...methods}>
        <form 
          onSubmit={handleSubmit(onSubmit as any)} 
          className="space-y-6"
          onKeyDown={(e) => {
            if (e.key === "Enter" && (e.target as HTMLElement).tagName !== "TEXTAREA") {
              e.preventDefault();
            }
          }}
        >
          <div className="bg-white dark:bg-gray-800 shadow-sm rounded-lg p-6">
            {activeStep === 1 && (
              <EventGeneralInfo clients={clients as any} clientIdValue={clientIdValue} onClientCreated={handleClientCreated as any} />
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
              <EventFinancials
                selectedProducts={selectedProducts as any}
                extras={extras}
                productUnitCosts={productUnitCosts}
              />
            )}
          </div>

          <div className="flex justify-between pt-4">
            <button
              type="button"
              onClick={prevStep}
              disabled={activeStep === 1}
              className={`px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-xs text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 ${activeStep === 1 ? 'invisible' : ''}`}
            >
              Anterior
            </button>
            
            {activeStep < STEPS.length ? (
              <button
                type="button"
                onClick={nextStep}
                disabled={isStepLoading}
                className="inline-flex justify-center py-2 px-4 border border-transparent shadow-xs text-sm font-medium rounded-md text-white bg-brand-orange hover:bg-orange-600 focus:outline-hidden focus:ring-2 focus:ring-offset-2 focus:ring-brand-orange disabled:opacity-50"
              >
                {isStepLoading ? "Cargando..." : "Siguiente"}
                <ChevronRight className="ml-2 h-4 w-4" />
              </button>
            ) : (
              <button
                type="button"
                onClick={handleSubmit(onSubmit)}
                disabled={isLoading || isStepLoading}
                className="inline-flex justify-center py-2 px-4 border border-transparent shadow-xs text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700 focus:outline-hidden focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50"
              >
                <Save className="h-5 w-5 mr-2" />
                {isLoading ? "Guardando..." : "Guardar Evento"}
              </button>
            )}
          </div>
        </form>
      </FormProvider>
    </div>
  );
};
