import axios from 'axios';

// Khởi tạo instance của Axios với timeout 60 giây (tối ưu cho Vercel & Render khi máy chủ đám mây khởi động lại từ Cold Start)
const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || '/api',
  timeout: 60000, // 60s: Đảm bảo không bị hủy ngang kết nối khi gửi Email OTP qua Nodemailer hoặc máy chủ đang bật
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

// Interceptor cho Response: tự động unwrap dữ liệu và format thông báo lỗi thân thiện tiếng Việt
apiClient.interceptors.response.use(
  (response) => {
    return response.data;
  },
  (error) => {
    let message = error.response?.data?.message;

    if (!message) {
      if (error.code === 'ECONNABORTED' || (error.message && error.message.toLowerCase().includes('timeout'))) {
        message = 'Máy chủ phản hồi chậm hoặc đang khởi động từ chế độ ngủ (Sleep Mode). Vui lòng thử lại sau vài giây!';
      } else if (error.code === 'ERR_NETWORK' || error.message === 'Network Error') {
        message = 'Không thể kết nối đến máy chủ API. Vui lòng kiểm tra lại kết nối mạng hoặc server backend.';
      } else if (error.response?.status === 500 && !error.response?.data?.message) {
        message = 'Máy chủ đang bận xử lý. Vui lòng thử lại sau.';
      } else {
        message = error.message || 'Không thể kết nối đến máy chủ API.';
      }
    }

    return Promise.reject({
      message,
      status: error.response?.status,
      code: error.code,
    });
  }
);

export default apiClient;

