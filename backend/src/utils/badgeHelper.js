/**
 * Hệ thống Huy Hiệu Danh Dự Cột Mốc Kiên Trì (Milestone Honor Badges) Backend
 */

export const MILESTONE_BADGES = [
  {
    days: 30,
    id: 'beacon',
    name: 'Hải Đăng Dẫn Lối',
    icon: '💡',
    badgeText: 'Hải Đăng Dẫn Lối 💡',
  },
  {
    days: 14,
    id: 'torch',
    name: 'Ngọn Đuốc Đêm Khuya',
    icon: '🏮',
    badgeText: 'Ngọn Đuốc Đêm Khuya 🏮',
  },
  {
    days: 7,
    id: 'warrior',
    name: 'Chiến Binh Bền Bỉ',
    icon: '🔥',
    badgeText: 'Chiến Binh Bền Bỉ 🔥',
  },
  {
    days: 3,
    id: 'sprout',
    name: 'Mầm Sống',
    icon: '🌱',
    badgeText: 'Mầm Sống 🌱',
  },
];

export const getHighestBadge = (streakCount = 0) => {
  const count = Number(streakCount) || 0;
  for (const b of MILESTONE_BADGES) {
    if (count >= b.days) {
      return b;
    }
  }
  return null;
};
