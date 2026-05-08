import { Response, NextFunction } from 'express';
import { PrismaClient } from '@prisma/client';
import { AuthRequest } from '../middleware/auth';
import { AppError } from '../middleware/errorHandler';

const prisma = new PrismaClient();

const REPORT_REASON_VALUES = new Set([
  'INAPPROPRIATE_CONTENT',
  'HARASSMENT',
  'IMPERSONATION',
  'UNDERAGE',
  'OTHER',
]);

const CONFIRM_MESSAGE = 'Tu reporte fue recibido. Lo revisaremos pronto';
const REVOKE_MESSAGE = 'Reporte retirado. Esta persona volverá a mostrarse para ti cuando corresponda.';

export const createReport = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const reporterId = req.userId!;
    const { reportedUserId, reason, description } = req.body as {
      reportedUserId?: string;
      reason?: string;
      description?: string;
    };

    if (!reportedUserId || typeof reportedUserId !== 'string') {
      throw new AppError('Usuario a reportar no válido', 400);
    }
    if (reportedUserId === reporterId) {
      throw new AppError('No puedes reportarte a ti mismo', 400);
    }
    if (!reason || typeof reason !== 'string' || !REPORT_REASON_VALUES.has(reason)) {
      throw new AppError('Motivo de reporte no válido', 400);
    }

    let desc: string | null = null;
    if (reason === 'OTHER') {
      if (typeof description !== 'string' || !description.trim()) {
        throw new AppError('Para «Otro» debes describir el motivo del reporte', 400);
      }
      const trimmed = description.trim().slice(0, 2000);
      if (trimmed.length < 4) {
        throw new AppError('El motivo debe tener al menos 4 caracteres', 400);
      }
      desc = trimmed;
    } else if (description != null && description !== '') {
      if (typeof description !== 'string') {
        throw new AppError('Descripción no válida', 400);
      }
      const t = description.trim().slice(0, 2000);
      desc = t || null;
    }

    const target = await prisma.user.findFirst({
      where: {
        id: reportedUserId,
        isActive: true,
        deletedAt: null,
      },
      select: { id: true },
    });
    if (!target) {
      throw new AppError('Usuario no encontrado', 404);
    }

    await prisma.report.create({
      data: {
        reporterId,
        reportedUserId,
        reason,
        description: desc,
        status: 'PENDING',
      },
    });

    res.status(201).json({ message: CONFIRM_MESSAGE });
  } catch (error) {
    next(error);
  }
};

/** GET /api/reports/status/:reportedUserId — si el usuario actual ya reportó a esta persona */
export const getReportStatus = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const reporterId = req.userId!;
    const { reportedUserId } = req.params;
    if (!reportedUserId || typeof reportedUserId !== 'string') {
      throw new AppError('Usuario no válido', 400);
    }
    const n = await prisma.report.count({
      where: { reporterId, reportedUserId },
    });
    res.json({ hasReported: n > 0 });
  } catch (error) {
    next(error);
  }
};

/** DELETE /api/reports/to/:reportedUserId — el denunciante retira todos sus reportes hacia esa persona */
export const revokeReportsToUser = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const reporterId = req.userId!;
    const { reportedUserId } = req.params;
    if (!reportedUserId || typeof reportedUserId !== 'string') {
      throw new AppError('Usuario no válido', 400);
    }
    if (reportedUserId === reporterId) {
      throw new AppError('Operación no válida', 400);
    }

    const result = await prisma.report.deleteMany({
      where: { reporterId, reportedUserId },
    });

    if (result.count === 0) {
      throw new AppError('No hay reportes activos hacia este usuario', 404);
    }

    res.json({ message: REVOKE_MESSAGE, removedCount: result.count });
  } catch (error) {
    next(error);
  }
};

/** GET /api/reports/my-targets — usuarios que el cliente ha reportado (para deshacer desde ajustes) */
export const getMyReportTargets = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const reporterId = req.userId!;
    const grouped = await prisma.report.groupBy({
      by: ['reportedUserId'],
      where: { reporterId },
    });
    const ids = grouped.map((g) => g.reportedUserId);
    if (ids.length === 0) {
      res.json({ targets: [] });
      return;
    }
    const profiles = await prisma.profile.findMany({
      where: { userId: { in: ids } },
      select: { userId: true, name: true },
    });
    const nameById = new Map(profiles.map((p) => [p.userId, p.name] as const));
    res.json({
      targets: ids.map((reportedUserId) => ({
        reportedUserId,
        name: nameById.get(reportedUserId) ?? 'Usuario',
      })),
    });
  } catch (error) {
    next(error);
  }
};
