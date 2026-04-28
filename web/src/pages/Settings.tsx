import React, { useState, useEffect, useMemo } from "react";
import { useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useAuth } from "@/hooks/useAuth";
import {
  User,
  CreditCard,
  Building,
  FileText,
  Image as ImageIcon,
  Info,
  Shield,
  Bell,
  Trash2,
  Zap,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  ChevronRight,
  ShieldCheck,
  History,
  LogOut,
  MapPin,
  Lock,
  Loader2,
} from "lucide-react";
import { Link, useSearchParams, useNavigate } from "react-router-dom";
import clsx from "clsx";
import { logError } from "@/lib/errorHandler";
import { api, getAssetUrl } from "@/lib/api";
import { subscriptionService } from "@/services/subscriptionService";
import { useSubscriptionStatus } from "@/hooks/queries/useSubscriptionQueries";
import { usePlanLimits } from "@/hooks/usePlanLimits";
import { useToast } from "@/hooks/useToast";
import { useTheme } from "@/hooks/useTheme";
import {
  DEFAULT_CONTRACT_TEMPLATE,
  validateContractTemplate,
} from "@/lib/contractTemplate";
import { ContractTemplateEditor } from "@/components/ContractTemplateEditor";

const formatSubDate = (dateStr: string | undefined, i18n: any) => {
  if (!dateStr) return null;
  try {
    const locale = i18n.language === "es" ? "es-MX" : "en-US";
    return new Date(dateStr).toLocaleDateString(locale, {
      year: "numeric", month: "long", day: "numeric",
    });
  } catch { return null; }
};

/** Formats the renewal price when the backend exposes it (Stripe provider). */
const formatSubPrice = (sub: { amount_cents?: number | null; currency?: string | null; billing_interval?: string | null } | null | undefined, t: any) => {
  if (!sub?.amount_cents || !sub?.currency) return null;
  const amount = (sub.amount_cents / 100).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const interval = sub.billing_interval === "year" ? t("common:time.per_year")
    : sub.billing_interval === "month" ? t("common:time.per_month")
    : "";
  return `${sub.currency.toUpperCase()} ${amount}${interval}`;
};

export const Settings: React.FC = () => {
  const { t, i18n } = useTranslation(["settings", "common"]);
  const { user: profile, updateProfile } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const {
    eventsThisMonth,
    eventLimit,
    clientsCount,
    clientLimit,
    isBasicPlan
  } = usePlanLimits();
  const { addToast } = useToast();
  const { isDark, toggleTheme } = useTheme();

  const passwordSchema = useMemo(() => z
    .object({
      currentPassword: z.string().min(1, t("settings:validation.current_password_required")),
      newPassword: z.string().min(8, t("settings:validation.new_password_min")),
      confirmPassword: z.string().min(1, t("settings:validation.confirm_password_required")),
    })
    .refine((d) => d.newPassword === d.confirmPassword, {
      message: t("settings:validation.passwords_mismatch"),
      path: ["confirmPassword"],
    }), [t]);

  type PasswordFormData = z.infer<typeof passwordSchema>;

  const [isEditingBusiness, setIsEditingBusiness] = useState(false);
  const [businessName, setBusinessName] = useState(
    profile?.business_name || "",
  );
  const [contractSettings, setContractSettings] = useState({
    deposit: profile?.default_deposit_percent || 50,
    cancellation: profile?.default_cancellation_days || 15,
    refund: profile?.default_refund_percent || 0,
  });
  const [contractTemplate, setContractTemplate] = useState(
    profile?.contract_template || DEFAULT_CONTRACT_TEMPLATE,
  );
  const [isUploadingLogo, setIsUploadingLogo] = useState(false);
  const [brandColor, setBrandColor] = useState(
    profile?.brand_color || "#C4A265"
  );
  const [isPortalLoading, setIsPortalLoading] = useState(false);
  const { data: subStatus = null } = useSubscriptionStatus();
  const [showBusinessNameInPdf, setShowBusinessNameInPdf] = useState(
    profile?.show_business_name_in_pdf ?? true,
  );
  const [notifPrefs, setNotifPrefs] = useState({
    email_payment_receipt: profile?.email_payment_receipt ?? true,
    email_event_reminder: profile?.email_event_reminder ?? true,
    email_subscription_updates: profile?.email_subscription_updates ?? true,
    email_weekly_summary: profile?.email_weekly_summary ?? false,
    email_marketing: profile?.email_marketing ?? false,
    push_enabled: profile?.push_enabled ?? true,
    push_event_reminder: profile?.push_event_reminder ?? true,
    push_payment_received: profile?.push_payment_received ?? true,
  });
  const initialTab = searchParams.get("tab") === "subscription" ? "subscription" : searchParams.get("tab") === "notifications" ? "notifications" : "profile";
  const [activeTab, setActiveTab] = useState<"profile" | "business" | "subscription" | "contracts" | "notifications">(initialTab as any);
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [showPasswordForm, setShowPasswordForm] = useState(false);

  const {
    register: registerPassword,
    handleSubmit: handlePasswordSubmit,
    reset: resetPassword,
    formState: { errors: passwordErrors },
  } = useForm<PasswordFormData>({ resolver: zodResolver(passwordSchema) });

  useEffect(() => {
    if (profile) {
      setBusinessName(profile.business_name || "");
      setContractSettings({
        deposit: profile.default_deposit_percent ?? 50,
        cancellation: profile.default_cancellation_days ?? 15,
        refund: profile.default_refund_percent ?? 0,
      });
      setContractTemplate(profile.contract_template || DEFAULT_CONTRACT_TEMPLATE);
      setBrandColor(profile.brand_color || "#C4A265");
      setShowBusinessNameInPdf(profile.show_business_name_in_pdf ?? true);
      setNotifPrefs({
        email_payment_receipt: profile.email_payment_receipt ?? true,
        email_event_reminder: profile.email_event_reminder ?? true,
        email_subscription_updates: profile.email_subscription_updates ?? true,
        email_weekly_summary: profile.email_weekly_summary ?? false,
        email_marketing: profile.email_marketing ?? false,
        push_enabled: profile.push_enabled ?? true,
        push_event_reminder: profile.push_event_reminder ?? true,
        push_payment_received: profile.push_payment_received ?? true,
      });
    }
  }, [profile]);

  const subStatusLabels = useMemo<Record<string, { text: string; color: string }>>(() => ({
    active: { text: t("settings:subscription.status.active"), color: "text-success bg-success/10" },
    past_due: { text: t("settings:subscription.status.past_due"), color: "text-warning bg-warning/10" },
    canceled: { text: t("settings:subscription.status.canceled"), color: "text-error bg-error/5" },
    trialing: { text: t("settings:subscription.status.trialing"), color: "text-info bg-info/10" },
  }), [t]);

  const planLabels = useMemo<Record<string, string>>(() => ({
    basic: t("settings:plans.basic"),
    pro: t("settings:plans.pro"),
    business: t("settings:plans.business"),
    premium: t("settings:plans.pro"),
  }), [t]);

  const fallbackProviderLabels = useMemo<Record<string, { badge: string; cancelInstructions: string }>>(() => ({
    stripe: {
      badge: t("settings:subscription.provider.stripe.badge"),
      cancelInstructions: t("settings:subscription.provider.stripe.cancel"),
    },
    apple: {
      badge: t("settings:subscription.provider.apple.badge"),
      cancelInstructions: t("settings:subscription.provider.apple.cancel"),
    },
    google: {
      badge: t("settings:subscription.provider.google.badge"),
      cancelInstructions: t("settings:subscription.provider.google.cancel"),
    },
  }), [t]);



  const handleUpdateBusinessName = async () => {
    try {
      await updateProfile({ business_name: businessName });
      setIsEditingBusiness(false);
    } catch (error) {
      logError("Error updating business name", error);
    }
  };

  const handleUpdateBrandColor = async () => {
    try {
      await updateProfile({ brand_color: brandColor });
    } catch (error) {
      logError("Error updating brand color", error);
    }
  };

  const handleToggleBusinessNameInPdf = async (value: boolean) => {
    setShowBusinessNameInPdf(value);
    try {
      await updateProfile({ show_business_name_in_pdf: value });
    } catch (error) {
      logError("Error updating PDF name setting", error);
      setShowBusinessNameInPdf(!value);
    }
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      addToast(t("settings:business.logo_error_size"), "error");
      return;
    }

    try {
      setIsUploadingLogo(true);
      const formData = new FormData();
      formData.append('file', file);
      const result = await api.postFormData<{ url: string }>('/uploads/image', formData);
      await updateProfile({ logo_url: result.url });
    } catch (error) {
      logError("Error uploading logo", error);
    } finally {
      setIsUploadingLogo(false);
    }
  };

  const handleUpdateContractSettings = async () => {
    const { invalidTokens } = validateContractTemplate(contractTemplate);
    if (invalidTokens.length > 0) {
      addToast(t("settings:contracts.validation_error", { tokens: invalidTokens.map((t) => `[${t}]`).join(", ") }), "error");
      return;
    }

    try {
      await updateProfile({
        default_deposit_percent: contractSettings.deposit,
        default_cancellation_days: contractSettings.cancellation,
        default_refund_percent: contractSettings.refund,
        contract_template: contractTemplate,
      });
      addToast(t("settings:contracts.success"), "success");
    } catch (error) {
      logError("Error updating contract settings", error);
      addToast(t("settings:contracts.error"), "error");
    }
  };

  const handleChangePassword = handlePasswordSubmit(async (data: PasswordFormData) => {
    setIsChangingPassword(true);
    try {
      await api.post("/auth/change-password", {
        current_password: data.currentPassword,
        new_password: data.newPassword,
      });
      addToast(t("settings:profile.password_form.success"), "success");
      setShowPasswordForm(false);
      resetPassword();
    } catch (error: unknown) {
      const msg = error instanceof Error && error.message.includes("incorrect")
        ? t("settings:profile.password_form.error_incorrect")
        : t("settings:profile.password_form.error_generic");
      addToast(msg, "error");
    } finally {
      setIsChangingPassword(false);
    }
  });

  const handleToggleNotif = async (key: keyof typeof notifPrefs, value: boolean) => {
    setNotifPrefs((prev) => ({ ...prev, [key]: value }));
    try {
      await updateProfile({ [key]: value });
    } catch (error) {
      logError(`Error updating ${key}`, error);
      setNotifPrefs((prev) => ({ ...prev, [key]: !value }));
    }
  };

  const handleManageSubscription = async () => {
    try {
      setIsPortalLoading(true);
      const { url } = await subscriptionService.createPortalSession();
      if (url) {
        window.location.href = url;
      }
    } catch (err: unknown) {
      logError("Error opening billing portal", err);
    } finally {
      setIsPortalLoading(false);
    }
  };



  // Guard: do not render the form until auth profile is loaded. useState
  // defaults are computed at mount with `profile?.foo || fallback`, so if
  // a user clicked Save before the sync-effect ran, stale defaults would
  // overwrite real server values. Returning the loader until profile is
  // non-null sidesteps that race.
  if (!profile) {
    return (
      <div
        className="flex justify-center items-center h-64"
        role="status"
        aria-live="polite"
      >
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        <span className="sr-only">{t("settings:loading")}</span>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      {/* ── HEADER ── */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-text">
            {t("settings:title")}
          </h1>
          <p className="text-sm text-text-secondary mt-1">
            {t("settings:subtitle")}
          </p>
        </div>
      </div>

      <div className="flex justify-center w-full">
        <div className="inline-flex bg-surface-alt rounded-2xl p-1 overflow-x-auto border border-border" role="tablist">
          {[
            { id: "profile", label: t("settings:tabs.profile"), icon: User },
            { id: "business", label: t("settings:tabs.business"), icon: Building },
            { id: "contracts", label: t("settings:tabs.contracts"), icon: FileText },
            { id: "notifications", label: t("settings:tabs.notifications"), icon: Bell },
            { id: "subscription", label: t("settings:tabs.subscription"), icon: CreditCard },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as typeof activeTab)}
              className={clsx(
                "px-6 py-2.5 rounded-xl text-sm font-bold flex items-center transition-all whitespace-nowrap",
                activeTab === tab.id
                  ? "bg-card text-primary shadow-sm border border-border/50"
                  : "text-text-secondary hover:text-text hover:bg-surface-alt"
              )}
              role="tab"
              aria-selected={activeTab === tab.id}
            >
              <tab.icon className="h-4 w-4 mr-2" />
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-6">
        {/* ── CONTENT AREA ── */}
        <div className="w-full">
          {activeTab === "profile" && (
            <div className="bg-card shadow-sm rounded-2xl p-6 sm:p-8 space-y-8 border border-border">
              <div>
                <h3 className="text-lg font-bold text-text mb-1">
                  {t("settings:profile.title")}
                </h3>
                <p className="text-sm text-text-secondary">
                  {t("settings:profile.description")}
                </p>
              </div>

              <div className="grid sm:grid-cols-2 gap-8">
                <div className="space-y-1">
                  <label className="text-xs font-medium text-text-secondary">{t("settings:profile.name")}</label>
                  <p className="text-lg font-bold text-text">{profile?.name}</p>
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium text-text-secondary">{t("settings:profile.email")}</label>
                  <p className="text-lg font-bold text-text">{profile?.email}</p>
                </div>
              </div>

              <div className="pt-6 border-t border-border space-y-4">
                {!showPasswordForm ? (
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <button
                      type="button"
                      onClick={() => setShowPasswordForm(true)}
                      className="flex items-center gap-2 text-primary font-bold hover:gap-3 transition-all"
                    >
                      {t("settings:profile.change_password")} <Shield className="h-4 w-4" />
                    </button>
                  </div>
                ) : (
                  <div className="space-y-4 max-w-md">
                    <h4 className="font-bold text-text">{t("settings:profile.password_form.title")}</h4>
                    <div>
                      <input
                        type="password"
                        placeholder={t("settings:profile.password_form.current")}
                        {...registerPassword("currentPassword")}
                        className="w-full bg-surface border border-border rounded-xl px-4 py-3 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
                        aria-invalid={passwordErrors.currentPassword ? "true" : "false"}
                      />
                      {passwordErrors.currentPassword && (
                        <p className="mt-1 text-xs text-error" role="alert">{passwordErrors.currentPassword.message}</p>
                      )}
                    </div>
                    <div>
                      <input
                        type="password"
                        placeholder={t("settings:profile.password_form.new")}
                        {...registerPassword("newPassword")}
                        className="w-full bg-surface border border-border rounded-xl px-4 py-3 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
                        aria-invalid={passwordErrors.newPassword ? "true" : "false"}
                      />
                      {passwordErrors.newPassword && (
                        <p className="mt-1 text-xs text-error" role="alert">{passwordErrors.newPassword.message}</p>
                      )}
                    </div>
                    <div>
                      <input
                        type="password"
                        placeholder={t("settings:profile.password_form.confirm")}
                        {...registerPassword("confirmPassword")}
                        className="w-full bg-surface border border-border rounded-xl px-4 py-3 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
                        aria-invalid={passwordErrors.confirmPassword ? "true" : "false"}
                      />
                      {passwordErrors.confirmPassword && (
                        <p className="mt-1 text-xs text-error" role="alert">{passwordErrors.confirmPassword.message}</p>
                      )}
                    </div>
                    <div className="flex gap-3">
                      <button
                        type="button"
                        onClick={handleChangePassword}
                        disabled={isChangingPassword}
                        className="bg-primary text-white font-medium px-4 py-2 rounded-md hover:bg-primary-dark transition-colors shadow-sm disabled:opacity-50"
                      >
                        {isChangingPassword ? t("common:action.saving") : t("common:action.save")}
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setShowPasswordForm(false);
                          resetPassword();
                        }}
                        className="bg-surface-alt text-text font-bold px-4 py-2 rounded-xl border border-border hover:bg-border transition-all"
                      >
                        {t("common:action.cancel")}
                      </button>
                    </div>
                  </div>
                )}
                <div className="flex items-center justify-between sm:justify-end gap-4">
                  <div>
                    <p className="font-bold text-text">{t("settings:profile.dark_mode")}</p>
                    <p className="text-xs text-text-secondary">{t("settings:profile.dark_mode_desc")}</p>
                  </div>
                  <button
                    type="button"
                    onClick={toggleTheme}
                    className={clsx(
                      "relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors focus:outline-none",
                      isDark ? "bg-primary" : "bg-surface-alt border border-border",
                    )}
                    role="switch"
                    aria-checked={isDark}
                    aria-label={t("settings:profile.dark_mode")}
                  >
                    <span
                      className={clsx(
                        "inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform",
                        isDark ? "translate-x-6" : "translate-x-1",
                      )}
                    />
                  </button>
                </div>

                <div className="flex items-center justify-between sm:justify-end gap-4">
                  <div>
                    <p className="font-bold text-text">{t("settings:profile.language")}</p>
                    <p className="text-xs text-text-secondary">{t("settings:profile.language_desc")}</p>
                  </div>
                  <select
                    value={i18n.language.split("-")[0]}
                    onChange={async (e) => {
                      const lang = e.target.value;
                      await i18n.changeLanguage(lang);
                      try {
                        await updateProfile({ preferred_language: lang });
                        addToast(t("settings:messages.language_updated"), "success");
                      } catch (err) {
                        logError("Error persisting language", err);
                      }
                    }}
                    className="bg-surface-alt text-text font-bold text-sm px-4 py-2 rounded-xl border border-border focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
                  >
                    <option value="es">Español</option>
                    <option value="en">English</option>
                  </select>
                </div>

                <div className="pt-6 border-t border-border">
                  <Link
                    to="/eliminar-cuenta"
                    className="flex items-center gap-2 text-error font-bold hover:gap-3 transition-all"
                  >
                    {t("settings:profile.delete_account")} <Trash2 className="h-4 w-4" />
                  </Link>
                  <p className="text-xs text-text-secondary mt-1">
                    {t("settings:profile.delete_account_desc")}
                  </p>
                </div>
              </div>
            </div>
          )}

          {activeTab === "business" && (
            <div className="bg-card shadow-sm rounded-2xl p-6 sm:p-8 space-y-8 border border-border">
              <div>
                <h3 className="text-lg font-bold text-text mb-1">{t("settings:business.title")}</h3>
                <p className="text-sm text-text-secondary">{t("settings:business.description")}</p>
              </div>

              {/* Business Name */}
              <div className="space-y-4">
                <label className="text-xs font-medium text-text-secondary">{t("settings:business.name_label")}</label>
                {isEditingBusiness ? (
                  <div className="flex flex-col sm:flex-row gap-3 max-w-2xl">
                    <input
                      type="text"
                      value={businessName}
                      onChange={(e) => setBusinessName(e.target.value)}
                      className="flex-1 bg-surface border border-border rounded-xl px-4 py-3 font-bold focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
                      placeholder={t("settings:business.name_placeholder")}
                    />
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={handleUpdateBusinessName}
                        className="bg-primary text-white font-medium px-4 py-2 rounded-md hover:bg-primary-dark transition-colors shadow-sm"
                      >
                        {t("common:action.save")}
                      </button>
                      <button
                        type="button"
                        onClick={() => setIsEditingBusiness(false)}
                        className="bg-surface-alt text-text font-bold px-6 py-3 rounded-xl border border-border hover:bg-border transition-all"
                      >
                        {t("common:action.cancel")}
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-between p-4 bg-surface-alt/50 rounded-2xl border border-border group hover:border-primary/30 transition-all">
                    <span className="text-lg font-bold">
                      {profile?.business_name || t("settings:business.not_configured")}
                    </span>
                    <button
                      type="button"
                      onClick={() => setIsEditingBusiness(true)}
                      className="text-primary font-bold text-sm bg-primary/10 px-4 py-2 rounded-lg opacity-0 group-hover:opacity-100 transition-all"
                    >
                      {t("common:action.edit")}
                    </button>
                  </div>
                )}
              </div>

              {/* Logo Upload */}
              <div className="space-y-4">
                <label className="text-xs font-medium text-text-secondary">{t("settings:business.logo_label")}</label>
                <div className="flex flex-col sm:flex-row items-center gap-6 p-6 bg-surface-alt/30 rounded-2xl border-2 border-dashed border-border hover:border-primary/50 transition-all text-center sm:text-left">
                  <div className="relative h-24 w-24 shrink-0 bg-card rounded-2xl shadow-inner border border-border overflow-hidden flex items-center justify-center p-2">
                    {profile?.logo_url ? (
                      <img src={getAssetUrl(profile.logo_url)} alt="Logo" className="max-w-full max-h-full object-contain" />
                    ) : (
                      <ImageIcon className="h-10 w-10 text-text-secondary" />
                    )}
                    {isUploadingLogo && (
                      <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                        <Zap className="h-6 w-6 text-white animate-pulse" />
                      </div>
                    )}
                  </div>
                  <div className="flex-1 space-y-2">
                    <h4 className="font-bold">{t("settings:business.logo_title")}</h4>
                    <p className="text-xs text-text-secondary">{t("settings:business.logo_desc")}</p>
                    <label className="inline-block bg-card text-text font-bold text-sm px-6 py-2.5 rounded-xl border border-border shadow-sm hover:shadow-md transition-all cursor-pointer">
                      {t("settings:business.logo_select")}
                      <input type="file" className="hidden" accept="image/*" onChange={handleLogoUpload} />
                    </label>
                  </div>
                </div>
              </div>

              {/* Show Business Name in PDFs */}
              <div className="space-y-4">
                <label className="text-xs font-medium text-text-secondary">{t("settings:business.pdf_settings")}</label>
                <div className="flex items-center justify-between p-4 bg-surface-alt/50 rounded-2xl border border-border">
                  <div>
                    <p className="font-bold text-text">{t("settings:business.show_name_pdf")}</p>
                    <p className="text-xs text-text-secondary mt-0.5">{t("settings:business.show_name_pdf_desc")}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleToggleBusinessNameInPdf(!showBusinessNameInPdf)}
                    className={clsx(
                      "relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors focus:outline-none",
                      showBusinessNameInPdf ? "bg-primary" : "bg-surface-alt border border-border",
                    )}
                    role="switch"
                    aria-checked={showBusinessNameInPdf}
                    aria-label={t("settings:business.show_name_pdf")}
                  >
                    <span
                      className={clsx(
                        "inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform",
                        showBusinessNameInPdf ? "translate-x-6" : "translate-x-1",
                      )}
                    />
                  </button>
                </div>
              </div>

              {/* Brand Color */}
              <div className="space-y-4">
                <label className="text-xs font-medium text-text-secondary">{t("settings:business.brand_color")}</label>
                <div className="flex items-center gap-4">
                  <input
                    type="color"
                    value={brandColor}
                    onChange={(e) => setBrandColor(e.target.value)}
                    onBlur={handleUpdateBrandColor}
                    className="h-12 w-12 rounded-xl border-4 border-card shadow-xl cursor-pointer"
                  />
                  <div className="flex-1 px-4 py-3 bg-surface-alt/50 rounded-xl border border-border font-mono font-bold uppercase">
                    {brandColor}
                  </div>
                </div>
                <p className="text-xs text-text-secondary italic">
                  {t("settings:business.brand_color_help")}
                </p>
              </div>
            </div>
          )}

          {activeTab === "contracts" && (
            <div className="bg-card shadow-sm rounded-2xl p-6 sm:p-8 space-y-8 border border-border">
              <div>
                <h3 className="text-lg font-bold text-text mb-1">{t("settings:contracts.title")}</h3>
                <p className="text-sm text-text-secondary">{t("settings:contracts.description")}</p>
              </div>

              <div className="space-y-8">
                <div className="grid md:grid-cols-3 gap-6">
                  <div className="space-y-2">
                    <label className="text-xs font-medium text-text-secondary">{t("settings:contracts.deposit")}</label>
                    <div className="flex items-center gap-3">
                      <input
                        type="number"
                        value={contractSettings.deposit}
                        onChange={(e) => setContractSettings({...contractSettings, deposit: Number(e.target.value)})}
                        className="w-full bg-surface-alt border border-border rounded-xl px-4 py-3 font-bold text-xl"
                      />
                      <span className="text-2xl font-bold text-text-secondary">%</span>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-medium text-text-secondary">{t("settings:contracts.cancellation")}</label>
                    <div className="flex items-center gap-3">
                      <input
                        type="number"
                        value={contractSettings.cancellation}
                        onChange={(e) => setContractSettings({...contractSettings, cancellation: Number(e.target.value)})}
                        className="w-full bg-surface-alt border border-border rounded-xl px-4 py-3 font-bold text-xl"
                      />
                      <span className="text-lg font-bold text-text-secondary uppercase">{t("settings:contracts.days")}</span>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-medium text-text-secondary">{t("settings:contracts.refund")}</label>
                    <div className="flex items-center gap-3">
                      <input
                        type="number"
                        value={contractSettings.refund}
                        onChange={(e) => setContractSettings({...contractSettings, refund: Number(e.target.value)})}
                        className="w-full bg-surface-alt border border-border rounded-xl px-4 py-3 font-bold text-xl"
                      />
                      <span className="text-2xl font-bold text-text-secondary">%</span>
                    </div>
                  </div>
                </div>

                <ContractTemplateEditor
                  template={contractTemplate}
                  onChange={setContractTemplate}
                  onSave={handleUpdateContractSettings}
                  isBasicPlan={isBasicPlan}
                />
              </div>
            </div>
          )}

          {activeTab === "notifications" && (
            <div className="bg-card shadow-sm rounded-2xl p-6 sm:p-8 space-y-8 border border-border">
              <div>
                <h3 className="text-lg font-bold text-text mb-1">{t("settings:notifications.title")}</h3>
                <p className="text-sm text-text-secondary">{t("settings:notifications.description")}</p>
              </div>

              {/* Email Notifications */}
              <div className="space-y-4">
                <label className="text-xs font-medium text-text-secondary uppercase tracking-wider">{t("settings:notifications.email_group")}</label>
                {([
                  { key: "email_payment_receipt" as const, label: t("settings:notifications.items.email_payment_receipt.label"), desc: t("settings:notifications.items.email_payment_receipt.desc") },
                  { key: "email_event_reminder" as const, label: t("settings:notifications.items.email_event_reminder.label"), desc: t("settings:notifications.items.email_event_reminder.desc") },
                  { key: "email_subscription_updates" as const, label: t("settings:notifications.items.email_subscription_updates.label"), desc: t("settings:notifications.items.email_subscription_updates.desc") },
                  { key: "email_weekly_summary" as const, label: t("settings:notifications.items.email_weekly_summary.label"), desc: t("settings:notifications.items.email_weekly_summary.desc") },
                  { key: "email_marketing" as const, label: t("settings:notifications.items.email_marketing.label"), desc: t("settings:notifications.items.email_marketing.desc") },
                ]).map((item) => (
                  <div key={item.key} className="flex items-center justify-between p-4 bg-surface-alt/50 rounded-2xl border border-border">
                    <div>
                      <p className="font-bold text-text">{item.label}</p>
                      <p className="text-xs text-text-secondary mt-0.5">{item.desc}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleToggleNotif(item.key, !notifPrefs[item.key])}
                      className={clsx(
                        "relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors focus:outline-none",
                        notifPrefs[item.key] ? "bg-primary" : "bg-surface-alt border border-border",
                      )}
                      role="switch"
                      aria-checked={notifPrefs[item.key]}
                      aria-label={item.label}
                    >
                      <span
                        className={clsx(
                          "inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform",
                          notifPrefs[item.key] ? "translate-x-6" : "translate-x-1",
                        )}
                      />
                    </button>
                  </div>
                ))}
              </div>

              {/* Push Notifications */}
              <div className="space-y-4">
                <label className="text-xs font-medium text-text-secondary uppercase tracking-wider">{t("settings:notifications.push_group")}</label>
                <div className="flex items-center justify-between p-4 bg-surface-alt/50 rounded-2xl border border-border">
                  <div>
                    <p className="font-bold text-text">{t("settings:notifications.items.push_enabled.label")}</p>
                    <p className="text-xs text-text-secondary mt-0.5">{t("settings:notifications.items.push_enabled.desc")}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleToggleNotif("push_enabled", !notifPrefs.push_enabled)}
                    className={clsx(
                      "relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors focus:outline-none",
                      notifPrefs.push_enabled ? "bg-primary" : "bg-surface-alt border border-border",
                    )}
                    role="switch"
                    aria-checked={notifPrefs.push_enabled}
                    aria-label={t("settings:notifications.items.push_enabled.label")}
                  >
                    <span
                      className={clsx(
                        "inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform",
                        notifPrefs.push_enabled ? "translate-x-6" : "translate-x-1",
                      )}
                    />
                  </button>
                </div>
                <div className={clsx(!notifPrefs.push_enabled && "opacity-50 pointer-events-none")}>
                  {([
                    { key: "push_event_reminder" as const, label: t("settings:notifications.items.push_event_reminder.label"), desc: t("settings:notifications.items.push_event_reminder.desc") },
                    { key: "push_payment_received" as const, label: t("settings:notifications.items.push_payment_received.label"), desc: t("settings:notifications.items.push_payment_received.desc") },
                  ]).map((item) => (
                    <div key={item.key} className="flex items-center justify-between p-4 bg-surface-alt/50 rounded-2xl border border-border mt-4">
                      <div>
                        <p className="font-bold text-text">{item.label}</p>
                        <p className="text-xs text-text-secondary mt-0.5">{item.desc}</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleToggleNotif(item.key, !notifPrefs[item.key])}
                        className={clsx(
                          "relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors focus:outline-none",
                          notifPrefs[item.key] ? "bg-primary" : "bg-surface-alt border border-border",
                        )}
                        role="switch"
                        aria-checked={notifPrefs[item.key]}
                        aria-label={item.label}
                      >
                        <span
                          className={clsx(
                            "inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform",
                            notifPrefs[item.key] ? "translate-x-6" : "translate-x-1",
                          )}
                        />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {activeTab === "subscription" && (
            <div className="bg-card shadow-sm rounded-2xl p-6 sm:p-8 space-y-8 border border-border">
              <div>
                <h3 className="text-lg font-bold text-text mb-1">
                  {t("settings:subscription.title")}
                </h3>
                <p className="text-sm text-text-secondary">
                  {t("settings:subscription.description")}
                </p>
              </div>

              {/* Status Badge */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 bg-surface-alt/50 rounded-2xl border border-border">
                <div className="flex items-center gap-4">
                  <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                    <Zap className="h-6 w-6" />
                  </div>
                  <div>
                    <h4 className="font-bold text-text">
                      {t("settings:subscription.current_plan_label")}
                    </h4>
                    <p className="text-sm font-semibold text-text-secondary mt-0.5">
                      {planLabels[subStatus?.plan || "basic"] ||
                        (subStatus?.plan ?? t("settings:plans.basic"))}
                    </p>
                    <span
                      className={clsx(
                        "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold mt-1",
                        subStatusLabels[subStatus?.subscription?.status || "active"]?.color ||
                          "bg-surface-alt text-text-secondary"
                      )}
                    >
                      {subStatusLabels[subStatus?.subscription?.status || "active"]?.text ||
                        subStatus?.subscription?.status || t("settings:subscription.active")}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <span className="text-xs font-bold text-text-secondary uppercase tracking-widest">
                    {fallbackProviderLabels[subStatus?.subscription?.provider || "stripe"].badge}
                  </span>
                  {subStatus?.has_stripe_account && (
                    <button
                      type="button"
                      onClick={handleManageSubscription}
                      disabled={isPortalLoading}
                      className="inline-flex items-center justify-center px-6 py-2.5 bg-primary text-white text-sm font-bold rounded-xl hover:bg-primary-dark transition-all shadow-md shadow-primary/20 hover:shadow-lg disabled:opacity-50"
                    >
                      {isPortalLoading ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          {t("common:action.loading")}
                        </>
                      ) : (
                        <>
                          {t("settings:subscription.manage")}{" "}
                          <ExternalLink className="ml-2 h-4 w-4" />
                        </>
                      )}
                    </button>
                  )}
                </div>
              </div>

              {/* Renewal info & limits */}
              <div className="grid md:grid-cols-2 gap-8">
                <div className="space-y-4">
                  <div className="flex items-start gap-3 text-text-secondary">
                    <Info className="h-5 w-5 shrink-0 mt-0.5" />
                    <div className="text-sm">
                      <p className="font-medium text-text">
                        {subStatus?.subscription?.cancel_instructions ||
                          fallbackProviderLabels[subStatus?.subscription?.provider || "stripe"]
                            .cancelInstructions}
                      </p>
                      {subStatus?.subscription?.status !== "canceled" && (
                        <div className="mt-2 space-y-1">
                      {subStatus?.subscription?.cancel_at_period_end && (
                        <p className="font-semibold text-warning">
                          {t("settings:subscription.cancel_at_period_end")}
                        </p>
                      )}
                      {subStatus?.subscription?.current_period_end && (
                        <p className="text-text-secondary">
                          {t(subStatus?.subscription?.cancel_at_period_end ? "settings:subscription.cancels_on" : "settings:subscription.next_payment", {
                            date: formatSubDate(subStatus.subscription.current_period_end, i18n),
                          })}
                        </p>
                      )}
                      {formatSubPrice(subStatus?.subscription, t) && (
                        <p className="font-bold text-text">
                          {t("settings:subscription.renewal_price", {
                            price: formatSubPrice(subStatus.subscription, t),
                          })}
                        </p>
                      )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <div className="bg-surface-alt/30 rounded-2xl p-6 border border-border space-y-6">
                  <h5 className="text-xs font-bold text-text-secondary uppercase tracking-widest">
                    {t("settings:subscription.usage")}
                  </h5>

                  <div className="space-y-4">
                    {/* Events Usage */}
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="font-medium text-text-secondary">
                          {t("settings:subscription.events")}
                        </span>
                        <span className="font-bold text-text">
                          {eventsThisMonth}{" "}
                          <span className="text-text-secondary font-normal">
                            {t("settings:subscription.of")}{" "}
                            {eventLimit === 999999
                              ? t("settings:subscription.unlimited")
                              : eventLimit}
                          </span>
                        </span>
                      </div>
                      <div className="h-2 bg-surface rounded-full overflow-hidden border border-border/50">
                        <div
                          className="h-full bg-primary transition-all duration-1000"
                          style={{
                            width: `${Math.min(
                              100,
                              (eventsThisMonth / (eventLimit || 1)) * 100
                            )}%`,
                          }}
                        />
                      </div>
                    </div>

                    {/* Clients Usage */}
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="font-medium text-text-secondary">
                          {t("settings:subscription.clients")}
                        </span>
                        <span className="font-bold text-text">
                          {clientsCount}{" "}
                          <span className="text-text-secondary font-normal">
                            {t("settings:subscription.of")}{" "}
                            {clientLimit === 999999
                              ? t("settings:subscription.unlimited")
                              : clientLimit}
                          </span>
                        </span>
                      </div>
                      <div className="h-2 bg-surface rounded-full overflow-hidden border border-border/50">
                        <div
                          className="h-full bg-primary transition-all duration-1000"
                          style={{
                            width: `${Math.min(
                              100,
                              (clientsCount / (clientLimit || 1)) * 100
                            )}%`,
                          }}
                        />
                      </div>
                    </div>
                  </div>

                  {isBasicPlan && (
                    <button
                      type="button"
                      onClick={() => navigate("/pricing")}
                      className="w-full mt-2 py-3 rounded-xl border border-primary/20 text-primary text-sm font-bold hover:bg-primary/5 transition-colors"
                    >
                      {t("settings:subscription.upgrade_pro")}
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* ── LEGAL LINKS ── */}
        <div className="bg-card shadow-sm rounded-2xl p-6 sm:p-8 border border-border">
          <h3 className="text-lg font-bold text-text mb-1">
            {t("common:legal.title")}
          </h3>
          <p className="text-sm text-text-secondary mb-4">
            {t("common:legal.subtitle")}
          </p>
          <div className="flex flex-col sm:flex-row gap-3">
            <Link
              to="/about"
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-border bg-surface-alt/50 text-text hover:bg-border transition-colors text-sm font-medium"
            >
              <Info className="h-4 w-4 text-primary" />
              {t("common:legal.about")}
            </Link>
            <Link
              to="/terms"
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-border bg-surface-alt/50 text-text hover:bg-border transition-colors text-sm font-medium"
            >
              <FileText className="h-4 w-4 text-primary" />
              {t("common:legal.terms")}
            </Link>
            <Link
              to="/privacy"
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-border bg-surface-alt/50 text-text hover:bg-border transition-colors text-sm font-medium"
            >
              <Shield className="h-4 w-4 text-primary" />
              {t("common:legal.privacy")}
            </Link>
            <Link
              to="/eliminar-cuenta"
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-border bg-surface-alt/50 text-text hover:bg-border transition-colors text-sm font-medium"
            >
              <Trash2 className="h-4 w-4 text-error" />
              {t("common:legal.delete_account")}
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};
