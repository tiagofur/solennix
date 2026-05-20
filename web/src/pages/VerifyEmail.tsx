import React, { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { api } from "@/lib/api";
import { Logo } from "@/components/Logo";
import { CheckCircle2, AlertCircle } from "lucide-react";

export const VerifyEmail: React.FC = () => {
  const { t } = useTranslation(["auth", "common"]);
  const [searchParams] = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [success, setSuccess] = useState(false);
  const [message, setMessage] = useState("");

  const token = useMemo(() => searchParams.get("token")?.trim() ?? "", [searchParams]);

  useEffect(() => {
    const verify = async () => {
      if (!token) {
        setSuccess(false);
        setMessage(t("auth:verify.invalid_token", "El enlace de verificación no es válido."));
        setLoading(false);
        return;
      }

      try {
        const response = await api.get<{ message?: string }>(`/auth/verify-email`, { token });
        setSuccess(true);
        setMessage(response?.message || t("auth:verify.success", "Correo verificado correctamente. Ya podés iniciar sesión."));
      } catch (err: any) {
        setSuccess(false);
        setMessage(err?.message || t("auth:verify.failed", "No pudimos verificar tu correo. Solicitá un nuevo enlace."));
      } finally {
        setLoading(false);
      }
    };

    verify();
  }, [token, t]);

  return (
    <div className="min-h-screen bg-card flex items-center justify-center px-6 py-12">
      <div className="w-full max-w-lg bg-surface border border-border rounded-2xl shadow-sm p-8">
        <div className="flex justify-center mb-6">
          <Logo size={44} />
        </div>

        {loading ? (
          <div className="text-center space-y-3">
            <div className="mx-auto h-8 w-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
            <p className="text-text-secondary text-sm">{t("common:action.loading", "Cargando...")}</p>
          </div>
        ) : (
          <div className="text-center space-y-4">
            <div className="flex justify-center">
              {success ? (
                <CheckCircle2 className="h-10 w-10 text-success" />
              ) : (
                <AlertCircle className="h-10 w-10 text-error" />
              )}
            </div>
            <h1 className="text-2xl font-bold text-text">
              {success
                ? t("auth:verify.title_success", "Correo verificado")
                : t("auth:verify.title_error", "No se pudo verificar")}
            </h1>
            <p className="text-text-secondary">{message}</p>
            <Link
              to="/login"
              className="inline-flex items-center justify-center rounded-xl bg-primary text-primary-foreground px-4 py-2.5 font-medium hover:opacity-90 transition-opacity"
            >
              {t("auth:verify.go_to_login", "Ir a iniciar sesión")}
            </Link>
          </div>
        )}
      </div>
    </div>
  );
};
