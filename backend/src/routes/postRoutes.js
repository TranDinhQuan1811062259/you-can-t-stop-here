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
  reactToPost,
  sharePost,
  toggleReactionVisibility,
  moderatePost,
} from '../controllers/postController.js';
import { protect } from '../middlewares/authMiddleware.js';

const router = express.Router();

// Công khai (Khách và Thành viên đều xem được)
router.get('/', getPosts);
router.get('/recent', getRecentPosts);
router.get('/slug/:slug', getPostBySlug);
router.get('/:id', getPostById);
router.post('/:id/cheer', cheerPost);
router.post('/:id/share', sharePost);

// Tương tác yêu cầu đăng nhập
router.post('/:id/react', protect, reactToPost);
router.patch('/:id/reaction-visibility', protect, toggleReactionVisibility);

// Đăng & Quản lý bài viết / tâm sự (Yêu cầu đăng nhập)
router.post('/', protect, createPost);
router.put('/:id', protect, updatePost);
router.delete('/:id', protect, deletePost);
router.patch('/:id/moderate', protect, moderatePost);

export default router;
