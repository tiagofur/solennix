import { createContext } from 'react';
import { User } from '@/types/auth';

export interface AuthContextType {
  user: User | null;
  profile: User | null;
  loading: boolean;
  checkAuth: () => Promise<void>;
  signOut: () => void;
  updateProfile: (data: Partial<User>) => Promise<void>;
}

export const AuthContext = createContext<AuthContextType>({
  user: null,
  profile: null,
  loading: true,
  checkAuth: async () => {},
  signOut: () => {},
  updateProfile: async () => {},
});
