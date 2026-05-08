import api from './api';

export interface Plan {
  id: string;
  creatorId: string;
  title: string;
  description?: string;
  category: string;
  date: string;
  location?: string;
  maxParticipants?: number;
  isPublic: boolean;
  status: string;
  participantCount: number;
  createdAt: string;
  creator: {
    id: string;
    email: string;
    profile?: { name: string; photos: string[] } | null;
  };
  participants: Array<{
    userId: string;
    status: string;
    user: { id: string; profile?: { name: string; photos: string[] } | null };
  }>;
}

export interface CreatePlanData {
  title: string;
  description?: string;
  category: string;
  date: string; // ISO string
  location?: string;
  maxParticipants?: number;
  isPublic?: boolean;
}

export const planService = {
  getPlans: async (): Promise<Plan[]> => {
    const res = await api.get('/plans');
    return res.data;
  },

  getMyPlans: async (): Promise<Plan[]> => {
    const res = await api.get('/plans/mine');
    return res.data;
  },

  createPlan: async (data: CreatePlanData): Promise<Plan> => {
    const res = await api.post('/plans', data);
    return res.data;
  },

  updatePlan: async (id: string, data: Partial<CreatePlanData>): Promise<Plan> => {
    const res = await api.patch(`/plans/${id}`, data);
    return res.data;
  },

  joinPlan: async (id: string): Promise<Plan> => {
    const res = await api.post(`/plans/${id}/join`);
    return res.data;
  },

  /** Solo el creador; `userId` debe ser un match tuyo. */
  addParticipantToPlan: async (planId: string, userId: string): Promise<Plan> => {
    const res = await api.post(`/plans/${planId}/add-participant`, { userId });
    return res.data;
  },

  leavePlan: async (id: string): Promise<void> => {
    await api.delete(`/plans/${id}/leave`);
  },

  cancelPlan: async (id: string): Promise<void> => {
    await api.delete(`/plans/${id}`);
  },
};
