import express from 'express';
import {
  getCommentsByPost,
  createComment,
  deleteComment,
} from '../controllers/commentController.js';
import { protect } from '../middlewares/authMiddleware.js';

const router = express.Router({ mergeParams: true });

// Lấy bình luận của bài viết: Công khai cho khách và thành viên
router.get('/post/:postId', getCommentsByPost);

// Viết bình luận: Bắt buộc đăng nhập
router.post('/post/:postId', protect, createComment);

// Xóa bình luận: Bắt buộc đăng nhập
router.delete('/:id', protect, deleteComment);

export default router;

