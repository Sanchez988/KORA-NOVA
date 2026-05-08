import rateLimit from 'express-rate-limit';
import { config } from '../config';

export const rateLimiter = rateLimit({
  windowMs: config.rateLimit.windowMs,
  max: config.rateLimit.maxRequests,
  message: {
    message: 'Demasiadas solicitudes desde esta IP, por favor intenta más tarde.',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Rate limiter específico para autenticación (más estricto)
export const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 5, // máximo 5 intentos
  skipSuccessfulRequests: true,
  skip: () => config.env !== 'production',
  message: {
    message: 'Demasiados intentos de inicio de sesión. Por favor intenta más tarde.',
  },
});
