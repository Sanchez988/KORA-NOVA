/**
 * Google Sign-In unificado (`expo-auth-session`). Tokens → backend `/auth/google`.
 * Redirect y checklist de consola: `config/googleOAuth.ts`.
 */

import React, { useEffect, useMemo, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Platform,
  ActivityIndicator,
} from 'react-native';
import Constants, { ExecutionEnvironment } from 'expo-constants';
import * as WebBrowser from 'expo-web-browser';
import * as AuthSession from 'expo-auth-session';
import { ResponseType } from 'expo-auth-session';
import * as Google from 'expo-auth-session/providers/google';

import {
  buildExpoGoGoogleOAuthProxyStartUrl,
  getGoogleUseAuthRedirectParams,
  GOOGLE_OAUTH_REDIRECT_PATH,
  logGoogleOAuthSetupInDev,
  shouldUseExpoGoAuthProxyStart,
} from '../config/googleOAuth';
import { colors, spacing, borderRadius } from '../theme/colors';
import { apiErrorDisplayMessage, exchangeGoogleOAuthCode } from '../services/api';

WebBrowser.maybeCompleteAuthSession();

const GOOGLE_OAUTH_SCOPES = ['openid', 'profile', 'email'];

const isExpoGoApp = () =>
  Constants.executionEnvironment === ExecutionEnvironment.StoreClient;

const isUnsetOrPlaceholderOAuthId = (id: string | undefined): boolean => {
  if (!id?.trim()) return true;
  if (!id.includes('.apps.googleusercontent.com')) return true;
  if (/XXXXXXXX|YYYYYYYY|PASTE|PENDIENTE|TBD/i.test(id)) return true;
  return false;
};

interface Props {
  onSuccess: (idToken: string) => void;
  onError?: (error: string) => void;
  loading?: boolean;
  clientId?: string;
  androidClientId?: string;
  iosClientId?: string;
}

export const GoogleSignInButton: React.FC<Props> = ({
  onSuccess,
  onError,
  loading = false,
  clientId,
  androidClientId,
  iosClientId,
}) => {
  /** Evita ejecutar `/auth/google` dos veces si `onSuccess` cambia de identidad entre renders con el mismo `response`. */
  const consumedOAuthUrlRef = useRef<string | null>(null);
  /** En Expo Go un mismo `authorization code` sólo debe canjearse una vez (intercambio manual). */
  const exchangedOAuthCodeRef = useRef<string | null>(null);

  const expoGo = isExpoGoApp();
  const nativeAndroidConfigured =
    !isUnsetOrPlaceholderOAuthId(androidClientId) && !expoGo;
  const nativeIosConfigured = !isUnsetOrPlaceholderOAuthId(iosClientId) && !expoGo;

  /** Si no hay cliente nativo válido por plataforma, el authorize usa el Client ID Web: el canje del `code` requiere `client_secret` en el backend. */
  const useNativeGoogleOAuthClient =
    Platform.OS === 'android'
      ? nativeAndroidConfigured
      : Platform.OS === 'ios'
        ? nativeIosConfigured
        : false;
  const needsBackendGoogleCodeExchange =
    Platform.OS !== 'web' && !useNativeGoogleOAuthClient;

  const { requestConfigAugment, redirectUriOptions } = useMemo(
    () => getGoogleUseAuthRedirectParams(),
    []
  );

  /**
   * Patrón habitual en tutoriales (SDK antiguo) — equivalencia hoy (`expo-auth-session` ≥ 7):
   *
   * ```ts
   * import * as AuthSession from 'expo-auth-session';
   * import * as Google from 'expo-auth-session/providers/google';
   *
   * const redirectUri = AuthSession.makeRedirectUri({ useProxy: true }); // ⚠️ `useProxy` fue eliminado
   *
   * const [request, response, promptAsync] = Google.useAuthRequest({
   *   expoClientId: 'TU_CLIENT_ID_WEB', // ⚠️ renombrado: mismo valor en `webClientId` + `clientId`
   *   redirectUri, // 👈 ESTO ES CLAVE
   * });
   * ```
   *
   * Aquí `redirectUri` debe coincidir **carácter a carácter** con una URI autorizada del cliente OAuth **Web**
   * (p. ej. `https://auth.expo.io/@valentina000098/kora-nova-1` en Expo Go si el proyecto está bajo esa cuenta/org;
   * en **development build** suele ser `com.kora.mobile:/oauthredirect` o `kora:/oauthredirect` — debe figurar igual en Google Cloud).
   */
  const redirectUri = useMemo(() => {
    const resolved =
      requestConfigAugment.redirectUri ??
      AuthSession.makeRedirectUri({
        path: GOOGLE_OAUTH_REDIRECT_PATH,
        ...redirectUriOptions,
      });
    console.log('REDIRECT URI:', resolved);
    return resolved;
  }, [requestConfigAugment.redirectUri, redirectUriOptions]);

  /** Mismo contenido que el snippet `useAuthRequest({ expoClientId, redirectUri })` — nombres de API actualizados. */
  const googleOAuthRequestConfig = useMemo(
    () => ({
      scopes: GOOGLE_OAUTH_SCOPES,
      selectAccount: true,
      /** ID cliente tipo «Aplicación web» (antes `expoClientId`). */
      webClientId: clientId,
      clientId,
      redirectUri, // 👈 ESTO ES CLAVE
      ...(Platform.OS === 'web' ? { responseType: ResponseType.IdToken } : {}),
      ...(Platform.OS === 'android' && nativeAndroidConfigured ? { androidClientId } : {}),
      ...(Platform.OS === 'ios' && nativeIosConfigured ? { iosClientId } : {}),
      ...(needsBackendGoogleCodeExchange ? { shouldAutoExchangeCode: false as const } : {}),
    }),
    [
      clientId,
      redirectUri,
      nativeAndroidConfigured,
      nativeIosConfigured,
      androidClientId,
      iosClientId,
      needsBackendGoogleCodeExchange,
    ]
  );

  /**
   * Código nativo / Expo Go: flujo authorization `code`; en **web**, `responseType: IdToken` evita token implícito sin JWT.
   */
  const [request, response, promptAsync] = Google.useAuthRequest(googleOAuthRequestConfig, {});

  useEffect(() => {
    logGoogleOAuthSetupInDev({ isExpoGo: expoGo });
  }, [expoGo]);

  /** Redirect real enviado a Google; debe existir carácter a carácter en el cliente Web de Google Cloud. */
  useEffect(() => {
    if (!__DEV__ || !request?.url) return;
    try {
      const authUrl = new URL(request.url);
      const enc = authUrl.searchParams.get('redirect_uri');
      const decoded = enc ? decodeURIComponent(enc) : '';
      console.warn(
        '[Google OAuth] Copia esta URI en Google Cloud → Cliente Web → URIs de redireccionamiento autorizadas:\n' +
          decoded +
          '\n(Si aparece vacío, abre esta URL completa del log y revisa redirect_uri)'
      );
    } catch {
      console.warn('[Google OAuth] URL de autorización:', request.url);
    }
  }, [request?.url]);

  /** Web: `id_token`. Nativo solo con Client Web: canje del `code` vía `/auth/google/oauth-code` (también en development build). */
  useEffect(() => {
    if (!response || response.type !== 'success') {
      return;
    }

    const idTokenDirect =
      response.authentication?.idToken ??
      (typeof response.params?.id_token === 'string' ? response.params.id_token : undefined);

    const code =
      typeof response.params?.code === 'string' && response.params.code
        ? response.params.code
        : undefined;

    if (needsBackendGoogleCodeExchange && code && !idTokenDirect) {
      if (exchangedOAuthCodeRef.current === code) {
        return;
      }

      const redirectUriExchange = redirectUri;
      const verifier = request?.codeVerifier;
      if (!redirectUriExchange?.trim()) {
        onError?.(
          expoGo
            ? 'OAuth: falta la URI de redirección (auth.expo.io). Define EXPO_PUBLIC_EXPO_OWNER o revisa Metro.'
            : 'OAuth: falta redirectUri. Metro debe mostrar `[Google OAuth] Copia esta URI…`; regístrala en Google Cloud y reinicia.'
        );
        return;
      }
      if (!verifier?.trim()) {
        onError?.('OAuth: PKCE sin code_verifier. Cierra la app por completo e intenta de nuevo.');
        return;
      }

      exchangedOAuthCodeRef.current = code;
      let cancelled = false;
      void exchangeGoogleOAuthCode({
        code,
        redirectUri: redirectUriExchange,
        codeVerifier: verifier,
      })
        .then((idTok) => {
          if (cancelled) return;
          consumedOAuthUrlRef.current =
            'url' in response && response.url ? response.url : 'backend-oauth-exchange';
          onSuccess(idTok);
        })
        .catch((e: unknown) => {
          if (cancelled) return;
          exchangedOAuthCodeRef.current = null;
          if (__DEV__) {
            console.error('[Google OAuth] Canje código vía backend:', e);
          }
          onError?.(`No se completó la sesión con Google: ${apiErrorDisplayMessage(e)}`);
        });

      return () => {
        cancelled = true;
      };
    }

    if (!expoGo && 'url' in response && response.url && consumedOAuthUrlRef.current === response.url) {
      return;
    }

    if (idTokenDirect) {
      if (!expoGo && 'url' in response && response.url) {
        consumedOAuthUrlRef.current = response.url;
      } else if (expoGo) {
        consumedOAuthUrlRef.current =
          'url' in response && response.url ? response.url : 'expo-go-id-token';
      }
      onSuccess(idTokenDirect);
      return;
    }

    if (!expoGo && !needsBackendGoogleCodeExchange) {
      onError?.(
        response.authentication?.accessToken || response.params?.access_token
          ? 'Google no envió credenciales de sesión válidas (id_token). Revisa la cuenta y vuelve a intentar.'
          : 'No se recibieron tokens de Google. Revisa tu conexión o la configuración de OAuth.'
      );
    }
    if (!expoGo && needsBackendGoogleCodeExchange && !code && !idTokenDirect) {
      onError?.(
        'No se recibió el código de autorización de Google. Revisa la URI de redirección en Google Cloud (development build).'
      );
    }
  }, [
    clientId,
    expoGo,
    needsBackendGoogleCodeExchange,
    onError,
    onSuccess,
    redirectUri,
    request?.codeVerifier,
    request?.url,
    response,
  ]);

  useEffect(() => {
    if (response?.type === 'error') {
      onError?.(response.error?.message ?? 'Error en Google Sign-In');
    }
  }, [response, onError]);

  const nativeReady = request !== null && !!clientId?.trim();

  const runPrompt = async () => {
    try {
      const googleAuthUrl = request?.url;
      if (!googleAuthUrl?.trim()) {
        onError?.('La solicitud OAuth aún no está lista. Espera un momento e inténtalo de nuevo.');
        return;
      }

      /**
       * `AuthRequest.promptAsync` usa `WebBrowser.openAuthSessionAsync(authUrl, redirectUri)` donde
       * `redirectUri` es el HTTPS de auth.expo.io (no `exp://`). Abrir la sesión con `exp://` como
       * segundo argumento (como hacía el bloque solo-Android) rompía el cierre al volver de Google.
       */
      const proxyStartUrl =
        expoGo && Platform.OS !== 'web' ? buildExpoGoGoogleOAuthProxyStartUrl(googleAuthUrl) : undefined;

      const wantProxy = shouldUseExpoGoAuthProxyStart();
      const useProxyStart = Boolean(expoGo && Platform.OS !== 'web' && wantProxy && proxyStartUrl);

      if (expoGo && Platform.OS !== 'web' && wantProxy && !proxyStartUrl) {
        onError?.(
          'No se pudo armar la URL del proxy Expo (owner/slug). Revisa app.json o EXPO_PUBLIC_EXPO_OWNER / EXPO_PUBLIC_GOOGLE_EXPO_PROXY_REDIRECT.'
        );
        return;
      }

      if (expoGo && __DEV__ && Platform.OS !== 'web') {
        console.warn(
          useProxyStart
            ? '[Google OAuth] Expo Go: proxy /start (auth.expo.io) — flujo estable.'
            : '[Google OAuth] Expo Go: Google directo (EXPO_PUBLIC_EXPO_GOOGLE_USE_PROXY_START=false). Si ves «Something went wrong» en auth.expo.io, borra esa variable o pon true.'
        );
      }

      if (Platform.OS === 'android') {
        try {
          await WebBrowser.warmUpAsync();
        } catch {
          /* opcional en algunos entornos */
        }
      }

      try {
        const out = await promptAsync({
          ...(useProxyStart && proxyStartUrl ? { url: proxyStartUrl } : {}),
          preferEphemeralSession: expoGo ? false : Platform.OS === 'ios',
          ...(Platform.OS === 'android'
            ? { showInRecents: expoGo, createTask: expoGo }
            : {}),
        });
        if (out.type === 'error') {
          const msg =
            typeof out.params?.error_description === 'string'
              ? out.params.error_description
              : typeof out.params?.error === 'string'
                ? out.params.error
                : (out.error as { message?: string } | null)?.message;
          onError?.(msg || 'Google devolvió un error durante el login');
        } else if (out.type === 'cancel' || out.type === 'dismiss') {
          onError?.(
            expoGo && Platform.OS !== 'web'
              ? 'Sesión cerrada antes de terminar. En la primera pantalla de auth.expo.io pulsa «Yes» / «Sí» para llegar a Google; luego inicia sesión con tu cuenta @pascualbravo.edu.co. Si pulsaste «No» o cerraste el navegador, inténtalo de nuevo.'
              : 'No se completó el login en el navegador. Si auth.expo.io mostró un error, revisa la URI de redirección en Google Cloud y owner/slug del proyecto.'
          );
        } else if (out.type === 'locked') {
          onError?.('Ya hay otra ventana de inicio de sesión abierta. Ciérrala e inténtalo de nuevo.');
        } else if (out.type === 'success' && __DEV__) {
          const url =
            typeof (out as { url?: unknown }).url === 'string' ? (out as { url: string }).url : '';
          if (url.includes('error=')) {
            console.warn('[Google OAuth] URL de retorno con error=?', url);
          }
        }
        if (__DEV__ && Platform.OS !== 'web' && expoGo) {
          console.warn(
            '[Google] Cliente tipo Web → redirect https://auth.expo.io/@… en Google Cloud (no uses exp:// allí).'
          );
        }
      } finally {
        if (Platform.OS === 'android') {
          try {
            await WebBrowser.coolDownAsync();
          } catch {
            /* noop */
          }
        }
      }
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : String(e);
      onError?.(
        message.includes('scheme')
          ? 'Configura schemes en OAuth y enlaces autorizados (ver README / config).'
          : message
      );
    }
  };

  if (!clientId?.trim()) {
    return (
      <View style={styles.configWarning}>
        <Text style={styles.configWarningText}>
          Configura GOOGLE_CLIENT_ID en src/config/index.ts
        </Text>
      </View>
    );
  }

  return (
    <View style={{ width: '100%' }}>
      <TouchableOpacity
        style={[
          styles.nativeButton,
          (loading || !nativeReady) && styles.nativeButtonDisabled,
        ]}
        onPress={() => void runPrompt()}
        disabled={loading}
        activeOpacity={0.8}
      >
        {loading ? (
          <ActivityIndicator size="small" color={colors.text.secondary} />
        ) : (
          <>
            <View style={styles.googleIcon}>
              <Text style={styles.googleIconText}>G</Text>
            </View>
            <Text style={styles.nativeButtonText}>Continuar con Google</Text>
          </>
        )}
      </TouchableOpacity>

      {!expoGo &&
        ((Platform.OS === 'android' && isUnsetOrPlaceholderOAuthId(androidClientId)) ||
          (Platform.OS === 'ios' && isUnsetOrPlaceholderOAuthId(iosClientId))) && (
          <Text style={styles.warningText}>
            Para build nativa necesitas{' '}
            {Platform.OS === 'ios' ? 'GOOGLE_IOS_CLIENT_ID' : 'GOOGLE_ANDROID_CLIENT_ID'} real más
            GOOGLE_CLIENT_ID.
          </Text>
      )}
      {expoGo && Platform.OS !== 'web' && (
        <Text style={styles.expoGoHint}>
          En Expo Go, Expo muestra primero una pantalla de seguridad en el navegador: pulsa «Yes» / «Sí» para
          continuar a Google. No se puede omitir en Expo Go (sí en una build de desarrollo con scheme propio).
        </Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  configWarning: {
    backgroundColor: '#FFF3CD',
    borderRadius: borderRadius.md,
    padding: spacing.sm,
    marginVertical: spacing.sm,
  },
  configWarningText: {
    fontSize: 12,
    color: '#856404',
    textAlign: 'center',
  },
  nativeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: borderRadius.md,
    borderWidth: 1.5,
    borderColor: '#DADCE0',
    paddingVertical: 12,
    paddingHorizontal: spacing.md,
    gap: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  nativeButtonDisabled: {
    opacity: 0.6,
  },
  googleIcon: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#4285F4',
    alignItems: 'center',
    justifyContent: 'center',
  },
  googleIconText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
    lineHeight: 18,
  },
  nativeButtonText: {
    fontSize: 15,
    color: '#3C4043',
    fontWeight: '600',
  },
  expoGoHint: {
    marginTop: spacing.sm,
    fontSize: 11,
    color: colors.text.tertiary,
    textAlign: 'center',
    lineHeight: 15,
    paddingHorizontal: spacing.xs,
  },
  warningText: {
    fontSize: 11,
    color: '#856404',
    textAlign: 'center',
    marginTop: 6,
    backgroundColor: '#FFF3CD',
    borderRadius: 6,
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
});

export default GoogleSignInButton;
