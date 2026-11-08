import apiClient from './apiClient';

const GUEST_ID_KEY = 'freedom_guest_capsule_id';

export const getGuestCapsuleId = () => {
  try {
    let id = localStorage.getItem(GUEST_ID_KEY);
    if (!id) {
      id = `guest_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
      localStorage.setItem(GUEST_ID_KEY, id);
    }
    return id;
  } catch (e) {
    return 'guest_fallback';
  }
};

export const timeCapsuleService = {
  // Lấy danh sách hộp thời gian
  getMyCapsules: () => {
    const guestId = getGuestCapsuleId();
    return apiClient.get('/time-capsules', {
      headers: { 'x-guest-id': guestId },
    });
  },

  // Tạo bức thư / chiếc hộp thời gian mới
  createCapsule: (data) => {
    const guestId = getGuestCapsuleId();
    return apiClient.post(
      '/time-capsules',
      { ...data, guestId },
      { headers: { 'x-guest-id': guestId } }
    );
  },

  // Mở khóa hộp thời gian
  openCapsule: (id) => apiClient.post(`/time-capsules/${id}/open`),

  // Xóa hộp thời gian
  deleteCapsule: (id) => apiClient.delete(`/time-capsules/${id}`),
};
