import express from 'express';
import { synthesizeVietnameseSpeech } from '../controllers/ttsController.js';

const router = express.Router();

// GET /api/tts?text=...
router.get('/', synthesizeVietnameseSpeech);

// POST /api/tts (nếu văn bản dài hoặc gửi qua body)
router.post('/', synthesizeVietnameseSpeech);

export default router;
