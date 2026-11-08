import apiClient from './apiClient';

export const uploadService = {
  /**
   * Tải ảnh lên máy chủ (Cloudinary hoặc lưu trữ cục bộ)
   * @param {File} file File ảnh được chọn từ input[type="file"]
   */
  uploadImage: async (file) => {
    const formData = new FormData();
    formData.append('file', file);

    // Không set thủ công Content-Type để Axios và trình duyệt tự động tạo multipart boundary
    const response = await apiClient.post('/upload', formData, {
      headers: {
        'Content-Type': undefined,
      },
    });

    return response.data; // Trả về { url, public_id, isLocal, ... }
  },

  /**
   * Tải và trích xuất nội dung từ file văn bản (Word .docx, PDF .pdf, .txt, .md)
   * @param {File} file File tài liệu
   */
  uploadDocument: async (file) => {
    const formData = new FormData();
    formData.append('file', file);

    const response = await apiClient.post('/upload/document', formData, {
      headers: {
        'Content-Type': undefined,
      },
    });

    return response?.data || response; // Trả về { title, summary, content, htmlContent, wordCount, fileName }
  },
};
