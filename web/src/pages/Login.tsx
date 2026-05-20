import React, { useEffect, useState, useMemo } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useTranslation } from "react-i18next";
import { api, ApiHttpError } from "../lib/api";
import { useAuth } from "../contexts/AuthContext";
import {
  Lock,
  Mail,
  AlertCircle,
  Moon,
  Sun,
  ArrowLeft,
  Eye,
  EyeOff,
  CheckCircle,
  Calendar,
  Users,
  BarChart3,
  Zap,
} from "lucide-react";
import { useTheme } from "../hooks/useTheme";
import { Logo } from "../components/Logo";
import { GoogleSignInButton } from "../components/GoogleSignInButton";
import { AppleSignInButton } from "../components/AppleSignInButton";

export const Login: React.FC = () => {
  const { t } = useTranslation(["auth", "common"]);
  const navigate = useNavigate();
  const { checkAuth } = useAuth();
  const location = useLocation() as { state?: { email?: string; verificationRequired?: boolean } };
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [resendLoading, setResendLoading] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const { theme, toggleTheme } = useTheme();

  const loginSchema = useMemo(() => z.object({
    email: z.string().email(t("auth:validation.email_invalid")),
    password: z.string().min(6, t("auth:validation.password_min_6")),
  }), [t]);

  type LoginForm = z.infer<typeof loginSchema>;

  const SIDE_FEATURES = useMemo(() => [
    { icon: Calendar, text: t("auth:social_proof.feature_calendar") },
    { icon: Users, text: t("auth:social_proof.feature_crm") },
    { icon: BarChart3, text: t("auth:social_proof.feature_reports") },
  ], [t]);

  const {
    register,
    handleSubmit,
    setValue,
    getValues,
    formState: { errors },
  } = useForm<LoginForm>({ resolver: zodResolver(loginSchema) });

  useEffect(() => {
    const email = location.state?.email;
    if (email) {
      setValue("email", email, { shouldDirty: false, shouldTouch: false });
    }
    if (location.state?.verificationRequired) {
      setNotice(t("auth:login.verification_required_notice"));
    }
  }, [location.state, setValue, t]);

  const onSubmit = async (data: LoginForm) => {
    setIsLoading(true);
    setError(null);
    setNotice(null);
    try {
      await api.post("/auth/login", { email: data.email, password: data.password });
      await checkAuth();
      navigate("/dashboard");
    } catch (err: any) {
      if (err instanceof ApiHttpError && err.statusCode === 403 && err.endpoint === "/auth/login") {
        setNotice(err.message || t("auth:login.verification_required_notice"));
        setError(null);
      } else {
        setError(err?.message || t("auth:login.error"));
      }
    } finally {
      setIsLoading(false);
    }
  };

  const resendVerification = async () => {
    const email = getValues("email").trim();
    if (!email) {
      setError(t("auth:login.resend_requires_email"));
      return;
    }

    setResendLoading(true);
    setError(null);
    try {
      await api.post("/auth/verify-email/resend", { email });
      setNotice(t("auth:login.verification_resent"));
    } catch (err: any) {
      setError(err?.message || t("auth:login.resend_error"));
    } finally {
      setResendLoading(false);
    }
  };


  return (
    <div className="min-h-screen flex bg-card transition-colors">
      {/* ── LEFT PANEL ── */}
      <div className="hidden lg:flex lg:w-[45%] xl:w-[40%] premium-gradient flex-col relative overflow-hidden">
        <div className="absolute top-[-20%] right-[-20%] w-[60%] h-[60%] rounded-full bg-white/10 blur-3xl pointer-events-none" />
        <div className="absolute bottom-[-20%] left-[-20%] w-[60%] h-[60%] rounded-full bg-white/5 blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col h-full px-12 py-10">
          <Logo size={40} className="mb-auto" forceLight />

          <div className="mb-auto">
            <div className="inline-flex items-center gap-2 bg-white/20 text-white text-xs font-bold px-4 py-2 rounded-full mb-8 uppercase tracking-widest backdrop-blur-sm">
              <Zap className="h-3.5 w-3.5" />
              {t("auth:login.welcome_back")}
            </div>
            <h1 className="text-4xl xl:text-5xl font-black text-white leading-tight mb-6 tracking-tight">
              {t("auth:login.tagline_main")}
              <br />
              <span className="text-white/80">{t("auth:login.tagline_sub")}</span>
            </h1>
            <p className="text-white/70 text-lg leading-relaxed mb-12">
              {t("auth:login.description")}
            </p>

            <ul className="space-y-4">
              {SIDE_FEATURES.map(({ icon: Icon, text }) => (
                <li
                  key={text}
                  className="flex items-center gap-3 text-white/90"
                >
                  <div className="w-8 h-8 rounded-xl bg-white/20 flex items-center justify-center shrink-0 backdrop-blur-sm">
                    <Icon className="h-4 w-4 text-white" />
                  </div>
                  <span className="text-sm font-medium">{text}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="mt-12 pt-8 border-t border-white/20">
            <div className="flex items-center gap-3">
              <div className="flex -space-x-2">
                {["MG", "CM", "AR", "JL"].map((initials, i) => (
                  <div
                    key={i}
                    className="w-8 h-8 rounded-full border-2 border-white/30 flex items-center justify-center text-xs font-bold text-white"
                    style={{
                      backgroundColor: [
                        "var(--color-error)",
                        "var(--color-info)",
                        "var(--color-primary)",
                        "var(--color-success)",
                      ][i],
                    }}
                  >
                    {initials}
                  </div>
                ))}
              </div>
              <p className="text-white/80 text-sm">
                <span className="font-bold text-white">500+</span> {t("auth:login.trust_text")}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* ── RIGHT PANEL (form) ── */}
      <div className="flex-1 flex flex-col min-h-screen">
        <div className="flex items-center justify-between px-6 py-5 border-b border-border">
          <Link
            to="/"
            className="flex items-center gap-2 text-sm font-medium text-text-secondary hover:text-primary transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            {t("auth:login.back_to_home")}
          </Link>
          <button
            type="button"
            onClick={toggleTheme}
            className="p-2.5 rounded-xl bg-surface-alt text-text-secondary hover:bg-surface-grouped transition-colors"
            aria-label={
              theme === "dark"
                ? t("common:theme.switch_light")
                : t("common:theme.switch_dark")
            }
          >
            {theme === "dark" ? (
              <Sun className="h-5 w-5 text-warning" />
            ) : (
              <Moon className="h-5 w-5" />
            )}
          </button>
        </div>

        <div className="flex-1 flex flex-col items-center justify-center px-6 py-12">
          <div className="lg:hidden mb-8">
            <Logo size={40} />
          </div>

          <div className="w-full max-w-md">
            <div className="mb-8">
              <h2 className="text-3xl font-black text-text mb-2 tracking-tight">
                {t("auth:login.title")}
              </h2>
              <p className="text-text-secondary text-sm">
                {t("auth:login.no_account")}{" "}
                <Link
                  to="/register"
                  className="font-semibold text-primary hover:underline"
                >
                  {t("auth:login.create_account")}
                </Link>
              </p>
            </div>

            {error && (
              <div
                className="flex items-start gap-3 bg-error/5 border border-error/30 text-error rounded-xl p-4 mb-6"
                role="alert"
              >
                <AlertCircle className="h-5 w-5 shrink-0 mt-0.5" />
                <span className="text-sm">{error}</span>
              </div>
            )}

            {notice && (
              <div
                className="flex items-start gap-3 bg-success/5 border border-success/30 text-success rounded-xl p-4 mb-6"
                role="status"
              >
                <CheckCircle className="h-5 w-5 shrink-0 mt-0.5" />
                <div className="text-sm space-y-3">
                  <p>{notice}</p>
                  <button
                    type="button"
                    onClick={resendVerification}
                    disabled={resendLoading}
                    className="font-semibold text-success hover:underline disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    {resendLoading ? t("auth:login.resending_verification") : t("auth:login.resend_verification")}
                  </button>
                </div>
              </div>
            )}

            <form
              onSubmit={handleSubmit(onSubmit)}
              className="space-y-5"
              noValidate
            >
              <div>
                <label
                  htmlFor="email"
                  className="block text-sm font-semibold text-text-secondary mb-1.5"
                >
                  {t("auth:login.email_label")}
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <Mail className="h-5 w-5 text-text-tertiary" />
                  </div>
                  <input
                    id="email"
                    type="email"
                    {...register("email")}
                    placeholder={t("auth:login.email_placeholder")}
                    aria-required="true"
                    aria-invalid={errors.email ? "true" : "false"}
                    aria-describedby={errors.email ? "email-error" : undefined}
                    className={`w-full pl-11 pr-4 py-3.5 rounded-xl border text-sm transition-colors bg-card text-text placeholder-text-tertiary focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary ${
                      errors.email ? "border-error/30" : "border-border"
                    }`}
                  />
                </div>
                {errors.email && (
                  <p
                    id="email-error"
                    className="mt-1.5 text-xs text-error flex items-center gap-1"
                    role="alert"
                  >
                    <AlertCircle className="h-3.5 w-3.5" />{" "}
                    {errors.email.message}
                  </p>
                )}
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label
                    htmlFor="password"
                    className="block text-sm font-semibold text-text-secondary"
                  >
                    {t("auth:login.password_label")}
                  </label>
                  <Link
                    to="/forgot-password"
                    className="text-xs font-medium text-primary hover:underline"
                  >
                    {t("auth:login.forgot_password")}
                  </Link>
                </div>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <Lock className="h-5 w-5 text-text-tertiary" />
                  </div>
                  <input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    {...register("password")}
                    placeholder="••••••••"
                    aria-required="true"
                    aria-invalid={errors.password ? "true" : "false"}
                    aria-describedby={
                      errors.password ? "password-error" : undefined
                    }
                    className={`w-full pl-11 pr-11 py-3.5 rounded-xl border text-sm transition-colors bg-card text-text placeholder-text-tertiary focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary ${
                      errors.password ? "border-error/30" : "border-border"
                    }`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-4 flex items-center text-text-tertiary hover:text-text-secondary transition-colors"
                    aria-label={
                      showPassword ? t("auth:login.hide_password") : t("auth:login.show_password")
                    }
                  >
                    {showPassword ? (
                      <EyeOff className="h-5 w-5" />
                    ) : (
                      <Eye className="h-5 w-5" />
                    )}
                  </button>
                </div>
                {errors.password && (
                  <p
                    id="password-error"
                    className="mt-1.5 text-xs text-error flex items-center gap-1"
                    role="alert"
                  >
                    <AlertCircle className="h-3.5 w-3.5" />{" "}
                    {errors.password.message}
                  </p>
                )}
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full premium-gradient text-white py-3.5 rounded-xl font-bold text-sm shadow-lg shadow-primary/20 hover:shadow-xl hover:shadow-primary/30 transition-all hover:scale-[1.02] disabled:opacity-60 disabled:cursor-not-allowed disabled:scale-100 flex items-center justify-center gap-2 mt-2"
                aria-label={
                  isLoading ? t("auth:login.submitting") : t("auth:login.title")
                }
              >
                {isLoading ? (
                  <>
                    <svg
                      className="animate-spin h-4 w-4 text-white"
                      viewBox="0 0 24 24"
                      fill="none"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      />
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8v8z"
                      />
                    </svg>
                    {t("auth:login.submitting")}
                  </>
                ) : (
                  t("auth:login.submit")
                )}
              </button>
            </form>

            <div className="mt-6 flex items-center gap-3">
              <div className="flex-1 h-px bg-border" />
              <span className="text-xs text-text-tertiary font-medium">
                {t("auth:login.or_separator")}
              </span>
              <div className="flex-1 h-px bg-border" />
            </div>

            <div className="mt-4 space-y-3">
              <GoogleSignInButton onError={(msg) => setError(msg)} />
              <AppleSignInButton onError={(msg) => setError(msg)} />
            </div>

            <div className="mt-8 flex flex-wrap items-center justify-center gap-4 sm:gap-6 text-xs text-text-tertiary">
              <div className="flex items-center gap-1.5">
                <CheckCircle className="h-3.5 w-3.5 text-success" />
                <span>{t("auth:login.ssl_encryption")}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <CheckCircle className="h-3.5 w-3.5 text-success" />
                <span>{t("auth:login.secure_data")}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <CheckCircle className="h-3.5 w-3.5 text-success" />
                <span>{t("auth:login.private")}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="px-6 py-4 border-t border-border text-center text-xs text-text-tertiary">
          © 2026 Solennix ·{" "}
          <Link to="/terms" className="hover:text-primary transition-colors">
            {t("auth:login.terms")}
          </Link>
          {" · "}
          <Link to="/privacy" className="hover:text-primary transition-colors">
            {t("auth:login.privacy")}
          </Link>
        </div>
      </div>
    </div>
  );
};
