/**
 * Audio Gesture Guard - Cổng bảo vệ tuân thủ chính sách Autoplay Web Audio API
 * - Tuyệt đối không cho phép khởi tạo hoặc đánh thức AudioContext trước khi người dùng
 *   thực hiện cử chỉ tương tác hợp lệ (pointerdown, mousedown, click, touchstart, keydown).
 * - Xóa sạch cảnh báo "The AudioContext was not allowed to start" trong Console.
 */

let gestureUnlocked = false;
let listenersBound = false;
const firstGestureCallbacks = new Set();

const TRUSTED_GESTURE_EVENTS = [
  'pointerdown',
  'pointerup',
  'mousedown',
  'click',
  'touchstart',
  'touchend',
  'keydown',
];

const flushGestureCallbacks = () => {
  if (firstGestureCallbacks.size === 0) return;
  const queued = Array.from(firstGestureCallbacks);
  firstGestureCallbacks.clear();
  queued.forEach((cb) => {
    try {
      cb();
    } catch (_) {}
  });
};

const unbindGestureListeners = (handler) => {
  if (!listenersBound || typeof window === 'undefined') return;
  listenersBound = false;
  TRUSTED_GESTURE_EVENTS.forEach((eventName) => {
    window.removeEventListener(eventName, handler, { capture: true });
  });
};

const handleTrustedGesture = (event) => {
  if (event && event.isTrusted === false) return;
  gestureUnlocked = true;
  unbindGestureListeners(handleTrustedGesture);
  flushGestureCallbacks();
};

const ensureGestureListenersBound = () => {
  if (listenersBound || gestureUnlocked || typeof window === 'undefined') return;
  listenersBound = true;
  TRUSTED_GESTURE_EVENTS.forEach((eventName) => {
    window.addEventListener(eventName, handleTrustedGesture, {
      capture: true,
      passive: true,
    });
  });
};

// Gắn listener capture ngay khi module được nạp trên browser
if (typeof window !== 'undefined') {
  ensureGestureListenersBound();
}

export const hasUserInteracted = () => {
  if (typeof window === 'undefined') return false;
  if (gestureUnlocked) return true;
  try {
    if (typeof navigator !== 'undefined' && navigator.userActivation?.hasBeenActive) {
      gestureUnlocked = true;
      unbindGestureListeners(handleTrustedGesture);
      return true;
    }
  } catch (_) {}
  ensureGestureListenersBound();
  return false;
};

export const markUserInteracted = () => {
  if (typeof window === 'undefined') return;
  gestureUnlocked = true;
  unbindGestureListeners(handleTrustedGesture);
  flushGestureCallbacks();
};

export const onFirstUserGesture = (callback) => {
  if (typeof callback !== 'function') return () => {};
  if (hasUserInteracted()) {
    callback();
    return () => {};
  }
  ensureGestureListenersBound();
  firstGestureCallbacks.add(callback);
  return () => {
    firstGestureCallbacks.delete(callback);
  };
};
