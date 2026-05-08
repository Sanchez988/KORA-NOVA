import { Platform } from 'react-native';
import { isRunningInExpoGo } from 'expo';

/**
 * En Expo Go (Android) el paquete registra listeners al importarse y dispara
 * un error de consola (push remoto no soportado desde SDK 53).
 * Cargamos el módulo solo fuera de Expo Go o en web vía APIs nativas del navegador.
 */
export function shouldLoadExpoNotifications(): boolean {
  if (Platform.OS === 'web') return false;
  return !isRunningInExpoGo();
}

export type ExpoNotificationsModule = typeof import('expo-notifications');

let cached: ExpoNotificationsModule | null | undefined;

export async function loadExpoNotifications(): Promise<ExpoNotificationsModule | null> {
  if (!shouldLoadExpoNotifications()) return null;
  if (cached !== undefined) return cached;
  try {
    cached = await import('expo-notifications');
    return cached;
  } catch {
    cached = null;
    return null;
  }
}
