import express from 'express';
import { getMusicMetadata, getMusicPresets } from '../controllers/musicController.js';

const router = express.Router();

// GET /api/music/presets
router.get('/presets', getMusicPresets);

// GET /api/music/metadata?url=...
router.get('/metadata', getMusicMetadata);

export default router;

