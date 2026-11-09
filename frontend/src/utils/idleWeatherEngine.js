/**
 * Idle Weather Engine - Hệ thống tích trữ thời tiết theo thời gian nhàn rỗi (User Idle Accumulation)
 * - Mùa Đông: Chữ dần đóng tuyết dày theo thời gian, phủ đầy băng giá; cử động chuột tuyết rụng xuống tan ra.
 * - Mùa Xuân: Bông hoa & chồi biếc dần nảy mầm bám lên chữ; cử động chuột hoa bay theo gió.
 * - Mùa Thu: Lá vàng rơi bám đầy mép chữ; cử động chuột gió thổi lá bay đi.
 * - Mùa Hạ: Chữ dần tan chảy (melting/dripping) dưới nắng nóng; cử động chuột chữ liền lại nguyên vẹn!
 */

import { getActiveSeason } from './seasonUtils';

let idleTimer = null;
let lastActivityTime = Date.now();
let currentIdleSeconds = 0;
let currentIdleLevel = 0; // 0: active, 1: 4s, 2: 9s, 3: 16s, 4: 25s+
let lastNonZeroIdleLevel = 1;
let isRecovering = false;
let recoveryTimeout = null;
const listeners = new Set();

const LEVEL_THRESHOLDS = [5, 12, 22, 35]; // Mốc giây chuyển cấp độ tích trữ tự nhiên, thư thả

const notifyListeners = () => {
  const activeSeason = getActiveSeason();
  const payload = {
    idleSeconds: currentIdleSeconds,
    idleLevel: currentIdleLevel,
    lastIdleLevel: lastNonZeroIdleLevel,
    idleRatio: Math.min(1, currentIdleSeconds / 35),
    isRecovering,
    seasonId: activeSeason?.id || 'winter',
  };

  listeners.forEach((callback) => {
    try {
      callback(payload);
    } catch (e) {
      console.warn('Idle listener error:', e);
    }
  });

  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('freedom_idle_weather_tick', { detail: payload }));
  }
};

const handleUserActivity = () => {
  const wasIdle = currentIdleLevel > 0;
  lastActivityTime = Date.now();
  currentIdleSeconds = 0;

  if (wasIdle && !isRecovering) {
    isRecovering = true;
    lastNonZeroIdleLevel = currentIdleLevel;
    currentIdleLevel = 0;
    notifyListeners();

    if (recoveryTimeout) clearTimeout(recoveryTimeout);
    recoveryTimeout = setTimeout(() => {
      isRecovering = false;
      notifyListeners();
    }, 3200); // 3.2 giây để animation hất tuyết / phủi bụi tuyết / cánh hoa bay / tan chảy tua ngược diễn ra thư thái, êm đềm
    return;
  }

  if (currentIdleLevel !== 0) {
    currentIdleLevel = 0;
    notifyListeners();
  }
};

const tick = () => {
  const now = Date.now();
  currentIdleSeconds = Math.floor((now - lastActivityTime) / 1000);

  let level = 0;
  if (currentIdleSeconds >= LEVEL_THRESHOLDS[3]) level = 4;
  else if (currentIdleSeconds >= LEVEL_THRESHOLDS[2]) level = 3;
  else if (currentIdleSeconds >= LEVEL_THRESHOLDS[1]) level = 2;
  else if (currentIdleSeconds >= LEVEL_THRESHOLDS[0]) level = 1;

  if (level > 0) {
    lastNonZeroIdleLevel = level;
  }

  if (level !== currentIdleLevel) {
    currentIdleLevel = level;
    notifyListeners();
  }
};

export const initIdleWeatherEngine = () => {
  if (typeof window === 'undefined') return;

  const activityEvents = [
    'mousemove',
    'mousedown',
    'pointermove',
    'pointerdown',
    'keydown',
    'touchstart',
    'touchmove',
    'touchend',
    'wheel',
    'scroll',
  ];
  activityEvents.forEach((ev) => {
    window.addEventListener(ev, handleUserActivity, { passive: true });
  });

  if (!idleTimer) {
    idleTimer = setInterval(tick, 1000);
  }

  return () => {
    activityEvents.forEach((ev) => {
      window.removeEventListener(ev, handleUserActivity);
    });
    if (idleTimer) {
      clearInterval(idleTimer);
      idleTimer = null;
    }
  };
};

export const subscribeIdleWeather = (callback) => {
  listeners.add(callback);
  // Gọi ngay trạng thái ban đầu
  const activeSeason = getActiveSeason();
  callback({
    idleSeconds: currentIdleSeconds,
    idleLevel: currentIdleLevel,
    lastIdleLevel: lastNonZeroIdleLevel,
    idleRatio: Math.min(1, currentIdleSeconds / 25),
    isRecovering,
    seasonId: activeSeason?.id || 'winter',
  });

  return () => {
    listeners.delete(callback);
  };
};

export const getIdleWeatherState = () => {
  const activeSeason = getActiveSeason();
  return {
    idleSeconds: currentIdleSeconds,
    idleLevel: currentIdleLevel,
    lastIdleLevel: lastNonZeroIdleLevel,
    idleRatio: Math.min(1, currentIdleSeconds / 25),
    isRecovering,
    seasonId: activeSeason?.id || 'winter',
  };
};
