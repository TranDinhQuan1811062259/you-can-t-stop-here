import TimeCapsule from '../models/TimeCapsule.js';
import { loadStore, saveStore } from '../utils/persistentStore.js';
import { sendSuccess, sendError } from '../utils/apiResponse.js';
import { checkDbReady } from '../config/db.js';

// Gợi ý demo ban đầu nếu chưa có thư
const DEFAULT_CAPSULES = [
  {
    _id: 'capsule_welcome_demo',
    title: 'Gửi Tôi Của Một Ngày Nào Đó...',
    content:
      'Chào bạn! Khi bạn đọc được những dòng này, có thể những khó khăn của ngày hôm nay đã ở lại phía sau. Dù kết quả có thế nào, hãy nhớ rằng bạn đã luôn nỗ lực hết mình. Đừng quên mỉm cười và tự thưởng cho mình một tách trà ấm nhé! 🌿✨',
    creatorName: 'Tôi của ngày hôm qua',
    creatorAvatar: '/images/man.jpg',
    mood: 'hopeful',
    envelopeColor: 'amber',
    musicTheme: 'piano',
    unlockDate: new Date(Date.now() - 1000).toISOString(), // Đã mở khóa sẵn để người dùng trải nghiệm ngay
    isOpened: false,
    openedAt: null,
    createdAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
  },
];

const getStoreCapsules = () => {
  const store = loadStore();
  if (!store.timeCapsules || !Array.isArray(store.timeCapsules)) {
    store.timeCapsules = [...DEFAULT_CAPSULES];
    saveStore(store);
  }
  return store.timeCapsules;
};

const saveStoreCapsules = (capsules) => {
  const store = loadStore();
  store.timeCapsules = capsules;
  saveStore(store);
};

export const timeCapsuleController = {
  // Lấy danh sách hộp thời gian của tôi (dựa trên user id hoặc guestId)
  getMyCapsules: async (req, res) => {
    try {
      const userId = req.user?._id;
      const guestId = req.headers['x-guest-id'] || req.query.guestId;

      const isMongo = checkDbReady();
      let capsules = [];

      if (isMongo) {
        const query = userId
          ? { $or: [{ user: userId }, { guestId: guestId || 'NONE' }] }
          : { guestId: guestId || 'NONE' };
        capsules = await TimeCapsule.find(query).sort({ createdAt: -1 }).lean();
      }

      if (!capsules || capsules.length === 0) {
        const local = getStoreCapsules();
        capsules = local.filter((c) => {
          if (c._id === 'capsule_welcome_demo') return true; // Luôn hiển thị thư chào mừng
          if (userId && c.userId && String(c.userId) === String(userId)) return true;
          if (guestId && c.guestId === guestId) return true;
          return false;
        });
      }

      // Ẩn nội dung nếu chiếc hộp chưa đến ngày mở khóa (giữ bí mật)
      const now = new Date();
      const sanitized = capsules.map((cap) => {
        const unlock = new Date(cap.unlockDate);
        const canOpen = now >= unlock;
        return {
          ...cap,
          canOpen,
          content: canOpen || cap.isOpened ? cap.content : null,
          isLocked: !canOpen && !cap.isOpened,
        };
      });

      return sendSuccess(res, sanitized, 'Lấy danh sách hộp thời gian thành công');
    } catch (err) {
      console.error('Lỗi getMyCapsules:', err);
      return sendError(res, 'Không thể tải danh sách hộp thời gian', 500);
    }
  },

  // Tạo chiếc hộp thời gian mới
  createCapsule: async (req, res) => {
    try {
      const { title, content, unlockDate, mood, envelopeColor, musicTheme, creatorName } = req.body;
      const userId = req.user?._id;
      const guestId = req.headers['x-guest-id'] || req.body.guestId || `guest_${Date.now()}`;

      if (!title || !content || !unlockDate) {
        return sendError(res, 'Vui lòng điền tiêu đề, nội dung và thời gian mở khóa', 400);
      }

      const unlockTime = new Date(unlockDate);
      if (isNaN(unlockTime.getTime())) {
        return sendError(res, 'Thời gian mở khóa không hợp lệ', 400);
      }

      const capsuleData = {
        title: title.trim(),
        content: content.trim(),
        unlockDate: unlockTime,
        mood: mood || 'hopeful',
        envelopeColor: envelopeColor || 'amber',
        musicTheme: musicTheme || 'piano',
        creatorName: creatorName || req.user?.name || 'Tôi của quá khứ',
        creatorAvatar: req.user?.avatar || '/images/man.jpg',
        user: userId || null,
        guestId: guestId,
        isOpened: false,
        openedAt: null,
      };

      const isMongo = checkDbReady();
      let created = null;

      if (isMongo) {
        created = await TimeCapsule.create(capsuleData);
      }

      // Lưu dự phòng vào db_store.json
      const local = getStoreCapsules();
      const localRecord = {
        _id: created ? created._id.toString() : `cap_${Date.now()}`,
        userId: userId ? String(userId) : null,
        ...capsuleData,
        unlockDate: unlockTime.toISOString(),
        createdAt: new Date().toISOString(),
      };
      local.unshift(localRecord);
      saveStoreCapsules(local);

      return sendSuccess(
        res,
        created || localRecord,
        '✨ Chiếc hộp thời gian đã được khóa kín và cất giữ an toàn!',
        201
      );
    } catch (err) {
      console.error('Lỗi createCapsule:', err);
      return sendError(res, 'Không thể lưu hộp thời gian lúc này', 500);
    }
  },

  // Mở khóa thư
  openCapsule: async (req, res) => {
    try {
      const { id } = req.params;
      const isMongo = checkDbReady();
      const now = new Date();

      let target = null;
      if (isMongo) {
        target = await TimeCapsule.findById(id);
      }

      if (!target) {
        const local = getStoreCapsules();
        target = local.find((c) => String(c._id) === String(id));
      }

      if (!target) {
        return sendError(res, 'Không tìm thấy hộp thời gian', 404);
      }

      const unlock = new Date(target.unlockDate);
      if (now < unlock && !target.isOpened) {
        const diffMs = unlock.getTime() - now.getTime();
        const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
        return sendError(
          res,
          `🔒 Chiếc hộp này vẫn đang bị khóa kín! Hãy quay lại sau ${diffDays} ngày nữa nhé.`,
          403
        );
      }

      // Cập nhật trạng thái đã mở
      if (isMongo && target.save) {
        target.isOpened = true;
        target.openedAt = now;
        await target.save();
      }

      const local = getStoreCapsules();
      const idx = local.findIndex((c) => String(c._id) === String(id));
      if (idx !== -1) {
        local[idx].isOpened = true;
        local[idx].openedAt = now.toISOString();
        saveStoreCapsules(local);
      }

      const result = target.toObject ? target.toObject() : target;
      return sendSuccess(res, { ...result, isOpened: true, openedAt: now }, '🎉 Đã mở khóa bức thư từ quá khứ!');
    } catch (err) {
      console.error('Lỗi openCapsule:', err);
      return sendError(res, 'Không thể mở hộp thời gian', 500);
    }
  },

  // Xóa hộp thời gian
  deleteCapsule: async (req, res) => {
    try {
      const { id } = req.params;
      const isMongo = checkDbReady();

      if (isMongo) {
        await TimeCapsule.findByIdAndDelete(id);
      }

      const local = getStoreCapsules();
      const updated = local.filter((c) => String(c._id) !== String(id));
      saveStoreCapsules(updated);

      return sendSuccess(res, null, 'Đã xóa chiếc hộp thời gian');
    } catch (err) {
      return sendError(res, 'Không thể xóa hộp thời gian', 500);
    }
  },
};
