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
    return rewriteLoopbackMediaUrls(x);
  }
  if (low.startsWith('https://')) {
    return rewriteLoopbackMediaUrls(raw);
  }

  return raw;
}
