/**
 * FREEDOM WEB - ASMR MECHANICAL KEYBOARD SOUND ENGINE
 * Tạo âm thanh gõ phím cơ chân thực bằng Web Audio API thuần (Không cần tải file âm thanh ngoài)
 * 3 Profiles: Thocky (Phím cơ cao cấp), Typewriter (Máy đánh chữ cổ điển + Chuông Enter), Bubble (Bong bóng xả stress)
 */

let audioCtx = null;

const getAudioContext = () => {
  if (!audioCtx) {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (AudioContextClass) {
      audioCtx = new AudioContextClass();
    }
  }
  if (audioCtx && audioCtx.state === 'suspended') {
    audioCtx.resume().catch(() => {});
  }
  return audioCtx;
};

// Cấu hình ASMR Profile
export const ASMR_PROFILES = {
  thocky: {
    id: 'thocky',
    name: 'Phím Cơ Thocky',
    desc: 'Âm trầm ấm, đầm tay của switch cơ cao cấp',
    icon: '⌨️',
  },
  typewriter: {
    id: 'typewriter',
    name: 'Máy Đánh Chữ Retro',
    desc: 'Âm cơ học giòn tan & tiếng chuông reng khi nhấn Enter',
    icon: '📠',
  },
  bubble: {
    id: 'bubble',
    name: 'Bong Bóng Pop',
    desc: 'Âm thanh nổ bong bóng tươi vui, xả stress',
    icon: '🫧',
  },
};

const STORAGE_KEY_ENABLED = 'freedom_asmr_keyboard_enabled';
const STORAGE_KEY_PROFILE = 'freedom_asmr_keyboard_profile';
const STORAGE_KEY_VOLUME = 'freedom_asmr_keyboard_volume';

export const isAsmrKeyboardEnabled = () => {
  try {
    return localStorage.getItem(STORAGE_KEY_ENABLED) === 'true';
  } catch (e) {
    return false;
  }
};

export const setAsmrKeyboardEnabled = (enabled) => {
  try {
    localStorage.setItem(STORAGE_KEY_ENABLED, String(enabled));
    window.dispatchEvent(new CustomEvent('freedom_asmr_state_changed', { detail: { enabled } }));
  } catch (e) {}
};

export const getAsmrProfile = () => {
  try {
    const saved = localStorage.getItem(STORAGE_KEY_PROFILE);
    if (saved && ASMR_PROFILES[saved]) return saved;
  } catch (e) {}
  return 'thocky';
};

export const setAsmrProfile = (profileId) => {
  try {
    if (ASMR_PROFILES[profileId]) {
      localStorage.setItem(STORAGE_KEY_PROFILE, profileId);
      window.dispatchEvent(new CustomEvent('freedom_asmr_profile_changed', { detail: { profile: profileId } }));
    }
  } catch (e) {}
};

export const getAsmrVolume = () => {
  try {
    const val = parseFloat(localStorage.getItem(STORAGE_KEY_VOLUME));
    if (!isNaN(val) && val >= 0 && val <= 1) return val;
  } catch (e) {}
  return 0.65;
};

export const setAsmrVolume = (vol) => {
  try {
    localStorage.setItem(STORAGE_KEY_VOLUME, String(vol));
  } catch (e) {}
};

// ============================================================================
// BỘ PHÁT ÂM THANH THEO PROFILE
// ============================================================================

/**
 * 1. Profile Thocky: Tạo tiếng gõ phím switch lubed trầm ấm (Low-end thud + crisp plastic bottom-out)
 */
const playThockySound = (ctx, isSpecialKey) => {
  const now = ctx.currentTime;
  const masterVolume = getAsmrVolume();

  // Biến thiên tần số ngẫu nhiên nhẹ ±6% để mỗi phím nghe khác nhau tự nhiên
  const jitter = 0.94 + Math.random() * 0.12;
  const baseFreq = (isSpecialKey === 'space' ? 110 : isSpecialKey === 'enter' ? 130 : 185) * jitter;

  // Thành phần 1: Body Resonance (Sine wave trầm ấm)
  const osc = ctx.createOscillator();
  const oscGain = ctx.createGain();
  osc.type = 'triangle';
  osc.frequency.setValueAtTime(baseFreq * 1.5, now);
  osc.frequency.exponentialRampToValueAtTime(baseFreq, now + 0.035);

  const bodyDecay = isSpecialKey === 'space' ? 0.075 : 0.055;
  oscGain.gain.setValueAtTime(0.35 * masterVolume, now);
  oscGain.gain.exponentialRampToValueAtTime(0.001, now + bodyDecay);

  osc.connect(oscGain);
  oscGain.connect(ctx.destination);
  osc.start(now);
  osc.stop(now + bodyDecay + 0.01);

  // Thành phần 2: Click Snap (Noise ngắn mô phỏng tiếp điểm switch)
  try {
    const bufferSize = Math.floor(ctx.sampleRate * 0.02);
    const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const output = noiseBuffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      output[i] = Math.random() * 2 - 1;
    }

    const whiteNoise = ctx.createBufferSource();
    whiteNoise.buffer = noiseBuffer;

    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(1900 * jitter, now);
    filter.Q.setValueAtTime(2.2, now);

    const noiseGain = ctx.createGain();
    noiseGain.gain.setValueAtTime(0.28 * masterVolume, now);
    noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.022);

    whiteNoise.connect(filter);
    filter.connect(noiseGain);
    noiseGain.connect(ctx.destination);

    whiteNoise.start(now);
    whiteNoise.stop(now + 0.025);
  } catch (err) {}
};

/**
 * 2. Profile Typewriter: Tiếng máy đánh chữ cơ học kim loại sắc sảo + Chuông "Ding!" khi Enter
 */
const playTypewriterSound = (ctx, isSpecialKey) => {
  const now = ctx.currentTime;
  const masterVolume = getAsmrVolume();

  if (isSpecialKey === 'enter') {
    // Tiếng gõ bàn phím
    playThockySound(ctx, 'enter');

    // Tiếng chuông reng cơ học Ding! trong trẻo như phim cổ điển
    const bellOsc = ctx.createOscillator();
    const bellGain = ctx.createGain();
    bellOsc.type = 'sine';
    bellOsc.frequency.setValueAtTime(2480, now); // nốt B6 trong trẻo
    bellOsc.frequency.exponentialRampToValueAtTime(2450, now + 0.6);

    bellGain.gain.setValueAtTime(0.4 * masterVolume, now + 0.02);
    bellGain.gain.exponentialRampToValueAtTime(0.0005, now + 0.7);

    // Hài âm thứ 2 cho chuông ngân vang
    const bellHarmonic = ctx.createOscillator();
    const bellHarmonicGain = ctx.createGain();
    bellHarmonic.type = 'sine';
    bellHarmonic.frequency.setValueAtTime(4960, now);
    bellHarmonicGain.gain.setValueAtTime(0.18 * masterVolume, now + 0.02);
    bellHarmonicGain.gain.exponentialRampToValueAtTime(0.0005, now + 0.4);

    bellOsc.connect(bellGain);
    bellGain.connect(ctx.destination);
    bellHarmonic.connect(bellHarmonicGain);
    bellHarmonicGain.connect(ctx.destination);

    bellOsc.start(now + 0.02);
    bellOsc.stop(now + 0.75);
    bellHarmonic.start(now + 0.02);
    bellHarmonic.stop(now + 0.45);
    return;
  }

  // Tiếng kim loại gõ sắc nét của phím thường
  const jitter = 0.95 + Math.random() * 0.1;
  const clickOsc = ctx.createOscillator();
  const clickGain = ctx.createGain();
  clickOsc.type = 'sawtooth';
  clickOsc.frequency.setValueAtTime(1400 * jitter, now);
  clickOsc.frequency.exponentialRampToValueAtTime(400, now + 0.03);

  clickGain.gain.setValueAtTime(0.25 * masterVolume, now);
  clickGain.gain.exponentialRampToValueAtTime(0.001, now + 0.035);

  const bq = ctx.createBiquadFilter();
  bq.type = 'highpass';
  bq.frequency.setValueAtTime(800, now);

  clickOsc.connect(bq);
  bq.connect(clickGain);
  clickGain.connect(ctx.destination);

  clickOsc.start(now);
  clickOsc.stop(now + 0.04);
};

/**
 * 3. Profile Bubble: Âm thanh giọt nước/bong bóng pop vui nhộn xả stress
 */
const playBubbleSound = (ctx, isSpecialKey) => {
  const now = ctx.currentTime;
  const masterVolume = getAsmrVolume();

  const jitter = 0.9 + Math.random() * 0.2;
  const startFreq = (isSpecialKey === 'space' ? 240 : isSpecialKey === 'enter' ? 320 : 420) * jitter;
  const endFreq = startFreq * 2.4;

  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(startFreq, now);
  osc.frequency.exponentialRampToValueAtTime(endFreq, now + 0.055);

  gain.gain.setValueAtTime(0.32 * masterVolume, now);
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.06);

  osc.connect(gain);
  gain.connect(ctx.destination);

  osc.start(now);
  osc.stop(now + 0.07);
};

// ============================================================================
// HÀM GỌI CHÍNH
// ============================================================================

/**
 * Phát âm thanh gõ phím dựa trên sự kiện bàn phím hoặc profile chỉ định
 * @param {KeyboardEvent|Object} e Sự kiện bàn phím (hoặc { key, code })
 * @param {string} forcedProfile Ép kiểu profile nếu muốn nghe thử
 */
export const triggerAsmrKeySound = (e, forcedProfile = null) => {
  if (!forcedProfile && !isAsmrKeyboardEnabled()) return;

  const key = e?.key || '';
  // Bỏ qua các phím điều hướng im lặng không in chữ để tránh ồn ào (Shift, Alt, Ctrl, CapsLock)
  if (['Shift', 'Control', 'Alt', 'Meta', 'CapsLock', 'Tab'].includes(key)) {
    return;
  }

  const ctx = getAudioContext();
  if (!ctx) return;

  const profile = forcedProfile || getAsmrProfile();
  const isSpecialKey = key === ' ' ? 'space' : key === 'Enter' ? 'enter' : key === 'Backspace' ? 'backspace' : null;

  try {
    if (profile === 'typewriter') {
      playTypewriterSound(ctx, isSpecialKey);
    } else if (profile === 'bubble') {
      playBubbleSound(ctx, isSpecialKey);
    } else {
      playThockySound(ctx, isSpecialKey);
    }
  } catch (err) {}
};

/**
 * Lắng nghe toàn cục: Khi bật ASMR, tự động phát tiếng khi người dùng gõ phím vào bất kỳ ô input / textarea nào
 */
let isListenerAttached = false;
export const initGlobalKeyboardAsmr = () => {
  if (isListenerAttached || typeof window === 'undefined') return;

  const handleGlobalKeyDown = (e) => {
    if (!isAsmrKeyboardEnabled()) return;

    const target = e.target;
    const isTextInput =
      target &&
      (target.tagName === 'TEXTAREA' ||
        target.isContentEditable ||
        (target.tagName === 'INPUT' &&
          ['text', 'search', 'email', 'password', 'url', 'tel'].includes(target.type || 'text')));

    if (isTextInput) {
      triggerAsmrKeySound(e);
    }
  };

  window.addEventListener('keydown', handleGlobalKeyDown, { passive: true });
  isListenerAttached = true;
};
