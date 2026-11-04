import apiClient from './apiClient';

export const postService = {
  // Lấy danh sách bài viết (params: { page, limit, category, tag, q })
  getPosts: (params = {}) => apiClient.get('/posts', { params }),

  // Lấy chi tiết bài viết theo slug
  getPostBySlug: (slug) => apiClient.get(`/posts/slug/${slug}`),

  // Lấy chi tiết bài viết theo id
  getPostById: (id) => apiClient.get(`/posts/${id}`),

  // Gửi lời động viên (Cheer)
  cheerPost: (id) => apiClient.post(`/posts/${id}/cheer`),

  // Lấy danh sách bài viết mới nhất (widget sidebar)
  getRecentPosts: (limit = 4) => apiClient.get('/posts/recent', { params: { limit } }),

  // Tạo mới bài viết
  createPost: (postData) => apiClient.post('/posts', postData),

  // Cập nhật bài viết
  updatePost: (id, postData) => apiClient.put(`/posts/${id}`, postData),

  // Xóa bài viết
  deletePost: (id) => apiClient.delete(`/posts/${id}`),
};

