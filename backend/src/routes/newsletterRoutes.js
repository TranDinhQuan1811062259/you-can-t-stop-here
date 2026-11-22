import express from 'express';
import { subscribeNewsletter } from '../controllers/newsletterController.js';
import { newsletterLimiter } from '../middlewares/rateLimiter.js';

const router = express.Router();

// POST /api/newsletter/subscribe (Bảo vệ bởi Rate Limiter chống spam bom mail)
router.post('/subscribe', newsletterLimiter, subscribeNewsletter);

export default router;

