import apiClient from './apiClient';

const POSTS_CACHE_KEY = 'freedom_cached_posts_v3';
const LOCAL_POSTS_KEY = 'freedom_offline_created_posts_v2';
const WARM_CACHE_TTL_MS = 45 * 1000; // 45 giây TTL cho warm-cache chuyển chủ đề 0ms
const WARM_CACHE_MAX_ENTRIES = 20;   // Giới hạn LRU tối đa 20 query gần nhất

// LRU Warm-Cache trong RAM (cách ly theo auth scope) & In-Flight Request Deduplication
const warmPostsCache = new Map();
const inFlightPostsRequests = new Map();
const warmPostDetailCache = new Map();
const inFlightPostDetailRequests = new Map();
let warmCacheEpoch = 0;

const getAuthCacheScope = () => {
  if (typeof window === 'undefined') return 'ssr';
  try {
    const token = localStorage.getItem('token') || localStorage.getItem('freedom_token') || '';
    if (!token) return 'guest';
    const rawUser = localStorage.getItem('user');
    if (rawUser) {
      const parsed = JSON.parse(rawUser);
      if (parsed?._id || parsed?.id) {
        return `user:${parsed._id || parsed.id}`;
      }
    }
    return `auth:${token.slice(-12)}`;
  } catch (_) {
    return 'guest';
  }
};

export const normalizePostsQueryParams = (params = {}) => {
  const parsedPage = Number.parseInt(params.page, 10);
  const parsedLimit = Number.parseInt(params.limit, 10);
  return {
    category: String(params.category || '').trim(),
    tag: String(params.tag || '').trim(),
    q: String(params.q || '').trim(),
    sort: String(params.sort || 'newest').trim() || 'newest',
    visibility: String(params.visibility || 'all').trim() || 'all',
    postType:
      params.postType && params.postType !== 'all'
        ? String(params.postType).trim()
        : '',
    page: Number.isFinite(parsedPage) && parsedPage > 0 ? parsedPage : 1,
    limit: Number.isFinite(parsedLimit) && parsedLimit > 0 ? parsedLimit : 6,
  };
};

const toBackendRequestParams = (normalized) => {
  const requestParams = {
    page: normalized.page,
    limit: normalized.limit,
    sort: normalized.sort,
    visibility: normalized.visibility,
  };
  if (normalized.category) requestParams.category = normalized.category;
  if (normalized.tag) requestParams.tag = normalized.tag;
  if (normalized.q) requestParams.q = normalized.q;
  if (normalized.postType) requestParams.postType = normalized.postType;
  return requestParams;
};

export const buildPostsCacheKey = (params = {}) => {
  const normalized = normalizePostsQueryParams(params);
  return JSON.stringify({
    scope: getAuthCacheScope(),
    ...normalized,
  });
};

export const getWarmCachedPosts = (params = {}) => {
  const key = buildPostsCacheKey(params);
  const entry = warmPostsCache.get(key);
  if (!entry) return null;

  if (Date.now() - entry.cachedAt > WARM_CACHE_TTL_MS) {
    warmPostsCache.delete(key);
    return null;
  }

  // Cập nhật LRU: đưa entry vừa đọc về cuối Map (mới nhất)
  warmPostsCache.delete(key);
  warmPostsCache.set(key, entry);
  return entry.response;
};

const setWarmCachedPosts = (key, response) => {
  if (!response || response.fromCache) return;
  if (warmPostsCache.has(key)) {
    warmPostsCache.delete(key);
  } else if (warmPostsCache.size >= WARM_CACHE_MAX_ENTRIES) {
    const oldestKey = warmPostsCache.keys().next().value;
    if (oldestKey !== undefined) {
      warmPostsCache.delete(oldestKey);
    }
  }
  warmPostsCache.set(key, {
    response,
    cachedAt: Date.now(),
  });
};

export const buildPostDetailCacheKey = (slug) => {
  const normalizedSlug = String(slug || '').trim().toLowerCase();
  return JSON.stringify({
    scope: getAuthCacheScope(),
    slug: normalizedSlug,
  });
};

export const getWarmCachedPostBySlug = (slug) => {
  if (!slug) return null;
  const key = buildPostDetailCacheKey(slug);
  const entry = warmPostDetailCache.get(key);
  if (!entry) return null;

  if (Date.now() - entry.cachedAt > WARM_CACHE_TTL_MS) {
    warmPostDetailCache.delete(key);
    return null;
  }

  // Cập nhật LRU: đưa entry vừa đọc về cuối Map
  warmPostDetailCache.delete(key);
  warmPostDetailCache.set(key, entry);
  return entry.response;
};

const setWarmCachedPostBySlug = (key, response) => {
  if (!response || response.fromCache) return;
  if (warmPostDetailCache.has(key)) {
    warmPostDetailCache.delete(key);
  } else if (warmPostDetailCache.size >= WARM_CACHE_MAX_ENTRIES) {
    const oldestKey = warmPostDetailCache.keys().next().value;
    if (oldestKey !== undefined) {
      warmPostDetailCache.delete(oldestKey);
    }
  }
  warmPostDetailCache.set(key, {
    response,
    cachedAt: Date.now(),
  });
};

export const invalidatePostsCache = () => {
  warmCacheEpoch += 1;
  warmPostsCache.clear();
  inFlightPostsRequests.clear();
  warmPostDetailCache.clear();
  inFlightPostDetailRequests.clear();
};

if (typeof window !== 'undefined' && !window.__freedomPostsCacheEventsBound) {
  window.__freedomPostsCacheEventsBound = true;
  const handleCacheInvalidationEvent = () => invalidatePostsCache();
  window.addEventListener('post_updated', handleCacheInvalidationEvent);
  window.addEventListener('freedom_auth_changed', handleCacheInvalidationEvent);
  window.addEventListener('freedom_category_created', handleCacheInvalidationEvent);
  window.addEventListener('profile_updated', handleCacheInvalidationEvent);
}

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
  // Lấy danh sách bài viết (hỗ trợ Warm-Cache 45s & In-Flight Request Deduplication)
  getPosts: async (params = {}, options = {}) => {
    const force = Boolean(options?.force);
    const normalized = normalizePostsQueryParams(params);
    const cacheKey = buildPostsCacheKey(normalized);

    if (!force) {
      const warmHit = getWarmCachedPosts(normalized);
      if (warmHit) {
        return warmHit;
      }

      const existingPromise = inFlightPostsRequests.get(cacheKey);
      if (existingPromise) {
        return existingPromise;
      }
    }

    const requestEpoch = warmCacheEpoch;
    const requestParams = toBackendRequestParams(normalized);

    const requestPromise = (async () => {
      try {
        const res = await apiClient.get('/posts', { params: requestParams });
        if (res && res.data) {
          // Lưu cache offline cho các lần mất mạng hoặc khi backend chưa bật
          if (Array.isArray(res.data)) {
            saveCachedPosts(res.data);
          } else if (res.data.posts && Array.isArray(res.data.posts)) {
            saveCachedPosts(res.data.posts);
          }
          // Chỉ ghi vào Warm-Cache nếu không có mutation/invalidation xảy ra trong lúc chờ API
          if (requestEpoch === warmCacheEpoch) {
            setWarmCachedPosts(cacheKey, res);
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

          if (normalized.category) {
            const lowerCat = normalized.category.toLowerCase();
            filtered = filtered.filter(
              (p) =>
                p.category?.slug === normalized.category ||
                p.category?._id === normalized.category ||
                p.category?.name?.toLowerCase() === lowerCat ||
                (typeof p.category === 'string' && (p.category === normalized.category || p.category.toLowerCase() === lowerCat))
            );
          }

          if (normalized.postType) {
            filtered = filtered.filter((p) => (p.postType || 'article') === normalized.postType);
          }

          if (normalized.tag) {
            const cleanTag = normalized.tag.replace(/^#/, '').trim().toLowerCase();
            filtered = filtered.filter((p) => (p.tags || []).some((t) => t.toLowerCase() === cleanTag));
          }

          if (normalized.q) {
            const lowerQ = normalized.q.toLowerCase().trim();
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

          const page = normalized.page;
          const limit = normalized.limit;
          const total = filtered.length;
          const totalPages = Math.ceil(total / limit) || 1;
          const paginated = filtered.slice((page - 1) * limit, page * limit);

          return {
            data: paginated,
            pagination: {
              total,
              totalPages,
              page,
              limit,
              hasPrevPage: page > 1,
              hasNextPage: page < totalPages,
            },
            success: true,
            fromCache: true,
          };
        }
        throw err;
      }
      return { data: [], success: false };
    })();

    if (!force) {
      inFlightPostsRequests.set(cacheKey, requestPromise);
    }

    try {
      return await requestPromise;
    } finally {
      if (inFlightPostsRequests.get(cacheKey) === requestPromise) {
        inFlightPostsRequests.delete(cacheKey);
      }
    }
  },

  // Lấy chi tiết bài viết theo slug (hỗ trợ Warm-Cache 45s & In-Flight Request Deduplication)
  getPostBySlug: async (slug, options = {}) => {
    if (!slug) throw new Error('Slug bài viết không hợp lệ');
    const force = Boolean(options?.force);
    const normalizedSlug = String(slug || '').trim();
    const cacheKey = buildPostDetailCacheKey(normalizedSlug);

    if (!force) {
      const warmHit = getWarmCachedPostBySlug(normalizedSlug);
      if (warmHit) {
        return warmHit;
      }

      const existingPromise = inFlightPostDetailRequests.get(cacheKey);
      if (existingPromise) {
        return existingPromise;
      }
    }

    const requestEpoch = warmCacheEpoch;

    const requestPromise = (async () => {
      try {
        const res = await apiClient.get(`/posts/slug/${encodeURIComponent(normalizedSlug)}`);
        if (res && res.data) {
          if (requestEpoch === warmCacheEpoch) {
            setWarmCachedPostBySlug(cacheKey, res);
          }
          return res;
        }
      } catch (err) {
        const cached = [...getOfflineCreatedPosts(), ...getCachedPosts()];
        const found = cached.find((p) => p.slug === normalizedSlug || p._id === normalizedSlug);
        if (found) {
          return { data: found, success: true, fromCache: true };
        }
        throw err;
      }
      return { data: null, success: false };
    })();

    if (!force) {
      inFlightPostDetailRequests.set(cacheKey, requestPromise);
    }

    try {
      return await requestPromise;
    } finally {
      if (inFlightPostDetailRequests.get(cacheKey) === requestPromise) {
        inFlightPostDetailRequests.delete(cacheKey);
      }
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
  cheerPost: (id) =>
    apiClient
      .post(`/posts/${id}/cheer`)
      .then((res) => {
        invalidatePostsCache();
        return res;
      })
      .catch(() => ({ success: true })),

  // Bày tỏ cảm xúc về bài viết (sympathy, stop, love, encourage)
  reactPost: (id, type) =>
    apiClient
      .post(`/posts/${id}/react`, { type })
      .then((res) => {
        invalidatePostsCache();
        return res;
      })
      .catch(() => ({ success: true })),

  // Chia sẻ bài viết
  sharePost: (id) =>
    apiClient
      .post(`/posts/${id}/share`)
      .then((res) => {
        invalidatePostsCache();
        return res;
      })
      .catch(() => ({ success: true })),

  // Chia sẻ bài viết về trang cá nhân (Repost)
  repostPost: (id) =>
    apiClient
      .post(`/posts/${id}/repost`)
      .then((res) => {
        invalidatePostsCache();
        return res;
      })
      .catch(() => ({ success: true })),

  // Bật/tắt hiển thị số lượng cảm xúc
  toggleReactionVisibility: (id, showReactionCount) =>
    apiClient.patch(`/posts/${id}/reaction-visibility`, { showReactionCount }).then((res) => {
      invalidatePostsCache();
      return res;
    }),

  // Bật/tắt tính năng bình luận của bài viết
  toggleComments: (id, allowComments) =>
    apiClient.patch(`/posts/${id}/toggle-comments`, { allowComments }).then((res) => {
      invalidatePostsCache();
      return res;
    }),

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
        invalidatePostsCache();
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
      invalidatePostsCache();
      return { data: localPost, success: true, fromLocal: true };
    }
  },

  // Cập nhật bài viết
  updatePost: async (id, postData) => {
    const res = await apiClient.put(`/posts/${id}`, postData);
    const updatedPost = res?.data?.post || res?.data?.data || res?.post || res?.data || res;

    // Đồng bộ an toàn cache localStorage nếu có (không ném lỗi nếu không có trong cache phụ)
    try {
      if (updatedPost && typeof updatedPost === 'object') {
        const mergeUpdatedItem = (list) =>
          Array.isArray(list)
            ? list.map((p) =>
                String(p?._id) === String(id) || (p?.slug && p.slug === id)
                  ? { ...p, ...updatedPost }
                  : p
              )
            : [];
        saveCachedPosts(mergeUpdatedItem(getCachedPosts()));
        saveOfflineCreatedPosts(mergeUpdatedItem(getOfflineCreatedPosts()));
      }
    } catch (_) {}

    invalidatePostsCache();
    return {
      ...(res && typeof res === 'object' ? res : {}),
      success: true,
      data: updatedPost,
    };
  },

  // Xóa bài viết (hoặc Admin xóa ngang bài vi phạm)
  deletePost: (id) =>
    apiClient.delete(`/posts/${id}`).then((res) => {
      invalidatePostsCache();
      return res;
    }),

  // Kiểm duyệt bài viết nhạy cảm (Admin)
  moderatePost: (id, { action, reason }) =>
    apiClient.patch(`/posts/${id}/moderate`, { action, reason }).then((res) => {
      invalidatePostsCache();
      return res;
    }),

  // Lấy danh sách hashtags gợi ý hệ thống
  getHashtags: () => apiClient.get('/posts/hashtags/list').catch(() => ({ data: ['#healing', '#burnout', '#tamSu', '#deadline', '#youCantStopHere'] })),

  // Đăng ký lưu thêm một hashtag mới
  addHashtag: (tag) => apiClient.post('/posts/hashtags/register', { tag }).catch(() => ({ success: true })),
};

/**
 * Predictive Topic Warm-Cache Prefetcher:
 * Nạp trước âm thầm trang 1 của chủ đề kế tiếp khi kéo >= 50% hoặc hover Header Pill 120ms.
 * Tận dụng In-Flight Deduplication để không bao giờ tạo request trùng lặp.
 */
export const prefetchPosts = (params = {}) => {
  if (typeof navigator !== 'undefined' && navigator.onLine === false) {
    return Promise.resolve(null);
  }
  const normalized = normalizePostsQueryParams({ page: 1, limit: 6, ...params });
  const existingWarm = getWarmCachedPosts(normalized);
  if (existingWarm) {
    return Promise.resolve(existingWarm);
  }
  return postService.getPosts(normalized).catch(() => null);
};

/**
 * Predictive Post Detail Warm-Cache Prefetcher:
 * Nạp trước âm thầm chi tiết bài viết khi người dùng hover chuột 120ms hoặc focus bàn phím vào PostCard.
 * Tận dụng In-Flight Deduplication để không bao giờ tạo request trùng lặp.
 */
export const prefetchPostBySlug = (slug) => {
  if (!slug) return Promise.resolve(null);
  if (typeof navigator !== 'undefined' && navigator.onLine === false) {
    return Promise.resolve(null);
  }
  const cleanSlug = String(slug).trim();
  const existingWarm = getWarmCachedPostBySlug(cleanSlug);
  if (existingWarm) {
    return Promise.resolve(existingWarm);
  }
  return postService.getPostBySlug(cleanSlug).catch(() => null);
};
