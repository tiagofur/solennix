import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useTranslation } from 'react-i18next';

function AuthChecking() {
  const { t } = useTranslation();
  return (
    <div className="flex items-center justify-center min-h-screen" role="status" aria-live="polite">
      <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-orange-500" aria-hidden="true"></div>
      <span className="sr-only">{t('auth.verifying')}</span>
    </div>
  );
}

/**
 * Puerta del portal Secretario: solo `role === 'assistant'`.
 * - team_member → su portal (/team/work)
 * - resto (organizador) → /dashboard
 */
export const AssistantRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return <AuthChecking />;
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (user.role === 'team_member') {
    return <Navigate to="/team/work" replace />;
  }

  if (user.role !== 'assistant') {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
};

/**
 * Bifurcación S4 para el portal de equipo: los secretarios que caigan en
 * /team/* (p. ej. vía el redirect de ProtectedRoute en rutas de organizador)
 * van a /assistant; el resto ve el contenido del equipo.
 */
export const TeamPortalGuard: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return <AuthChecking />;
  }

  if (user?.role === 'assistant') {
    return <Navigate to="/assistant" replace />;
  }

  return <>{children}</>;
};
