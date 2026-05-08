import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config';
import { AppError } from './errorHandler';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export interface AuthRequest extends Request {
  userId?: string;
  user?: any;
  firebaseUser?: {
    uid: string;
    email: string;
    emailVerified: boolean;
  };
  body: any;
  params: any;
}

export const authenticate = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');

    if (!token) {
      throw new AppError('No se proporcionó token de autenticación', 401);
    }

    const decoded = jwt.verify(token, config.jwt.secret) as { userId: string };
    
    // Verificar que el usuario existe y está activo
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: {
        id: true,
        email: true,
        verified: true,
        isActive: true,
        isBanned: true,
      },
    });

    if (!user) {
      throw new AppError('Usuario no encontrado', 404);
    }

    if (!user.verified) {
      throw new AppError('Por favor verifica tu correo electrónico', 403);
    }

    if (user.isBanned) {
      throw new AppError('Tu cuenta ha sido suspendida', 403);
    }

    if (!user.isActive) {
      throw new AppError('Tu cuenta está desactivada', 403);
    }

    req.userId = decoded.userId;
    req.user = user;
    next();
  } catch (error) {
    if (error instanceof jwt.JsonWebTokenError) {
      next(new AppError('Token inválido', 401));
    } else if (error instanceof jwt.TokenExpiredError) {
      next(new AppError('Token expirado', 401));
    } else {
      next(error);
    }
  }
};
