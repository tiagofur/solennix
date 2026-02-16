import React, { useState } from "react";
import { useAuth } from "../contexts/AuthContext";
import {
  User,
  CreditCard,
  Shield,
  Building,
  FileText,
} from "lucide-react";
import { logError } from "../lib/errorHandler";

export const Settings: React.FC = () => {
  const { profile, updateProfile } = useAuth();
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


  const handleUpdateBusinessName = async () => {
    try {
      await updateProfile({ business_name: businessName });
      setIsEditingBusiness(false);
    } catch (error) {
      logError("Error updating business name", error);
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

      <div className="bg-white dark:bg-gray-800 shadow overflow-hidden sm:rounded-lg">
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
                      className="flex-1 shadow-sm focus:ring-brand-orange focus:border-brand-orange block w-full sm:text-sm border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-md p-1 border"
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
                        className="mt-1 shadow-sm focus:ring-brand-orange focus:border-brand-orange block w-full sm:text-sm border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-md p-1 border"
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
                        className="mt-1 shadow-sm focus:ring-brand-orange focus:border-brand-orange block w-full sm:text-sm border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-md p-1 border"
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
                        className="mt-1 shadow-sm focus:ring-brand-orange focus:border-brand-orange block w-full sm:text-sm border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-md p-1 border"
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
                            deposit: profile?.default_deposit_percent || 50,
                            cancellation:
                              profile?.default_cancellation_days || 15,
                            refund: profile?.default_refund_percent || 0,
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
