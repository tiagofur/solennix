import React, { useEffect, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { useForm, FormProvider, useWatch } from "react-hook-form";
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
} from "lucide-react";
import { Database } from "../../types/supabase";
import { logError } from "../../lib/errorHandler";
import { EventGeneralInfo } from "./components/EventGeneralInfo";
import { EventProducts } from "./components/EventProducts";
import { EventExtras } from "./components/EventExtras";
import { EventFinancials } from "./components/EventFinancials";

type Client = Database["public"]["Tables"]["clients"]["Row"];
type Product = Database["public"]["Tables"]["products"]["Row"];

const eventSchema = z.object({
  client_id: z.string().min(1, "Selecciona un cliente"),
  event_date: z.string().min(1, "Selecciona una fecha"),
  start_time: z.string().optional(),
  end_time: z.string().optional(),
  service_type: z.string().min(2, "Tipo de servicio requerido"),
  num_people: z.coerce.number().min(1, "Mínimo 1 persona"),
  status: z.enum(["quoted", "confirmed", "completed", "cancelled"]),
  discount: z.coerce.number().min(0),
  requires_invoice: z.boolean(),
  tax_rate: z.coerce.number().min(0).max(100),
  tax_amount: z.coerce.number().min(0),
  total_amount: z.coerce.number().min(0),
  location: z.string().optional(),
  city: z.string().optional(),
  deposit_percent: z.coerce.number().min(0).max(100),
  cancellation_days: z.coerce.number().min(0),
  refund_percent: z.coerce.number().min(0).max(100),
  notes: z.string().optional(),
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
  const { user, profile } = useAuth();

  const [activeStep, setActiveStep] = useState(1);
  const [clients, setClients] = useState<Client[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
    resolver: zodResolver(eventSchema) as any,
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
      deposit_percent: profile?.default_deposit_percent || 50,
      cancellation_days: profile?.default_cancellation_days || 15,
      refund_percent: profile?.default_refund_percent || 0,
      notes: "",
    },
  });

  const { handleSubmit, reset, setValue, control, watch } = methods;

  const discountValue = useWatch({ control, name: "discount" }) || 0;
  const clientIdValue = useWatch({ control, name: "client_id" });
  const locationValue = useWatch({ control, name: "location" });
  const cityValue = useWatch({ control, name: "city" });
  const requiresInvoiceValue = useWatch({ control, name: "requires_invoice" }) || false;
  const taxRateValue = useWatch({ control, name: "tax_rate" }) || 16;

  const clientIdParam = searchParams.get("clientId");

  // --- Effects ---

  useEffect(() => {
    loadDependencies();
  }, []);

  useEffect(() => {
    if (clientIdParam) {
      setValue("client_id", clientIdParam);
    }
  }, [clientIdParam, clients, setValue]);

  useEffect(() => {
    if (id) {
      loadEvent(id);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  // Recalculate totals
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
    const discountedBase = discountableBase * (1 - discountValue / 100);

    const baseTotal = discountedBase + passThroughExtrasTotal;
    const taxAmount = requiresInvoiceValue ? baseTotal * (taxRateValue / 100) : 0;
    const total = baseTotal + taxAmount;

    setValue("tax_amount", taxAmount);
    setValue("total_amount", total);

    // Fetch costs logic
    let isActive = true;
    const fetchMissingCosts = async () => {
      const missing = selectedProducts
        .filter((p) => p.product_id && productUnitCosts[p.product_id] === undefined)
        .map((p) => p.product_id);

      if (missing.length === 0) return;

      try {
        const costs = await Promise.all(
          missing.map(async (productId) => {
            const ingredients = await productService.getIngredients(productId);
            const cost =
              ingredients?.reduce((sum, ing: any) => {
                const unitCost = ing.inventory?.unit_cost || 0;
                return sum + ing.quantity_required * unitCost;
              }, 0) || 0;
            return { productId, cost };
          }),
        );

        if (!isActive) return;
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
    return () => { isActive = false; };
  }, [selectedProducts, extras, discountValue, requiresInvoiceValue, taxRateValue, productUnitCosts, setValue]);

  // Auto-fill address
  useEffect(() => {
    if (clientIdValue) {
      const selectedClient = clients.find((c) => c.id === clientIdValue);
      if (selectedClient) {
        if (!locationValue && selectedClient.address) {
          setValue("location", selectedClient.address);
        }
        if (!cityValue && selectedClient.city) {
          setValue("city", selectedClient.city);
        }
      }
    }
  }, [clientIdValue, clients, locationValue, cityValue, setValue]);

  // --- Loaders ---

  const loadDependencies = async () => {
    try {
      const [clientsData, productsData] = await Promise.all([
        clientService.getAll(),
        productService.getAll(),
      ]);
      setClients(clientsData);
      setProducts(productsData);
    } catch (err) {
      logError("Error loading dependencies", err);
    }
  };

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
        status: event.status || "quoted",
        discount: event.discount || 0,
        requires_invoice: event.requires_invoice || false,
        tax_rate: event.tax_rate || 16,
        tax_amount: event.tax_amount || 0,
        total_amount: event.total_amount || 0,
        location: event.location || "",
        city: event.city || "",
        deposit_percent: event.deposit_percent ?? (profile?.default_deposit_percent || 50),
        cancellation_days: event.cancellation_days ?? (profile?.default_cancellation_days || 15),
        refund_percent: event.refund_percent ?? (profile?.default_refund_percent || 0),
        notes: event.notes || "",
      });

      const eventProducts = await eventService.getProducts(eventId);
      if (eventProducts) {
        setSelectedProducts(
          eventProducts.map((ep: any) => ({
            product_id: ep.product_id,
            quantity: ep.quantity,
            price: ep.unit_price,
            discount: (ep as any).discount || 0,
          })),
        );
      }

      const eventExtras = await eventService.getExtras(eventId);
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
    } catch (err) {
      logError("Error loading event", err);
      setError("Error al cargar el evento");
    } finally {
      setIsLoading(false);
    }
  };

  // --- Handlers ---

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
    const newProducts = [...selectedProducts];
    newProducts.splice(index, 1);
    setSelectedProducts(newProducts);
  };

  const handleProductChange = (index: number, field: any, value: any) => {
    const newProducts = [...selectedProducts];
    newProducts[index] = { ...newProducts[index], [field]: value };

    if (field === "product_id") {
      const product = products.find((p) => p.id === value);
      if (product) {
        newProducts[index].price = product.base_price;
        newProducts[index].discount = 0;
      }
    }
    setSelectedProducts(newProducts);
  };

  const handleAddExtra = () => {
    setExtras([...extras, { description: "", cost: 0, price: 0, exclude_utility: false }]);
  };

  const handleRemoveExtra = (index: number) => {
    const newExtras = [...extras];
    newExtras.splice(index, 1);
    setExtras(newExtras);
  };

  const handleExtraChange = (index: number, field: any, value: any) => {
    const newExtras = [...extras];
    newExtras[index] = { ...newExtras[index], [field]: value };

    if (field === "exclude_utility" && value === true) {
      newExtras[index].price = newExtras[index].cost;
    }
    if (field === "cost" && newExtras[index].exclude_utility) {
      newExtras[index].price = Number(value);
    }
    setExtras(newExtras);
  };

  const onSubmit = async (data: EventFormData) => {
    if (!user) return;
    setIsLoading(true);
    setError(null);

    try {
      let eventId = id;
      if (id) {
        await eventService.update(id, data);
      } else {
        const newEvent = await eventService.create({ ...data, user_id: user.id });
        if (!newEvent) throw new Error('Error al crear el evento');
        eventId = newEvent.id;
      }

      if (eventId) {
        const productsToSave = selectedProducts.map((p) => ({
          productId: p.product_id,
          quantity: p.quantity,
          unitPrice: p.price,
          discount: p.discount,
        }));
        await eventService.updateItems(eventId, productsToSave, extras);
      }
      navigate("/calendar");
    } catch (err: any) {
      logError("Error saving event", err);
      setError(err.message || "Error al guardar el evento");
    } finally {
      setIsLoading(false);
    }
  };

  const nextStep = async () => {
    const isValid = await methods.trigger();
    if (isValid) {
      setActiveStep((prev) => Math.min(prev + 1, STEPS.length));
    }
  };

  const prevStep = () => {
    setActiveStep((prev) => Math.max(prev - 1, 1));
  };

  return (
    <div className="space-y-6">
      {/* Header */}
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
            className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            <FileText className="-ml-1 mr-2 h-5 w-5" />
            Ver Resumen
          </button>
        )}
      </div>

      {/* Stepper */}
      <nav aria-label="Progress">
        <ol role="list" className="bg-white dark:bg-gray-800 rounded-lg shadow-sm md:flex md:divide-y-0 md:divide-x dark:divide-gray-700 overflow-hidden">
          {STEPS.map((step, stepIdx) => (
            <li key={step.id} className="relative md:flex-1 md:flex">
              <button
                onClick={() => {
                  if (activeStep > step.id) setActiveStep(step.id);
                }}
                disabled={activeStep < step.id}
                className="group flex items-center w-full"
              >
                <span className="px-6 py-4 flex items-center text-sm font-medium">
                  <span
                    className={`flex-shrink-0 w-10 h-10 flex items-center justify-center rounded-full border-2 ${
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
                  <svg
                    className="h-full w-full text-gray-300 dark:text-gray-700"
                    viewBox="0 0 22 80"
                    fill="none"
                    preserveAspectRatio="none"
                  >
                    <path
                      d="M0 -2L20 40L0 82"
                      vectorEffect="non-scaling-stroke"
                      stroke="currentcolor"
                      strokeLinejoin="round"
                    />
                  </svg>
                </div>
              )}
            </li>
          ))}
        </ol>
      </nav>

      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border-l-4 border-red-400 p-4">
          <div className="flex">
            <div className="ml-3">
              <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      <FormProvider {...methods}>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
            {activeStep === 1 && (
              <EventGeneralInfo clients={clients} clientIdValue={clientIdValue} />
            )}
            {activeStep === 2 && (
              <EventProducts
                products={products}
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
                selectedProducts={selectedProducts}
                extras={extras}
                productUnitCosts={productUnitCosts}
              />
            )}
          </div>

          {/* Navigation Buttons */}
          <div className="flex justify-between pt-4">
            <button
              type="button"
              onClick={prevStep}
              disabled={activeStep === 1}
              className={`px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 ${
                activeStep === 1 ? 'invisible' : ''
              }`}
            >
              Anterior
            </button>
            
            {activeStep < STEPS.length ? (
              <button
                type="button"
                onClick={nextStep}
                className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-brand-orange hover:bg-orange-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-orange"
              >
                Siguiente
                <ChevronRight className="ml-2 h-4 w-4" />
              </button>
            ) : (
              <button
                type="submit"
                disabled={isLoading}
                className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50"
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
