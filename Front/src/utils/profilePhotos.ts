import { resolveRenderableMediaUri } from './mediaUri';

/** URIs locales guardadas mal en BD → no cargan después (sobre todo `blob:` en web). */
export function isStaleLocalProfilePhotoUri(uri: string): boolean {
  const low = (uri || '').trim().toLowerCase();
  if (!low) return true;
  if (low.startsWith('blob:') || low.startsWith('file:')) return true;
  if (low.startsWith('ph://')) return true;
  return false;
}

/** Intereses/hobbies como array o string JSON en Prisma. */
export function coerceProfileStringList(raw: unknown): string[] {
  if (raw == null) return [];
  if (Array.isArray(raw)) {
    return raw
      .filter((x): x is string => typeof x === 'string' && x.trim().length > 0)
      .map((s) => s.trim());
  }
  if (typeof raw === 'string') {
    const t = raw.trim();
    if (!t) return [];
    try {
      return coerceProfileStringList(JSON.parse(t));
    } catch {
      return [t];
    }
  }
  return [];
}

/** Array de URLs tal como los devuelve la API (o JSON string legacy). */
export function coerceProfilePhotosArray(photosUnknown: unknown): string[] {
  if (!photosUnknown) return [];
  if (Array.isArray(photosUnknown)) {
    return photosUnknown.filter((x): x is string => typeof x === 'string' && x.length > 0);
  }
  if (typeof photosUnknown === 'string') {
    try {
      return coerceProfilePhotosArray(JSON.parse(photosUnknown));
    } catch {
      return photosUnknown.trim() ? [photosUnknown] : [];
    }
  }
  return [];
}

/** Rutas relativas, localhost del servidor o CDN → URL lista para `<Image>` / expo-image. */
export function resolveProfileMediaUri(uri: string): string {
  return resolveRenderableMediaUri((uri || '').trim());
}

/**
 * Fotos del perfil **desde servidor** listas para mostrar: descarta blob/file rotas y resuelve rutas relativas.
 */
export function filterDisplayableProfilePhotoUris(uris: string[]): string[] {
  const out: string[] = [];
  for (const raw of uris) {
    if (typeof raw !== 'string' || !raw.trim()) continue;
    const t = raw.trim();
    if (isStaleLocalProfilePhotoUri(t)) continue;
    out.push(resolveProfileMediaUri(t));
  }
  return out;
}

/**
 * Miniatura en formularios: en la misma sesión puede haber `blob:` locales que sí deben verse.
 */
export function profilePhotoThumbUri(uri: string): string {
  if (!uri.trim()) return uri;
  const u = uri.trim();
  const low = u.toLowerCase();
  /** URIs locales / del sistema de archivos que no deben pasar por el origen API */
  if (
    low.startsWith('blob:') ||
    low.startsWith('file:') ||
    low.startsWith('content:') ||
    low.startsWith('ph://') ||
    low.startsWith('assets-library:')
  ) {
    return u;
  }
  return resolveProfileMediaUri(u);
}

/** Primera foto utilizable cuando viene como JSON string o array. */
export function firstProfilePhoto(photosUnknown: unknown): string | undefined {
  return filterDisplayableProfilePhotoUris(coerceProfilePhotosArray(photosUnknown))[0];
}

/** Galería lista para `<Image source={{ uri }}>` en discovery / listas (rutas `/uploads/…` resueltas). */
export function displayPhotosForImage(photosUnknown: unknown): string[] {
  return filterDisplayableProfilePhotoUris(coerceProfilePhotosArray(photosUnknown));
}
