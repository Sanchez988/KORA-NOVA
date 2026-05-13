import axios, { AxiosInstance, AxiosError } from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import { resolveApiUrl, API_CONFIG } from '../config';

class ApiService {
  private api: AxiosInstance;

  constructor() {
    this.api = axios.create({
      baseURL: resolveApiUrl(),
      ...API_CONFIG,
    });

    // Interceptor para añadir token a las peticiones
    this.api.interceptors.request.use(
      async (config) => {
        config.baseURL = resolveApiUrl();
        const token = await AsyncStorage.getItem('token');
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
      },
      (error) => Promise.reject(error)
    );

    // Interceptor para manejar errores (+ un reintento ante cold start / red inestable)
    this.api.interceptors.response.use(
      (response) => response,
      async (error: AxiosError) => {
        const cfg = error.config as (typeof error.config & { __koraRetry?: boolean }) | undefined;
        const noResponse = !error.response;
        if (noResponse && cfg && !cfg.__koraRetry) {
          const code = (error as AxiosError & { code?: string }).code;
          const msg = String(error.message ?? '');
          const retriable =
            code === 'ECONNABORTED' ||
            code === 'ERR_NETWORK' ||
            msg === 'Network Error' ||
            /timeout/i.test(msg);
          if (retriable) {
            cfg.__koraRetry = true;
            await new Promise((r) => setTimeout(r, 5000));
            try {
              return await this.api.request(cfg);
            } catch (e2) {
              error = e2 as AxiosError;
            }
          }
        }

        if (error.response?.status === 401) {
          // Token expirado, limpiar almacenamiento
          await AsyncStorage.multiRemove(['token', 'refreshToken', 'user']);
        }
        // Normalizar formatos de error: { error: '...' } → { message: '...' }
        if (error.response?.data && typeof error.response.data === 'object') {
          const data = error.response.data as Record<string, any>;
          if (!data['message'] && data['error']) {
            data['message'] = data['error'];
          }
        }
        // Error de red (backend no disponible, CORS incorrecto, firewall, etc.)
        if (!error.response) {
          const networkError = error as any;
          const base = resolveApiUrl();
          const loopback = /\blocalhost\b|127\.0\.0\.1/i.test(base);
          const nativeLoopback =
            Platform.OS !== 'web' &&
            loopback &&
            !(typeof process !== 'undefined' && process.env.EXPO_PUBLIC_API_URL?.trim());
          const remoteHttps = /^https:\/\//i.test(base) && !loopback;
          networkError.friendlyMessage = nativeLoopback
            ? 'En el móvil, localhost es el propio celular — no llega al backend del PC. Crea/edita Front/.env con EXPO_PUBLIC_API_URL=http://IP_DE_TU_PC:5000/api (IPv4 Wi‑Fi, mismo router), reinicia Expo. O usa LAN sin túnel: expo start.'
            : remoteHttps
              ? `No hubo respuesta del servidor (${base}). Comprueba datos o Wi‑Fi. En hosts gratuitos (p. ej. Render) el primer intento puede tardar más de un minuto mientras el servicio «despierta»; vuelve a intentar.`
              : `Sin conexión con la API (${base}). Backend en carpeta Back: npm run dev (puerto 5000); revisa Wi‑Fi o firewall si es un dispositivo físico.`;
        }
        return Promise.reject(error);
      }
    );
  }

  getApi() {
    return this.api;
  }
}

const apiSingleton = new ApiService().getApi();

export default apiSingleton;

/** Mensaje usable en UI cuando axios falla (red, timeouts, servidor apagado). */
/** Canje authorization_code + PKCE con el mismo Client ID Web que usa el front (`GOOGLE_CLIENT_SECRET` sólo en servidor). */
export async function exchangeGoogleOAuthCode(payload: {
  code: string;
  redirectUri: string;
  codeVerifier: string;
}): Promise<string> {
  const { data } = await apiSingleton.post<{ idToken: string }>(
    '/auth/google/oauth-code',
    payload
  );
  const idToken = typeof data?.idToken === 'string' ? data.idToken : '';
  if (!idToken) {
    throw new Error('La API no devolvió id_token.');
  }
  return idToken;
}

export function apiErrorDisplayMessage(error: unknown): string {
  const e = error as {
    friendlyMessage?: string;
    response?: { data?: { message?: string; error?: string } };
    message?: string;
  };
  const data = e.response?.data;
  const fromBody =
    (data && typeof data === 'object' && typeof data.message === 'string' && data.message.trim()
      ? data.message.trim()
      : '') ||
    (data && typeof data === 'object' && typeof data.error === 'string' && data.error.trim()
      ? data.error.trim()
      : '');
  return e.friendlyMessage || fromBody || e.message || 'No se pudo completar la petición.';
}

export function getConfiguredApiOrigin(): string {
  const u = resolveApiUrl();
  return u.replace(/\/api\/?$/, '') || u;
}
