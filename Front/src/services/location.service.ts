import api from './api';
import { Location } from '../types';

export type UpdateLocationResponse = {
  latitude: number;
  longitude: number;
  accuracy?: number | null;
  approxLat?: number;
  approxLng?: number;
  id?: string;
  userId?: string;
  updatedAt?: string;
};

export const locationService = {
  // Actualizar ubicación
  updateLocation: async (location: Location): Promise<UpdateLocationResponse> => {
    const response = await api.post('/location', location);
    return response.data;
  },

  // Obtener ubicación actual
  getMyLocation: async (): Promise<Location> => {
    const response = await api.get('/location/me');
    return response.data;
  },

  // Obtener estado de compartir ubicación
  getLocationStatus: async (): Promise<{ locationEnabled: boolean }> => {
    const response = await api.get('/location/status');
    return response.data;
  },

  // Activar / desactivar compartir ubicación
  toggleLocation: async (enabled: boolean): Promise<{ locationEnabled: boolean }> => {
    const response = await api.post('/location/toggle', { enabled });
    return response.data;
  },
};
