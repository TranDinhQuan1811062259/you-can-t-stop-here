import apiClient from './apiClient';

const COMMENTS_STORAGE_KEY = 'freedom_offline_comments_v2';

const getStoredComments = () => {
  try {
    const raw = localStorage.getItem(COMMENTS_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === 'object') return parsed;
    }
  } catch (e) {}
  return {};
};

const saveStoredComments = (map) => {
  try {
    localStorage.setItem(COMMENTS_STORAGE_KEY, JSON.stringify(map || {}));
  } catch (e) {}
};

export const commentService = {
  // Lấy danh sách bình luận của bài viết
  getCommentsByPost: async (postId) => {
    try {
      const res = await apiClient.get(`/comments/post/${postId}`);
      if (res && res.data) {
        // Cập nhật local storage
        const map = getStoredComments();
        map[postId] = res.data;
        saveStoredComments(map);
        return res;
      }
    } catch (err) {
      console.warn('Backend chưa sẵn sàng, trả về bình luận đã lưu cục bộ:', err?.message);
    }
    const map = getStoredComments();
    return { data: map[postId] || [], success: true, fromLocal: true };
  },

  // Gửi bình luận / lời động viên / câu trả lời
  createComment: async (postId, data) => {
    const map = getStoredComments();
    const existing = map[postId] || [];
    const localComment = {
      _id: `comment_local_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      postId,
      ...data,
      likes: 0,
      createdAt: new Date().toISOString(),
    };
    map[postId] = [localComment, ...existing];
    saveStoredComments(map);

    try {
      const res = await apiClient.post(`/comments/post/${postId}`, data);
      if (res && res.data) {
        map[postId] = [res.data, ...existing];
        saveStoredComments(map);
        return res;
      }
    } catch (err) {
      console.warn('Lưu bình luận offline thành công:', err?.message);
    }

    return { data: localComment, success: true, fromLocal: true };
  },

  // Thích / động viên một bình luận
  likeComment: (id) => apiClient.post(`/comments/${id}/like`).catch(() => ({ success: true })),

  // Xóa bình luận
  deleteComment: (id) => apiClient.delete(`/comments/${id}`).catch(() => ({ success: true })),
};
