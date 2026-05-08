import api from './api';
import { LoginData, RegisterData, LoginResponse, User } from '../types';

export const authService = {
  // Registro
  register: async (data: RegisterData): Promise<{ message: string; devMode?: boolean }> => {
    const response = await api.post('/auth/register', data);
    return response.data;
  },

  // Login
  login: async (data: LoginData): Promise<LoginResponse> => {
    const response = await api.post('/auth/login', data);
    return response.data;
  },

  /** Reactivar cuenta soft-eliminada (correo + contraseña). */
  reactivateAccount: async (data: LoginData): Promise<LoginResponse> => {
    const response = await api.post('/auth/reactivate', data);
    return response.data;
  },

  /** Tras eliminar cuenta: borrado definitivo con correo/contraseña; luego se puede registrar de nuevo. */
  restartFreshDeletedAccount: async (
    data: LoginData
  ): Promise<{ message: string; purged?: boolean }> => {
    const response = await api.post('/auth/account/restart-fresh', data);
    return response.data;
  },

  /** Reactivar cuenta eliminada (periodo de gracia) con Google. */
  reactivateGoogleDeleted: async (idToken: string): Promise<LoginResponse> => {
    const response = await api.post('/auth/google/reactivate-deleted', { idToken });
    return response.data;
  },

  /** Reiniciar de cero con Google en periodo de gracia (nuevo usuario, sin perfil previo). */
  restartFreshGoogleDeleted: async (idToken: string): Promise<LoginResponse> => {
    const response = await api.post('/auth/google/restart-fresh-deleted', { idToken });
    return response.data;
  },

  // Verificar email
  verifyEmail: async (token: string): Promise<{ message: string }> => {
    const response = await api.post('/auth/verify-email', { token });
    return response.data;
  },

  // Reenviar email de verificación
  resendVerificationEmail: async (email: string): Promise<{ message: string }> => {
    const response = await api.post('/auth/resend-verification', { email });
    return response.data;
  },

  // Solicitar reset de contraseña (backend: POST /auth/request-password-reset)
  requestPasswordReset: async (
    email: string
  ): Promise<{ message: string; devResetCode?: string }> => {
    const response = await api.post('/auth/request-password-reset', { email });
    return response.data;
  },

  // Reset de contraseña (código por email o devResetCode en desarrollo)
  resetPassword: async (
    email: string,
    code: string,
    newPassword: string
  ): Promise<{ message: string }> => {
    const response = await api.post('/auth/reset-password', {
      email,
      code,
      newPassword,
    });
    return response.data;
  },

  // Obtener perfil actual
  getMe: async (): Promise<User> => {
    const response = await api.get('/auth/me');
    return response.data;
  },

  // Refresh token
  refreshToken: async (refreshToken: string): Promise<LoginResponse> => {
    const response = await api.post('/auth/refresh-token', { refreshToken });
    return response.data;
  },

  // Google Sign-In
  googleLogin: async (idToken: string): Promise<LoginResponse> => {
    const response = await api.post('/auth/google', { idToken });
    return response.data;
  },

  /** Registra aceptación de la versión actual de documentos legales (usuario autenticado). */
  acceptLegalConsent: async (version: string): Promise<{ user: User }> => {
    const response = await api.post('/auth/legal-consent', { version });
    return response.data;
  },

  // Eliminar cuenta
  deleteAccount: async (): Promise<{
    message: string;
    recoverableUntil?: string;
    recoveryDays?: number;
  }> => {
    const response = await api.delete('/auth/account');
    return response.data;
  },
};
