import express from 'express';
import { getMusicMetadata } from '../controllers/musicController.js';

const router = express.Router();

// GET /api/music/metadata?url=...
router.get('/metadata', getMusicMetadata);

export default router;

