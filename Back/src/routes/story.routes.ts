import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import { upload } from '../controllers/upload.controller';
import * as storyController from '../controllers/story.controller';

const router = Router();

// Todas las rutas requieren autenticación
router.use(authenticate);

// Crear story (subir foto temporal)
router.post('/', upload.single('image'), storyController.createStory);

// Obtener mis stories
router.get('/me', storyController.getMyStories);

// Obtener stories de mis matches
router.get('/matches', storyController.getMatchesStories);

// Ver un story específico
router.post('/:storyId/view', storyController.viewStory);

// Eliminar mi story
router.delete('/:storyId', storyController.deleteStory);

export default router;
