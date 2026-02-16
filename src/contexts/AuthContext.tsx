import React, { createContext, useContext, useEffect, useState } from 'react';
import { Session, User } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import { Database } from '../types/supabase';
import { logError } from '../lib/errorHandler';

type UserProfile = Database['public']['Tables']['users']['Row'];

interface AuthContextType {
  session: Session | null;
  user: User | null;
  profile: UserProfile | null;
  loading: boolean;
  signOut: () => Promise<void>;
  updateProfile: (data: Partial<UserProfile>) => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  session: null,
  user: null,
  profile: null,
  loading: true,
  signOut: async () => {},
  updateProfile: async () => {},
});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  const clearSupabaseAuthTokens = () => {
    try {
      Object.keys(localStorage).forEach((key) => {
        if (key.startsWith('sb-') && key.endsWith('-auth-token')) {
          localStorage.removeItem(key);
        }
      });
    } catch {
      return;
    }
  };

  const fetchProfile = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) {
        logError('Error fetching profile', error);
        // If profile doesn't exist but user is auth'd, we shouldn't block
        // In a real app, we might redirect to a "complete profile" page
        setProfile(null);
      } else {
        setProfile(data);
      }
    } catch (error) {
      logError('Error fetching profile', error);
      setProfile(null);
    }
  };

  useEffect(() => {
    let mounted = true;

    // Get initial session
    const initSession = async () => {
      try {
        const { data, error } = await supabase.auth.getSession();
        
        if (error) {
          logError('Error getting session', error);
          throw error;
        }

        if (mounted) {
          const nextSession = data.session ?? null;
          setSession(nextSession);
          setUser(nextSession?.user ?? null);
          setLoading(false);

          if (nextSession?.user) fetchProfile(nextSession.user.id);
          else setProfile(null);
        }
      } catch (error) {
        logError('Error initializing session', error);
        clearSupabaseAuthTokens();
        if (mounted) {
          setSession(null);
          setUser(null);
          setProfile(null);
          setLoading(false);
        }
      }
    };

    initSession();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (mounted) {
        if (event === 'SIGNED_OUT') {
          setSession(null);
          setUser(null);
          setProfile(null);
          setLoading(false);
          return;
        }

        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);
        
        if (session?.user) {
          fetchProfile(session.user.id);
        } else {
          setProfile(null);
        }
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const signOut = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) logError('Error signing out', error);
    } catch (error) {
      logError('Unexpected error signing out', error);
    } finally {
      // Always clear local state
      setSession(null);
      setUser(null);
      setProfile(null);
      
      clearSupabaseAuthTokens();
    }
  };

  const updateProfile = async (data: Partial<UserProfile>) => {
    if (!user) return;
    try {
      const { data: updatedProfile, error } = await supabase
        .from('users')
        // @ts-ignore - Supabase type inference issue
        .update(data)
        .eq('id', user.id)
        .select()
        .single();

      if (error) throw error;
      setProfile(updatedProfile);
    } catch (error) {
      logError('Error updating profile', error);
      throw error;
    }
  };

  const value = {
    session,
    user,
    profile,
    loading,
    signOut,
    updateProfile,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
