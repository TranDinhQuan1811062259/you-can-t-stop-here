import apiClient from './apiClient';

/**
 * Fetches users directly from MongoDB backend via /api/admin/users.
 * Always relies on live backend data (no mock or localStorage fallback).
 */
export const getAdminUsers = async ({ search = '', role = 'all', status = 'all', page = 1, limit = 20 } = {}) => {
  const params = { page, limit };
  const cleanSearch = typeof search === 'string' ? search.trim() : '';
  if (cleanSearch) params.search = cleanSearch;
  if (role && role !== 'all') params.role = role;
  if (status && status !== 'all') params.status = status;

  return apiClient.get('/admin/users', { params });
};

/**
 * Updates a user's RBAC role directly in MongoDB.
 */
export const updateAdminUserRole = async (userId, role) => {
  return apiClient.patch(`/admin/users/${encodeURIComponent(userId)}/role`, { role });
};

/**
 * Updates a user's account lock status ('active' | 'banned') directly in MongoDB.
 */
export const updateAdminUserStatus = async (userId, status) => {
  return apiClient.patch(`/admin/users/${encodeURIComponent(userId)}/status`, { status });
};

export default {
  getAdminUsers,
  updateAdminUserRole,
  updateAdminUserStatus,
};
