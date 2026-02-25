import React, { useState, useEffect } from "react";
import { useAuth } from "../contexts/AuthContext";
import {
  User,
  CreditCard,
  Shield,
  Building,
  FileText,
  Image as ImageIcon,
  ExternalLink,
  Zap,
  CheckCircle,
} from "lucide-react";
import { logError } from "../lib/errorHandler";
import { subscriptionService } from "../services/subscriptionService";

export const Settings: React.FC = () => {
  const { user: profile, updateProfile, checkAuth } = useAuth();
  const [isEditingBusiness, setIsEditingBusiness] = useState(false);
  const [businessName, setBusinessName] = useState(
    profile?.business_name || "",
  );
  const [contractSettings, setContractSettings] = useState({
    deposit: profile?.default_deposit_percent || 50,
    cancellation: profile?.default_cancellation_days || 15,
    refund: profile?.default_refund_percent || 0,
  });
  const [isEditingContract, setIsEditingContract] = useState(false);
  const [isUploadingLogo, setIsUploadingLogo] = useState(false);
  const [isEditingColor, setIsEditingColor] = useState(false);
  const [brandColor, setBrandColor] = useState(
    profile?.brand_color || "#FF6B35"
  );
  const [showBusinessName, setShowBusinessName] = useState(
    profile?.show_business_name_in_pdf ?? true
  );
  const [isPortalLoading, setIsPortalLoading] = useState(false);
  const [portalError, setPortalError] = useState<string | null>(null);
  const [isDebugLoading, setIsDebugLoading] = useState(false);

  useEffect(() => {
    if (profile) {
      setBusinessName(profile.business_name || "");
      setContractSettings({
        deposit: profile.default_deposit_percent ?? 50,
        cancellation: profile.default_cancellation_days ?? 15,
        refund: profile.default_refund_percent ?? 0,
      });
      setBrandColor(profile.brand_color || "#FF6B35");
      setShowBusinessName(profile.show_business_name_in_pdf ?? true);
    }
  }, [profile]);


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
      setIsEditingColor(false);
    } catch (error) {
      logError("Error updating brand color", error);
    }
  };

  const handleToggleShowBusinessName = async (checked: boolean) => {
    try {
      setShowBusinessName(checked);
      await updateProfile({ show_business_name_in_pdf: checked });
    } catch (error) {
      logError("Error updating show business name toggle", error);
      // Revert local state on error
      setShowBusinessName(!checked);
    }
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      alert("El archivo es demasiado grande (máximo 2MB).");
      return;
    }

    try {
      setIsUploadingLogo(true);
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64 = reader.result as string;
        await updateProfile({ logo_url: base64 });
        setIsUploadingLogo(false);
      };
      reader.readAsDataURL(file);
    } catch (error) {
      logError("Error uploading logo", error);
      setIsUploadingLogo(false);
    }
  };

  const handleUpdateContractSettings = async () => {
    try {
      await updateProfile({
        default_deposit_percent: contractSettings.deposit,
        default_cancellation_days: contractSettings.cancellation,
        default_refund_percent: contractSettings.refund,
      });
      setIsEditingContract(false);
    } catch (error) {
      logError("Error updating contract settings", error);
    }
  };

  const handleManageSubscription = async () => {
    try {
      setIsPortalLoading(true);
      setPortalError(null);
      const { url } = await subscriptionService.createPortalSession();
      if (url) {
        window.location.href = url;
      }
    } catch (err: unknown) {
      logError("Error opening billing portal", err);
      setPortalError("No se pudo abrir el portal. Asegúrate de tener una suscripción activa con Stripe.");
    } finally {
      setIsPortalLoading(false);
    }
  };

  const handleDebugDowngrade = async () => {
    try {
      setIsDebugLoading(true);
      await subscriptionService.debugDowngrade();
      await checkAuth();
    } catch (err: unknown) {
      logError("Error debug downgrade", err);
    } finally {
      setIsDebugLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Configuración</h1>
      </div>

      <div className="bg-white dark:bg-gray-800 shadow-sm overflow-hidden sm:rounded-lg">
        <div className="px-4 py-5 sm:px-6">
          <h3 className="text-lg leading-6 font-medium text-gray-900 dark:text-white">
            Perfil de Usuario
          </h3>
          <p className="mt-1 max-w-2xl text-sm text-gray-500 dark:text-gray-400">
            Detalles de la cuenta y suscripción.
          </p>
        </div>
        <div className="border-t border-gray-200 dark:border-gray-700 px-4 py-5 sm:p-0">
          <dl className="sm:divide-y sm:divide-gray-200 dark:sm:divide-gray-700">
            <div className="py-4 sm:py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
              <dt className="text-sm font-medium text-gray-500 dark:text-gray-400 flex items-center">
                <User className="h-4 w-4 mr-2" aria-hidden="true" /> Nombre
              </dt>
              <dd className="mt-1 text-sm text-gray-900 dark:text-white sm:mt-0 sm:col-span-2">
                {profile?.name}
              </dd>
            </div>
            <div className="py-4 sm:py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
              <dt className="text-sm font-medium text-gray-500 dark:text-gray-400 flex items-center">
                <Shield className="h-4 w-4 mr-2" aria-hidden="true" /> Email
              </dt>
              <dd className="mt-1 text-sm text-gray-900 dark:text-white sm:mt-0 sm:col-span-2">
                {profile?.email}
              </dd>
            </div>
            <div className="py-4 sm:py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
              <dt className="text-sm font-medium text-gray-500 dark:text-gray-400 flex items-center">
                <Building className="h-4 w-4 mr-2" aria-hidden="true" /> Nombre Comercial (Razón
                Social)
              </dt>
              <dd className="mt-1 text-sm text-gray-900 dark:text-white sm:mt-0 sm:col-span-2 flex items-center justify-between">
                {isEditingBusiness ? (
                  <div className="flex gap-2 w-full max-w-md">
                    <input
                      id="business-name"
                      type="text"
                      value={businessName}
                      onChange={(e) => setBusinessName(e.target.value)}
                      placeholder="Ej. Eventos Fantásticos S.A. de C.V."
                      className="flex-1 shadow-xs focus:ring-brand-orange focus:border-brand-orange block w-full sm:text-sm border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-md p-1 border"
                      aria-label="Nombre comercial o razón social"
                    />
                    <button
                      type="button"
                      onClick={handleUpdateBusinessName}
                      className="inline-flex items-center px-3 py-1 border border-transparent text-xs font-medium rounded-md text-white bg-green-600 hover:bg-green-700"
                      aria-label="Guardar nombre comercial"
                    >
                      Guardar
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setIsEditingBusiness(false);
                        setBusinessName(profile?.business_name || "");
                      }}
                      className="inline-flex items-center px-3 py-1 border border-gray-300 dark:border-gray-600 text-xs font-medium rounded-md text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600"
                      aria-label="Cancelar edición de nombre comercial"
                    >
                      Cancelar
                    </button>
                  </div>
                ) : (
                  <>
                    <span>
                      {profile?.business_name ||
                        "No configurado (se usará tu nombre)"}
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        setIsEditingBusiness(true);
                        setBusinessName(profile?.business_name || "");
                      }}
                      className="text-brand-orange hover:text-orange-700 text-xs font-medium"
                      aria-label="Editar nombre comercial"
                    >
                      Editar
                    </button>
                  </>
                )}
              </dd>
            </div>
            <div className="py-4 sm:py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
              <dt className="text-sm font-medium text-gray-500 dark:text-gray-400 flex items-center">
                <div
                  className="h-4 w-4 mr-2 rounded-full border border-gray-300 dark:border-gray-600 shadow-inner"
                  style={{ backgroundColor: profile?.brand_color || "#FF6B35" }}
                />
                Color de Marca para PDFs
              </dt>
              <dd className="mt-1 text-sm text-gray-900 dark:text-white sm:mt-0 sm:col-span-2 flex items-center justify-between">
                {isEditingColor ? (
                  <div className="flex gap-2 w-full max-w-md items-center">
                    <input
                      id="brand-color-picker"
                      type="color"
                      value={brandColor}
                      onChange={(e) => setBrandColor(e.target.value)}
                      className="h-8 w-14 p-0 border-0 rounded-sm cursor-pointer"
                      aria-label="Selector de color de marca"
                    />
                    <input
                      id="brand-color-hex"
                      type="text"
                      value={brandColor}
                      onChange={(e) => setBrandColor(e.target.value)}
                      className="w-24 shadow-xs focus:ring-brand-orange focus:border-brand-orange sm:text-sm border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-md p-1 border uppercase font-mono"
                      aria-label="Código hexadecimal del color"
                    />
                    <button
                      type="button"
                      onClick={handleUpdateBrandColor}
                      className="inline-flex items-center px-3 py-1 border border-transparent text-xs font-medium rounded-md text-white bg-green-600 hover:bg-green-700 ml-auto"
                      aria-label="Guardar color de marca"
                    >
                      Guardar
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setIsEditingColor(false);
                        setBrandColor(profile?.brand_color || "#FF6B35");
                      }}
                      className="inline-flex items-center px-3 py-1 border border-gray-300 dark:border-gray-600 text-xs font-medium rounded-md text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600"
                      aria-label="Cancelar edición de color"
                    >
                      Cancelar
                    </button>
                  </div>
                ) : (
                  <>
                    <span className="font-mono uppercase">
                      {profile?.brand_color || "#FF6B35"}
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        setIsEditingColor(true);
                        setBrandColor(profile?.brand_color || "#FF6B35");
                      }}
                      className="text-brand-orange hover:text-orange-700 text-xs font-medium"
                      aria-label="Editar color de marca"
                    >
                      Editar
                    </button>
                  </>
                )}
              </dd>
            </div>
            <div className="py-4 sm:py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
              <dt className="text-sm font-medium text-gray-500 dark:text-gray-400 flex items-center">
                <ImageIcon className="h-4 w-4 mr-2" aria-hidden="true" /> Logo para Contratos y PDFs
              </dt>
              <dd className="mt-1 text-sm text-gray-900 dark:text-white sm:mt-0 sm:col-span-2">
                <div className="flex items-center gap-4">
                  {profile?.logo_url ? (
                    <div className="relative h-16 w-16 rounded-sm overflow-hidden border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
                      <img src={profile.logo_url} alt="Logo de la empresa" className="h-full w-full object-contain" />
                    </div>
                  ) : (
                    <div className="h-16 w-16 rounded-sm border border-dashed border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-800 flex items-center justify-center text-gray-400" aria-hidden="true">
                      <ImageIcon className="h-6 w-6" aria-hidden="true" />
                    </div>
                  )}
                  <div>
                    <input
                      id="logo-upload"
                      type="file"
                      accept=".png,.jpg,.jpeg"
                      onChange={handleLogoUpload}
                      disabled={isUploadingLogo}
                      className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-medium file:bg-gray-100 dark:file:bg-gray-700 file:text-gray-700 dark:file:text-gray-200 hover:file:bg-gray-200 dark:hover:file:bg-gray-600 cursor-pointer disabled:opacity-50"
                      aria-label="Subir logo de la empresa (PNG o JPG, máximo 2MB)"
                    />
                    <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                      Formatos: PNG transparente o JPG (Máx. 2MB).
                    </p>
                    {isUploadingLogo && (
                      <p className="mt-1 text-xs text-brand-orange animate-pulse" role="status" aria-live="polite">Subiendo...</p>
                    )}
                  </div>
                </div>
                
                {profile?.logo_url && (
                  <div className="mt-4 flex items-center">
                    <input
                      type="checkbox"
                      id="showBusinessName"
                      checked={showBusinessName}
                      onChange={(e) => handleToggleShowBusinessName(e.target.checked)}
                      className="h-4 w-4 text-brand-orange focus:ring-brand-orange border-gray-300 rounded-sm"
                    />
                    <label htmlFor="showBusinessName" className="ml-2 block text-sm text-gray-900 dark:text-gray-300">
                      Mostrar nombre comercial junto al logo en PDFs
                    </label>
                  </div>
                )}
              </dd>
            </div>
            <div className="py-4 sm:py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
              <dt className="text-sm font-medium text-gray-500 dark:text-gray-400 flex items-center">
                <CreditCard className="h-4 w-4 mr-2" aria-hidden="true" /> Plan Actual
              </dt>
              <dd className="mt-1 text-sm text-gray-900 dark:text-white sm:mt-0 sm:col-span-2">
                <div className="flex flex-col gap-3">
                  {/* Badge del plan */}
                  <div className="flex items-center gap-2">
                    <span
                      className={`px-2.5 py-0.5 inline-flex items-center gap-1.5 text-xs leading-5 font-semibold rounded-full ${
                        profile?.plan === "pro" || profile?.plan === "premium"
                          ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
                          : "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200"
                      }`}
                    >
                      <CheckCircle className="h-3 w-3" aria-hidden="true" />
                      {profile?.plan === "pro" || profile?.plan === "premium" ? "Pro / Premium" : "Básico"}
                    </span>
                  </div>

                  {/* Descripción del plan */}
                  {profile?.plan === "basic" && (
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      El plan básico tiene límites en eventos y clientes mensuales.
                      Actualiza a Pro para acceder a todas las funciones sin límites.
                    </p>
                  )}

                  {/* Sección de gestión para usuarios Pro con Stripe */}
                  {(profile?.plan === "pro" || profile?.plan === "premium") && (
                    <div className="mt-1 p-3 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
                      <p className="text-xs text-green-700 dark:text-green-300 mb-2">
                        Tienes acceso completo a todas las funciones Pro. Puedes gestionar tu suscripción, cambiar tu método de pago o cancelar cuando quieras.
                      </p>
                      {portalError && (
                        <p className="text-xs text-red-600 dark:text-red-400 mb-2" role="alert">{portalError}</p>
                      )}
                      <button
                        type="button"
                        id="btn-manage-subscription"
                        onClick={handleManageSubscription}
                        disabled={isPortalLoading}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md text-white bg-green-600 hover:bg-green-700 disabled:opacity-60 transition-colors"
                        aria-label={isPortalLoading ? "Abriendo portal de gestión de suscripción..." : "Abrir portal de gestión de suscripción"}
                      >
                        {isPortalLoading ? (
                          "Abriendo portal..."
                        ) : (
                          <>
                            <ExternalLink className="h-3 w-3" aria-hidden="true" />
                            Gestionar suscripción
                          </>
                        )}
                      </button>
                    </div>
                  )}

                  {/* Botones de debug (solo en desarrollo) */}
                  {import.meta.env.MODE === "development" && (
                    <div className="flex gap-2 flex-wrap mt-1">
                      {(profile?.plan === "pro" || profile?.plan === "premium") && (
                        <button
                          type="button"
                          onClick={handleDebugDowngrade}
                          disabled={isDebugLoading}
                          className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded border border-orange-300 text-orange-700 bg-orange-50 hover:bg-orange-100 dark:border-orange-700 dark:text-orange-300 dark:bg-orange-900/20"
                          aria-label="Degradar plan a básico (solo desarrollo)"
                        >
                          [Dev] Degradar a Básico
                        </button>
                      )}
                      {profile?.plan === "basic" && (
                        <a
                          href="/pricing"
                          className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded border border-brand-orange text-brand-orange hover:bg-orange-50"
                          aria-label="Ver planes de suscripción disponibles"
                        >
                          <Zap className="h-3 w-3" aria-hidden="true" />
                          Ver planes
                        </a>
                      )}
                    </div>
                  )}
                </div>
              </dd>
            </div>
          </dl>
        </div>

        <div className="px-4 py-5 sm:px-6 border-t border-gray-200 dark:border-gray-700 mt-6">
          <h3 className="text-lg leading-6 font-medium text-gray-900 dark:text-white">
            Configuración de Contratos
          </h3>
          <p className="mt-1 max-w-2xl text-sm text-gray-500 dark:text-gray-400">
            Valores por defecto para nuevos eventos.
          </p>
        </div>
        <div className="border-t border-gray-200 dark:border-gray-700 px-4 py-5 sm:p-0">
          <dl className="sm:divide-y sm:divide-gray-200 dark:sm:divide-gray-700">
            <div className="py-4 sm:py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
              <dt className="text-sm font-medium text-gray-500 dark:text-gray-400 flex items-center">
                <FileText className="h-4 w-4 mr-2" aria-hidden="true" /> Valores Predeterminados
              </dt>
              <dd className="mt-1 text-sm text-gray-900 dark:text-white sm:mt-0 sm:col-span-2">
                {isEditingContract ? (
                  <div className="space-y-4 max-w-md">
                    <div>
                      <label htmlFor="contract-deposit" className="block text-xs font-medium text-gray-700 dark:text-gray-300">
                        Anticipo (%)
                      </label>
                      <input
                        id="contract-deposit"
                        type="number"
                        value={contractSettings.deposit}
                        onChange={(e) =>
                          setContractSettings({
                            ...contractSettings,
                            deposit: Number(e.target.value),
                          })
                        }
                        className="mt-1 shadow-xs focus:ring-brand-orange focus:border-brand-orange block w-full sm:text-sm border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-md p-1 border"
                      />
                    </div>
                    <div>
                      <label htmlFor="contract-cancellation" className="block text-xs font-medium text-gray-700 dark:text-gray-300">
                        Días para Cancelación
                      </label>
                      <input
                        id="contract-cancellation"
                        type="number"
                        value={contractSettings.cancellation}
                        onChange={(e) =>
                          setContractSettings({
                            ...contractSettings,
                            cancellation: Number(e.target.value),
                          })
                        }
                        className="mt-1 shadow-xs focus:ring-brand-orange focus:border-brand-orange block w-full sm:text-sm border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-md p-1 border"
                      />
                    </div>
                    <div>
                      <label htmlFor="contract-refund" className="block text-xs font-medium text-gray-700 dark:text-gray-300">
                        Reembolso Anticipo (%)
                      </label>
                      <input
                        id="contract-refund"
                        type="number"
                        value={contractSettings.refund}
                        onChange={(e) =>
                          setContractSettings({
                            ...contractSettings,
                            refund: Number(e.target.value),
                          })
                        }
                        className="mt-1 shadow-xs focus:ring-brand-orange focus:border-brand-orange block w-full sm:text-sm border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-md p-1 border"
                      />
                    </div>
                    <div className="flex gap-2 pt-2">
                      <button
                        type="button"
                        onClick={handleUpdateContractSettings}
                        className="inline-flex items-center px-3 py-1 border border-transparent text-xs font-medium rounded-md text-white bg-green-600 hover:bg-green-700"
                        aria-label="Guardar configuración de contratos"
                      >
                        Guardar
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setIsEditingContract(false);
                          setContractSettings({
                            deposit: profile?.default_deposit_percent ?? 50,
                            cancellation:
                              profile?.default_cancellation_days ?? 15,
                            refund: profile?.default_refund_percent ?? 0,
                          });
                        }}
                        className="inline-flex items-center px-3 py-1 border border-gray-300 dark:border-gray-600 text-xs font-medium rounded-md text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600"
                        aria-label="Cancelar edición de contratos"
                      >
                        Cancelar
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <p>
                        Anticipo:{" "}
                        <strong>
                          {profile?.default_deposit_percent || 50}%
                        </strong>
                      </p>
                      <p>
                        Cancelación:{" "}
                        <strong>
                          {profile?.default_cancellation_days || 15} días
                        </strong>{" "}
                        antes
                      </p>
                      <p>
                        Reembolso:{" "}
                        <strong>{profile?.default_refund_percent || 0}%</strong>{" "}
                        del anticipo
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setIsEditingContract(true);
                        setContractSettings({
                          deposit: profile?.default_deposit_percent || 50,
                          cancellation:
                            profile?.default_cancellation_days || 15,
                          refund: profile?.default_refund_percent || 0,
                        });
                      }}
                      className="text-brand-orange hover:text-orange-700 text-xs font-medium"
                      aria-label="Editar configuración de contratos"
                    >
                      Editar
                    </button>
                  </div>
                )}
              </dd>
            </div>
          </dl>
        </div>
      </div>

    </div>
  );
};
