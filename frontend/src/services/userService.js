import apiClient from './apiClient';
import {
  invalidateUserProfileCache,
  getWarmCachedUserProfile,
  prefetchUserProfile,
} from './authService';

/**
 * Service giao tiếp với các API cá nhân hóa, điểm danh giữ lửa & tương tác âm nhạc
 */
export const userService = {
  // Lấy dữ liệu cá nhân hóa (Personal Motivation Hub)
  getUserHub: () => apiClient.get('/user/hub'),

  // Điểm danh giữ lửa hằng ngày (Daily Streak Check-in)
  checkIn: () => apiClient.post('/user/checkin'),

  // Thả tim / bỏ tim bản nhạc
  toggleTrackLike: (trackId) => apiClient.post(`/user/tracks/${encodeURIComponent(trackId)}/toggle-like`),

  // Lấy danh sách lượt like công khai của tất cả bản nhạc
  getTrackLikes: () => apiClient.get('/user/tracks/likes'),

  // Thêm ghi chú mục tiêu cá nhân (Focus Notes)
  addNote: (content) => apiClient.post('/user/notes', { content }),

  // Đổi trạng thái hoàn thành ghi chú
  toggleNote: (noteId) => apiClient.patch(`/user/notes/${noteId}/toggle`),

  // Xóa ghi chú mục tiêu
  deleteNote: (noteId) => apiClient.delete(`/user/notes/${noteId}`),

  // Cập nhật tên hiển thị, bio
  updateProfile: (profileData) =>
    apiClient.patch('/user/profile', profileData).then((res) => {
      invalidateUserProfileCache();
      return res;
    }),
};

export {
  invalidateUserProfileCache,
  getWarmCachedUserProfile,
  prefetchUserProfile,
};

export default userService;
