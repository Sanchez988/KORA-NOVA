import api from './api';
import { Match, User } from '../types';

export interface DiscoveryUser extends User {
  distance?: number;
}

function asDiscoveryList(raw: unknown): DiscoveryUser[] {
  if (Array.isArray(raw)) return raw as DiscoveryUser[];
  if (raw && typeof raw === 'object') {
    const o = raw as Record<string, unknown>;
    if (Array.isArray(o.users)) return o.users as DiscoveryUser[];
    if (Array.isArray(o.data)) return o.data as DiscoveryUser[];
  }
  return [];
}

export const matchService = {
  // Obtener usuarios para descubrir
  getDiscoveryUsers: async (): Promise<DiscoveryUser[]> => {
    const response = await api.get('/match/discovery');
    return asDiscoveryList(response.data);
  },

  // Dar like a un usuario
  likeUser: async (targetUserId: string, isSuperLike: boolean = false): Promise<{ liked?: boolean; match?: Match }> => {
    const response = await api.post('/match/like', { targetUserId, isSuperLike });
    return response.data;
  },

  // Dar dislike a un usuario
  dislikeUser: async (targetUserId: string): Promise<{ message: string }> => {
    const response = await api.post('/match/dislike', { targetUserId });
    return response.data;
  },

  // Obtener mis matches
  getMyMatches: async (): Promise<Match[]> => {
    const response = await api.get('/match/my-matches');
    return response.data;
  },

  // Deshacer match
  unmatch: async (matchId: string): Promise<{ message: string }> => {
    const response = await api.delete(`/match/${matchId}`);
    return response.data;
  },
};
