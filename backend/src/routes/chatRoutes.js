import express from 'express';
import { protect } from '../middlewares/authMiddleware.js';
import {
  getConversations,
  findOrCreateConversation,
  getMessages,
  sendMessage,
  acceptConversation,
  getFriends,
  addFriend,
  removeFriend,
  updateChatSettings,
  getUnreadCount,
  updateChatStatus,
} from '../controllers/chatController.js';

const router = express.Router();

// Tất cả các route chat đều yêu cầu đăng nhập
router.use(protect);

// Trạng thái hoạt động (Online, Busy, Offline)
router.put('/status', updateChatStatus);

// Danh sách các cuộc trò chuyện & Khởi tạo chat
router.get('/conversations', getConversations);
router.post('/conversations/init', findOrCreateConversation);
router.put('/conversations/:conversationId/accept', acceptConversation);

// Tin nhắn trong một cuộc trò chuyện
router.get('/conversations/:conversationId/messages', getMessages);
router.post('/messages', sendMessage);

// Quản lý danh bạ bạn bè
router.get('/friends', getFriends);
router.post('/friends/add', addFriend);
router.post('/friends/remove', removeFriend);

// Cài đặt thông báo tin nhắn & Số lượng chưa đọc
router.get('/unread-count', getUnreadCount);
router.put('/settings', updateChatSettings);

export default router;

