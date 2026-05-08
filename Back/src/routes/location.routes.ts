import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import * as locationController from '../controllers/location.controller';

const router = Router();

// Todas las rutas requieren autenticación
router.use(authenticate);

// Toggle activar/desactivar ubicación
router.post('/toggle', locationController.toggleLocation);

// Verificar estado de ubicación
router.get('/status', locationController.getLocationStatus);

// Actualizar ubicación
router.post('/', locationController.updateLocation);

// Obtener mi ubicación
router.get('/me', locationController.getMyLocation);

export default router;
