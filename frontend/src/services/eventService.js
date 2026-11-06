import apiClient from './apiClient';

export const eventService = {
  // Lấy toàn bộ danh sách sự kiện lễ hội
  getEvents: () => apiClient.get('/events'),

  // Lấy sự kiện lễ hội đang diễn ra hôm nay (hoặc preview)
  getActiveEvent: () => apiClient.get('/events/active'),

  // Admin cập nhật ngày bắt đầu, số ngày diễn ra, bật/tắt
  updateEvent: (id, data) => apiClient.put(`/events/${id}`, data),

  // Admin tạo sự kiện lễ hội mới dạng custom
  createEvent: (data) => apiClient.post('/events', data),

  // Admin xóa sự kiện custom
  deleteEvent: (id) => apiClient.delete(`/events/${id}`),

  // Admin bật/tắt xem thử một sự kiện ngay lập tức
  previewEvent: (id) => apiClient.post('/events/preview', { id }),
};
