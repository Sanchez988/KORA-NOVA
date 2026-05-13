import dotenv from 'dotenv';
import path from 'path';

const envPath = path.join(__dirname, '../../.env');
dotenv.config({ path: envPath });
// En desarrollo, Back/.env debe poder sobreescribir DATABASE_URL heredada del sistema (p. ej. Windows).
if ((process.env.NODE_ENV || 'development') !== 'production') {
  dotenv.config({ path: envPath, override: true });
}

const dbUrl = (process.env.DATABASE_URL || '').trim();
if (!dbUrl) {
  console.error(
    '[Kora Back] DATABASE_URL vacía. Define en Back/.env una URL PostgreSQL (ver .env.example).'
  );
  process.exit(1);
}
if (dbUrl.startsWith('file:')) {
  console.error(
    '[Kora Back] DATABASE_URL apunta a SQLite (file:…) pero prisma/schema.prisma usa PostgreSQL.\n' +
      'Sustituye por postgresql://… (p. ej. la de Back/.env.example) y arranca Postgres: docker compose up -d en la raíz del repo.'
  );
  process.exit(1);
}

function envBool(raw: string | undefined, fallback: boolean): boolean {
  if (typeof raw !== 'string') return fallback;
  const v = raw.trim().toLowerCase();
  if (!v) return fallback;
  if (['1', 'true', 'yes', 'on'].includes(v)) return true;
  if (['0', 'false', 'no', 'off'].includes(v)) return false;
  return fallback;
}

/** URL pública del API (uploads, Swagger, enlaces en correos). Render define `RENDER_EXTERNAL_URL`. */
function resolvePublicApiUrl(): string {
  const explicit = (process.env.API_URL || '').trim();
  if (explicit) return explicit.replace(/\/+$/, '');
  const render = (process.env.RENDER_EXTERNAL_URL || '').trim();
  if (render) return render.replace(/\/+$/, '');
  return 'http://localhost:5000';
}

export const config = {
  // Configuración del servidor
  env: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT || '5000', 10),
  apiUrl: resolvePublicApiUrl(),
  frontendUrl: process.env.FRONTEND_URL || 'http://localhost:5173',
  emailVerificationRequired: envBool(
    process.env.EMAIL_VERIFICATION_REQUIRED,
    (process.env.NODE_ENV || 'development') === 'production'
  ),

  /**
   * Si true, registro y reenvío de verificación incluyen el código en el JSON (además del intento por SMTP).
   * La app puede mostrarlo cuando el correo institucional bloquea o falla la entrega; desactivar en entornos
   * donde solo se confíe en el buzón (HTTPS sigue siendo obligatorio).
   */
  emailVerificationIncludeCodeInResponse: envBool(
    process.env.EMAIL_VERIFICATION_INCLUDE_CODE_IN_RESPONSE,
    true
  ),

  /**
   * Si true, la API incluye `devResetCode` al solicitar recuperación de contraseña aunque NODE_ENV=production.
   * Solo para entornos de prueba sin SMTP; nunca en producción real ante usuarios.
   */
  passwordResetExposeCodeInResponse: envBool(
    process.env.PASSWORD_RESET_DEV_CODE_IN_RESPONSE,
    false
  ),

  // JWT
  jwt: {
    secret: process.env.JWT_SECRET || 'default_secret_change_in_production',
    refreshSecret: process.env.JWT_REFRESH_SECRET || 'default_refresh_secret',
    expiresIn: process.env.JWT_EXPIRES_IN || '24h',
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '30d',
  },

  // Email
  email: {
    host: process.env.EMAIL_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.EMAIL_PORT || '587', 10),
    user: process.env.EMAIL_USER || '',
    password: process.env.EMAIL_PASSWORD || '',
    from: process.env.EMAIL_FROM || 'Kora <noreply@kora.app>',
  },

  // Base de datos
  database: {
    url: dbUrl,
  },

  // Cloudinary
  cloudinary: {
    url: process.env.CLOUDINARY_URL || '',
    cloudName: process.env.CLOUDINARY_CLOUD_NAME || '',
    apiKey: process.env.CLOUDINARY_API_KEY || '',
    apiSecret: process.env.CLOUDINARY_API_SECRET || '',
  },

  // Firebase
  firebase: {
    credentialsPath: process.env.FIREBASE_CREDENTIALS_PATH || '',
    projectId: process.env.FIREBASE_PROJECT_ID || '',
    privateKey: process.env.FIREBASE_PRIVATE_KEY || '',
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL || '',
  },

  // Google OAuth (cliente tipo "Aplicación web" en Google Cloud)
  google: {
    clientId: process.env.GOOGLE_CLIENT_ID || '',
    /** Solo en servidor: canje authorization_code + PKCE cuando Google exige secreto (Expo Go / cliente Web). */
    clientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
  },

  // Seguridad
  bcrypt: {
    saltRounds: parseInt(process.env.BCRYPT_SALT_ROUNDS || '12', 10),
  },

  security: {
    maxLoginAttempts: parseInt(process.env.MAX_LOGIN_ATTEMPTS || '5', 10),
    loginLockTime: parseInt(process.env.LOGIN_LOCK_TIME || '900000', 10), // 15 minutos
  },

  // Rate limiting
  rateLimit: {
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '60000', 10),
    maxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100', 10),
  },

  // Uploads (límite por archivo configurable en MB)
  uploads: {
    maxFileSize:
      Math.max(1, parseInt(process.env.MAX_UPLOAD_FILE_SIZE_MB || '15', 10)) * 1024 * 1024,
    allowedFormats: ['image/jpeg', 'image/png', 'image/webp'],
    uploadDir: path.join(__dirname, '../../uploads'),
  },
};
