import Constants, { ExecutionEnvironment } from 'expo-constants';

/**
 * Ocultar el flujo “Continuar con Google” en Expo Go y priorizar correo/clave para pruebas.
 * Producción / development build: deja esta variable fuera o en `false`.
 *
 * @see LoginScreen.tsx / RegisterScreen.tsx (bloques condicionados con `isExpoGoEmailOnlyLogin()`).
 */
export function isExpoGoEmailOnlyLogin(): boolean {
  if (Constants.executionEnvironment !== ExecutionEnvironment.StoreClient) return false;
  const raw =
    typeof process !== 'undefined' && process.env?.EXPO_PUBLIC_EXPO_GO_EMAIL_ONLY !== undefined
      ? String(process.env.EXPO_PUBLIC_EXPO_GO_EMAIL_ONLY).trim().toLowerCase()
      : '';
  return raw === 'true' || raw === '1' || raw === 'yes';
}
