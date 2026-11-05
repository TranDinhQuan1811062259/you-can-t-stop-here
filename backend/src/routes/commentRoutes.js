import express from 'express';
import {
  getCommentsByPost,
  createComment,
  deleteComment,
  likeComment,
} from '../controllers/commentController.js';
import { protect } from '../middlewares/authMiddleware.js';

const router = express.Router({ mergeParams: true });

// Lấy bình luận của bài viết
router.get('/post/:postId', getCommentsByPost);

// Viết bình luận: Bắt buộc đăng nhập
router.post('/post/:postId', protect, createComment);

// Thích/Động viên bình luận
router.post('/:id/like', likeComment);

// Xóa bình luận: Bắt buộc đăng nhập
router.delete('/:id', protect, deleteComment);

export default router;
