/**
 * Hệ thống Huy Hiệu Danh Dự Cột Mốc Kiên Trì (Milestone Honor Badges)
 * Dựa trên số ngày giữ lửa liên tục (streakCount) của người dùng
 */

export const MILESTONE_BADGES = [
  {
    days: 30,
    id: 'beacon',
    name: 'Hải Đăng Dẫn Lối',
    icon: '💡',
    badgeText: 'Hải Đăng Dẫn Lối 💡',
    color: '#38bdf8',
    bg: 'rgba(56, 189, 248, 0.15)',
    border: 'rgba(56, 189, 248, 0.4)',
    desc: 'Đã giữ lửa liên tục 30+ ngày, trở thành ngọn hải đăng kiên định.',
  },
  {
    days: 14,
    id: 'torch',
    name: 'Ngọn Đuốc Đêm Khuya',
    icon: '🏮',
    badgeText: 'Ngọn Đuốc Đêm Khuya 🏮',
    color: '#ec4899',
    bg: 'rgba(236, 72, 153, 0.15)',
    border: 'rgba(236, 72, 153, 0.4)',
    desc: 'Đã giữ lửa liên tục 14+ ngày, thắp sáng những đêm làm việc dài.',
  },
  {
    days: 7,
    id: 'warrior',
    name: 'Chiến Binh Bền Bỉ',
    icon: '🔥',
    badgeText: 'Chiến Binh Bền Bỉ 🔥',
    color: '#f59e0b',
    bg: 'rgba(245, 158, 11, 0.15)',
    border: 'rgba(245, 158, 11, 0.4)',
    desc: 'Đã giữ lửa liên tục 7+ ngày, vượt qua mọi áp lực tuần đầu.',
  },
  {
    days: 3,
    id: 'sprout',
    name: 'Mầm Sống',
    icon: '🌱',
    badgeText: 'Mầm Sống 🌱',
    color: '#22c55e',
    bg: 'rgba(34, 197, 94, 0.15)',
    border: 'rgba(34, 197, 94, 0.4)',
    desc: 'Đã giữ lửa liên tục 3+ ngày, mầm xanh thói quen bắt đầu đâm chồi.',
  },
];

/**
 * Lấy huy hiệu cao nhất mà user đã đạt được
 */
export const getHighestBadge = (streakCount = 0) => {
  const count = Number(streakCount) || 0;
  for (const b of MILESTONE_BADGES) {
    if (count >= b.days) {
      return b;
    }
  }
  return null;
};

/**
 * Lấy toàn bộ danh sách huy hiệu đã mở khóa
 */
export const getAllAchievedBadges = (streakCount = 0) => {
  const count = Number(streakCount) || 0;
  return MILESTONE_BADGES.filter((b) => count >= b.days);
};

/**
 * Kiểm tra xem khi streak tăng lên newStreak có vừa mở khóa cột mốc mới nào không
 */
export const checkNewlyUnlockedMilestone = (prevStreak = 0, newStreak = 0) => {
  const prevBadge = getHighestBadge(prevStreak);
  const newBadge = getHighestBadge(newStreak);

  if (newBadge && (!prevBadge || newBadge.days > prevBadge.days)) {
    return newBadge;
  }
  return null;
};
