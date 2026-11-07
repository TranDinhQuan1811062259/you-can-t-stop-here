import express from 'express';
import { getActiveStories, createStory, updateStory, deleteStory } from '../controllers/storyController.js';
import { protect } from '../middlewares/authMiddleware.js';

const router = express.Router();

router.get('/', getActiveStories);
router.post('/', protect, createStory);
router.put('/:id', protect, updateStory);
router.delete('/:id', protect, deleteStory);

export default router;
