import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { authClient } from '@/lib/auth-client';

interface User {
  id: string;
  email: string;
  name?: string;
  image?: string | null;
  emailVerified: boolean;
  createdAt: Date | string;
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, name?: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshSession: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const refreshSession = useCallback(async () => {
    try {
      const session = await authClient.getSession();
      if (session.data?.user) {
        // Convert the user to our User type
        const userData = session.data.user;
        setUser({
          id: userData.id,
          email: userData.email,
          name: userData.name,
          image: userData.image,
          emailVerified: userData.emailVerified,
          createdAt: userData.createdAt,
        });
      } else {
        setUser(null);
      }
    } catch {
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshSession();
    
    // Listen for auth changes using the React client's useSession atom
    // The React client exposes a $store with subscribe method
    const unsubscribe = authClient.$store.listen('$sessionSignal', () => {
      refreshSession();
    });

    return () => {
      unsubscribe();
    };
  }, [refreshSession]);

  const login = async (email: string, password: string) => {
    const { data, error } = await authClient.signIn.email({
      email,
      password,
    });
    
    if (error) {
      throw new Error(error.message);
    }
    
    if (data?.user) {
      const userData = data.user;
      setUser({
        id: userData.id,
        email: userData.email,
        name: userData.name,
        image: userData.image,
        emailVerified: userData.emailVerified,
        createdAt: userData.createdAt,
      });
    }
  };

  const register = async (email: string, password: string, name?: string) => {
    const { data, error } = await authClient.signUp.email({
      email,
      password,
      name,
    });
    
    if (error) {
      throw new Error(error.message);
    }
    
    if (data?.user) {
      const userData = data.user;
      setUser({
        id: userData.id,
        email: userData.email,
        name: userData.name,
        image: userData.image,
        emailVerified: userData.emailVerified,
        createdAt: userData.createdAt,
      });
    }
  };

  const logout = async () => {
    const { error } = await authClient.signOut();
    if (error) {
      throw new Error(error.message);
    }
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{
      user,
      isLoading,
      isAuthenticated: !!user,
      login,
      register,
      logout,
      refreshSession,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}