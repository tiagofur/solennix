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

const loginSchema = z.object({
  email: z.string().email("Email inválido"),
  password: z.string().min(6, "La contraseña debe tener al menos 6 caracteres"),
});

type LoginForm = z.infer<typeof loginSchema>;

const sideFeatures = [
  { icon: Calendar, text: "Calendario inteligente de eventos" },
  { icon: Users, text: "CRM integrado para tus clientes" },
  { icon: BarChart3, text: "Reportes y analíticas en tiempo real" },
];

export const Login: React.FC = () => {
  const navigate = useNavigate();
  const { checkAuth } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const { theme, toggleTheme } = useTheme();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginForm>({ resolver: zodResolver(loginSchema) });

  const onSubmit = async (data: LoginForm) => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await api.post<{
        tokens: { access_token: string; refresh_token: string };
      }>("/auth/login", { email: data.email, password: data.password });
      if (!res.tokens?.access_token)
        throw new Error("Respuesta del servidor inválida");
      localStorage.setItem("auth_token", res.tokens.access_token);
      if (res.tokens.refresh_token)
        localStorage.setItem("refresh_token", res.tokens.refresh_token);
      await checkAuth();
      navigate("/dashboard");
    } catch (err: any) {
      setError(err.message || "Error al iniciar sesión");
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
              <Zap className="h-3.5 w-3.5" />
              Bienvenido de vuelta
            </div>
            <h1 className="text-4xl xl:text-5xl font-black text-white leading-tight mb-6 tracking-tight">
              Tu negocio de eventos,
              <br />
              <span className="text-white/80">más organizado</span>
            </h1>
            <p className="text-white/70 text-lg leading-relaxed mb-12">
              Accede a tu panel y retoma donde lo dejaste. Tus eventos, clientes
              e inventario te esperan.
            </p>

            <ul className="space-y-4">
              {sideFeatures.map(({ icon: Icon, text }) => (
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

          {/* Social proof */}
          <div className="mt-12 pt-8 border-t border-white/20">
            <div className="flex items-center gap-3">
              <div className="flex -space-x-2">
                {["MG", "CM", "AR", "JL"].map((initials, i) => (
                  <div
                    key={i}
                    className="w-8 h-8 rounded-full border-2 border-white/30 flex items-center justify-center text-[10px] font-bold text-white"
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
                <span className="font-bold text-white">500+</span> organizadores
                confían en Eventos
              </p>
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
        <div className="flex-1 flex flex-col items-center justify-center px-6 py-12">
          {/* Mobile logo */}
          <div className="lg:hidden mb-8">
            <Logo size={40} />
          </div>

          <div className="w-full max-w-md">
            {/* Heading */}
            <div className="mb-8">
              <h2 className="text-3xl font-black text-text mb-2 tracking-tight">
                Iniciar sesión
              </h2>
              <p className="text-text-secondary text-sm">
                ¿No tienes cuenta?{" "}
                <Link
                  to="/register"
                  className="font-semibold text-primary hover:underline"
                >
                  Regístrate gratis
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
              className="space-y-5"
              noValidate
            >
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
                <div className="flex items-center justify-between mb-1.5">
                  <label
                    htmlFor="password"
                    className="block text-sm font-semibold text-text-secondary"
                  >
                    Contraseña
                  </label>
                  <Link
                    to="/forgot-password"
                    className="text-xs font-medium text-primary hover:underline"
                  >
                    ¿Olvidaste tu contraseña?
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

              {/* Submit */}
              <button
                type="submit"
                disabled={isLoading}
                className="w-full premium-gradient text-white py-3.5 rounded-xl font-bold text-sm shadow-lg shadow-primary/20 hover:shadow-xl hover:shadow-primary/30 transition-all hover:scale-[1.02] disabled:opacity-60 disabled:cursor-not-allowed disabled:scale-100 flex items-center justify-center gap-2 mt-2"
                aria-label={
                  isLoading ? "Iniciando sesión..." : "Iniciar sesión"
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
                    Iniciando sesión...
                  </>
                ) : (
                  "Ingresar"
                )}
              </button>
            </form>

            {/* Trust badges */}
            <div className="mt-8 flex flex-wrap items-center justify-center gap-4 sm:gap-6 text-xs text-text-tertiary">
              <div className="flex items-center gap-1.5">
                <CheckCircle className="h-3.5 w-3.5 text-success" />
                <span>Cifrado SSL</span>
              </div>
              <div className="flex items-center gap-1.5">
                <CheckCircle className="h-3.5 w-3.5 text-success" />
                <span>Datos seguros</span>
              </div>
              <div className="flex items-center gap-1.5">
                <CheckCircle className="h-3.5 w-3.5 text-success" />
                <span>100% privado</span>
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
