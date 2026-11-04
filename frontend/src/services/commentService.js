import apiClient from './apiClient';

export const commentService = {
  // Lấy danh sách bình luận của bài viết (công khai cho mọi người)
  getCommentsByPost: (postId) => apiClient.get(`/comments/post/${postId}`),

  // Gửi bình luận / lời động viên (cần đăng nhập)
  createComment: (postId, data) => apiClient.post(`/comments/post/${postId}`, data),

  // Xóa bình luận
  deleteComment: (id) => apiClient.delete(`/comments/${id}`),
};

