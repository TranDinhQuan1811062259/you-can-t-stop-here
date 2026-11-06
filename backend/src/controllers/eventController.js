import { loadStore, saveStore } from '../utils/persistentStore.js';
import { sendSuccess, sendError } from '../utils/apiResponse.js';

export const DEFAULT_FESTIVE_EVENTS = [
  {
    id: 'giai_phong_30_4',
    name: '30/4 & 1/5: Giải Phóng Miền Nam & Quốc Tế Lao Động',
    shortName: '30/4 & 1/5',
    icon: '🇻🇳',
    bannerTitle: 'Mừng Đại Thắng Mùa Xuân 30/4 & Quốc Tế Lao Động 1/5',
    bannerDesc: 'Tri ân thế hệ cha anh, tự hào non sông thống nhất một dải và tôn vinh những người lao động Việt Nam',
    startDay: 30,
    startMonth: 4,
    durationDays: 3,
    particles: ['🇻🇳', '⭐', '🕊️', '✨', '🎆'],
    particleType: 'vietnam_flag',
    themeColor: '#dc2626',
    accentColor: '#facc15',
    isActive: true,
    isBuiltin: true,
  },
  {
    id: 'quoc_khanh_2_9',
    name: 'Quốc Khánh Việt Nam 2/9 (Ngày Độc Lập)',
    shortName: 'Quốc Khánh 2/9',
    icon: '🇻🇳',
    bannerTitle: 'Chào Mừng Ngày Quốc Khánh Nước CHXHCN Việt Nam 2/9',
    bannerDesc: 'Bản Tuyên ngôn Độc lập vang vọng ngàn đời • Độc lập - Tự do - Hạnh phúc',
    startDay: 1,
    startMonth: 9,
    durationDays: 3,
    particles: ['🇻🇳', '⭐', '🎆', '🕊️', '✨'],
    particleType: 'independence_day',
    themeColor: '#b91c1c',
    accentColor: '#eab308',
    isActive: true,
    isBuiltin: true,
  },
  {
    id: 'quoc_te_phu_nu_8_3',
    name: 'Ngày Quốc Tế Phụ Nữ 8/3',
    shortName: 'Quốc Tế Phụ Nữ 8/3',
    icon: '🌹',
    bannerTitle: 'Chúc Mừng Ngày Quốc Tế Phụ Nữ 8/3',
    bannerDesc: 'Gửi trọn yêu thương & sự biết ơn tới những người phụ nữ tuyệt vời quanh ta',
    startDay: 7,
    startMonth: 3,
    durationDays: 3,
    particles: ['🌹', '🌷', '🌸', '🎀', '💖', '✨'],
    particleType: 'flower_petals',
    themeColor: '#ec4899',
    accentColor: '#f472b6',
    isActive: true,
    isBuiltin: true,
  },
  {
    id: 'quoc_te_thieu_nhi_1_6',
    name: 'Ngày Quốc Tế Thiếu Nhi 1/6',
    shortName: 'Thiếu Nhi 1/6',
    icon: '🎈',
    bannerTitle: 'Chúc Mừng Ngày Quốc Tế Thiếu Nhi 1/6',
    bannerDesc: 'Giữ mãi nụ cười hồn nhiên, trong trẻo và nuôi dưỡng ước mơ bay cao',
    startDay: 1,
    startMonth: 6,
    durationDays: 2,
    particles: ['🎈', '🍭', '🎡', '🧸', '⭐', '✨'],
    particleType: 'balloons',
    themeColor: '#06b6d4',
    accentColor: '#f97316',
    isActive: true,
    isBuiltin: true,
  },
  {
    id: 'tet_duong_lich',
    name: 'Tết Dương Lịch (New Year Countdown)',
    shortName: 'Tết Dương Lịch',
    icon: '🎆',
    bannerTitle: 'Chào Đón Năm Mới • Happy New Year',
    bannerDesc: 'Khép lại năm cũ, vững vàng khởi đầu chặng đường mới rực rỡ và thành công',
    startDay: 31,
    startMonth: 12,
    durationDays: 3,
    particles: ['🎆', '✨', '🍾', '🎊', '🎉', '🥂'],
    particleType: 'fireworks',
    themeColor: '#f59e0b',
    accentColor: '#fbbf24',
    isActive: true,
    isBuiltin: true,
  },
  {
    id: 'tet_nguyen_dan',
    name: 'Tết Nguyên Đán (Tết Cổ Truyền Việt Nam)',
    shortName: 'Tết Nguyên Đán',
    icon: '🧧',
    bannerTitle: 'Chúc Mừng Năm Mới • Vạn Sự Như Ý • An Khang Thịnh Vượng',
    bannerDesc: 'Tết đoàn viên, mai đào khoe sắc, gói trọn bình an và tài lộc tới mọi nhà',
    startDay: 28,
    startMonth: 1,
    durationDays: 8,
    particles: ['🌸', '🌼', '🧧', '🏮', '🧨', '✨'],
    particleType: 'tet_blossoms',
    themeColor: '#dc2626',
    accentColor: '#facc15',
    isActive: true,
    isBuiltin: true,
  },
  {
    id: 'tet_trung_thu',
    name: 'Tết Trung Thu (Rằm Tháng Tám)',
    shortName: 'Tết Trung Thu',
    icon: '🏮',
    bannerTitle: 'Vui Hội Trăng Rằm • Tết Trung Thu Đoàn Viên',
    bannerDesc: 'Đèn lồng thắp sáng ước mơ, ngắm trăng rằm sum vầy ấm cúng',
    startDay: 15,
    startMonth: 9,
    durationDays: 3,
    particles: ['🏮', '🌕', '🥮', '⭐', '✨'],
    particleType: 'lanterns',
    themeColor: '#ea580c',
    accentColor: '#fde047',
    isActive: true,
    isBuiltin: true,
  },
  {
    id: 'phu_nu_viet_nam_20_10',
    name: 'Ngày Phụ Nữ Việt Nam 20/10',
    shortName: 'Phụ Nữ VN 20/10',
    icon: '💐',
    bannerTitle: 'Chúc Mừng Ngày Phụ Nữ Việt Nam 20/10',
    bannerDesc: 'Tôn vinh vẻ đẹp kiên cường, đảm đang và duyên dáng của người phụ nữ Việt Nam',
    startDay: 19,
    startMonth: 10,
    durationDays: 3,
    particles: ['💐', '🌸', '💖', '🌷', '✨'],
    particleType: 'flower_petals',
    themeColor: '#db2777',
    accentColor: '#f472b6',
    isActive: true,
    isBuiltin: true,
  },
  {
    id: 'nha_giao_viet_nam_20_11',
    name: 'Ngày Nhà Giáo Việt Nam 20/11',
    shortName: 'Nhà Giáo 20/11',
    icon: '🌻',
    bannerTitle: 'Tri Ân Ngày Nhà Giáo Việt Nam 20/11',
    bannerDesc: 'Tôn sư trọng đạo • Gửi lời tri ân sâu sắc tới những người lái đò thầm lặng',
    startDay: 19,
    startMonth: 11,
    durationDays: 3,
    particles: ['🌻', '📖', '🖋️', '💐', '✨'],
    particleType: 'sunflowers',
    themeColor: '#0284c7',
    accentColor: '#facc15',
    isActive: true,
    isBuiltin: true,
  },
  {
    id: 'giang_sinh_noel',
    name: 'Giáng Sinh (Merry Christmas)',
    shortName: 'Giáng Sinh',
    icon: '🎄',
    bannerTitle: 'Merry Christmas • Mùa Giáng Sinh An Lành & Ấm Áp',
    bannerDesc: 'Những ngọn nến lung linh và giai điệu Giáng sinh sưởi ấm tâm hồn',
    startDay: 23,
    startMonth: 12,
    durationDays: 4,
    particles: ['❄️', '🎄', '🔔', '🎁', '🎅'],
    particleType: 'christmas',
    themeColor: '#15803d',
    accentColor: '#ef4444',
    isActive: true,
    isBuiltin: true,
  },
];

/**
 * Kiểm tra xem một sự kiện có đang diễn ra hôm nay không
 */
export const isEventHappeningToday = (event, checkDate = new Date()) => {
  if (!event || event.isActive === false) return false;

  const currentYear = checkDate.getFullYear();
  const startDay = Number(event.startDay) || 1;
  const startMonth = Number(event.startMonth) || 1;
  const duration = Math.max(1, Number(event.durationDays) || 1);

  // Tạo mốc bắt đầu
  let start = new Date(currentYear, startMonth - 1, startDay, 0, 0, 0, 0);
  let end = new Date(start.getTime() + duration * 24 * 60 * 60 * 1000 - 1);

  // Xử lý sự kiện vắt qua năm mới (ví dụ 31/12 đến 2/1)
  if (startMonth === 12 && startDay + duration > 31) {
    if (checkDate.getMonth() === 0) {
      // Đang ở tháng 1 đầu năm mới
      start = new Date(currentYear - 1, startMonth - 1, startDay, 0, 0, 0, 0);
      end = new Date(start.getTime() + duration * 24 * 60 * 60 * 1000 - 1);
    }
  }

  const checkTime = checkDate.getTime();
  return checkTime >= start.getTime() && checkTime <= end.getTime();
};

/**
 * Lấy danh sách sự kiện từ store (kèm default nếu chưa có)
 */
export const getStoredEvents = () => {
  const store = loadStore();
  if (!Array.isArray(store.festiveEvents) || store.festiveEvents.length === 0) {
    store.festiveEvents = [...DEFAULT_FESTIVE_EVENTS];
    saveStore(store);
  }
  return store.festiveEvents;
};

/**
 * Lấy danh sách tất cả các sự kiện
 */
export const getEvents = async (req, res) => {
  try {
    const events = getStoredEvents();
    const store = loadStore();
    const previewId = store.adminPreviewEventId || null;
    const now = new Date();

    const formatted = events.map((ev) => {
      const isToday = isEventHappeningToday(ev, now);
      const isPreview = previewId === ev.id;
      return {
        ...ev,
        isCurrentlyActive: isPreview || isToday,
        isToday,
        isPreview,
      };
    });

    return sendSuccess(res, {
      message: 'Lấy danh sách sự kiện thành công',
      data: {
        events: formatted,
        previewEventId: previewId,
      },
    });
  } catch (error) {
    return sendError(res, { message: error.message, status: 500 });
  }
};

/**
 * Lấy sự kiện đang diễn ra hôm nay (dành cho client áp dụng hiệu ứng tự động)
 */
export const getActiveEvent = async (req, res) => {
  try {
    const events = getStoredEvents();
    const store = loadStore();
    const previewId = store.adminPreviewEventId || null;

    // 1. Ưu tiên sự kiện admin đang preview thử nghiệm
    if (previewId) {
      const matchPreview = events.find((e) => e.id === previewId);
      if (matchPreview) {
        return sendSuccess(res, {
          message: 'Sự kiện đang chạy (Preview Admin)',
          data: { ...matchPreview, isPreview: true },
        });
      }
    }

    // 2. Kiểm tra theo ngày lịch thực tế
    const now = new Date();
    const activeEvent = events.find((ev) => isEventHappeningToday(ev, now));

    return sendSuccess(res, {
      message: activeEvent ? 'Phát hiện sự kiện lễ hội hôm nay' : 'Không có sự kiện lễ hội hôm nay',
      data: activeEvent || null,
    });
  } catch (error) {
    return sendError(res, { message: error.message, status: 500 });
  }
};

/**
 * Cập nhật sự kiện (Admin)
 */
export const updateEvent = async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    const store = loadStore();
    store.festiveEvents = store.festiveEvents || [...DEFAULT_FESTIVE_EVENTS];

    const idx = store.festiveEvents.findIndex((e) => e.id === id);
    if (idx === -1) {
      return sendError(res, { message: 'Không tìm thấy sự kiện này', status: 404 });
    }

    store.festiveEvents[idx] = {
      ...store.festiveEvents[idx],
      ...updates,
      id, // Không đổi id
    };

    saveStore(store);

    return sendSuccess(res, {
      message: 'Cập nhật sự kiện thành công',
      data: store.festiveEvents[idx],
    });
  } catch (error) {
    return sendError(res, { message: error.message, status: 500 });
  }
};

/**
 * Tạo sự kiện mới (Admin custom)
 */
export const createEvent = async (req, res) => {
  try {
    const {
      name,
      shortName,
      icon,
      bannerTitle,
      bannerDesc,
      startDay,
      startMonth,
      durationDays,
      particles,
      particleType,
      themeColor,
      accentColor,
    } = req.body;

    if (!name || !startDay || !startMonth) {
      return sendError(res, { message: 'Vui lòng nhập tên sự kiện, ngày và tháng bắt đầu', status: 400 });
    }

    const store = loadStore();
    store.festiveEvents = store.festiveEvents || [...DEFAULT_FESTIVE_EVENTS];

    const newId = `custom_event_${Date.now()}`;
    const newEvent = {
      id: newId,
      name: name.trim(),
      shortName: (shortName || name).trim(),
      icon: icon || '🎉',
      bannerTitle: bannerTitle ? bannerTitle.trim() : `Chào Mừng ${name}`,
      bannerDesc: bannerDesc ? bannerDesc.trim() : 'Chúc cộng đồng ngày lễ thật nhiều niềm vui và bình an',
      startDay: Number(startDay) || 1,
      startMonth: Number(startMonth) || 1,
      durationDays: Math.max(1, Number(durationDays) || 1),
      particles: Array.isArray(particles) && particles.length ? particles : ['✨', '🎉', '🌟', '💖'],
      particleType: particleType || 'custom',
      themeColor: themeColor || '#0d9488',
      accentColor: accentColor || '#2dd4bf',
      isActive: true,
      isBuiltin: false,
    };

    store.festiveEvents.push(newEvent);
    saveStore(store);

    return sendSuccess(res, {
      message: 'Tạo sự kiện lễ hội mới thành công',
      data: newEvent,
      status: 201,
    });
  } catch (error) {
    return sendError(res, { message: error.message, status: 500 });
  }
};

/**
 * Xóa sự kiện custom (Admin)
 */
export const deleteEvent = async (req, res) => {
  try {
    const { id } = req.params;
    const store = loadStore();
    store.festiveEvents = store.festiveEvents || [...DEFAULT_FESTIVE_EVENTS];

    const target = store.festiveEvents.find((e) => e.id === id);
    if (!target) {
      return sendError(res, { message: 'Không tìm thấy sự kiện', status: 404 });
    }

    if (target.isBuiltin) {
      return sendError(res, { message: 'Không thể xóa sự kiện mặc định của hệ thống. Bạn có thể chọn tắt sự kiện thay vì xóa!', status: 400 });
    }

    store.festiveEvents = store.festiveEvents.filter((e) => e.id !== id);
    if (store.adminPreviewEventId === id) {
      store.adminPreviewEventId = null;
    }
    saveStore(store);

    return sendSuccess(res, {
      message: 'Đã xóa sự kiện thành công',
    });
  } catch (error) {
    return sendError(res, { message: error.message, status: 500 });
  }
};

/**
 * Bật / Tắt xem thử sự kiện ngay lập tức (Admin Preview Mode)
 */
export const previewEvent = async (req, res) => {
  try {
    const { id } = req.body;
    const store = loadStore();

    if (!id || store.adminPreviewEventId === id) {
      store.adminPreviewEventId = null;
    } else {
      store.adminPreviewEventId = id;
    }

    saveStore(store);

    return sendSuccess(res, {
      message: store.adminPreviewEventId ? `Đang bật thử nghiệm sự kiện: ${id}` : 'Đã tắt thử nghiệm sự kiện',
      data: { previewEventId: store.adminPreviewEventId },
    });
  } catch (error) {
    return sendError(res, { message: error.message, status: 500 });
  }
};
