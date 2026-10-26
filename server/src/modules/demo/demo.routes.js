import { Router } from 'express';
import * as demoController from './demo.controller.js';

const router = Router();

// Demo API endpoints (Unauthenticated for isolated load-testing benchmarks)
router.get('/ping', demoController.ping);
router.get('/health', demoController.health);
router.get('/delayed', demoController.delayed);
router.get('/error', demoController.errorScenario);
router.get('/rate-limited', demoController.rateLimited);

export default router;
