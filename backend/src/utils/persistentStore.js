import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const dataDir = path.join(__dirname, '../../data');
const storeFilePath = path.join(dataDir, 'db_store.json');

// Đảm bảo thư mục data luôn tồn tại
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

export const defaultStoreUsers = [
  {
    _id: '6aec5b46ee112662b33c0e32',
    name: 'Anthony Quân (Trần Đình Quân)',
    email: 'anthonyq012025@gmail.com',
    phone: '0901234567',
    role: 'admin',
    chatStatus: 'online',
    allowStrangerNotifications: true,
    friends: ['u_huy', 'u_nam', 'u_minhanh'],
    jobTitle: 'System Admin & Lead Dev',
    avatar: '/uploads/1793903034671-886587470_122145020103357128_3735488146127846733_n.jpg',
    coverImage: 'https://images.unsplash.com/photo-1521737604893-d14cc237f11d?auto=format&fit=crop&w=1200&q=80',
    bio: 'Tài khoản cá nhân https://facebook.com/anthony.qill/ đồng bộ từ trình duyệt. #Facebook',
    customLayout: {
      theme: 'ocean',
      frameStyle: 'gold',
      ambientEffect: 'waves',
      bgColor: '#f8fafc',
    },
    profileMusic: {
      enabled: true,
      title: 'Rock you like a hurricane',
      artist: 'Scorpion',
      sourceType: 'youtube',
      presetId: 'lofi_night',
      url: 'https://www.youtube.com/watch?v=WnJFQEHsSrU',
    },
    socialLinks: {
      facebook: 'https://www.facebook.com/anthony.qill/',
      instagram: 'https://www.instagram.com/hotcandy.134/',
      tiktok: 'https://www.tiktok.com/@whatwasthat2000?is_from_webapp=1&sender_device=pc',
      x: 'https://x.com/anthony_quan',
      linkedin: 'https://linkedin.com/in/anthonyquan',
      website: 'https://cantstophere.com',
    },
  },
  {
    _id: 'u_admin_2',
    name: 'Quản Trị Viên Freedom',
    email: 'admin@cantstophere.com',
    phone: '0901111222',
    role: 'admin',
    chatStatus: 'online',
    friends: ['u_admin_1'],
    jobTitle: 'Community Administrator',
    avatar: '/images/1.jpg',
    bio: 'Hỗ trợ giải đáp và giữ gìn không gian chia sẻ an toàn, tích cực cho mọi người.',
    profileMusic: {
      enabled: true,
      title: 'Deep Focus - Nhịp điệu tập trung',
      artist: 'Freedom Ambient',
      sourceType: 'preset',
      presetId: 'deep_focus',
      url: 'https://cdn.pixabay.com/download/audio/2022/03/15/audio_c8c8a73467.mp3?filename=lofi-orchestra-16230.mp3',
    },
  },
  {
    _id: 'u_minhanh',
    name: 'Minh Anh',
    email: 'minhanh@cantstophere.com',
    phone: '0902222333',
    role: 'user',
    chatStatus: 'offline',
    friends: ['u_admin_1'],
    jobTitle: 'Frontend Dev 3 năm kinh nghiệm',
    avatar: '',
    bio: 'Đang vật lộn với deadlines và tìm lại niềm vui code ngày đầu.',
    profileMusic: {
      enabled: true,
      title: 'Healing Piano - Khoảng lặng tâm hồn',
      artist: 'Peaceful Mind',
      sourceType: 'preset',
      presetId: 'healing_piano',
      url: 'https://cdn.pixabay.com/download/audio/2022/01/18/audio_d0a13f69d2.mp3?filename=ambient-piano-amp-strings-10711.mp3',
    },
  },
  {
    _id: 'u_nam',
    name: 'Thành Nam',
    email: 'nam.pm@cantstophere.com',
    phone: '0903333444',
    role: 'user',
    chatStatus: 'busy',
    friends: ['u_admin_1'],
    jobTitle: 'Product Manager',
    avatar: '/images/2.jpg',
    bio: 'Cầu nối giữa team Tech và Kinh doanh. Thích lắng nghe câu chuyện của mọi người. #Product #LifeBalance',
    socialLinks: {
      linkedin: 'https://linkedin.com/in/nam-pm',
      facebook: 'https://facebook.com/nam.product',
    },
    profileMusic: {
      enabled: true,
      title: 'Rain & Coffee - Tiếng mưa bên ô cửa sổ',
      artist: 'Acoustic Rain Project',
      sourceType: 'preset',
      presetId: 'rain_coffee',
      url: 'https://cdn.pixabay.com/download/audio/2021/09/06/audio_731a104051.mp3?filename=rain-and-nostalgia-chill-lofi-song-8493.mp3',
    },
  },
  {
    _id: 'u_huy',
    name: 'Đức Huy',
    email: 'duchuy@cantstophere.com',
    phone: '0904444555',
    role: 'user',
    chatStatus: 'online',
    friends: ['u_admin_1'],
    jobTitle: 'Junior Developer (Chuyển ngành)',
    avatar: '/images/3.jpg',
    bio: 'Bắt đầu học code từ con số 0 ở tuổi 27. Tin rằng không bao giờ là quá muộn. #ChuyenNganh #Developer',
    profileMusic: {
      enabled: true,
      title: 'Deep Focus - Nhịp điệu tập trung',
      artist: 'Dev Chillhop',
      sourceType: 'preset',
      presetId: 'deep_focus',
      url: 'https://cdn.pixabay.com/download/audio/2022/03/15/audio_c8c8a73467.mp3?filename=lofi-orchestra-16230.mp3',
    },
  },
  {
    _id: 'u_ly',
    name: 'Hương Ly',
    email: 'huongly@cantstophere.com',
    phone: '0905555666',
    role: 'user',
    chatStatus: 'online',
    friends: [],
    jobTitle: 'UI/UX Designer',
    avatar: '/images/img2.jpg',
    bio: 'Tìm kiếm sự cân bằng giữa sáng tạo nghệ thuật và cơm áo gạo tiền. #Design #Art #SmallWins',
    socialLinks: {
      instagram: 'https://instagram.com/huongly.designs',
      tiktok: 'https://tiktok.com/@huongly_uiux',
    },
    profileMusic: {
      enabled: true,
      title: 'Acoustic Sunset - Bình yên sau tan ca',
      artist: 'Acoustic Soul',
      sourceType: 'preset',
      presetId: 'acoustic_sunset',
      url: 'https://cdn.pixabay.com/download/audio/2022/11/06/audio_c93e43d61f.mp3?filename=warm-acoustic-guitar-124928.mp3',
    },
  },
];

export const defaultStoreCategories = [
  { _id: 'cat_1', name: 'Áp lực & Kiệt sức (Burnout)', slug: 'ap-luc-kiet-suc-burnout', description: 'OT, deadline và cạn kiệt năng lượng', icon: '😫' },
  { _id: 'cat_2', name: 'Khủng hoảng nghề nghiệp (Career Crisis)', slug: 'khung-hoang-nghe-nghiep-career-crisis', description: 'Chênh vênh giữa tiếp tục hay từ bỏ', icon: '🧭' },
  { _id: 'cat_3', name: 'Chuyển ngành & Bắt đầu lại (Restart)', slug: 'chuyen-nganh-bat-dau-lai-restart', description: 'Can đảm làm lại từ con số 0', icon: '🌱' },
  { _id: 'cat_4', name: 'Những tia sáng & Động lực (Small Wins)', slug: 'nhung-tia-sang-dong-luc-small-wins', description: 'Thành tựu nhỏ bé nuôi dưỡng hi vọng', icon: '✨' },
  { _id: 'cat_5', name: 'Thời Sự & Tình Hình Thế Giới (Global Affairs)', slug: 'thoi-su-tinh-hinh-the-gioi', description: 'Điểm tin thời cuộc, diễn biến quốc tế & góc nhìn toàn cầu', icon: '🌍' },
  { _id: 'cat_6', name: 'Chiến Sự, Xung Đột & Hòa Bình (Conflict & Peace)', slug: 'chien-su-xung-dot-hoa-binh', description: 'Bình luận chiến sự, góc nhìn nhân đạo & khát vọng hòa bình', icon: '🕊️' },
  { _id: 'cat_7', name: 'Góc Nhìn & Xã Hội (Perspective & Society)', slug: 'goc-nhin-xa-hoi', description: 'Quan điểm đa chiều về thời cuộc và đời sống xã hội', icon: '🌐' },
  { _id: 'cat_8', name: 'Tâm Sự & Đời Sống Thường Nhật (Life Stories)', slug: 'tam-su-doi-song-thuong-nhat', description: 'Những dòng tâm sự thật, trải lòng không phán xét', icon: '☕' },
];

export const defaultStoreConversations = [
  {
    _id: 'conv_1',
    participants: ['u_ly', 'u_admin_1'],
    status: 'pending',
    isStranger: true,
    requestedBy: 'u_ly',
    totalMessagesCount: 1,
    unreadCounts: { u_admin_1: 1 },
    lastMessage: {
      _id: 'msg_1',
      content: 'Chào anh Quân, em đọc bài viết 2 giờ sáng của anh thấy rất đồng cảm...',
      sender: { _id: 'u_ly', name: 'Hương Ly', avatar: '/images/img2.jpg' },
      createdAt: '2026-11-05T14:30:00.000Z',
    },
    updatedAt: '2026-11-05T14:30:00.000Z',
  },
  {
    _id: 'conv_2',
    participants: ['u_huy', 'u_admin_1'],
    status: 'accepted',
    isStranger: false,
    totalMessagesCount: 4,
    unreadCounts: { u_admin_1: 2 },
    lastMessage: {
      _id: 'msg_2',
      content: 'Dạ em cảm ơn anh Quân đã động viên bài viết của em hôm trước ạ!',
      sender: { _id: 'u_huy', name: 'Đức Huy', avatar: '/images/3.jpg' },
      createdAt: '2026-11-05T15:10:00.000Z',
    },
    updatedAt: '2026-11-05T15:10:00.000Z',
  },
  {
    _id: 'conv_3',
    participants: ['u_nam', 'u_admin_1'],
    status: 'accepted',
    isStranger: false,
    totalMessagesCount: 6,
    unreadCounts: { u_admin_1: 3 },
    lastMessage: {
      _id: 'msg_3',
      content: 'Cảm ơn Quân nhiều nhé, hôm nào rảnh anh em mình cafe tán gẫu.',
      sender: { _id: 'u_nam', name: 'Thành Nam', avatar: '/images/2.jpg' },
      createdAt: '2026-11-05T15:45:00.000Z',
    },
    updatedAt: '2026-11-05T15:45:00.000Z',
  },
];

export const defaultStoreMessages = [
  {
    _id: 'msg_1',
    conversation: 'conv_1',
    sender: { _id: 'u_ly', name: 'Hương Ly', avatar: '/images/img2.jpg' },
    receiver: { _id: 'u_admin_1', name: 'Trần Đình Quân' },
    content: 'Chào anh Quân, em đọc bài viết 2 giờ sáng của anh thấy rất đồng cảm...',
    isRead: false,
    createdAt: '2026-11-05T14:30:00.000Z',
  },
  {
    _id: 'msg_2_prev',
    conversation: 'conv_2',
    sender: { _id: 'u_admin_1', name: 'Trần Đình Quân', avatar: '/uploads/1793903034671-886587470_122145020103357128_3735488146127846733_n.jpg' },
    receiver: { _id: 'u_huy', name: 'Đức Huy' },
    content: 'Chào Huy, bài viết chia sẻ về việc chuyển ngành của em rất truyền cảm hứng!',
    isRead: true,
    createdAt: '2026-11-05T15:05:00.000Z',
  },
  {
    _id: 'msg_2',
    conversation: 'conv_2',
    sender: { _id: 'u_huy', name: 'Đức Huy', avatar: '/images/3.jpg' },
    receiver: { _id: 'u_admin_1', name: 'Trần Đình Quân' },
    content: 'Dạ em cảm ơn anh Quân đã động viên bài viết của em hôm trước ạ!',
    isRead: false,
    createdAt: '2026-11-05T15:10:00.000Z',
  },
  {
    _id: 'msg_3',
    conversation: 'conv_3',
    sender: { _id: 'u_nam', name: 'Thành Nam', avatar: '/images/2.jpg' },
    receiver: { _id: 'u_admin_1', name: 'Trần Đình Quân' },
    content: 'Cảm ơn Quân nhiều nhé, hôm nào rảnh anh em mình cafe tán gẫu.',
    isRead: false,
    createdAt: '2026-11-05T15:45:00.000Z',
  },
];

// Khởi tạo dữ liệu mẫu ban đầu rỗng bài viết nếu file chưa tồn tại (bài viết đọc trực tiếp từ MongoDB)
const initialData = {
  users: defaultStoreUsers,
  categories: defaultStoreCategories,
  conversations: defaultStoreConversations,
  messages: defaultStoreMessages,
  posts: [],
  comments: [],
};

/**
 * Đọc dữ liệu từ file JSON trên ổ cứng bền vững
 */
export const loadStore = () => {
  try {
    if (fs.existsSync(storeFilePath)) {
      const raw = fs.readFileSync(storeFilePath, 'utf8');
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === 'object') {
        let needsSave = false;

        // Đảm bảo luôn có users & dọn sạch hoàn toàn trường rawPassword nhạy cảm
        if (!Array.isArray(parsed.users) || parsed.users.length === 0) {
          parsed.users = [...defaultStoreUsers];
          needsSave = true;
        } else {
          parsed.users = parsed.users.map((u) => {
            const defU = defaultStoreUsers.find((du) => du._id === u._id);
            const { rawPassword: _removedRaw, ...safeUser } = u || {};
            if (u && 'rawPassword' in u) {
              needsSave = true;
            }
            return {
              ...safeUser,
              friends: Array.isArray(safeUser.friends) ? safeUser.friends : (defU?.friends || []),
              chatStatus: safeUser.chatStatus || defU?.chatStatus || 'online',
              allowStrangerNotifications: safeUser.allowStrangerNotifications ?? true,
            };
          });
        }

        // Đảm bảo luôn có categories
        if (!Array.isArray(parsed.categories) || parsed.categories.length === 0) {
          parsed.categories = [...defaultStoreCategories];
          needsSave = true;
        }

        // Đảm bảo luôn có conversations
        if (!Array.isArray(parsed.conversations) || parsed.conversations.length === 0) {
          parsed.conversations = [...defaultStoreConversations];
          needsSave = true;
        }

        // Đảm bảo luôn có messages
        if (!Array.isArray(parsed.messages) || parsed.messages.length === 0) {
          parsed.messages = [...defaultStoreMessages];
          needsSave = true;
        }

        // Đảm bảo luôn có posts (khởi tạo rỗng, tuyệt đối không tự chèn bài mẫu tĩnh)
        if (!Array.isArray(parsed.posts)) {
          parsed.posts = [];
          needsSave = true;
        } else {
          // Loại bỏ triệt để các bài post_effort và các bài mẫu tĩnh mặc định cũ (post_1..post_4)
          const SAMPLE_SEED_IDS = new Set(['post_1', 'post_2', 'post_3', 'post_4']);
          const prevLen = parsed.posts.length;
          parsed.posts = parsed.posts.filter(
            (p) => p && !String(p._id).startsWith('post_effort') && !SAMPLE_SEED_IDS.has(String(p._id))
          );
          if (parsed.posts.length !== prevLen) {
            needsSave = true;
          }
        }

        // Đảm bảo luôn có comments
        if (!Array.isArray(parsed.comments)) {
          parsed.comments = [...initialData.comments];
          needsSave = true;
        }

        // Đảm bảo luôn có notifications
        if (!Array.isArray(parsed.notifications)) {
          parsed.notifications = [];
          needsSave = true;
        }

        if (needsSave) {
          saveStore(parsed);
        }

        return parsed;
      }
    }
  } catch (err) {
    console.warn('Lỗi đọc db_store.json, khởi tạo mặc định:', err.message);
  }

  saveStore(initialData);
  return initialData;
};

/**
 * Ghi dữ liệu xuống file JSON trên ổ cứng bền vững
 */
export const saveStore = (data) => {
  try {
    fs.writeFileSync(storeFilePath, JSON.stringify(data, null, 2), 'utf8');
  } catch (err) {
    console.error('Lỗi ghi db_store.json:', err.message);
  }
};

/**
 * Tìm người dùng trong db_store.json
 */
export const findUserInStore = (cleanIdentifier) => {
  if (!cleanIdentifier) return null;
  const store = loadStore();
  const lower = cleanIdentifier.toLowerCase().trim();
  const cleanPhone = cleanIdentifier.replace(/[\s.-]/g, '');

  return (store.users || []).find((u) => {
    return (
      (u._id && String(u._id).toLowerCase() === lower) ||
      (u.email && u.email.toLowerCase() === lower) ||
      (u.name && u.name.toLowerCase() === lower) ||
      (u.phone && (u.phone === cleanIdentifier || u.phone === cleanPhone))
    );
  });
};

/**
 * Cập nhật hoặc thêm người dùng vào db_store.json (Lưu vĩnh viễn trên ổ cứng)
 */
export const saveUserToStore = (userData) => {
  if (!userData) return null;
  const store = loadStore();
  store.users = store.users || [];
  const { rawPassword: _ignoreRaw, ...sanitizedInput } = userData;

  const idx = store.users.findIndex(
    (u) =>
      (sanitizedInput._id && String(u._id) === String(sanitizedInput._id)) ||
      (sanitizedInput.email && u.email && u.email.toLowerCase() === sanitizedInput.email.toLowerCase())
  );

  let mergedUser = null;
  if (idx !== -1) {
    const { rawPassword: _oldRaw, ...existingClean } = store.users[idx] || {};
    mergedUser = {
      ...existingClean,
      ...sanitizedInput,
      customLayout: {
        ...(existingClean.customLayout || {}),
        ...(sanitizedInput.customLayout || {}),
      },
      profileMusic: {
        ...(existingClean.profileMusic || {}),
        ...(sanitizedInput.profileMusic || {}),
      },
      socialLinks: {
        ...(existingClean.socialLinks || {}),
        ...(sanitizedInput.socialLinks || {}),
      },
    };
    store.users[idx] = mergedUser;
  } else {
    mergedUser = {
      _id: sanitizedInput._id || `u_${Date.now()}`,
      role: sanitizedInput.role || 'user',
      jobTitle: sanitizedInput.jobTitle || 'Thành viên cộng đồng',
      avatar: sanitizedInput.avatar || '',
      bio: sanitizedInput.bio || '',
      ...sanitizedInput,
    };
    store.users.push(mergedUser);
  }

  saveStore(store);
  return mergedUser;
};

/**
 * Lưu bản ghi OTP dự phòng xuống db_store.json (Hỗ trợ bền vững khi restart server hoặc chưa kết nối MongoDB)
 */
export const saveOtpRecordToStore = (target, record) => {
  const cleanKey = String(target || '').trim().toLowerCase();
  if (!cleanKey || !record) return;

  const store = loadStore();
  const now = Date.now();
  const nextRecords = {};

  if (store.otpRecords && typeof store.otpRecords === 'object') {
    for (const [k, v] of Object.entries(store.otpRecords)) {
      if (v && v.expiresAt && Number(v.expiresAt) > now) {
        nextRecords[k] = v;
      }
    }
  }

  nextRecords[cleanKey] = {
    code: String(record.code || '').replace(/\s+/g, '').trim(),
    expiresAt: Number(record.expiresAt),
    type: record.type || 'email',
    purpose: record.purpose || 'login',
    attempts: Number(record.attempts || 0),
    name: record.name || '',
    passwordHash: record.passwordHash || '',
    jobTitle: record.jobTitle || '',
  };

  store.otpRecords = nextRecords;
  saveStore(store);
};

/**
 * Đọc bản ghi OTP dự phòng từ db_store.json
 */
export const getOtpRecordFromStore = (target) => {
  const cleanKey = String(target || '').trim().toLowerCase();
  if (!cleanKey) return null;

  const store = loadStore();
  const record = store.otpRecords?.[cleanKey] || null;
  return record;
};

/**
 * Xóa bản ghi OTP dự phòng khỏi db_store.json
 */
export const deleteOtpRecordFromStore = (target) => {
  const cleanKey = String(target || '').trim().toLowerCase();
  if (!cleanKey) return;

  const store = loadStore();
  if (store.otpRecords && Object.prototype.hasOwnProperty.call(store.otpRecords, cleanKey)) {
    delete store.otpRecords[cleanKey];
    saveStore(store);
  }
};
