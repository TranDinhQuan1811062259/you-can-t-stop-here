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
        message = 'Không thể kết nối mạng. Vui lòng kiểm tra lại kết nối.';
      } else if (error.response?.status === 500 && !error.response?.data?.message) {
        message = 'Máy chủ đang bận. Vui lòng thử lại sau.';
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

