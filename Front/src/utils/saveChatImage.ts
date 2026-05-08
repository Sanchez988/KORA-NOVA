import * as FileSystem from 'expo-file-system/legacy';
import * as MediaLibrary from 'expo-media-library';

/**
 * Guarda una imagen del chat (URI local file:// o remota https) en la galería del dispositivo.
 * Llama después de obtener permiso con ensureMediaLibrarySaveAccess().
 */
export async function saveChatImageToGallery(uri: string): Promise<void> {
  let localUri = uri;
  if (/^https?:\/\//i.test(uri)) {
    const m = /\.(jpe?g|png|webp)(?:\?|$)/i.exec(uri);
    const ext = m ? m[1].replace(/jpeg/i, 'jpg').toLowerCase() : 'jpg';
    const base = FileSystem.cacheDirectory ?? FileSystem.documentDirectory;
    if (!base) {
      throw new Error('Sin directorio temporal para descargar la imagen');
    }
    const dest = `${base}kora_chat_${Date.now()}.${ext}`;
    const { uri: downloaded } = await FileSystem.downloadAsync(uri, dest);
    localUri = downloaded;
  }
  await MediaLibrary.saveToLibraryAsync(localUri);
}
