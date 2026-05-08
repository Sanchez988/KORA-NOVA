import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { resolveApiUrl } from '../config';
import { resolveRenderableMediaUri } from '../utils/mediaUri';

/** URLs remotas o data: — no hace falta volver a subirlas. */
export function isRemoteImageUrl(uri: string): boolean {
  const u = (uri || '').trim();
  if (!u) return false;
  if (u.startsWith('data:')) return true;
  if (u.startsWith('http://') || u.startsWith('https://')) return true;
  if (u.startsWith('//')) return true;
  return false;
}

/** `/uploads/...` u otras rutas absolutas del API: ya están en servidor. */
function isServerRelativeImagePath(uri: string): boolean {
  const u = (uri || '').trim();
  return u.startsWith('/');
}

function uploadImageAbsoluteUrl(): string {
  const base = resolveApiUrl().replace(/\/+$/, '');
  /** Base debe terminar en /api → …/api/upload/image */
  return `${base}/upload/image`;
}

function normalizeRemoteImageUri(uri: string): string {
  return resolveRenderableMediaUri((uri || '').trim());
}

/** URL absoluta para mostrar o reproducir adjuntos del chat (`/uploads/…`, `http…`, `file://`). */
export function resolveChatAttachmentUrl(uri: string): string {
  return normalizeRemoteImageUri((uri || '').trim());
}

function inferMimeFromFilename(filename: string, fallback: string): string {
  const ext = /\.(\w+)$/.exec(filename)?.[1]?.toLowerCase() ?? '';
  if (!ext) return fallback;
  if (ext === 'png') return 'image/png';
  if (ext === 'webp') return 'image/webp';
  if (ext === 'gif') return 'image/gif';
  if (ext === 'jpg' || ext === 'jpeg') return 'image/jpeg';
  if (ext === 'm4a') return 'audio/m4a';
  if (ext === 'mp3') return 'audio/mpeg';
  if (ext === 'wav') return 'audio/wav';
  if (ext === 'aac') return 'audio/aac';
  if (ext === 'ogg') return 'audio/ogg';
  if (ext === 'pdf') return 'application/pdf';
  return fallback;
}

async function uploadLocalAsset(
  localUri: string,
  opts?: { filename?: string; mimeType?: string }
): Promise<string> {
  const formData = new FormData();
  const baseName = localUri.split('/').pop()?.split('?')[0] || 'asset.bin';
  const filename = opts?.filename?.trim() || baseName;
  const mime = opts?.mimeType || inferMimeFromFilename(filename, 'application/octet-stream');

  if (Platform.OS === 'web') {
    const blobRes = await fetch(localUri);
    if (!blobRes.ok) {
      throw new Error('No se pudo leer el archivo seleccionado (navegador).');
    }
    const blob = await blobRes.blob();
    formData.append('image', blob, filename);
  } else {
    formData.append('image', {
      uri: localUri,
      name: filename,
      type: mime,
    } as any);
  }

  const token = await AsyncStorage.getItem('token');
  const headers: HeadersInit = {};
  if (token) headers.Authorization = `Bearer ${token}`;

  const endpoint = uploadImageAbsoluteUrl();
  const res = await fetch(endpoint, {
    method: 'POST',
    headers,
    body: formData,
  });
  const body = (await res.json().catch(() => ({}))) as { imageUrl?: string; message?: string; error?: string };
  if (!res.ok) {
    throw new Error(body.message || body.error || `Error al subir (${res.status})`);
  }
  if (!body.imageUrl) {
    throw new Error('El servidor no devolvió URL de archivo.');
  }
  return body.imageUrl;
}

/**
 * Sube la imagen con `fetch` (no axios): el cliente API fuerza `Content-Type: application/json`
 * y eso rompe multipart en muchas plataformas.
 */
export async function uploadProfileImage(localUri: string): Promise<string> {
  const baseName = localUri.split('/').pop()?.split('?')[0] || 'image.jpg';
  const filename = /\.[a-zA-Z0-9]{2,8}$/.test(baseName) ? baseName : `${baseName}.jpg`;
  try {
    return await uploadLocalAsset(localUri, { filename, mimeType: 'image/jpeg' });
  } catch (e: unknown) {
    const endpoint = uploadImageAbsoluteUrl();
    const raw = e instanceof Error ? e.message : String(e);
    if (/failed to fetch|networkerror|load failed/i.test(raw)) {
      throw new Error(
        `Sin conexión con la API al subir fotos (${endpoint}). Comprueba que el backend está en marcha (carpeta Back: npm run dev, puerto 5000).`
      );
    }
    throw e;
  }
}

export async function uploadChatAsset(
  localUri: string,
  opts?: { filename?: string; mimeType?: string }
): Promise<string> {
  return uploadLocalAsset(localUri, opts);
}

/** Convierte URIs locales (file:, blob:, content:, etc.) a URLs HTTPS del CDN. */
export async function ensureRemotePhotoUrls(uris: string[]): Promise<string[]> {
  const out: string[] = [];
  for (const uri of uris) {
    const u = uri?.trim();
    if (!u) continue;
    if (isRemoteImageUrl(u) || isServerRelativeImagePath(u)) {
      out.push(normalizeRemoteImageUri(u));
    } else {
      out.push(await uploadProfileImage(u));
    }
  }
  return out;
}
