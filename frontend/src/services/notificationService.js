import apiClient from './apiClient';

let unreadCountInFlight = null;

export const notificationService = {
  // Lấy danh sách thông báo (params: { type: 'all' | 'friend' | 'message' | 'interaction', unreadOnly: boolean })
  getNotifications: (params = {}) => apiClient.get('/notifications', { params }),

  // Lấy số lượng thông báo chưa đọc (chống gọi trùng đồng thời)
  getUnreadCount: () => {
    if (unreadCountInFlight) return unreadCountInFlight;
    const request = apiClient.get('/notifications/unread-count').finally(() => {
      if (unreadCountInFlight === request) unreadCountInFlight = null;
    });
    unreadCountInFlight = request;
    return request;
  },

  // Đánh dấu 1 thông báo là đã đọc
  markAsRead: (id) => apiClient.put(`/notifications/${id}/read`),

  // Đánh dấu tất cả thông báo là đã đọc
  markAllAsRead: () => apiClient.put('/notifications/read-all'),

  // Phản hồi lời mời kết bạn ('accept' hoặc 'decline')
  respondToFriendRequest: (id, action) =>
    apiClient.post(`/notifications/${id}/respond-friend`, { action }),

  // Xóa 1 thông báo
  deleteNotification: (id) => apiClient.delete(`/notifications/${id}`),

  // Xóa toàn bộ thông báo
  clearAllNotifications: () => apiClient.delete('/notifications/clear-all'),
};
