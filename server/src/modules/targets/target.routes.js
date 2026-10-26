import { Router } from 'express';
import * as targetController from './target.controller.js';
import { authenticate } from '../../middleware/authenticate.js';
import { validateRequest } from '../../middleware/validateRequest.js';
import {
  createTargetSchema,
  updateTargetSchema,
  targetIdParamSchema,
} from './target.validation.js';

const router = Router();

// Protect all target management routes with JWT authentication
router.use(authenticate);

router
  .route('/')
  .get(targetController.listTargets)
  .post(validateRequest(createTargetSchema), targetController.createTarget);

router
  .route('/:id')
  .get(validateRequest(targetIdParamSchema), targetController.getTargetById)
  .put(validateRequest(updateTargetSchema), targetController.updateTarget)
  .delete(validateRequest(targetIdParamSchema), targetController.deleteTarget);

router.post(
  '/:id/health',
  validateRequest(targetIdParamSchema),
  targetController.probeTargetHealth
);

export default router;
