import { resolveApiUrl } from '../config';

/** Origen del backend sin `/api` (mismo host que sirve `/health`). */
export function resolveBackendOrigin(): string {
  return resolveApiUrl().replace(/\/api\/?$/, '');
}

/**
 * Despierta el servicio en hosts con cold start (p. ej. Render free) antes de llamar a `/api/...`.
 * @returns true si respondió 2xx
 */
export async function wakeBackendHealth(timeoutMs = 90000): Promise<boolean> {
  const url = `${resolveBackendOrigin()}/health`;
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(url, { method: 'GET', signal: ctrl.signal });
    return res.ok;
  } catch {
    return false;
  } finally {
    clearTimeout(t);
  }
}
