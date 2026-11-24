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

export default triggerHaptic;
