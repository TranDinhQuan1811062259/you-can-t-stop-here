/**
 * Quản lý giao diện thời tiết 4 mùa trong năm dựa theo lịch tự nhiên
 * - Mùa Xuân (Spring): Tháng 2, 3, 4 (Hoa nở, cánh hoa đào bay)
 * - Mùa Hạ (Summer): Tháng 5, 6, 7 (Nắng vàng, đom đóm & biển xanh)
 * - Mùa Thu (Autumn): Tháng 8, 9, 10 (Lá vàng rơi, ấm áp dịu êm)
 * - Mùa Đông (Winter): Tháng 11, 12, 1 (Bông tuyết rơi, se lạnh ấm lòng)
 */

export const SEASONS = {
  spring: {
    id: 'spring',
    name: 'Mùa Xuân',
    shortName: 'Xuân Tươi Mới',
    icon: '🌸',
    logoIcon: '🌸',
    logoBadge: 'Xuân Tươi',
    titleAccent: '🌸',
    weatherDesc: 'Ấm áp • Trăm hoa đua nở',
    months: [2, 3, 4],
    accentColor: '#ec4899',
    badgeBg: 'rgba(236, 72, 153, 0.15)',
    badgeColor: '#f472b6',
    particles: ['🌸', '💮', '🌱', '✨'],
    quote: 'Mùa của khởi đầu mới và hy vọng ngập tràn.',
  },
  summer: {
    id: 'summer',
    name: 'Mùa Hạ',
    shortName: 'Hạ Rực Rỡ',
    icon: '☀️',
    logoIcon: '☀️',
    logoBadge: 'Hạ Nắng',
    titleAccent: '☀️',
    weatherDesc: 'Nắng vàng • Năng lượng căng tràn',
    months: [5, 6, 7],
    accentColor: '#f59e0b',
    badgeBg: 'rgba(245, 158, 11, 0.15)',
    badgeColor: '#fbbf24',
    particles: ['☀️', '✨', '⭐', '🌻'],
    quote: 'Năng lượng tích cực & khát khao vươn mình rực rỡ.',
  },
  autumn: {
    id: 'autumn',
    name: 'Mùa Thu',
    shortName: 'Thu Dịu Êm',
    icon: '🍂',
    logoIcon: '🍁',
    logoBadge: 'Thu Vàng',
    titleAccent: '🍁',
    weatherDesc: 'Heo may • Lá vàng xao xuyến',
    months: [8, 9, 10],
    accentColor: '#ea580c',
    badgeBg: 'rgba(234, 88, 12, 0.15)',
    badgeColor: '#fb923c',
    particles: ['🍂', '🍁', '🌾', '✨'],
    quote: 'Khoảng lặng bình yên sau những ngày dài hối hả.',
  },
  winter: {
    id: 'winter',
    name: 'Mùa Đông',
    shortName: 'Đông Ấm Áp',
    icon: '❄️',
    logoIcon: '❄️',
    logoBadge: 'Đông Tuyết',
    titleAccent: '❄️',
    weatherDesc: 'Se lạnh • Tuyết trắng an yên',
    months: [11, 12, 1],
    accentColor: '#06b6d4',
    badgeBg: 'rgba(6, 182, 212, 0.15)',
    badgeColor: '#38bdf8',
    particles: ['❄️', '❅', '✻', '•'],
    quote: 'Giữ ấm trái tim & tìm lại sự bình yên trong tâm hồn.',
  },
};

/**
 * Xác định mùa hiện tại dựa theo lịch dương của năm
 */
export const getCalendarSeason = () => {
  const currentMonth = new Date().getMonth() + 1; // 1 - 12
  if ([2, 3, 4].includes(currentMonth)) return SEASONS.spring;
  if ([5, 6, 7].includes(currentMonth)) return SEASONS.summer;
  if ([8, 9, 10].includes(currentMonth)) return SEASONS.autumn;
  return SEASONS.winter; // 11, 12, 1
};

/**
 * Cập nhật Favicon sắc nét trên Tab trình duyệt theo biểu tượng mùa hoặc logo thương hiệu
 */
export const updateTabFavicon = (seasonId) => {
  if (typeof document === 'undefined') return;
  const link = document.getElementById('app-dynamic-favicon') || document.querySelector("link[rel*='icon']");
  if (!link) return;

  const validSeason = ['spring', 'summer', 'autumn', 'winter'].includes(seasonId) ? seasonId : null;
  const targetFavicon = validSeason ? `/favicon-${validSeason}.svg` : '/favicon.svg';
  link.href = targetFavicon;
};

/**
 * Lấy mùa đang được chọn (Tự động theo lịch hoặc người dùng tuỳ chọn xem thử)
 */
export const getActiveSeason = () => {
  const saved = localStorage.getItem('freedom_user_season');
  let season = null;
  if (saved && SEASONS[saved]) {
    season = { ...SEASONS[saved], isCustom: true };
  } else {
    season = { ...getCalendarSeason(), isCustom: false };
  }
  updateTabFavicon(season.id);
  return season;
};

/**
 * Đặt mùa hiển thị (hoặc 'auto' để theo lịch thực tế)
 */
export const setActiveSeason = (seasonId) => {
  if (seasonId === 'auto' || !SEASONS[seasonId]) {
    localStorage.removeItem('freedom_user_season');
  } else {
    localStorage.setItem('freedom_user_season', seasonId);
  }
  const active = getActiveSeason();
  updateTabFavicon(active.id);
  window.dispatchEvent(new CustomEvent('freedom_season_changed', { detail: active }));
  return active;
};

