import express, { Application, Request, Response } from 'express';
import cors from 'cors';
import { createServer } from 'http';
import { Server } from 'socket.io';
import jwt from 'jsonwebtoken';
import { existsSync, mkdirSync } from 'fs';
import { config } from './config';
import { setRealtimeIO } from './realtime';
import { logger } from './utils/logger';
import { errorHandler } from './middleware/errorHandler';
import { rateLimiter } from './middleware/rateLimiter';
import { initializeFirebase, isFirebaseConfigured } from './config/firebase';

// Importar rutas
import authRoutes from './routes/auth.routes';
import profileRoutes from './routes/profile.routes';
import matchRoutes from './routes/match.routes';
import messageRoutes from './routes/message.routes';
import reportRoutes from './routes/report.routes';
import uploadRoutes from './routes/upload.routes';
import locationRoutes from './routes/location.routes';
import storyRoutes from './routes/story.routes';
import planRoutes from './routes/plan.routes';

// Inicializar Firebase (opcional)
initializeFirebase();

const app: Application = express();
const httpServer = createServer(app);

// Configurar Socket.IO
export const io = new Server(httpServer, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
    credentials: true,
  },
});
setRealtimeIO(io);

// CORS: `origin: '*' + credentials: true` rompe fetch en algunos navegadores (multipart / Authorization).
app.use(
  cors({
    origin: true,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Accept'],
  })
);

// Body parser
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Archivos subidos localmente (fallback cuando Cloudinary no está disponible)
if (!existsSync(config.uploads.uploadDir)) {
  mkdirSync(config.uploads.uploadDir, { recursive: true });
}
app.use('/uploads', express.static(config.uploads.uploadDir));

// Rate limiting
app.use(rateLimiter);

// Health check
app.get('/health', (_req: Request, res: Response) => {
  res.status(200).json({ status: 'OK', timestamp: new Date().toISOString() });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/profile', profileRoutes);
app.use('/api/match', matchRoutes);
app.use('/api/messages', messageRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/location', locationRoutes);
app.use('/api/stories', storyRoutes);
app.use('/api/plans', planRoutes);

// 404 Handler
app.use((_req: Request, res: Response) => {
  res.status(404).json({ error: 'Ruta no encontrada' });
});

// Error handler (debe ir al final)
app.use(errorHandler);

// Socket.IO events
io.on('connection', (socket) => {
  logger.info(`Usuario conectado: ${socket.id}`);

  const token = socket.handshake.auth?.token;
  if (token) {
    try {
      const decoded = jwt.verify(token, config.jwt.secret) as { userId: string };
      socket.join(`user:${decoded.userId}`);
      logger.info(`Socket ${socket.id} unido al canal user:${decoded.userId}`);
    } catch (error) {
      logger.warn(`Socket ${socket.id} conectado con token invalido`);
    }
  }

  socket.on('join_room', (matchId: string) => {
    socket.join(matchId);
    logger.info(`Usuario ${socket.id} se unió a la sala ${matchId}`);
  });

  socket.on('send_message', (data) => {
    io.to(data.matchId).emit('receive_message', data);
  });

  socket.on('typing', (data) => {
    socket.to(data.matchId).emit('user_typing', data);
  });

  socket.on('disconnect', () => {
    logger.info(`Usuario desconectado: ${socket.id}`);
  });
});

// Iniciar servidor (0.0.0.0 = accesible desde LAN para Expo Go / dispositivo físico)
const PORT = config.port;
const HOST = (process.env.HOST || '0.0.0.0').trim();

httpServer.listen(PORT, HOST, () => {
  logger.info(`🚀 Servidor corriendo en ${HOST}:${PORT}`);
  logger.info(`🌐 Ambiente: ${config.env}`);
  logger.info(`📡 URL publicada en config: ${config.apiUrl}`);
});

// Errores no capturados: en dev no salimos (un reject de libs como Cloudinary tumbaría el API en :5000).
process.on('unhandledRejection', (reason: unknown) => {
  logger.error('Unhandled Rejection:', reason);
  if (config.env === 'production') {
    process.exit(1);
  }
});

process.on('uncaughtException', (err: Error) => {
  logger.error('Uncaught Exception:', err);
  if (config.env === 'production') {
    process.exit(1);
  }
});

export default app;
