import apiClient from './apiClient';

const ACTIVE_EVENT_TTL_MS = 60 * 1000;
let activeEventCache = null;
let activeEventCachedAt = 0;
let activeEventInFlight = null;

export const invalidateActiveEventCache = () => {
  activeEventCache = null;
  activeEventCachedAt = 0;
  activeEventInFlight = null;
};

export const eventService = {
  // Lấy toàn bộ danh sách sự kiện lễ hội
  getEvents: () => apiClient.get('/events'),

  // Lấy sự kiện lễ hội đang diễn ra hôm nay (Chống gọi trùng khi nhiều component mount đồng thời)
  getActiveEvent: (options = {}) => {
    const force = Boolean(options?.force);
    const now = Date.now();

    if (!force && activeEventCache && now - activeEventCachedAt < ACTIVE_EVENT_TTL_MS) {
      return Promise.resolve(activeEventCache);
    }

    if (!force && activeEventInFlight) {
      return activeEventInFlight;
    }

    const request = apiClient
      .get('/events/active')
      .then((res) => {
        activeEventCache = res;
        activeEventCachedAt = Date.now();
        return res;
      })
      .finally(() => {
        if (activeEventInFlight === request) {
          activeEventInFlight = null;
        }
      });

    activeEventInFlight = request;
    return request;
  },

  // Admin cập nhật ngày bắt đầu, số ngày diễn ra, bật/tắt
  updateEvent: (id, data) =>
    apiClient.put(`/events/${id}`, data).then((res) => {
      invalidateActiveEventCache();
      return res;
    }),

  // Admin tạo sự kiện lễ hội mới dạng custom
  createEvent: (data) =>
    apiClient.post('/events', data).then((res) => {
      invalidateActiveEventCache();
      return res;
    }),

  // Admin xóa sự kiện custom
  deleteEvent: (id) =>
    apiClient.delete(`/events/${id}`).then((res) => {
      invalidateActiveEventCache();
      return res;
    }),

  // Admin bật/tắt xem thử một sự kiện ngay lập tức
  previewEvent: (id) =>
    apiClient.post('/events/preview', { id }).then((res) => {
      invalidateActiveEventCache();
      return res;
    }),
};
