/**
 * Solicitud coherente de permisos (cámara, galería, micrófono, ubicación)
 * con opción de abrir Ajustes si ya no se puede volver a preguntar.
 */

import { Platform, Alert, Linking } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import * as MediaLibrary from 'expo-media-library';

function openSettingsHint(title: string, message: string) {
  Alert.alert(title, message, [
    { text: 'Cancelar', style: 'cancel' },
    {
      text: 'Abrir Ajustes',
      onPress: () => {
        Linking.openSettings().catch(() => {});
      },
    },
  ]);
}

/** Cámara: comprueba antes y pide permiso; si está bloqueado, ofrece Ajustes. */
export async function ensureCameraAccess(): Promise<boolean> {
  if (Platform.OS === 'web') return true;

  const current = await ImagePicker.getCameraPermissionsAsync();
  if (current.status === 'granted') return true;

  if (!current.canAskAgain && current.status === 'denied') {
    openSettingsHint(
      'Cámara desactivada',
      'Ve a los ajustes de la app para permitir que Kora use la cámara.'
    );
    return false;
  }

  const { status, canAskAgain } = await ImagePicker.requestCameraPermissionsAsync();

  if (status === 'granted') return true;

  if (!canAskAgain || status === 'denied') {
    openSettingsHint(
      'Sin acceso a la cámara',
      'Necesitamos este permiso para tomar fotos. Puedes activarlo en Ajustes.'
    );
  } else {
    Alert.alert(
      'Permiso de cámara',
      'Sin acceso a la cámara no puedes hacer fotos en la aplicación.'
    );
  }
  return false;
}

/** Fotos / galería (lectura librería de medios). */
export async function ensureMediaLibraryAccess(): Promise<boolean> {
  if (Platform.OS === 'web') return true;

  const current = await ImagePicker.getMediaLibraryPermissionsAsync();
  if (current.status === 'granted') return true;

  if (!current.canAskAgain && current.status === 'denied') {
    openSettingsHint(
      'Galería desactivada',
      'En los ajustes del dispositivo puedes permitir el acceso a Fotos.'
    );
    return false;
  }

  const { status, canAskAgain } = await ImagePicker.requestMediaLibraryPermissionsAsync();

  if (status === 'granted') return true;

  if (!canAskAgain || status === 'denied') {
    openSettingsHint(
      'Sin acceso a la galería',
      'Necesitamos ver tus fotos para que puedas elegir imágenes. Actívalo en Ajustes.'
    );
  } else {
    Alert.alert(
      'Permiso de galería',
      'Sin este permiso no podrás escoger imágenes de tu galería.'
    );
  }
  return false;
}

/**
 * Permiso para guardar fotos/vídeos en la galería (añadir a la librería).
 * Usa modo write-only en iOS cuando aplica para minimizar alcance.
 */
export async function ensureMediaLibrarySaveAccess(): Promise<boolean> {
  if (Platform.OS === 'web') {
    Alert.alert(
      'No disponible en web',
      'Guardar en la galería sólo está disponible en la app instalada.'
    );
    return false;
  }

  try {
    const current = await MediaLibrary.getPermissionsAsync(true);
    if (current.granted) return true;

    if (!current.canAskAgain && current.status === 'denied') {
      openSettingsHint(
        'Galería desactivada',
        'Activa «Añadir fotos sólo» o acceso a Fotos para guardar imágenes del chat en Ajustes.'
      );
      return false;
    }

    const { status, canAskAgain } = await MediaLibrary.requestPermissionsAsync(true);

    if (status === 'granted') return true;

    if (!canAskAgain || status === 'denied') {
      openSettingsHint(
        'Sin permiso para guardar',
        'Kora necesita permiso para añadir la imagen a tu galería. Puedes activarlo en Ajustes.'
      );
    } else {
      Alert.alert(
        'Permiso necesario',
        'Sin este permiso no puedes guardar fotos del chat en la galería.'
      );
    }
    return false;
  } catch {
    Alert.alert('Error', 'No se pudo comprobar el permiso para guardar en la galería.');
    return false;
  }
}

/** Micrófono (notas de voz). expo-av se carga sólo fuera de web. */
export async function ensureMicrophoneAccess(): Promise<boolean> {
  if (Platform.OS === 'web') {
    Alert.alert(
      'No disponible en web',
      'Las notas de voz están disponibles en la aplicación instalada.'
    );
    return false;
  }

  let AudioMod: typeof import('expo-av').Audio | null = null;
  try {
    AudioMod = require('expo-av').Audio;
  } catch {
    return false;
  }
  if (!AudioMod) return false;

  try {
    const cur = await AudioMod.getPermissionsAsync();
    if (cur.granted) return true;

    if (!cur.canAskAgain) {
      openSettingsHint(
        'Micrófono desactivado',
        'Activa el micrófono para Kora en los ajustes del dispositivo.'
      );
      return false;
    }

    const res = await AudioMod.requestPermissionsAsync();
    if (res.granted) return true;

    if (!res.canAskAgain) {
      openSettingsHint(
        'Sin acceso al micrófono',
        'Necesitamos grabar tu voz. Puedes permitir el micrófono en Ajustes.'
      );
    } else {
      Alert.alert(
        'Permiso de micrófono',
        'Sin este permiso no puedes grabar notas de voz.'
      );
    }
    return false;
  } catch {
    Alert.alert('Error', 'No se pudo solicitar permiso para el micrófono.');
    return false;
  }
}

export type LocationAccessOptions = {
  /** Si el usuario rechaza tras el sistema, no mostrar nuestro diálogo (p. ej. carga inicial). */
  suppressDenyFollowUp?: boolean;
};

export type WebGeolocationCoords = {
  latitude: number;
  longitude: number;
  accuracy?: number;
};

/**
 * Web/PWA: coordenadas vía `navigator.geolocation` (requiere HTTPS o localhost).
 * En el primer uso el navegador muestra su propio diálogo de permiso.
 */
export async function getWebGeolocationCoords(
  suppressDenyFollowUp?: boolean
): Promise<WebGeolocationCoords | null> {
  if (typeof navigator === 'undefined' || !navigator.geolocation) {
    if (!suppressDenyFollowUp) {
      Alert.alert(
        'Ubicación',
        'Este entorno no ofrece geolocalización. Probá en Chrome o Edge, o usá la app en el móvil.'
      );
    }
    return null;
  }

  return new Promise((resolve) => {
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        resolve({
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
          accuracy: pos.coords.accuracy ?? undefined,
        });
      },
      () => {
        if (!suppressDenyFollowUp) {
          Alert.alert(
            'Ubicación',
            'No pudimos acceder a tu ubicación. Si el navegador preguntó, elegí «Permitir». Revisá también el candado en la barra de direcciones (hace falta HTTPS o localhost).'
          );
        }
        resolve(null);
      },
      { enableHighAccuracy: false, timeout: 20000, maximumAge: 120000 }
    );
  });
}

/** Ubicación en primer plano (descubrimiento, ajustes). */
export async function ensureForegroundLocationAccess(
  options?: LocationAccessOptions
): Promise<boolean> {
  if (Platform.OS === 'web') {
    const suppress = Boolean(options?.suppressDenyFollowUp);
    const coords = await getWebGeolocationCoords(suppress);
    return coords !== null;
  }

  const suppress = Boolean(options?.suppressDenyFollowUp);

  try {
    const current = await Location.getForegroundPermissionsAsync();
    if (current.status === 'granted') return true;

    if (!current.canAskAgain && current.status === 'denied') {
      if (!suppress) {
        openSettingsHint(
          'Ubicación desactivada',
          'Ve a los ajustes de la app y permite ubicación cuando la uses.'
        );
      }
      return false;
    }

    const { status, canAskAgain } = await Location.requestForegroundPermissionsAsync();

    if (status === 'granted') return true;

    if ((!canAskAgain || status === 'denied') && !suppress) {
      openSettingsHint(
        'Sin acceso a la ubicación',
        'Tu ubicación se usa sólo dentro de lo que configures en perfil para mostrarte gente cercana.'
      );
    }
    return false;
  } catch {
    if (!suppress) {
      Alert.alert('Ubicación', 'No se pudo solicitar el permiso de ubicación.');
    }
    return false;
  }
}
