import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { authService } from '../services/authService';
import { notifySessionExpired } from '../services/apiClient';

const AuthContext = createContext(null);

const ADMIN_AVATAR = '/uploads/1793903034671-886587470_122145020103357128_3735488146127846733_n.jpg';

// Kênh BroadcastChannel đồng bộ phiên đăng nhập / đăng xuất giữa các tab
const authBroadcastChannel =
  typeof window !== 'undefined' && typeof BroadcastChannel !== 'undefined'
    ? new BroadcastChannel('freedom_auth_sync_channel')
    : null;

/**
 * Đảm bảo tài khoản Quản trị viên luôn có đầy đủ đặc quyền Admin và hình đại diện chuẩn
 */
export const ensureAdminPrivileges = (userData) => {
  if (!userData) return userData;
  const email = (userData.email || '').toLowerCase().trim();

  // Chỉ trao quyền Admin tối cao nếu email trùng khớp với Quản trị viên chính thức
  const isAdmin =
    email === 'anthonyq012025@gmail.com' ||
    email === 'admin@cantstophere.com' ||
    (userData.role === 'admin' && (email.startsWith('admin@') || userData._id === '6aec5b46ee112662b33c0e32'));

  if (isAdmin) {
    const rawAvatar = userData.avatar;
    const isBadAvatar =
      !rawAvatar ||
      rawAvatar.includes('/images/man.jpg') ||
      rawAvatar.includes('google_avatar');

    return {
      ...userData,
      role: 'admin',
      isAdmin: true,
      jobTitle: userData.jobTitle || 'System Admin & Lead Dev',
      avatar: isBadAvatar ? ADMIN_AVATAR : rawAvatar,
    };
  }

  // Đối với tài khoản người dùng bình thường: Làm sạch triệt để avatar man.jpg / google_avatar cũ còn sót trong localStorage
  const rawAvatar = userData.avatar || '';
  const isBadAvatar =
    rawAvatar.includes('/images/man.jpg') ||
    rawAvatar.includes('google_avatar');

  return {
    ...userData,
    role: 'user',
    isAdmin: false,
    jobTitle: userData.jobTitle || 'Thành viên cộng đồng',
    avatar: isBadAvatar ? '' : rawAvatar,
  };
};

/**
 * Lưu đồng bộ toàn bộ session vào các khóa localStorage
 */
const syncAuthStorage = (user, token, refreshToken) => {
  try {
    if (user) {
      const safeUser = ensureAdminPrivileges(user);
      const strUser = JSON.stringify(safeUser);
      localStorage.setItem('user', strUser);
      localStorage.setItem('freedom_persisted_profile', strUser);
    } else {
      localStorage.removeItem('user');
      localStorage.removeItem('freedom_persisted_profile');
    }

    if (token) {
      localStorage.setItem('token', token);
      localStorage.setItem('freedom_token', token);
    } else {
      localStorage.removeItem('token');
      localStorage.removeItem('freedom_token');
    }

    if (refreshToken) {
      localStorage.setItem('refreshToken', refreshToken);
      localStorage.setItem('freedom_refresh_token', refreshToken);
    } else if (refreshToken === null || user === null) {
      localStorage.removeItem('refreshToken');
      localStorage.removeItem('freedom_refresh_token');
    }
  } catch (e) {
    console.warn('[Auth] Lỗi lưu storage:', e);
  }
};

export const AuthProvider = ({ children }) => {
  // Khởi tạo state an toàn từ token và profile đã lưu
  const [token, setToken] = useState(() => {
    return localStorage.getItem('token') || localStorage.getItem('freedom_token') || null;
  });

  const [user, setUser] = useState(() => {
    try {
      const activeToken = localStorage.getItem('token') || localStorage.getItem('freedom_token');
      // 🛡️ NẾU KHÔNG CÓ TOKEN HỢP LỆ: Tuyệt đối KHÔNG nạp snapshot profile mồ côi!
      // Dọn sạch snapshot cũ để tránh tài khoản khách bị hiển thị nhầm thông tin/avatar của Admin
      if (!activeToken) {
        localStorage.removeItem('user');
        localStorage.removeItem('freedom_persisted_profile');
        return null;
      }
      const saved = localStorage.getItem('user') || localStorage.getItem('freedom_persisted_profile');
      if (saved) {
        return ensureAdminPrivileges(JSON.parse(saved));
      }
      return null;
    } catch (e) {
      return null;
    }
  });

  const [loading, setLoading] = useState(true);

  // Trạng thái mở popup Đăng nhập / Đăng ký
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authModalMode, setAuthModalMode] = useState('login'); // 'login' hoặc 'register'

  // Trạng thái mở popup Chỉnh sửa tài khoản cá nhân & tab đang chọn
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [profileModalTab, setProfileModalTab] = useState('info');

  // Lắng nghe callback OAuth từ URL (nếu có chuyển hướng máy chủ OAuth)
  useEffect(() => {
    try {
      const urlParams = new URLSearchParams(window.location.search);
      const oauthStatus = urlParams.get('oauth');
      const oauthToken = urlParams.get('token');
      const oauthRefreshToken = urlParams.get('refreshToken');
      const oauthProvider = urlParams.get('provider');
      const oauthName = urlParams.get('name');
      const oauthEmail = urlParams.get('email');
      const oauthAvatar = urlParams.get('avatar');

      if (oauthStatus === 'success' && oauthToken) {
        const isGoogle = oauthProvider === 'google';
        const isFbOrGh = oauthProvider === 'facebook' || oauthProvider === 'github';
        const defaultGhAvatar = 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=400&q=80';
        const decodedAvatar = oauthAvatar ? decodeURIComponent(oauthAvatar) : '';
        const isAdm = oauthEmail === 'anthonyq012025@gmail.com' || (oauthEmail && oauthEmail.startsWith('admin@'));

        const rawUser = {
          _id: `u_${oauthProvider || 'oauth'}_${Date.now()}`,
          name: oauthName ? decodeURIComponent(oauthName) : (isGoogle ? 'Đơn Thân Mẹ' : 'Thành viên cộng đồng'),
          email: oauthEmail ? decodeURIComponent(oauthEmail) : '',
          role: isAdm ? 'admin' : 'user',
          isAdmin: isAdm,
          avatar: decodedAvatar || (isAdm ? ADMIN_AVATAR : (oauthProvider === 'github' ? defaultGhAvatar : '')),
          jobTitle: oauthProvider === 'github' ? 'Senior Software Engineer' : (oauthProvider === 'facebook' ? 'Content Creator & Connect' : (isAdm ? 'System Admin & Lead Dev' : 'Người đi làm')),
          authProvider: oauthProvider || 'oauth',
        };
        const safeUser = ensureAdminPrivileges(rawUser);

        setToken(oauthToken);
        setUser(safeUser);
        syncAuthStorage(safeUser, oauthToken, oauthRefreshToken);

        window.dispatchEvent(new Event('profile_updated'));
        window.dispatchEvent(new CustomEvent('freedom_auth_changed', { detail: safeUser }));

        // Làm sạch URL mà không reload trang
        window.history.replaceState({}, document.title, window.location.pathname);
      }
    } catch (e) {}
  }, []);

  // 🛡️ Đồng bộ đăng nhập & đăng xuất đa tab / đa phiên (Cross-Tab Synchronization)
  useEffect(() => {
    const applyLogoutState = () => {
      setUser(null);
      setToken(null);
      syncAuthStorage(null, null, null);
      try {
        localStorage.removeItem('user');
        localStorage.removeItem('token');
        localStorage.removeItem('freedom_token');
        localStorage.removeItem('refreshToken');
        localStorage.removeItem('freedom_refresh_token');
        localStorage.removeItem('freedom_persisted_profile');
        sessionStorage.removeItem('token');
        sessionStorage.removeItem('user');
        sessionStorage.removeItem('freedom_otp_resend_until');
      } catch (_) {}
      window.dispatchEvent(new Event('profile_updated'));
      window.dispatchEvent(new CustomEvent('freedom_auth_changed', { detail: null }));
    };

    const applyLoginState = (userData, userToken, userRefreshToken) => {
      if (userData && userToken) {
        const safe = ensureAdminPrivileges(userData);
        setUser(safe);
        setToken(userToken);
        syncAuthStorage(safe, userToken, userRefreshToken);
        window.dispatchEvent(new Event('profile_updated'));
        window.dispatchEvent(new CustomEvent('freedom_auth_changed', { detail: safe }));
      }
    };

    const handleAuthChanged = (e) => {
      const newUser = e?.detail;
      if (!newUser) {
        applyLogoutState();
      }
    };

    const handleStorageEvent = (e) => {
      if (e.key === 'freedom_logout_signal') {
        applyLogoutState();
      } else if (e.key === 'freedom_login_signal') {
        try {
          const rawUser = localStorage.getItem('user');
          const storedToken = localStorage.getItem('token') || localStorage.getItem('freedom_token');
          const storedRt = localStorage.getItem('refreshToken');
          if (rawUser && storedToken) {
            applyLoginState(JSON.parse(rawUser), storedToken, storedRt);
          }
        } catch (_) {}
      }
    };

    const handleBroadcastMessage = (event) => {
      const msg = event?.data;
      if (msg?.type === 'LOGOUT') {
        applyLogoutState();
      } else if (msg?.type === 'LOGIN') {
        applyLoginState(msg.user, msg.token, msg.refreshToken);
      }
    };

    window.addEventListener('freedom_auth_changed', handleAuthChanged);
    window.addEventListener('storage', handleStorageEvent);

    if (authBroadcastChannel) {
      authBroadcastChannel.addEventListener('message', handleBroadcastMessage);
    }

    return () => {
      window.removeEventListener('freedom_auth_changed', handleAuthChanged);
      window.removeEventListener('storage', handleStorageEvent);
      if (authBroadcastChannel) {
        authBroadcastChannel.removeEventListener('message', handleBroadcastMessage);
      }
    };
  }, []);

  // Chỉ xác thực token 1 LẦN DUY NHẤT lúc ứng dụng khởi động (Initial Mount)
  // TUYỆT ĐỐI KHÔNG gọi lại và xóa session của user mỗi khi hàm login vừa chạy!
  const hasInitializedAuthRef = useRef(false);

  useEffect(() => {
    if (hasInitializedAuthRef.current) return;
    hasInitializedAuthRef.current = true;

    const initialToken = localStorage.getItem('token') || localStorage.getItem('freedom_token');

    if (initialToken) {
      authService
        .getMe()
        .then((res) => {
          const profile = res?.data?.data || res?.data;
          if (profile && profile._id) {
            setUser(() => {
              const safeProfile = ensureAdminPrivileges(profile);
              syncAuthStorage(safeProfile, initialToken);
              return safeProfile;
            });
          }
        })
        .catch((err) => {
          // Nếu server trả về 401 Unauthorized thì xóa phiên hết hạn, logout an toàn và báo toast
          if (err?.status === 401 || err?.response?.status === 401) {
            console.warn('[Auth] Token máy chủ hết hạn lúc khởi động, thực hiện đăng xuất an toàn');
            logout(false);
            notifySessionExpired();
          } else {
            console.log('[Auth] Máy chủ offline hoặc lỗi mạng, giữ nguyên phiên làm việc hiện tại');
          }
        })
        .finally(() => setLoading(false));
    } else {
      setUser(null);
      setLoading(false);
    }
  }, []);

  /**
   * Đăng nhập bằng Email/SĐT và Mật khẩu (Trực tiếp, An toàn & Bền vững)
   */
  const login = async (credentials) => {
    try {
      const res = await authService.login(credentials);
      const rawData = res?.data?.data || res?.data || {};
      const receivedToken = rawData.token || res?.token || null;

      if (!receivedToken) {
        throw new Error(res?.data?.message || 'Không nhận được mã xác thực token từ máy chủ!');
      }

      const receivedRefreshToken = rawData.refreshToken || res?.refreshToken || null;
      const { token: _t, refreshToken: _rt, ...extractedUser } = rawData;
      const safeUser = ensureAdminPrivileges(extractedUser);

      setToken(receivedToken);
      setUser(safeUser);
      syncAuthStorage(safeUser, receivedToken, receivedRefreshToken);
      setIsAuthModalOpen(false);

      // Đồng bộ đăng nhập sang các tab khác qua BroadcastChannel & Storage
      authBroadcastChannel?.postMessage({
        type: 'LOGIN',
        user: safeUser,
        token: receivedToken,
        refreshToken: receivedRefreshToken,
      });
      try {
        localStorage.setItem('freedom_login_signal', String(Date.now()));
      } catch (_) {}

      window.dispatchEvent(new Event('profile_updated'));
      window.dispatchEvent(new CustomEvent('freedom_auth_changed', { detail: safeUser }));
      return { data: { token: receivedToken, refreshToken: receivedRefreshToken, ...safeUser } };
    } catch (err) {
      console.error('[Auth] Đăng nhập backend thất bại:', err);
      // 🛡️ BẢO MẬT: Tuyệt đối KHÔNG tự sinh session/token giả mạo khi xác thực thất bại
      throw err;
    }
  };

  /**
   * Đăng nhập bằng mã OTP (Email hoặc SMS)
   */
  const loginWithOtp = async ({ email, identifier, phone, otpCode, remember = true }) => {
    const target = (email || identifier || phone || '').trim();

    try {
      const res = await authService.verifyOtp({ email: target, identifier: target, otpCode });
      const rawData = res?.data?.data || res?.data || {};
      const receivedToken = rawData.token || null;

      if (!receivedToken) {
        throw new Error(res?.data?.message || 'Mã xác nhận OTP không chính xác hoặc đã hết hạn!');
      }

      const receivedRefreshToken = rawData.refreshToken || null;
      const { token: _t, refreshToken: _rt, alertSms, ...extractedUser } = rawData;
      const safeUser = ensureAdminPrivileges(extractedUser);

      setToken(receivedToken);
      setUser(safeUser);
      syncAuthStorage(safeUser, receivedToken, receivedRefreshToken);
      setIsAuthModalOpen(false);

      // Đồng bộ đăng nhập sang các tab khác qua BroadcastChannel & Storage
      authBroadcastChannel?.postMessage({
        type: 'LOGIN',
        user: safeUser,
        token: receivedToken,
        refreshToken: receivedRefreshToken,
      });
      try {
        localStorage.setItem('freedom_login_signal', String(Date.now()));
      } catch (_) {}

      window.dispatchEvent(new Event('profile_updated'));
      window.dispatchEvent(new CustomEvent('freedom_auth_changed', { detail: safeUser }));
      return { data: { token: receivedToken, refreshToken: receivedRefreshToken, ...safeUser } };
    } catch (err) {
      console.error('[Auth] Xác thực OTP thất bại:', err);
      // 🛡️ BẢO MẬT: Bắt buộc ném lỗi để giao diện AuthModal hiển thị thông báo chính xác cho người dùng!
      throw err;
    }
  };

  /**
   * Đăng ký tài khoản mới
   */
  const register = async (userData) => {
    try {
      const res = await authService.register(userData);
      const rawData = res?.data?.data || res?.data || {};
      const receivedToken = rawData.token || res?.token || null;

      if (!receivedToken) {
        throw new Error(res?.data?.message || 'Đăng ký tài khoản không thành công!');
      }

      const receivedRefreshToken = rawData.refreshToken || res?.refreshToken || null;
      const { token: _t, ...extractedUser } = rawData;
      const safeUser = ensureAdminPrivileges(extractedUser);

      setToken(receivedToken);
      setUser(safeUser);
      syncAuthStorage(safeUser, receivedToken, receivedRefreshToken);
      setIsAuthModalOpen(false);

      // Đồng bộ đăng ký/đăng nhập sang các tab khác qua BroadcastChannel & Storage
      authBroadcastChannel?.postMessage({
        type: 'LOGIN',
        user: safeUser,
        token: receivedToken,
        refreshToken: receivedRefreshToken,
      });
      try {
        localStorage.setItem('freedom_login_signal', String(Date.now()));
      } catch (_) {}

      window.dispatchEvent(new Event('profile_updated'));
      window.dispatchEvent(new CustomEvent('freedom_auth_changed', { detail: safeUser }));
      return { data: { token: receivedToken, refreshToken: receivedRefreshToken, ...safeUser } };
    } catch (err) {
      console.error('[Auth] Đăng ký backend thất bại:', err);
      throw err;
    }
  };

  /**
   * Đăng nhập qua mạng xã hội (Google, Facebook, X, TikTok, LinkedIn, GitHub)
   */
  const socialLogin = async (socialData) => {
    try {
      const res = await authService.socialLogin(socialData);
      const rawData = res?.data?.data || res?.data || {};

      // Nếu backend yêu cầu xác thực OTP bảo mật (đặc biệt khi đăng nhập bằng Google hoặc tài khoản Admin)
      if (rawData.requiresOtp) {
        return { requiresOtp: true, ...rawData };
      }

      const receivedToken = rawData.token || res?.token || null;
      if (!receivedToken) {
        throw new Error(res?.data?.message || 'Không nhận được mã xác thực token từ máy chủ!');
      }

      const receivedRefreshToken = rawData.refreshToken || res?.refreshToken || null;
      const { token: _t, refreshToken: _rt, ...extractedUser } = rawData;
      const safeUser = ensureAdminPrivileges(extractedUser);

      setToken(receivedToken);
      setUser(safeUser);
      syncAuthStorage(safeUser, receivedToken, receivedRefreshToken);
      setIsAuthModalOpen(false);

      // Đồng bộ đăng nhập sang các tab khác qua BroadcastChannel & Storage
      authBroadcastChannel?.postMessage({
        type: 'LOGIN',
        user: safeUser,
        token: receivedToken,
        refreshToken: receivedRefreshToken,
      });
      try {
        localStorage.setItem('freedom_login_signal', String(Date.now()));
      } catch (_) {}

      window.dispatchEvent(new Event('profile_updated'));
      window.dispatchEvent(new CustomEvent('freedom_auth_changed', { detail: safeUser }));
      return { data: { token: receivedToken, refreshToken: receivedRefreshToken, ...safeUser } };
    } catch (err) {
      console.error('[Auth] Social login backend thất bại:', err);

      // Nếu có yêu cầu mã OTP từ phía backend
      if (err?.response?.data?.data?.requiresOtp || err?.requiresOtp) {
        return { requiresOtp: true, ...(err?.response?.data?.data || {}) };
      }

      // Ném lỗi để thông báo lên giao diện thay vì tự sinh session giả
      throw err;
    }
  };

  /**
   * Cập nhật thông tin cá nhân của người dùng
   */
  const updateUserProfile = (updatedUser) => {
    const { token: newToken, refreshToken: newRefreshToken, ...restUserData } = updatedUser;
    setUser((prev) => {
      const merged = ensureAdminPrivileges({ ...(prev || {}), ...restUserData });
      syncAuthStorage(
        merged,
        newToken || token,
        newRefreshToken || localStorage.getItem('refreshToken') || localStorage.getItem('freedom_refresh_token')
      );
      return merged;
    });

    if (newToken) {
      setToken(newToken);
    }
    window.dispatchEvent(new Event('profile_updated'));
    window.dispatchEvent(new CustomEvent('freedom_auth_changed', { detail: updatedUser }));
  };

  /**
   * Đăng xuất an toàn và triệt để, đồng thời thu hồi phiên Refresh Token tại máy chủ
   */
  const logout = async (callApi = true) => {
    const activeRefreshToken =
      localStorage.getItem('refreshToken') || localStorage.getItem('freedom_refresh_token');

    if (callApi && activeRefreshToken) {
      try {
        await authService.logout({ refreshToken: activeRefreshToken });
      } catch (_) {}
    }

    setUser(null);
    setToken(null);
    syncAuthStorage(null, null, null);
    try {
      localStorage.removeItem('user');
      localStorage.removeItem('token');
      localStorage.removeItem('freedom_token');
      localStorage.removeItem('refreshToken');
      localStorage.removeItem('freedom_refresh_token');
      localStorage.removeItem('freedom_persisted_profile');
      sessionStorage.removeItem('token');
      sessionStorage.removeItem('user');
      sessionStorage.removeItem('freedom_otp_resend_until');
      // Chống gợi ý Google One Tap bật lên ngay khi vừa chủ động đăng xuất
      sessionStorage.setItem('google_onetap_dismissed', 'true');
    } catch (_) {}
    // 🛡️ PHÁT TÍN HIỆU ĐỒNG BỘ ĐĂNG XUẤT TỚI TẤT CẢ CÁC TAB / CỬA SỔ
    authBroadcastChannel?.postMessage({ type: 'LOGOUT', timestamp: Date.now() });
    try {
      localStorage.setItem('freedom_logout_signal', String(Date.now()));
    } catch (_) {}

    window.dispatchEvent(new Event('profile_updated'));
    window.dispatchEvent(new CustomEvent('freedom_auth_changed', { detail: null }));
  };

  /**
   * Đăng xuất khỏi TẤT CẢ các thiết bị (Logout All Devices)
   */
  const logoutAll = async () => {
    try {
      await authService.logoutAll();
    } catch (_) {}
    await logout(false);
    try {
      const noticeMsg = '✓ Đã thu hồi toàn bộ phiên đăng nhập trên tất cả thiết bị thành công!';
      sessionStorage.setItem('freedom_logout_notice', noticeMsg);
      window.dispatchEvent(new CustomEvent('freedom_logout_notice', { detail: noticeMsg }));
    } catch (_) {}
  };

  const openLoginModal = () => {
    setAuthModalMode('login');
    setIsAuthModalOpen(true);
  };

  const openRegisterModal = () => {
    setAuthModalMode('register');
    setIsAuthModalOpen(true);
  };

  const closeAuthModal = () => {
    setIsAuthModalOpen(false);
  };

  const openProfileModal = (tab = 'info') => {
    if (typeof tab === 'string' && ['info', 'layout', 'music'].includes(tab)) {
      setProfileModalTab(tab);
    } else {
      setProfileModalTab('info');
    }
    setIsProfileModalOpen(true);
  };

  const closeProfileModal = () => {
    setIsProfileModalOpen(false);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isAuthenticated: Boolean(user && token),
        loading,
        login,
        loginWithOtp,
        register,
        socialLogin,
        updateUserProfile,
        logout,
        logoutAll,
        setUser,
        setToken,
        isAuthModalOpen,
        authModalMode,
        setAuthModalMode,
        openLoginModal,
        openRegisterModal,
        closeAuthModal,
        isProfileModalOpen,
        profileModalTab,
        openProfileModal,
        closeProfileModal,
        setIsProfileModalOpen: openProfileModal,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
