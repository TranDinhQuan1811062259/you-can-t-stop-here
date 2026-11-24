/**
 * Tiện ích Phản hồi Xúc giác (Mobile Haptic Feedback)
 * An toàn trên mọi trình duyệt (iOS Safari, Desktop, Android) mà không phát sinh lỗi.
 */

export const triggerHaptic = (pattern = [15, 30, 15]) => {
  try {
    if (
      typeof window !== 'undefined' &&
      typeof navigator !== 'undefined' &&
      'vibrate' in navigator &&
      typeof navigator.vibrate === 'function'
    ) {
      navigator.vibrate(pattern);
    }
  } catch (_) {
    // Không làm gián đoạn luồng thực thi nếu trình duyệt chặn hoặc không hỗ trợ
  }
};

/**
 * Nhịp rung haptic đồng bộ theo từng preset âm báo (Notification Tones)
 */
export const TONE_HAPTIC_PATTERNS = {
  bamboo_chime: [15, 60, 25],          // 2 nhịp gõ tre thanh thoát
  zen_bell: [40, 30, 20],              // 1 nhịp ngân dài êm đềm
  gentle_stream: [12, 80, 14, 80, 16], // 3 nhịp giọt nước róc rách
  muted: [],
};

export const triggerToneHaptic = (toneKey) => {
  try {
    let key = toneKey;
    if (!key && typeof localStorage !== 'undefined') {
      key = localStorage.getItem('freedom_notification_tone_v1') || 'bamboo_chime';
    }
    if (key === 'muted') return;
    const pattern = TONE_HAPTIC_PATTERNS[key] || TONE_HAPTIC_PATTERNS.bamboo_chime;
    if (pattern && pattern.length > 0) {
      triggerHaptic(pattern);
    }
  } catch (_) {}
};

export default triggerHaptic;
