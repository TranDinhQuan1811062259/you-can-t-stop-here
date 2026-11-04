import axios from 'axios';

// Khởi tạo instance của Axios
const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || '/api',
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Interceptor cho Request: Gắn Bearer Token nếu người dùng đã đăng nhập
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Interceptor cho Response: tự động unwrap dữ liệu và format thông báo lỗi
apiClient.interceptors.response.use(
  (response) => {
    return response.data;
  },
  (error) => {
    let message = error.response?.data?.message;

    if (!message) {
      if (error.code === 'ERR_NETWORK' || error.message === 'Network Error') {
        message = 'Không thể kết nối đến Backend (Cổng 5050)! Bạn hãy chắc chắn đã mở terminal chạy npm run dev trong thư mục backend nhé.';
      } else if (error.response?.status === 500 && !error.response?.data?.message) {
        message = 'Máy chủ Backend (cổng 5050) đang tắt hoặc chưa kết nối được. Vui lòng bật backend bằng lệnh: npm run dev trong thư mục backend';
      } else {
        message = error.message || 'Không thể kết nối đến máy chủ API.';
      }
    }

    return Promise.reject({
      message,
      status: error.response?.status,
    });
  }
);

export default apiClient;

