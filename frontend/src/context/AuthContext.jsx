import React, { createContext, useContext, useState, useEffect } from 'react';
import { authService } from '../services/authService';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem('user');
    return saved ? JSON.parse(saved) : null;
  });
  const [token, setToken] = useState(() => localStorage.getItem('token') || null);
  const [loading, setLoading] = useState(true);

  // Trạng thái mở popup Đăng nhập / Đăng ký
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authModalMode, setAuthModalMode] = useState('login'); // 'login' hoặc 'register'

  // Trạng thái mở popup Chỉnh sửa tài khoản cá nhân
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);

  // Xác thực token lúc khởi động
  useEffect(() => {
    if (token) {
      authService
        .getMe()
        .then((res) => {
          if (res.data) {
            setUser((prev) => ({ ...prev, ...res.data }));
            localStorage.setItem('user', JSON.stringify({ ...user, ...res.data }));
          }
        })
        .catch(() => {
          logout();
        })
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, [token]);

  const login = async (credentials) => {
    const res = await authService.login(credentials);
    const { token: receivedToken, ...userData } = res.data;
    setToken(receivedToken);
    setUser(userData);
    localStorage.setItem('token', receivedToken);
    localStorage.setItem('user', JSON.stringify(userData));
    setIsAuthModalOpen(false);
    return res;
  };

  const register = async (userData) => {
    const res = await authService.register(userData);
    const { token: receivedToken, ...createdUser } = res.data;
    setToken(receivedToken);
    setUser(createdUser);
    localStorage.setItem('token', receivedToken);
    localStorage.setItem('user', JSON.stringify(createdUser));
    setIsAuthModalOpen(false);
    return res;
  };

  const updateUserProfile = (updatedUser) => {
    const { token: newToken, ...restUserData } = updatedUser;
    setUser((prev) => ({ ...prev, ...restUserData }));
    localStorage.setItem('user', JSON.stringify({ ...user, ...restUserData }));

    if (newToken) {
      setToken(newToken);
      localStorage.setItem('token', newToken);
    }
    window.dispatchEvent(new Event('profile_updated'));
  };

  const logout = () => {
    setUser(null);
    setToken(null);
    localStorage.removeItem('token');
    localStorage.removeItem('user');
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

  const openProfileModal = () => {
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
        isAuthenticated: !!user,
        loading,
        login,
        register,
        updateUserProfile,
        logout,
        isAuthModalOpen,
        authModalMode,
        setAuthModalMode,
        openLoginModal,
        openRegisterModal,
        closeAuthModal,
        isProfileModalOpen,
        openProfileModal,
        closeProfileModal,
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
