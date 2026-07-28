import { useEffect, useState, useCallback } from "react";
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
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/Button";
import { publicProfileConfigService } from "@/services/publicProfileConfigService";
import type {
  OrganizerPublicProfile,
  OrganizerPublicProfileUpsertRequest,
  OrganizerPublicPortfolioItem,
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

  // Portfolio (Pro+)
  const [portfolio, setPortfolio] = useState<OrganizerPublicPortfolioItem[]>([]);
  const [portfolioLoading, setPortfolioLoading] = useState(false);
  const [portfolioError, setPortfolioError] = useState<string | null>(null);
  const [newTitle, setNewTitle] = useState("");
  const [newPhotoUrl, setNewPhotoUrl] = useState("");
  const [newEventDate, setNewEventDate] = useState("");
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

  // Load portfolio only for paid plans (Free gets 403).
  useEffect(() => {
    if (!paid) {
      setPortfolio([]);
      return;
    }
    let cancelled = false;
    setPortfolioLoading(true);
    (async () => {
      try {
        const items = await publicProfileConfigService.listPortfolio();
        if (!cancelled) setPortfolio(items);
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

  const handleAddPortfolio = async () => {
    setPortfolioError(null);
    const title = newTitle.trim();
    const photo = newPhotoUrl.trim();
    if (!title || !photo) {
      setPortfolioError(t("publicProfile.portfolioSaveFailed"));
      return;
    }
    if (portfolio.length >= PORTFOLIO_MAX) {
      setPortfolioError(t("publicProfile.portfolioMax"));
      return;
    }
    setAddingPortfolio(true);
    try {
      const created = await publicProfileConfigService.createPortfolioItem({
        title,
        photo_url: photo,
        event_date: newEventDate.trim() || null,
        sort_order: portfolio.length, // next free slot 0..5
      });
      setPortfolio((prev) =>
        [...prev, created].sort((a, b) => a.sort_order - b.sort_order),
      );
      setNewTitle("");
      setNewPhotoUrl("");
      setNewEventDate("");
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
      <div className="space-y-4 animate-pulse" aria-busy="true">
        <div className="h-8 bg-surface-alt rounded-xl w-1/3" />
        <div className="h-24 bg-surface-alt rounded-2xl" />
        <div className="h-24 bg-surface-alt rounded-2xl" />
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

      {/* Enable */}
      <div className="space-y-4">
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
            <p
              className="text-xs text-text-secondary break-all"
              data-testid="pp-share-url"
            >
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

      {/* Location */}
      <div className="space-y-3">
        <p className="text-xs font-medium text-text-secondary uppercase tracking-wider">
          {t("publicProfile.location")}
        </p>
        <div className="p-4 bg-surface-alt/50 rounded-2xl border border-border">
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

      {/* Visibility toggles */}
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
      </div>

      {!paid && (
        <div className="flex items-start gap-3 p-4 rounded-2xl border border-primary/20 bg-primary/10">
          <Lock className="h-4 w-4 text-primary shrink-0 mt-0.5" aria-hidden="true" />
          <div>
            <p className="text-sm font-bold text-text">
              {t("publicProfile.planRequired")}
            </p>
            <p className="text-xs text-text-secondary mt-0.5">
              {t("publicProfile.socialsProHint")}
            </p>
          </div>
        </div>
      )}

      {/* Socials (Pro only) */}
      <div className="space-y-3">
        <p className="text-xs font-medium text-text-secondary uppercase tracking-wider flex items-center gap-2">
          {t("publicProfile.socials")}
          {!paid && <Lock className="h-3.5 w-3.5" aria-hidden="true" />}
        </p>
        <div className="p-4 bg-surface-alt/50 rounded-2xl border border-border space-y-2">
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
      </div>

      {/* Portfolio (Pro only, max 6) */}
      <section className="space-y-3" data-testid="pp-portfolio-section">
        <div>
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
        </div>

        {paid && (
          <div className="p-4 bg-surface-alt/50 rounded-2xl border border-border space-y-3">
            {portfolioLoading ? (
              <div className="h-16 bg-surface rounded-xl animate-pulse" />
            ) : portfolio.length === 0 ? (
              <p
                className="text-xs text-text-secondary"
                data-testid="pp-portfolio-empty"
              >
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
                      src={item.thumbnail_url || item.photo_url}
                      alt=""
                      className="h-12 w-12 rounded-lg object-cover bg-surface-alt border border-border"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-text truncate">
                        {item.title}
                      </p>
                      {item.event_date && (
                        <p className="text-xs text-text-secondary">
                          {item.event_date}
                        </p>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => handleDeletePortfolio(item.id)}
                      className="p-2 rounded-xl text-error hover:bg-surface transition-colors"
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
              <div className="space-y-3 pt-2 border-t border-border">
                <input
                  type="text"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder={t("publicProfile.portfolioTitle")}
                  maxLength={160}
                  className={fieldClass}
                  data-testid="pp-portfolio-title"
                />
                <input
                  type="url"
                  value={newPhotoUrl}
                  onChange={(e) => setNewPhotoUrl(e.target.value)}
                  placeholder={t("publicProfile.portfolioPhotoUrl")}
                  className={fieldClass}
                  data-testid="pp-portfolio-photo"
                />
                <input
                  type="date"
                  value={newEventDate}
                  onChange={(e) => setNewEventDate(e.target.value)}
                  className={fieldClass}
                  data-testid="pp-portfolio-date"
                  aria-label={t("publicProfile.portfolioEventDate")}
                />
                <Button
                  type="button"
                  variant="secondary"
                  size="md"
                  onClick={handleAddPortfolio}
                  disabled={
                    addingPortfolio || !newTitle.trim() || !newPhotoUrl.trim()
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
              <p
                className="text-xs text-text-secondary"
                data-testid="pp-portfolio-max"
              >
                {t("publicProfile.portfolioMax")}
              </p>
            )}

            {portfolioError && (
              <p className="text-xs text-error" data-testid="pp-portfolio-error">
                {portfolioError}
              </p>
            )}
          </div>
        )}
      </section>

      {error && (
        <p className="text-sm text-error font-medium" data-testid="pp-error">
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

function ToggleRow({
  label,
  checked,
  onChange,
  disabled,
  testId,
}: ToggleRowProps) {
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
          <Lock
            className="h-3.5 w-3.5 text-text-secondary shrink-0"
            aria-hidden="true"
          />
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
