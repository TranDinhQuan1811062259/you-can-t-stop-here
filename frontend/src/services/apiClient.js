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
    const token = localStorage.getItem('token') || localStorage.getItem('freedom_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Quản lý trạng thái Silent Refresh Token và hàng đợi Promise khi nhiều API cùng 401 đồng thời
let isRefreshing = false;
let failedQueue = [];
let lastSessionExpiredNoticeTime = 0;

/**
 * Phát thông báo phiên đăng nhập hết hạn ra toàn hệ thống (Có Debounce chống spam)
 */
export const notifySessionExpired = () => {
  const now = Date.now();
  // Chống spam lặp: Nếu có nhiều request cùng nhận lỗi 401 trong 8 giây, chỉ hiển thị đúng 1 lần duy nhất
  if (now - lastSessionExpiredNoticeTime < 8000) return;
  lastSessionExpiredNoticeTime = now;

  try {
    const noticeMsg = 'Phiên đăng nhập đã hết hạn, vui lòng đăng nhập lại.';
    sessionStorage.setItem('freedom_logout_notice', noticeMsg);
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('freedom_logout_notice', { detail: noticeMsg }));
      window.dispatchEvent(new CustomEvent('freedom_session_expired', { detail: { message: noticeMsg } }));
    }
  } catch (_) {}
};

const processQueue = (error, newAccessToken = null) => {
  failedQueue.forEach((promise) => {
    if (error) {
      promise.reject(error);
    } else {
      promise.resolve(newAccessToken);
    }
  });
  failedQueue = [];
};

// Interceptor cho Response: tự động unwrap dữ liệu và Silent Refresh Token ngầm khi access token hết hạn
apiClient.interceptors.response.use(
  (response) => {
    return response.data;
  },
  async (error) => {
    const originalRequest = error.config;
    const status = error.response?.status;

    // Kiểm tra xem lỗi có phải là 401 Unauthorized và có thể làm mới token ngầm hay không
    const isAuthEndpoint =
      originalRequest?.url?.includes('/auth/login') ||
      originalRequest?.url?.includes('/auth/register') ||
      originalRequest?.url?.includes('/auth/refresh-token') ||
      originalRequest?.url?.includes('/auth/social-login') ||
      originalRequest?.url?.includes('/auth/send-otp') ||
      originalRequest?.url?.includes('/auth/verify-otp');

    if (status === 401 && originalRequest && !originalRequest._retry && !isAuthEndpoint) {
      const storedRefreshToken =
        localStorage.getItem('refreshToken') || localStorage.getItem('freedom_refresh_token');

      // Nếu không có refresh token, không thể làm mới ngầm -> Làm sạch session và thông báo nếu trước đó có token
      if (!storedRefreshToken) {
        const hadActiveSession = Boolean(localStorage.getItem('token') || localStorage.getItem('freedom_token'));
        if (hadActiveSession) {
          try {
            localStorage.removeItem('token');
            localStorage.removeItem('freedom_token');
            localStorage.removeItem('user');
            localStorage.removeItem('freedom_persisted_profile');
            sessionStorage.removeItem('token');
            sessionStorage.removeItem('user');
            window.dispatchEvent(new CustomEvent('freedom_auth_changed', { detail: null }));
            notifySessionExpired();
          } catch (_) {}
        }
        return Promise.reject(formatApiError(error));
      }

      if (isRefreshing) {
        // Nếu một request khác đang tiến hành làm mới token, đưa request này vào hàng đợi chờ token mới
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then((token) => {
            originalRequest.headers.Authorization = `Bearer ${token}`;
            return apiClient(originalRequest);
          })
          .catch((err) => Promise.reject(formatApiError(err)));
      }

      originalRequest._retry = true;
      isRefreshing = true;

      const baseURL = apiClient.defaults.baseURL || '/api';

      try {
        // Gọi trực tiếp axios raw để tránh lặp vô tận qua apiClient interceptor
        const refreshResponse = await axios.post(
          `${baseURL}/auth/refresh-token`,
          { refreshToken: storedRefreshToken },
          {
            headers: { 'Content-Type': 'application/json' },
            timeout: 15000,
          }
        );

        const responsePayload = refreshResponse.data?.data || refreshResponse.data;
        const newAccessToken = responsePayload?.token;
        const newRefreshToken = responsePayload?.refreshToken;

        if (!newAccessToken) {
          throw new Error('Máy chủ không trả về access token mới');
        }

        // Cập nhật token mới vào storage và defaults của axios
        localStorage.setItem('token', newAccessToken);
        localStorage.setItem('freedom_token', newAccessToken);
        if (newRefreshToken) {
          localStorage.setItem('refreshToken', newRefreshToken);
          localStorage.setItem('freedom_refresh_token', newRefreshToken);
        }

        apiClient.defaults.headers.common['Authorization'] = `Bearer ${newAccessToken}`;
        originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;

        processQueue(null, newAccessToken);
        return apiClient(originalRequest);
      } catch (refreshErr) {
        // Refresh token đã hết hạn hoặc bị thu hồi (Revoke Session): Làm sạch session an toàn
        processQueue(refreshErr, null);
        try {
          localStorage.removeItem('token');
          localStorage.removeItem('freedom_token');
          localStorage.removeItem('refreshToken');
          localStorage.removeItem('freedom_refresh_token');
          localStorage.removeItem('user');
          localStorage.removeItem('freedom_persisted_profile');
          sessionStorage.removeItem('token');
          sessionStorage.removeItem('user');
          window.dispatchEvent(new CustomEvent('freedom_auth_changed', { detail: null }));
          notifySessionExpired();
        } catch (_) {}

        return Promise.reject(formatApiError(refreshErr));
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(formatApiError(error));
  }
);

/**
 * Format thông báo lỗi thân thiện tiếng Việt cho toàn hệ thống
 */
function formatApiError(error) {
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

  return {
    message,
    status: error.response?.status,
    code: error.code,
  };
}

export default apiClient;
