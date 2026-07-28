import { useEffect, useState, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { Copy, Check, ExternalLink, Globe, Lock } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { publicProfileConfigService } from "@/services/publicProfileConfigService";
import type {
  OrganizerPublicProfile,
  OrganizerPublicProfileUpsertRequest,
} from "@/services/publicProfileConfigService";

// kebab-case, 3-140 chars (mirrors backend validatePublicSlug).
const SLUG_REGEX = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

const CONTACT_TYPES = ["phone", "whatsapp", "email", "url"] as const;
type ContactType = (typeof CONTACT_TYPES)[number];

const DEFAULT_PROFILE: OrganizerPublicProfile = {
  user_id: "",
  is_enabled: false,
  show_prices: false,
  show_services: true,
  show_reviews: true,
  show_portfolio: true,
  show_contact: true,
  created_at: "",
  updated_at: "",
};

function isPaidPlan(plan?: string): boolean {
  return plan === "pro" || plan === "business" || plan === "premium";
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
  const [contactType, setContactType] = useState<ContactType>("email");
  const [contactValue, setContactValue] = useState("");
  const [socialsText, setSocialsText] = useState(""); // "instagram=@x,twitter=@y"

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [slugError, setSlugError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const data = await publicProfileConfigService.getMyPublicProfile();
        if (cancelled) return;
        setProfile(data);
        setSlug(data.public_slug ?? user?.public_slug ?? "");
        setHeadline(data.headline ?? "");
        setCity(data.city ?? "");
        setRegion(data.region ?? "");
        setCountry(data.country ?? "");
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
      contact_type: contactType,
      contact_value: contactValue || null,
      city: city || null,
      region: region || null,
      country: country || null,
      show_prices: profile.show_prices,
      show_services: profile.show_services,
      show_reviews: paid ? profile.show_reviews : false,
      show_portfolio: paid ? profile.show_portfolio : false,
      show_contact: profile.show_contact,
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
    <div className="space-y-6">
      <header>
        <h2 className="text-xl font-bold text-text flex items-center gap-2">
          <Globe className="h-5 w-5" />
          {t("publicProfile.title")}
        </h2>
        <p className="text-sm text-text-secondary mt-1">
          {t("publicProfile.description")}
        </p>
      </header>

      {/* Enable toggle */}
      <label className="flex items-center gap-3 cursor-pointer">
        <input
          type="checkbox"
          checked={profile.is_enabled}
          onChange={(e) =>
            setProfile({ ...profile, is_enabled: e.target.checked })
          }
          className="h-4 w-4 rounded border-border text-primary focus:ring-primary"
          data-testid="pp-enabled"
        />
        <span className="text-sm font-medium text-text">
          {t("publicProfile.enable")}
        </span>
      </label>

      {/* Slug + share */}
      <div className="space-y-2">
        <label className="text-sm font-medium text-text" htmlFor="pp-slug">
          {t("publicProfile.slug")}
        </label>
        <div className="flex gap-2">
          <input
            id="pp-slug"
            type="text"
            value={slug}
            onChange={(e) => handleSlugChange(e.target.value)}
            placeholder="mi-negocio"
            className="flex-1 rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text focus:ring-2 focus:ring-primary focus:border-primary"
            data-testid="pp-slug"
          />
          {shareUrl && (
            <>
              <button
                type="button"
                onClick={handleCopy}
                className="px-3 py-2 rounded-lg border border-border bg-surface text-text hover:bg-surface-alt text-sm flex items-center gap-1.5"
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
              </button>
              <a
                href={shareUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="px-3 py-2 rounded-lg border border-border bg-surface text-text hover:bg-surface-alt text-sm flex items-center gap-1.5"
                title={t("publicProfile.preview")}
              >
                <ExternalLink className="h-4 w-4" />
              </a>
            </>
          )}
        </div>
        {slugError && (
          <p className="text-xs text-error" data-testid="pp-slug-error">
            {slugError}
          </p>
        )}
        {shareUrl && (
          <p className="text-xs text-text-secondary" data-testid="pp-share-url">
            {shareUrl}
          </p>
        )}
      </div>

      {/* Headline */}
      <div className="space-y-2">
        <label className="text-sm font-medium text-text" htmlFor="pp-headline">
          {t("publicProfile.headline")}
        </label>
        <input
          id="pp-headline"
          type="text"
          value={headline}
          onChange={(e) => setHeadline(e.target.value)}
          maxLength={200}
          className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text focus:ring-2 focus:ring-primary"
          data-testid="pp-headline"
        />
      </div>

      {/* Location */}
      <fieldset className="space-y-2">
        <legend className="text-sm font-medium text-text">
          {t("publicProfile.location")}
        </legend>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          <input
            type="text"
            value={city}
            onChange={(e) => setCity(e.target.value)}
            placeholder={t("publicProfile.city")}
            className="rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text focus:ring-2 focus:ring-primary"
            data-testid="pp-city"
          />
          <input
            type="text"
            value={region}
            onChange={(e) => setRegion(e.target.value)}
            placeholder={t("publicProfile.region")}
            className="rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text focus:ring-2 focus:ring-primary"
          />
          <input
            type="text"
            value={country}
            onChange={(e) => setCountry(e.target.value)}
            placeholder={t("publicProfile.country")}
            className="rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text focus:ring-2 focus:ring-primary"
          />
        </div>
      </fieldset>

      {/* Contact */}
      <fieldset className="space-y-2">
        <legend className="text-sm font-medium text-text">
          {t("publicProfile.contact")}
        </legend>
        <div className="flex gap-2">
          <select
            value={contactType}
            onChange={(e) => setContactType(e.target.value as ContactType)}
            className="rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text focus:ring-2 focus:ring-primary"
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
            className="flex-1 rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text focus:ring-2 focus:ring-primary"
            data-testid="pp-contact-value"
          />
        </div>
      </fieldset>

      {/* Toggles */}
      <div className="space-y-3">
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
        {/* Pro-only toggles: disabled on Free with upgrade hint */}
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
          className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text focus:ring-2 focus:ring-primary disabled:opacity-50"
          data-testid="pp-socials"
        />
        {!paid && (
          <p className="text-xs text-text-secondary">
            {t("publicProfile.socialsProHint")}
          </p>
        )}
      </div>

      {error && (
        <p className="text-sm text-error" data-testid="pp-error">
          {error}
        </p>
      )}

      <button
        type="button"
        onClick={handleSave}
        disabled={saving}
        className="px-4 py-2 rounded-lg bg-primary text-on-primary text-sm font-semibold disabled:opacity-50 hover:opacity-90"
        data-testid="pp-save"
      >
        {saving ? t("publicProfile.saving") : t("publicProfile.save")}
      </button>
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
    <label
      className={`flex items-center gap-3 ${disabled ? "opacity-60" : "cursor-pointer"}`}
    >
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        disabled={disabled}
        className="h-4 w-4 rounded border-border text-primary focus:ring-primary"
        data-testid={testId}
      />
      <span className="text-sm font-medium text-text">{label}</span>
      {disabled && <Lock className="h-3.5 w-3.5 text-text-secondary" />}
    </label>
  );
}
