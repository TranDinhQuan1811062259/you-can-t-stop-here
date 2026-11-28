import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import {
  authService,
  clearStoredSessionTokens,
  invalidateUserProfileCache,
} from '../services/authService';
import { applyTheme } from '../utils/themeUtils';

const AuthContext = createContext();

/**
 * Chuẩn hóa đối tượng user trả về từ MongoDB Backend.
 * Bảo toàn chính xác role ('admin' | 'moderator' | 'user') do server cấp,
 * tuyệt đối không nâng quyền hay suy diễn role ở phía Frontend.
 */
export const normalizeSessionUser = (userData) => {
  if (!userData || typeof userData !== 'object') return null;

  const validRoles = ['admin', 'moderator', 'user'];
  const role = validRoles.includes(userData.role) ? userData.role : 'user';
  const rawAvatar = typeof userData.avatar === 'string' ? userData.avatar : '';
  const cleanAvatar =
    !rawAvatar ||
    rawAvatar.includes('/images/man.jpg') ||
    rawAvatar.includes('google_avatar.jpg')
      ? ''
      : rawAvatar;

  return {
    ...userData,
    email: typeof userData.email === 'string' ? userData.email.trim().toLowerCase() : '',
    phone: typeof userData.phone === 'string' ? userData.phone.trim() : '',
    role,
    isVerified: Boolean(userData.isVerified),
    status: userData.status === 'banned' ? 'banned' : 'active',
    avatar: cleanAvatar,
  };
};

// Alias tương thích ngược (không chứa logic hardcode nâng quyền)
export const ensureAdminPrivileges = normalizeSessionUser;

const persistSessionTokensOnly = (tokenVal, refreshTokenVal) => {
  try {
    localStorage.removeItem('user');
    localStorage.removeItem('freedom_persisted_profile');
    localStorage.removeItem('saved_google_accounts');

    if (tokenVal && typeof tokenVal === 'string') {
      localStorage.setItem('token', tokenVal);
      localStorage.setItem('freedom_token', tokenVal);
    }
    if (refreshTokenVal && typeof refreshTokenVal === 'string') {
      localStorage.setItem('refreshToken', refreshTokenVal);
      localStorage.setItem('freedom_refresh_token', refreshTokenVal);
    }
  } catch (_) {}
};

const readStoredToken = () => {
  try {
    const raw = localStorage.getItem('token') || localStorage.getItem('freedom_token') || '';
    const trimmed = String(raw).trim();
    if (!trimmed || ['null', 'undefined', 'false'].includes(trimmed)) return null;
    if (trimmed.split('.').length !== 3) return null;
    return trimmed;
  } catch (_) {
    return null;
  }
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(() => readStoredToken());
  const [loading, setLoading] = useState(() => Boolean(readStoredToken()));
  const [authInitError, setAuthInitError] = useState('');
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authMode, setAuthMode] = useState('login');
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [profileModalTab, setProfileModalTab] = useState('info');

  const clearAuthSession = useCallback(() => {
    clearStoredSessionTokens();
    setToken(null);
    setUser(null);
    setAuthInitError('');
    try {
      window.dispatchEvent(new CustomEvent('freedom_auth_changed', { detail: null }));
    } catch (_) {}
  }, []);

  const applyAuthenticatedSession = useCallback((payload) => {
    const nextToken = payload?.token || payload?.accessToken || readStoredToken();
    const nextRefresh = payload?.refreshToken || '';
    const rawUserObj = payload?.user || payload;
    const normalizedUser = normalizeSessionUser(rawUserObj);

    if (nextToken) {
      persistSessionTokensOnly(nextToken, nextRefresh);
      setToken(nextToken);
    }
    if (normalizedUser) {
      setUser(normalizedUser);
      setAuthInitError('');
      invalidateUserProfileCache();
      try {
        window.dispatchEvent(new CustomEvent('freedom_auth_changed', { detail: normalizedUser }));
      } catch (_) {}
    }
    return normalizedUser;
  }, []);

  // Khởi tạo & đồng bộ phiên từ MongoDB thông qua /api/auth/me (Cấm đọc user giả từ localStorage)
  useEffect(() => {
    let isCancelled = false;

    const bootstrapAuth = async () => {
      // Dọn sạch tàn dư cache profile cũ nếu có trên trình duyệt người dùng
      try {
        localStorage.removeItem('user');
        localStorage.removeItem('freedom_persisted_profile');
        localStorage.removeItem('saved_google_accounts');
      } catch (_) {}

      // Xử lý callback OAuth redirect qua query string
      const params = new URLSearchParams(window.location.search);
      const oauthStatus = params.get('oauth');
      const oauthToken = params.get('token');
      const oauthRefreshToken = params.get('refreshToken');

      if (oauthStatus === 'success' && oauthToken) {
        persistSessionTokensOnly(oauthToken, oauthRefreshToken);
        setToken(oauthToken);
        window.history.replaceState({}, document.title, window.location.pathname);
      } else if (oauthStatus === 'error') {
        const oauthMsg = params.get('message') || 'Đăng nhập OAuth thất bại.';
        if (!isCancelled) setAuthInitError(oauthMsg);
        window.history.replaceState({}, document.title, window.location.pathname);
      }

      const activeToken = oauthStatus === 'success' && oauthToken ? oauthToken : readStoredToken();
      if (!activeToken) {
        if (!isCancelled) {
          setUser(null);
          setToken(null);
          setLoading(false);
        }
        return;
      }

      if (!isCancelled) setLoading(true);
      try {
        const res = await authService.getMe();
        if (isCancelled) return;
        const freshUser = res?.data;
        if (freshUser?._id) {
          const normalized = normalizeSessionUser(freshUser);
          setUser(normalized);
          setToken(readStoredToken() || activeToken);
          setAuthInitError('');
          try {
            window.dispatchEvent(new CustomEvent('freedom_auth_changed', { detail: normalized }));
          } catch (_) {}
        } else {
          clearAuthSession();
        }
      } catch (err) {
        if (isCancelled) return;
        const status = err?.response?.status;
        if (status === 401 || status === 403 || status === 404) {
          clearAuthSession();
          setAuthInitError(err?.response?.data?.message || '');
        } else {
          // Lỗi mạng / Cold start: không tự ý rơi về localStorage giả lập
          setUser(null);
          setAuthInitError('Không thể xác minh phiên đăng nhập do mất kết nối máy chủ.');
        }
      } finally {
        if (!isCancelled) {
          setLoading(false);
        }
      }
    };

    bootstrapAuth();

    const handleSessionExpired = () => {
      clearAuthSession();
      setIsAuthModalOpen(true);
    };

    const handleAuthTokenUpdated = () => {
      const updatedToken = readStoredToken();
      if (updatedToken) setToken(updatedToken);
    };

    const handleStorageChange = (e) => {
      if (e.key === 'token' || e.key === 'freedom_token') {
        if (!e.newValue) {
          clearAuthSession();
        } else {
          setToken(e.newValue);
        }
      }
    };

    window.addEventListener('auth:session_expired', handleSessionExpired);
    window.addEventListener('auth:token_refreshed', handleAuthTokenUpdated);
    window.addEventListener('storage', handleStorageChange);
    return () => {
      isCancelled = true;
      window.removeEventListener('auth:session_expired', handleSessionExpired);
      window.removeEventListener('auth:token_refreshed', handleAuthTokenUpdated);
      window.removeEventListener('storage', handleStorageChange);
    };
  }, [clearAuthSession]);

  const refreshUser = useCallback(async () => {
    const activeToken = readStoredToken();
    if (!activeToken) {
      setUser(null);
      return null;
    }
    const res = await authService.getMe();
    const freshUser = normalizeSessionUser(res?.data);
    if (freshUser) {
      setUser(freshUser);
      setToken(activeToken);
      setAuthInitError('');
      try {
        window.dispatchEvent(new CustomEvent('freedom_auth_changed', { detail: freshUser }));
      } catch (_) {}
    }
    return freshUser;
  }, []);

  const logout = useCallback(
    async (callApi = true) => {
      if (callApi) {
        await authService.logout();
      } else {
        clearStoredSessionTokens();
      }
      setToken(null);
      setUser(null);
      setAuthInitError('');

      try {
        localStorage.removeItem('adminToken');
        sessionStorage.removeItem('google_onetap_dismissed');
        window.dispatchEvent(new CustomEvent('freedom_auth_changed', { detail: null }));
        window.dispatchEvent(new Event('profile_updated'));
      } catch (_) {}

      const currentSavedTheme = localStorage.getItem('freedom_theme_mode') || 'dark';
      applyTheme(currentSavedTheme);
    },
    []
  );

  const logoutAll = useCallback(async () => {
    await authService.logoutAll();
    clearAuthSession();
    try {
      localStorage.removeItem('adminToken');
    } catch (_) {}
    applyTheme(localStorage.getItem('freedom_theme_mode') || 'dark');
  }, [clearAuthSession]);

  const updateUserProfile = useCallback((updatedData) => {
    setUser((prev) => {
      if (!prev) return normalizeSessionUser(updatedData);
      const merged = normalizeSessionUser({ ...prev, ...updatedData });
      try {
        window.dispatchEvent(new Event('profile_updated'));
        window.dispatchEvent(new CustomEvent('freedom_auth_changed', { detail: merged }));
      } catch (_) {}
      return merged;
    });
  }, []);

  const login = async (credentials) => {
    const res = await authService.login(credentials);
    const data = res?.data;
    if (data?.token) {
      applyAuthenticatedSession(data);
      setIsAuthModalOpen(false);
    }
    return res;
  };

  const register = async (userData) => {
    const res = await authService.register(userData);
    const data = res?.data;
    if (data?.token) {
      applyAuthenticatedSession(data);
      setIsAuthModalOpen(false);
    }
    return res;
  };

  const verifyRegisterOtp = async (payload) => {
    const res = await authService.verifyRegisterOtp(payload);
    const data = res?.data;
    if (data?.token) {
      applyAuthenticatedSession(data);
      setIsAuthModalOpen(false);
    }
    return res;
  };

  const resendOtp = async (payload) => authService.resendOtp(payload);

  const sendLoginOtp = async (payload) => authService.sendLoginOtp(payload);

  const verifyLoginOtp = async (payload) => {
    const res = await authService.verifyLoginOtp(payload);
    const data = res?.data;
    if (data?.token) {
      applyAuthenticatedSession(data);
      setIsAuthModalOpen(false);
    }
    return res;
  };

  const loginWithOtp = async (payload) => {
    const res = await authService.verifyLoginOtp(payload);
    const data = res?.data;
    if (data?.token) {
      applyAuthenticatedSession(data);
      setIsAuthModalOpen(false);
    }
    return res;
  };

  const forgotPassword = async (payload) => authService.forgotPassword(payload);

  const resetPassword = async (payload) => authService.resetPassword(payload);

  const socialLogin = async (socialData) => {
    const res = await authService.socialLogin(socialData);
    const data = res?.data;
    if (data?.token) {
      applyAuthenticatedSession(data);
      setIsAuthModalOpen(false);
    }
    return res;
  };

  const loginWithGoogle = async (credential, options = {}) => {
    const { closeOnSuccess = true } = options;
    const res = await authService.googleLogin(credential);
    const data = res?.data;
    if (data?.token) {
      applyAuthenticatedSession(data);
      if (closeOnSuccess) {
        setIsAuthModalOpen(false);
      }
    }
    return res;
  };

  const openLoginModal = useCallback((mode = 'login') => {
    setAuthMode(mode === 'register' ? 'register' : 'login');
    setIsAuthModalOpen(true);
  }, []);

  const openRegisterModal = useCallback(() => {
    setAuthMode('register');
    setIsAuthModalOpen(true);
  }, []);

  const closeAuthModal = useCallback(() => {
    setIsAuthModalOpen(false);
  }, []);

  const openProfileModal = useCallback((tab = 'info') => {
    if (typeof tab === 'string' && ['info', 'layout', 'music'].includes(tab)) {
      setProfileModalTab(tab);
    } else {
      setProfileModalTab('info');
    }
    setIsProfileModalOpen(true);
  }, []);

  const closeProfileModal = useCallback(() => {
    setIsProfileModalOpen(false);
  }, []);

  const handleSetToken = useCallback((nextTok) => {
    if (nextTok && typeof nextTok === 'string') {
      persistSessionTokensOnly(nextTok, '');
      setToken(nextTok);
    } else {
      clearStoredSessionTokens();
      setToken(null);
    }
  }, []);

  const handleSetUser = useCallback((nextUserOrUpdater) => {
    setUser((prev) => {
      const resolved =
        typeof nextUserOrUpdater === 'function' ? nextUserOrUpdater(prev) : nextUserOrUpdater;
      return normalizeSessionUser(resolved);
    });
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        loading,
        authInitError,
        isAuthenticated: Boolean(user && token),
        isAuthModalOpen,
        setIsAuthModalOpen,
        authMode,
        setAuthMode,
        openLoginModal,
        openRegisterModal,
        closeAuthModal,
        isProfileModalOpen,
        profileModalTab,
        openProfileModal,
        closeProfileModal,
        setIsProfileModalOpen: openProfileModal,
        login,
        loginWithOtp,
        register,
        verifyRegisterOtp,
        resendOtp,
        sendLoginOtp,
        verifyLoginOtp,
        forgotPassword,
        resetPassword,
        socialLogin,
        loginWithGoogle,
        logout,
        logoutAll,
        refreshUser,
        updateUserProfile,
        applyAuthenticatedSession,
        setUser: handleSetUser,
        setToken: handleSetToken,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth phải được sử dụng bên trong AuthProvider');
  }
  return ctx;
};
