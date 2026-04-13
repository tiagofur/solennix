import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Calendar,
  MapPin,
  Users,
  FileText,
  User,
  Phone,
  Mail,
  Send,
  Loader2,
  Minus,
  Plus,
  Package,
} from "lucide-react";
import { PublicFormExpired } from "./components/PublicFormExpired";
import { PublicFormSuccess } from "./components/PublicFormSuccess";
import { PublicProductCard } from "./components/PublicProductCard";

interface PublicProduct {
  id: string;
  name: string;
  category: string;
  image_url?: string;
}

interface Organizer {
  business_name?: string;
  logo_url?: string;
  brand_color?: string;
}

interface FormData {
  organizer: Organizer;
  products: PublicProduct[];
  link_id: string;
  expires_at: string;
}

interface SelectedProduct {
  product_id: string;
  quantity: number;
}

const schema = z.object({
  client_name: z.string().min(2, "El nombre es requerido"),
  client_phone: z.string().min(7, "El teléfono es requerido"),
  client_email: z.string().email("Email inválido").optional().or(z.literal("")),
  event_date: z.string().min(1, "La fecha es requerida"),
  service_type: z.string().min(1, "El tipo de evento es requerido"),
  num_people: z.coerce.number().min(1, "Mínimo 1 persona"),
  location: z.string().optional(),
  city: z.string().optional(),
  notes: z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:8080/api";

export const PublicEventFormPage: React.FC = () => {
  const { token } = useParams<{ token: string }>();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState<FormData | null>(null);
  const [expired, setExpired] = useState(false);
  const [success, setSuccess] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [selectedProducts, setSelectedProducts] = useState<
    Map<string, number>
  >(new Map());

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      num_people: 50,
    },
  });

  useEffect(() => {
    if (!token) return;
    fetchFormData();
  }, [token]);

  const fetchFormData = async () => {
    try {
      const res = await fetch(
        `${API_BASE}/public/event-forms/${token}`
      );
      if (!res.ok) {
        setExpired(true);
        return;
      }
      const data: FormData = await res.json();
      setFormData(data);
    } catch {
      setExpired(true);
    } finally {
      setLoading(false);
    }
  };

  const toggleProduct = (productId: string) => {
    setSelectedProducts((prev) => {
      const next = new Map(prev);
      if (next.has(productId)) {
        next.delete(productId);
      } else {
        next.set(productId, 1);
      }
      return next;
    });
  };

  const updateQuantity = (productId: string, delta: number) => {
    setSelectedProducts((prev) => {
      const next = new Map(prev);
      const current = next.get(productId) || 1;
      const newQty = Math.max(1, current + delta);
      next.set(productId, newQty);
      return next;
    });
  };

  const setQuantity = (productId: string, qty: number) => {
    setSelectedProducts((prev) => {
      const next = new Map(prev);
      next.set(productId, Math.max(1, qty));
      return next;
    });
  };

  const onSubmit = async (values: FormValues) => {
    if (!token) return;
    setSubmitting(true);
    setSubmitError(null);

    const products: SelectedProduct[] = [];
    selectedProducts.forEach((quantity, product_id) => {
      products.push({ product_id, quantity });
    });

    try {
      const res = await fetch(
        `${API_BASE}/public/event-forms/${token}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ...values,
            client_email: values.client_email || undefined,
            num_people: Number(values.num_people),
            products,
          }),
        }
      );

      if (res.status === 410 || res.status === 409) {
        setExpired(true);
        return;
      }
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        setSubmitError(
          data?.error || "Hubo un error al enviar. Intenta de nuevo."
        );
        return;
      }
      setSuccess(true);
    } catch {
      setSubmitError("Error de conexión. Verifica tu internet e intenta de nuevo.");
    } finally {
      setSubmitting(false);
    }
  };

  const brandColor = formData?.organizer.brand_color || "#C4A265";

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-bg">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (expired) {
    return <PublicFormExpired />;
  }

  if (success) {
    return (
      <PublicFormSuccess
        organizerName={formData?.organizer.business_name}
        brandColor={brandColor}
      />
    );
  }

  if (!formData) {
    return <PublicFormExpired />;
  }

  // Group products by category
  const categories = formData.products.reduce(
    (acc, p) => {
      const cat = p.category || "General";
      if (!acc[cat]) acc[cat] = [];
      acc[cat].push(p);
      return acc;
    },
    {} as Record<string, PublicProduct[]>
  );

  return (
    <div className="min-h-screen bg-bg">
      {/* Header */}
      <header
        className="sticky top-0 z-10 border-b border-border backdrop-blur-md"
        style={{ backgroundColor: `${brandColor}10` }}
      >
        <div className="max-w-3xl mx-auto px-4 py-4 flex items-center gap-3">
          {formData.organizer.logo_url && (
            <img
              src={formData.organizer.logo_url}
              alt=""
              className="h-10 w-10 rounded-full object-cover border-2"
              style={{ borderColor: brandColor }}
            />
          )}
          <div>
            <h1 className="text-lg font-bold text-text">
              {formData.organizer.business_name || "Formulario de Evento"}
            </h1>
            <p className="text-xs text-text-secondary">
              Cuéntanos sobre tu evento
            </p>
          </div>
        </div>
      </header>

      <form
        onSubmit={handleSubmit(onSubmit)}
        className="max-w-3xl mx-auto px-4 py-6 space-y-8"
      >
        {/* Error */}
        {submitError && (
          <div className="bg-error/5 border border-error/30 text-error rounded-xl p-4 text-sm">
            {submitError}
          </div>
        )}

        {/* Section: Client Info */}
        <section className="bg-card rounded-2xl border border-border p-6 space-y-4">
          <h2
            className="text-base font-bold flex items-center gap-2"
            style={{ color: brandColor }}
          >
            <User className="h-5 w-5" />
            Tus datos
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-text mb-1.5">
                Nombre *
              </label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-tertiary" />
                <input
                  {...register("client_name")}
                  placeholder="Tu nombre completo"
                  className={`w-full pl-10 pr-4 py-3 rounded-xl border text-sm bg-card text-text placeholder-text-tertiary focus:outline-none focus:ring-2 focus:border-transparent transition-colors ${
                    errors.client_name
                      ? "border-error/30"
                      : "border-border"
                  }`}
                  style={
                    errors.client_name
                      ? undefined
                      : { "--tw-ring-color": `${brandColor}40` } as React.CSSProperties
                  }
                />
              </div>
              {errors.client_name && (
                <p className="mt-1 text-xs text-error">
                  {errors.client_name.message}
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-text mb-1.5">
                Teléfono *
              </label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-tertiary" />
                <input
                  {...register("client_phone")}
                  type="tel"
                  placeholder="Tu número de teléfono"
                  className={`w-full pl-10 pr-4 py-3 rounded-xl border text-sm bg-card text-text placeholder-text-tertiary focus:outline-none focus:ring-2 focus:border-transparent transition-colors ${
                    errors.client_phone
                      ? "border-error/30"
                      : "border-border"
                  }`}
                />
              </div>
              {errors.client_phone && (
                <p className="mt-1 text-xs text-error">
                  {errors.client_phone.message}
                </p>
              )}
            </div>

            <div className="sm:col-span-2">
              <label className="block text-sm font-medium text-text mb-1.5">
                Email
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-tertiary" />
                <input
                  {...register("client_email")}
                  type="email"
                  placeholder="tu@email.com (opcional)"
                  className="w-full pl-10 pr-4 py-3 rounded-xl border border-border text-sm bg-card text-text placeholder-text-tertiary focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-transparent transition-colors"
                />
              </div>
              {errors.client_email && (
                <p className="mt-1 text-xs text-error">
                  {errors.client_email.message}
                </p>
              )}
            </div>
          </div>
        </section>

        {/* Section: Event Details */}
        <section className="bg-card rounded-2xl border border-border p-6 space-y-4">
          <h2
            className="text-base font-bold flex items-center gap-2"
            style={{ color: brandColor }}
          >
            <Calendar className="h-5 w-5" />
            Detalles del evento
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-text mb-1.5">
                Fecha del evento *
              </label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-tertiary" />
                <input
                  {...register("event_date")}
                  type="date"
                  className={`w-full pl-10 pr-4 py-3 rounded-xl border text-sm bg-card text-text focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-transparent transition-colors ${
                    errors.event_date ? "border-error/30" : "border-border"
                  }`}
                />
              </div>
              {errors.event_date && (
                <p className="mt-1 text-xs text-error">
                  {errors.event_date.message}
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-text mb-1.5">
                Tipo de evento *
              </label>
              <div className="relative">
                <FileText className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-tertiary" />
                <input
                  {...register("service_type")}
                  placeholder="Boda, XV Años, Corporativo..."
                  className={`w-full pl-10 pr-4 py-3 rounded-xl border text-sm bg-card text-text placeholder-text-tertiary focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-transparent transition-colors ${
                    errors.service_type ? "border-error/30" : "border-border"
                  }`}
                />
              </div>
              {errors.service_type && (
                <p className="mt-1 text-xs text-error">
                  {errors.service_type.message}
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-text mb-1.5">
                Número de personas *
              </label>
              <div className="relative">
                <Users className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-tertiary" />
                <input
                  {...register("num_people")}
                  type="number"
                  min={1}
                  placeholder="150"
                  className={`w-full pl-10 pr-4 py-3 rounded-xl border text-sm bg-card text-text placeholder-text-tertiary focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-transparent transition-colors ${
                    errors.num_people ? "border-error/30" : "border-border"
                  }`}
                />
              </div>
              {errors.num_people && (
                <p className="mt-1 text-xs text-error">
                  {errors.num_people.message}
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-text mb-1.5">
                Ubicación
              </label>
              <div className="relative">
                <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-tertiary" />
                <input
                  {...register("location")}
                  placeholder="Salón, jardín, dirección..."
                  className="w-full pl-10 pr-4 py-3 rounded-xl border border-border text-sm bg-card text-text placeholder-text-tertiary focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-transparent transition-colors"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-text mb-1.5">
                Ciudad
              </label>
              <div className="relative">
                <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-tertiary" />
                <input
                  {...register("city")}
                  placeholder="Ciudad"
                  className="w-full pl-10 pr-4 py-3 rounded-xl border border-border text-sm bg-card text-text placeholder-text-tertiary focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-transparent transition-colors"
                />
              </div>
            </div>

            <div className="sm:col-span-2">
              <label className="block text-sm font-medium text-text mb-1.5">
                Notas o comentarios
              </label>
              <textarea
                {...register("notes")}
                rows={3}
                placeholder="Cuéntanos más sobre lo que tienes en mente..."
                className="w-full px-4 py-3 rounded-xl border border-border text-sm bg-card text-text placeholder-text-tertiary focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-transparent transition-colors resize-none"
              />
            </div>
          </div>
        </section>

        {/* Section: Products */}
        {formData.products.length > 0 && (
          <section className="bg-card rounded-2xl border border-border p-6 space-y-4">
            <h2
              className="text-base font-bold flex items-center gap-2"
              style={{ color: brandColor }}
            >
              <Package className="h-5 w-5" />
              Selecciona lo que necesitas
            </h2>
            <p className="text-sm text-text-secondary">
              Selecciona los productos que te interesan e indica la cantidad.
            </p>

            {Object.entries(categories).map(([category, products]) => (
              <div key={category} className="space-y-3">
                <h3 className="text-sm font-semibold text-text-secondary uppercase tracking-wide">
                  {category}
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {products.map((product) => {
                    const isSelected = selectedProducts.has(product.id);
                    const quantity = selectedProducts.get(product.id) || 0;
                    return (
                      <PublicProductCard
                        key={product.id}
                        product={product}
                        isSelected={isSelected}
                        quantity={quantity}
                        brandColor={brandColor}
                        onToggle={() => toggleProduct(product.id)}
                        onIncrement={() => updateQuantity(product.id, 1)}
                        onDecrement={() => updateQuantity(product.id, -1)}
                        onQuantityChange={(qty) =>
                          setQuantity(product.id, qty)
                        }
                      />
                    );
                  })}
                </div>
              </div>
            ))}
          </section>
        )}

        {/* Summary */}
        {selectedProducts.size > 0 && (
          <div className="bg-surface-alt rounded-xl border border-border p-4">
            <p className="text-sm font-medium text-text">
              {selectedProducts.size} producto
              {selectedProducts.size !== 1 ? "s" : ""} seleccionado
              {selectedProducts.size !== 1 ? "s" : ""}
            </p>
          </div>
        )}

        {/* Submit */}
        <button
          type="submit"
          disabled={submitting}
          className="w-full flex items-center justify-center gap-2 text-white py-4 rounded-xl font-bold text-sm shadow-lg transition-all hover:scale-[1.01] disabled:opacity-60 disabled:cursor-not-allowed disabled:scale-100"
          style={{
            background: `linear-gradient(135deg, ${brandColor} 0%, ${brandColor}CC 100%)`,
            boxShadow: `0 10px 25px -5px ${brandColor}40`,
          }}
        >
          {submitting ? (
            <>
              <Loader2 className="h-5 w-5 animate-spin" />
              Enviando...
            </>
          ) : (
            <>
              <Send className="h-5 w-5" />
              Enviar solicitud
            </>
          )}
        </button>

        <p className="text-center text-xs text-text-tertiary">
          Tu información será enviada de forma segura al organizador.
        </p>
      </form>
    </div>
  );
};
