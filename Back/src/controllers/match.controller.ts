import { Response, NextFunction } from 'express';
import { PrismaClient, Prisma } from '@prisma/client';
import { AuthRequest } from '../middleware/auth';
import { AppError } from '../middleware/errorHandler';
import { emitToUser } from '../realtime';
import { getReportedUserIdsForReporter } from '../lib/reportedByReporter';

const prisma = new PrismaClient();

function firstProfilePhotoFromStored(photos?: string | null): string | undefined {
  if (!photos?.trim()) return undefined;
  try {
    const arr = JSON.parse(photos) as unknown;
    if (Array.isArray(arr) && typeof arr[0] === 'string' && arr[0].trim()) return arr[0].trim();
  } catch {
    /* noop */
  }
  return undefined;
}

// Función auxiliar para calcular distancia entre dos coordenadas (en km)
function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Radio de la Tierra en km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/** Nunca enviar coordenadas exactas de otros usuarios por JSON. */
function sanitizeDiscoveryUser(user: { location?: unknown; [k: string]: unknown }, distanceKm: number | null) {
  const { location: _loc, ...rest } = user;
  return { ...rest, distance: distanceKm };
}

// Obtener usuarios para discovery
export const getDiscoveryUsers = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.userId!;

    const me = await prisma.user.findUnique({
      where: { id: userId },
      include: { profile: true, location: true },
    });

    if (!me?.profile) {
      throw new AppError('Completa tu perfil', 400);
    }

    const canUseMyGps = Boolean(me.locationEnabled && me.location);
    const iShowDistance = me.profile.showDistance !== false;

    const swipes = await prisma.swipe.findMany({
      where: { userId },
      select: { targetUserId: true },
    });
    const seenUserIds = swipes.map((s) => s.targetUserId);
    const reportedIds = await getReportedUserIdsForReporter(prisma, userId);
    const excludeIds = [...new Set([userId, ...seenUserIds, ...reportedIds])].filter(Boolean) as string[];

    const candidateFilter: Prisma.UserWhereInput = {
      isActive: true,
      isBanned: false,
      deletedAt: null,
      profile: { isNot: null },
      location: { isNot: null },
    };
    if (excludeIds.length > 0) {
      candidateFilter.id = { notIn: excludeIds };
    }

    const users = await prisma.user.findMany({
      where: candidateFilter,
      include: {
        profile: true,
        location: true,
      },
      take: 100,
    });

    const ranked = users.map((user) => {
      let distanceKm: number | null = null;
      if (
        canUseMyGps &&
        iShowDistance &&
        user.profile?.showDistance !== false &&
        user.location &&
        me.location
      ) {
        distanceKm = calculateDistance(
          me.location.latitude,
          me.location.longitude,
          user.location.latitude,
          user.location.longitude
        );
      }
      return sanitizeDiscoveryUser(user as { location?: unknown; [k: string]: unknown }, distanceKm);
    });

    ranked.sort((a: any, b: any) => {
      const da = a.distance ?? Number.POSITIVE_INFINITY;
      const db = b.distance ?? Number.POSITIVE_INFINITY;
      if (da !== db) return da - db;
      return String(a.profile?.name ?? '').localeCompare(String(b.profile?.name ?? ''), 'es');
    });

    const maxKm = me.profile.maxDistance;
    const hasAnyDistance = ranked.some((u: any) => u.distance != null);
    const withinRadius =
      hasAnyDistance && maxKm != null && maxKm > 0
        ? ranked.filter((u: any) => u.distance != null && u.distance <= maxKm)
        : ranked;

    const usersOut = withinRadius.length > 0 ? withinRadius : ranked.slice(0, 30);

    res.json(usersOut);
  } catch (error) {
    next(error);
  }
};

// Dar like
export const likeUser = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.userId!;
    const { targetUserId, isSuperLike } = req.body;

    // Registrar swipe
    await prisma.swipe.create({
      data: {
        userId,
        targetUserId,
        isLike: true,
      },
    });

    // Registrar like
    await prisma.like.create({
      data: {
        userId,
        targetUserId,
        isSuperLike: isSuperLike || false,
      },
    });

    // Verificar si hay match mutuo
    const reciprocalLike = await prisma.like.findFirst({
      where: {
        userId: targetUserId,
        targetUserId: userId,
      },
    });

    let match = null;
    if (reciprocalLike) {
      // Crear match
      match = await prisma.match.create({
        data: {
          user1Id: userId < targetUserId ? userId : targetUserId,
          user2Id: userId < targetUserId ? targetUserId : userId,
        },
        include: {
          user1: { include: { profile: true } },
          user2: { include: { profile: true } },
        },
      });

      /** El que acaba de dar like ya ve la pantalla de celebración; el otro recibe evento in-app. */
      const initiator = match.user1Id === userId ? match.user1 : match.user2;
      emitToUser(targetUserId, 'match_created', {
        matchId: match.id,
        matchedUserId: userId,
        matchedName: initiator?.profile?.name ?? 'Alguien',
        matchedPhotoUri: firstProfilePhotoFromStored(initiator?.profile?.photos ?? null) ?? null,
      });
    }

    res.json({ liked: true, match });
  } catch (error) {
    next(error);
  }
};

// Dar dislike
export const dislikeUser = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.userId!;
    const { targetUserId } = req.body;

    await prisma.swipe.create({
      data: {
        userId,
        targetUserId,
        isLike: false,
      },
    });

    res.json({ disliked: true });
  } catch (error) {
    next(error);
  }
};

// Obtener mis matches (con lastMessage y unreadCount)
export const getMyMatches = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.userId!;

    const matches = await prisma.match.findMany({
      where: {
        OR: [{ user1Id: userId }, { user2Id: userId }],
        isActive: true,
      },
      include: {
        user1: { include: { profile: true } },
        user2: { include: { profile: true } },
        messages: {
          where: { deletedAt: null },
          orderBy: { sentAt: 'desc' },
          take: 1,
        },
      },
      orderBy: { matchedAt: 'desc' },
    });

    // Contar mensajes no leídos por match en paralelo
    const unreadCounts = await Promise.all(
      matches.map(match =>
        prisma.message.count({
          where: {
            matchId: match.id,
            senderId: { not: userId },
            isRead: false,
            deletedAt: null,
          },
        })
      )
    );

    const reportedIds = await getReportedUserIdsForReporter(prisma, userId);
    const reported = new Set(reportedIds);

    const result = matches
      .map((match, i) => {
        const { messages, ...matchData } = match;
        const raw = messages[0];
        const lastMessage = raw
          ? {
              ...raw,
              images: JSON.parse(raw.images),
              attachmentNames: JSON.parse(raw.attachmentNames),
              attachmentTypes: JSON.parse(raw.attachmentTypes),
            }
          : null;
        return { ...matchData, lastMessage, unreadCount: unreadCounts[i] };
      })
      .filter((m) => {
        const other = m.user1Id === userId ? m.user2Id : m.user1Id;
        return !reported.has(other);
      });

    res.json(result);
  } catch (error) {
    next(error);
  }
};

// Deshacer match
export const unmatch = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.userId!;
    const { matchId } = req.params;

    const match = await prisma.match.findUnique({ where: { id: matchId } });
    if (!match || (match.user1Id !== userId && match.user2Id !== userId)) {
      throw new AppError('Match no encontrado', 404);
    }

    await prisma.match.update({
      where: { id: matchId },
      data: {
        isActive: false,
        unmatchedAt: new Date(),
        unmatchedBy: userId,
      },
    });

    res.json({ message: 'Match deshecho' });
  } catch (error) {
    next(error);
  }
};
