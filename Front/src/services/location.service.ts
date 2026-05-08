import api from './api';
import { Location } from '../types';

export const locationService = {
  // Actualizar ubicación
  updateLocation: async (location: Location): Promise<{ message: string }> => {
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
