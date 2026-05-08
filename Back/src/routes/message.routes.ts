import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import * as messageController from '../controllers/message.controller';

const router = Router();

// Todas las rutas requieren autenticación
router.use(authenticate);

// Obtener mensajes de un match
router.get('/:matchId', messageController.getMessages);

// Enviar mensaje
router.post('/:matchId', messageController.sendMessage);

// Marcar como leído
router.patch('/:messageId/read', messageController.markAsRead);

// Eliminar mensaje
router.delete('/:messageId', messageController.deleteMessage);

export default router;
