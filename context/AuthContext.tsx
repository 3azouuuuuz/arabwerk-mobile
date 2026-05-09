import { useRouter } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import React, { createContext, useContext, useEffect, useState } from 'react';
import { ENV } from '../config/env';

let _hasNavigated = false;

interface User {
  id: number;
  email: string;
  firstname: string;
  lastname: string;
  phone?: string;
  city?: string;
  email_verified: boolean;
  created_at?: string;
  user_type: {
    id: number;
    account_type_name: string;
  };
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  signup: (data: SignupData) => Promise<User>;
  updateUser: (userData: Partial<User>) => void;
  refreshUser: () => Promise<void>;
}

interface SignupData {
  firstname: string;
  lastname: string;
  email: string;
  password: string;
  phone: string;
  city: string;
  user_type: number;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const getApiHeaders = () => ({
  'Content-Type': 'application/json',
  ...(ENV.API_BASE_URL?.includes('ngrok') && {
    'ngrok-skip-browser-warning': 'true',
  }),
});

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    loadStoredSession();
  }, []);

  const checkProviderSetup = async (userId: number): Promise<boolean> => {
    try {
      const response = await fetch(
        `${ENV.API_BASE_URL}/provider_profiles?user_id=${userId}`,
        { headers: getApiHeaders() }
      );
      if (!response.ok) return false;
      const data = await response.json();
      const profile = Array.isArray(data) ? data[0] : data;
      return !!(profile?.category?.trim());
    } catch {
      return false;
    }
  };

  const checkProviderSubscription = async (userId: number): Promise<boolean> => {
    try {
      const response = await fetch(
        `${ENV.API_BASE_URL}/provider_profiles/subscription-status/${userId}`,
        { headers: getApiHeaders() }
      );
      if (!response.ok) return false;
      const data = await response.json();
      return data.has_subscription === true;
    } catch {
      return false;
    }
  };

  const navigateAfterLogin = async (targetUser: User) => {
    if (_hasNavigated) {
      setIsLoading(false);
      return;
    }
    _hasNavigated = true;

    try {
      if (targetUser.user_type.id === 1) {
        router.replace('/(client)/(tabs)');
      } else if (targetUser.user_type.id === 2) {
        const hasSubscription = await checkProviderSubscription(targetUser.id);
        if (!hasSubscription) {
          router.replace('/(provider)/choose-subscription');
          return;
        }

        const hasSetup = await checkProviderSetup(targetUser.id);
        if (!hasSetup) {
          router.replace('/(provider)/provider-setup');
          return;
        }

        router.replace('/(provider)/(tabs)');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const loadStoredSession = async () => {
    try {
      const storedToken = await SecureStore.getItemAsync('token');
      const storedUser = await SecureStore.getItemAsync('user');

      if (storedToken && storedUser) {
        const parsedUser: User = JSON.parse(storedUser);
        setToken(storedToken);
        setUser(parsedUser);
        await navigateAfterLogin(parsedUser);
      } else {
        setIsLoading(false);
      }
    } catch (error) {
      console.error('❌ Failed to load session:', error);
      setIsLoading(false);
    }
  };

  // ✅ Re-fetches the latest user data from the API and updates state + SecureStore
  const refreshUser = async () => {
    try {
      const storedToken = await SecureStore.getItemAsync('token');
      const storedUser = await SecureStore.getItemAsync('user');
      if (!storedToken || !storedUser) return;

      const parsedUser: User = JSON.parse(storedUser);

      const response = await fetch(
        `${ENV.API_BASE_URL}/users/${parsedUser.id}`,
        {
          headers: {
            ...getApiHeaders(),
            Authorization: `Bearer ${storedToken}`,
          },
        }
      );

      if (!response.ok) return;

      const freshUser: User = await response.json();
      setUser(freshUser);
      await SecureStore.setItemAsync('user', JSON.stringify(freshUser));
    } catch (error) {
      console.error('❌ refreshUser error:', error);
    }
  };

  const login = async (email: string, password: string) => {
    try {
      const response = await fetch(`${ENV.API_BASE_URL}/users/login`, {
        method: 'POST',
        headers: getApiHeaders(),
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (!response.ok) throw new Error(data.message || 'Login failed');
      if (!data.token || !data.user) throw new Error('Invalid response from server');
      if (!data.user.email_verified) throw new Error('Please verify your email before logging in');

      await SecureStore.setItemAsync('token', data.token);
      await SecureStore.setItemAsync('user', JSON.stringify(data.user));
      await SecureStore.setItemAsync('id', String(data.user.id));

      setToken(data.token);
      setUser(data.user);

      _hasNavigated = false;
      await navigateAfterLogin(data.user);
    } catch (error) {
      console.error('❌ Login error:', error);
      throw error;
    }
  };

  const logout = async () => {
    try {
      await SecureStore.deleteItemAsync('token');
      await SecureStore.deleteItemAsync('user');
      await SecureStore.deleteItemAsync('id');
      await SecureStore.deleteItemAsync('needs_subscription');
      await SecureStore.deleteItemAsync('needs_setup');
      await SecureStore.deleteItemAsync('user_city');
    } catch (error) {
      console.error('❌ Logout error:', error);
    } finally {
      _hasNavigated = false;
      setToken(null);
      setUser(null);
    }
  };

  const signup = async (data: SignupData): Promise<User> => {
    try {
      const response = await fetch(`${ENV.API_BASE_URL}/users/register`, {
        method: 'POST',
        headers: getApiHeaders(),
        body: JSON.stringify(data),
      });

      const result = await response.json();
      if (!response.ok) throw new Error(result.message || 'Registration failed');

      await fetch(`${ENV.API_BASE_URL}/email/send-verification-email`, {
        method: 'POST',
        headers: getApiHeaders(),
        body: JSON.stringify({ email: data.email, address: data.city }),
      });

      return result;
    } catch (error) {
      console.error('❌ Signup error:', error);
      throw error;
    }
  };

  const updateUser = (userData: Partial<User>) => {
    if (user) {
      const updatedUser = { ...user, ...userData };
      setUser(updatedUser);
      SecureStore.setItemAsync('user', JSON.stringify(updatedUser));
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isAuthenticated: !!token && !!user,
        isLoading,
        login,
        logout,
        signup,
        updateUser,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};