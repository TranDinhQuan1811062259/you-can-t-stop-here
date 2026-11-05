import express from 'express';
import postRoutes from './postRoutes.js';
import categoryRoutes from './categoryRoutes.js';
import authRoutes from './authRoutes.js';
import commentRoutes from './commentRoutes.js';
import uploadRoutes from './uploadRoutes.js';
import chatRoutes from './chatRoutes.js';
import newsletterRoutes from './newsletterRoutes.js';
import musicRoutes from './musicRoutes.js';

const router = express.Router();

router.use('/auth', authRoutes);
router.use('/posts', postRoutes);
router.use('/categories', categoryRoutes);
router.use('/comments', commentRoutes);
router.use('/upload', uploadRoutes);
router.use('/chat', chatRoutes);
router.use('/newsletter', newsletterRoutes);
router.use('/music', musicRoutes);

// Health check endpoint
router.get('/health', (req, res) => {
  res.json({
    name: "You Can't Stop Here API",
    status: 'OK',
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
  });
});

export default router;
