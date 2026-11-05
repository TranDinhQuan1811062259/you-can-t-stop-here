import apiClient from './apiClient';

export const chatService = {
  // Lấy danh sách các cuộc trò chuyện (params: { sortBy, q })
  getConversations: (params = {}) => apiClient.get('/chat/conversations', { params }),

  // Khởi tạo hoặc tìm cuộc trò chuyện với người dùng khác
  findOrCreateConversation: (targetUserId) =>
    apiClient.post('/chat/conversations/init', { targetUserId }),

  // Lấy danh sách tin nhắn trong một cuộc trò chuyện
  getMessages: (conversationId) =>
    apiClient.get(`/chat/conversations/${conversationId}/messages`),

  // Gửi tin nhắn mới
  sendMessage: (payload) => apiClient.post('/chat/messages', payload),

  // Chấp nhận yêu cầu trò chuyện từ người lạ
  acceptConversation: (conversationId) =>
    apiClient.put(`/chat/conversations/${conversationId}/accept`),

  // Lấy danh bạ bạn bè (params: { sortBy, q })
  getFriends: (params = {}) => apiClient.get('/chat/friends', { params }),

  // Kết bạn trực tiếp
  addFriend: (targetUserId) => apiClient.post('/chat/friends/add', { targetUserId }),

  // Hủy kết bạn
  removeFriend: (targetUserId) => apiClient.post('/chat/friends/remove', { targetUserId }),

  // Lấy số lượng tin nhắn chưa đọc
  getUnreadCount: () => apiClient.get('/chat/unread-count'),

  // Cập nhật cài đặt nhận thông báo người lạ
  updateSettings: (allowStrangerNotifications) =>
    apiClient.put('/chat/settings', { allowStrangerNotifications }),

  // Cập nhật trạng thái hoạt động (online, busy, offline)
  updateStatus: (status) => apiClient.put('/chat/status', { status }),
};

