import { Response, NextFunction } from 'express';
import { PrismaClient } from '@prisma/client';
import { AuthRequest } from '../middleware/auth';
import { AppError } from '../middleware/errorHandler';
import { uploadToCloudinary } from '../services/upload.service';

const prisma = new PrismaClient();

// Crear un story (estado temporal)
export const createStory = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.userId!;
    const { caption } = req.body;

    if (!req.file) {
      throw new AppError('Se requiere una imagen para el story', 400);
    }

    const imageUrl = await uploadToCloudinary(req.file, {
      folder: 'kora/stories',
      transformation: [
        { width: 1080, height: 1920, crop: 'fill' }, // Formato vertical para stories
      ],
    });

    // Crear story con expiración de 24 horas
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 24);

    const story = await prisma.story.create({
      data: {
        userId,
        imageUrl,
        caption,
        expiresAt,
      },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            profile: {
              select: {
                name: true,
                photos: true,
              },
            },
          },
        },
      },
    });

    res.json({
      message: 'Story creado exitosamente',
      story,
    });
  } catch (error) {
    next(error);
  }
};

// Obtener mis stories
export const getMyStories = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.userId!;

    const stories = await prisma.story.findMany({
      where: {
        userId,
        expiresAt: {
          gt: new Date(), // Solo stories que no han expirado
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
      include: {
        views: {
          select: {
            viewerId: true,
            viewedAt: true,
          },
        },
      },
    });

    res.json(stories);
  } catch (error) {
    next(error);
  }
};

// Obtener stories de mis matches
export const getMatchesStories = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.userId!;

    // Obtener IDs de mis matches
    const matches = await prisma.match.findMany({
      where: {
        isActive: true,
        OR: [{ user1Id: userId }, { user2Id: userId }],
      },
      select: {
        user1Id: true,
        user2Id: true,
      },
    });

    const matchUserIds = matches.map((match) =>
      match.user1Id === userId ? match.user2Id : match.user1Id
    );

    // Obtener stories activos de mis matches
    const stories = await prisma.story.findMany({
      where: {
        userId: {
          in: matchUserIds,
        },
        expiresAt: {
          gt: new Date(),
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
      include: {
        user: {
          select: {
            id: true,
            profile: {
              select: {
                name: true,
                photos: true,
              },
            },
          },
        },
        views: {
          where: {
            viewerId: userId,
          },
          select: {
            viewedAt: true,
          },
        },
      },
    });

    // Agrupar stories por usuario
    const storiesByUser = stories.reduce((acc: any, story: any) => {
      const userId = story.user.id;
      if (!acc[userId]) {
        acc[userId] = {
          user: story.user,
          stories: [],
        };
      }
      acc[userId].stories.push({
        id: story.id,
        imageUrl: story.imageUrl,
        caption: story.caption,
        viewCount: story.viewCount,
        expiresAt: story.expiresAt,
        createdAt: story.createdAt,
        viewed: story.views.length > 0,
      });
      return acc;
    }, {});

    res.json(Object.values(storiesByUser));
  } catch (error) {
    next(error);
  }
};

// Ver un story (marcar como visto)
export const viewStory = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.userId!;
    const { storyId } = req.params;

    // Verificar que el story existe y no ha expirado
    const story = await prisma.story.findUnique({
      where: { id: storyId },
    });

    if (!story) {
      throw new AppError('Story no encontrado', 404);
    }

    if (story.expiresAt < new Date()) {
      throw new AppError('Este story ya expiró', 410);
    }

    // Verificar que el usuario tiene permiso para ver el story (es un match)
    if (story.userId !== userId) {
      const hasMatch = await prisma.match.findFirst({
        where: {
          isActive: true,
          OR: [
            { user1Id: userId, user2Id: story.userId },
            { user1Id: story.userId, user2Id: userId },
          ],
        },
      });

      if (!hasMatch) {
        throw new AppError('No tienes permiso para ver este story', 403);
      }
    }

    // Registrar visualización (si no ha sido vista antes)
    await prisma.storyView.upsert({
      where: {
        storyId_viewerId: {
          storyId,
          viewerId: userId,
        },
      },
      update: {},
      create: {
        storyId,
        viewerId: userId,
      },
    });

    // Incrementar contador de vistas
    const updatedStory = await prisma.story.update({
      where: { id: storyId },
      data: {
        viewCount: {
          increment: 1,
        },
      },
      include: {
        user: {
          select: {
            id: true,
            profile: {
              select: {
                name: true,
                photos: true,
              },
            },
          },
        },
      },
    });

    res.json(updatedStory);
  } catch (error) {
    next(error);
  }
};

// Eliminar un story
export const deleteStory = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.userId!;
    const { storyId } = req.params;

    // Verificar que el story pertenece al usuario
    const story = await prisma.story.findUnique({
      where: { id: storyId },
    });

    if (!story) {
      throw new AppError('Story no encontrado', 404);
    }

    if (story.userId !== userId) {
      throw new AppError('No tienes permiso para eliminar este story', 403);
    }

    // Eliminar story (las vistas se eliminan automáticamente por CASCADE)
    await prisma.story.delete({
      where: { id: storyId },
    });

    res.json({ message: 'Story eliminado exitosamente' });
  } catch (error) {
    next(error);
  }
};

// Limpiar stories expirados (se puede ejecutar con un cron job)
export const cleanupExpiredStories = async () => {
  try {
    const deleted = await prisma.story.deleteMany({
      where: {
        expiresAt: {
          lt: new Date(),
        },
      },
    });

    console.log(`🧹 Limpieza: ${deleted.count} stories expirados eliminados`);
  } catch (error) {
    console.error('Error al limpiar stories expirados:', error);
  }
};
