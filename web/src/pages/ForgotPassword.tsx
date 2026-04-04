import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { Link } from 'react-router-dom';
import {
  Mail,
  ArrowLeft,
  AlertCircle,
  CheckCircle,
  Shield,
  Lock,
  KeyRound,
  Moon,
  Sun,
  RefreshCw,
} from 'lucide-react';
import { api } from '../lib/api';
import { useTheme } from '../hooks/useTheme';
import { Logo } from '../components/Logo';

const forgotPasswordSchema = z.object({
  email: z.string().email('Email inválido'),
});

type ForgotPasswordForm = z.infer<typeof forgotPasswordSchema>;

const SIDE_STEPS = [
  { icon: Mail, label: 'Ingresa tu email', desc: 'El que usaste al registrarte' },
  { icon: KeyRound, label: 'Revisa tu bandeja', desc: 'Te enviamos un enlace seguro' },
  { icon: Lock, label: 'Crea una nueva contraseña', desc: 'El enlace expira en 24 horas' },
];

export function ForgotPassword() {
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [submittedEmail, setSubmittedEmail] = useState('');
  const [error, setError] = useState<string | null>(null);
  const { theme, toggleTheme } = useTheme();

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ForgotPasswordForm>({ resolver: zodResolver(forgotPasswordSchema) });

  const onSubmit = async (data: ForgotPasswordForm) => {
    try {
      setError(null);
      await api.post('/auth/forgot-password', { email: data.email });
      setSubmittedEmail(data.email);
      setIsSubmitted(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al enviar el correo');
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
              <Shield className="h-3.5 w-3.5" />
              Recuperación segura
            </div>
            <h1 className="text-4xl xl:text-5xl font-black text-white leading-tight mb-6 tracking-tight">
              Recupera el acceso
              <br />
              <span className="text-white/80">en 3 pasos simples</span>
            </h1>
            <p className="text-white/70 text-lg leading-relaxed mb-12">
              Sin preguntas difíciles. Solo ingresa tu email y te enviamos un enlace seguro para restablecer tu contraseña.
            </p>

            <ol className="space-y-6">
              {SIDE_STEPS.map(({ icon: Icon, label, desc }, i) => (
                <li key={label} className="flex items-start gap-4">
                  <div className="relative shrink-0">
                    <div className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center backdrop-blur-sm">
                      <Icon className="h-4 w-4 text-white" />
                    </div>
                    <div className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-white/40 flex items-center justify-center text-xs font-black text-white">
                      {i + 1}
                    </div>
                  </div>
                  <div>
                    <div className="text-white font-bold text-sm">{label}</div>
                    <div className="text-white/60 text-xs mt-0.5">{desc}</div>
                  </div>
                </li>
              ))}
            </ol>
          </div>

          <div className="mt-12 pt-8 border-t border-white/20">
            <div className="flex items-center gap-3 text-white/80 text-sm">
              <div className="w-8 h-8 rounded-xl bg-white/20 flex items-center justify-center backdrop-blur-sm shrink-0">
                <Shield className="h-4 w-4 text-white" />
              </div>
              <span>El enlace expira automáticamente en 24 horas por tu seguridad.</span>
            </div>
          </div>
        </div>
      </div>

      {/* ── RIGHT PANEL ── */}
      <div className="flex-1 flex flex-col min-h-screen">
        {/* Top bar */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-border">
          <Link
            to="/login"
            className="flex items-center gap-2 text-sm font-medium text-text-secondary hover:text-primary transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Volver al login
          </Link>
          <button
            type="button"
            onClick={toggleTheme}
            className="p-2.5 rounded-xl bg-surface-alt text-text-secondary hover:bg-surface-grouped transition-colors"
            aria-label={theme === 'dark' ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
          >
            {theme === 'dark' ? <Sun className="h-5 w-5 text-warning" /> : <Moon className="h-5 w-5" />}
          </button>
        </div>

        {/* Form / Success area */}
        <div className="flex-1 flex flex-col items-center justify-center px-6 py-12">
          {/* Mobile logo */}
          <div className="lg:hidden mb-8">
            <Logo size={40} />
          </div>

          <div className="w-full max-w-md">
            {isSubmitted ? (
              /* ── SUCCESS STATE ── */
              <div className="text-center" role="status" aria-live="polite">
                <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-success/10 mb-6">
                  <CheckCircle className="h-10 w-10 text-success" />
                </div>

                <h2 className="text-3xl font-black text-text mb-3 tracking-tight">
                  ¡Revisa tu correo!
                </h2>
                <p className="text-text-secondary text-sm leading-relaxed mb-2">
                  Si existe una cuenta asociada a:
                </p>
                <p className="font-bold text-text text-sm mb-6 bg-surface-alt inline-block px-4 py-2 rounded-xl">
                  {submittedEmail}
                </p>
                <p className="text-text-secondary text-sm leading-relaxed mb-10">
                  recibirás un enlace para restablecer tu contraseña. El enlace expira en <strong className="text-text">24 horas</strong>.
                </p>

                {/* Tips */}
                <div className="bg-surface-alt rounded-2xl p-5 text-left mb-8 border border-border">
                  <p className="text-xs font-bold text-text-secondary uppercase tracking-widest mb-3">¿No ves el correo?</p>
                  <ul className="space-y-2 text-sm text-text-secondary">
                    <li className="flex items-start gap-2">
                      <span className="text-primary mt-0.5">•</span>
                      Revisa tu carpeta de <strong className="text-text">spam o correo no deseado</strong>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-primary mt-0.5">•</span>
                      Verifica que el email sea el correcto
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-primary mt-0.5">•</span>
                      Puede tardar unos minutos en llegar
                    </li>
                  </ul>
                </div>

                <div className="flex flex-col gap-3">
                  <button
                    type="button"
                    onClick={() => { setIsSubmitted(false); setError(null); }}
                    className="flex items-center justify-center gap-2 w-full py-3.5 rounded-xl border border-border text-sm font-semibold text-text hover:bg-surface-alt transition-colors"
                  >
                    <RefreshCw className="h-4 w-4" />
                    Intentar con otro email
                  </button>
                  <Link
                    to="/login"
                    className="flex items-center justify-center gap-2 w-full premium-gradient text-white py-3.5 rounded-xl font-bold text-sm shadow-lg shadow-primary/20 hover:shadow-xl hover:shadow-primary/30 transition-all hover:scale-[1.02]"
                  >
                    <ArrowLeft className="h-4 w-4" />
                    Volver al login
                  </Link>
                </div>
              </div>
            ) : (
              /* ── FORM STATE ── */
              <>
                <div className="mb-8">
                  <h2 className="text-3xl font-black text-text mb-2 tracking-tight">
                    Recuperar contraseña
                  </h2>
                  <p className="text-text-secondary text-sm">
                    Ingresa tu email y te enviamos un enlace para crear una nueva contraseña.
                  </p>
                </div>

                {error && (
                  <div className="flex items-start gap-3 bg-error/5 border border-error/30 text-error rounded-xl p-4 mb-6" role="alert">
                    <AlertCircle className="h-5 w-5 shrink-0 mt-0.5" />
                    <span className="text-sm">{error}</span>
                  </div>
                )}

                <form onSubmit={handleSubmit(onSubmit)} className="space-y-5" noValidate>
                  <div>
                    <label htmlFor="email" className="block text-sm font-semibold text-text-secondary mb-1.5">
                      Correo electrónico
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                        <Mail className="h-5 w-5 text-text-tertiary" />
                      </div>
                      <input
                        id="email"
                        type="email"
                        {...register('email')}
                        placeholder="tu@email.com"
                        aria-required="true"
                        aria-invalid={errors.email ? 'true' : 'false'}
                        aria-describedby={errors.email ? 'email-error' : undefined}
                        className={`w-full pl-11 pr-4 py-3.5 rounded-xl border text-sm transition-colors bg-card text-text placeholder-text-tertiary focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary ${
                          errors.email
                            ? 'border-error/30'
                            : 'border-border'
                        }`}
                      />
                    </div>
                    {errors.email && (
                      <p id="email-error" className="mt-1.5 text-xs text-error flex items-center gap-1" role="alert">
                        <AlertCircle className="h-3.5 w-3.5" /> {errors.email.message}
                      </p>
                    )}
                  </div>

                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full premium-gradient text-white py-3.5 rounded-xl font-bold text-sm shadow-lg shadow-primary/20 hover:shadow-xl hover:shadow-primary/30 transition-all hover:scale-[1.02] disabled:opacity-60 disabled:cursor-not-allowed disabled:scale-100 flex items-center justify-center gap-2"
                    aria-label={isSubmitting ? 'Enviando instrucciones...' : 'Enviar instrucciones de recuperación'}
                  >
                    {isSubmitting ? (
                      <>
                        <svg className="animate-spin h-4 w-4 text-white" viewBox="0 0 24 24" fill="none">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                        </svg>
                        Enviando...
                      </>
                    ) : (
                      'Enviar instrucciones'
                    )}
                  </button>
                </form>

                <div className="mt-8 text-center text-sm text-text-secondary">
                  ¿Recordaste tu contraseña?{' '}
                  <Link to="/login" className="font-semibold text-primary hover:underline">
                    Inicia sesión
                  </Link>
                </div>

                {/* Trust badge */}
                <div className="mt-6 flex items-center justify-center gap-2 text-xs text-text-tertiary">
                  <Shield className="h-3.5 w-3.5 text-success" />
                  <span>Enlace seguro con expiración automática en 24 horas</span>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-border text-center text-xs text-text-tertiary">
          © 2026 Eventos ·{' '}
          <Link to="/terms" className="hover:text-primary transition-colors">Términos</Link>
          {' · '}
          <Link to="/privacy" className="hover:text-primary transition-colors">Privacidad</Link>
        </div>
      </div>
    </div>
  );
}
