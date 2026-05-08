import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import * as reportController from '../controllers/report.controller';

const router = Router();

// Todas las rutas requieren autenticación
router.use(authenticate);

router.get('/my-targets', reportController.getMyReportTargets);
router.get('/status/:reportedUserId', reportController.getReportStatus);
router.delete('/to/:reportedUserId', reportController.revokeReportsToUser);
router.post('/', reportController.createReport);

export default router;
