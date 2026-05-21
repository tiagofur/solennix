import React, { useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { Link, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Lock, ArrowLeft, Loader2, CheckCircle } from 'lucide-react';
import { api } from '../lib/api';

export function ResetPassword() {
  const { t } = useTranslation(['auth', 'common']);
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const resetPasswordSchema = useMemo(() => z.object({
    password: z.string()
      .min(8, t('auth:validation.password_min_8'))
      .regex(/[A-Z]/, t('auth:validation.password_min_8'))
      .regex(/[a-z]/, t('auth:validation.password_min_8'))
      .regex(/[0-9]/, t('auth:validation.password_min_8'))
      .regex(/[^A-Za-z0-9]/, t('auth:validation.password_min_8')),
    confirmPassword: z.string(),
  }).refine((data) => data.password === data.confirmPassword, {
    message: t('auth:validation.password_mismatch'),
    path: ['confirmPassword'],
  }), [t]);

  type ResetPasswordForm = z.infer<typeof resetPasswordSchema>;

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ResetPasswordForm>({
    resolver: zodResolver(resetPasswordSchema),
  });

  const onSubmit = async (data: ResetPasswordForm) => {
    try {
      setError(null);
      await api.post('/auth/reset-password', { token, new_password: data.password });
      setIsSubmitted(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : t('auth:reset_password.error'));
    }
  };

  if (!token) {
    return (
      <div className="min-h-screen bg-surface-alt flex flex-col justify-center py-12 sm:px-6 lg:px-8 transition-colors">
        <div className="sm:mx-auto sm:w-full sm:max-w-md">
          <div className="bg-card py-8 px-4 shadow-sm sm:rounded-lg sm:px-10 text-center">
            <h2 className="text-2xl font-bold text-text mb-2">{t('auth:reset_password.invalid_link')}</h2>
            <p className="text-text-secondary mb-6">
              {t('auth:reset_password.invalid_link_desc')}
            </p>
            <Link
              to="/forgot-password"
              className="inline-flex items-center text-sm font-medium text-primary hover:text-primary/80"
            >
              <ArrowLeft className="h-4 w-4 mr-2" aria-hidden="true" />
              {t('auth:reset_password.request_new_link')}
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (isSubmitted) {
    return (
      <div className="min-h-screen bg-surface-alt flex flex-col justify-center py-12 sm:px-6 lg:px-8 transition-colors">
        <div className="sm:mx-auto sm:w-full sm:max-w-md">
          <div className="bg-card py-8 px-4 shadow-sm sm:rounded-lg sm:px-10 text-center" role="status" aria-live="polite">
            <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-success/10 mb-4" aria-hidden="true">
              <CheckCircle className="h-6 w-6 text-success" aria-hidden="true" />
            </div>
            <h2 className="text-2xl font-bold text-text mb-2">{t('auth:reset_password.success_title')}</h2>
            <p className="text-text-secondary mb-6">
              {t('auth:reset_password.success_message')}
            </p>
            <Link
              to="/login"
              className="inline-flex items-center text-sm font-medium text-primary hover:text-primary/80"
            >
              <ArrowLeft className="h-4 w-4 mr-2" aria-hidden="true" />
              {t('auth:reset_password.go_to_login')}
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-surface-alt flex flex-col justify-center py-12 sm:px-6 lg:px-8 transition-colors">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <h2 className="mt-6 text-center text-3xl font-extrabold text-text">
          {t('auth:reset_password.title')}
        </h2>
        <p className="mt-2 text-center text-sm text-text-secondary">
          {t('auth:reset_password.subtitle')}
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-card py-8 px-4 shadow-sm sm:rounded-lg sm:px-10">
          <form className="space-y-6" onSubmit={handleSubmit(onSubmit)}>
            {error && (
              <div className="rounded-md bg-error/5 border border-error/30 p-4" role="alert">
                <div className="flex">
                  <div className="ml-3">
                    <h3 className="text-sm font-medium text-error">{error}</h3>
                  </div>
                </div>
              </div>
            )}

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-text-secondary">
                {t('auth:reset_password.password_label')}
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
                  placeholder={t('auth:reset_password.password_placeholder')}
                  aria-required="true"
                  aria-invalid={errors.password ? "true" : "false"}
                  aria-describedby={errors.password ? "password-error" : undefined}
                />
              </div>
              {errors.password && (
                <p id="password-error" className="mt-2 text-sm text-error" role="alert">{errors.password.message}</p>
              )}
            </div>

            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-medium text-text-secondary">
                {t('auth:reset_password.confirm_label')}
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
                  placeholder={t('auth:reset_password.confirm_placeholder')}
                  aria-required="true"
                  aria-invalid={errors.confirmPassword ? "true" : "false"}
                  aria-describedby={errors.confirmPassword ? "confirm-password-error" : undefined}
                />
              </div>
              {errors.confirmPassword && (
                <p id="confirm-password-error" className="mt-2 text-sm text-error" role="alert">{errors.confirmPassword.message}</p>
              )}
            </div>

            <div>
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-xs text-sm font-medium text-white premium-gradient hover:opacity-90 focus:outline-hidden focus:ring-2 focus:ring-offset-2 focus:ring-primary/40 disabled:opacity-50 disabled:cursor-not-allowed transition-opacity"
                aria-label={isSubmitting ? t('auth:reset_password.submitting') : t('auth:reset_password.submit')}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="animate-spin -ml-1 mr-2 h-4 w-4" aria-hidden="true" />
                    {t('auth:reset_password.submitting')}
                  </>
                ) : (
                  t('auth:reset_password.submit')
                )}
              </button>
            </div>
          </form>

          <div className="mt-6 text-center">
            <Link
              to="/login"
              className="inline-flex items-center text-sm font-medium text-primary hover:text-primary/80"
            >
              <ArrowLeft className="h-4 w-4 mr-2" aria-hidden="true" />
              {t('auth:forgot_password.back_to_login')}
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
