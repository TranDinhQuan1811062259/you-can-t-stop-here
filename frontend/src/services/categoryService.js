import apiClient from './apiClient';

export const categoryService = {
  // Lấy toàn bộ danh mục bài viết
  getCategories: () => apiClient.get('/categories'),

  // Tạo danh mục mới
  createCategory: (data) => apiClient.post('/categories', data),

  // Xóa danh mục
  deleteCategory: (id) => apiClient.delete(`/categories/${id}`),
};

