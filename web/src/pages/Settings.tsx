import React, { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import {
  User,
  CreditCard,
  Building,
  FileText,
  Image as ImageIcon,
  ExternalLink,
  Zap,
  Info,
  Shield,
} from "lucide-react";
import { Link, useSearchParams } from "react-router-dom";
import clsx from "clsx";
import { logError } from "@/lib/errorHandler";
import { api } from "@/lib/api";
import { subscriptionService, SubscriptionStatus } from "@/services/subscriptionService";
import { usePlanLimits } from "@/hooks/usePlanLimits";
import { useToast } from "@/hooks/useToast";
import {
  DEFAULT_CONTRACT_TEMPLATE,
  validateContractTemplate,
} from "@/lib/contractTemplate";
import { ContractTemplateEditor } from "@/components/ContractTemplateEditor";

const formatSubDate = (dateStr?: string) => {
  if (!dateStr) return null;
  try {
    return new Date(dateStr).toLocaleDateString("es-MX", {
      year: "numeric", month: "long", day: "numeric",
    });
  } catch { return null; }
};

const subStatusLabel: Record<string, { text: string; color: string }> = {
  active: { text: "Activa", color: "text-green-600 bg-green-50 dark:bg-green-900/20 dark:text-green-400" },
  past_due: { text: "Pago pendiente", color: "text-yellow-600 bg-yellow-50 dark:bg-yellow-900/20 dark:text-yellow-400" },
  canceled: { text: "Cancelada", color: "text-error bg-error/5" },
  trialing: { text: "Periodo de prueba", color: "text-blue-600 bg-blue-50 dark:bg-blue-900/20 dark:text-blue-400" },
};

export const Settings: React.FC = () => {
  const { user: profile, updateProfile } = useAuth();
  const [searchParams] = useSearchParams();
  const { 
    eventsThisMonth, 
    limit: eventLimit, 
    clientsCount, 
    clientLimit, 
    isBasicPlan 
  } = usePlanLimits();
  const { addToast } = useToast();

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
    profile?.brand_color || "#FF6B35"
  );
  const [isPortalLoading, setIsPortalLoading] = useState(false);
  const [subStatus, setSubStatus] = useState<SubscriptionStatus | null>(null);
  const initialTab = searchParams.get("tab") === "subscription" ? "subscription" : "profile";
  const [activeTab, setActiveTab] = useState<"profile" | "business" | "subscription" | "contracts">(initialTab);

  useEffect(() => {
    if (profile) {
      setBusinessName(profile.business_name || "");
      setContractSettings({
        deposit: profile.default_deposit_percent ?? 50,
        cancellation: profile.default_cancellation_days ?? 15,
        refund: profile.default_refund_percent ?? 0,
      });
      setContractTemplate(profile.contract_template || DEFAULT_CONTRACT_TEMPLATE);
      setBrandColor(profile.brand_color || "#FF6B35");
    }
  }, [profile]);

  useEffect(() => {
    if (activeTab === "subscription") {
      subscriptionService.getStatus().then(setSubStatus).catch(() => {});
    }
  }, [activeTab]);


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

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
      addToast("El archivo es demasiado grande (máximo 10MB).", "error");
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
      addToast(`La plantilla contiene placeholders no soportados: ${invalidTokens.map((t) => `[${t}]`).join(", ")}`, "error");
      return;
    }

    try {
      await updateProfile({
        default_deposit_percent: contractSettings.deposit,
        default_cancellation_days: contractSettings.cancellation,
        default_refund_percent: contractSettings.refund,
        contract_template: contractTemplate,
      });
    } catch (error) {
      logError("Error updating contract settings", error);
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



  return (
    <div className="max-w-6xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      {/* ── HEADER ── */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-text">
            Configuración
          </h1>
          <p className="text-sm text-text-secondary mt-1">
            Personaliza tu experiencia y gestiona tu negocio.
          </p>
        </div>
      </div>

      <div className="flex justify-center w-full">
        <div className="inline-flex bg-surface-alt rounded-2xl p-1 overflow-x-auto border border-border" role="tablist">
          {[
            { id: "profile", label: "Mi Cuenta", icon: User },
            { id: "business", label: "Mi Negocio", icon: Building },
            { id: "contracts", label: "Contratos", icon: FileText },
            { id: "subscription", label: "Suscripción", icon: CreditCard },
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
            <div className="bg-card shadow-sm rounded-3xl p-6 sm:p-8 space-y-8 border border-border">
              <div>
                <h3 className="text-lg font-bold text-text mb-1">
                  Perfil de Usuario
                </h3>
                <p className="text-sm text-text-secondary">
                  Información básica de tu cuenta personal.
                </p>
              </div>

              <div className="grid sm:grid-cols-2 gap-8">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-text-secondary uppercase tracking-wider">Nombre</label>
                  <p className="text-lg font-bold text-text">{profile?.name}</p>
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-text-secondary uppercase tracking-wider">Email</label>
                  <p className="text-lg font-bold text-text">{profile?.email}</p>
                </div>
              </div>

              <div className="pt-6 border-t border-border">
                <button className="flex items-center gap-2 text-primary font-bold hover:gap-3 transition-all">
                  Cambiar contraseña <ExternalLink className="h-4 w-4" />
                </button>
              </div>
            </div>
          )}

          {activeTab === "business" && (
            <div className="bg-card shadow-sm rounded-3xl p-6 sm:p-8 space-y-8 border border-border">
              <div>
                <h3 className="text-lg font-bold text-text mb-1">
                  Identidad de Negocio
                </h3>
                <p className="text-sm text-text-secondary">
                  Personaliza cómo te ven tus clientes en presupuestos y contratos.
                </p>
              </div>

              {/* Business Name */}
              <div className="space-y-4">
                <label className="text-xs font-bold text-text-secondary uppercase tracking-wider">Nombre Comercial</label>
                {isEditingBusiness ? (
                  <div className="flex flex-col sm:flex-row gap-3 max-w-2xl">
                    <input
                      type="text"
                      value={businessName}
                      onChange={(e) => setBusinessName(e.target.value)}
                      className="flex-1 bg-surface border border-border rounded-xl px-4 py-3 font-bold focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
                      placeholder="Ej. Mi Evento Pro"
                    />
                    <div className="flex gap-2">
                      <button
                        onClick={handleUpdateBusinessName}
                        className="bg-primary text-white font-medium px-4 py-2 rounded-md hover:bg-orange-600 transition-colors shadow-sm"
                      >
                        Guardar
                      </button>
                      <button
                        onClick={() => setIsEditingBusiness(false)}
                        className="bg-surface-alt text-text font-bold px-6 py-3 rounded-xl border border-border hover:bg-border transition-all"
                      >
                        Cancelar
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-between p-4 bg-surface-alt/50 rounded-2xl border border-border group hover:border-primary/30 transition-all">
                    <span className="text-lg font-bold">
                      {profile?.business_name || "No configurado"}
                    </span>
                    <button
                      onClick={() => setIsEditingBusiness(true)}
                      className="text-primary font-bold text-sm bg-primary/10 px-4 py-2 rounded-lg opacity-0 group-hover:opacity-100 transition-all"
                    >
                      Editar
                    </button>
                  </div>
                )}
              </div>

              {/* Logo Upload */}
              <div className="space-y-4">
                <label className="text-xs font-bold text-text-secondary uppercase tracking-wider">Logo de Marca</label>
                <div className="flex flex-col sm:flex-row items-center gap-6 p-6 bg-surface-alt/30 rounded-3xl border-2 border-dashed border-border hover:border-primary/50 transition-all text-center sm:text-left">
                  <div className="relative h-24 w-24 shrink-0 bg-card rounded-2xl shadow-inner border border-border overflow-hidden flex items-center justify-center p-2">
                    {profile?.logo_url ? (
                      <img src={profile.logo_url} alt="Logo" className="max-w-full max-h-full object-contain" />
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
                    <h4 className="font-bold">Sube tu logo profesional</h4>
                    <p className="text-xs text-text-secondary">PNG transparente recomendado. Máx 10MB.</p>
                    <label className="inline-block bg-card text-text font-bold text-sm px-6 py-2.5 rounded-xl border border-border shadow-sm hover:shadow-md transition-all cursor-pointer">
                      Seleccionar archivo
                      <input type="file" className="hidden" accept="image/*" onChange={handleLogoUpload} />
                    </label>
                  </div>
                </div>
              </div>

              {/* Brand Color */}
              <div className="space-y-4">
                <label className="text-xs font-bold text-text-secondary uppercase tracking-wider">Color de Marca</label>
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
                  Este color se aplicará automáticamente a tus presupuestos y contratos en PDF.
                </p>
              </div>
            </div>
          )}

          {activeTab === "contracts" && (
            <div className="bg-card shadow-sm rounded-3xl p-6 sm:p-8 space-y-8 border border-border">
              <div>
                <h3 className="text-lg font-bold text-text mb-1">
                  Valores Predeterminados
                </h3>
                <p className="text-sm text-text-secondary">
                  Configura los valores que aparecerán por defecto en tus nuevos eventos.
                </p>
              </div>

              <div className="space-y-8">
                <div className="grid md:grid-cols-3 gap-6">
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-text-secondary uppercase tracking-wider">Anticipo Sugerido</label>
                    <div className="flex items-center gap-3">
                      <input
                        type="number"
                        value={contractSettings.deposit}
                        onChange={(e) => setContractSettings({...contractSettings, deposit: Number(e.target.value)})}
                        className="w-full bg-surface-alt border border-border rounded-xl px-4 py-3 font-bold text-xl"
                      />
                      <span className="text-2xl font-black text-text-secondary">%</span>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-text-secondary uppercase tracking-wider">Días para cancelar</label>
                    <div className="flex items-center gap-3">
                      <input
                        type="number"
                        value={contractSettings.cancellation}
                        onChange={(e) => setContractSettings({...contractSettings, cancellation: Number(e.target.value)})}
                        className="w-full bg-surface-alt border border-border rounded-xl px-4 py-3 font-bold text-xl"
                      />
                      <span className="text-lg font-bold text-text-secondary uppercase">Días</span>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-text-secondary uppercase tracking-wider">Reembolso</label>
                    <div className="flex items-center gap-3">
                      <input
                        type="number"
                        value={contractSettings.refund}
                        onChange={(e) => setContractSettings({...contractSettings, refund: Number(e.target.value)})}
                        className="w-full bg-surface-alt border border-border rounded-xl px-4 py-3 font-bold text-xl"
                      />
                      <span className="text-2xl font-black text-text-secondary">%</span>
                    </div>
                  </div>
                </div>

                <ContractTemplateEditor
                  template={contractTemplate}
                  onChange={setContractTemplate}
                  onSave={handleUpdateContractSettings}
                  isBasicPlan={isBasicPlan}
                />

                <div className="flex justify-end">
                  <button
                    onClick={handleUpdateContractSettings}
                    className="bg-primary text-white font-medium px-6 py-3 rounded-md shadow-sm hover:bg-orange-600 transition-colors"
                  >
                    Guardar Cambios
                  </button>
                </div>
              </div>
            </div>
          )}

          {activeTab === "subscription" && (
            <div className="space-y-6">
              <div className="bg-card shadow-sm rounded-3xl p-6 sm:p-8 border border-border relative overflow-hidden">
                <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-8">
                  <div className="space-y-4">
                    <div className="inline-flex items-center gap-2 bg-surface-alt px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider text-text-secondary">
                      Plan Actual
                    </div>
                    <h2 className="text-4xl font-bold tracking-tight capitalize text-text">
                      {profile?.plan || "Básico"}
                    </h2>
                    <p className="text-text-secondary font-medium text-sm max-w-md">
                      {profile?.plan === "pro"
                        ? "Disfrutas de acceso ilimitado a todas nuestras herramientas profesionales."
                        : "Potencia tu negocio con el plan Pro: eventos ilimitados, gestión de inventario y más."}
                    </p>

                    {/* Subscription details */}
                    {subStatus?.subscription && (
                      <div className="flex flex-wrap items-center gap-3 pt-2">
                        {(() => {
                          const info = subStatusLabel[subStatus.subscription!.status] || { text: subStatus.subscription!.status, color: "text-text-secondary bg-surface-alt" };
                          return (
                            <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold ${info.color}`}>
                              {info.text}
                            </span>
                          );
                        })()}
                        {subStatus.subscription.current_period_end && (
                          <span className="text-xs text-text-secondary">
                            {subStatus.subscription.cancel_at_period_end
                              ? `Se cancela el ${formatSubDate(subStatus.subscription.current_period_end)}`
                              : `Próxima renovación: ${formatSubDate(subStatus.subscription.current_period_end)}`}
                          </span>
                        )}
                      </div>
                    )}

                    {subStatus?.subscription?.cancel_at_period_end && (
                      <div className="mt-2 p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-xl text-sm text-yellow-700 dark:text-yellow-300">
                        Tu suscripción se cancelará al final del periodo actual. Puedes reactivarla desde el portal de pagos.
                      </div>
                    )}
                  </div>

                  <div className="flex flex-col gap-3">
                    {profile?.plan !== "pro" && (
                      <Link
                        to="/pricing"
                        className="bg-primary text-white px-6 py-3 rounded-md font-medium text-center shadow-sm hover:bg-orange-600 transition-colors"
                      >
                        Subir a Pro
                      </Link>
                    )}
                    {(profile?.stripe_customer_id || subStatus?.has_stripe_account) && (
                      <button
                        onClick={handleManageSubscription}
                        disabled={isPortalLoading}
                        className="bg-card border border-border text-text-secondary px-6 py-3 rounded-md font-medium hover:bg-surface-alt transition-colors flex items-center justify-center gap-2"
                      >
                        {isPortalLoading ? "Cargando..." : (
                          <>Gestionar <ExternalLink className="h-4 w-4" /></>
                        )}
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Limits / Usage section */}
              <div className="bg-card shadow-sm rounded-3xl p-6 sm:p-8 border border-border">
                <h3 className="text-lg font-bold text-text mb-6">Uso de este mes</h3>
                <div className="grid sm:grid-cols-2 gap-8">
                  <div className="space-y-3">
                    <div className="flex justify-between text-sm font-bold">
                      <span className="text-text-secondary">Eventos este mes</span>
                      <span>
                        {isBasicPlan ? `${eventsThisMonth} / ${eventLimit}` : 'Ilimitados'}
                      </span>
                    </div>
                    <div className="h-3 bg-surface-alt rounded-full overflow-hidden">
                      <div
                        className="h-full bg-primary transition-all duration-1000"
                        style={{ width: isBasicPlan ? `${Math.min((eventsThisMonth / eventLimit) * 100, 100)}%` : '100%' }}
                      />
                    </div>
                  </div>
                  <div className="space-y-3">
                    <div className="flex justify-between text-sm font-bold">
                      <span className="text-text-secondary">Clientes totales</span>
                      <span>
                        {isBasicPlan ? `${clientsCount} / ${clientLimit}` : 'Ilimitados'}
                      </span>
                    </div>
                    <div className="h-3 bg-surface-alt rounded-full overflow-hidden">
                      <div
                        className="h-full bg-brand-green transition-all duration-1000"
                        style={{ width: isBasicPlan ? `${Math.min((clientsCount / clientLimit) * 100, 100)}%` : '100%' }}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* ── LEGAL LINKS ── */}
        <div className="bg-card shadow-sm rounded-3xl p-6 sm:p-8 border border-border">
          <h3 className="text-lg font-bold text-text mb-1">
            Informacion Legal
          </h3>
          <p className="text-sm text-text-secondary mb-4">
            Conoce mas sobre Solennix y nuestras politicas.
          </p>
          <div className="flex flex-col sm:flex-row gap-3">
            <Link
              to="/about"
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-border bg-surface-alt/50 text-text hover:bg-border transition-colors text-sm font-medium"
            >
              <Info className="h-4 w-4 text-primary" />
              Acerca de Solennix
            </Link>
            <Link
              to="/terms"
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-border bg-surface-alt/50 text-text hover:bg-border transition-colors text-sm font-medium"
            >
              <FileText className="h-4 w-4 text-primary" />
              Terminos y Condiciones
            </Link>
            <Link
              to="/privacy"
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-border bg-surface-alt/50 text-text hover:bg-border transition-colors text-sm font-medium"
            >
              <Shield className="h-4 w-4 text-primary" />
              Politica de Privacidad
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};
