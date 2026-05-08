import { Request, Response, NextFunction } from 'express';
import { Prisma } from '@prisma/client';
import multer from 'multer';
import { logger } from '../utils/logger';

function isDbConnectionError(err: Error): boolean {
  if (err instanceof Prisma.PrismaClientInitializationError) return true;
  if (
    err instanceof Prisma.PrismaClientKnownRequestError &&
    (err.code === 'P1001' || err.code === 'P1003')
  ) {
    return true;
  }
  return /Can't reach database server|connection refused|ECONNREFUSED/i.test(err.message || '');
}

export class AppError extends Error {
  statusCode: number;
  isOperational: boolean;
  /** Campos extra en JSON (p. ej. `code`, `recoverableUntil`). */
  extras?: Record<string, unknown>;

  constructor(message: string, statusCode: number, extras?: Record<string, unknown>) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = true;
    this.extras = extras;

    Error.captureStackTrace(this, this.constructor);
  }
}

export const errorHandler = (
  err: Error | AppError,
  req: Request,
  res: Response,
  _next: NextFunction
) => {
  if (err instanceof AppError) {
    logger.error(`${err.statusCode} - ${err.message} - ${req.originalUrl} - ${req.method} - ${req.ip}`);
    
    return res.status(err.statusCode).json({
      status: 'error',
      message: err.message,
      ...(err.extras && typeof err.extras === 'object' ? err.extras : {}),
    });
  }

  // Error no manejado
  logger.error(`500 - ${err.message} - ${req.originalUrl} - ${req.method} - ${req.ip}`);
  logger.error(err.stack);

  if (isDbConnectionError(err)) {
    return res.status(503).json({
      status: 'error',
      message:
        'Sin conexión con la base de datos. Arranca PostgreSQL, revisa DATABASE_URL en Back/.env y ejecuta prisma migrate.',
    });
  }

  if (err instanceof Prisma.PrismaClientValidationError) {
    logger.error(`${req.originalUrl} PrismaValidation: ${err.message}`);
    return res.status(400).json({
      status: 'error',
      message: 'Los datos enviados no coinciden con el esquema (revisa números y texto).',
    });
  }

  if (err instanceof multer.MulterError && err.code === 'LIMIT_FILE_SIZE') {
    return res.status(413).json({
      status: 'error',
      message: 'La imagen excede el tamaño máximo permitido. Prueba con una foto más liviana.',
    });
  }

  const rawMsg = String((err as Error).message || err || '');
  if (/invalid signature|invalid cloud_name|cloudinary|cloud_name/i.test(rawMsg)) {
    return res.status(502).json({
      status: 'error',
      message:
        'Cloudinary rechazó la subida (cloud name o credenciales incorrectas). En Back/.env revisa CLOUDINARY_URL o CLOUDINARY_CLOUD_NAME/API_KEY/API_SECRET desde https://console.cloudinary.com (sin espacios ni comillas de más).',
    });
  }

  return res.status(500).json({
    status: 'error',
    message: 'Algo salió mal en el servidor',
  });
};
