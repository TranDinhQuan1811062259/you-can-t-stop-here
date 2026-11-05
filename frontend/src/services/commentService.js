import apiClient from './apiClient';

export const commentService = {
  // Lấy danh sách bình luận của bài viết
  getCommentsByPost: (postId) => apiClient.get(`/comments/post/${postId}`),

  // Gửi bình luận / lời động viên / câu trả lời
  createComment: (postId, data) => apiClient.post(`/comments/post/${postId}`, data),

  // Thích / động viên một bình luận
  likeComment: (id) => apiClient.post(`/comments/${id}/like`),

  // Xóa bình luận
  deleteComment: (id) => apiClient.delete(`/comments/${id}`),
};
