import apiClient from './apiClient';

export const authService = {
  // Đăng ký tài khoản mới
  register: (userData) => apiClient.post('/auth/register', userData),

  // Đăng nhập
  login: (credentials) => apiClient.post('/auth/login', credentials),

  // Lấy thông tin user hiện tại
  getMe: () => apiClient.get('/auth/me'),

  // Cập nhật thông tin cá nhân & đổi mật khẩu
  updateProfile: (profileData) => apiClient.put('/auth/profile', profileData),
};
