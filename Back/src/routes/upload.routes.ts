import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import * as uploadController from '../controllers/upload.controller';

const router = Router();

// Todas las rutas requieren autenticación
router.use(authenticate);

// Subir una sola imagen
router.post('/image', uploadController.upload.single('image'), uploadController.uploadSingleImage);

// Subir múltiples imágenes (hasta 5)
router.post('/images', uploadController.upload.array('images', 5), uploadController.uploadMultipleImages);

export default router;
