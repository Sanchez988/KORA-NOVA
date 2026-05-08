import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import * as profileController from '../controllers/profile.controller';

const router = Router();

// Todas las rutas requieren autenticación
router.use(authenticate);

// Crear perfil
router.post('/', profileController.createProfile);

// Obtener mi perfil
router.get('/me', profileController.getMyProfile);

// Estadísticas (antes que /:userId para que "stats" no se interprete como userId)
router.get('/stats', profileController.getStats);

// Actualizar perfil
router.put('/', profileController.updateProfile);

// Eliminar foto
router.delete('/photo', profileController.deletePhoto);

// Toggle modo incógnito
router.patch('/incognito', profileController.toggleIncognitoMode);

// Obtener perfil por ID (al final para no sombrear rutas fijas)
router.get('/:userId', profileController.getProfileById);

export default router;
