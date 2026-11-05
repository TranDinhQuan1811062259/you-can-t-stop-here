import apiClient from './apiClient';

export const postService = {
  // Lấy danh sách bài viết (params: { page, limit, category, tag, q })
  getPosts: (params = {}) => apiClient.get('/posts', { params }),

  // Lấy chi tiết bài viết theo slug
  getPostBySlug: (slug) => apiClient.get(`/posts/slug/${slug}`),

  // Lấy chi tiết bài viết theo id
  getPostById: (id) => apiClient.get(`/posts/${id}`),

  // Gửi lời động viên (Cheer - legacy)
  cheerPost: (id) => apiClient.post(`/posts/${id}/cheer`),

  // Bày tỏ cảm xúc về bài viết (sympathy, stop, love, encourage)
  reactPost: (id, type) => apiClient.post(`/posts/${id}/react`, { type }),

  // Chia sẻ bài viết
  sharePost: (id) => apiClient.post(`/posts/${id}/share`),

  // Bật/tắt hiển thị số lượng cảm xúc
  toggleReactionVisibility: (id, showReactionCount) =>
    apiClient.patch(`/posts/${id}/reaction-visibility`, { showReactionCount }),

  // Lấy danh sách bài viết mới nhất (widget sidebar)
  getRecentPosts: (limit = 4) => apiClient.get('/posts/recent', { params: { limit } }),

  // Tạo mới bài viết
  createPost: (postData) => apiClient.post('/posts', postData),

  // Cập nhật bài viết
  updatePost: (id, postData) => apiClient.put(`/posts/${id}`, postData),

  // Xóa bài viết (hoặc Admin xóa ngang bài vi phạm)
  deletePost: (id) => apiClient.delete(`/posts/${id}`),

  // Kiểm duyệt bài viết nhạy cảm (Admin)
  moderatePost: (id, { action, reason }) => apiClient.patch(`/posts/${id}/moderate`, { action, reason }),
};

