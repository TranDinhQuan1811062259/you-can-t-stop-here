import apiClient from './apiClient';

export const authService = {
  // Đăng ký tài khoản mới
  register: (userData) => apiClient.post('/auth/register', userData),

  // Đăng nhập
  login: (credentials) => apiClient.post('/auth/login', credentials),

  // Gửi mã xác nhận OTP qua Email
  sendOtp: (data) => apiClient.post('/auth/send-otp', data),

  // Xác thực OTP và đăng nhập
  verifyOtp: (data) => apiClient.post('/auth/verify-otp', data),

  // Đăng nhập / Đăng ký qua nền tảng Mạng xã hội (Google, Facebook, X, LinkedIn, GitHub)
  socialLogin: (socialData) => apiClient.post('/auth/social-login', socialData),

  // Lấy thông tin user hiện tại
  getMe: () => apiClient.get('/auth/me'),

  // Cập nhật thông tin cá nhân & đổi mật khẩu
  updateProfile: (profileData) => apiClient.put('/auth/profile', profileData),

  // Lấy trang cá nhân công khai theo userId hoặc tên
  getUserProfile: (userId) => apiClient.get(`/auth/user/${userId}`),

  // Hệ thống Đăng nhập bằng mã QR (QR Code Login)
  generateQrSession: () => apiClient.get('/auth/qr/generate'),
  checkQrStatus: (sessionId) => apiClient.get(`/auth/qr/status/${sessionId}`),
  verifyQrSession: (sessionId) => apiClient.post('/auth/qr/verify', { sessionId }),
  simulateQrScan: (sessionId, email) => apiClient.post('/auth/qr/simulate', { sessionId, email }),
};
