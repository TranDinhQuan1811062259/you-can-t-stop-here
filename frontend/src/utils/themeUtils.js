/**
 * Tiện ích quản lý chế độ Giao Diện Ngày (Day Mode) & Đêm (Night Mode)
 */

export const THEMES = {
  DARK: 'dark',
  LIGHT: 'light',
};

const THEME_STORAGE_KEY = 'freedom_theme_mode';

/**
 * Lấy theme hiện tại từ localStorage hoặc mặc định 'dark'
 */
export const getActiveTheme = () => {
  try {
    const saved = localStorage.getItem(THEME_STORAGE_KEY);
    if (saved === THEMES.LIGHT || saved === THEMES.DARK) {
      return saved;
    }
  } catch (e) {}
  return THEMES.DARK;
};

/**
 * Áp dụng theme lên document
 */
export const applyTheme = (theme) => {
  const targetTheme = theme === THEMES.LIGHT ? THEMES.LIGHT : THEMES.DARK;
  if (typeof document !== 'undefined') {
    // Gán trực tiếp lên cả <html> và <body> để CSS ăn chắc 100%
    document.documentElement.setAttribute('data-theme', targetTheme);
    document.documentElement.classList.remove('theme-dark', 'theme-light', 'mode-dark', 'mode-light');
    document.documentElement.classList.add(`theme-${targetTheme}`, `mode-${targetTheme}`);

    document.body.setAttribute('data-theme', targetTheme);
    document.body.classList.remove('theme-dark', 'theme-light', 'mode-dark', 'mode-light');
    document.body.classList.add(`theme-${targetTheme}`, `mode-${targetTheme}`);
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
 * Chuyển đổi qua lại giữa Ngày (Day) và Đêm (Night)
 */
export const toggleTheme = () => {
  const current = getActiveTheme();
  const next = current === THEMES.LIGHT ? THEMES.DARK : THEMES.LIGHT;
  return applyTheme(next);
};

/**
 * Tự động khởi tạo theme khi trang web load
 */
export const initTheme = () => {
  const theme = getActiveTheme();
  return applyTheme(theme);
};

