import React, { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { logError } from '@/lib/errorHandler';
import { User } from '@/types/auth';
import { AuthContext } from './AuthContextInstance';
import { useAuth } from '@/hooks/useAuth';
import i18n from '@/i18n/config';

export { AuthContext, useAuth };

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const checkAuth = async () => {
    try {
      // Auth state is determined by httpOnly cookie — call /auth/me to validate
      const userData = await api.get<User>('/auth/me');
      setUser(userData);
    } catch (error) {
      logError('Auth check failed', error);
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    checkAuth();
    
    // Listen for 401 logout events from api.ts
    const handleLogout = () => {
      setUser(null);
    };
    
    window.addEventListener('auth:logout', handleLogout);
    return () => window.removeEventListener('auth:logout', handleLogout);
  }, []);

  useEffect(() => {
    if (user?.preferred_language && i18n.language !== user.preferred_language) {
      i18n.changeLanguage(user.preferred_language);
    }
  }, [user?.preferred_language]);

  const signOut = async () => {
    try {
      // Call logout endpoint to clear httpOnly cookie
      await api.post('/auth/logout', {});
    } catch (error) {
      // Even if logout fails, clear local state
      logError('Logout error', error);
    } finally {
      setUser(null);
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
