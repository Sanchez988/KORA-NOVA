import { Platform } from 'react-native';
import Constants from 'expo-constants';

/**
 * Si el build (EAS) no inyecta `EXPO_PUBLIC_API_URL`, el APK no debe usar `localhost`.
 * Cambia esta constante si despliegas el backend en otro dominio.
 */
const DEFAULT_RELEASE_API_ORIGIN = 'https://kora-nova.onrender.com';

/** Puerto del backend en este repo (override con EXPO_PUBLIC_API_PORT). */
function defaultApiPort(): number {
  const raw =
    typeof process !== 'undefined' && process.env.EXPO_PUBLIC_API_PORT
      ? String(process.env.EXPO_PUBLIC_API_PORT).trim()
      : '';
  const n = parseInt(raw, 10);
  return Number.isFinite(n) && n > 0 ? n : 5000;
}

/**
 * En Expo Go/dispositivo, `localhost` es el teléfono — no puede alcanzar el backend en tu PC.
 * Metro expone la IP/host del dev server en `hostUri` / `debuggerHost`; reutilizamos
 * ese host para `http://<misma-ip>:<puerto>/api` cuando no hay `EXPO_PUBLIC_API_URL`.
 *
 * Si usas **`expo start --tunnel`**, ese host suele ser de Expo (no útil para el backend LAN);
 * ahí pon en Front/.env: `EXPO_PUBLIC_API_URL=http://IP_DE_TU_PC:5000/api`.
 */

function collectDebuggerHostCandidates(): string[] {
  const out: string[] = [];
  const push = (s: unknown) => {
    if (typeof s === 'string' && s.trim()) out.push(s.trim());
  };

  push(Constants.expoConfig?.hostUri);

  const m2 = Constants.manifest2 as { extra?: { expoGo?: { debuggerHost?: string } } } | undefined;
  push(m2?.extra?.expoGo?.debuggerHost);

  const m1 = Constants.manifest as
    | { debuggerHost?: string; hostUri?: string; bundleUrl?: string }
    | null
    | undefined;
  push(m1?.debuggerHost);
  push(m1?.hostUri);

  const eg = Constants.expoGoConfig as { debuggerHost?: string } | null | undefined;
  push(eg?.debuggerHost);

  const bundleUrl = m1?.bundleUrl;
  if (bundleUrl && /^https?:\/\//i.test(bundleUrl)) {
    try {
      const u = new URL(bundleUrl);
      const port = u.port || '8081';
      push(`${u.hostname}:${port}`);
    } catch {
      /* noop */
    }
  }

  return [...new Set(out)];
}

/** Empaqueta `192.168.x.x:8081` → hostname LAN; descarta localhost/túnel Expo. */
function hostnameFromPackagerStyle(hostPortPair: string): string | undefined {
  let hostCandidate = hostPortPair.replace(/^@\/?/, '').trim();
  if (/^https?:\/\//i.test(hostCandidate)) {
    hostCandidate = hostCandidate.replace(/^https?:\/\//i, '').replace(/^\/+/, '');
  }
  const idx = hostCandidate.lastIndexOf(':');
  if (idx <= 0) return undefined;

  const hostname = hostCandidate.slice(0, idx);
  const portStr = hostCandidate.slice(idx + 1);
  if (!/^\d+$/.test(portStr)) return undefined;

  if (
    hostname === 'localhost' ||
    hostname === '127.0.0.1' ||
    hostname === '0.0.0.0' ||
    /expo\.(io|dev)$/i.test(hostname) ||
    /(\.|^)(exp\.direct|exp\.host)$/i.test(hostname)
  ) {
    return undefined;
  }

  return hostname || undefined;
}

let warnedExpoGoLocalhostFallback = false;

function inferredLanBackendHost(): string | undefined {
  if (typeof process !== 'undefined' && process.env.EXPO_PUBLIC_API_URL?.trim()) return undefined;

  for (const raw of collectDebuggerHostCandidates()) {
    const h = hostnameFromPackagerStyle(raw);
    if (h) return h;
  }
  return undefined;
}

/**
 * En web, solo inferimos la API en el mismo host en localhost o LAN privada.
 * En dominios públicos (Expo Hosting, Vercel, etc.) el backend no vive en :5000 de ese host:
 * sin `EXPO_PUBLIC_API_URL` las imágenes `/uploads/...` y las rutas fallan.
 */
function webHostnameAllowsSameHostApi(hostname: string): boolean {
  const h = hostname.toLowerCase();
  if (h === 'localhost' || h === '127.0.0.1') return true;
  if (/^192\.168\.\d{1,3}\.\d{1,3}$/.test(h)) return true;
  if (/^10\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(h)) return true;
  if (/^172\.(1[6-9]|2\d|3[01])\.\d{1,3}\.\d{1,3}$/.test(h)) return true;
  return false;
}

/**
 * Base de la API usada por axios.
 *
 * - **Web** (`expo start --web`): si abres `http://192.168.x.x:8081`, la API se resuelve a
 *   `http://192.168.x.x:<puerto>/api` (mismo host que el front, backend en el puerto por defecto 5000).
 *   En `localhost` sigue siendo `http://localhost:<puerto>/api`.
 * - **Web en dominio público** (p. ej. `*.expo.dev`, preview en la nube) sin `EXPO_PUBLIC_API_URL`: se usa
 *   `DEFAULT_RELEASE_API_ORIGIN` para no apuntar uploads y `/api` al host del front.
 * - **Expo Go en móvil (misma red LAN)**: por defecto se infiere IP desde Metro (`hostUri` / `debuggerHost`) → mismo host.
 * - **Sin inferencia válida**: cae en `localhost` y fallará en el físico hasta que definas `.env`:
 *   `EXPO_PUBLIC_API_URL=http://IP_DE_TU_PC:5000/api`
 * - **Override** en cualquier plataforma: `EXPO_PUBLIC_API_URL` (con o sin `/api` final).
 */
function normalizeApiUrl(raw: string): string {
  const u = raw.trim().replace(/\/+$/, '');
  return u.endsWith('/api') ? u : `${u}/api`;
}

export function resolveApiUrl(): string {
  const fromEnv =
    typeof process !== 'undefined' && process.env.EXPO_PUBLIC_API_URL
      ? String(process.env.EXPO_PUBLIC_API_URL).trim()
      : '';
  if (fromEnv) return normalizeApiUrl(fromEnv);

  const port = defaultApiPort();

  if (Platform.OS === 'web' && typeof window !== 'undefined' && window.location?.hostname) {
    const { hostname, protocol } = window.location;
    if (webHostnameAllowsSameHostApi(hostname)) {
      const proto = protocol === 'https:' ? 'https' : 'http';
      return `${proto}://${hostname}:${port}/api`;
    }
    if (__DEV__) {
      return `http://localhost:${port}/api`;
    }
    return normalizeApiUrl(DEFAULT_RELEASE_API_ORIGIN);
  }

  const lanHost = inferredLanBackendHost();
  if (lanHost && Platform.OS !== 'web') {
    return `http://${lanHost}:${port}/api`;
  }

  /** Expo Go = 'expo'; APK/IPA instalado ≠ expo. Sin .env en el bundle, antes se usaba localhost y fallaba todo. */
  const runningInExpoGo = Constants.appOwnership === 'expo';
  if (Platform.OS !== 'web' && !runningInExpoGo && !fromEnv && !lanHost) {
    return normalizeApiUrl(DEFAULT_RELEASE_API_ORIGIN);
  }

  if (
    __DEV__ &&
    Platform.OS !== 'web' &&
    !fromEnv &&
    !warnedExpoGoLocalhostFallback
  ) {
    warnedExpoGoLocalhostFallback = true;
    console.warn(
      '[Kora] API en localhost — en Expo Go el teléfono no alcanza el PC.\n' +
        `Define en Front/.env: EXPO_PUBLIC_API_URL=http://IP_DE_TU_PC:${port}/api (IPv4 Wi‑Fi), reinicia Expo.\n` +
        'Evita `expo start --tunnel` para login por LAN, o usa esa URL con la IP real del ordenador.'
    );
  }

  return `http://localhost:${port}/api`;
}

export const API_URL = resolveApiUrl();

export const API_CONFIG = {
  /** Render free: cold start + TLS a veces supera 70s; un reintento cubre el segundo intento. */
  timeout: 120000,
  headers: {
    'Content-Type': 'application/json',
  },
};

export const CLOUDINARY_UPLOAD_PRESET = 'kora_uploads';

/**
 * Google OAuth client IDs (`GOOGLE_*`). Tipo Web / Android / iOS en Cloud Console.
 * Guía ante `redirect_uri_mismatch`: `googleOAuth.ts` (log Metro al abrir login).
 * Web: si Google ya tiene otra URI, copia esa URL en `.env`: `EXPO_PUBLIC_GOOGLE_WEB_REDIRECT_URI=`
 *
 * Debe coincidir con `GOOGLE_CLIENT_ID` en Back/.env (mismo cliente «Aplicación web»).
 */
const FALLBACK_GOOGLE_WEB_CLIENT_ID =
  '557977572943-g7jcjspu88otgkherujsacamc8i3t1gd.apps.googleusercontent.com';

export const GOOGLE_CLIENT_ID =
  typeof process !== 'undefined' && process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID?.trim()
    ? String(process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID).trim()
    : FALLBACK_GOOGLE_WEB_CLIENT_ID;

// Reemplaza estos valores con los tuyos de Google Cloud Console / Firebase
export const GOOGLE_ANDROID_CLIENT_ID = '557977572943-XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX.apps.googleusercontent.com';
export const GOOGLE_IOS_CLIENT_ID = '557977572943-YYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYY.apps.googleusercontent.com';
