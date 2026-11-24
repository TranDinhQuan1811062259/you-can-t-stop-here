import express from 'express';
import {
  getUserHub,
  checkIn,
  toggleTrackLike,
  getTrackLikes,
  addPersonalNote,
  togglePersonalNote,
  deletePersonalNote,
  updateProfile,
} from '../controllers/userController.js';
import { protect } from '../middlewares/authMiddleware.js';

const router = express.Router();

// Lấy danh sách lượt like công khai của tất cả bản nhạc (khách hoặc user đều xem được)
router.get('/tracks/likes', getTrackLikes);

// Các routes cá nhân được bảo vệ chặt chẽ bằng JWT middleware
router.get('/hub', protect, getUserHub);
router.post('/checkin', protect, checkIn);
router.post('/tracks/:trackId/toggle-like', protect, toggleTrackLike);

// Ghi chú mục tiêu cá nhân (Focus Notes)
router.post('/notes', protect, addPersonalNote);
router.patch('/notes/:noteId/toggle', protect, togglePersonalNote);
router.delete('/notes/:noteId', protect, deletePersonalNote);

// Cập nhật hồ sơ (Tên hiển thị, Bio)
router.patch('/profile', protect, updateProfile);

export default router;
