import api from './api';
import axios from 'axios';
import { snapApproximatePublicCoordinate } from '../utils/geoSnap';

export interface PlanMapPin {
  id: string;
  title: string;
  date: string;
  locationLabel?: string | null;
  category: string;
  approxLat: number;
  approxLng: number;
}

export interface PlansMapPayload {
  plans: PlanMapPin[];
  me: { approxLat: number; approxLng: number } | null;
}

function sanitizePlansMapPayload(raw: PlansMapPayload): PlansMapPayload {
  const plans = (raw.plans || [])
    .filter(
      (p) =>
        p &&
        typeof p.id === 'string' &&
        Number.isFinite(Number(p.approxLat)) &&
        Number.isFinite(Number(p.approxLng)) &&
        Math.abs(Number(p.approxLat)) <= 90 &&
        Math.abs(Number(p.approxLng)) <= 180
    )
    .map((p) => ({
      ...p,
      approxLat: Number(p.approxLat),
      approxLng: Number(p.approxLng),
    }));
  let me: PlansMapPayload['me'] = null;
  if (raw.me) {
    const la = Number(raw.me.approxLat);
    const lo = Number(raw.me.approxLng);
    if (Number.isFinite(la) && Number.isFinite(lo) && Math.abs(la) <= 90 && Math.abs(lo) <= 180) {
      me = { approxLat: la, approxLng: lo };
    }
  }
  return { plans, me };
}

export interface Plan {
  id: string;
  creatorId: string;
  title: string;
  description?: string;
  category: string;
  date: string;
  location?: string;
  /** Zona aproximada (~1 km) para mapa; null si el creador no compartía ubicación al publicar */
  approxMapLat?: number | null;
  approxMapLng?: number | null;
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

function planDateIso(p: Plan): string {
  const d = p.date as unknown;
  if (typeof d === 'string') return d;
  if (d instanceof Date) return d.toISOString();
  return String(d);
}

/** Si el backend no expone aún `GET /plans/map` (404), armamos pins desde `GET /plans`. `me` queda null. */
function buildMapPayloadFromPlans(plans: Plan[]): PlansMapPayload {
  const pins: PlanMapPin[] = (plans || [])
    .filter(
      (p) =>
        p.approxMapLat != null &&
        p.approxMapLng != null &&
        Number.isFinite(Number(p.approxMapLat)) &&
        Number.isFinite(Number(p.approxMapLng))
    )
    .map((p) => ({
      id: p.id,
      title: p.title,
      date: planDateIso(p),
      locationLabel: p.location ?? null,
      category: p.category,
      approxLat: Number(p.approxMapLat),
      approxLng: Number(p.approxMapLng),
    }));
  return sanitizePlansMapPayload({ plans: pins, me: null });
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

  /** Mapa de planes: `GET /plans/map`; si responde 404 (API antigua), usa `GET /plans` y filtra coords aproximadas. */
  getPlansMap: async (): Promise<PlansMapPayload> => {
    try {
      const res = await api.get<PlansMapPayload>('/plans/map');
      return sanitizePlansMapPayload(res.data);
    } catch (e: unknown) {
      if (axios.isAxiosError(e) && e.response?.status === 404) {
        const plansRes = await api.get<Plan[]>('/plans');
        const payload = buildMapPayloadFromPlans(Array.isArray(plansRes.data) ? plansRes.data : []);
        try {
          const locRes = await api.get<{ latitude: number; longitude: number }>('/location/me');
          const d = locRes.data;
          if (d && Number.isFinite(Number(d.latitude)) && Number.isFinite(Number(d.longitude))) {
            const s = snapApproximatePublicCoordinate(Number(d.latitude), Number(d.longitude));
            payload.me = { approxLat: s.lat, approxLng: s.lng };
          }
        } catch {
          /* sin fila locations */
        }
        return sanitizePlansMapPayload(payload);
      }
      throw e;
    }
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
