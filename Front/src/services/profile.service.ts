import api from './api';
import { Profile } from '../types';

/** Desglose del score que devuelve `GET /profile/stats`. */
export type TrustBreakdown = {
  verified: { points: number; max: number };
  institutionalEmail: { points: number; max: number };
  interactions: { points: number; max: number };
  reports: { count: number; penalty: number; maxPenalty: number };
};

export type UserProfileStats = {
  matchCount: number;
  messagesSent: number;
  likesReceived: number;
  plansCreated: number;
  trustScore?: number;
  trustBreakdown?: TrustBreakdown;
};

export interface CreateProfileData {
  name: string;
  bio?: string;
  gender: string;
  program: string;
  semester?: number;
  interests: string[];
  hobbies: string[];
  relationshipGoal: string;
  photos?: string[];
}

export interface UpdateProfileData extends Partial<CreateProfileData> {
  minAge?: number;
  maxAge?: number;
  maxDistance?: number;
  showMeTo?: string;
  showLastSeen?: boolean;
  showDistance?: boolean;
}

export const profileService = {
  // Crear perfil
  createProfile: async (data: CreateProfileData): Promise<Profile> => {
    const response = await api.post('/profile', data);
    return response.data;
  },

  // Obtener mi perfil
  getMyProfile: async (): Promise<Profile> => {
    const response = await api.get('/profile/me');
    return response.data;
  },

  // Actualizar perfil
  updateProfile: async (data: UpdateProfileData): Promise<Profile> => {
    const response = await api.put('/profile', data);
    return response.data;
  },

  // Obtener perfil por ID
  getProfileById: async (userId: string): Promise<Profile> => {
    const response = await api.get(`/profile/${userId}`);
    return response.data;
  },

  // Eliminar foto del perfil
  deletePhoto: async (photoUrl: string): Promise<void> => {
    await api.delete('/profile/photo', { data: { photoUrl } });
  },

  // Activar modo incógnito
  toggleIncognitoMode: async (enabled: boolean, hours?: number): Promise<Profile> => {
    const duration = hours ? hours * 60 * 60 * 1000 : undefined;
    const response = await api.patch('/profile/incognito', { enabled, duration });
    return response.data;
  },

  // Estadísticas para insignias
  getStats: async (): Promise<UserProfileStats> => {
    const response = await api.get('/profile/stats');
    return response.data;
  },
};
