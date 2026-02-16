import React, { useEffect, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { eventService } from "../../services/eventService";
import { clientService } from "../../services/clientService";
import { productService } from "../../services/productService";
import { useAuth } from "../../contexts/AuthContext";
import {
  ArrowLeft,
  Save,
  Plus,
  Trash2,
  Calculator,
  FileText,
  Users,
} from "lucide-react";
import { Database } from "../../types/supabase";

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

export const EventForm: React.FC = () => {
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user, profile } = useAuth();

  const [clients, setClients] = useState<Client[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Local state for calculator items
  const [selectedProducts, setSelectedProducts] = useState<
    { product_id: string; quantity: number; price: number; discount: number }[]
  >([]);

  // Local state for extras
  const [extras, setExtras] = useState<
    {
      description: string;
      cost: number;
      price: number;
      exclude_utility: boolean;
    }[]
  >([]);

  // State for product unit costs (calculated from ingredients)
  const [productUnitCosts, setProductUnitCosts] = useState<{
    [key: string]: number;
  }>({});

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    control,
    formState: { errors },
  } = useForm<EventFormData>({
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

  const discountValue = useWatch({ control, name: "discount" }) || 0;
  const clientIdValue = useWatch({ control, name: "client_id" });
  const locationValue = useWatch({ control, name: "location" });
  const cityValue = useWatch({ control, name: "city" });
  const numPeopleValue = useWatch({ control, name: "num_people" }) || 1;
  const totalAmountValue = useWatch({ control, name: "total_amount" }) || 0;
  const requiresInvoiceValue = useWatch({ control, name: "requires_invoice" }) || false;
  const taxRateValue = useWatch({ control, name: "tax_rate" }) || 16;
  const taxAmountValue = useWatch({ control, name: "tax_amount" }) || 0;

  const clientIdParam = searchParams.get("clientId");

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
  }, [id]);

  // Recalculate total when selected products change
  useEffect(() => {
    // Subtotal with per-product discount applied first
    const productsSubtotal = selectedProducts.reduce(
      (sum, item) => sum + (item.price - (item.discount || 0)) * item.quantity,
      0,
    );

    // Split extras into normal and excluded-utility (pass-through)
    const normalExtrasTotal = extras
      .filter((e) => !e.exclude_utility)
      .reduce((sum, item) => sum + item.price, 0);

    const passThroughExtrasTotal = extras
      .filter((e) => e.exclude_utility)
      .reduce((sum, item) => sum + item.price, 0);

    // Apply global discount ONLY to products and normal extras
    const discountableBase = productsSubtotal + normalExtrasTotal;
    const discountedBase = discountableBase * (1 - discountValue / 100);

    // Total base (sin IVA)
    const baseTotal = discountedBase + passThroughExtrasTotal;

    const taxAmount = requiresInvoiceValue ? baseTotal * (taxRateValue / 100) : 0;
    const total = baseTotal + taxAmount;

    setValue("tax_amount", taxAmount);
    setValue("total_amount", total);

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
        console.error("Error fetching ingredients for products", err);
      }
    };

    fetchMissingCosts();

    return () => {
      isActive = false;
    };
  }, [selectedProducts, extras, discountValue, requiresInvoiceValue, taxRateValue, productUnitCosts, setValue]);

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

  const loadDependencies = async () => {
    try {
      const [clientsData, productsData] = await Promise.all([
        clientService.getAll(),
        productService.getAll(),
      ]);
      setClients(clientsData);
      setProducts(productsData);
    } catch (err) {
      console.error("Error loading dependencies:", err);
    }
  };

  const loadEvent = async (eventId: string) => {
    try {
      setIsLoading(true);
      const event = await eventService.getById(eventId);
      if (!event) {
        throw new Error('Evento no encontrado');
      }
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
        deposit_percent:
          event.deposit_percent ?? (profile?.default_deposit_percent || 50),
        cancellation_days:
          event.cancellation_days ??
          (profile?.default_cancellation_days || 15),
        refund_percent:
          event.refund_percent ?? (profile?.default_refund_percent || 0),
        notes: event.notes || "",
      });
      // Load event products
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

      // Load event extras
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
      console.error("Error loading event:", err);
      setError("Error al cargar el evento");
    } finally {
      setIsLoading(false);
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
    }
  };

  const handleRemoveProduct = (index: number) => {
    const newProducts = [...selectedProducts];
    newProducts.splice(index, 1);
    setSelectedProducts(newProducts);
  };

  const handleProductChange = (
    index: number,
    field: "product_id" | "quantity" | "price" | "discount",
    value: any,
  ) => {
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
    setExtras([
      ...extras,
      { description: "", cost: 0, price: 0, exclude_utility: false },
    ]);
  };

  const handleRemoveExtra = (index: number) => {
    const newExtras = [...extras];
    newExtras.splice(index, 1);
    setExtras(newExtras);
  };

  const handleExtraChange = (
    index: number,
    field: "description" | "cost" | "price" | "exclude_utility",
    value: any,
  ) => {
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
        await eventService.update(id, {
          ...data,
        });
      } else {
        const newEvent = await eventService.create({
          ...data,
          user_id: user.id,
        });
        if (!newEvent) {
          throw new Error('Error al crear el evento');
        }
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
      console.error("Error saving event:", err);
      setError(err.message || "Error al guardar el evento");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center">
          <button
            onClick={() => navigate("/calendar")}
            className="mr-4 p-2 rounded-full hover:bg-gray-100 text-gray-500"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <h1 className="text-2xl font-bold text-gray-900">
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

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Formulario Principal */}
        <div className="lg:col-span-2 bg-white shadow px-4 py-5 sm:rounded-lg sm:p-6">
          <form
            id="event-form"
            onSubmit={handleSubmit(onSubmit)}
            className="space-y-6"
          >
            <input type="hidden" {...register("tax_rate")} />
            <input type="hidden" {...register("tax_amount")} />
            {error && (
              <div className="bg-red-50 border-l-4 border-red-400 p-4">
                <div className="flex">
                  <div className="ml-3">
                    <p className="text-sm text-red-700">{error}</p>
                  </div>
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 gap-y-6 gap-x-4 sm:grid-cols-6">
              <div className="sm:col-span-3">
                <label
                  htmlFor="client_id"
                  className="block text-sm font-medium text-gray-700"
                >
                  Cliente *
                </label>
                <div className="mt-1">
                  <select
                    {...register("client_id")}
                    className="shadow-sm focus:ring-brand-orange focus:border-brand-orange block w-full sm:text-sm border-gray-300 rounded-md p-2 border"
                  >
                    <option value="">Seleccionar cliente</option>
                    {clients.map((client) => (
                      <option key={client.id} value={client.id}>
                        {client.name}
                      </option>
                    ))}
                  </select>
                  {errors.client_id && (
                    <p className="mt-2 text-sm text-red-600">
                      {errors.client_id.message}
                    </p>
                  )}
                  {clientIdValue && (
                    <div className="mt-2 text-xs text-gray-500 bg-gray-50 p-2 rounded border">
                      {(() => {
                        const selectedClient = clients.find(
                          (c) => c.id === clientIdValue,
                        );
                        if (selectedClient) {
                          return (
                            <>
                              <span className="font-medium">
                                Historial del Cliente:
                              </span>{" "}
                              {selectedClient.total_events} eventos realizados,
                              Total gastado: $
                              {selectedClient.total_spent?.toFixed(2) || "0.00"}
                            </>
                          );
                        }
                        return null;
                      })()}
                    </div>
                  )}
                </div>
              </div>

              <div className="sm:col-span-3">
                <label
                  htmlFor="event_date"
                  className="block text-sm font-medium text-gray-700"
                >
                  Fecha del Evento *
                </label>
                <div className="mt-1">
                  <input
                    type="date"
                    {...register("event_date")}
                    className="shadow-sm focus:ring-brand-orange focus:border-brand-orange block w-full sm:text-sm border-gray-300 rounded-md p-2 border"
                  />
                  {errors.event_date && (
                    <p className="mt-2 text-sm text-red-600">
                      {errors.event_date.message}
                    </p>
                  )}
                </div>
              </div>

              <div className="sm:col-span-3 grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label
                    htmlFor="start_time"
                    className="block text-sm font-medium text-gray-700"
                  >
                    Hora de Inicio
                  </label>
                  <div className="mt-1">
                    <input
                      type="time"
                      {...register("start_time")}
                      className="shadow-sm focus:ring-brand-orange focus:border-brand-orange block w-full sm:text-sm border-gray-300 rounded-md p-2 border"
                    />
                  </div>
                </div>
                <div>
                  <label
                    htmlFor="end_time"
                    className="block text-sm font-medium text-gray-700"
                  >
                    Hora de Fin
                  </label>
                  <div className="mt-1">
                    <input
                      type="time"
                      {...register("end_time")}
                      className="shadow-sm focus:ring-brand-orange focus:border-brand-orange block w-full sm:text-sm border-gray-300 rounded-md p-2 border"
                    />
                  </div>
                </div>
              </div>

              <div className="sm:col-span-3">
                <label
                  htmlFor="service_type"
                  className="block text-sm font-medium text-gray-700"
                >
                  Tipo de Servicio *
                </label>
                <div className="mt-1">
                  <input
                    type="text"
                    {...register("service_type")}
                    placeholder="Ej. Barra de Churros"
                    className="shadow-sm focus:ring-brand-orange focus:border-brand-orange block w-full sm:text-sm border-gray-300 rounded-md p-2 border"
                  />
                  {errors.service_type && (
                    <p className="mt-2 text-sm text-red-600">
                      {errors.service_type.message}
                    </p>
                  )}
                </div>
              </div>

              <div className="sm:col-span-3">
                <label
                  htmlFor="num_people"
                  className="block text-sm font-medium text-gray-700"
                >
                  Número de Personas *
                </label>
                <div className="mt-1">
                  <input
                    type="number"
                    {...register("num_people")}
                    className="shadow-sm focus:ring-brand-orange focus:border-brand-orange block w-full sm:text-sm border-gray-300 rounded-md p-2 border"
                  />
                  {errors.num_people && (
                    <p className="mt-2 text-sm text-red-600">
                      {errors.num_people.message}
                    </p>
                  )}
                </div>
              </div>

              <div className="sm:col-span-3">
                <label
                  htmlFor="status"
                  className="block text-sm font-medium text-gray-700"
                >
                  Estado *
                </label>
                <div className="mt-1">
                  <select
                    {...register("status")}
                    className="shadow-sm focus:ring-brand-orange focus:border-brand-orange block w-full sm:text-sm border-gray-300 rounded-md p-2 border"
                  >
                    <option value="quoted">Cotizado</option>
                    <option value="confirmed">Confirmado</option>
                    <option value="completed">Completado</option>
                    <option value="cancelled">Cancelado</option>
                  </select>
                </div>
              </div>

              <div className="sm:col-span-3">
                <label className="block text-sm font-medium text-gray-700">
                  Facturación
                </label>
                <div className="mt-2 flex items-center gap-3">
                  <input
                    type="checkbox"
                    {...register("requires_invoice")}
                    className="h-4 w-4 text-brand-orange border-gray-300 rounded focus:ring-brand-orange"
                  />
                  <span className="text-sm text-gray-700">
                    Requiere factura (IVA {taxRateValue}%)
                  </span>
                </div>
              </div>

              <div className="sm:col-span-6">
                <label
                  htmlFor="location"
                  className="block text-sm font-medium text-gray-700"
                >
                  Ubicación del Evento
                </label>
                <div className="mt-1">
                  <input
                    type="text"
                    {...register("location")}
                    placeholder="Dirección del evento (opcional, por defecto dirección del cliente)"
                    className="shadow-sm focus:ring-brand-orange focus:border-brand-orange block w-full sm:text-sm border-gray-300 rounded-md p-2 border"
                  />
                </div>
              </div>

              <div className="sm:col-span-6">
                <label
                  htmlFor="city"
                  className="block text-sm font-medium text-gray-700"
                >
                  Ciudad del Evento
                </label>
                <div className="mt-1">
                  <input
                    type="text"
                    {...register("city")}
                    placeholder="Ciudad del evento (para contrato)"
                    className="shadow-sm focus:ring-brand-orange focus:border-brand-orange block w-full sm:text-sm border-gray-300 rounded-md p-2 border"
                  />
                </div>
              </div>

              <div className="sm:col-span-2">
                <label className="block text-sm font-medium text-gray-700">
                  Anticipo (%)
                </label>
                <div className="mt-1">
                  <input
                    type="number"
                    {...register("deposit_percent")}
                    max="100"
                    min="0"
                    className="shadow-sm focus:ring-brand-orange focus:border-brand-orange block w-full sm:text-sm border-gray-300 rounded-md p-2 border"
                  />
                  {errors.deposit_percent && (
                    <p className="mt-2 text-sm text-red-600">
                      {errors.deposit_percent.message}
                    </p>
                  )}
                </div>
              </div>

              <div className="sm:col-span-2">
                <label className="block text-sm font-medium text-gray-700">
                  Días Cancelación
                </label>
                <div className="mt-1">
                  <input
                    type="number"
                    {...register("cancellation_days")}
                    min="0"
                    className="shadow-sm focus:ring-brand-orange focus:border-brand-orange block w-full sm:text-sm border-gray-300 rounded-md p-2 border"
                  />
                  {errors.cancellation_days && (
                    <p className="mt-2 text-sm text-red-600">
                      {errors.cancellation_days.message}
                    </p>
                  )}
                </div>
              </div>

              <div className="sm:col-span-2">
                <label className="block text-sm font-medium text-gray-700">
                  Reembolso Anticipo (%)
                </label>
                <div className="mt-1">
                  <input
                    type="number"
                    {...register("refund_percent")}
                    max="100"
                    min="0"
                    className="shadow-sm focus:ring-brand-orange focus:border-brand-orange block w-full sm:text-sm border-gray-300 rounded-md p-2 border"
                  />
                  {errors.refund_percent && (
                    <p className="mt-2 text-sm text-red-600">
                      {errors.refund_percent.message}
                    </p>
                  )}
                </div>
              </div>

              <div className="sm:col-span-6">
                <label
                  htmlFor="notes"
                  className="block text-sm font-medium text-gray-700"
                >
                  Notas
                </label>
                <div className="mt-1">
                  <textarea
                    {...register("notes")}
                    rows={3}
                    className="shadow-sm focus:ring-brand-orange focus:border-brand-orange block w-full sm:text-sm border-gray-300 rounded-md p-2 border"
                  />
                </div>
              </div>
            </div>
          </form>
        </div>

        {/* Calculadora */}
        <div className="lg:col-span-1 bg-white shadow px-4 py-5 sm:rounded-lg sm:p-6 flex flex-col">
          <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4 flex items-center">
            <Calculator className="h-5 w-5 mr-2 text-brand-orange" />
            Calculadora de Costos
          </h3>

          <div className="flex-1 overflow-y-auto mb-4 space-y-3">
            <h4 className="text-sm font-medium text-gray-700">Productos</h4>
            {selectedProducts.map((item, index) => (
              <div
                key={index}
                className="bg-gray-50 p-3 rounded-md relative group"
              >
                <button
                  type="button"
                  onClick={() => handleRemoveProduct(index)}
                  className="absolute top-1 right-1 text-gray-400 hover:text-red-500"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
                <div className="mb-2 pr-6">
                  <select
                    value={item.product_id}
                    onChange={(e) =>
                      handleProductChange(index, "product_id", e.target.value)
                    }
                    className="block w-full text-sm border-gray-300 rounded-md shadow-sm focus:ring-brand-orange focus:border-brand-orange"
                  >
                    <option value="">Seleccionar producto</option>
                    {products.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="flex gap-2">
                  <div className="w-[20%]">
                    <label className="text-xs text-gray-500 block">Cant.</label>
                    <div className="flex rounded-md shadow-sm">
                      <input
                        type="number"
                        value={item.quantity}
                        onChange={(e) =>
                          handleProductChange(
                            index,
                            "quantity",
                            Number(e.target.value),
                          )
                        }
                        className="flex-1 min-w-0 block w-full px-2 py-2 rounded-none rounded-l-md text-sm border-gray-300 focus:ring-brand-orange focus:border-brand-orange border"
                      />
                      <button
                        type="button"
                        onClick={() =>
                          handleProductChange(
                            index,
                            "quantity",
                            Number(numPeopleValue || 1),
                          )
                        }
                        title="Igualar a personas"
                        className="inline-flex items-center px-2 rounded-r-md border border-l-0 border-gray-300 bg-gray-50 text-gray-500 sm:text-sm hover:bg-gray-100"
                      >
                        <Users className="h-3 w-3" />
                      </button>
                    </div>
                  </div>
                  <div className="w-[25%]">
                    <label className="text-xs text-gray-500 block">
                      Precio Unit.
                    </label>
                    <input
                      type="number"
                      value={item.price}
                      readOnly
                      className="block w-full text-sm border-gray-300 rounded-md shadow-sm bg-gray-100 text-gray-500 p-2 border cursor-not-allowed"
                    />
                  </div>
                  <div className="w-[20%]">
                    <label className="text-xs text-gray-500 block">
                      Desc. Unit.
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={item.discount || 0}
                      onChange={(e) => {
                        const val = Number(e.target.value);
                        if (val >= 0) {
                          handleProductChange(index, "discount", val);
                        }
                      }}
                      className="block w-full text-sm border-gray-300 rounded-md shadow-sm focus:ring-brand-orange focus:border-brand-orange p-2 border"
                    />
                  </div>
                  <div className="w-[30%]">
                    <label className="text-xs text-gray-500 block">Total</label>
                    <input
                      type="number"
                      value={(
                        (item.price - (item.discount || 0)) *
                        item.quantity
                      ).toFixed(2)}
                      onChange={(e) => {
                        const newTotal = Number(e.target.value);
                        const maxTotal = item.price * item.quantity;
                        if (newTotal <= maxTotal && newTotal >= 0) {
                          const newDiscount =
                            item.quantity > 0
                              ? item.price - newTotal / item.quantity
                              : 0;
                          handleProductChange(index, "discount", newDiscount);
                        }
                      }}
                      className="block w-full text-sm border-gray-300 rounded-md shadow-sm focus:ring-brand-orange focus:border-brand-orange p-2 border"
                    />
                  </div>
                </div>
                {item.product_id &&
                  productUnitCosts[item.product_id] !== undefined && (
                    <div className="mt-1 text-xs text-gray-400">
                      Costo est. unitario: $
                      {productUnitCosts[item.product_id].toFixed(2)}
                    </div>
                  )}
              </div>
            ))}

            <button
              type="button"
              onClick={handleAddProduct}
              className="w-full flex items-center justify-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
            >
              <Plus className="h-4 w-4 mr-2" /> Agregar Producto
            </button>

            <div className="border-t pt-4 mt-4">
              <h4 className="text-sm font-medium text-gray-700 mb-2">
                Extras (Transporte, Personal, etc.)
              </h4>
              {extras.map((item, index) => (
                <div
                  key={`extra-${index}`}
                  className="bg-gray-50 p-3 rounded-md relative group mb-3"
                >
                  <button
                    type="button"
                    onClick={() => handleRemoveExtra(index)}
                    className="absolute top-1 right-1 text-gray-400 hover:text-red-500"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                  <div className="mb-2 pr-6">
                    <input
                      type="text"
                      placeholder="Descripción"
                      value={item.description}
                      onChange={(e) =>
                        handleExtraChange(index, "description", e.target.value)
                      }
                      className="block w-full text-sm border-gray-300 rounded-md shadow-sm focus:ring-brand-orange focus:border-brand-orange"
                    />
                  </div>
                  <div className="flex items-center mb-2">
                    <input
                      type="checkbox"
                      checked={item.exclude_utility || false}
                      onChange={(e) =>
                        handleExtraChange(
                          index,
                          "exclude_utility",
                          e.target.checked,
                        )
                      }
                      className="h-4 w-4 text-brand-orange focus:ring-brand-orange border-gray-300 rounded"
                    />
                    <label className="ml-2 text-xs text-gray-500">
                      Solo cobrar costo (Sin utilidad)
                    </label>
                  </div>
                  <div className="flex gap-2">
                    <div className="w-1/2">
                      <label className="text-xs text-gray-500">
                        Costo (Gasto)
                      </label>
                      <input
                        type="number"
                        value={item.cost}
                        onChange={(e) =>
                          handleExtraChange(
                            index,
                            "cost",
                            Number(e.target.value),
                          )
                        }
                        className="block w-full text-sm border-gray-300 rounded-md shadow-sm focus:ring-brand-orange focus:border-brand-orange"
                      />
                    </div>
                    <div className="w-1/2">
                      <label className="text-xs text-gray-500">
                        Precio (Cobro)
                      </label>
                      <input
                        type="number"
                        value={item.price}
                        disabled={item.exclude_utility}
                        onChange={(e) =>
                          handleExtraChange(
                            index,
                            "price",
                            Number(e.target.value),
                          )
                        }
                        className={`block w-full text-sm border-gray-300 rounded-md shadow-sm focus:ring-brand-orange focus:border-brand-orange ${
                          item.exclude_utility ? "bg-gray-100" : ""
                        }`}
                      />
                    </div>
                  </div>
                </div>
              ))}
              <button
                type="button"
                onClick={handleAddExtra}
                className="w-full flex items-center justify-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
              >
                <Plus className="h-4 w-4 mr-2" /> Agregar Extra
              </button>
            </div>
          </div>

          <div className="border-t pt-4 space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-500">Subtotal Productos</span>
              <span className="text-sm font-medium text-gray-900">
                $
                {selectedProducts
                  .reduce(
                    (sum, item) =>
                      sum + (item.price - (item.discount || 0)) * item.quantity,
                    0,
                  )
                  .toFixed(2)}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-500">Subtotal Extras</span>
              <span className="text-sm font-medium text-gray-900">
                ${extras.reduce((sum, item) => sum + item.price, 0).toFixed(2)}
              </span>
            </div>
            <div className="bg-yellow-50 p-2 rounded flex justify-between items-center">
              <span className="text-sm font-semibold text-gray-700">💰 Descuento General (%)</span>
              <input
                type="number"
                min="0"
                max="100"
                step="0.01"
                {...register("discount")}
                placeholder="0"
                className="w-20 text-right text-sm border-gray-300 rounded-md shadow-sm focus:ring-brand-orange focus:border-brand-orange p-2 font-semibold"
              />
            </div>
            {discountValue > 0 && (
              <div className="flex justify-between items-center bg-yellow-50 px-2 py-1 rounded">
                <span className="text-sm text-gray-600">Ahorro aplicado:</span>
                <span className="text-sm font-semibold text-green-600">
                  -$
                  {(() => {
                    const productsSubtotal = selectedProducts.reduce(
                      (sum, item) => sum + item.price * item.quantity,
                      0,
                    );
                    const normalExtrasTotal = extras
                      .filter((e) => !e.exclude_utility)
                      .reduce((sum, item) => sum + item.price, 0);
                    const discountableBase = productsSubtotal + normalExtrasTotal;
                    const discountAmount = discountableBase * (discountValue / 100);
                    return discountAmount.toFixed(2);
                  })()}
                </span>
              </div>
            )}
            {requiresInvoiceValue && (
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-500">IVA ({taxRateValue}%)</span>
                <span className="text-sm font-medium text-gray-900">
                  ${taxAmountValue.toFixed(2)}
                </span>
              </div>
            )}
            <div className="flex justify-between items-center pt-2 border-t">
              <span className="text-base font-bold text-gray-900">
                Total {requiresInvoiceValue ? "con IVA" : "Venta"}
              </span>
              <span className="text-xl font-bold text-brand-orange">
                ${totalAmountValue.toFixed(2)}
              </span>
            </div>

            {/* Resumen Financiero */}
            <div className="mt-4 pt-4 border-t border-gray-200">
              <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                Resumen Financiero
              </h4>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div className="text-gray-500">Costo Ingredientes:</div>
                <div className="text-right font-medium">
                  $
                  {selectedProducts
                    .reduce(
                      (sum, p) =>
                        sum +
                        (productUnitCosts[p.product_id] || 0) * p.quantity,
                      0,
                    )
                    .toFixed(2)}
                </div>
                <div className="text-gray-500">Costo Extras:</div>
                <div className="text-right font-medium">
                  ${extras.reduce((sum, e) => sum + e.cost, 0).toFixed(2)}
                </div>
                <div className="text-gray-900 font-bold border-t pt-1 mt-1">
                  Costo Total:
                </div>
                <div className="text-right font-bold border-t pt-1 mt-1">
                  $
                  {(
                    selectedProducts.reduce(
                      (sum, p) =>
                        sum +
                        (productUnitCosts[p.product_id] || 0) * p.quantity,
                      0,
                    ) + extras.reduce((sum, e) => sum + e.cost, 0)
                  ).toFixed(2)}
                </div>

                <div className="text-green-600 font-bold mt-2">Utilidad:</div>
                <div className="text-right font-bold text-green-600 mt-2">
                  $
                  {(
                    totalAmountValue -
                    (selectedProducts.reduce(
                      (sum, p) =>
                        sum +
                        (productUnitCosts[p.product_id] || 0) * p.quantity,
                      0,
                    ) +
                      extras.reduce((sum, e) => sum + e.cost, 0))
                  ).toFixed(2)}
                </div>
                <div className="text-gray-500 text-xs">Margen Real:</div>
                <div className="text-right text-xs text-gray-500">
                  {(() => {
                    const totalRevenue = totalAmountValue;
                    const totalCost =
                      selectedProducts.reduce(
                        (sum, p) =>
                          sum +
                          (productUnitCosts[p.product_id] || 0) * p.quantity,
                        0,
                      ) + extras.reduce((sum, e) => sum + e.cost, 0);

                    const profit = totalRevenue - totalCost;

                    // Calculate revenue from pass-through items (exclude_utility)
                    // Note: If pass-through items were NOT discounted (as per new logic), their revenue contribution is just their sum price.
                    const passThroughRevenue = extras
                      .filter((e) => e.exclude_utility)
                      .reduce((sum, e) => sum + e.price, 0);

                    const adjustedRevenue = totalRevenue - passThroughRevenue;

                    if (adjustedRevenue <= 0) return "0.0%";

                    return `${((profit / adjustedRevenue) * 100).toFixed(1)}%`;
                  })()}
                </div>
                {extras.some((e) => e.exclude_utility) && (
                  <div className="col-span-2 text-xs text-gray-400 italic text-center mt-1">
                    * Margen calculado excluyendo costos de pasamanos ($
                    {extras
                      .filter((e) => e.exclude_utility)
                      .reduce((sum, e) => sum + e.price, 0)
                      .toFixed(2)}
                    )
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="mt-6">
            <button
              type="submit"
              form="event-form"
              disabled={isLoading}
              className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-brand-orange hover:bg-orange-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-orange disabled:opacity-50"
            >
              <Save className="h-5 w-5 mr-2" />
              {isLoading ? "Guardando..." : "Guardar Evento"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
