import apiClient from './apiClient';

const PROFILE_WARM_CACHE_TTL_MS = 60 * 1000;
const PROFILE_WARM_CACHE_MAX_ENTRIES = 25;
const warmProfileCache = new Map();
const inFlightProfileRequests = new Map();
let profileCacheEpoch = 0;

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

export const buildUserProfileCacheKey = (userId) => {
  const normalizedId = String(userId || '').trim();
  if (!normalizedId) return '';
  return `${getAuthCacheScope()}::${normalizedId}`;
};

export const getWarmCachedUserProfile = (userId) => {
  const key = buildUserProfileCacheKey(userId);
  if (!key) return null;
  const cached = warmProfileCache.get(key);
  if (!cached) return null;
  if (Date.now() - cached.savedAt > PROFILE_WARM_CACHE_TTL_MS) {
    warmProfileCache.delete(key);
    return null;
  }
  warmProfileCache.delete(key);
  warmProfileCache.set(key, cached);
  return cached.response;
};

const setWarmCachedUserProfile = (key, response, expectedEpoch) => {
  if (!key || !response || expectedEpoch !== profileCacheEpoch) return;
  if (warmProfileCache.has(key)) {
    warmProfileCache.delete(key);
  } else if (warmProfileCache.size >= PROFILE_WARM_CACHE_MAX_ENTRIES) {
    const oldestKey = warmProfileCache.keys().next().value;
    if (oldestKey) warmProfileCache.delete(oldestKey);
  }
  warmProfileCache.set(key, {
    response,
    savedAt: Date.now(),
  });
};

export const invalidateUserProfileCache = () => {
  profileCacheEpoch += 1;
  warmProfileCache.clear();
  inFlightProfileRequests.clear();
};

const clearLegacyStoredAuthKeys = () => {
  try {
    localStorage.removeItem('user');
    localStorage.removeItem('freedom_persisted_profile');
    localStorage.removeItem('saved_google_accounts');
  } catch (_) {}
};

const saveSessionTokens = (payload) => {
  if (!payload?.token) return;
  try {
    clearLegacyStoredAuthKeys();
    localStorage.setItem('token', payload.token);
    localStorage.setItem('freedom_token', payload.token);
    if (payload.refreshToken) {
      localStorage.setItem('refreshToken', payload.refreshToken);
      localStorage.setItem('freedom_refresh_token', payload.refreshToken);
    }
    invalidateUserProfileCache();
  } catch (_) {}
};

export const clearStoredSessionTokens = () => {
  try {
    localStorage.removeItem('token');
    localStorage.removeItem('freedom_token');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('freedom_refresh_token');
    clearLegacyStoredAuthKeys();
  } catch (_) {}
  invalidateUserProfileCache();
};

export const authService = {
  /**
   * Bước 1 Đăng ký bằng Email hoặc Số điện thoại (chưa cấp JWT, trả requiresOtp: true)
   */
  register: async (userData) => {
    const res = await apiClient.post('/auth/register', userData);
    if (res?.data?.token) {
      saveSessionTokens(res.data);
    }
    return res;
  },

  /**
   * Bước 2 Đăng ký: Xác thực OTP 6 số -> kích hoạt tài khoản & nhận JWT
   */
  verifyRegisterOtp: async (payload) => {
    const res = await apiClient.post('/auth/verify-register-otp', payload);
    if (res?.data?.token) {
      saveSessionTokens(res.data);
    }
    return res;
  },

  /**
   * Gửi lại OTP cho đăng ký / đăng nhập / quên mật khẩu (cooldown 60s)
   */
  resendOtp: async (payload) => {
    return apiClient.post('/auth/resend-otp', payload);
  },

  /**
   * Đăng nhập bằng Mật khẩu (Email hoặc Số điện thoại)
   */
  login: async (credentials) => {
    const res = await apiClient.post('/auth/login', credentials);
    if (res?.data?.token) {
      saveSessionTokens(res.data);
    }
    return res;
  },

  /**
   * Gửi OTP đăng nhập không mật khẩu (Email hoặc Số điện thoại)
   */
  sendLoginOtp: async (payload) => {
    const body = typeof payload === 'string' ? { identifier: payload } : payload;
    return apiClient.post('/auth/send-login-otp', body);
  },

  /**
   * Xác thực OTP đăng nhập -> nhận JWT
   */
  verifyLoginOtp: async (payload) => {
    const res = await apiClient.post('/auth/verify-login-otp', payload);
    if (res?.data?.token) {
      saveSessionTokens(res.data);
    }
    return res;
  },

  /**
   * Alias tương thích cũ
   */
  sendOtp: async (target) => {
    return apiClient.post('/auth/send-login-otp', { identifier: target });
  },

  verifyOtp: async (payload) => {
    const res = await apiClient.post('/auth/verify-otp', payload);
    if (res?.data?.token) {
      saveSessionTokens(res.data);
    }
    return res;
  },

  /**
   * Quên mật khẩu: Gửi OTP đặt lại mật khẩu
   */
  forgotPassword: async (payload) => {
    const body = typeof payload === 'string' ? { identifier: payload } : payload;
    return apiClient.post('/auth/forgot-password', body);
  },

  /**
   * Đặt lại mật khẩu mới bằng OTP
   */
  resetPassword: async (payload) => {
    return apiClient.post('/auth/reset-password', payload);
  },

  googleLogin: async (credential) => {
    const res = await apiClient.post('/auth/google', { credential });
    if (res?.data?.token) {
      saveSessionTokens(res.data);
    }
    return res;
  },

  socialLogin: async (socialData) => {
    const res = await apiClient.post('/auth/social-login', socialData);
    if (res?.data?.token) {
      saveSessionTokens(res.data);
    }
    return res;
  },

  initQrSession: async () => apiClient.get('/auth/qr/generate'),

  checkQrStatus: async (sessionId) => apiClient.get(`/auth/qr/status/${sessionId}`),

  simulateQrScan: async (sessionId, email = '') =>
    apiClient.post('/auth/qr/simulate', { sessionId, email }),

  verifyQrSession: async (sessionId) =>
    apiClient.post('/auth/qr/verify', { sessionId }),

  getMe: async (options = {}) => {
    return apiClient.get('/auth/me', {
      timeout: options.timeout || 25000,
    });
  },

  updateProfile: async (profileData) => {
    const res = await apiClient.put('/auth/profile', profileData);
    if (res?.success) {
      invalidateUserProfileCache();
    }
    return res;
  },

  getUserProfile: async (userId, options = {}) => {
    const normalizedId = String(userId || '').trim();
    if (!normalizedId) throw new Error('Thiếu mã định danh người dùng.');

    const cacheKey = buildUserProfileCacheKey(normalizedId);
    const force = Boolean(options.force);
    const requestEpoch = profileCacheEpoch;

    if (!force && cacheKey) {
      const cached = getWarmCachedUserProfile(normalizedId);
      if (cached) return cached;
      if (inFlightProfileRequests.has(cacheKey)) {
        return inFlightProfileRequests.get(cacheKey);
      }
    }

    const requestPromise = (async () => {
      try {
        const res = await apiClient.get(`/auth/user/${encodeURIComponent(normalizedId)}`);
        if (cacheKey && res?.success && res?.data?.user) {
          setWarmCachedUserProfile(cacheKey, res, requestEpoch);
        }
        return res;
      } finally {
        if (cacheKey) inFlightProfileRequests.delete(cacheKey);
      }
    })();

    if (cacheKey) {
      inFlightProfileRequests.set(cacheKey, requestPromise);
    }

    return requestPromise;
  },

  logout: async () => {
    const refreshToken = localStorage.getItem('refreshToken') || localStorage.getItem('freedom_refresh_token');
    try {
      if (refreshToken) {
        await apiClient.post('/auth/logout', { refreshToken });
      }
    } catch (_) {}
    clearStoredSessionTokens();
  },

  logoutAll: async () => {
    try {
      await apiClient.post('/auth/logout-all');
    } catch (_) {}
    clearStoredSessionTokens();
  },
};

export const prefetchUserProfile = (userId) => {
  const normalizedId = String(userId || '').trim();
  if (!normalizedId) return;
  if (getWarmCachedUserProfile(normalizedId)) return;
  const cacheKey = buildUserProfileCacheKey(normalizedId);
  if (cacheKey && inFlightProfileRequests.has(cacheKey)) return;
  authService.getUserProfile(normalizedId).catch(() => {});
};
