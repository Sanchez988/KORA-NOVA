import api from './api';
import { Message } from '../types';

export interface SendMessageData {
  content: string;
  images?: string[];
  attachmentNames?: string[];
  attachmentTypes?: string[];
}

export const messageService = {
  // Obtener mensajes de un match
  getMessages: async (matchId: string): Promise<Message[]> => {
    const response = await api.get(`/messages/${matchId}`);
    return response.data;
  },

  // Enviar mensaje
  sendMessage: async (matchId: string, data: SendMessageData): Promise<Message> => {
    const response = await api.post(`/messages/${matchId}`, data);
    return response.data;
  },

  // Marcar mensaje como leído
  markAsRead: async (messageId: string): Promise<void> => {
    await api.put(`/messages/${messageId}/read`);
  },

  // Eliminar mensaje
  deleteMessage: async (messageId: string): Promise<void> => {
    await api.delete(`/messages/${messageId}`);
  },
};
