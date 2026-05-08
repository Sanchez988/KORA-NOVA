import { Request, Response, NextFunction } from 'express';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import https from 'https';
import { config } from '../config';
import { AuthRequest } from '../middleware/auth';
import { AppError } from '../middleware/errorHandler';
import { sendEmail } from '../services/email.service';
import { logger } from '../utils/logger';
import { createFirebaseUser, isFirebaseConfigured } from '../config/firebase';
import { REQUIRED_LEGAL_CONSENT_VERSION } from '../constants/legalConsent';

const prisma = new PrismaClient();

/** Plazo para recuperar cuenta o reiniciar tras eliminación (solo‑lectura en cliente). */
export const ACCOUNT_RECOVERY_DAYS = 30;

export function accountRecoveryDeadline(deletedAt: Date): Date {
  const d = new Date(deletedAt.getTime());
  d.setUTCDate(d.getUTCDate() + ACCOUNT_RECOVERY_DAYS);
  return d;
}

function isWithinAccountRecoveryWindow(deletedAt: Date | null | undefined): boolean {
  if (!deletedAt) return false;
  return Date.now() <= accountRecoveryDeadline(deletedAt).getTime();
}

function normalizeAuthEmail(email: string): string {
  return email.trim().toLowerCase();
}

/** Registro con email reusado y "empezar de cero" con Google: limpia datos ligados y borra el usuario. */
async function purgeUserFully(userId: string): Promise<void> {
  await prisma.$transaction(async (tx) => {
    await tx.storyView.deleteMany({ where: { viewerId: userId } });
    await tx.swipe.deleteMany({
      where: { OR: [{ userId }, { targetUserId: userId }] },
    });
    await tx.user.delete({ where: { id: userId } });
  });
}

type ProfileRow = NonNullable<Awaited<ReturnType<typeof prisma.profile.findUnique>>>;

function parseProfileStringArrayField(raw: string, field: string): string[] {
  try {
    const v = JSON.parse(raw) as unknown;
    if (!Array.isArray(v)) return [];
    return v.filter((x): x is string => typeof x === 'string');
  } catch {
    logger.warn(`Perfil: campo "${field}" con JSON inválido, usando []`);
    return [];
  }
}

function parseProfileJson(profileRaw: ProfileRow | null) {
  if (!profileRaw) return null;
  return {
    ...profileRaw,
    photos: parseProfileStringArrayField(profileRaw.photos, 'photos'),
    interests: parseProfileStringArrayField(profileRaw.interests, 'interests'),
    hobbies: parseProfileStringArrayField(profileRaw.hobbies, 'hobbies'),
  };
}

/** Payload de usuario para login / google / GET me (sin campo password). */
function buildAuthClientUser(user: {
  id: string;
  email: string;
  verified: boolean;
  dateOfBirth: Date;
  createdAt: Date;
  legalConsentVersion: string | null;
}, profileRaw: ProfileRow | null) {
  const profile = parseProfileJson(profileRaw);
  return {
    id: user.id,
    email: user.email,
    verified: user.verified,
    dateOfBirth: user.dateOfBirth.toISOString(),
    createdAt: user.createdAt.toISOString(),
    legalConsentVersion: user.legalConsentVersion ?? null,
    profile,
  };
}

// Registrar usuario
export const register = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { password, dateOfBirth } = req.body;
    const emailRaw = typeof req.body.email === 'string' ? req.body.email : '';
    const email = normalizeAuthEmail(emailRaw);
    if (!email) {
      throw new AppError('Email inválido', 400);
    }

    // Verificar si el usuario ya existe
    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      const deletedAt = existingUser.deletedAt;
      if (!deletedAt) {
        throw new AppError('El email ya está registrado', 400);
      }
      if (isWithinAccountRecoveryWindow(deletedAt)) {
        throw new AppError(
          'Este correo corresponde a una cuenta eliminada que aún puede recuperarse. Inicia sesión y elige reactivar o empezar de cero antes de que venza el plazo.',
          409,
          {
            code: 'ACCOUNT_IN_RECOVERY',
            recoverableUntil: accountRecoveryDeadline(deletedAt).toISOString(),
          }
        );
      }
      // Cuenta eliminada hace más de 30 días: liberar correo
      await purgeUserFully(existingUser.id);
      logger.info(`Nuevo registro tras expiración de cuenta eliminada (email reutilizado): ${email}`);
    }

    // Hash de la contraseña
    const passwordHash = await bcrypt.hash(password, config.bcrypt.saltRounds);

    // Generar token de verificación
    const verificationToken = Math.random().toString(36).substring(2, 8).toUpperCase();

    // Si Firebase está configurado, crear usuario en Firebase también
    let firebaseUid: string | undefined;
    if (isFirebaseConfigured()) {
      try {
        const firebaseUser = await createFirebaseUser(email, password);
        firebaseUid = firebaseUser.uid;
        logger.info(`Usuario creado en Firebase: ${firebaseUid}`);
      } catch (firebaseError: any) {
        logger.error('Error al crear usuario en Firebase:', firebaseError);
        // Continuar sin Firebase si falla (opcional: puedes hacer throw para requerir Firebase)
      }
    }

    // Control de verificación por correo:
    // - EMAIL_VERIFICATION_REQUIRED=true  => exige verificación (si SMTP disponible)
    // - EMAIL_VERIFICATION_REQUIRED=false => auto-verifica siempre (útil para pruebas)
    const emailConfigured = !!(config.email.user && config.email.password);
    const shouldRequireEmailVerification =
      config.emailVerificationRequired && emailConfigured;
    const isDevMode = !shouldRequireEmailVerification;

    if (config.emailVerificationRequired && !emailConfigured) {
      logger.warn(
        'EMAIL_VERIFICATION_REQUIRED=true pero EMAIL_USER/EMAIL_PASSWORD no están configurados; se auto-verificará temporalmente.'
      );
    }

    // Crear usuario en base de datos local
    const user = await prisma.user.create({
      data: {
        email,
        passwordHash,
        dateOfBirth: new Date(dateOfBirth),
        verificationToken: isDevMode ? null : verificationToken,
        verified: isDevMode, // Auto-verificado en desarrollo
        firebaseUid,
      },
    });

    // Solo enviar email cuando la verificación está activa.
    if (shouldRequireEmailVerification) {
      await sendEmail({
        to: email,
        subject: 'Verifica tu correo electrónico - Kora',
        html: `
          <h2>¡Bienvenido a Kora! 💕</h2>
          <p>Tu código de verificación es: <strong>${verificationToken}</strong></p>
          <p>Ingresa este código en la app para verificar tu cuenta.</p>
          ${firebaseUid ? '<p><small>Tu cuenta también ha sido creada en Firebase Authentication.</small></p>' : ''}
        `,
      });
    }

    res.status(201).json({
      message: isDevMode
        ? 'Cuenta creada. Puedes iniciar sesión directamente.'
        : 'Usuario registrado. Por favor verifica tu email.',
      userId: user.id,
      devMode: isDevMode,
      firebaseEnabled: isFirebaseConfigured(),
    });
  } catch (error) {
    next(error);
  }
};

// Login
export const login = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { email, password } = req.body;
    const normalizedEmail = typeof email === 'string' ? email.trim().toLowerCase() : '';
    if (!normalizedEmail || typeof password !== 'string') {
      throw new AppError('Email y contraseña son obligatorios', 400);
    }

    const user = await prisma.user.findUnique({ where: { email: normalizedEmail } });
    if (!user) {
      throw new AppError('Credenciales inválidas', 401);
    }

    if (user.deletedAt && !isWithinAccountRecoveryWindow(user.deletedAt)) {
      await purgeUserFully(user.id);
      throw new AppError('Credenciales inválidas', 401);
    }

    // Cuenta en periodo de recuperación — no iniciar sesión hasta elegir en la app
    if (user.deletedAt) {
      res.status(410).json({
        code: 'ACCOUNT_DELETED',
        message:
          `Tu cuenta fue eliminada. Tienes hasta ${accountRecoveryDeadline(user.deletedAt).toLocaleDateString('es-CO', { day: 'numeric', month: 'long', year: 'numeric' })} para recuperarla o empezar de cero con el mismo correo.`,
        recoverableUntil: accountRecoveryDeadline(user.deletedAt).toISOString(),
        email: normalizedEmail,
      });
      return;
    }

    const hash = (user.passwordHash || '').trim();
    /** Cuentas creadas solo con Google suelen tener hash vacío o inválido para bcrypt. */
    const isGoogleOnly = !hash || hash.length < 20;

    let sessionUser = user;

    if (isGoogleOnly) {
      if (password.length < 8) {
        throw new AppError(
          'Tu cuenta empezó con Google. Para entrar con correo y contraseña, usa al menos 8 caracteres: así defines tu contraseña de Kora (luego podrás usar este mismo método o Google).',
          400
        );
      }
      const newHash = await bcrypt.hash(password, config.bcrypt.saltRounds);
      sessionUser = await prisma.user.update({
        where: { id: user.id },
        data: { passwordHash: newHash },
      });
      logger.info(`Contraseña local asociada a cuenta antes solo-Google: ${normalizedEmail}`);
    } else {
      let isValidPassword = false;
      try {
        isValidPassword = await bcrypt.compare(password, hash);
      } catch (e) {
        logger.warn('bcrypt.compare falló — hash de perfil incompatible', e);
        throw new AppError('No se puede verificar la contraseña. Prueba recuperar contraseña o Google.', 400);
      }
      if (!isValidPassword) {
        throw new AppError('Credenciales inválidas', 401);
      }
    }

    if (!sessionUser.verified) {
      if (!config.emailVerificationRequired) {
        sessionUser = await prisma.user.update({
          where: { id: sessionUser.id },
          data: { verified: true, verificationToken: null },
        });
        logger.info(
          `Auto-verificación en login (EMAIL_VERIFICATION_REQUIRED=false): ${normalizedEmail}`
        );
      } else {
        throw new AppError('Por favor verifica tu email primero', 403);
      }
    }

    // Generar tokens
    const token = jwt.sign({ userId: sessionUser.id }, config.jwt.secret, {
      expiresIn: config.jwt.expiresIn,
    } as any);

    const refreshToken = jwt.sign({ userId: sessionUser.id }, config.jwt.refreshSecret, {
      expiresIn: config.jwt.refreshExpiresIn,
    } as any);

    // Obtener perfil
    const profileRaw = await prisma.profile.findUnique({
      where: { userId: sessionUser.id },
    });

    res.json({
      token,
      refreshToken,
      user: buildAuthClientUser(sessionUser, profileRaw),
    });
  } catch (error) {
    next(error);
  }
};

// Verificar email
export const verifyEmail = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    // Acepta { token } directamente — busca al usuario por su token
    const { token } = req.body;

    if (!token) {
      throw new AppError('Código de verificación requerido', 400);
    }

    const user = await prisma.user.findFirst({ where: { verificationToken: token } });
    if (!user) {
      throw new AppError('Código de verificación inválido o ya utilizado', 400);
    }

    await prisma.user.update({
      where: { id: user.id },
      data: {
        verified: true,
        verificationToken: null,
      },
    });

    res.json({ message: 'Email verificado exitosamente' });
  } catch (error) {
    next(error);
  }
};

// Reenviar verificación
export const resendVerification = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { email } = req.body;

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      throw new AppError('Usuario no encontrado', 404);
    }

    if (user.verified) {
      throw new AppError('El email ya está verificado', 400);
    }

    const verificationToken = Math.random().toString(36).substring(2, 8).toUpperCase();

    await prisma.user.update({
      where: { id: user.id },
      data: { verificationToken },
    });

    await sendEmail({
      to: email,
      subject: 'Código de verificación - Kora',
      html: `<p>Tu nuevo código de verificación es: <strong>${verificationToken}</strong></p>`,
    });

    res.json({ message: 'Código de verificación reenviado' });
  } catch (error) {
    next(error);
  }
};

// Solicitar recuperación de contraseña
export const requestPasswordReset = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const emailRaw = typeof req.body?.email === 'string' ? req.body.email : '';
    const email = normalizeAuthEmail(emailRaw);
    if (!email) {
      throw new AppError('Email inválido', 400);
    }

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      res.json({ message: 'Si el email existe, recibirás un código de recuperación' });
      return;
    }

    const resetToken = Math.random().toString(36).substring(2, 8).toUpperCase();
    const resetTokenExpiry = new Date(Date.now() + 3600000); // 1 hora

    await prisma.user.update({
      where: { id: user.id },
      data: { resetToken, resetTokenExpiry },
    });

    try {
      await sendEmail({
        to: email,
        subject: 'Recuperación de contraseña - Kora',
        html: `<p>Tu código de recuperación es: <strong>${resetToken}</strong></p>`,
      });
    } catch (err) {
      logger.warn('requestPasswordReset: envío de correo falló', err);
    }

    const isDev = config.env === 'development';
    if (isDev) {
      logger.info(`[dev] Código recuperación contraseña para ${email}: ${resetToken}`);
    }

    res.json({
      message: 'Si el email existe, recibirás un código de recuperación',
      ...(isDev ? { devResetCode: resetToken } : {}),
    });
  } catch (error) {
    next(error);
  }
};

// Resetear contraseña
export const resetPassword = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const emailRaw = typeof req.body?.email === 'string' ? req.body.email : '';
    const email = normalizeAuthEmail(emailRaw);
    const code =
      typeof req.body?.code === 'string'
        ? req.body.code.trim().toUpperCase()
        : typeof req.body?.token === 'string'
          ? req.body.token.trim().toUpperCase()
          : '';
    const newPassword = typeof req.body?.newPassword === 'string' ? req.body.newPassword : '';

    if (!email || !code || !newPassword) {
      throw new AppError('Email, código y nueva contraseña son obligatorios', 400);
    }
    if (newPassword.length < 8) {
      throw new AppError('La contraseña debe tener al menos 8 caracteres', 400);
    }

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user || !user.resetToken || !user.resetTokenExpiry) {
      throw new AppError('Código inválido o expirado', 400);
    }

    if (user.resetToken !== code || user.resetTokenExpiry < new Date()) {
      throw new AppError('Código inválido o expirado', 400);
    }

    const passwordHash = await bcrypt.hash(newPassword, config.bcrypt.saltRounds);

    await prisma.user.update({
      where: { id: user.id },
      data: {
        passwordHash,
        resetToken: null,
        resetTokenExpiry: null,
      },
    });

    res.json({ message: 'Contraseña actualizada exitosamente' });
  } catch (error) {
    next(error);
  }
};

// Obtener usuario actual
export const getMe = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.userId },
      select: {
        id: true,
        email: true,
        dateOfBirth: true,
        verified: true,
        createdAt: true,
        legalConsentVersion: true,
        profile: true,
      },
    });
    if (!user) throw new AppError('Usuario no encontrado', 404);

    res.json(buildAuthClientUser(user, user.profile));
  } catch (error) {
    next(error);
  }
};

// Marcar consentimiento legal (primera vez o nueva versión de documentos)
export const acceptLegalConsent = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const requested = typeof req.body?.version === 'string' ? req.body.version : undefined;
    const versionToStore = requested ?? REQUIRED_LEGAL_CONSENT_VERSION;
    if (versionToStore !== REQUIRED_LEGAL_CONSENT_VERSION) {
      throw new AppError(
        'Versión de consentimiento no reconocida. Actualiza la aplicación e inténtalo de nuevo.',
        400
      );
    }

    await prisma.user.update({
      where: { id: req.userId! },
      data: { legalConsentVersion: versionToStore },
    });

    const user = await prisma.user.findUnique({
      where: { id: req.userId },
      select: {
        id: true,
        email: true,
        dateOfBirth: true,
        verified: true,
        createdAt: true,
        legalConsentVersion: true,
        profile: true,
      },
    });
    if (!user) throw new AppError('Usuario no encontrado', 404);

    res.json({
      legalConsentVersion: user.legalConsentVersion,
      user: buildAuthClientUser(user, user.profile),
    });
  } catch (error) {
    next(error);
  }
};

// Refresh token
export const refreshToken = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { refreshToken } = req.body;

    const decoded = jwt.verify(refreshToken, config.jwt.refreshSecret) as { userId: string };

    const newToken = jwt.sign({ userId: decoded.userId }, config.jwt.secret, {
      expiresIn: config.jwt.expiresIn,
    } as any);

    res.json({ token: newToken });
  } catch (error) {
    next(new AppError('Refresh token inválido', 401));
  }
};

function googleTokenEndpointExchange(formBody: string): Promise<Record<string, unknown>> {
  return new Promise((resolve, reject) => {
    const req = https.request(
      {
        hostname: 'oauth2.googleapis.com',
        path: '/token',
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Content-Length': Buffer.byteLength(formBody, 'utf8'),
        },
      },
      (res) => {
        let raw = '';
        res.on('data', (c) => {
          raw += c;
        });
        res.on('end', () => {
          try {
            resolve(JSON.parse(raw || '{}') as Record<string, unknown>);
          } catch {
            logger.warn(`Google token: respuesta no JSON: ${raw.slice(0, 240)}`);
            reject(new AppError('Respuesta inválida del servidor de tokens de Google', 502));
          }
        });
      }
    );
    req.on('error', (e) => {
      logger.warn('Google token request error', e);
      reject(new AppError('Error de conexión con Google', 502));
    });
    req.write(formBody);
    req.end();
  });
}

/**
 * redirect_uri usada en el authorize de Google (Expo proxy HTTPS, web dev `/oauthredirect`, o URI nativa en dev client).
 */
function isAllowedGoogleOAuthRedirectUri(uri: string): boolean {
  const u = uri.trim().replace(/\/+$/, '');
  if (!u) return false;
  const stripped = u;
  if (/^https:\/\/auth\.expo\.io\/@[^/]+\/[^/]+$/.test(stripped)) {
    return true;
  }
  // Development build / standalone: expo-auth-session + cliente Web suele usar `applicationId:/oauthredirect` o `scheme:/oauthredirect`
  // (registrar la misma cadena en Google Cloud → cliente tipo Web → URIs de redirección autorizadas).
  if (/^kora:\/oauthredirect$/i.test(stripped)) return true;
  if (/^com\.kora\.mobile:\/oauthredirect$/i.test(stripped)) return true;
  try {
    const parsed = new URL(u);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return false;
    const path = parsed.pathname.replace(/\/$/, '') || '/';
    if (!path.endsWith('/oauthredirect')) return false;
    const host = parsed.hostname;
    if (host === 'localhost' || host === '127.0.0.1') return true;
    if (/^\d{1,3}(\.\d{1,3}){3}$/.test(host)) return true;
    return false;
  } catch {
    return false;
  }
}

/**
 * Canje de `authorization_code` + PKCE en el servidor con **client_secret** (cliente Web en Google Cloud).
 * El navegador / Google suelen responder «client_secret is missing» si se llama solo con client_id desde el app.
 */
export const googleOAuthCodeExchange = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const clientSecret = config.google.clientSecret?.trim();
    if (!clientSecret) {
      throw new AppError(
        'Falta GOOGLE_CLIENT_SECRET en Back/.env (Google Cloud → credenciales del cliente tipo Web). Sin él Google devuelve «client_secret is missing» al canjear el código.',
        503
      );
    }

    const clientId = config.google.clientId?.trim();
    if (!clientId) {
      throw new AppError('Falta GOOGLE_CLIENT_ID en Back/.env', 503);
    }

    const code = typeof req.body?.code === 'string' ? req.body.code.trim() : '';
    const redirectUriRaw =
      typeof req.body?.redirectUri === 'string' ? req.body.redirectUri.trim() : '';
    const codeVerifier =
      typeof req.body?.codeVerifier === 'string' ? req.body.codeVerifier.trim() : '';

    if (!code || !redirectUriRaw || !codeVerifier) {
      throw new AppError('Se requieren code, redirectUri y codeVerifier', 400);
    }

    /** Misma cadena que envió el authorize a Google (sin barra final inconsistente). */
    const redirectUriForGoogle = redirectUriRaw.replace(/\/+$/, '');

    if (!isAllowedGoogleOAuthRedirectUri(redirectUriForGoogle)) {
      throw new AppError('redirect_uri no autorizado para este endpoint', 400);
    }

    const body = new URLSearchParams({
      grant_type: 'authorization_code',
      client_id: clientId,
      client_secret: clientSecret,
      code,
      redirect_uri: redirectUriForGoogle,
      code_verifier: codeVerifier,
    });

    const data = await googleTokenEndpointExchange(body.toString());

    if (typeof data.error === 'string') {
      const desc =
        typeof data.error_description === 'string' ? data.error_description : data.error;
      logger.warn(`Google token exchange: ${data.error} — ${desc}`);
      throw new AppError(String(desc), 400);
    }

    const idToken = typeof data.id_token === 'string' ? data.id_token : '';
    if (!idToken) {
      throw new AppError('Google no devolvió id_token', 400);
    }

    res.json({ idToken });
  } catch (error) {
    next(error);
  }
};

// Google Sign-In
export const googleLogin = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { idToken } = req.body;

    if (!idToken) {
      throw new AppError('Token de Google requerido', 400);
    }

    // Verify the Google ID token using the tokeninfo endpoint (no extra deps needed)
    const googleData = await verifyGoogleToken(idToken);

    const { email, name, picture, sub: googleSub } = googleData;

    if (!email) {
      throw new AppError('No se pudo obtener el email de Google', 400);
    }

    // Validate university domain
    const normalizedEmail = email.toLowerCase().trim();
    if (!normalizedEmail.endsWith('@pascualbravo.edu.co')) {
      throw new AppError('Solo se permiten cuentas @pascualbravo.edu.co', 403);
    }

    // Find or create user
    let user = await prisma.user.findUnique({ where: { email: normalizedEmail } });

    if (!user) {
      user = await prisma.user.create({
        data: {
          email: normalizedEmail,
          passwordHash: '', // No password for Google users
          dateOfBirth: new Date('2000-01-01'), // Placeholder — profile will complete later
          verified: true,
          firebaseUid: googleSub,
        },
      });
      logger.info(`Nuevo usuario creado via Google: ${normalizedEmail}`);
    } else if (user.deletedAt) {
      if (isWithinAccountRecoveryWindow(user.deletedAt)) {
        res.status(410).json({
          code: 'ACCOUNT_DELETED',
          message:
            `Tu cuenta fue eliminada. Tienes hasta ${accountRecoveryDeadline(user.deletedAt).toLocaleDateString('es-CO', { day: 'numeric', month: 'long', year: 'numeric' })} para recuperarla o empezar de cero con el mismo correo.`,
          recoverableUntil: accountRecoveryDeadline(user.deletedAt).toISOString(),
          email: normalizedEmail,
        });
        return;
      }
      await purgeUserFully(user.id);
      user = await prisma.user.create({
        data: {
          email: normalizedEmail,
          passwordHash: '',
          dateOfBirth: new Date('2000-01-01'),
          verified: true,
          firebaseUid: googleSub,
        },
      });
      logger.info(`Nueva cuenta Google tras eliminación (email reutilizado): ${normalizedEmail}`);
    } else {
      /** Contraseña de Kora y Google son independientes: cambiar una no bloquea la otra. */
      const patch: { verified?: boolean; firebaseUid?: string } = {};
      if (!user.verified) {
        patch.verified = true;
      }
      const storedUid = (user.firebaseUid ?? '').trim();
      if (!storedUid || storedUid === googleSub) {
        patch.firebaseUid = googleSub;
      }
      if (Object.keys(patch).length > 0) {
        user = await prisma.user.update({
          where: { id: user.id },
          data: patch,
        });
      }
    }

    const token = jwt.sign({ userId: user.id }, config.jwt.secret, {
      expiresIn: config.jwt.expiresIn,
    } as any);

    const refreshTokenValue = jwt.sign({ userId: user.id }, config.jwt.refreshSecret, {
      expiresIn: config.jwt.refreshExpiresIn,
    } as any);

    const profileRaw2 = await prisma.profile.findUnique({ where: { userId: user.id } });

    res.json({
      token,
      refreshToken: refreshTokenValue,
      user: buildAuthClientUser(user, profileRaw2),
    });
  } catch (error) {
    next(error);
  }
};

// Eliminar cuenta del usuario autenticado (soft-delete, 30 días para recuperar o reiniciar)
export const deleteAccount = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.id;

    const deletedAt = new Date();
    await prisma.user.update({
      where: { id: userId },
      data: { deletedAt, isActive: false },
    });

    const recoverableUntil = accountRecoveryDeadline(deletedAt);
    logger.info(`Cuenta soft-eliminada: ${userId} — recuperación hasta ${recoverableUntil.toISOString()}`);
    res.json({
      message:
        'Tu cuenta quedó desactivada. Durante 30 días puedes recuperarla con todos tus datos o empezar de cero con el mismo correo al iniciar sesión.',
      recoverableUntil: recoverableUntil.toISOString(),
      recoveryDays: ACCOUNT_RECOVERY_DAYS,
    });
  } catch (error) {
    next(error);
  }
};

/** Tras eliminar la cuenta: borrado definitivo en periodo de gracia (email + contraseña). Luego el correo puede registrarse de nuevo. */
export const restartFreshDeletedAccount = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const { email, password } = req.body;
    const normalizedEmail = typeof email === 'string' ? email.trim().toLowerCase() : '';
    if (!normalizedEmail || typeof password !== 'string') {
      throw new AppError('Email y contraseña son obligatorios', 400);
    }

    const user = await prisma.user.findUnique({ where: { email: normalizedEmail } });
    if (!user?.deletedAt) {
      throw new AppError('No hay una cuenta eliminada que reiniciar con este correo', 400);
    }
    if (!isWithinAccountRecoveryWindow(user.deletedAt)) {
      throw new AppError(
        'El plazo de un mes para recuperar o reiniciar esta cuenta ya venció. Crea una cuenta nueva desde registro.',
        410
      );
    }

    const hash = (user.passwordHash || '').trim();
    const isGoogleOnly = !hash || hash.length < 20;
    if (isGoogleOnly) {
      throw new AppError(
        'Esta cuenta entraba solo con Google. Usa «Empezar de cero con Google» en la pantalla de inicio.',
        400
      );
    }

    let isValidPassword = false;
    try {
      isValidPassword = await bcrypt.compare(password, hash);
    } catch {
      throw new AppError('No se pudo verificar la contraseña', 400);
    }
    if (!isValidPassword) {
      throw new AppError('Contraseña incorrecta', 401);
    }

    await purgeUserFully(user.id);
    res.json({
      message:
        'Tu cuenta anterior fue eliminada por completo. Ya puedes registrarte de nuevo con el mismo correo.',
      purged: true,
    });
  } catch (error) {
    next(error);
  }
};

/** Reactivar cuenta soft-eliminada con Google (mismo correo institucional, dentro del plazo). */
export const reactivateGoogleDeletedAccount = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const { idToken } = req.body;
    if (!idToken || typeof idToken !== 'string') {
      throw new AppError('Token de Google requerido', 400);
    }

    const googleData = await verifyGoogleToken(idToken);
    const { email, sub: googleSub } = googleData;
    if (!email) {
      throw new AppError('No se pudo obtener el email de Google', 400);
    }

    const normalizedEmail = email.toLowerCase().trim();
    if (!normalizedEmail.endsWith('@pascualbravo.edu.co')) {
      throw new AppError('Solo se permiten cuentas @pascualbravo.edu.co', 403);
    }

    const user = await prisma.user.findUnique({ where: { email: normalizedEmail } });
    if (!user?.deletedAt) {
      throw new AppError('No hay cuenta eliminada para reactivar con este Google', 400);
    }
    if (!isWithinAccountRecoveryWindow(user.deletedAt)) {
      throw new AppError(
        'El plazo de un mes para recuperar esta cuenta ya venció. Crea una cuenta nueva.',
        410
      );
    }
    if (user.firebaseUid && user.firebaseUid !== googleSub) {
      throw new AppError('Esta cuenta está asociada a otra cuenta de Google', 403);
    }

    const reactivated = await prisma.user.update({
      where: { id: user.id },
      data: {
        deletedAt: null,
        isActive: true,
        firebaseUid: googleSub,
      },
    });

    const profileRaw = await prisma.profile.findUnique({ where: { userId: reactivated.id } });

    const token = jwt.sign({ userId: reactivated.id }, config.jwt.secret, {
      expiresIn: config.jwt.expiresIn,
    } as any);
    const refreshToken = jwt.sign({ userId: reactivated.id }, config.jwt.refreshSecret, {
      expiresIn: config.jwt.refreshExpiresIn,
    } as any);

    logger.info(`Cuenta reactivada vía Google: ${reactivated.id}`);
    res.json({
      message: 'Cuenta reactivada correctamente',
      token,
      refreshToken,
      user: buildAuthClientUser(reactivated, profileRaw),
    });
  } catch (error) {
    next(error);
  }
};

/** Reiniciar de cero con Google: borra la cuenta en periodo de gracia y crea una nueva (sin perfil previo). */
export const restartFreshGoogleDeletedAccount = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const { idToken } = req.body;
    if (!idToken || typeof idToken !== 'string') {
      throw new AppError('Token de Google requerido', 400);
    }

    const googleData = await verifyGoogleToken(idToken);
    const { email, sub: googleSub } = googleData;
    if (!email) {
      throw new AppError('No se pudo obtener el email de Google', 400);
    }

    const normalizedEmail = email.toLowerCase().trim();
    if (!normalizedEmail.endsWith('@pascualbravo.edu.co')) {
      throw new AppError('Solo se permiten cuentas @pascualbravo.edu.co', 403);
    }

    const user = await prisma.user.findUnique({ where: { email: normalizedEmail } });
    if (!user?.deletedAt) {
      throw new AppError('No hay cuenta eliminada para reiniciar con este Google', 400);
    }
    if (!isWithinAccountRecoveryWindow(user.deletedAt)) {
      throw new AppError(
        'El plazo de un mes para reiniciar esta cuenta ya venció. Usa registro o inicio de sesión.',
        410
      );
    }
    if (user.firebaseUid && user.firebaseUid !== googleSub) {
      throw new AppError('Esta cuenta está asociada a otra cuenta de Google', 403);
    }

    await purgeUserFully(user.id);
    const newUser = await prisma.user.create({
      data: {
        email: normalizedEmail,
        passwordHash: '',
        dateOfBirth: new Date('2000-01-01'),
        verified: true,
        firebaseUid: googleSub,
      },
    });

    const profileRaw2 = await prisma.profile.findUnique({ where: { userId: newUser.id } });

    const token = jwt.sign({ userId: newUser.id }, config.jwt.secret, {
      expiresIn: config.jwt.expiresIn,
    } as any);
    const refreshToken = jwt.sign({ userId: newUser.id }, config.jwt.refreshSecret, {
      expiresIn: config.jwt.refreshExpiresIn,
    } as any);

    logger.info(`Reinicio de cero vía Google tras eliminación: ${normalizedEmail}`);
    res.json({
      message: 'Cuenta nueva creada. Completa tu perfil.',
      token,
      refreshToken,
      user: buildAuthClientUser(newUser, profileRaw2),
    });
  } catch (error) {
    next(error);
  }
};

// Reactivar cuenta eliminada (correo + contraseña, dentro del plazo de un mes)
export const reactivateAccount = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { email, password } = req.body;
    const normalizedEmail = normalizeAuthEmail(typeof email === 'string' ? email : '');

    const user = await prisma.user.findUnique({ where: { email: normalizedEmail } });
    if (!user) {
      throw new AppError('No se encontró la cuenta', 404);
    }

    if (!user.deletedAt) {
      throw new AppError('La cuenta no está eliminada', 400);
    }

    if (!isWithinAccountRecoveryWindow(user.deletedAt)) {
      throw new AppError(
        'El plazo de un mes para recuperar tu cuenta ya venció. Puedes crear una cuenta nueva desde registro.',
        410
      );
    }

    const hash = (user.passwordHash || '').trim();
    const isGoogleOnly = !hash || hash.length < 20;
    if (isGoogleOnly) {
      throw new AppError(
        'Esta cuenta solo tenía acceso con Google. Usa «Reactivar con Google» en la pantalla de inicio.',
        400
      );
    }

    let isValidPassword = false;
    try {
      isValidPassword = await bcrypt.compare(password, hash);
    } catch {
      throw new AppError('No se pudo verificar la contraseña', 400);
    }
    if (!isValidPassword) {
      throw new AppError('Contraseña incorrecta', 401);
    }

    const reactivated = await prisma.user.update({
      where: { id: user.id },
      data: { deletedAt: null, isActive: true },
    });

    const token = jwt.sign({ userId: reactivated.id }, config.jwt.secret, {
      expiresIn: config.jwt.expiresIn,
    } as any);
    const refreshToken = jwt.sign({ userId: reactivated.id }, config.jwt.refreshSecret, {
      expiresIn: config.jwt.refreshExpiresIn,
    } as any);

    const profileRaw = await prisma.profile.findUnique({ where: { userId: reactivated.id } });

    logger.info(`Cuenta reactivada: ${reactivated.id}`);
    res.json({
      message: 'Cuenta reactivada correctamente',
      token,
      refreshToken,
      user: buildAuthClientUser(reactivated, profileRaw),
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Verifica un ID token de Google usando la API pública de Google.
 * No requiere librerías externas — usa https nativo.
 */
function verifyGoogleToken(idToken: string): Promise<{
  email: string;
  name?: string;
  picture?: string;
  sub: string;
  email_verified?: string;
}> {
  return new Promise((resolve, reject) => {
    const url = `https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(idToken)}`;
    https.get(url, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data) as Record<string, unknown>;
          if (parsed.error) {
            return reject(new AppError('Token de Google inválido', 401));
          }
          const expectedAud = config.google.clientId?.trim();
          if (expectedAud) {
            const aud = parsed.aud;
            const audOk =
              aud === expectedAud ||
              (Array.isArray(aud) && aud.some((a) => a === expectedAud));
            if (!audOk) {
              logger.warn(
                `Google id_token aud no coincide con GOOGLE_CLIENT_ID del servidor. aud=${JSON.stringify(aud)}`
              );
              return reject(
                new AppError(
                  'El Client ID del servidor (GOOGLE_CLIENT_ID en Back/.env) no coincide con el de la app. Debe ser el mismo cliente «Aplicación web» que en Google Cloud y el mismo que usa el front.',
                  401
                )
              );
            }
          }
          if (parsed.email_verified !== 'true') {
            return reject(new AppError('Email de Google no verificado', 401));
          }
          resolve(parsed as any);
        } catch {
          reject(new AppError('Error al verificar token de Google', 500));
        }
      });
    }).on('error', () => {
      reject(new AppError('Error de conexión con Google', 500));
    });
  });
}
