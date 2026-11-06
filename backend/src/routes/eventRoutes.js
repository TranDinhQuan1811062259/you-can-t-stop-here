import express from 'express';
import {
  getEvents,
  getActiveEvent,
  updateEvent,
  createEvent,
  deleteEvent,
  previewEvent,
} from '../controllers/eventController.js';
import { protect, adminOnly, optionalProtect } from '../middlewares/authMiddleware.js';

const router = express.Router();

// Công khai: Lấy danh sách sự kiện và sự kiện active hôm nay
router.get('/', optionalProtect, getEvents);
router.get('/active', getActiveEvent);

// Quyền Admin: Tùy chỉnh sự kiện lễ hội
router.put('/:id', protect, adminOnly, updateEvent);
router.post('/', protect, adminOnly, createEvent);
router.delete('/:id', protect, adminOnly, deleteEvent);
router.post('/preview', protect, adminOnly, previewEvent);

export default router;
