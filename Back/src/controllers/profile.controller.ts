import { Response, NextFunction } from 'express';
import { PrismaClient, Prisma } from '@prisma/client';
import { AuthRequest } from '../middleware/auth';
import { AppError } from '../middleware/errorHandler';

const prisma = new PrismaClient();

function parseJsonArrayField(raw: string | null | undefined, fallback: unknown[] = []): unknown[] {
  if (!raw || typeof raw !== 'string') return fallback;
  try {
    const v = JSON.parse(raw);
    return Array.isArray(v) ? v : fallback;
  } catch {
    return fallback;
  }
}

/** Evita que un JSON corrupto en DB tumbe la respuesta con 500 */
function profileRowToApiResponse<T extends { photos: string; interests: string; hobbies: string }>(row: T) {
  return {
    ...row,
    photos: parseJsonArrayField(row.photos, []) as string[],
    interests: parseJsonArrayField(row.interests, []) as string[],
    hobbies: parseJsonArrayField(row.hobbies, []) as string[],
  };
}

/** Coercion defensiva: el cliente a veces manda números como cadena JSON. */
function coerceProfileNumericFields(updateData: Record<string, unknown>) {
  for (const key of ['semester', 'minAge', 'maxAge', 'maxDistance'] as const) {
    if (!(key in updateData) || updateData[key] === undefined) continue;
    if (updateData[key] === null) continue;
    if (key === 'maxDistance' && updateData[key] === '') {
      updateData[key] = null;
      continue;
    }
    const raw = updateData[key];
    const num = typeof raw === 'number' ? raw : parseFloat(String(raw));
    if (!Number.isFinite(num)) {
      delete updateData[key];
      continue;
    }
    updateData[key] = Math.trunc(num);
  }
}

const INSTITUTIONAL_EMAIL_SUFFIX = '@pascualbravo.edu.co';

/** Puntos máximos mostrados en el perfil (coinciden con la UI). */
const TRUST_VERIFIED_MAX = 20;
const TRUST_INSTITUTIONAL_MAX = 15;
const TRUST_INTERACTIONS_MAX = 35;
/** Penalización por reporte activo (PENDING / UNDER_REVIEW / RESOLVED), no cuenta DISMISSED. */
const TRUST_REPORT_PENALTY_EACH = -6;
const TRUST_REPORT_PENALTY_FLOOR = -30;
function clampTrust(n: number): number {
  return Math.max(0, Math.min(100, n));
}

// Crear perfil
export const createProfile = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.userId!;
    const { name, bio, gender, program, semester, interests, hobbies, relationshipGoal, photos } = req.body;

    const existingProfile = await prisma.profile.findUnique({ where: { userId } });
    if (existingProfile) {
      throw new AppError('Ya tienes un perfil creado', 400);
    }

    let semesterVal: number | null = null;
    if (semester !== undefined && semester !== null && semester !== '') {
      const n = typeof semester === 'number' ? semester : parseFloat(String(semester));
      if (Number.isFinite(n)) semesterVal = Math.trunc(n);
    }

    const profile = await prisma.profile.create({
      data: {
        userId,
        name,
        bio: bio || '',
        gender,
        program,
        semester: semesterVal,
        photos: JSON.stringify(Array.isArray(photos) ? photos : []),
        interests: JSON.stringify(interests || []),
        hobbies: JSON.stringify(hobbies || []),
        relationshipGoal,
        completeness: 50,
      },
    });

    res.status(201).json(profileRowToApiResponse(profile));
  } catch (error) {
    if (error instanceof AppError) return next(error);
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      /** Doble envío de onboarding: dos INSERT compiten por `profiles.user_id` único */
      return next(new AppError('Ya tienes un perfil creado', 400));
    }
    return next(error);
  }
};

// Obtener mi perfil
export const getMyProfile = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const profile = await prisma.profile.findUnique({
      where: { userId: req.userId! },
    });

    if (!profile) {
      throw new AppError('Perfil no encontrado', 404);
    }

    res.json(profileRowToApiResponse(profile));
  } catch (error) {
    next(error);
  }
};

const PROFILE_WRITABLE_FIELDS = [
  'name',
  'bio',
  'gender',
  'program',
  'semester',
  'photos',
  'interests',
  'hobbies',
  'relationshipGoal',
  'minAge',
  'maxAge',
  'maxDistance',
  'showMeTo',
  'showLastSeen',
  'showDistance',
  'incognitoMode',
  'incognitoUntil',
  'completeness',
] as const;

// Actualizar perfil
export const updateProfile = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.userId!;
    const body = req.body as Record<string, unknown>;
    const updateData: Record<string, unknown> = {};

    for (const key of PROFILE_WRITABLE_FIELDS) {
      if (key in body && body[key] !== undefined) {
        updateData[key] = body[key];
      }
    }

    // Convertir arrays a JSON strings si están presentes
    if (updateData.interests) updateData.interests = JSON.stringify(updateData.interests);
    if (updateData.hobbies) updateData.hobbies = JSON.stringify(updateData.hobbies);
    if (updateData.photos) updateData.photos = JSON.stringify(updateData.photos);

    coerceProfileNumericFields(updateData);

    if (Object.keys(updateData).length === 0) {
      const existing = await prisma.profile.findUnique({ where: { userId } });
      if (!existing) {
        throw new AppError('Perfil no encontrado', 404);
      }
      return res.json(profileRowToApiResponse(existing));
    }

    try {
      const profile = await prisma.profile.update({
        where: { userId },
        data: updateData,
      });

      res.json(profileRowToApiResponse(profile));
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2025') {
        return next(new AppError('Perfil no encontrado', 404));
      }
      if (e instanceof Prisma.PrismaClientValidationError) {
        return next(
          new AppError('Datos de perfil no válidos (edad, semestre o distancia)', 400)
        );
      }
      throw e;
    }
  } catch (error) {
    if (error instanceof AppError) return next(error);
    return next(error);
  }
};

// Obtener perfil por ID
export const getProfileById = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { userId } = req.params;
    const viewerId = req.userId!;

    if (viewerId !== userId) {
      const hidden = await prisma.report.findFirst({
        where: { reporterId: viewerId, reportedUserId: userId },
        select: { id: true },
      });
      if (hidden) {
        throw new AppError('Perfil no disponible', 404);
      }
    }

    const profile = await prisma.profile.findUnique({
      where: { userId },
      include: {
        user: {
          select: {
            id: true,
            email: true,
          },
        },
      },
    });

    if (!profile) {
      throw new AppError('Perfil no encontrado', 404);
    }

    res.json(profileRowToApiResponse(profile));
  } catch (error) {
    next(error);
  }
};

// Eliminar foto
export const deletePhoto = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { photoUrl } = req.body;
    const userId = req.userId!;

    const profile = await prisma.profile.findUnique({ where: { userId } });
    if (!profile) {
      throw new AppError('Perfil no encontrado', 404);
    }

    const photos = parseJsonArrayField(profile.photos, []) as string[];
    const updatedPhotos = photos.filter(photo => photo !== photoUrl);

    await prisma.profile.update({
      where: { userId },
      data: { photos: JSON.stringify(updatedPhotos) },
    });

    res.json({ message: 'Foto eliminada' });
  } catch (error) {
    next(error);
  }
};

// Toggle modo incógnito
export const toggleIncognitoMode = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.userId!;
    const { enabled, duration } = req.body;

    const incognitoUntil = enabled && duration
      ? new Date(Date.now() + duration)
      : null;

    const profile = await prisma.profile.update({
      where: { userId },
      data: {
        incognitoMode: enabled,
        incognitoUntil,
      },
    });

    res.json(profile);
  } catch (error) {
    next(error);
  }
};

// GET /api/profile/stats — estadísticas del usuario para insignias + score de confianza
export const getStats = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.userId!;

    const [
      user,
      matchCount,
      messagesSent,
      likesReceived,
      plansCreated,
      activeReportsCount,
    ] = await Promise.all([
      prisma.user.findUnique({
        where: { id: userId },
        select: { email: true, verified: true },
      }),
      prisma.match.count({
        where: {
          OR: [{ user1Id: userId }, { user2Id: userId }],
          isActive: true,
        },
      }),
      prisma.message.count({ where: { senderId: userId } }),
      prisma.swipe.count({
        where: { targetUserId: userId, isLike: true },
      }),
      prisma.plan.count({ where: { creatorId: userId } }),
      prisma.report.count({
        where: {
          reportedUserId: userId,
          status: { not: 'DISMISSED' },
        },
      }),
    ]);

    if (!user) {
      throw new AppError('Usuario no encontrado', 404);
    }

    const verifiedPoints = user.verified ? TRUST_VERIFIED_MAX : 0;

    const emailLower = user.email.toLowerCase();
    const institutionalPoints = emailLower.endsWith(INSTITUTIONAL_EMAIL_SUFFIX)
      ? TRUST_INSTITUTIONAL_MAX
      : 0;

    const interactionRaw =
      messagesSent * 0.1 + likesReceived * 0.12 + matchCount * 4 + plansCreated * 2;
    const interactionPoints = Math.min(
      TRUST_INTERACTIONS_MAX,
      Math.round(interactionRaw)
    );

    const reportsPenaltyRaw = TRUST_REPORT_PENALTY_EACH * activeReportsCount;
    const reportsPenalty = Math.max(
      TRUST_REPORT_PENALTY_FLOOR,
      reportsPenaltyRaw
    );

    const partsSum =
      verifiedPoints +
      institutionalPoints +
      interactionPoints +
      reportsPenalty;
    const trustScore = clampTrust(partsSum);

    res.json({
      matchCount,
      messagesSent,
      likesReceived,
      plansCreated,
      trustScore,
      trustBreakdown: {
        verified: { points: verifiedPoints, max: TRUST_VERIFIED_MAX },
        institutionalEmail: {
          points: institutionalPoints,
          max: TRUST_INSTITUTIONAL_MAX,
        },
        interactions: { points: interactionPoints, max: TRUST_INTERACTIONS_MAX },
        reports: {
          count: activeReportsCount,
          penalty: reportsPenalty,
          maxPenalty: TRUST_REPORT_PENALTY_FLOOR,
        },
      },
    });
  } catch (error) {
    next(error);
  }
};
