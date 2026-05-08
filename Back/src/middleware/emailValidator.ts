import { Response, NextFunction } from 'express';
import { AuthRequest } from './auth';
import { AppError } from './errorHandler';

// Dominio permitido para registro
const ALLOWED_DOMAIN = 'pascualbravo.edu.co';

/**
 * Middleware para validar que el email pertenezca al dominio de Pascual Bravo
 */
export const validateUniversityEmail = (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  const { email } = req.body;

  if (!email) {
    throw new AppError('El email es requerido', 400);
  }

  // Convertir a minúsculas para comparación
  const normalizedEmail = email.toLowerCase().trim();

  // Validar formato de email
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(normalizedEmail)) {
    throw new AppError('Formato de email inválido', 400);
  }

  // Extraer dominio del email
  const domain = normalizedEmail.split('@')[1];

  // Validar que el dominio sea el permitido
  if (domain !== ALLOWED_DOMAIN) {
    throw new AppError(
      `Solo se permiten correos del dominio @${ALLOWED_DOMAIN}`,
      403
    );
  }

  // Actualizar el email en el body con la versión normalizada
  req.body.email = normalizedEmail;

  next();
};

/**
 * Función auxiliar para verificar si un email es del dominio permitido
 */
export const isUniversityEmail = (email: string): boolean => {
  const normalizedEmail = email.toLowerCase().trim();
  const domain = normalizedEmail.split('@')[1];
  return domain === ALLOWED_DOMAIN;
};

/**
 * Función auxiliar para extraer el username del email universitario
 * Ejemplo: juan.perez@pascualbravo.edu.co -> juan.perez
 */
export const extractUsername = (email: string): string => {
  return email.split('@')[0];
};
