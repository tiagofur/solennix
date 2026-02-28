import React, { createContext, useContext, useEffect, useState } from "react";
import { api, setAuthToken, getAuthToken, clearAuthToken } from "../lib/api";
import { logError } from "../lib/errorHandler";
import { revenueCatService } from "../services/revenueCatService";

export interface User {
  id: string;
  email: string;
  name: string;
  business_name?: string;
  logo_url?: string;
  brand_color?: string;
  show_business_name_in_pdf?: boolean;
  plan: string;
  default_deposit_percent?: number;
  default_cancellation_days?: number;
  default_refund_percent?: number;
}

interface AuthContextType {
  user: User | null;
  profile: User | null;
  loading: boolean;
  checkAuth: () => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (name: string, email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  updateProfile: (data: Partial<User>) => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  profile: null,
  loading: true,
  checkAuth: async () => {},
  signIn: async () => {},
  signUp: async () => {},
  signOut: async () => {},
  updateProfile: async () => {},
});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const checkAuth = async () => {
    const token = await getAuthToken();
    if (!token) {
      setUser(null);
      setLoading(false);
      return;
    }

    try {
      const userData = await api.get<User>("/auth/me");
      setUser(userData);
      revenueCatService.initialize(userData.id);
    } catch (error) {
      console.error("Auth check failed", error);
      await clearAuthToken();
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Register 401 handler so api.ts can trigger logout
    api.setOnUnauthorized(async () => {
      await clearAuthToken();
      setUser(null);
    });

    checkAuth();
  }, []);

  const signIn = async (email: string, password: string) => {
    const response = await api.post<{ token: string; user: User }>(
      "/auth/login",
      {
        email,
        password,
      },
    );
    await setAuthToken(response.token);
    setUser(response.user);
    revenueCatService.initialize(response.user.id);
  };

  const signUp = async (name: string, email: string, password: string) => {
    const response = await api.post<{ token: string; user: User }>(
      "/auth/register",
      {
        name,
        email,
        password,
      },
    );
    await setAuthToken(response.token);
    setUser(response.user);
    revenueCatService.initialize(response.user.id);
  };

  const signOut = async () => {
    await clearAuthToken();
    setUser(null);
  };

  const updateProfile = async (data: Partial<User>) => {
    try {
      const updatedUser = await api.put<User>("/users/me", data);
      setUser(updatedUser);
    } catch (error) {
      logError("Error updating profile", error);
      throw error;
    }
  };

  const value = {
    user,
    profile: user,
    loading,
    checkAuth,
    signIn,
    signUp,
    signOut,
    updateProfile,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
