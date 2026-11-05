/**
 * Hệ thống âm thanh tương tác Web Audio API (Click "clik-clak" cơ học & Hover nhẹ nhàng)
 * Không phụ thuộc file âm thanh ngoài, hoạt động mượt mà 0ms độ trễ.
 */

let audioCtx = null;

// Khởi tạo AudioContext an toàn sau tương tác người dùng
const getAudioContext = () => {
  if (typeof window === 'undefined') return null;
  const AudioContextClass = window.AudioContext || window.webkitAudioContext;
  if (!AudioContextClass) return null;

  if (!audioCtx) {
    audioCtx = new AudioContextClass();
  }
  if (audioCtx.state === 'suspended') {
    audioCtx.resume().catch(() => {});
  }
  return audioCtx;
};

// Kiểm tra trạng thái bật/tắt âm thanh hiệu ứng (mặc định BẬT)
export const isSoundEnabled = () => {
  if (typeof window === 'undefined') return true;
  return localStorage.getItem('freedom_ui_sound') !== 'false';
};

// Bật / Tắt âm thanh hiệu ứng
export const toggleSound = (enabled) => {
  if (typeof window === 'undefined') return true;
  const nextState = enabled !== undefined ? Boolean(enabled) : !isSoundEnabled();
  localStorage.setItem('freedom_ui_sound', nextState ? 'true' : 'false');
  window.dispatchEvent(new CustomEvent('freedom_sound_toggled', { detail: { enabled: nextState } }));
  if (nextState) {
    playClickSound();
  }
  return nextState;
};

/**
 * Phát âm thanh "clik-clak" cơ học nhẹ nhàng khi bấm phím/chuột
 */
export const playClickSound = () => {
  if (!isSoundEnabled()) return;
  const ctx = getAudioContext();
  if (!ctx) return;

  try {
    const now = ctx.currentTime;

    // Giai đoạn 1: Tiếng "clik" nhẹ đầu tiên (downstroke switch)
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    const filter1 = ctx.createBiquadFilter();

    filter1.type = 'bandpass';
    filter1.frequency.setValueAtTime(800, now);
    filter1.Q.setValueAtTime(3.5, now);

    osc1.type = 'triangle';
    osc1.frequency.setValueAtTime(680, now);
    osc1.frequency.exponentialRampToValueAtTime(240, now + 0.025);

    gain1.gain.setValueAtTime(0.065, now);
    gain1.gain.exponentialRampToValueAtTime(0.0001, now + 0.025);

    osc1.connect(filter1);
    filter1.connect(gain1);
    gain1.connect(ctx.destination);

    osc1.start(now);
    osc1.stop(now + 0.026);

    // Giai đoạn 2: Tiếng "clak" dội nhẹ sau 10ms (bottom out)
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();

    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(320, now + 0.01);
    osc2.frequency.exponentialRampToValueAtTime(160, now + 0.035);

    gain2.gain.setValueAtTime(0.001, now);
    gain2.gain.setValueAtTime(0.045, now + 0.01);
    gain2.gain.exponentialRampToValueAtTime(0.0001, now + 0.038);

    osc2.connect(gain2);
    gain2.connect(ctx.destination);

    osc2.start(now + 0.01);
    osc2.stop(now + 0.039);
  } catch (e) {
    // Không làm gián đoạn UI nếu trình duyệt giới hạn audio
  }
};

let lastHoverTime = 0;

/**
 * Phát âm thanh hover cực kỳ êm dịu ("tick/pop" nhẹ) khi rê chuột qua nút/liên kết
 */
export const playHoverSound = () => {
  if (!isSoundEnabled()) return;
  const nowMs = performance.now();
  // Giới hạn tần suất hover (ít nhất cách nhau 70ms để không bị ồn)
  if (nowMs - lastHoverTime < 70) return;
  lastHoverTime = nowMs;

  const ctx = getAudioContext();
  if (!ctx) return;

  try {
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(1400, now);
    osc.frequency.exponentialRampToValueAtTime(950, now + 0.02);

    gain.gain.setValueAtTime(0.02, now);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.02);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 0.021);
  } catch (e) {
    // Ignore
  }
};

/**
 * Khởi tạo listener toàn cục bắt sự kiện click và rê chuột trên các phần tử tương tác
 */
let isInitialized = false;

export const initGlobalSoundEffects = () => {
  if (typeof window === 'undefined' || isInitialized) return;
  isInitialized = true;

  const INTERACTIVE_SELECTOR =
    'button, a, input, select, textarea, [role="button"], .post-card, .page-btn, .reaction-pill, .bio-chip-tag, .assistive-touch-btn, .chat-send-btn, .category-pill, .tab-btn, .avatar-frame-option, .preset-track-card, .social-badge-btn';

  // Sự kiện Click clik-clak
  document.addEventListener(
    'click',
    (e) => {
      const target = e.target;
      if (!target) return;
      if (target.closest && target.closest(INTERACTIVE_SELECTOR)) {
        playClickSound();
      }
    },
    { passive: true }
  );

  // Sự kiện Hover nhẹ
  document.addEventListener(
    'mouseover',
    (e) => {
      const target = e.target;
      if (!target) return;
      if (target.closest && target.closest(INTERACTIVE_SELECTOR)) {
        playHoverSound();
      }
    },
    { passive: true }
  );
};

