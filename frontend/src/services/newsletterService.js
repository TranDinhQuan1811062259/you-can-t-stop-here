import apiClient from './apiClient';

export const newsletterService = {
  /**
   * Đăng ký nhận tin & gửi thư trực tiếp vào email
   * @param {string} email 
   */
  subscribe: (email) => apiClient.post('/newsletter/subscribe', { email }),
};

