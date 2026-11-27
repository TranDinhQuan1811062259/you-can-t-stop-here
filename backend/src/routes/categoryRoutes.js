import express from 'express';
import {
  getCategories,
  createCategory,
  deleteCategory,
} from '../controllers/categoryController.js';
import { protect, adminOnly } from '../middlewares/authMiddleware.js';

const router = express.Router();

router.get('/', getCategories);
router.post('/', protect, createCategory);
router.delete('/:id', protect, adminOnly, deleteCategory);

export default router;

