import { useEffect, useState, useCallback, useMemo } from "react";
import { useTranslation } from "react-i18next";
import clsx from "clsx";
import {
  Copy,
  Check,
  ExternalLink,
  Globe,
  Lock,
  Trash2,
  Image as ImageIcon,
  Package,
  MapPin,
  Search,
  Sparkles,
  Star,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/Button";
import { getAssetUrl } from "@/lib/api";
import { publicProfileConfigService } from "@/services/publicProfileConfigService";
import { productService } from "@/services/productService";
import { PackagesManager } from "./PackagesManager";
import { FaqManager } from "./FaqManager";
import type {
  OrganizerPublicProfile,
  OrganizerPublicProfileUpsertRequest,
  OrganizerPublicPortfolioItem,
  PublicProfileServiceSelectionItem,
  PortfolioCandidateEvent,
} from "@/services/publicProfileConfigService";

const PORTFOLIO_MAX = 6;

// kebab-case, 3-140 chars (mirrors backend validatePublicSlug).
const SLUG_REGEX = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

const CONTACT_TYPES = ["phone", "whatsapp", "email", "url"] as const;
type ContactType = (typeof CONTACT_TYPES)[number];

const fieldClass =
  "w-full bg-surface border border-border rounded-xl px-4 py-3 text-sm text-text focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all disabled:opacity-50";

const DEFAULT_PROFILE: OrganizerPublicProfile = {
  user_id: "",
  is_enabled: false,
  publication_status: "unpublished",
  show_prices: false,
  show_services: true,
  show_reviews: true,
  show_portfolio: true,
  show_contact: true,
  show_packages: true,
  show_faq: true,
  show_policies: false,
  created_at: "",
  updated_at: "",
};

function isPaidPlan(plan?: string): boolean {
  return plan === "pro" || plan === "business" || plan === "premium";
}

function formatPrice(amount: number): string {
  try {
    return new Intl.NumberFormat(undefined, {
      style: "currency",
      currency: "MXN",
      maximumFractionDigits: 0,
    }).format(amount);
  } catch {
    return `$${amount}`;
  }
}

export default function PublicProfileSettings() {
  const { t } = useTranslation("settings");
  const { user } = useAuth();
  const paid = isPaidPlan(user?.plan);

  const [profile, setProfile] = useState<OrganizerPublicProfile>(DEFAULT_PROFILE);
  const [slug, setSlug] = useState(user?.public_slug ?? "");
  const [headline, setHeadline] = useState("");
  const [city, setCity] = useState("");
  const [region, setRegion] = useState("");
  const [country, setCountry] = useState("");
  // Empty or 0 = unlimited coverage (backend: 0 clears / null = no limit).
  const [serviceRadiusKm, setServiceRadiusKm] = useState<number | "">("");
  const [contactType, setContactType] = useState<ContactType>("email");
  const [contactValue, setContactValue] = useState("");
  const [socialsText, setSocialsText] = useState(""); // "instagram=@x,twitter=@y"

  const [about, setAbout] = useState("");
  const [serviceAreasText, setServiceAreasText] = useState("");
  const [minGuests, setMinGuests] = useState<number | "">("");
  const [maxGuests, setMaxGuests] = useState<number | "">("");
  const [eventTypesText, setEventTypesText] = useState("");
  const [responseTime, setResponseTime] = useState("");
  const [languagesText, setLanguagesText] = useState("");

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [slugError, setSlugError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  // Services selection (from products catalog)
  const [services, setServices] = useState<PublicProfileServiceSelectionItem[]>([]);
  const [selectedServiceIds, setSelectedServiceIds] = useState<Set<string>>(new Set());
  const [servicesLoading, setServicesLoading] = useState(false);
  const [servicesSaving, setServicesSaving] = useState(false);
  const [servicesError, setServicesError] = useState<string | null>(null);
  const [serviceQuery, setServiceQuery] = useState("");


  // Portfolio (Pro+)
  const [portfolio, setPortfolio] = useState<OrganizerPublicPortfolioItem[]>([]);
  const [portfolioLoading, setPortfolioLoading] = useState(false);
  const [portfolioError, setPortfolioError] = useState<string | null>(null);
  const [candidates, setCandidates] = useState<PortfolioCandidateEvent[]>([]);
  const [selectedEventId, setSelectedEventId] = useState("");
  const [selectedPhotoId, setSelectedPhotoId] = useState("");
  const [addingPortfolio, setAddingPortfolio] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const data = await publicProfileConfigService.getMyPublicProfile();
        if (cancelled) return;
        setProfile(data);
        setSlug(data.public_slug ?? user?.public_slug ?? "");
        setHeadline(data.headline ?? "");
        setAbout(data.about ?? "");
        setServiceAreasText(data.service_areas?.join(", ") ?? "");
        setMinGuests(data.min_guests ?? "");
        setMaxGuests(data.max_guests ?? "");
        setEventTypesText(data.event_types?.join(", ") ?? "");
        setResponseTime(data.response_time ?? "");
        setLanguagesText(data.languages?.join(", ") ?? "");
        setCity(data.city ?? "");
        setRegion(data.region ?? "");
        setCountry(data.country ?? "");
        {
          const radius = (data as { service_radius_km?: number | null }).service_radius_km;
          setServiceRadiusKm(
            typeof radius === "number" && radius > 0 ? radius : "",
          );
        }
        if (data.contact_type) setContactType(data.contact_type as ContactType);
        setContactValue(data.contact_value ?? "");
        if (data.socials) {
          setSocialsText(
            Object.entries(data.socials)
              .map(([k, v]) => `${k}=${v}`)
              .join(","),
          );
        }
      } catch {
        if (!cancelled) setError(t("publicProfile.loadFailed"));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [t, user?.public_slug]);

  // Load services (active products) for selection.
  useEffect(() => {
    let cancelled = false;
    setServicesLoading(true);
    (async () => {
      try {
        const items = await publicProfileConfigService.listServices();
        if (cancelled) return;
        setServices(items);
        setSelectedServiceIds(
          new Set(items.filter((s) => s.show_on_public_profile).map((s) => s.id)),
        );
      } catch {
        if (!cancelled) setServicesError(t("publicProfile.servicesLoadFailed"));
      } finally {
        if (!cancelled) setServicesLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [t]);

  // Load portfolio + candidates only for paid plans (Free gets 403).
  useEffect(() => {
    if (!paid) {
      setPortfolio([]);
      setCandidates([]);
      return;
    }
    let cancelled = false;
    setPortfolioLoading(true);
    (async () => {
      try {
        const [items, cands] = await Promise.all([
          publicProfileConfigService.listPortfolio(),
          publicProfileConfigService.listPortfolioCandidates(),
        ]);
        if (!cancelled) {
          setPortfolio(items);
          setCandidates(cands);
        }
      } catch {
        if (!cancelled) setPortfolioError(t("publicProfile.portfolioLoadFailed"));
      } finally {
        if (!cancelled) setPortfolioLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [paid, t]);

  // Services filtered by the search box (name/category, case-insensitive).
  const filteredServices = useMemo(() => {
    const q = serviceQuery.trim().toLowerCase();
    if (!q) return services;
    return services.filter(
      (s) =>
        s.name.toLowerCase().includes(q) ||
        (s.category?.toLowerCase().includes(q) ?? false),
    );
  }, [services, serviceQuery]);

  const portfolioEventIds = useMemo(
    () => new Set(portfolio.map((p) => p.event_id).filter(Boolean) as string[]),
    [portfolio],
  );

  const availableCandidates = useMemo(
    () => candidates.filter((c) => !portfolioEventIds.has(c.id)),
    [candidates, portfolioEventIds],
  );

  const selectedCandidate = useMemo(
    () => availableCandidates.find((c) => c.id === selectedEventId) ?? null,
    [availableCandidates, selectedEventId],
  );

  useEffect(() => {
    if (!selectedCandidate) {
      setSelectedPhotoId("");
      return;
    }
    // Default to first photo when event changes.
    setSelectedPhotoId(selectedCandidate.photos[0]?.id ?? "");
  }, [selectedCandidate]);

  const validateSlug = useCallback(
    (value: string): string | null => {
      if (!value) return null; // empty = keep current
      if (value.length < 3 || value.length > 140) {
        return t("publicProfile.slugLengthError");
      }
      if (!SLUG_REGEX.test(value)) {
        return t("publicProfile.slugFormatError");
      }
      return null;
    },
    [t],
  );

  const shareUrl =
    typeof window !== "undefined" && slug
      ? `${window.location.origin}/u/${slug}`
      : "";

  const handleCopy = useCallback(async () => {
    if (!shareUrl) return;
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* clipboard not available */
    }
  }, [shareUrl]);

  const parseSocials = (text: string): Record<string, string> => {
    if (!text.trim()) return {};
    const out: Record<string, string> = {};
    for (const pair of text.split(",")) {
      const [k, ...rest] = pair.split("=");
      const key = k?.trim();
      const val = rest.join("=").trim();
      if (key && val) out[key] = val;
    }
    return out;
  };

  const handleSlugChange = (value: string) => {
    setSlug(value);
    setSlugError(validateSlug(value));
  };

  const toggleService = (id: string) => {
    setServicesError(null);
    setSelectedServiceIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
        return next;
      }
      next.add(id);
      return next;
    });
  };

  // Toggles a service's featured flag. PUT /products/{id} is a full-row replace,
  // so fetch the complete product first, flip is_featured, and persist — avoiding
  // any clobber of fields the Settings DTO doesn't carry.
  const [featuredSavingId, setFeaturedSavingId] = useState<string | null>(null);
  const toggleFeaturedService = async (
    svc: PublicProfileServiceSelectionItem,
  ) => {
    setFeaturedSavingId(svc.id);
    try {
      const full = await productService.getById(svc.id);
      await productService.update(svc.id, {
        ...full,
        is_featured: !svc.is_featured,
      });
      setServices((prev) =>
        prev.map((s) =>
          s.id === svc.id ? { ...s, is_featured: !svc.is_featured } : s,
        ),
      );
    } catch {
      setServicesError(t("publicProfile.featuredSaveFailed"));
    } finally {
      setFeaturedSavingId(null);
    }
  };

  const handleSaveServices = async () => {
    setServicesError(null);
    setServicesSaving(true);
    try {
      const updated = await publicProfileConfigService.setServices([
        ...selectedServiceIds,
      ]);
      setServices(updated);
      setSelectedServiceIds(
        new Set(updated.filter((s) => s.show_on_public_profile).map((s) => s.id)),
      );
    } catch {
      setServicesError(t("publicProfile.servicesSaveFailed"));
    } finally {
      setServicesSaving(false);
    }
  };

  const handleAddPortfolio = async () => {
    setPortfolioError(null);
    if (!selectedEventId) {
      setPortfolioError(t("publicProfile.portfolioPickEvent"));
      return;
    }
    if (portfolio.length >= PORTFOLIO_MAX) {
      setPortfolioError(t("publicProfile.portfolioMax"));
      return;
    }
    setAddingPortfolio(true);
    try {
      const created = await publicProfileConfigService.createPortfolioItem({
        event_id: selectedEventId,
        photo_id: selectedPhotoId || undefined,
        sort_order: portfolio.length,
      });
      setPortfolio((prev) =>
        [...prev, created].sort((a, b) => a.sort_order - b.sort_order),
      );
      setSelectedEventId("");
      setSelectedPhotoId("");
    } catch {
      setPortfolioError(t("publicProfile.portfolioSaveFailed"));
    } finally {
      setAddingPortfolio(false);
    }
  };

  const handleDeletePortfolio = async (id: string) => {
    setPortfolioError(null);
    try {
      await publicProfileConfigService.deletePortfolioItem(id);
      setPortfolio((prev) => prev.filter((p) => p.id !== id));
    } catch {
      setPortfolioError(t("publicProfile.portfolioDeleteFailed"));
    }
  };

  const handleSave = async () => {
    setError(null);
    const trimmedSlug = slug.trim();
    // Enabling the public page requires a shareable slug (server enforces too).
    if (profile.is_enabled && !trimmedSlug && !(profile.public_slug || user?.public_slug)) {
      setSlugError(t("publicProfile.slugRequiredOnEnable"));
      return;
    }
    const slugErr = validateSlug(trimmedSlug);
    if (slugErr) {
      setSlugError(slugErr);
      return;
    }

    // Free plan: force Pro-only toggles off client-side (server also rejects).
    const body: OrganizerPublicProfileUpsertRequest = {
      is_enabled: profile.is_enabled,
      public_slug: trimmedSlug || undefined,
      headline: headline || null,
      about: about.trim() || null,
      service_areas: serviceAreasText.split(",").map((s) => s.trim()).filter(Boolean),
      min_guests: typeof minGuests === "number" ? minGuests : null,
      max_guests: typeof maxGuests === "number" ? maxGuests : null,
      event_types: eventTypesText.split(",").map((s) => s.trim()).filter(Boolean),
      response_time: responseTime.trim() || null,
      languages: languagesText.split(",").map((s) => s.trim()).filter(Boolean),
      contact_type: contactType,
      contact_value: contactValue || null,
      city: city || null,
      region: region || null,
      country: country || null,
      // 0 clears radius (unlimited); omit null when empty so backend treats as clear.
      service_radius_km:
        typeof serviceRadiusKm === "number" && serviceRadiusKm > 0
          ? serviceRadiusKm
          : 0,
      show_prices: profile.show_prices,
      show_services: profile.show_services,
      show_reviews: paid ? profile.show_reviews : false,
      show_portfolio: paid ? profile.show_portfolio : false,
      show_contact: profile.show_contact,
      show_packages: paid ? profile.show_packages : false,
      show_faq: paid ? profile.show_faq : false,
      show_policies: paid ? profile.show_policies : false,
      socials: paid ? parseSocials(socialsText) : {},
    };

    setSaving(true);
    try {
      const saved = await publicProfileConfigService.upsertMyPublicProfile(body);
      setProfile(saved);
      if (saved.public_slug) setSlug(saved.public_slug);
    } catch (e: any) {
      const status = e?.status ?? e?.response?.status;
      if (status === 409) {
        setError(t("publicProfile.slugTaken"));
      } else if (status === 403) {
        setError(t("publicProfile.planRequired"));
      } else {
        setError(t("publicProfile.saveFailed"));
      }
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-4 animate-pulse">
        <div className="h-8 bg-surface-alt rounded w-1/3" />
        <div className="h-32 bg-surface-alt rounded" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <header>
        <h3 className="text-lg font-bold text-text flex items-center gap-2">
          <Globe className="h-5 w-5 text-primary" aria-hidden="true" />
          {t("publicProfile.title")}
        </h3>
        <p className="text-sm text-text-secondary mt-1">
          {t("publicProfile.description")}
        </p>
      </header>

      {/* Live Header Preview Card */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <p className="text-xs font-medium text-text-secondary uppercase tracking-wider flex items-center gap-1.5">
            <Sparkles className="h-3.5 w-3.5 text-primary" aria-hidden="true" />
            {t("publicProfile.livePreviewTitle", { defaultValue: "Vista previa en vivo" })}
          </p>
          <span
            className={clsx(
              "text-xs font-medium px-2 py-0.5 rounded-full border",
              profile.is_enabled
                ? "bg-success/10 text-success border-success/20"
                : "bg-surface-alt text-text-secondary border-border",
            )}
          >
            {profile.is_enabled
              ? t("publicProfile.statusActive", { defaultValue: "Público" })
              : t("publicProfile.statusInactive", { defaultValue: "Borrador" })}
          </span>
        </div>

        <div className="rounded-2xl border border-border bg-card overflow-hidden shadow-xs">
          {/* Cover */}
          <div
            className="relative h-28 sm:h-36 w-full bg-surface-alt"
            style={{
              backgroundImage: user?.cover_url
                ? undefined
                : `linear-gradient(135deg, ${user?.brand_color || "var(--color-primary, #C4A265)"} 0%, color-mix(in srgb, ${user?.brand_color || "var(--color-primary, #C4A265)"} 45%, transparent) 100%)`,
            }}
          >
            {user?.cover_url && (
              <img
                src={getAssetUrl(user.cover_url)}
                alt=""
                className="absolute inset-0 h-full w-full object-cover"
              />
            )}
          </div>
          {/* Logo & Info */}
          <div className="p-4 sm:p-5 pt-0">
            <div className="relative z-10 flex flex-col sm:flex-row sm:items-start gap-4">
              {user?.logo_url ? (
                <img
                  src={getAssetUrl(user.logo_url)}
                  alt=""
                  className="-mt-8 sm:-mt-10 h-16 w-auto max-w-[180px] rounded-xl object-contain border-4 border-bg shrink-0 bg-surface-alt shadow-xs"
                />
              ) : (
                <div
                  className="-mt-8 sm:-mt-10 h-16 w-16 rounded-xl shrink-0 flex items-center justify-center text-xl font-bold text-on-primary border-4 border-bg shadow-xs"
                  style={{
                    backgroundColor: user?.brand_color || "var(--color-primary, #C4A265)",
                  }}
                >
                  {(user?.business_name || slug || "S").charAt(0).toUpperCase()}
                </div>
              )}
              <div className="min-w-0 flex-1 space-y-1 pt-1 sm:pt-2">
                <h4 className="text-base sm:text-lg font-bold text-text truncate">
                  {user?.business_name || slug || t("publicProfile.fallbackName", { defaultValue: "Nombre del Negocio" })}
                </h4>
                {headline && (
                  <p className="text-xs sm:text-sm text-text-secondary line-clamp-2 leading-relaxed">
                    {headline}
                  </p>
                )}
                {(city || region || country) && (
                  <p className="text-xs text-text-tertiary flex items-center gap-1">
                    <MapPin className="h-3.5 w-3.5 text-primary shrink-0" aria-hidden="true" />
                    <span>{[city, region, country].filter(Boolean).join(", ")}</span>
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Enable toggle */}
      <div className="space-y-3">
        <p className="text-xs font-medium text-text-secondary uppercase tracking-wider">
          {t("publicProfile.enable")}
        </p>
        <ToggleRow
          label={t("publicProfile.enable")}
          checked={profile.is_enabled}
          onChange={(v) => setProfile({ ...profile, is_enabled: v })}
          testId="pp-enabled"
        />
      </div>

      {/* Directory publication status (#1130) */}
      <div className="space-y-3" data-testid="pp-publication">
        <p className="text-xs font-medium text-text-secondary uppercase tracking-wider">
          {t("publicProfile.directory_status", { defaultValue: "Directory listing" })}
        </p>
        <div className="p-4 bg-surface-alt/50 rounded-2xl border border-border space-y-3">
          <p className="text-sm text-text">
            <span className="font-semibold">
              {t(`publicProfile.publication.${profile.publication_status ?? "unpublished"}`, {
                defaultValue: profile.publication_status ?? "unpublished",
              })}
            </span>
          </p>
          {profile.publication_status === "rejected" &&
            profile.publication_rejection_reason && (
              <p className="text-sm text-error" data-testid="pp-rejection-reason">
                {profile.publication_rejection_reason}
              </p>
            )}
          <p className="text-xs text-text-secondary">
            {t("publicProfile.directory_hint", {
              defaultValue:
                "Your public page can be on while the directory listing waits for review.",
            })}
          </p>
          {(profile.publication_status === "unpublished" ||
            profile.publication_status === "rejected" ||
            !profile.publication_status) && (
            <Button
              type="button"
              variant="outline"
              size="md"
              disabled={!profile.is_enabled || saving}
              onClick={async () => {
                try {
                  setSaving(true);
                  setError(null);
                  const updated =
                    await publicProfileConfigService.submitForDirectoryReview();
                  setProfile((p) => ({ ...p, ...updated }));
                } catch (e: unknown) {
                  const status = (e as { status?: number })?.status;
                  setError(
                    status === 400
                      ? t("publicProfile.submit_not_ready", {
                          defaultValue:
                            "Complete cover, bio, city, country and a public service first",
                        })
                      : t("publicProfile.submit_error", {
                          defaultValue: "Could not submit for review",
                        }),
                  );
                } finally {
                  setSaving(false);
                }
              }}
              data-testid="pp-submit-review"
            >
              {t("publicProfile.submit_for_review", {
                defaultValue: "Submit for directory review",
              })}
            </Button>
          )}
        </div>
      </div>

      {/* Slug + share */}
      <div className="space-y-3">
        <p className="text-xs font-medium text-text-secondary uppercase tracking-wider">
          {t("publicProfile.slug")}
        </p>
        <div className="p-4 bg-surface-alt/50 rounded-2xl border border-border space-y-3">
        <label className="text-sm font-bold text-text" htmlFor="pp-slug">
          {t("publicProfile.slug")}
        </label>
        <div className="flex flex-col sm:flex-row gap-2">
          <input
            id="pp-slug"
            type="text"
            value={slug}
            onChange={(e) => handleSlugChange(e.target.value)}
            placeholder="mi-negocio"
            className={clsx(fieldClass, "flex-1")}
            data-testid="pp-slug"
          />
          {shareUrl && (
            <div className="flex gap-2 shrink-0">
              <Button
                type="button"
                variant="outline"
                size="md"
                onClick={handleCopy}
                data-testid="pp-copy"
                title={t("publicProfile.copyUrl")}
              >
                {copied ? (
                  <Check className="h-4 w-4 text-success" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
                <span className="hidden sm:inline">
                  {copied ? t("publicProfile.copied") : t("publicProfile.copy")}
                </span>
              </Button>
              <a
                href={shareUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center px-5 py-2.5 text-sm rounded-xl border border-border text-text hover:bg-surface-alt transition-all"
                title={t("publicProfile.preview")}
              >
                <ExternalLink className="h-4 w-4" />
              </a>
            </div>
          )}
        </div>
        {slugError && (
          <p className="text-xs text-error" data-testid="pp-slug-error">
            {slugError}
          </p>
        )}
        {shareUrl && (
          <p className="text-xs text-text-secondary break-all" data-testid="pp-share-url">
            {shareUrl}
          </p>
        )}
        </div>
      </div>

      {/* Headline */}
      <div className="space-y-3">
        <p className="text-xs font-medium text-text-secondary uppercase tracking-wider">
          {t("publicProfile.headline")}
        </p>
        <div className="p-4 bg-surface-alt/50 rounded-2xl border border-border">
        <input
          id="pp-headline"
          type="text"
          value={headline}
          onChange={(e) => setHeadline(e.target.value)}
          maxLength={200}
          className={fieldClass}
          data-testid="pp-headline"
          placeholder={t("publicProfile.headline")}
        />
        </div>
      </div>

      {/* About story */}
      <div className="space-y-3">
        <p className="text-xs font-medium text-text-secondary uppercase tracking-wider">
          Sobre el negocio (Historia / Descripción)
        </p>
        <div className="p-4 bg-surface-alt/50 rounded-2xl border border-border">
          <textarea
            id="pp-about"
            value={about}
            onChange={(e) => setAbout(e.target.value)}
            rows={4}
            className={fieldClass}
            data-testid="pp-about"
            placeholder="Cuenta la historia de tu negocio, tu visión y qué te diferencia..."
          />
        </div>
      </div>

      {/* Capacity & Operational info */}
      <div className="space-y-3">
        <p className="text-xs font-medium text-text-secondary uppercase tracking-wider">
          Capacidad y Tiempos de Respuesta
        </p>
        <div className="p-4 bg-surface-alt/50 rounded-2xl border border-border space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-text-tertiary mb-1">Mínimo de invitados</label>
              <input
                type="number"
                value={minGuests}
                onChange={(e) => setMinGuests(e.target.value ? parseInt(e.target.value, 10) : "")}
                placeholder="ej. 20"
                className={fieldClass}
                data-testid="pp-min-guests"
              />
            </div>
            <div>
              <label className="block text-xs text-text-tertiary mb-1">Máximo de invitados</label>
              <input
                type="number"
                value={maxGuests}
                onChange={(e) => setMaxGuests(e.target.value ? parseInt(e.target.value, 10) : "")}
                placeholder="ej. 500"
                className={fieldClass}
                data-testid="pp-max-guests"
              />
            </div>
          </div>
          <div>
            <label className="block text-xs text-text-tertiary mb-1">Tiempo de respuesta habitual</label>
            <input
              type="text"
              value={responseTime}
              onChange={(e) => setResponseTime(e.target.value)}
              placeholder="ej. Responde en menos de 2 horas"
              className={fieldClass}
              data-testid="pp-response-time"
            />
          </div>
        </div>
      </div>

      {/* Service Coverage & Event types */}
      <div className="space-y-3">
        <p className="text-xs font-medium text-text-secondary uppercase tracking-wider">
          Cobertura, Tipos de Eventos e Idiomas
        </p>
        <div className="p-4 bg-surface-alt/50 rounded-2xl border border-border space-y-3">
          <div>
            <label className="block text-xs text-text-tertiary mb-1">Zonas de servicio (separadas por coma)</label>
            <input
              type="text"
              value={serviceAreasText}
              onChange={(e) => setServiceAreasText(e.target.value)}
              placeholder="ej. Guadalajara, Zapopan, Tlaquepaque, Puerto Vallarta"
              className={fieldClass}
              data-testid="pp-service-areas"
            />
          </div>
          <div>
            <label className="block text-xs text-text-tertiary mb-1">Tipos de evento (separados por coma)</label>
            <input
              type="text"
              value={eventTypesText}
              onChange={(e) => setEventTypesText(e.target.value)}
              placeholder="ej. wedding, birthday, xv_years, corporate"
              className={fieldClass}
              data-testid="pp-event-types"
            />
          </div>
          <div>
            <label className="block text-xs text-text-tertiary mb-1">Idiomas de atención (separados por coma)</label>
            <input
              type="text"
              value={languagesText}
              onChange={(e) => setLanguagesText(e.target.value)}
              placeholder="ej. Español, English"
              className={fieldClass}
              data-testid="pp-languages"
            />
          </div>
        </div>
      </div>

      {/* Location */}
      <div className="space-y-3">
        <p className="text-xs font-medium text-text-secondary uppercase tracking-wider">
          {t("publicProfile.location")}
        </p>
        <div className="p-4 bg-surface-alt/50 rounded-2xl border border-border space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <input
            type="text"
            value={city}
            onChange={(e) => setCity(e.target.value)}
            placeholder={t("publicProfile.city")}
            className={fieldClass}
            data-testid="pp-city"
          />
          <input
            type="text"
            value={region}
            onChange={(e) => setRegion(e.target.value)}
            placeholder={t("publicProfile.region")}
            className={fieldClass}
          />
          <input
            type="text"
            value={country}
            onChange={(e) => setCountry(e.target.value)}
            placeholder={t("publicProfile.country")}
            className={fieldClass}
          />
        </div>
        <div className="space-y-1">
          <label className="text-xs font-medium text-text-secondary" htmlFor="pp-service-radius">
            {t("publicProfile.serviceRadius")}
          </label>
          <input
            id="pp-service-radius"
            type="number"
            min="0"
            step="1"
            value={serviceRadiusKm}
            onChange={(e) => {
              const v = e.target.value;
              if (v === "") {
                setServiceRadiusKm("");
                return;
              }
              const n = parseFloat(v);
              setServiceRadiusKm(Number.isFinite(n) ? n : "");
            }}
            placeholder={t("publicProfile.serviceRadiusPlaceholder")}
            className={fieldClass}
            data-testid="pp-service-radius"
          />
          <p className="text-xs text-text-tertiary">
            {t("publicProfile.serviceRadiusHint")}
          </p>
        </div>
        </div>
      </div>

      {/* Contact */}
      <div className="space-y-3">
        <p className="text-xs font-medium text-text-secondary uppercase tracking-wider">
          {t("publicProfile.contact")}
        </p>
        <div className="p-4 bg-surface-alt/50 rounded-2xl border border-border">
        <div className="flex flex-col sm:flex-row gap-3">
          <select
            value={contactType}
            onChange={(e) => setContactType(e.target.value as ContactType)}
            className={clsx(fieldClass, "sm:w-44 shrink-0")}
            data-testid="pp-contact-type"
          >
            {CONTACT_TYPES.map((ct) => (
              <option key={ct} value={ct}>
                {t(`publicProfile.contactTypes.${ct}`)}
              </option>
            ))}
          </select>
          <input
            type="text"
            value={contactValue}
            onChange={(e) => setContactValue(e.target.value)}
            className={clsx(fieldClass, "flex-1")}
            data-testid="pp-contact-value"
          />
        </div>
        </div>
      </div>

      {/* Toggles */}
      <div className="space-y-4">
        <p className="text-xs font-medium text-text-secondary uppercase tracking-wider">
          {t("publicProfile.showServices")}
        </p>
        <ToggleRow
          label={t("publicProfile.showPrices")}
          checked={profile.show_prices}
          onChange={(v) => setProfile({ ...profile, show_prices: v })}
          testId="pp-show-prices"
        />
        <ToggleRow
          label={t("publicProfile.showServices")}
          checked={profile.show_services}
          onChange={(v) => setProfile({ ...profile, show_services: v })}
          testId="pp-show-services"
        />
        <ToggleRow
          label={t("publicProfile.showContact")}
          checked={profile.show_contact}
          onChange={(v) => setProfile({ ...profile, show_contact: v })}
          testId="pp-show-contact"
        />
        <ToggleRow
          label={t("publicProfile.showReviews")}
          checked={paid ? profile.show_reviews : false}
          onChange={(v) => paid && setProfile({ ...profile, show_reviews: v })}
          disabled={!paid}
          testId="pp-show-reviews"
        />
        <ToggleRow
          label={t("publicProfile.showPortfolio")}
          checked={paid ? profile.show_portfolio : false}
          onChange={(v) => paid && setProfile({ ...profile, show_portfolio: v })}
          disabled={!paid}
          testId="pp-show-portfolio"
        />
        <ToggleRow
          label={t("publicProfile.showPackages")}
          checked={paid ? profile.show_packages : false}
          onChange={(v) => paid && setProfile({ ...profile, show_packages: v })}
          disabled={!paid}
          testId="pp-show-packages"
        />
        <ToggleRow
          label={t("publicProfile.showFaq")}
          checked={paid ? profile.show_faq : false}
          onChange={(v) => paid && setProfile({ ...profile, show_faq: v })}
          disabled={!paid}
          testId="pp-show-faq"
        />
        <ToggleRow
          label={t("publicProfile.showPolicies")}
          checked={profile.show_policies}
          onChange={(v) => setProfile({ ...profile, show_policies: v })}
          testId="pp-show-policies"
        />
      </div>

      {/* Socials (Pro only) */}
      <div className="space-y-2">
        <label className="text-sm font-medium text-text flex items-center gap-2">
          {t("publicProfile.socials")}
          {!paid && <Lock className="h-3.5 w-3.5 text-text-secondary" />}
        </label>
        <input
          type="text"
          value={paid ? socialsText : ""}
          onChange={(e) => setSocialsText(e.target.value)}
          disabled={!paid}
          placeholder={t("publicProfile.socialsPlaceholder")}
          className={fieldClass}
          data-testid="pp-socials"
        />
        {!paid && (
          <p className="text-xs text-text-secondary">
            {t("publicProfile.socialsProHint")}
          </p>
        )}
      </div>

      {/* Services from products catalog */}
      <section className="space-y-3" data-testid="pp-services-section">
        <header>
          <p className="text-xs font-medium text-text-secondary uppercase tracking-wider flex items-center gap-2">
            <Package className="h-3.5 w-3.5" aria-hidden="true" />
            {t("publicProfile.services")}
          </p>
          <p className="text-xs text-text-secondary mt-1">
            {t("publicProfile.servicesDescription")}
          </p>
        </header>

        {servicesLoading ? (
          <div className="h-16 bg-surface-alt rounded animate-pulse" />
        ) : services.length === 0 ? (
          <p className="text-xs text-text-secondary" data-testid="pp-services-empty">
            {t("publicProfile.servicesEmpty")}
          </p>
        ) : (
          <>
            {/* Search + selection count for large catalogs */}
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <Search
                  className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-tertiary pointer-events-none"
                  aria-hidden="true"
                />
                <input
                  type="search"
                  value={serviceQuery}
                  onChange={(e) => setServiceQuery(e.target.value)}
                  placeholder={t("publicProfile.servicesSearchPlaceholder")}
                  aria-label={t("publicProfile.servicesSearchPlaceholder")}
                  className={clsx(fieldClass, "pl-9")}
                  data-testid="pp-services-search"
                />
              </div>
              <span
                className="text-xs text-text-secondary whitespace-nowrap tabular-nums"
                data-testid="pp-services-selected-count"
              >
                {t("publicProfile.servicesSelectedCount", {
                  count: selectedServiceIds.size,
                })}
              </span>
            </div>

            {filteredServices.length === 0 ? (
              <p
                className="text-xs text-text-secondary"
                data-testid="pp-services-no-results"
              >
                {t("publicProfile.servicesNoResults")}
              </p>
            ) : (
              <ul
                className="space-y-2 max-h-80 overflow-y-auto pr-1 -mr-1"
                data-testid="pp-services-list"
              >
                {filteredServices.map((svc) => {
                  const checked = selectedServiceIds.has(svc.id);
                  const thumb = getAssetUrl(svc.image_url);
                  return (
                    <li key={svc.id}>
                      <label
                        className="flex items-center gap-3 rounded-xl border border-border bg-card p-3 cursor-pointer hover:border-primary/30"
                        data-testid={`pp-service-${svc.id}`}
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => toggleService(svc.id)}
                          className="h-4 w-4 rounded border-border text-primary focus:ring-primary"
                          data-testid={`pp-service-check-${svc.id}`}
                        />
                        {thumb ? (
                          <img
                            src={thumb}
                            alt=""
                            className="h-10 w-10 rounded object-cover bg-surface-alt"
                          />
                        ) : (
                          <div className="h-10 w-10 rounded bg-surface-alt" />
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-text truncate">{svc.name}</p>
                          <p className="text-xs text-text-secondary">
                            {formatPrice(svc.base_price)}
                          </p>
                        </div>
                        {checked && (
                          <button
                            type="button"
                            onClick={(e) => {
                              // Prevent the parent <label> checkbox from toggling.
                              e.preventDefault();
                              e.stopPropagation();
                              toggleFeaturedService(svc);
                            }}
                            disabled={featuredSavingId === svc.id}
                            aria-label={t("publicProfile.toggleFeatured", {
                              name: svc.name,
                            })}
                            aria-pressed={svc.is_featured}
                            data-testid={`pp-service-featured-${svc.id}`}
                            className="p-1 rounded hover:bg-surface-alt disabled:opacity-50"
                          >
                            <Star
                              className={clsx(
                                "h-4 w-4",
                                svc.is_featured
                                  ? "fill-primary text-primary"
                                  : "text-text-tertiary",
                              )}
                            />
                          </button>
                        )}
                      </label>
                    </li>
                  );
                })}
              </ul>
            )}
          </>
        )}

        {servicesError && (
          <p className="text-xs text-error" data-testid="pp-services-error">
            {servicesError}
          </p>
        )}

        <Button
          type="button"
          variant="secondary"
          size="md"
          onClick={handleSaveServices}
          disabled={servicesSaving || servicesLoading}
          loading={servicesSaving}
          data-testid="pp-services-save"
        >
          {servicesSaving
            ? t("publicProfile.servicesSaving")
            : t("publicProfile.servicesSave")}
        </Button>
      </section>

      {/* Portfolio from events (Pro only, max 6) */}
      <section className="space-y-3" data-testid="pp-portfolio-section">
        <header>
          <p className="text-xs font-medium text-text-secondary uppercase tracking-wider flex items-center gap-2">
            <ImageIcon className="h-3.5 w-3.5" aria-hidden="true" />
            {t("publicProfile.portfolio")}
            {!paid && <Lock className="h-3.5 w-3.5" aria-hidden="true" />}
          </p>
          <p className="text-xs text-text-secondary mt-1">
            {paid
              ? t("publicProfile.portfolioDescription")
              : t("publicProfile.portfolioProHint")}
          </p>
        </header>

        {paid && (
          <>
            {portfolioLoading ? (
              <div className="h-16 bg-surface-alt rounded animate-pulse" />
            ) : portfolio.length === 0 ? (
              <p className="text-xs text-text-secondary" data-testid="pp-portfolio-empty">
                {t("publicProfile.portfolioEmpty")}
              </p>
            ) : (
              <ul className="space-y-2" data-testid="pp-portfolio-list">
                {portfolio.map((item) => (
                  <li
                    key={item.id}
                    className="flex items-center gap-3 rounded-xl border border-border bg-card p-3"
                    data-testid={`pp-portfolio-item-${item.id}`}
                  >
                    <img
                      src={
                        getAssetUrl(item.thumbnail_url || item.photo_url) ||
                        item.photo_url
                      }
                      alt=""
                      className="h-12 w-12 rounded object-cover bg-surface-alt"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-text truncate">{item.title}</p>
                      {item.event_date && (
                        <p className="text-xs text-text-secondary">{item.event_date}</p>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => handleDeletePortfolio(item.id)}
                      className="p-2 rounded-lg text-error hover:bg-surface-alt"
                      title={t("publicProfile.portfolioDelete")}
                      data-testid={`pp-portfolio-delete-${item.id}`}
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </li>
                ))}
              </ul>
            )}

            {portfolio.length < PORTFOLIO_MAX && (
              <div className="space-y-3 rounded-2xl border border-border bg-surface-alt/50 p-4">
                <label className="text-xs font-medium text-text-secondary uppercase tracking-wider" htmlFor="pp-event">
                  {t("publicProfile.portfolioPickEvent")}
                </label>
                <select
                  id="pp-event"
                  value={selectedEventId}
                  onChange={(e) => setSelectedEventId(e.target.value)}
                  className={fieldClass}
                  data-testid="pp-portfolio-event"
                >
                  <option value="">{t("publicProfile.portfolioSelectEvent")}</option>
                  {availableCandidates.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.service_type}
                      {c.event_date ? ` — ${c.event_date}` : ""}
                      {c.city ? ` · ${c.city}` : ""}
                    </option>
                  ))}
                </select>

                {selectedCandidate && selectedCandidate.photos.length > 1 && (
                  <div className="space-y-1">
                    <p className="text-xs font-medium text-text">
                      {t("publicProfile.portfolioPickPhoto")}
                    </p>
                    <div className="flex flex-wrap gap-2" data-testid="pp-portfolio-photos">
                      {selectedCandidate.photos.map((ph) => {
                        const src = getAssetUrl(ph.thumbnail_url || ph.url) || ph.url;
                        const active = selectedPhotoId === ph.id;
                        return (
                          <button
                            key={ph.id}
                            type="button"
                            onClick={() => setSelectedPhotoId(ph.id)}
                            className={`h-14 w-14 rounded border-2 overflow-hidden ${
                              active ? "border-primary" : "border-border"
                            }`}
                            data-testid={`pp-portfolio-photo-${ph.id}`}
                          >
                            <img
                              src={src}
                              alt=""
                              className="h-full w-full object-cover"
                            />
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {availableCandidates.length === 0 && (
                  <p className="text-xs text-text-secondary" data-testid="pp-portfolio-no-candidates">
                    {t("publicProfile.portfolioNoCandidates")}
                  </p>
                )}

                <Button
                  type="button"
                  variant="secondary"
                  size="md"
                  onClick={handleAddPortfolio}
                  disabled={
                    addingPortfolio ||
                    !selectedEventId ||
                    availableCandidates.length === 0
                  }
                  loading={addingPortfolio}
                  data-testid="pp-portfolio-add"
                >
                  {addingPortfolio
                    ? t("publicProfile.portfolioAdding")
                    : t("publicProfile.portfolioAdd")}
                </Button>
              </div>
            )}

            {portfolio.length >= PORTFOLIO_MAX && (
              <p className="text-xs text-text-secondary" data-testid="pp-portfolio-max">
                {t("publicProfile.portfolioMax")}
              </p>
            )}

            {portfolioError && (
              <p className="text-xs text-error" data-testid="pp-portfolio-error">
                {portfolioError}
              </p>
            )}
          </>
        )}
      </section>

      {/* Packages (Pro+ only) */}
      <section className="space-y-3">
        <label className="text-sm font-medium text-text flex items-center gap-2">
          {t("publicProfile.packages", { defaultValue: "Packages" })}
          {!paid && <Lock className="h-3.5 w-3.5 text-text-secondary" />}
        </label>
        <PackagesManager enabled={paid} />
      </section>

      {/* FAQ (Pro+ only) */}
      <section className="space-y-3">
        <label className="text-sm font-medium text-text flex items-center gap-2">
          {t("publicProfile.faq", { defaultValue: "FAQ" })}
          {!paid && <Lock className="h-3.5 w-3.5 text-text-secondary" />}
        </label>
        <FaqManager enabled={paid} />
      </section>

      {error && (
        <p className="text-sm text-error" data-testid="pp-error">
          {error}
        </p>
      )}

      <Button
        type="button"
        variant="primary"
        size="md"
        onClick={handleSave}
        disabled={saving}
        loading={saving}
        data-testid="pp-save"
      >
        {saving ? t("publicProfile.saving") : t("publicProfile.save")}
      </Button>
    </div>
  );
}

interface ToggleRowProps {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
  disabled?: boolean;
  testId: string;
}

function ToggleRow({ label, checked, onChange, disabled, testId }: ToggleRowProps) {
  return (
    <div
      className={clsx(
        "flex items-center justify-between gap-4 p-4 bg-surface-alt/50 rounded-2xl border border-border",
        disabled && "opacity-60",
      )}
    >
      <div className="flex items-center gap-2 min-w-0">
        <p className="font-bold text-text">{label}</p>
        {disabled && (
          <Lock className="h-3.5 w-3.5 text-text-secondary shrink-0" aria-hidden="true" />
        )}
      </div>
      <button
        type="button"
        onClick={() => !disabled && onChange(!checked)}
        disabled={disabled}
        className={clsx(
          "relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40",
          checked ? "bg-primary" : "bg-surface-alt border border-border",
        )}
        role="switch"
        aria-checked={checked}
        aria-label={label}
        data-testid={testId}
      >
        <span
          className={clsx(
            "inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform",
            checked ? "translate-x-6" : "translate-x-1",
          )}
        />
      </button>
    </div>
  );
}
