import express from 'express';
import {
  getPosts,
  getPostBySlug,
  getPostById,
  createPost,
  updatePost,
  deletePost,
  getRecentPosts,
  cheerPost,
} from '../controllers/postController.js';
import { protect } from '../middlewares/authMiddleware.js';

const router = express.Router();

// Công khai (Khách và Thành viên đều xem được)
router.get('/', getPosts);
router.get('/recent', getRecentPosts);
router.get('/slug/:slug', getPostBySlug);
router.get('/:id', getPostById);
router.post('/:id/cheer', cheerPost);

// Đăng bài viết / tâm sự (Yêu cầu đăng nhập)
router.post('/', protect, createPost);
router.put('/:id', protect, updatePost);
router.delete('/:id', protect, deletePost);

export default router;
