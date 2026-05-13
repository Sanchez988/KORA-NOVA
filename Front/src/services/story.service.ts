import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import api from './api';
import { resolveApiUrl } from '../config';
import { resolveRenderableMediaUri } from '../utils/mediaUri';

export interface StoryItem {
  id: string;
  imageUrl: string;
  caption: string | null;
  viewCount: number;
  expiresAt: string;
  createdAt: string;
  /** Solo en respuesta de matches: si el usuario actual ya abrió esta historia */
  viewed?: boolean;
}

export interface MatchStoryGroup {
  user: {
    id: string;
    email?: string;
    profile?: { name?: string; photos?: unknown };
  };
  stories: StoryItem[];
}

function normalizeStory(s: StoryItem): StoryItem {
  return {
    ...s,
    imageUrl: resolveRenderableMediaUri(s.imageUrl),
  };
}

export async function getMyStories(): Promise<StoryItem[]> {
  const { data } = await api.get<StoryItem[]>('/stories/me');
  const list = Array.isArray(data) ? data : [];
  return list.map(normalizeStory);
}

export async function getMatchesStories(): Promise<MatchStoryGroup[]> {
  const { data } = await api.get<MatchStoryGroup[]>('/stories/matches');
  const list = Array.isArray(data) ? data : [];
  return list.map((g) => ({
    ...g,
    stories: (g.stories || []).map(normalizeStory),
  }));
}

export async function viewStory(storyId: string): Promise<StoryItem | void> {
  const { data } = await api.post<StoryItem>(`/stories/${encodeURIComponent(storyId)}/view`);
  return data;
}

export async function deleteStory(storyId: string): Promise<void> {
  await api.delete(`/stories/${encodeURIComponent(storyId)}`);
}

/**
 * POST /stories — multipart (campo `image` + opcional `caption`), igual que subida de perfil.
 */
export async function createStory(localUri: string, caption: string): Promise<{ story: unknown }> {
  const base = resolveApiUrl().replace(/\/+$/, '');
  const endpoint = `${base}/stories`;
  const token = await AsyncStorage.getItem('token');
  const headers: HeadersInit = {};
  if (token) headers.Authorization = `Bearer ${token}`;

  const formData = new FormData();
  const baseName = localUri.split('/').pop()?.split('?')[0] || 'story.jpg';
  const filename = /\.[a-zA-Z0-9]{2,8}$/.test(baseName) ? baseName : `${baseName}.jpg`;

  if (Platform.OS === 'web') {
    const blobRes = await fetch(localUri);
    if (!blobRes.ok) throw new Error('No se pudo leer la imagen seleccionada.');
    const blob = await blobRes.blob();
    formData.append('image', blob, filename);
  } else {
    formData.append('image', {
      uri: localUri,
      name: filename,
      type: 'image/jpeg',
    } as any);
  }

  const cap = caption.trim();
  if (cap) formData.append('caption', cap);

  const controller = new AbortController();
  const timeoutMs = 120000;
  const tid = setTimeout(() => controller.abort(), timeoutMs);

  let res: Response;
  try {
    res = await fetch(endpoint, { method: 'POST', headers, body: formData, signal: controller.signal });
  } catch (err: unknown) {
    const name = err && typeof err === 'object' && 'name' in err ? String((err as { name?: string }).name) : '';
    if (name === 'AbortError') {
      throw new Error(
        `Tiempo de espera agotado (${Math.round(timeoutMs / 1000)} s). Revisa la conexión o si el servidor estaba frío (p. ej. Render).`
      );
    }
    throw err;
  } finally {
    clearTimeout(tid);
  }

  const rawText = await res.text();
  let body: { message?: string; story?: unknown; error?: string } = {};
  if (rawText) {
    try {
      body = JSON.parse(rawText) as typeof body;
    } catch {
      body = {};
    }
  }
  if (!res.ok) {
    throw new Error(body.message || body.error || `Error al publicar (${res.status})`);
  }
  return { story: body.story };
}
