import apiClient from './apiClient';

export const storyService = {
  // Lấy danh sách các story còn hạn trong 24 giờ
  getActiveStories: () => apiClient.get('/stories'),

  // Đăng story mới
  createStory: (storyData) => apiClient.post('/stories', storyData),

  // Chỉnh sửa story
  updateStory: (id, storyData) => apiClient.put(`/stories/${id}`, storyData),

  // Xóa story
  deleteStory: (id) => apiClient.delete(`/stories/${id}`),
};
