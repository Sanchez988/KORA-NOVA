import React, { createContext, useState, useEffect, useContext, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { authService } from '../services/auth.service';
import { User, LoginData, RegisterData, LoginResponse } from '../types';

interface AuthContextType {
  user: User | null;
  token: string | null;
  loading: boolean;
  onboardingCompleted: boolean;
  setOnboardingCompleted: (v: boolean) => void;
  login: (data: LoginData) => Promise<void>;
  register: (data: RegisterData) => Promise<{ devMode?: boolean }>;
  googleLogin: (idToken: string) => Promise<void>;
  /** Persiste token/usuario (p. ej. respuesta de `/auth/reactivate`) sin segundo login. */
  hydrateSession: (payload: LoginResponse) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [onboardingCompleted, setOnboardingCompleted] = useState(false);

  useEffect(() => {
    loadStoredAuth();
  }, []);

  const loadStoredAuth = async () => {
    try {
      const [storedToken, storedUser] = await AsyncStorage.multiGet(['token', 'user']);
      
      if (storedToken[1] && storedUser[1]) {
        // Verificar que el token sigue siendo válido
        try {
          const freshUser = await authService.getMe();
          setToken(storedToken[1]);
          setUser(freshUser);
          await AsyncStorage.setItem('user', JSON.stringify(freshUser));
        } catch {
          // Token expirado o inválido — limpiar sesión y mostrar Login
          await AsyncStorage.multiRemove(['token', 'refreshToken', 'user']);
        }
      }
    } catch (error) {
      console.error('Error loading auth:', error);
    } finally {
      setLoading(false);
    }
  };

  const login = async (data: LoginData) => {
    const response = await authService.login(data);
    
    await AsyncStorage.multiSet([
      ['token', response.token],
      ['refreshToken', response.refreshToken],
      ['user', JSON.stringify(response.user)],
    ]);

    setToken(response.token);
    setUser(response.user);
  };

  const register = async (data: RegisterData): Promise<{ devMode?: boolean }> => {
    const response = await authService.register(data);
    return response;
  };

  const googleLogin = async (idToken: string) => {
    const response = await authService.googleLogin(idToken);

    if (!response?.token || !response?.user?.id) {
      throw new Error('Respuesta incompleta del servidor al iniciar sesión con Google');
    }

    await AsyncStorage.multiSet([
      ['token', response.token],
      ['refreshToken', response.refreshToken],
      ['user', JSON.stringify(response.user)],
    ]);

    setToken(response.token);
    setUser(response.user);
  };

  const hydrateSession = async (payload: LoginResponse) => {
    await AsyncStorage.multiSet([
      ['token', payload.token],
      ['refreshToken', payload.refreshToken],
      ['user', JSON.stringify(payload.user)],
    ]);
    setToken(payload.token);
    setUser(payload.user);
  };

  const logout = async () => {
    await AsyncStorage.multiRemove(['token', 'refreshToken', 'user']);
    setToken(null);
    setUser(null);
    setOnboardingCompleted(false);
  };

  const refreshUser = async () => {
    try {
      const updatedUser = await authService.getMe();
      setUser(updatedUser);
      await AsyncStorage.setItem('user', JSON.stringify(updatedUser));
    } catch (error) {
      console.error('Error refreshing user:', error);
    }
  };

  return (
    <AuthContext.Provider value={{ user, token, loading, onboardingCompleted, setOnboardingCompleted, login, register, googleLogin, hydrateSession, logout, refreshUser }}>
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
