/**
 * Google OAuth – Expo Go + Web (`redirect_uri_mismatch` / Error 400 `invalid_request`)
 *
 * La URI que envía la app debe coincidir **carácter a carácter** con una entrada en
 * Google Cloud → Credenciales → cliente **Aplicación web** (el mismo Client ID que `GOOGLE_CLIENT_ID`) → **URIs de redirección autorizadas**.
 *
 * **Google Cloud ya NO acepta** `redirect_uri` con esquema `exp://…` ni IP arbitraria como redirect de un **cliente Web**.
 * En **Expo Go** el `redirect_uri` que Google debe ver es estable:
 * `https://auth.expo.io/@TU_CUENTA_EXPO/kora-nova-1` → regístrala en el cliente OAuth Web.
 * Valores del proyecto en `app.json`: **owner** = cuenta u org en Expo (**slug**, p. ej. `valentina000098`), **slug** = `kora-nova-1`
 * → `https://auth.expo.io/@valentina000098/kora-nova-1` (si cambias owner/slug, actualiza Google Cloud).
 * La app usa por defecto la URL `/start` del proxy (cookies + deeplink). Si intentas saltártela,
 * Google puede redirigir bien pero auth.expo.io falla con «Something went wrong…».
 * Alternativa fiable en producción: **development build** con scheme propio (`kora://`).
 *
 * Pantalla Google “no cumple con la política OAuth 2.0” + Error 400: suele combinarse con:
 * consentimiento OAuth en **Prueba** sin tu correo en “Usuarios de prueba”, branding/App domain incompleto, o redirect no autorizada.
 *
 * En desarrollo revisa Metro: bloque `── Kora · Google OAuth ──`.
 *
 * **Web** (`expo start --web`): por defecto se usa `/oauthredirect` sobre el mismo origen
 * (`http://localhost:8081/oauthredirect`). Si ya tenías otra cadena registrada en Google,
 * pon `EXPO_PUBLIC_GOOGLE_WEB_REDIRECT_URI` en `.env` en `Front/` con esa cadena exacta y reinicia Metro.
 *
 * **Expo Go / iOS‑Android**: si la lista sugerida no coincide con la que ves en consola tras pulsar Google,
 * fija manualmente EXPO_PUBLIC_GOOGLE_NATIVE_REDIRECT_URI (valor **idéntico** al `redirect_uri` real y en Cloud Console).
 */

import * as Application from 'expo-application';
import * as AuthSession from 'expo-auth-session';
import Constants, { ExecutionEnvironment } from 'expo-constants';
import { Platform } from 'react-native';

export const GOOGLE_OAUTH_REDIRECT_PATH = 'oauthredirect' as const;

/** Igual que `expo-auth-session/providers/Google.js` (`redirectUri` base `native`). */
function googleNativeRedirectDummy(): string {
  return `${Application.applicationId ?? 'host.exp.exponent'}:/oauthredirect`;
}

function readGoogleWebRedirectOverride(): string | undefined {
  if (Platform.OS !== 'web') return undefined;
  const v =
    typeof process !== 'undefined' && process.env?.EXPO_PUBLIC_GOOGLE_WEB_REDIRECT_URI
      ? String(process.env.EXPO_PUBLIC_GOOGLE_WEB_REDIRECT_URI).trim()
      : '';
  return v || undefined;
}

function readGoogleNativeRedirectOverride(): string | undefined {
  if (Platform.OS === 'web') return undefined;
  const v =
    typeof process !== 'undefined' && process.env?.EXPO_PUBLIC_GOOGLE_NATIVE_REDIRECT_URI
      ? String(process.env.EXPO_PUBLIC_GOOGLE_NATIVE_REDIRECT_URI).trim()
      : '';
  if (!v) return undefined;
  if (
    Constants.executionEnvironment === ExecutionEnvironment.StoreClient &&
    /^exp:\/\//i.test(v)
  ) {
    if (__DEV__) {
      console.warn(
        '[Google OAuth] Ignorando EXPO_PUBLIC_GOOGLE_NATIVE_REDIRECT_URI con exp://… en Expo Go: Google lo rechaza. Borra esa variable y usa HTTPS auth.expo.io (ver Metro).'
      );
    }
    return undefined;
  }
  return v;
}

/** URI completa p. ej. `https://auth.expo.io/@usuario/kora-nova-1` si quieres fijarla a mano. */
function readExplicitExpoGoogleProxyRedirect(): string | undefined {
  if (typeof process === 'undefined' || !process.env?.EXPO_PUBLIC_GOOGLE_EXPO_PROXY_REDIRECT) return undefined;
  const v = String(process.env.EXPO_PUBLIC_GOOGLE_EXPO_PROXY_REDIRECT).trim().replace(/\/+$/, '');
  if (!v) return undefined;
  if (!v.startsWith('https://auth.expo.io/')) {
    if (__DEV__) {
      console.warn(
        '[Google OAuth] EXPO_PUBLIC_GOOGLE_EXPO_PROXY_REDIRECT debe ser https://auth.expo.io/@usuario/slug (valor ignorado)'
      );
    }
    return undefined;
  }
  return v;
}

type ExpoCfgSlice = {
  originalFullName?: string;
  slug?: string;
  owner?: string;
};

function cleanFullNameSegment(s: string): string {
  return s.replace(/^\/+/, '').trim();
}

/** originalFullName suele vivir en manifest2.extra.expoClient, no solo en expoConfig. */
function readResolvedProjectFullPath(): string | undefined {
  const ec = Constants.expoConfig as ExpoCfgSlice | null | undefined;
  const m2 = Constants.manifest2 as { extra?: { expoClient?: ExpoCfgSlice } } | null | undefined;
  const ex = m2?.extra?.expoClient;

  const fromOriginal =
    typeof ec?.originalFullName === 'string' && ec.originalFullName.includes('/')
      ? ec.originalFullName
      : typeof ex?.originalFullName === 'string' && ex.originalFullName.includes('/')
        ? ex.originalFullName
        : undefined;
  if (fromOriginal) return cleanFullNameSegment(fromOriginal);

  const ownerRaw =
    (typeof process !== 'undefined' && process.env?.EXPO_PUBLIC_EXPO_OWNER
      ? String(process.env.EXPO_PUBLIC_EXPO_OWNER).trim().replace(/^@/, '')
      : '') ||
    (typeof ec?.owner === 'string' ? ec.owner.replace(/^@/, '').trim() : '') ||
    (typeof ex?.owner === 'string' ? ex.owner.replace(/^@/, '').trim() : '');

  const slug =
    (typeof ec?.slug === 'string' && ec.slug) ||
    (typeof ex?.slug === 'string' && ex.slug) ||
    'kora-nova-1';

  if (ownerRaw) return cleanFullNameSegment(`@${ownerRaw}/${slug}`);

  const m1 = Constants.manifest as ExpoCfgSlice | null | undefined;
  if (typeof m1?.originalFullName === 'string' && m1.originalFullName.includes('/')) {
    return cleanFullNameSegment(m1.originalFullName);
  }

  return undefined;
}

/**
 * Redirect HTTPS válido para clientes OAuth “Web” de Google dentro de Expo Go.
 * Firma esperada por Expo: `@owner/appSlug` como en `originalFullName`.
 */
export function googleExpoGoProxyRedirect(): string | undefined {
  if (Constants.executionEnvironment !== ExecutionEnvironment.StoreClient) return undefined;
  if (Platform.OS === 'web') return undefined;

  const explicit = readExplicitExpoGoogleProxyRedirect();
  if (explicit) return explicit;

  const resolved = readResolvedProjectFullPath();
  if (resolved) {
    return `https://auth.expo.io/${resolved}`;
  }

  try {
    const legacy = AuthSession.getRedirectUrl();
    if (typeof legacy === 'string' && legacy.startsWith('https://auth.expo.io/')) {
      return legacy.replace(/\/$/, '');
    }
  } catch {
    /* sin originalFullName en manifest */
  }

  return undefined;
}

/**
 * Primera navegación del login en Expo Go: `auth.expo.io/@…/slug/start?authUrl=&returnUrl=`.
 * Sin esto Google redirige al proxy pero la página pierde la cookie (`returnURL`) y muestra
 * «Something went wrong trying to finish signing in».
 */
export function buildExpoGoGoogleOAuthProxyStartUrl(authUrl: string): string | undefined {
  if (!authUrl?.trim()) return undefined;
  if (Constants.executionEnvironment !== ExecutionEnvironment.StoreClient || Platform.OS === 'web') {
    return undefined;
  }

  const httpsBase = googleExpoGoProxyRedirect();
  if (!httpsBase) return undefined;

  let returnUrl: string;
  try {
    returnUrl = AuthSession.getDefaultReturnUrl();
  } catch {
    return undefined;
  }

  const qs = new URLSearchParams({ authUrl: authUrl.trim(), returnUrl });
  return `${httpsBase}/start?${qs.toString()}`;
}

/**
 * Por defecto **true**: hay que abrir primero `auth.expo.io/.../start` para que el proxy guarde la cookie
 * y el retorno a `exp://` funcione. Si abres Google directo, auth.expo.io suele mostrar
 * «Something went wrong trying to finish signing in».
 *
 * Para **intentar** ir directo a Google (experimental; puede romper el login), pon en `Front/.env`:
 * `EXPO_PUBLIC_EXPO_GOOGLE_USE_PROXY_START=false`
 */
export function shouldUseExpoGoAuthProxyStart(): boolean {
  if (typeof process === 'undefined') return true;
  const raw = process.env?.EXPO_PUBLIC_EXPO_GOOGLE_USE_PROXY_START;
  if (raw == null || !String(raw).trim()) return true;
  const v = String(raw).trim().toLowerCase();
  if (v === '0' || v === 'false' || v === 'no') return false;
  return true;
}

const REQ_AUG_EMPTY: { redirectUri?: string } = {};
const REDIRECT_OPTS_PATH: AuthSession.AuthSessionRedirectUriOptions = {
  path: GOOGLE_OAUTH_REDIRECT_PATH,
};
const REDIRECT_OPTS_NONE: AuthSession.AuthSessionRedirectUriOptions = {};

/** Parámetros para `Google.useAuthRequest` (mezclar resultado en memo en el caller para estabilidad). */
export function getGoogleUseAuthRedirectParams(): {
  requestConfigAugment: { redirectUri?: string };
  redirectUriOptions: AuthSession.AuthSessionRedirectUriOptions;
} {
  const webUri = readGoogleWebRedirectOverride();
  if (webUri) {
    return {
      requestConfigAugment: { redirectUri: webUri },
      redirectUriOptions: REDIRECT_OPTS_NONE,
    };
  }

  /**
   * Web (`expo start --web`): el redirect debe ser **exactamente**
   * `<origen-del-navegador>/oauthredirect` (misma cadena que en Google Cloud).
   * Así funciona si abrís `localhost:8081` o `http://IP-LAN:8081` sin depender de matices de `makeRedirectUri`.
   */
  if (Platform.OS === 'web' && typeof window !== 'undefined' && window.location?.origin) {
    const origin = window.location.origin.replace(/\/$/, '');
    return {
      requestConfigAugment: { redirectUri: `${origin}/${GOOGLE_OAUTH_REDIRECT_PATH}` },
      redirectUriOptions: REDIRECT_OPTS_NONE,
    };
  }

  const nativeUri = readGoogleNativeRedirectOverride();
  if (nativeUri) {
    return {
      requestConfigAugment: { redirectUri: nativeUri },
      redirectUriOptions: REDIRECT_OPTS_NONE,
    };
  }

  const expoHttps = googleExpoGoProxyRedirect();
  if (expoHttps) {
    return {
      requestConfigAugment: { redirectUri: expoHttps },
      redirectUriOptions: REDIRECT_OPTS_NONE,
    };
  }

  if (
    __DEV__ &&
    Constants.executionEnvironment === ExecutionEnvironment.StoreClient &&
    Platform.OS !== 'web'
  ) {
    console.error(
      '[Google OAuth] Expo Go: no hay redirect https://auth.expo.io/@… definido.\n' +
        'Ejecuta `npx expo login` y reinicia Expo, O en Front/.env define:\n' +
        'EXPO_PUBLIC_EXPO_OWNER=tu_usuario   (slug del proyecto: kora-nova-1)\n' +
        'EXPO_PUBLIC_GOOGLE_EXPO_PROXY_REDIRECT=https://auth.expo.io/@tu_usuario/kora-nova-1\n' +
        'Sin eso Google seguirá recibiendo exp://… y devolverá error 400.'
    );
  }

  return {
    requestConfigAugment: REQ_AUG_EMPTY,
    redirectUriOptions: REDIRECT_OPTS_PATH,
  };
}

/** Posibles redirects a registrar en Google (una entrada por línea única). */
export function collectGoogleOAuthRedirectUris(): string[] {
  const uris: string[] = [];
  const push = (u: string) => {
    if (u && !uris.includes(u)) uris.push(u);
  };

  try {
    const webOv = readGoogleWebRedirectOverride();
    if (webOv) push(webOv);
  } catch {
    /* noop */
  }

  try {
    const nativeOv = readGoogleNativeRedirectOverride();
    if (nativeOv) push(nativeOv);
  } catch {
    /* noop */
  }

  try {
    const goHttps = googleExpoGoProxyRedirect();
    if (goHttps) push(goHttps);
  } catch {
    /* noop */
  }

  /**
   * Misma firma que el `redirectUri` interno del proveedor Google de expo-auth-session
   * (solo `native` + `redirectUriOptions` con `path`).
   */
  const nativeDummy = googleNativeRedirectDummy();

  /** Con redirect `auth.expo.io` activo en Expo Go, no sugieras `exp://…` en Google Console. */
  const skipLegacyExpRedirects =
    Constants.executionEnvironment === ExecutionEnvironment.StoreClient && !!googleExpoGoProxyRedirect();

  if (!skipLegacyExpRedirects) {
    try {
      push(AuthSession.makeRedirectUri({ native: nativeDummy, path: GOOGLE_OAUTH_REDIRECT_PATH }));
    } catch {
      /* noop */
    }

    try {
      push(AuthSession.makeRedirectUri({ native: nativeDummy, path: GOOGLE_OAUTH_REDIRECT_PATH, preferLocalhost: true }));
    } catch {
      /* noop */
    }
  }

  // Development build / standalone: cuando `native` tiene prioridad, la URI es tipo `bundleId:/oauthredirect`.
  try {
    if (
      Platform.OS !== 'web' &&
      [ExecutionEnvironment.Standalone, ExecutionEnvironment.Bare].includes(Constants.executionEnvironment)
    ) {
      push(nativeDummy);
    }
  } catch {
    /* noop */
  }

  // Scheme de `app.json` (p. ej. `kora://…`) solo aplica en build nativa / dev client, no en Expo Go.
  try {
    if ([ExecutionEnvironment.Standalone, ExecutionEnvironment.Bare].includes(Constants.executionEnvironment)) {
      const cfg = Constants.expoConfig;
      const platform = Platform.OS === 'ios' ? cfg?.ios : Platform.OS === 'android' ? cfg?.android : null;
      const raw = cfg?.scheme ?? (platform && 'scheme' in platform ? (platform as { scheme?: string }).scheme : undefined);
      const schemes =
        typeof raw === 'string' ? [raw] : Array.isArray(raw) ? raw.filter((s): s is string => typeof s === 'string') : [];
      for (const scheme of schemes) {
        push(AuthSession.makeRedirectUri({ scheme, path: GOOGLE_OAUTH_REDIRECT_PATH }));
        push(AuthSession.makeRedirectUri({ scheme, path: GOOGLE_OAUTH_REDIRECT_PATH, preferLocalhost: true }));
      }
    }
  } catch {
    /* noop */
  }

  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    const origin = window.location.origin.replace(/\/$/, '');
    push(origin);
    push(`${origin}/oauthredirect`);
  }

  return uris;
}

export function collectGoogleOAuthJavaScriptOrigins(): string[] {
  if (typeof window === 'undefined' || !window.location) return [];
  const { protocol, hostname, port } = window.location;
  const p = port || '';
  const hostPart = p ? `${hostname}:${p}` : hostname;
  const current = `${protocol}//${hostPart}`;
  const out = new Set<string>([current]);
  if (/^\d{1,3}(\.\d{1,3}){3}$/.test(hostname)) {
    const devPort = p || '8081';
    out.add(`http://localhost:${devPort}`);
    out.add(`http://127.0.0.1:${devPort}`);
  }
  return [...out];
}

/** Web: el redirect OAuth deja `/oauthredirect?code=…` (#fragments). Sin limpiar, el historial puede dejar Login visible aunque `user` ya exista en contexto. */
export function sanitizeWebUrlAfterGoogleOAuth(): void {
  if (Platform.OS !== 'web' || typeof window === 'undefined') return;
  const { pathname, search, hash } = window.location;
  const hasOAuthCue =
    pathname.includes(`/${GOOGLE_OAUTH_REDIRECT_PATH}`) ||
    pathname.endsWith(`/${GOOGLE_OAUTH_REDIRECT_PATH}`) ||
    search.includes('code=') ||
    search.includes('scope=') ||
    /id_token|access_token/.test(hash);
  if (!hasOAuthCue) return;
  window.history.replaceState({}, document.title, '/');
}

export type GoogleOAuthDevLogOptions = { isExpoGo: boolean };

let devOAuthBannerLogged = false;

export function logGoogleOAuthSetupInDev(options: GoogleOAuthDevLogOptions): void {
  if (!__DEV__) return;
  if (devOAuthBannerLogged) return;
  devOAuthBannerLogged = true;

  const redirects = collectGoogleOAuthRedirectUris();
  const lines = [
    '',
    '── Kora · Google OAuth ──',
    'Cliente tipo WEB en Google Cloud (mismo valor que GOOGLE_CLIENT_ID).',
    'Credenciales → [cliente Web] → URIs de redirección autorizadas:',
    '',
    '① **Expo Go:** Google rechaza redirects `exp://…`. Prioriza registrar la línea HTTPS `https://auth.expo.io/@…`:',
    ...redirects.map((u) => `   • ${u}`),
  ];

  if (options.isExpoGo && !googleExpoGoProxyRedirect()) {
    lines.push(
      '',
      '⚠ No se pudo calcular auth.expo.io: inicia sesión en Expo (`npx expo whoami`; si falla → `npx expo login`)',
      '   o añade en Front/.env: EXPO_PUBLIC_EXPO_OWNER=tu_usuario  (slug del proyecto: kora-nova-1)',
      '   o EXPO_PUBLIC_GOOGLE_EXPO_PROXY_REDIRECT=https://auth.expo.io/@tu_usuario/kora-nova-1'
    );
  }

  lines.push(
    '',
    'Opcional .env Front/: EXPO_PUBLIC_GOOGLE_WEB_REDIRECT_URI · EXPO_PUBLIC_GOOGLE_EXPO_PROXY_REDIRECT · EXPO_PUBLIC_EXPO_OWNER'
  );

  lines.push(
    '',
    '④ **Development build (`expo-dev-client`):** en el mismo cliente OAuth **Web**, registra también las URIs nativas que lista abajo',
    '   (p. ej. `com.kora.mobile:/oauthredirect`, `kora:/oauthredirect`) para evitar `redirect_uri_mismatch`; el canje sigue usando el backend.'
  );

  lines.push('', 'Metro imprime también `[Google OAuth] Copia esta URI…` al armar la petición (valor real del redirect_uri).');

  if (Platform.OS === 'web') {
    const origins = collectGoogleOAuthJavaScriptOrigins();
    lines.push('', '② Orígenes JavaScript autorizados (incluye todos):');
    origins.forEach((o) => lines.push(`   • ${o}`));
  } else {
    lines.push('', '② Abrir login en navegador (expo start --web) y repetir checklist si también usas web.');
  }

  lines.push('', '③ OAuth consentimiento: si el estado es PRUEBA, añade tu correo en “Usuarios de prueba”.');
  lines.push('   También debe coincidir el nombre/logo de marca con la política externa si publicas store.');

  lines.push(
    '',
    '④ Error 400 invalid_request (“no cumple la política”): revisa ① y ③ y, en Consola, marca de la aplicación y dominios autorizados.'
  );

  lines.push(
    '',
    '⑤ Expo Go necesita ese redirect HTTPS más el Client ID Web; desarrollo nativo estable → `expo run:android|ios`.'
  );

  lines.push('──────────────────────────────────────────────────────────', '');
  console.warn(lines.join('\n'));
}
