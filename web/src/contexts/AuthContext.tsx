import React, { createContext, useContext, useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { logError } from '@/lib/errorHandler';

export interface User {
  id: string;
  email: string;
  name: string;
  business_name?: string;
  logo_url?: string;
  brand_color?: string;
  show_business_name_in_pdf?: boolean;
  plan: string;
  role?: string;
  stripe_customer_id?: string;
  default_deposit_percent?: number;
  default_cancellation_days?: number;
  default_refund_percent?: number;
  contract_template?: string | null;
  // Notification preferences
  email_payment_receipt?: boolean;
  email_event_reminder?: boolean;
  email_subscription_updates?: boolean;
  email_weekly_summary?: boolean;
  email_marketing?: boolean;
  push_enabled?: boolean;
  push_event_reminder?: boolean;
  push_payment_received?: boolean;
}

interface AuthContextType {
  user: User | null;
  profile: User | null;
  loading: boolean;
  checkAuth: () => Promise<void>;
  signOut: () => void;
  updateProfile: (data: Partial<User>) => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  profile: null,
  loading: true,
  checkAuth: async () => {},
  signOut: () => {},
  updateProfile: async () => {},
});

export const useAuth = () => useContext(AuthContext);

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
