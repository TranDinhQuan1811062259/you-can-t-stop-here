import apiClient from './apiClient';

const WARM_PROFILE_CACHE_TTL_MS = 45 * 1000; // 45 giây TTL cho hồ sơ người dùng
const WARM_PROFILE_CACHE_MAX_ENTRIES = 20;   // Tối đa 20 hồ sơ trong bộ nhớ đệm LRU

const warmUserProfileCache = new Map();
const inFlightUserProfileRequests = new Map();
let warmUserProfileEpoch = 0;

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

export const buildUserProfileCacheKey = (userId) => {
  const normalizedId = String(userId || '').trim().toLowerCase();
  return JSON.stringify({
    scope: getAuthCacheScope(),
    userId: normalizedId,
  });
};

export const getWarmCachedUserProfile = (userId) => {
  if (!userId) return null;
  const key = buildUserProfileCacheKey(userId);
  const entry = warmUserProfileCache.get(key);
  if (!entry) return null;

  if (Date.now() - entry.cachedAt > WARM_PROFILE_CACHE_TTL_MS) {
    warmUserProfileCache.delete(key);
    return null;
  }

  // Cập nhật LRU: đưa entry vừa đọc về cuối Map
  warmUserProfileCache.delete(key);
  warmUserProfileCache.set(key, entry);
  return entry.response;
};

const setWarmCachedUserProfile = (key, response) => {
  if (!response) return;
  if (warmUserProfileCache.has(key)) {
    warmUserProfileCache.delete(key);
  } else if (warmUserProfileCache.size >= WARM_PROFILE_CACHE_MAX_ENTRIES) {
    const oldestKey = warmUserProfileCache.keys().next().value;
    if (oldestKey !== undefined) {
      warmUserProfileCache.delete(oldestKey);
    }
  }
  warmUserProfileCache.set(key, {
    response,
    cachedAt: Date.now(),
  });
};

export const invalidateUserProfileCache = () => {
  warmUserProfileEpoch += 1;
  warmUserProfileCache.clear();
  inFlightUserProfileRequests.clear();
};

if (typeof window !== 'undefined' && !window.__freedomUserProfileCacheEventsBound) {
  window.__freedomUserProfileCacheEventsBound = true;
  const handleProfileInvalidation = () => invalidateUserProfileCache();
  window.addEventListener('profile_updated', handleProfileInvalidation);
  window.addEventListener('freedom_auth_changed', handleProfileInvalidation);
  window.addEventListener('user_followed', handleProfileInvalidation);
  window.addEventListener('user_unfollowed', handleProfileInvalidation);
}

export const authService = {
  // Đăng ký tài khoản mới
  register: (userData) => apiClient.post('/auth/register', userData),

  // Đăng nhập
  login: (credentials) => apiClient.post('/auth/login', credentials),

  // Đăng nhập bằng Google Identity Services (Client-side ID Token)
  googleLogin: (credential) => apiClient.post('/auth/google', { credential }),

  // Làm mới Access Token ngầm (Silent Refresh Token)
  refreshToken: (data) => apiClient.post('/auth/refresh-token', data),

  // Đăng xuất tài khoản và thu hồi phiên làm việc hiện tại
  logout: (data) => apiClient.post('/auth/logout', data || {}),

  // Thu hồi phiên đăng nhập trên TẤT CẢ các thiết bị
  logoutAll: () => apiClient.post('/auth/logout-all'),

  // Gửi mã xác nhận OTP qua Email
  sendOtp: (data) => apiClient.post('/auth/send-otp', data),

  // Xác thực OTP và đăng nhập
  verifyOtp: (data) => apiClient.post('/auth/verify-otp', data),

  // Đăng nhập / Đăng ký qua nền tảng Mạng xã hội (Google, Facebook, X, LinkedIn, GitHub)
  socialLogin: (socialData) => apiClient.post('/auth/social-login', socialData),

  // Lấy thông tin user hiện tại
  getMe: () => apiClient.get('/auth/me'),

  // Cập nhật thông tin cá nhân & đổi mật khẩu
  updateProfile: (profileData) =>
    apiClient.put('/auth/profile', profileData).then((res) => {
      invalidateUserProfileCache();
      return res;
    }),

  // Lấy trang cá nhân công khai theo userId hoặc tên (hỗ trợ Warm-Cache 45s & In-Flight Request Deduplication)
  getUserProfile: async (userId, options = {}) => {
    if (!userId) throw new Error('ID người dùng không hợp lệ');
    const force = Boolean(options?.force);
    const normalizedId = String(userId).trim();
    const cacheKey = buildUserProfileCacheKey(normalizedId);

    if (!force) {
      const warmHit = getWarmCachedUserProfile(normalizedId);
      if (warmHit) {
        return warmHit;
      }

      const existingPromise = inFlightUserProfileRequests.get(cacheKey);
      if (existingPromise) {
        return existingPromise;
      }
    }

    const requestEpoch = warmUserProfileEpoch;

    const requestPromise = (async () => {
      const res = await apiClient.get(`/auth/user/${encodeURIComponent(normalizedId)}`);
      if (res && res.data) {
        if (requestEpoch === warmUserProfileEpoch) {
          setWarmCachedUserProfile(cacheKey, res);
        }
      }
      return res;
    })();

    if (!force) {
      inFlightUserProfileRequests.set(cacheKey, requestPromise);
    }

    try {
      return await requestPromise;
    } finally {
      if (inFlightUserProfileRequests.get(cacheKey) === requestPromise) {
        inFlightUserProfileRequests.delete(cacheKey);
      }
    }
  },

  // Hệ thống Đăng nhập bằng mã QR (QR Code Login)
  generateQrSession: () => apiClient.get('/auth/qr/generate'),
  checkQrStatus: (sessionId) => apiClient.get(`/auth/qr/status/${sessionId}`),
  verifyQrSession: (sessionId) => apiClient.post('/auth/qr/verify', { sessionId }),
  simulateQrScan: (sessionId, email) => apiClient.post('/auth/qr/simulate', { sessionId, email }),
};

/**
 * Predictive User Profile Warm-Cache Prefetcher:
 * Nạp trước âm thầm hồ sơ người dùng khi hover 120ms hoặc focus bàn phím vào avatar/tên tác giả.
 * Tận dụng In-Flight Deduplication để không bao giờ tạo request trùng lặp.
 */
export const prefetchUserProfile = (userId) => {
  if (!userId) return Promise.resolve(null);
  if (typeof navigator !== 'undefined' && navigator.onLine === false) {
    return Promise.resolve(null);
  }
  const cleanId = String(userId).trim();
  const existingWarm = getWarmCachedUserProfile(cleanId);
  if (existingWarm) {
    return Promise.resolve(existingWarm);
  }
  return authService.getUserProfile(cleanId).catch(() => null);
};
