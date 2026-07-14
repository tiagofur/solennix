import React, { useEffect, useState } from 'react';
import { ApiHttpError, api } from '@/lib/api';
import { logError } from '@/lib/errorHandler';
import { User } from '@/types/auth';
import { AuthContext } from './AuthContextInstance';
import { useAuth } from '@/hooks/useAuth';
import i18n from '@/i18n/config';
import { queryClient } from '@/lib/queryClient';
import { setDefaultCurrency, setDefaultLocale, localeFromLanguage } from '@/lib/finance';
import { clearUserScopedStorage } from '@/lib/storage';

// eslint-disable-next-line react-refresh/only-export-components
export { AuthContext, useAuth };

const isPublicAuthRoute = (pathname: string) => {
  const publicAuthRoutes = new Set([
    '/login',
    '/register',
    '/forgot-password',
    '/reset-password',
    '/team-invite',
    '/team-invite/accept',
  ]);
  return publicAuthRoutes.has(pathname);
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const checkAuth = async () => {
    try {
      // Auth state is determined by httpOnly cookie — call /auth/me to validate
      const userData = await api.get<User>('/auth/me');
      setUser(userData);
    } catch (error) {
      // A 401 from /auth/me is expected when no session is active — don't log it as an error
      if (!(error instanceof ApiHttpError && error.statusCode === 401)) {
        logError('Auth check failed', error);
      }
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Skip the /auth/me network call on public auth routes — no session expected there
    if (isPublicAuthRoute(window.location.pathname)) {
      setLoading(false);
      return;
    }
    checkAuth();
    
    // Listen for 401 logout events from api.ts
    const handleLogout = () => {
      setUser(null);
      queryClient.clear();
      clearUserScopedStorage();
    };
    
    window.addEventListener('auth:logout', handleLogout);
    return () => window.removeEventListener('auth:logout', handleLogout);
  }, []);

  useEffect(() => {
    if (user?.preferred_language && i18n.language !== user.preferred_language) {
      i18n.changeLanguage(user.preferred_language);
    }
    setDefaultLocale(localeFromLanguage(i18n.language));
  }, [user?.preferred_language]);

  useEffect(() => {
    if (user?.default_currency) {
      setDefaultCurrency(user.default_currency);
    }
  }, [user?.default_currency]);

  const signOut = async () => {
    try {
      // Call logout endpoint to clear httpOnly cookie
      await api.post('/auth/logout', {});
    } catch (error) {
      // Even if logout fails, clear local state
      logError('Logout error', error);
    } finally {
      setUser(null);
      queryClient.clear();
      // Clear session-scoped localStorage (onboarding tips, local checklist
      // drafts, Supabase tokens) so shared machines don't leak the previous
      // user's context (#874). Device prefs and per-user dismissals survive.
      clearUserScopedStorage();
      window.location.href = '/login';
    }
  };

  const updateProfile = async (data: Partial<User>) => {
    try {
      const updatedUser = await api.put<User>('/users/me', data);
      setUser(updatedUser);
    } catch (error) {
      logError('Error updating profile', error);
      throw error;
    }
  };

  const value = {
    user,
    profile: user,
    loading,
    checkAuth,
    signOut,
    updateProfile,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
