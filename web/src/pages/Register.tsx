import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { api } from "../lib/api";
import { useAuth } from "../contexts/AuthContext";
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

const registerSchema = z
  .object({
    name: z.string().min(2, "El nombre debe tener al menos 2 caracteres"),
    email: z.string().email("Email inválido"),
    password: z
      .string()
      .min(6, "La contraseña debe tener al menos 6 caracteres"),
    confirmPassword: z.string(),
  })
  .refine((d) => d.password === d.confirmPassword, {
    message: "Las contraseñas no coinciden",
    path: ["confirmPassword"],
  });

type RegisterForm = z.infer<typeof registerSchema>;

const sidePerks = [
  {
    icon: Zap,
    label: "Gratis para siempre",
    desc: "Plan Básico sin tarjeta de crédito",
  },
  {
    icon: Shield,
    label: "Datos 100% seguros",
    desc: "Cifrado de extremo a extremo",
  },
  {
    icon: TrendingUp,
    label: "Escala cuando quieras",
    desc: "Actualiza a Pro en un clic",
  },
];

const testimonial = {
  text: '"En 2 semanas recuperé el tiempo que perdía en hojas de cálculo."',
  name: "María González",
  role: "Organizadora de bodas · CDMX",
  avatar: "MG",
  avatarColor: "bg-pink-500",
};

export const Register: React.FC = () => {
  const navigate = useNavigate();
  const { checkAuth } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const { theme, toggleTheme } = useTheme();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<RegisterForm>({ resolver: zodResolver(registerSchema) });

  const onSubmit = async (data: RegisterForm) => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await api.post<{
        tokens: { access_token: string; refresh_token: string };
      }>("/auth/register", {
        name: data.name,
        email: data.email,
        password: data.password,
      });
      localStorage.setItem("auth_token", res.tokens.access_token);
      if (res.tokens.refresh_token)
        localStorage.setItem("refresh_token", res.tokens.refresh_token);
      await checkAuth();
      navigate("/dashboard");
    } catch (err: any) {
      setError(err.message || "Error al registrarse");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex bg-card transition-colors">
      {/* ── LEFT PANEL ── */}
      <div className="hidden lg:flex lg:w-[45%] xl:w-[40%] premium-gradient flex-col relative overflow-hidden">
        {/* Decorative blobs */}
        <div className="absolute top-[-20%] right-[-20%] w-[60%] h-[60%] rounded-full bg-white/10 blur-3xl pointer-events-none" />
        <div className="absolute bottom-[-20%] left-[-20%] w-[60%] h-[60%] rounded-full bg-white/5 blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col h-full px-12 py-10">
          {/* Logo */}
          <Logo size={40} className="mb-auto" forceLight />

          {/* Main copy */}
          <div className="mb-auto">
            <div className="inline-flex items-center gap-2 bg-white/20 text-white text-xs font-bold px-4 py-2 rounded-full mb-8 uppercase tracking-widest backdrop-blur-sm">
              <Star className="h-3.5 w-3.5" />
              Empieza hoy gratis
            </div>
            <h1 className="text-4xl xl:text-5xl font-black text-white leading-tight mb-6 tracking-tight">
              Profesionaliza
              <br />
              <span className="text-white/80">tu operación de eventos</span>
            </h1>
            <p className="text-white/70 text-lg leading-relaxed mb-12">
              Únete a más de 500 organizadores que ya gestionan su negocio sin
              hojas de cálculo ni WhatsApp.
            </p>

            <ul className="space-y-5">
              {sidePerks.map(({ icon: Icon, label, desc }) => (
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

          {/* Testimonial */}
          <div className="mt-12 pt-8 border-t border-white/20">
            <div className="flex gap-1 mb-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <Star
                  key={i}
                  className="h-4 w-4 fill-yellow-400 text-yellow-400"
                />
              ))}
            </div>
            <p className="text-white/90 text-sm italic leading-relaxed mb-4">
              {testimonial.text}
            </p>
            <div className="flex items-center gap-3">
              <div
                className={`${testimonial.avatarColor} w-9 h-9 rounded-full flex items-center justify-center text-white font-bold text-xs shrink-0`}
              >
                {testimonial.avatar}
              </div>
              <div>
                <div className="text-white font-bold text-sm">
                  {testimonial.name}
                </div>
                <div className="text-white/60 text-xs">{testimonial.role}</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── RIGHT PANEL (form) ── */}
      <div className="flex-1 flex flex-col min-h-screen">
        {/* Top bar */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-border">
          <Link
            to="/"
            className="flex items-center gap-2 text-sm font-medium text-text-secondary hover:text-primary transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Volver al inicio
          </Link>
          <button
            type="button"
            onClick={toggleTheme}
            className="p-2.5 rounded-xl bg-surface-alt text-text-secondary hover:bg-surface-grouped transition-colors"
            aria-label={
              theme === "dark"
                ? "Cambiar a modo claro"
                : "Cambiar a modo oscuro"
            }
          >
            {theme === "dark" ? (
              <Sun className="h-5 w-5 text-warning" />
            ) : (
              <Moon className="h-5 w-5" />
            )}
          </button>
        </div>

        {/* Form area */}
        <div className="flex-1 flex flex-col items-center justify-center px-6 py-10">
          {/* Mobile logo */}
          <div className="lg:hidden mb-8">
            <Logo size={40} />
          </div>

          <div className="w-full max-w-md">
            {/* Heading */}
            <div className="mb-8">
              <h2 className="text-3xl font-black text-text mb-2 tracking-tight">
                Crear cuenta gratis
              </h2>
              <p className="text-text-secondary text-sm">
                ¿Ya tienes cuenta?{" "}
                <Link
                  to="/login"
                  className="font-semibold text-primary hover:underline"
                >
                  Inicia sesión aquí
                </Link>
              </p>
            </div>

            {/* Error */}
            {error && (
              <div
                className="flex items-start gap-3 bg-error/5 border border-error/30 text-error rounded-xl p-4 mb-6"
                role="alert"
              >
                <AlertCircle className="h-5 w-5 shrink-0 mt-0.5" />
                <span className="text-sm">{error}</span>
              </div>
            )}

            {/* Form */}
            <form
              onSubmit={handleSubmit(onSubmit)}
              className="space-y-4"
              noValidate
            >
              {/* Name */}
              <div>
                <label
                  htmlFor="name"
                  className="block text-sm font-semibold text-text-secondary mb-1.5"
                >
                  Nombre completo
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <User className="h-5 w-5 text-text-tertiary" />
                  </div>
                  <input
                    id="name"
                    type="text"
                    {...register("name")}
                    placeholder="Juan Pérez"
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

              {/* Email */}
              <div>
                <label
                  htmlFor="email"
                  className="block text-sm font-semibold text-text-secondary mb-1.5"
                >
                  Email
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <Mail className="h-5 w-5 text-text-tertiary" />
                  </div>
                  <input
                    id="email"
                    type="email"
                    {...register("email")}
                    placeholder="tu@email.com"
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

              {/* Password */}
              <div>
                <label
                  htmlFor="password"
                  className="block text-sm font-semibold text-text-secondary mb-1.5"
                >
                  Contraseña
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <Lock className="h-5 w-5 text-text-tertiary" />
                  </div>
                  <input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    {...register("password")}
                    placeholder="Mínimo 6 caracteres"
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
                      showPassword ? "Ocultar contraseña" : "Mostrar contraseña"
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

              {/* Confirm Password */}
              <div>
                <label
                  htmlFor="confirmPassword"
                  className="block text-sm font-semibold text-text-secondary mb-1.5"
                >
                  Confirmar contraseña
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <Lock className="h-5 w-5 text-text-tertiary" />
                  </div>
                  <input
                    id="confirmPassword"
                    type={showConfirm ? "text" : "password"}
                    {...register("confirmPassword")}
                    placeholder="Repite tu contraseña"
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
                        ? "Ocultar confirmación"
                        : "Mostrar confirmación"
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

              {/* Terms notice */}
              <p className="text-xs text-text-tertiary leading-relaxed pt-1">
                Al registrarte aceptas nuestros{" "}
                <Link
                  to="/terms"
                  className="text-primary hover:underline font-medium"
                >
                  Términos de Servicio
                </Link>{" "}
                y{" "}
                <Link
                  to="/privacy"
                  className="text-primary hover:underline font-medium"
                >
                  Política de Privacidad
                </Link>
                .
              </p>

              {/* Submit */}
              <button
                type="submit"
                disabled={isLoading}
                className="w-full premium-gradient text-white py-3.5 rounded-xl font-bold text-sm shadow-lg shadow-primary/20 hover:shadow-xl hover:shadow-primary/30 transition-all hover:scale-[1.02] disabled:opacity-60 disabled:cursor-not-allowed disabled:scale-100 flex items-center justify-center gap-2"
                aria-label={isLoading ? "Creando cuenta..." : "Crear cuenta"}
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
                    Creando cuenta...
                  </>
                ) : (
                  "Crear cuenta gratis"
                )}
              </button>
            </form>

            {/* Trust badges */}
            <div className="mt-6 flex flex-wrap items-center justify-center gap-4 sm:gap-6 text-xs text-text-tertiary">
              <div className="flex items-center gap-1.5">
                <CheckCircle className="h-3.5 w-3.5 text-success" />
                <span>Sin tarjeta</span>
              </div>
              <div className="flex items-center gap-1.5">
                <CheckCircle className="h-3.5 w-3.5 text-success" />
                <span>Cancela gratis</span>
              </div>
              <div className="flex items-center gap-1.5">
                <CheckCircle className="h-3.5 w-3.5 text-success" />
                <span>Datos seguros</span>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-border text-center text-xs text-text-tertiary">
          © 2026 Eventos ·{" "}
          <Link to="/terms" className="hover:text-primary transition-colors">
            Términos
          </Link>
          {" · "}
          <Link to="/privacy" className="hover:text-primary transition-colors">
            Privacidad
          </Link>
        </div>
      </div>
    </div>
  );
};
