import { Response, NextFunction } from 'express';
import { PrismaClient } from '@prisma/client';
import { AuthRequest } from '../middleware/auth';
import { AppError } from '../middleware/errorHandler';
import { snapApproximatePublicCoordinate } from '../lib/geoPrivacy';

const prisma = new PrismaClient();

/** Punto de mapa público (~1 km) a partir del usuario en memoria; null si no comparte ubicación. */
function approxCoordsFromUserRow(
  u:
    | {
        locationEnabled: boolean;
        location: { latitude: number; longitude: number } | null;
      }
    | null
    | undefined
): { lat: number; lng: number } | null {
  if (!u?.locationEnabled || !u.location) return null;
  return snapApproximatePublicCoordinate(u.location.latitude, u.location.longitude);
}

/** Punto de mapa público (~1 km); null si el creador no comparte ubicación. */
async function approxMapForCreator(creatorId: string): Promise<{ approxMapLat: number | null; approxMapLng: number | null }> {
  const u = await prisma.user.findUnique({
    where: { id: creatorId },
    select: { locationEnabled: true, location: { select: { latitude: true, longitude: true } } },
  });
  const c = approxCoordsFromUserRow(u);
  if (!c) return { approxMapLat: null, approxMapLng: null };
  return { approxMapLat: c.lat, approxMapLng: c.lng };
}

const planWithDetails = {
  include: {
    creator: { select: { id: true, email: true, profile: { select: { name: true, photos: true } } } },
    participants: {
      where: { status: 'JOINED' },
      include: { user: { select: { id: true, profile: { select: { name: true, photos: true } } } } },
    },
  },
};

function formatPlan(plan: any) {
  return {
    ...plan,
    creator: {
      ...plan.creator,
      profile: plan.creator?.profile
        ? {
            ...plan.creator.profile,
            photos: (() => { try { return JSON.parse(plan.creator.profile.photos); } catch { return []; } })(),
          }
        : null,
    },
    participants: plan.participants.map((p: any) => ({
      ...p,
      user: {
        ...p.user,
        profile: p.user?.profile
          ? {
              ...p.user.profile,
              photos: (() => { try { return JSON.parse(p.user.profile.photos); } catch { return []; } })(),
            }
          : null,
      },
    })),
    participantCount: plan.participants.length,
  };
}

// GET /api/plans/map — solo zonas aproximadas + tu punto aproximado si compartes ubicación
export const getPlansMap = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.userId!;
    const me = await prisma.user.findUnique({
      where: { id: userId },
      select: { locationEnabled: true, location: { select: { latitude: true, longitude: true } } },
    });

    let meApprox: { approxLat: number; approxLng: number } | null = null;
    if (me?.locationEnabled && me.location) {
      const s = snapApproximatePublicCoordinate(me.location.latitude, me.location.longitude);
      meApprox = { approxLat: s.lat, approxLng: s.lng };
    }

    const plans = await prisma.plan.findMany({
      where: { status: 'ACTIVE', isPublic: true },
      orderBy: { date: 'asc' },
      select: {
        id: true,
        title: true,
        date: true,
        location: true,
        category: true,
        creatorId: true,
        approxMapLat: true,
        approxMapLng: true,
      },
    });

    const creatorIds = [...new Set(plans.map((p) => p.creatorId))];
    const creators = creatorIds.length
      ? await prisma.user.findMany({
          where: { id: { in: creatorIds } },
          select: {
            id: true,
            locationEnabled: true,
            location: { select: { latitude: true, longitude: true } },
          },
        })
      : [];
    const creatorById = new Map(creators.map((c) => [c.id, c]));

    const backfill: { id: string; lat: number; lng: number }[] = [];
    const pins: {
      id: string;
      title: string;
      date: Date;
      locationLabel: string | null;
      category: string;
      approxLat: number;
      approxLng: number;
    }[] = [];

    for (const p of plans) {
      const hadStored =
        p.approxMapLat != null &&
        p.approxMapLng != null &&
        Number.isFinite(p.approxMapLat) &&
        Number.isFinite(p.approxMapLng);

      let lat = hadStored ? p.approxMapLat! : null;
      let lng = hadStored ? p.approxMapLng! : null;

      if (!hadStored) {
        const snap = approxCoordsFromUserRow(creatorById.get(p.creatorId));
        if (snap) {
          lat = snap.lat;
          lng = snap.lng;
          backfill.push({ id: p.id, lat: snap.lat, lng: snap.lng });
        }
      }

      if (lat != null && lng != null) {
        pins.push({
          id: p.id,
          title: p.title,
          date: p.date,
          locationLabel: p.location,
          category: p.category,
          approxLat: lat,
          approxLng: lng,
        });
      }
    }

    if (backfill.length) {
      await prisma.$transaction(
        backfill.map((b) =>
          prisma.plan.update({
            where: { id: b.id },
            data: { approxMapLat: b.lat, approxMapLng: b.lng },
          })
        )
      );
    }

    res.json({
      plans: pins.map((p) => ({
        id: p.id,
        title: p.title,
        date: p.date,
        locationLabel: p.locationLabel,
        category: p.category,
        approxLat: p.approxLat,
        approxLng: p.approxLng,
      })),
      me: meApprox,
    });
  } catch (error) {
    next(error);
  }
};

// GET /api/plans — todos los planes activos
export const getPlans = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const plans = await prisma.plan.findMany({
      where: { status: 'ACTIVE', isPublic: true },
      orderBy: { date: 'asc' },
      ...planWithDetails,
    });
    res.json(plans.map(formatPlan));
  } catch (error) {
    next(error);
  }
};

// GET /api/plans/mine — mis planes (creados + donde participo)
export const getMyPlans = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.userId!;
    const plans = await prisma.plan.findMany({
      where: {
        OR: [
          { creatorId: userId },
          { participants: { some: { userId, status: 'JOINED' } } },
        ],
      },
      orderBy: { date: 'asc' },
      ...planWithDetails,
    });
    res.json(plans.map(formatPlan));
  } catch (error) {
    next(error);
  }
};

// POST /api/plans — crear plan
export const createPlan = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.userId!;
    const { title, description, category, date, location, maxParticipants, isPublic } = req.body;

    if (!title?.trim()) throw new AppError('El título es obligatorio', 400);
    if (!date) throw new AppError('La fecha es obligatoria', 400);

    const approx = await approxMapForCreator(userId);

    const plan = await prisma.plan.create({
      data: {
        creatorId: userId,
        title: title.trim(),
        description: description?.trim() || null,
        category: category || 'SOCIAL',
        date: new Date(date),
        location: location?.trim() || null,
        approxMapLat: approx.approxMapLat,
        approxMapLng: approx.approxMapLng,
        maxParticipants: maxParticipants ? parseInt(maxParticipants) : null,
        isPublic: isPublic !== false,
      },
      ...planWithDetails,
    });
    res.status(201).json(formatPlan(plan));
  } catch (error) {
    next(error);
  }
};

// POST /api/plans/:id/join — unirse a un plan
export const joinPlan = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.userId!;
    const { id } = req.params;

    const plan = await prisma.plan.findUnique({ where: { id }, include: { participants: { where: { status: 'JOINED' } } } });
    if (!plan) throw new AppError('Plan no encontrado', 404);
    if (plan.creatorId === userId) throw new AppError('Ya eres el creador del plan', 400);
    if (plan.status !== 'ACTIVE') throw new AppError('Este plan ya no está activo', 400);

    const existing = await prisma.planParticipant.findUnique({ where: { planId_userId: { planId: id, userId } } });
    if (existing?.status === 'JOINED') throw new AppError('Ya estás en este plan', 400);

    if (plan.maxParticipants && plan.participants.length >= plan.maxParticipants) {
      throw new AppError('El plan ya está lleno', 400);
    }

    await prisma.planParticipant.upsert({
      where: { planId_userId: { planId: id, userId } },
      create: { planId: id, userId, status: 'JOINED' },
      update: { status: 'JOINED' },
    });

    const updated = await prisma.plan.findUnique({ where: { id }, ...planWithDetails });
    res.json(formatPlan(updated));
  } catch (error) {
    next(error);
  }
};

// POST /api/plans/:id/add-participant — el creador agrega a un match al plan
export const addPlanParticipant = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const creatorId = req.userId!;
    const { id } = req.params;
    const targetUserId = typeof req.body?.userId === 'string' ? req.body.userId.trim() : '';

    if (!targetUserId) throw new AppError('Indica el usuario a agregar', 400);

    const plan = await prisma.plan.findUnique({
      where: { id },
      include: { participants: { where: { status: 'JOINED' } } },
    });
    if (!plan) throw new AppError('Plan no encontrado', 404);
    if (plan.creatorId !== creatorId) throw new AppError('Solo el creador puede agregar participantes', 403);
    if (plan.status !== 'ACTIVE') throw new AppError('Este plan ya no está activo', 400);
    if (targetUserId === creatorId) throw new AppError('No puedes agregarte a ti mismo así', 400);

    const match = await prisma.match.findFirst({
      where: {
        isActive: true,
        OR: [
          { user1Id: creatorId, user2Id: targetUserId },
          { user1Id: targetUserId, user2Id: creatorId },
        ],
      },
    });
    if (!match) throw new AppError('Solo puedes agregar a personas con las que tengas match', 403);

    if (plan.maxParticipants != null && plan.participants.length >= plan.maxParticipants) {
      throw new AppError('El plan ya está lleno', 400);
    }

    const existing = await prisma.planParticipant.findUnique({
      where: { planId_userId: { planId: id, userId: targetUserId } },
    });
    if (existing?.status === 'JOINED') throw new AppError('Esa persona ya está en el plan', 400);

    await prisma.planParticipant.upsert({
      where: { planId_userId: { planId: id, userId: targetUserId } },
      create: { planId: id, userId: targetUserId, status: 'JOINED' },
      update: { status: 'JOINED' },
    });

    const updated = await prisma.plan.findUnique({ where: { id }, ...planWithDetails });
    res.json(formatPlan(updated));
  } catch (error) {
    next(error);
  }
};

// DELETE /api/plans/:id/leave — salir de un plan
export const leavePlan = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.userId!;
    const { id } = req.params;

    await prisma.planParticipant.updateMany({
      where: { planId: id, userId },
      data: { status: 'LEFT' },
    });
    res.json({ message: 'Saliste del plan' });
  } catch (error) {
    next(error);
  }
};

// PATCH /api/plans/:id — editar plan (solo el creador)
export const updatePlan = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.userId!;
    const { id } = req.params;
    const { title, description, category, date, location, maxParticipants } = req.body;

    const plan = await prisma.plan.findUnique({ where: { id } });
    if (!plan) throw new AppError('Plan no encontrado', 404);
    if (plan.creatorId !== userId) throw new AppError('No tienes permiso para editar este plan', 403);

    const approx = await approxMapForCreator(userId);

    const updated = await prisma.plan.update({
      where: { id },
      data: {
        ...(title?.trim() ? { title: title.trim() } : {}),
        description: description?.trim() || null,
        ...(category ? { category } : {}),
        ...(date ? { date: new Date(date) } : {}),
        location: location?.trim() || null,
        approxMapLat: approx.approxMapLat,
        approxMapLng: approx.approxMapLng,
        maxParticipants: maxParticipants ? parseInt(maxParticipants) : null,
      },
      ...planWithDetails,
    });
    res.json(formatPlan(updated));
  } catch (error) {
    next(error);
  }
};

// DELETE /api/plans/:id — cancelar plan (solo el creador)
export const cancelPlan = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.userId!;
    const { id } = req.params;

    const plan = await prisma.plan.findUnique({ where: { id } });
    if (!plan) throw new AppError('Plan no encontrado', 404);
    if (plan.creatorId !== userId) throw new AppError('No tienes permiso para cancelar este plan', 403);

    await prisma.plan.update({ where: { id }, data: { status: 'CANCELLED' } });
    res.json({ message: 'Plan cancelado' });
  } catch (error) {
    next(error);
  }
};
