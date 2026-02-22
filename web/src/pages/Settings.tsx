import React, { useState, useEffect } from "react";
import { useAuth } from "../contexts/AuthContext";
import {
  User,
  CreditCard,
  Shield,
  Building,
  FileText,
  Image as ImageIcon,
} from "lucide-react";
import { logError } from "../lib/errorHandler";

export const Settings: React.FC = () => {
  const { user: profile, updateProfile } = useAuth();
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
                <User className="h-4 w-4 mr-2" /> Nombre
              </dt>
              <dd className="mt-1 text-sm text-gray-900 dark:text-white sm:mt-0 sm:col-span-2">
                {profile?.name}
              </dd>
            </div>
            <div className="py-4 sm:py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
              <dt className="text-sm font-medium text-gray-500 dark:text-gray-400 flex items-center">
                <Shield className="h-4 w-4 mr-2" /> Email
              </dt>
              <dd className="mt-1 text-sm text-gray-900 dark:text-white sm:mt-0 sm:col-span-2">
                {profile?.email}
              </dd>
            </div>
            <div className="py-4 sm:py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
              <dt className="text-sm font-medium text-gray-500 dark:text-gray-400 flex items-center">
                <Building className="h-4 w-4 mr-2" /> Nombre Comercial (Razón
                Social)
              </dt>
              <dd className="mt-1 text-sm text-gray-900 dark:text-white sm:mt-0 sm:col-span-2 flex items-center justify-between">
                {isEditingBusiness ? (
                  <div className="flex gap-2 w-full max-w-md">
                    <input
                      type="text"
                      value={businessName}
                      onChange={(e) => setBusinessName(e.target.value)}
                      placeholder="Ej. Eventos Fantásticos S.A. de C.V."
                      className="flex-1 shadow-xs focus:ring-brand-orange focus:border-brand-orange block w-full sm:text-sm border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-md p-1 border"
                    />
                    <button
                      onClick={handleUpdateBusinessName}
                      className="inline-flex items-center px-3 py-1 border border-transparent text-xs font-medium rounded-md text-white bg-green-600 hover:bg-green-700"
                    >
                      Guardar
                    </button>
                    <button
                      onClick={() => {
                        setIsEditingBusiness(false);
                        setBusinessName(profile?.business_name || "");
                      }}
                      className="inline-flex items-center px-3 py-1 border border-gray-300 dark:border-gray-600 text-xs font-medium rounded-md text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600"
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
                      onClick={() => {
                        setIsEditingBusiness(true);
                        setBusinessName(profile?.business_name || "");
                      }}
                      className="text-brand-orange hover:text-orange-700 text-xs font-medium"
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
                      type="color"
                      value={brandColor}
                      onChange={(e) => setBrandColor(e.target.value)}
                      className="h-8 w-14 p-0 border-0 rounded-sm cursor-pointer"
                    />
                    <input
                      type="text"
                      value={brandColor}
                      onChange={(e) => setBrandColor(e.target.value)}
                      className="w-24 shadow-xs focus:ring-brand-orange focus:border-brand-orange sm:text-sm border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-md p-1 border uppercase font-mono"
                    />
                    <button
                      onClick={handleUpdateBrandColor}
                      className="inline-flex items-center px-3 py-1 border border-transparent text-xs font-medium rounded-md text-white bg-green-600 hover:bg-green-700 ml-auto"
                    >
                      Guardar
                    </button>
                    <button
                      onClick={() => {
                        setIsEditingColor(false);
                        setBrandColor(profile?.brand_color || "#FF6B35");
                      }}
                      className="inline-flex items-center px-3 py-1 border border-gray-300 dark:border-gray-600 text-xs font-medium rounded-md text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600"
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
                      onClick={() => {
                        setIsEditingColor(true);
                        setBrandColor(profile?.brand_color || "#FF6B35");
                      }}
                      className="text-brand-orange hover:text-orange-700 text-xs font-medium"
                    >
                      Editar
                    </button>
                  </>
                )}
              </dd>
            </div>
            <div className="py-4 sm:py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
              <dt className="text-sm font-medium text-gray-500 dark:text-gray-400 flex items-center">
                <ImageIcon className="h-4 w-4 mr-2" /> Logo para Contratos y PDFs
              </dt>
              <dd className="mt-1 text-sm text-gray-900 dark:text-white sm:mt-0 sm:col-span-2">
                <div className="flex items-center gap-4">
                  {profile?.logo_url ? (
                    <div className="relative h-16 w-16 rounded-sm overflow-hidden border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
                      <img src={profile.logo_url} alt="Logo" className="h-full w-full object-contain" />
                    </div>
                  ) : (
                    <div className="h-16 w-16 rounded-sm border border-dashed border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-800 flex items-center justify-center text-gray-400">
                      <ImageIcon className="h-6 w-6" />
                    </div>
                  )}
                  <div>
                    <input
                      type="file"
                      accept=".png,.jpg,.jpeg"
                      onChange={handleLogoUpload}
                      disabled={isUploadingLogo}
                      className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-medium file:bg-gray-100 dark:file:bg-gray-700 file:text-gray-700 dark:file:text-gray-200 hover:file:bg-gray-200 dark:hover:file:bg-gray-600 cursor-pointer disabled:opacity-50"
                    />
                    <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                      Formatos: PNG transparente o JPG (Máx. 2MB).
                    </p>
                    {isUploadingLogo && (
                      <p className="mt-1 text-xs text-brand-orange animate-pulse">Subiendo...</p>
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
                <CreditCard className="h-4 w-4 mr-2" /> Plan Actual
              </dt>
              <dd className="mt-1 text-sm text-gray-900 dark:text-white sm:mt-0 sm:col-span-2">
                <span
                  className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                    profile?.plan === "premium"
                      ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
                      : "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200"
                  }`}
                >
                  {profile?.plan === "premium" ? "Premium" : "Básico"}
                </span>
                {profile?.plan === "basic" && (
                  <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                    El plan básico permite hasta 10 clientes y 20 eventos
                    mensuales.
                  </p>
                )}
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
                <FileText className="h-4 w-4 mr-2" /> Valores Predeterminados
              </dt>
              <dd className="mt-1 text-sm text-gray-900 dark:text-white sm:mt-0 sm:col-span-2">
                {isEditingContract ? (
                  <div className="space-y-4 max-w-md">
                    <div>
                      <label className="block text-xs font-medium text-gray-700 dark:text-gray-300">
                        Anticipo (%)
                      </label>
                      <input
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
                      <label className="block text-xs font-medium text-gray-700 dark:text-gray-300">
                        Días para Cancelación
                      </label>
                      <input
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
                      <label className="block text-xs font-medium text-gray-700 dark:text-gray-300">
                        Reembolso Anticipo (%)
                      </label>
                      <input
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
                        onClick={handleUpdateContractSettings}
                        className="inline-flex items-center px-3 py-1 border border-transparent text-xs font-medium rounded-md text-white bg-green-600 hover:bg-green-700"
                      >
                        Guardar
                      </button>
                      <button
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
