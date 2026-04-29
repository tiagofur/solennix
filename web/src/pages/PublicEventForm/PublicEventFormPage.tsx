import React, { useEffect, useMemo, useState } from "react";
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
  Package,
} from "lucide-react";
import { PublicFormExpired } from "./components/PublicFormExpired";
import { PublicFormSuccess } from "./components/PublicFormSuccess";
import { PublicProductCard } from "./components/PublicProductCard";
import { useTranslation } from "react-i18next";

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

const createSchema = (t: any) => z.object({
  client_name: z.string().min(2, t("event_form.errors.name_required")),
  client_phone: z.string().min(7, t("event_form.errors.phone_required")),
  client_email: z.string().email(t("event_form.errors.email_invalid")).optional().or(z.literal("")),
  event_date: z.string().min(1, t("event_form.errors.date_required")),
  service_type: z.string().min(1, t("event_form.errors.service_type_required")),
  num_people: z.string().min(1, t("event_form.errors.num_people_min")),
  location: z.string().optional(),
  city: z.string().optional(),
  notes: z.string().optional(),
});

type FormValues = z.infer<ReturnType<typeof createSchema>>;

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:8080/api";

export const PublicEventFormPage: React.FC = () => {
  const { token } = useParams<{ token: string }>();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState<FormData | null>(null);
  const [formUnavailableReason, setFormUnavailableReason] = useState<"expired" | "not_found" | null>(null);
  const [success, setSuccess] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [selectedProducts, setSelectedProducts] = useState<
    Map<string, number>
  >(new Map());

  const { t } = useTranslation("public");
  const schema = useMemo(() => createSchema(t), [t]);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      num_people: "50",
    },
  });

  useEffect(() => {
    if (!token) return;
    const controller = new AbortController();

    const fetchFormData = async () => {
      try {
        const res = await fetch(
          `${API_BASE}/public/event-forms/${token}`,
          { signal: controller.signal }
        );
        if (!res.ok) {
          if (res.status === 404) {
            setFormUnavailableReason("not_found");
          } else {
            setFormUnavailableReason("expired");
          }
          return;
        }
        const data: FormData = await res.json();
        setFormData(data);
      } catch (err) {
        // Ignore aborts from unmount/token change; surface everything else
        // as an expired/unavailable form.
        if ((err as { name?: string })?.name === "AbortError") return;
        setFormUnavailableReason("expired");
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    };

    fetchFormData();
    return () => controller.abort();
  }, [token]);

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
        setFormUnavailableReason("expired");
        return;
      }
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        setSubmitError(
          data?.error || t("event_form.errors.submit_failed")
        );
        return;
      }
      setSuccess(true);
    } catch {
      setSubmitError(t("event_form.errors.connection_error"));
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

  if (formUnavailableReason) {
    return <PublicFormExpired reason={formUnavailableReason} />;
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
    return <PublicFormExpired reason="expired" />;
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
              {formData.organizer.business_name || t("event_form.title")}
            </h1>
            <p className="text-xs text-text-secondary">
              {t("event_form.subtitle")}
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
            {t("event_form.client_info_title")}
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-text mb-1.5">
                {t("event_form.client_name_label")}
              </label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-tertiary" />
                <input
                  {...register("client_name")}
                  placeholder={t("event_form.client_name_placeholder")}
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
                {t("event_form.client_phone_label")}
              </label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-tertiary" />
                <input
                  {...register("client_phone")}
                  type="tel"
                  placeholder={t("event_form.client_phone_placeholder")}
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
                {t("event_form.client_email_label")}
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-tertiary" />
                <input
                  {...register("client_email")}
                  type="email"
                  placeholder={t("event_form.client_email_placeholder")}
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
            {t("event_form.event_details_title")}
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-text mb-1.5">
                {t("event_form.event_date_label")}
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
                {t("event_form.service_type_label")}
              </label>
              <div className="relative">
                <FileText className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-tertiary" />
                <input
                  {...register("service_type")}
                  placeholder={t("event_form.service_type_placeholder")}
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
                {t("event_form.num_people_label")}
              </label>
              <div className="relative">
                <Users className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-tertiary" />
                <input
                  {...register("num_people")}
                  type="number"
                  min={1}
                  placeholder={t("event_form.num_people_placeholder")}
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
                {t("event_form.location_label")}
              </label>
              <div className="relative">
                <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-tertiary" />
                <input
                  {...register("location")}
                  placeholder={t("event_form.location_placeholder")}
                  className="w-full pl-10 pr-4 py-3 rounded-xl border border-border text-sm bg-card text-text placeholder-text-tertiary focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-transparent transition-colors"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-text mb-1.5">
                {t("event_form.city_label")}
              </label>
              <div className="relative">
                <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-tertiary" />
                <input
                  {...register("city")}
                  placeholder={t("event_form.city_placeholder")}
                  className="w-full pl-10 pr-4 py-3 rounded-xl border border-border text-sm bg-card text-text placeholder-text-tertiary focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-transparent transition-colors"
                />
              </div>
            </div>

            <div className="sm:col-span-2">
              <label className="block text-sm font-medium text-text mb-1.5">
                {t("event_form.notes_label")}
              </label>
              <textarea
                {...register("notes")}
                rows={3}
                placeholder={t("event_form.notes_placeholder")}
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
              {t("event_form.products_title")}
            </h2>
            <p className="text-sm text-text-secondary">
              {t("event_form.products_description")}
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
              {t(selectedProducts.size === 1 ? "event_form.product_selected" : "event_form.product_selected_plural", { count: selectedProducts.size })}
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
              {t("event_form.submitting_button")}
            </>
          ) : (
            <>
              <Send className="h-5 w-5" />
              {t("event_form.submit_button")}
            </>
          )}
        </button>

        <p className="text-center text-xs text-text-tertiary">
          {t("event_form.footer_note")}
        </p>
      </form>
    </div>
  );
};
