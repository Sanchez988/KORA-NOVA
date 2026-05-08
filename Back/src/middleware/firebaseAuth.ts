import { Response, NextFunction } from 'express';
import { AuthRequest } from './auth';
import { AppError } from './errorHandler';
import { verifyFirebaseToken, isFirebaseConfigured } from '../config/firebase';
import { logger } from '../utils/logger';

const ALLOWED_DOMAIN = 'pascualbravo.edu.co';

/**
 * Middleware opcional para autenticación con Firebase
 * Solo se ejecuta si Firebase está configurado
 * Si no está configurado, pasa al siguiente middleware
 */
export const authenticateWithFirebase = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    // Si Firebase no está configurado, usar autenticación JWT tradicional
    if (!isFirebaseConfigured()) {
      logger.debug('Firebase no configurado, usando autenticación JWT estándar');
      return next();
    }

    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new AppError('Token de autenticación requerido', 401);
    }

    const token = authHeader.split('Bearer ')[1];

    try {
      // Verificar token de Firebase
      const decodedToken = await verifyFirebaseToken(token);
      const email = decodedToken.email;

      if (!email) {
        throw new AppError('Email no encontrado en el token', 401);
      }

      // Validar dominio universitario
      const domain = email.split('@')[1];
      if (domain !== ALLOWED_DOMAIN) {
        throw new AppError(
          `Solo se permiten correos del dominio @${ALLOWED_DOMAIN}`,
          403
        );
      }

      // Verificar que el email esté verificado en Firebase
      if (!decodedToken.email_verified) {
        throw new AppError('Por favor verifica tu email antes de continuar', 403);
      }

      // Agregar información del usuario al request
      req.firebaseUser = {
        uid: decodedToken.uid,
        email: email,
        emailVerified: decodedToken.email_verified,
      };

      logger.debug(`Usuario autenticado con Firebase: ${email}`);
      next();
    } catch (error: any) {
      if (error.code === 'auth/id-token-expired') {
        throw new AppError('Token expirado', 401);
      }
      if (error.code === 'auth/argument-error') {
        throw new AppError('Token inválido', 401);
      }
      throw error;
    }
  } catch (error) {
    next(error);
  }
};

/**
 * Middleware para validar que el usuario tenga email verificado en Firebase
 * Solo se ejecuta si Firebase está configurado
 */
export const requireEmailVerified = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    if (!isFirebaseConfigured()) {
      return next();
    }

    if (!req.firebaseUser?.emailVerified) {
      throw new AppError('Debes verificar tu email antes de continuar', 403);
    }

    next();
  } catch (error) {
    next(error);
  }
};
