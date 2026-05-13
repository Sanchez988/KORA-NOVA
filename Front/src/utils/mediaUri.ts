import { Platform } from 'react-native';
import { resolveApiUrl } from '../config';

/** Origen público del backend (`…/5000`), sin sufijo `/api`. */
export function getMediaOrigin(): string {
  const base = resolveApiUrl().replace(/\/+$/, '');
  return base.replace(/\/api$/, '');
}

function isLoopbackHost(hostname: string): boolean {
  const h = hostname.toLowerCase();
  return h === 'localhost' || h === '127.0.0.1' || h === '[::1]' || h === '::1';
}

/**
 * Imágenes guardadas como `http://192.168.x.x:5000/uploads/...` o `http://localhost/...`
 * en la BD dejan de ser alcanzables al cambiar de red o al usar la APK contra Render.
 * Si la ruta es de ficheros servidos por este API (`/uploads`, `/static`), se sirven desde
 * el origen actual (`getMediaOrigin()`).
 */
export function rehostAppMediaPaths(uri: string): string {
  const t = (uri || '').trim();
  if (!/^https?:\/\//i.test(t)) return t;
  try {
    const u = new URL(t);
    const path = u.pathname || '';
    if (!/^\/(uploads|static)(\/|$)/i.test(path)) return t;
    const origin = getMediaOrigin().replace(/\/+$/, '');
    return `${origin}${path}${u.search || ''}`;
  } catch {
    return t;
  }
}

/**
 * URLs absolutas guardadas en el servidor como `localhost` no cargan en el móvil.
 * Sustituye el host por el mismo que usa `EXPO_PUBLIC_API_URL` / inferencia LAN.
 */
export function rewriteLoopbackMediaUrls(uri: string): string {
  const u = (uri || '').trim();
  if (!/^https?:\/\//i.test(u)) return u;
  try {
    const parsed = new URL(u);
    if (!isLoopbackHost(parsed.hostname)) return u;
    const originUrl = new URL(getMediaOrigin());
    parsed.protocol = originUrl.protocol;
    parsed.hostname = originUrl.hostname;
    if (originUrl.port) parsed.port = originUrl.port;
    else parsed.port = '';
    return parsed.toString();
  } catch {
    return u;
  }
}

/**
 * Imágenes/audio/adjuntos listos para `Image`, `expo-image` o `Audio` en dispositivos.
 */
export function resolveRenderableMediaUri(uri: string): string {
  const raw = (uri || '').trim();
  if (!raw) return raw;
  const low = raw.toLowerCase();

  /** Algunos fallbacks del API guardan `uploads/…` sin `/` inicial → no es URL válida en el móvil. */
  if (/^(uploads|static)\//i.test(raw)) {
    return `${getMediaOrigin()}/${raw.replace(/^\/+/, '')}`;
  }

  if (
    low.startsWith('file:') ||
    low.startsWith('content:') ||
    low.startsWith('blob:') ||
    low.startsWith('ph://') ||
    low.startsWith('assets-library:')
  ) {
    return raw;
  }
  if (low.startsWith('data:')) return raw;

  if (raw.startsWith('//')) {
    return rewriteLoopbackMediaUrls(`https:${raw}`);
  }
  if (raw.startsWith('/')) {
    return `${getMediaOrigin()}${raw}`;
  }

  if (low.startsWith('http://')) {
    let x = raw;
    if (Platform.OS === 'web' && typeof window !== 'undefined' && window.location?.protocol === 'https:') {
      x = `https://${raw.slice(7)}`;
    }
    return rewriteLoopbackMediaUrls(rehostAppMediaPaths(x));
  }
  if (low.startsWith('https://')) {
    return rewriteLoopbackMediaUrls(rehostAppMediaPaths(raw));
  }

  return raw;
}
