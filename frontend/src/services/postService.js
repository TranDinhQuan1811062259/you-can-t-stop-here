import apiClient from './apiClient';

const POSTS_REQUEST_TIMEOUT_MS = 45000; // 45s chịu tải Render Cold Start
const WARM_CACHE_TTL_MS = 45 * 1000; // 45 giây TTL cho warm-cache chuyển chủ đề 0ms trong RAM phiên hiện tại
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
  if (!response) return;
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
  if (!response) return;
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

export const postService = {
  // Lấy 100% danh sách bài viết thật từ MongoDB Backend (kèm 45s timeout + Cold Start retry trên apiClient)
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
      const res = await apiClient.get('/posts', {
        params: requestParams,
        timeout: POSTS_REQUEST_TIMEOUT_MS,
      });

      if (!res || !Array.isArray(res?.data?.posts || res?.data)) {
        throw new Error(res?.message || 'Dữ liệu bài viết trả về từ máy chủ không hợp lệ.');
      }

      // Chỉ ghi vào Warm-Cache trong RAM nếu không có mutation/invalidation xảy ra trong lúc chờ API
      if (requestEpoch === warmCacheEpoch) {
        setWarmCachedPosts(cacheKey, res);
      }
      return res;
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

  // Lấy chi tiết bài viết theo slug trực tiếp từ MongoDB Backend (timeout 45s cho Render Cold Start)
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
      const res = await apiClient.get(`/posts/slug/${encodeURIComponent(normalizedSlug)}`, {
        timeout: POSTS_REQUEST_TIMEOUT_MS,
      });
      if (!res?.data) {
        throw new Error(res?.message || 'Không tìm thấy bài viết.');
      }
      if (requestEpoch === warmCacheEpoch) {
        setWarmCachedPostBySlug(cacheKey, res);
      }
      return res;
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

  // Lấy chi tiết bài viết theo id trực tiếp từ MongoDB Backend
  getPostById: async (id) => {
    return apiClient.get(`/posts/${encodeURIComponent(id)}`, {
      timeout: POSTS_REQUEST_TIMEOUT_MS,
    });
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

  // Lấy danh sách bài viết mới nhất từ MongoDB Backend (widget sidebar)
  getRecentPosts: async (limit = 4) => {
    return apiClient.get('/posts/recent', {
      params: { limit },
      timeout: POSTS_REQUEST_TIMEOUT_MS,
    });
  },

  // Tạo mới bài viết trực tiếp trên Backend MongoDB (không tạo bài giả lập local)
  createPost: async (postData) => {
    const res = await apiClient.post('/posts', postData, {
      timeout: POSTS_REQUEST_TIMEOUT_MS,
    });
    const created = res?.data || res;
    invalidatePostsCache();
    return { data: created, success: true };
  },

  // Cập nhật bài viết
  updatePost: async (id, postData) => {
    const res = await apiClient.put(`/posts/${id}`, postData, {
      timeout: POSTS_REQUEST_TIMEOUT_MS,
    });
    const updatedPost = res?.data?.post || res?.data?.data || res?.post || res?.data || res;

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
