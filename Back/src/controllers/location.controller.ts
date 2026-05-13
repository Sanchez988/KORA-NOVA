import { Response, NextFunction } from 'express';
import { PrismaClient } from '@prisma/client';
import { AuthRequest } from '../middleware/auth';
import { AppError } from '../middleware/errorHandler';
import { snapApproximatePublicCoordinate } from '../lib/geoPrivacy';

const prisma = new PrismaClient();

// Toggle activar/desactivar ubicación
export const toggleLocation = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.userId!;
    const { enabled } = req.body;

    const user = await prisma.user.update({
      where: { id: userId },
      data: { locationEnabled: enabled },
      select: {
        id: true,
        locationEnabled: true,
      },
    });

    res.json({
      message: enabled ? 'Ubicación activada' : 'Ubicación desactivada',
      locationEnabled: user.locationEnabled,
    });
  } catch (error) {
    next(error);
  }
};

// Verificar estado de ubicación
export const getLocationStatus = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.userId!;

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { locationEnabled: true },
    });

    if (!user) {
      throw new AppError('Usuario no encontrado', 404);
    }

    res.json({ locationEnabled: user.locationEnabled });
  } catch (error) {
    next(error);
  }
};

// Actualizar ubicación
export const updateLocation = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.userId!;
    const { latitude: rawLat, longitude: rawLng, accuracy: rawAcc } = req.body;

    const lat = Number(rawLat);
    const lng = Number(rawLng);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
      throw new AppError('Coordenadas inválidas', 400);
    }

    let acc: number | null = null;
    if (rawAcc !== undefined && rawAcc !== null && rawAcc !== '') {
      const n = Number(rawAcc);
      acc = Number.isFinite(n) ? n : null;
    }

    // Verificar si el usuario tiene la ubicación activada
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { locationEnabled: true },
    });

    if (!user?.locationEnabled) {
      throw new AppError('La ubicación está desactivada. Actívala en configuración.', 403);
    }

    const location = await prisma.location.upsert({
      where: { userId },
      update: {
        latitude: lat,
        longitude: lng,
        accuracy: acc,
      },
      create: {
        userId,
        latitude: lat,
        longitude: lng,
        accuracy: acc,
      },
    });

    const snapped = snapApproximatePublicCoordinate(lat, lng);
    res.json({
      ...location,
      approxLat: snapped.lat,
      approxLng: snapped.lng,
    });
  } catch (error) {
    next(error);
  }
};

// Obtener mi ubicación
export const getMyLocation = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.userId!;

    const location = await prisma.location.findUnique({ where: { userId } });
    if (!location) {
      throw new AppError('Ubicación no encontrada', 404);
    }

    res.json(location);
  } catch (error) {
    next(error);
  }
};
