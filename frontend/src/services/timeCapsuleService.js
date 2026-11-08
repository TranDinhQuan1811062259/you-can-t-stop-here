import apiClient from './apiClient';

const GUEST_ID_KEY = 'freedom_guest_capsule_id';
const LOCAL_CAPSULES_KEY = 'freedom_local_time_capsules_v2';

// Bức thư mẫu chào mừng mặc định - Người dùng luôn thấy có ít nhất 1 hộp thời gian để trải nghiệm ngay
const DEFAULT_WELCOME_CAPSULE = {
  _id: 'capsule_welcome_demo',
  title: 'Gửi Tôi Của Một Ngày Nào Đó...',
  content:
    'Chào bạn! Khi bạn mở được bức thư này, có thể những áp lực của ngày hôm nay đã ở lại phía sau. Dù kết quả thế nào, bạn đã luôn kiên cường và nỗ lực hết mình. Đừng quên mỉm cười và thưởng cho mình một tách trà ấm nhé! 🌿✨',
  creatorName: 'Tôi của ngày hôm qua',
  creatorAvatar: '/images/man.jpg',
  mood: 'hopeful',
  envelopeColor: 'amber',
  musicTheme: 'piano',
  unlockDate: new Date(Date.now() - 60000).toISOString(), // Đã mở khóa sẵn để người dùng mở đọc ngay
  isOpened: false,
  openedAt: null,
  canOpen: true,
  isLocked: false,
  createdAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
};

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

// Đọc danh sách hộp thời gian từ bộ nhớ cục bộ trình duyệt
export const getLocalCapsules = () => {
  try {
    const raw = localStorage.getItem(LOCAL_CAPSULES_KEY);
    if (raw) {
      const list = JSON.parse(raw);
      if (Array.isArray(list) && list.length > 0) {
        return list;
      }
    }
  } catch (e) {
    console.warn('Lỗi đọc local capsules:', e);
  }
  // Khởi tạo thư mẫu ban đầu
  const initial = [DEFAULT_WELCOME_CAPSULE];
  saveLocalCapsules(initial);
  return initial;
};

// Lưu danh sách hộp thời gian xuống bộ nhớ cục bộ
export const saveLocalCapsules = (capsules) => {
  try {
    localStorage.setItem(LOCAL_CAPSULES_KEY, JSON.stringify(capsules || []));
  } catch (e) {
    console.warn('Lỗi lưu local capsules:', e);
  }
};

export const timeCapsuleService = {
  // Lấy danh sách hộp thời gian (Kết hợp cả Backend + Local Storage Fallback 100% không sợ mất dữ liệu)
  getMyCapsules: async () => {
    const guestId = getGuestCapsuleId();
    const localList = getLocalCapsules();

    try {
      const res = await apiClient.get('/time-capsules', {
        headers: { 'x-guest-id': guestId },
      });

      if (res && res.data && Array.isArray(res.data)) {
        const serverCapsules = res.data;
        // Hợp nhất dữ liệu giữa server và local (tránh trùng lặp theo _id hoặc title + createdAt)
        const mergedMap = new Map();

        // Nạp server capsules trước
        serverCapsules.forEach((c) => {
          if (c && c._id) mergedMap.set(c._id, c);
        });

        // Nạp thêm các capsule được tạo khi offline ở local chưa kịp sync
        localList.forEach((c) => {
          if (c && c._id && !mergedMap.has(c._id)) {
            mergedMap.set(c._id, c);
          }
        });

        const mergedList = Array.from(mergedMap.values());
        saveLocalCapsules(mergedList);
        return { data: mergedList, success: true, fromServer: true };
      }
    } catch (err) {
      console.warn('Backend chưa sẵn sàng hoặc ngoại tuyến, sử dụng kho lưu trữ cục bộ:', err?.message);
    }

    // Nếu Backend không phản hồi (offline/ECONNREFUSED/502), trả về dữ liệu lưu trong Local Storage
    const now = Date.now();
    const sanitizedLocal = localList.map((cap) => {
      const unlockTime = new Date(cap.unlockDate).getTime();
      const canOpen = now >= unlockTime;
      return {
        ...cap,
        canOpen,
        isLocked: !canOpen && !cap.isOpened,
        content: canOpen || cap.isOpened ? cap.content : null,
      };
    });

    return { data: sanitizedLocal, success: true, fromLocal: true };
  },

  // Tạo bức thư / chiếc hộp thời gian mới (Lưu ngay vào LocalStorage + Gửi Server)
  createCapsule: async (data) => {
    const guestId = getGuestCapsuleId();
    const nowIso = new Date().toISOString();
    const unlockTime = new Date(data.unlockDate).getTime();
    const canOpen = Date.now() >= unlockTime;

    // 1. Tạo đối tượng capsule hoàn chỉnh
    const newCapsule = {
      _id: `cap_local_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      ...data,
      guestId,
      isOpened: false,
      openedAt: null,
      canOpen,
      isLocked: !canOpen,
      createdAt: nowIso,
      updatedAt: nowIso,
    };

    // 2. Lưu ngay lập tức vào LocalStorage để đảm bảo 100% không bao giờ bị mất thư
    const localList = getLocalCapsules();
    const updatedLocal = [newCapsule, ...localList.filter((c) => c._id !== newCapsule._id)];
    saveLocalCapsules(updatedLocal);

    // 3. Cố gắng đồng bộ lên Backend API
    try {
      const res = await apiClient.post(
        '/time-capsules',
        { ...data, guestId },
        { headers: { 'x-guest-id': guestId } }
      );

      if (res && res.data) {
        // Cập nhật lại _id chuẩn từ server
        const serverCap = res.data;
        const finalized = updatedLocal.map((c) => (c._id === newCapsule._id ? { ...serverCap, content: data.content } : c));
        saveLocalCapsules(finalized);
        return { data: serverCap, success: true };
      }
    } catch (err) {
      console.warn('Backend chưa nhận được thư lúc này, thư đã được bảo lưu an toàn trong máy bạn:', err?.message);
    }

    return { data: newCapsule, success: true };
  },

  // Mở khóa hộp thời gian
  openCapsule: async (id) => {
    const localList = getLocalCapsules();
    const target = localList.find((c) => c._id === id);

    if (target) {
      target.isOpened = true;
      target.openedAt = new Date().toISOString();
      saveLocalCapsules(localList);
    }

    try {
      const res = await apiClient.post(`/time-capsules/${id}/open`);
      if (res && res.data) {
        const fullContent = res.data.content || target?.content;
        const mergedOpened = { ...res.data, content: fullContent };
        if (target) {
          target.content = fullContent;
          saveLocalCapsules(localList);
        }
        return { data: mergedOpened, success: true };
      }
    } catch (err) {
      console.warn('Mở khóa cục bộ thành công (backend offline)');
    }

    return { data: target, success: true };
  },

  // Xóa hộp thời gian
  deleteCapsule: async (id) => {
    const localList = getLocalCapsules();
    const filtered = localList.filter((c) => c._id !== id);
    saveLocalCapsules(filtered);

    try {
      await apiClient.delete(`/time-capsules/${id}`);
    } catch (err) {
      console.warn('Đã xóa cục bộ (backend offline)');
    }

    return { success: true };
  },
};
