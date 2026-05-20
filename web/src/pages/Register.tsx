import React, { useState, useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useTranslation } from "react-i18next";
import { api } from "../lib/api";
import { GoogleSignInButton } from "../components/GoogleSignInButton";
import { AppleSignInButton } from "../components/AppleSignInButton";
import {
  Lock,
  Mail,
  User,
  AlertCircle,
  Moon,
  Sun,
  ArrowLeft,
  Eye,
  EyeOff,
  CheckCircle,
  Star,
  Zap,
  Shield,
  TrendingUp,
} from "lucide-react";
import { useTheme } from "../hooks/useTheme";
import { Logo } from "../components/Logo";

export const Register: React.FC = () => {
  const { t } = useTranslation(["auth", "common"]);
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const { theme, toggleTheme } = useTheme();

  const registerSchema = useMemo(() => z
    .object({
      name: z.string().min(2, t("auth:validation.name_min_2")),
      email: z.string().email(t("auth:validation.email_invalid")),
      password: z
        .string()
        .min(8, t("auth:validation.password_min_8"))
        .regex(/[A-Z]/, t("auth:validation.password_min_8"))
        .regex(/[a-z]/, t("auth:validation.password_min_8"))
        .regex(/[0-9]/, t("auth:validation.password_min_8")),
      confirmPassword: z.string(),
    })
    .refine((d) => d.password === d.confirmPassword, {
      message: t("auth:validation.password_mismatch"),
      path: ["confirmPassword"],
    }), [t]);

  type RegisterForm = z.infer<typeof registerSchema>;

  const SIDE_PERKS = useMemo(() => [
    {
      icon: Zap,
      label: t("auth:register.free_forever"),
      desc: t("auth:register.free_plan"),
    },
    {
      icon: Shield,
      label: t("auth:register.secure_data"),
      desc: t("auth:register.encrypted"),
    },
    {
      icon: TrendingUp,
      label: t("auth:register.upgrade_anytime"),
      desc: t("auth:social_proof.feature_upgrade"),
    },
  ], [t]);

  const TESTIMONIAL = useMemo(() => ({
    text: t("auth:social_proof.testimonial_1"),
    name: "María González",
    role: t("auth:register.testimonial_role"),
    avatar: "MG",
    avatarColor: "bg-pink-500",
  }), [t]);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<RegisterForm>({ resolver: zodResolver(registerSchema) });

  const onSubmit = async (data: RegisterForm) => {
    setIsLoading(true);
    setError(null);
    try {
      await api.post("/auth/register", {
        name: data.name,
        email: data.email,
        password: data.password,
      });
      navigate("/login", {
        state: {
          email: data.email,
          verificationRequired: true,
        },
      });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "";
      if (message === "Email already registered") {
        setError(t("auth:register.email_taken"));
      } else {
        setError(message || t("auth:register.error"));
      }
    } finally {
      setIsLoading(false);
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
              <Star className="h-3.5 w-3.5" />
              {t("auth:register.start_today_free")}
            </div>
            <h1 className="text-4xl xl:text-5xl font-black text-white leading-tight mb-6 tracking-tight">
              {t("auth:register.tagline_main")}
              <br />
              <span className="text-white/80">{t("auth:register.tagline_sub")}</span>
            </h1>
            <p className="text-white/70 text-lg leading-relaxed mb-12">
              {t("auth:register.description")}
            </p>

            <ul className="space-y-5">
              {SIDE_PERKS.map(({ icon: Icon, label, desc }) => (
                <li key={label} className="flex items-start gap-4">
                  <div className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center shrink-0 backdrop-blur-sm mt-0.5">
                    <Icon className="h-4 w-4 text-white" />
                  </div>
                  <div>
                    <div className="text-white font-bold text-sm">{label}</div>
                    <div className="text-white/60 text-xs mt-0.5">{desc}</div>
                  </div>
                </li>
              ))}
            </ul>
          </div>

          <div className="mt-12 pt-8 border-t border-white/20">
            <div className="flex gap-1 mb-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <Star
                  key={i}
                  className="h-4 w-4 fill-primary text-primary"
                />
              ))}
            </div>
            <p className="text-white/90 text-sm italic leading-relaxed mb-4">
              {TESTIMONIAL.text}
            </p>
            <div className="flex items-center gap-3">
              <div
                className={`${TESTIMONIAL.avatarColor} w-9 h-9 rounded-full flex items-center justify-center text-white font-bold text-xs shrink-0`}
              >
                {TESTIMONIAL.avatar}
              </div>
              <div>
                <div className="text-white font-bold text-sm">
                  {TESTIMONIAL.name}
                </div>
                <div className="text-white/60 text-xs">{TESTIMONIAL.role}</div>
              </div>
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

        <div className="flex-1 flex flex-col items-center justify-center px-6 py-10">
          <div className="lg:hidden mb-8">
            <Logo size={40} />
          </div>

          <div className="w-full max-w-md">
            <div className="mb-8">
              <h2 className="text-3xl font-black text-text mb-2 tracking-tight">
                {t("auth:register.submit")}
              </h2>
              <p className="text-text-secondary text-sm">
                {t("auth:register.has_account")}{" "}
                <Link
                  to="/login"
                  className="font-semibold text-primary hover:underline"
                >
                  {t("auth:register.sign_in")}
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

            <form
              onSubmit={handleSubmit(onSubmit)}
              className="space-y-4"
              noValidate
            >
              <div>
                <label
                  htmlFor="name"
                  className="block text-sm font-semibold text-text-secondary mb-1.5"
                >
                  {t("auth:register.name_label")}
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <User className="h-5 w-5 text-text-tertiary" />
                  </div>
                  <input
                    id="name"
                    type="text"
                    {...register("name")}
                    placeholder={t("auth:register.name_placeholder")}
                    aria-required="true"
                    aria-invalid={errors.name ? "true" : "false"}
                    aria-describedby={errors.name ? "name-error" : undefined}
                    className={`w-full pl-11 pr-4 py-3.5 rounded-xl border text-sm transition-colors bg-card text-text placeholder-text-tertiary focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary ${
                      errors.name ? "border-error/30" : "border-border"
                    }`}
                  />
                </div>
                {errors.name && (
                  <p
                    id="name-error"
                    className="mt-1.5 text-xs text-error flex items-center gap-1"
                    role="alert"
                  >
                    <AlertCircle className="h-3.5 w-3.5" />{" "}
                    {errors.name.message}
                  </p>
                )}
              </div>

              <div>
                <label
                  htmlFor="email"
                  className="block text-sm font-semibold text-text-secondary mb-1.5"
                >
                  {t("auth:register.email_label")}
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <Mail className="h-5 w-5 text-text-tertiary" />
                  </div>
                  <input
                    id="email"
                    type="email"
                    {...register("email")}
                    placeholder={t("auth:register.email_placeholder")}
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
                <label
                  htmlFor="password"
                  className="block text-sm font-semibold text-text-secondary mb-1.5"
                >
                  {t("auth:register.password_label")}
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <Lock className="h-5 w-5 text-text-tertiary" />
                  </div>
                  <input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    {...register("password")}
                    placeholder={t("auth:register.password_placeholder")}
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
                      showPassword ? t("auth:register.hide_password") : t("auth:register.show_password")
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

              <div>
                <label
                  htmlFor="confirmPassword"
                  className="block text-sm font-semibold text-text-secondary mb-1.5"
                >
                  {t("auth:register.confirm_password_label")}
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <Lock className="h-5 w-5 text-text-tertiary" />
                  </div>
                  <input
                    id="confirmPassword"
                    type={showConfirm ? "text" : "password"}
                    {...register("confirmPassword")}
                    placeholder={t("auth:register.confirm_password_placeholder")}
                    aria-required="true"
                    aria-invalid={errors.confirmPassword ? "true" : "false"}
                    aria-describedby={
                      errors.confirmPassword ? "confirm-error" : undefined
                    }
                    className={`w-full pl-11 pr-11 py-3.5 rounded-xl border text-sm transition-colors bg-card text-text placeholder-text-tertiary focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary ${
                      errors.confirmPassword
                        ? "border-error/30"
                        : "border-border"
                    }`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirm(!showConfirm)}
                    className="absolute inset-y-0 right-0 pr-4 flex items-center text-text-tertiary hover:text-text-secondary transition-colors"
                    aria-label={
                      showConfirm
                        ? t("auth:register.hide_confirm")
                        : t("auth:register.show_confirm")
                    }
                  >
                    {showConfirm ? (
                      <EyeOff className="h-5 w-5" />
                    ) : (
                      <Eye className="h-5 w-5" />
                    )}
                  </button>
                </div>
                {errors.confirmPassword && (
                  <p
                    id="confirm-error"
                    className="mt-1.5 text-xs text-error flex items-center gap-1"
                    role="alert"
                  >
                    <AlertCircle className="h-3.5 w-3.5" />{" "}
                    {errors.confirmPassword.message}
                  </p>
                )}
              </div>

              <p className="text-xs text-text-tertiary leading-relaxed pt-1">
                {t("auth:register.terms_notice_1")}{" "}
                <Link
                  to="/terms"
                  className="text-primary hover:underline font-medium"
                >
                  {t("common:nav.terms")}
                </Link>{" "}
                {t("auth:register.terms_notice_2")}{" "}
                <Link
                  to="/privacy"
                  className="text-primary hover:underline font-medium"
                >
                  {t("common:nav.privacy")}
                </Link>
                {t("auth:register.terms_notice_3")}
              </p>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full premium-gradient text-white py-3.5 rounded-xl font-bold text-sm shadow-lg shadow-primary/20 hover:shadow-xl hover:shadow-primary/30 transition-all hover:scale-[1.02] disabled:opacity-60 disabled:cursor-not-allowed disabled:scale-100 flex items-center justify-center gap-2"
                aria-label={isLoading ? t("auth:register.submitting") : t("auth:register.title")}
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
                    {t("auth:register.submitting")}
                  </>
                ) : (
                  t("auth:register.submit")
                )}
              </button>
            </form>

            <div className="mt-6 flex items-center gap-3">
              <div className="flex-1 h-px bg-border" />
              <span className="text-xs text-text-tertiary font-medium">
                {t("auth:register.or_separator")}
              </span>
              <div className="flex-1 h-px bg-border" />
            </div>

            <div className="mt-4 space-y-3">
              <GoogleSignInButton onError={(msg) => setError(msg)} />
              <AppleSignInButton onError={(msg) => setError(msg)} />
            </div>

            <div className="mt-6 flex flex-wrap items-center justify-center gap-4 sm:gap-6 text-xs text-text-tertiary">
              <div className="flex items-center gap-1.5">
                <CheckCircle className="h-3.5 w-3.5 text-success" />
                <span>{t("auth:register.no_card")}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <CheckCircle className="h-3.5 w-3.5 text-success" />
                <span>{t("auth:register.cancel_anytime")}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <CheckCircle className="h-3.5 w-3.5 text-success" />
                <span>{t("auth:register.secure_data_badge")}</span>
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
