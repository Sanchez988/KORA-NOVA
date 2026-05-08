import { Response, NextFunction } from 'express';
import { PrismaClient } from '@prisma/client';
import { AuthRequest } from '../middleware/auth';
import { AppError } from '../middleware/errorHandler';
import { io } from '../server';

const prisma = new PrismaClient();

// Obtener mensajes de un match
export const getMessages = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.userId!;
    const { matchId } = req.params;

    const match = await prisma.match.findUnique({ where: { id: matchId } });
    if (!match || (match.user1Id !== userId && match.user2Id !== userId)) {
      throw new AppError('Match no encontrado', 404);
    }

    const messages = await prisma.message.findMany({
      where: {
        matchId,
        deletedAt: null,
      },
      orderBy: { sentAt: 'asc' },
      include: {
        sender: {
          select: {
            id: true,
            email: true,
            profile: true,
          },
        },
      },
    });

    // Parsear campos JSON
    const parsedMessages = messages.map(msg => ({
      ...msg,
      images: JSON.parse(msg.images),
      attachmentNames: JSON.parse(msg.attachmentNames),
      attachmentTypes: JSON.parse(msg.attachmentTypes),
    }));

    res.json(parsedMessages);
  } catch (error) {
    next(error);
  }
};

// Enviar mensaje
export const sendMessage = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.userId!;
    const { matchId } = req.params;
    const { content, images, attachmentNames, attachmentTypes } = req.body;

    const match = await prisma.match.findUnique({ where: { id: matchId } });
    if (!match || (match.user1Id !== userId && match.user2Id !== userId)) {
      throw new AppError('Match no encontrado', 404);
    }

    const message = await prisma.message.create({
      data: {
        matchId,
        senderId: userId,
        content: content || '',
        images: JSON.stringify(images || []),
        attachmentNames: JSON.stringify(attachmentNames || []),
        attachmentTypes: JSON.stringify(attachmentTypes || []),
      },
      include: {
        sender: {
          select: {
            id: true,
            email: true,
            profile: true,
          },
        },
      },
    });

    // Parsear campos JSON antes de enviar
    const parsedMessage = {
      ...message,
      images: JSON.parse(message.images),
      attachmentNames: JSON.parse(message.attachmentNames),
      attachmentTypes: JSON.parse(message.attachmentTypes),
    };

    // Emitir mensaje por Socket.IO
    io.to(matchId).emit('receive_message', parsedMessage);

    res.status(201).json(parsedMessage);
  } catch (error) {
    next(error);
  }
};

// Marcar como leído
export const markAsRead = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { messageId } = req.params;

    await prisma.message.update({
      where: { id: messageId },
      data: {
        isRead: true,
        readAt: new Date(),
      },
    });

    res.json({ message: 'Mensaje marcado como leído' });
  } catch (error) {
    next(error);
  }
};

// Eliminar mensaje
export const deleteMessage = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.userId!;
    const { messageId } = req.params;

    const message = await prisma.message.findUnique({ where: { id: messageId } });
    if (!message || message.senderId !== userId) {
      throw new AppError('Mensaje no encontrado', 404);
    }

    await prisma.message.update({
      where: { id: messageId },
      data: { deletedAt: new Date() },
    });

    res.json({ message: 'Mensaje eliminado' });
  } catch (error) {
    next(error);
  }
};
