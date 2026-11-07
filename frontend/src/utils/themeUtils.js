/**
 * TIỆN ÍCH QUẢN LÝ CHẾ ĐỘ GIAO DIỆN NGÀY (DAY MODE) & ĐÊM (NIGHT MODE)
 * Hỗ trợ cài đặt tự động thích ứng đổi màu theo khung giờ thực tế (Schedule by Hour)
 */

export const THEMES = {
  DARK: 'dark',
  LIGHT: 'light',
};

export const THEME_MODES = {
  AUTO: 'auto',   // Tự động chuyển Ngày / Đêm theo khung giờ
  LIGHT: 'light', // Cố định Chế độ Ngày (Day Mode)
  DARK: 'dark',   // Cố định Chế độ Đêm (Night Mode)
};

const THEME_STORAGE_KEY = 'freedom_theme_mode';
const THEME_SCHEDULE_KEY = 'freedom_theme_schedule';

export const DEFAULT_THEME_SCHEDULE = {
  mode: THEME_MODES.AUTO, // Mặc định tự động theo giờ
  dayStart: '06:00',      // 06:00 sáng bắt đầu Chế độ Ngày
  nightStart: '18:00',    // 18:00 tối bắt đầu Chế độ Đêm
};

/**
 * Lấy cấu hình lịch đổi theme theo giờ từ localStorage
 */
export const getThemeSchedule = () => {
  try {
    const raw = localStorage.getItem(THEME_SCHEDULE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return {
        mode: parsed.mode || DEFAULT_THEME_SCHEDULE.mode,
        dayStart: parsed.dayStart || DEFAULT_THEME_SCHEDULE.dayStart,
        nightStart: parsed.nightStart || DEFAULT_THEME_SCHEDULE.nightStart,
      };
    }
  } catch (e) {}
  return { ...DEFAULT_THEME_SCHEDULE };
};

/**
 * Tính toán theme hiện tại dựa theo khung giờ thực tế
 */
export const calculateThemeByTime = (schedule = getThemeSchedule()) => {
  if (schedule.mode === THEME_MODES.LIGHT) return THEMES.LIGHT;
  if (schedule.mode === THEME_MODES.DARK) return THEMES.DARK;

  // Chế độ AUTO: Tính theo giờ thực tế của thiết bị
  const now = new Date();
  const currentMinutes = now.getHours() * 60 + now.getMinutes();

  const [dayH, dayM] = (schedule.dayStart || '06:00').split(':').map(Number);
  const [nightH, nightM] = (schedule.nightStart || '18:00').split(':').map(Number);

  const dayStartMinutes = (dayH || 6) * 60 + (dayM || 0);
  const nightStartMinutes = (nightH || 18) * 60 + (nightM || 0);

  if (dayStartMinutes < nightStartMinutes) {
    // Trường hợp chuẩn: Ban ngày từ 06:00 đến 18:00
    if (currentMinutes >= dayStartMinutes && currentMinutes < nightStartMinutes) {
      return THEMES.LIGHT;
    }
    return THEMES.DARK;
  } else {
    // Trường hợp vắt qua nửa đêm (ví dụ ngày từ 18:00 đến 06:00 hôm sau)
    if (currentMinutes >= dayStartMinutes || currentMinutes < nightStartMinutes) {
      return THEMES.LIGHT;
    }
    return THEMES.DARK;
  }
};

/**
 * Lấy theme hiện tại
 */
export const getActiveTheme = () => {
  const schedule = getThemeSchedule();
  if (schedule.mode === THEME_MODES.AUTO) {
    return calculateThemeByTime(schedule);
  }
  try {
    const saved = localStorage.getItem(THEME_STORAGE_KEY);
    if (saved === THEMES.LIGHT || saved === THEMES.DARK) {
      return saved;
    }
  } catch (e) {}
  return calculateThemeByTime(schedule);
};

/**
 * Áp dụng theme lên document
 */
export const applyTheme = (theme) => {
  const targetTheme = theme === THEMES.LIGHT ? THEMES.LIGHT : THEMES.DARK;
  if (typeof document !== 'undefined') {
    // Kích hoạt class hiệu ứng chuyển mode chậm rãi, êm dịu, không giật cục
    document.documentElement.classList.add('theme-is-transitioning');

    // Gán trực tiếp lên cả <html> và <body> để CSS ăn chắc 100%
    document.documentElement.setAttribute('data-theme', targetTheme);
    document.documentElement.classList.remove('theme-dark', 'theme-light', 'mode-dark', 'mode-light');
    document.documentElement.classList.add(`theme-${targetTheme}`, `mode-${targetTheme}`);

    document.body.setAttribute('data-theme', targetTheme);
    document.body.classList.remove('theme-dark', 'theme-light', 'mode-dark', 'mode-light');
    document.body.classList.add(`theme-${targetTheme}`, `mode-${targetTheme}`);

    // Gỡ class sau khi hiệu ứng hoàn thành (750ms)
    setTimeout(() => {
      document.documentElement.classList.remove('theme-is-transitioning');
    }, 750);
  }
  try {
    localStorage.setItem(THEME_STORAGE_KEY, targetTheme);
  } catch (e) {}

  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('freedom_theme_changed', { detail: targetTheme }));
  }
  return targetTheme;
};

/**
 * Lưu cấu hình cài đặt lịch theme theo giờ
 */
export const saveThemeSchedule = (newSchedule) => {
  const currentSchedule = getThemeSchedule();
  const merged = { ...currentSchedule, ...newSchedule };
  try {
    localStorage.setItem(THEME_SCHEDULE_KEY, JSON.stringify(merged));
  } catch (e) {}

  // Tính lại và áp dụng theme phù hợp ngay lập tức
  const targetTheme = calculateThemeByTime(merged);
  applyTheme(targetTheme);

  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('freedom_theme_schedule_changed', { detail: merged }));
  }
  return merged;
};

/**
 * Chuyển đổi qua lại giữa Ngày (Day) và Đêm (Night) khi bấm nút nhanh
 */
export const toggleTheme = () => {
  const current = getActiveTheme();
  const next = current === THEMES.LIGHT ? THEMES.DARK : THEMES.LIGHT;
  // Cập nhật cấu hình sang cố định theme mới này
  saveThemeSchedule({ mode: next === THEMES.LIGHT ? THEME_MODES.LIGHT : THEME_MODES.DARK });
  return applyTheme(next);
};

/**
 * Theo dõi thời gian thực (Heartbeat timer) để tự động chuyển đổi theme khi tới giờ
 */
let watcherInterval = null;
export const initThemeWatcher = () => {
  const theme = getActiveTheme();
  applyTheme(theme);

  if (typeof window !== 'undefined' && !watcherInterval) {
    watcherInterval = setInterval(() => {
      const schedule = getThemeSchedule();
      if (schedule.mode === THEME_MODES.AUTO) {
        const expectedTheme = calculateThemeByTime(schedule);
        const currentApplied = document.documentElement.getAttribute('data-theme');
        if (expectedTheme !== currentApplied) {
          applyTheme(expectedTheme);
        }
      }
    }, 10000); // Kiểm tra mỗi 10 giây
  }
  return theme;
};

export const initTheme = () => {
  return initThemeWatcher();
};
