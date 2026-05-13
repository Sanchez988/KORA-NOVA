import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import * as planController from '../controllers/plan.controller';

const router = Router();

router.use(authenticate);

router.get('/', planController.getPlans);
router.get('/mine', planController.getMyPlans);
router.get('/map', planController.getPlansMap);
router.post('/', planController.createPlan);
router.patch('/:id', planController.updatePlan);
router.post('/:id/join', planController.joinPlan);
router.post('/:id/add-participant', planController.addPlanParticipant);
router.delete('/:id/leave', planController.leavePlan);
router.delete('/:id', planController.cancelPlan);

export default router;
