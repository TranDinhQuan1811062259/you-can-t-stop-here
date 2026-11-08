import apiClient from './apiClient';

const POSTS_CACHE_KEY = 'freedom_cached_posts_v2';
const LOCAL_POSTS_KEY = 'freedom_offline_created_posts_v2';

export const removeVietnameseTones = (str) => {
  if (!str) return '';
  return str
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .toLowerCase()
    .trim();
};

export const getCachedPosts = () => {
  try {
    const raw = localStorage.getItem(POSTS_CACHE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch (e) {}
  return [];
};

export const saveCachedPosts = (posts) => {
  try {
    localStorage.setItem(POSTS_CACHE_KEY, JSON.stringify(posts || []));
  } catch (e) {}
};

export const getOfflineCreatedPosts = () => {
  try {
    const raw = localStorage.getItem(LOCAL_POSTS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch (e) {}
  return [];
};

export const saveOfflineCreatedPosts = (posts) => {
  try {
    localStorage.setItem(LOCAL_POSTS_KEY, JSON.stringify(posts || []));
  } catch (e) {}
};

export const postService = {
  // Lấy danh sách bài viết (params: { page, limit, category, tag, q })
  getPosts: async (params = {}) => {
    try {
      const res = await apiClient.get('/posts', { params });
      if (res && res.data) {
        // Lưu cache lại cho các lần mất mạng hoặc khi backend chưa bật
        if (Array.isArray(res.data)) {
          saveCachedPosts(res.data);
        } else if (res.data.posts && Array.isArray(res.data.posts)) {
          saveCachedPosts(res.data.posts);
        }
        return res;
      }
    } catch (err) {
      console.warn('Backend chưa sẵn sàng, trả về bài viết đã lưu từ bộ nhớ đệm:', err?.message);
      const cached = getCachedPosts();
      const offline = getOfflineCreatedPosts();
      const combined = [...offline, ...cached.filter((c) => !offline.some((o) => o._id === c._id))];
      if (combined.length > 0) {
        let filtered = combined;

        if (params.category) {
          const lowerCat = params.category.toLowerCase();
          filtered = filtered.filter(
            (p) =>
              p.category?.slug === params.category ||
              p.category?._id === params.category ||
              p.category?.name?.toLowerCase() === lowerCat ||
              (typeof p.category === 'string' && (p.category === params.category || p.category.toLowerCase() === lowerCat))
          );
        }

        if (params.tag) {
          const cleanTag = params.tag.replace(/^#/, '').trim().toLowerCase();
          filtered = filtered.filter((p) => (p.tags || []).some((t) => t.toLowerCase() === cleanTag));
        }

        if (params.q) {
          const lowerQ = params.q.toLowerCase().trim();
          const cleanQ = removeVietnameseTones(lowerQ);

          filtered = filtered.filter((p) => {
            const title = (p.title || '').toLowerCase();
            const summary = (p.summary || '').toLowerCase();
            const content = (p.content || '').toLowerCase();
            const author = (p.author || p.user?.name || '').toLowerCase();
            const catName = (typeof p.category === 'string' ? p.category : p.category?.name || '').toLowerCase();
            const tags = (p.tags || []).map((t) => String(t).toLowerCase());

            if (
              title.includes(lowerQ) ||
              summary.includes(lowerQ) ||
              content.includes(lowerQ) ||
              author.includes(lowerQ) ||
              catName.includes(lowerQ) ||
              tags.some((t) => t.includes(lowerQ))
            ) {
              return true;
            }

            if (cleanQ) {
              return (
                removeVietnameseTones(title).includes(cleanQ) ||
                removeVietnameseTones(summary).includes(cleanQ) ||
                removeVietnameseTones(content).includes(cleanQ) ||
                removeVietnameseTones(author).includes(cleanQ) ||
                removeVietnameseTones(catName).includes(cleanQ) ||
                tags.some((t) => removeVietnameseTones(t).includes(cleanQ))
              );
            }

            return false;
          });
        }

        return {
          data: filtered,
          pagination: {
            total: filtered.length,
            totalPages: 1,
            currentPage: 1,
          },
          success: true,
          fromCache: true,
        };
      }
      throw err;
    }
  },

  // Lấy chi tiết bài viết theo slug
  getPostBySlug: async (slug) => {
    try {
      return await apiClient.get(`/posts/slug/${slug}`);
    } catch (err) {
      const cached = [...getOfflineCreatedPosts(), ...getCachedPosts()];
      const found = cached.find((p) => p.slug === slug || p._id === slug);
      if (found) {
        return { data: found, success: true, fromCache: true };
      }
      throw err;
    }
  },

  // Lấy chi tiết bài viết theo id
  getPostById: async (id) => {
    try {
      return await apiClient.get(`/posts/${id}`);
    } catch (err) {
      const cached = [...getOfflineCreatedPosts(), ...getCachedPosts()];
      const found = cached.find((p) => p._id === id);
      if (found) {
        return { data: found, success: true, fromCache: true };
      }
      throw err;
    }
  },

  // Gửi lời động viên (Cheer - legacy)
  cheerPost: (id) => apiClient.post(`/posts/${id}/cheer`).catch(() => ({ success: true })),

  // Bày tỏ cảm xúc về bài viết (sympathy, stop, love, encourage)
  reactPost: (id, type) => apiClient.post(`/posts/${id}/react`, { type }).catch(() => ({ success: true })),

  // Chia sẻ bài viết
  sharePost: (id) => apiClient.post(`/posts/${id}/share`).catch(() => ({ success: true })),

  // Chia sẻ bài viết về trang cá nhân (Repost)
  repostPost: (id) => apiClient.post(`/posts/${id}/repost`).catch(() => ({ success: true })),

  // Bật/tắt hiển thị số lượng cảm xúc
  toggleReactionVisibility: (id, showReactionCount) =>
    apiClient.patch(`/posts/${id}/reaction-visibility`, { showReactionCount }),

  // Bật/tắt tính năng bình luận của bài viết
  toggleComments: (id, allowComments) =>
    apiClient.patch(`/posts/${id}/toggle-comments`, { allowComments }),

  // Lấy danh sách bài viết mới nhất (widget sidebar)
  getRecentPosts: async (limit = 4) => {
    try {
      return await apiClient.get('/posts/recent', { params: { limit } });
    } catch (err) {
      const cached = [...getOfflineCreatedPosts(), ...getCachedPosts()];
      return { data: cached.slice(0, limit), success: true, fromCache: true };
    }
  },

  // Tạo mới bài viết
  createPost: async (postData) => {
    try {
      const res = await apiClient.post('/posts', postData);
      const created = res?.data || res;
      if (created) {
        return { data: created, success: true };
      }
    } catch (err) {
      console.warn('Backend chưa nhận được bài viết, lưu an toàn tại máy cục bộ:', err?.message);
      // Tạo đối tượng post cục bộ hoàn chỉnh
      const localPost = {
        _id: `post_local_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        ...postData,
        slug: (postData.title || 'bai-viet-moi')
          .toLowerCase()
          .normalize('NFD')
          .replace(/[\u0300-\u036f]/g, '')
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/(^-|-$)+/g, '') + `-${Date.now()}`,
        createdAt: new Date().toISOString(),
        reactions: { sympathy: 0, stop: 0, love: 1, encourage: 0 },
        reactionsCount: 1,
        commentsCount: 0,
        cheerCount: 0,
        isLocalFallback: true,
      };

      const offline = getOfflineCreatedPosts();
      saveOfflineCreatedPosts([localPost, ...offline]);
      return { data: localPost, success: true, fromLocal: true };
    }
  },

  // Cập nhật bài viết
  updatePost: (id, postData) => apiClient.put(`/posts/${id}`, postData),

  // Xóa bài viết (hoặc Admin xóa ngang bài vi phạm)
  deletePost: (id) => apiClient.delete(`/posts/${id}`),

  // Kiểm duyệt bài viết nhạy cảm (Admin)
  moderatePost: (id, { action, reason }) => apiClient.patch(`/posts/${id}/moderate`, { action, reason }),

  // Lấy danh sách hashtags gợi ý hệ thống
  getHashtags: () => apiClient.get('/posts/hashtags/list').catch(() => ({ data: ['#healing', '#burnout', '#tamSu', '#deadline', '#youCantStopHere'] })),

  // Đăng ký lưu thêm một hashtag mới
  addHashtag: (tag) => apiClient.post('/posts/hashtags/register', { tag }).catch(() => ({ success: true })),
};
