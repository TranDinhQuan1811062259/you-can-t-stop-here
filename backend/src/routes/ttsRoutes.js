import express from 'express';
import { synthesizeVietnameseSpeech } from '../controllers/ttsController.js';
import { ttsLimiter } from '../middlewares/rateLimiter.js';

const router = express.Router();

// Áp dụng giới hạn tần suất TTS chống spam tài nguyên và chặn IP upstream
router.use(ttsLimiter);

// GET /api/tts?text=...
router.get('/', synthesizeVietnameseSpeech);

// POST /api/tts (nếu văn bản dài hoặc gửi qua body)
router.post('/', synthesizeVietnameseSpeech);

export default router;
