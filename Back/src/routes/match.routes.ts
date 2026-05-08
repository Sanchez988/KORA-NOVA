import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import * as matchController from '../controllers/match.controller';

const router = Router();

// Todas las rutas requieren autenticación
router.use(authenticate);

// Obtener usuarios para discovery
router.get('/discovery', matchController.getDiscoveryUsers);

// Dar like
router.post('/like', matchController.likeUser);

// Dar dislike
router.post('/dislike', matchController.dislikeUser);

// Obtener mis matches
router.get('/my-matches', matchController.getMyMatches);

// Deshacer match
router.delete('/:matchId', matchController.unmatch);

export default router;
