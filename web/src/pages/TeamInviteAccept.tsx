import React, { useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { ArrowLeft, CheckCircle2, Loader2, Lock } from 'lucide-react';
import { authService } from '@/services/authService';
import { useAuth } from '@/contexts/AuthContext';

type InviteForm = {
  password: string;
  confirmPassword: string;
};

export function TeamInviteAccept() {
  const [searchParams] = useSearchParams();
  const token = (searchParams.get('token') || '').trim();
  const navigate = useNavigate();
  const { checkAuth } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const [accepted, setAccepted] = useState(false);

  const schema = useMemo(
    () =>
      z
        .object({
          password: z
            .string()
            .min(8, 'La contraseña debe tener mínimo 8 caracteres')
            .regex(/[A-Z]/, 'La contraseña debe incluir una mayúscula')
            .regex(/[a-z]/, 'La contraseña debe incluir una minúscula')
            .regex(/[0-9]/, 'La contraseña debe incluir un número'),
          confirmPassword: z.string(),
        })
        .refine((data) => data.password === data.confirmPassword, {
          message: 'Las contraseñas no coinciden',
          path: ['confirmPassword'],
        }),
    [],
  );

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<InviteForm>({
    resolver: zodResolver(schema),
    defaultValues: { password: '', confirmPassword: '' },
  });

  const onSubmit = async (data: InviteForm) => {
    if (!token) {
      setError('El enlace de invitación no es válido o está incompleto.');
      return;
    }

    try {
      setError(null);
      const response = await authService.acceptTeamInvite(token, data.password);
      await checkAuth();
      setAccepted(true);

      if (response.user?.role === 'team_member') {
        navigate('/team/events', { replace: true });
        return;
      }

      navigate('/dashboard', { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo aceptar la invitación.');
    }
  };

  if (!token) {
    return (
      <div className="min-h-screen bg-surface-alt flex flex-col justify-center py-12 sm:px-6 lg:px-8 transition-colors">
        <div className="sm:mx-auto sm:w-full sm:max-w-md">
          <div className="bg-card py-8 px-4 shadow-sm sm:rounded-lg sm:px-10 text-center">
            <h2 className="text-2xl font-bold text-text mb-2">Enlace inválido</h2>
            <p className="text-text-secondary mb-6">
              Esta invitación no contiene un token válido. Solicita una nueva invitación al organizador.
            </p>
            <Link
              to="/login"
              className="inline-flex items-center text-sm font-medium text-primary hover:text-primary/80"
            >
              <ArrowLeft className="h-4 w-4 mr-2" aria-hidden="true" />
              Ir a iniciar sesión
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (accepted) {
    return (
      <div className="min-h-screen bg-surface-alt flex flex-col justify-center py-12 sm:px-6 lg:px-8 transition-colors">
        <div className="sm:mx-auto sm:w-full sm:max-w-md">
          <div className="bg-card py-8 px-4 shadow-sm sm:rounded-lg sm:px-10 text-center" role="status" aria-live="polite">
            <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-success/10 mb-4" aria-hidden="true">
              <CheckCircle2 className="h-6 w-6 text-success" aria-hidden="true" />
            </div>
            <h2 className="text-2xl font-bold text-text mb-2">Invitación aceptada</h2>
            <p className="text-text-secondary">Te estamos redirigiendo a tu portal.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-surface-alt flex flex-col justify-center py-12 sm:px-6 lg:px-8 transition-colors">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <h1 className="mt-6 text-center text-3xl font-extrabold text-text">Activa tu acceso</h1>
        <p className="mt-2 text-center text-sm text-text-secondary">
          Crea tu contraseña para entrar al portal de equipo.
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-card py-8 px-4 shadow-sm sm:rounded-lg sm:px-10">
          <form className="space-y-6" onSubmit={handleSubmit(onSubmit)}>
            {error && (
              <div className="rounded-md bg-error/5 border border-error/30 p-4" role="alert">
                <h2 className="text-sm font-medium text-error">{error}</h2>
              </div>
            )}

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-text-secondary">
                Contraseña
              </label>
              <div className="mt-1 relative rounded-md shadow-xs">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5 text-text-secondary" aria-hidden="true" />
                </div>
                <input
                  id="password"
                  {...register('password')}
                  type="password"
                  className="focus:ring-primary/20 focus:border-primary block w-full pl-10 sm:text-sm border-border bg-card text-text rounded-md py-2 border"
                  placeholder="Mínimo 8 caracteres"
                  aria-required="true"
                  aria-invalid={errors.password ? 'true' : 'false'}
                  aria-describedby={errors.password ? 'password-error' : undefined}
                />
              </div>
              {errors.password && (
                <p id="password-error" className="mt-2 text-sm text-error" role="alert">
                  {errors.password.message}
                </p>
              )}
            </div>

            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-medium text-text-secondary">
                Confirmar contraseña
              </label>
              <div className="mt-1 relative rounded-md shadow-xs">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5 text-text-secondary" aria-hidden="true" />
                </div>
                <input
                  id="confirmPassword"
                  {...register('confirmPassword')}
                  type="password"
                  className="focus:ring-primary/20 focus:border-primary block w-full pl-10 sm:text-sm border-border bg-card text-text rounded-md py-2 border"
                  placeholder="Repite tu contraseña"
                  aria-required="true"
                  aria-invalid={errors.confirmPassword ? 'true' : 'false'}
                  aria-describedby={errors.confirmPassword ? 'confirm-password-error' : undefined}
                />
              </div>
              {errors.confirmPassword && (
                <p id="confirm-password-error" className="mt-2 text-sm text-error" role="alert">
                  {errors.confirmPassword.message}
                </p>
              )}
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-xs text-sm font-medium text-white premium-gradient hover:opacity-90 focus:outline-hidden focus:ring-2 focus:ring-offset-2 focus:ring-primary/40 disabled:opacity-50 disabled:cursor-not-allowed transition-opacity"
              aria-label={isSubmitting ? 'Aceptando invitación' : 'Aceptar invitación'}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="animate-spin -ml-1 mr-2 h-4 w-4" aria-hidden="true" />
                  Aceptando invitación...
                </>
              ) : (
                'Aceptar invitación'
              )}
            </button>
          </form>

          <div className="mt-6 text-center">
            <Link
              to="/login"
              className="inline-flex items-center text-sm font-medium text-primary hover:text-primary/80"
            >
              <ArrowLeft className="h-4 w-4 mr-2" aria-hidden="true" />
              Volver al login
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
