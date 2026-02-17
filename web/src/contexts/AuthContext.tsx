import React, { createContext, useContext, useEffect, useState } from 'react';
import { api } from '../lib/api';
import { logError } from '../lib/errorHandler';

export interface User {
  id: string;
  email: string;
  name: string;
  business_name?: string;
  plan: string;
  default_deposit_percent?: number;
  default_cancellation_days?: number;
  default_refund_percent?: number;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  checkAuth: () => Promise<void>;
  signOut: () => void;
  updateProfile: (data: Partial<User>) => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
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
    const token = localStorage.getItem('auth_token');
    if (!token) {
      setUser(null);
      setLoading(false);
      return;
    }

    try {
      const userData = await api.get<User>('/auth/me');
      setUser(userData);
    } catch (error) {
      console.error('Auth check failed', error);
      localStorage.removeItem('auth_token');
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
      localStorage.removeItem('auth_token');
    };
    
    window.addEventListener('auth:logout', handleLogout);
    return () => window.removeEventListener('auth:logout', handleLogout);
  }, []);

  const signOut = () => {
    localStorage.removeItem('auth_token');
    setUser(null);
    window.location.href = '/login';
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
    loading,
    checkAuth,
    signOut,
    updateProfile,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
