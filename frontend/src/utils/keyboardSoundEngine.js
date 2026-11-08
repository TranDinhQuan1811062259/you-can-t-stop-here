/**
 * FREEDOM WEB - ASMR MECHANICAL KEYBOARD SOUND ENGINE
 * Tạo âm thanh gõ phím cơ chân thực bằng Web Audio API thuần (Không cần tải file âm thanh ngoài)
 * 3 Profiles: Thocky (Phím cơ cao cấp lubed), Typewriter (Máy đánh chữ cổ điển + Chuông Enter), Bubble (Bong bóng xả stress)
 * Tinh chỉnh chuẩn phím cơ bôi trơn (Lubed Switch): Trầm ấm, êm ái, KHÔNG BỊ RÈ, KHÔNG CHÁT TAI!
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
    desc: 'Âm switch bôi trơn (lubed) trầm ấm, êm dịu, không gắt',
    icon: '⌨️',
  },
  typewriter: {
    id: 'typewriter',
    name: 'Máy Đánh Chữ Retro',
    desc: 'Âm cơ học giòn tan & tiếng chuông reng khi nhấn Enter',
    icon: '📜',
  },
  bubble: {
    id: 'bubble',
    name: 'Bong Bóng Pop',
    desc: 'Âm thanh nổ bong bóng tươi vui, xả stress',
    icon: '🫧',
  },
};

export const KEYBOARD_PROFILES = Object.values(ASMR_PROFILES);

const STORAGE_KEY_ENABLED = 'freedom_asmr_keyboard_enabled';
const STORAGE_KEY_PROFILE = 'freedom_asmr_keyboard_profile';
const STORAGE_KEY_VOLUME = 'freedom_asmr_keyboard_volume';

export const isAsmrKeyboardEnabled = () => {
  try {
    const val = localStorage.getItem(STORAGE_KEY_ENABLED);
    return val === null ? true : val === 'true';
  } catch (e) {
    return true;
  }
};

export const isKeyboardSoundEnabled = isAsmrKeyboardEnabled;

export const setAsmrKeyboardEnabled = (enabled) => {
  try {
    localStorage.setItem(STORAGE_KEY_ENABLED, String(enabled));
    window.dispatchEvent(new CustomEvent('freedom_asmr_state_changed', { detail: { enabled } }));
  } catch (e) {}
};

export const setKeyboardSoundEnabled = setAsmrKeyboardEnabled;

export const getAsmrProfile = () => {
  try {
    const saved = localStorage.getItem(STORAGE_KEY_PROFILE);
    if (saved && ASMR_PROFILES[saved]) return saved;
  } catch (e) {}
  return 'thocky';
};

export const getStoredProfile = getAsmrProfile;

export const setAsmrProfile = (profileId) => {
  try {
    if (ASMR_PROFILES[profileId]) {
      localStorage.setItem(STORAGE_KEY_PROFILE, profileId);
      window.dispatchEvent(new CustomEvent('freedom_asmr_profile_changed', { detail: { profile: profileId } }));
    }
  } catch (e) {}
};

export const setStoredProfile = setAsmrProfile;

export const getAsmrVolume = () => {
  try {
    const val = parseFloat(localStorage.getItem(STORAGE_KEY_VOLUME));
    if (!isNaN(val) && val >= 0 && val <= 1) return val;
  } catch (e) {}
  return 0.30; // Âm lượng nhẹ nhàng, êm dịu, không gây rè hay khó chịu
};

export const setAsmrVolume = (vol) => {
  try {
    localStorage.setItem(STORAGE_KEY_VOLUME, String(vol));
  } catch (e) {}
};

// ============================================================================
// BỘ PHÁT ÂM THANH THEO PROFILE (ÊM DỊU, KHÔNG RÈ, KHÔNG CHÁT TAI)
// ============================================================================

/**
 * 1. Profile Thocky: Tiếng gõ phím switch lubed trầm ấm (Creamy Thock)
 * - Triệt tiêu hoàn toàn nhiễu trắng chát tai.
 * - Sử dụng sóng Sine ấm + Lowpass Filter êm ái mô phỏng đệm silicone / foam bàn phím cơ custom.
 */
const playThockySound = (ctx, isSpecialKey) => {
  const now = ctx.currentTime;
  const masterVolume = getAsmrVolume();

  // Biến thiên tần số ngẫu nhiên rất nhẹ (±4%) để mỗi phím nghe khác nhau tự nhiên
  const jitter = 0.96 + Math.random() * 0.08;
  const baseFreq = (isSpecialKey === 'space' ? 82 : isSpecialKey === 'enter' ? 95 : 120) * jitter;

  // Thành phần 1: Body Thud (Sóng Sine trầm ấm, tròn trịa)
  const osc = ctx.createOscillator();
  const oscGain = ctx.createGain();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(baseFreq * 1.3, now);
  osc.frequency.exponentialRampToValueAtTime(baseFreq, now + 0.026);

  const bodyDecay = isSpecialKey === 'space' ? 0.065 : 0.045;
  oscGain.gain.setValueAtTime(0.16 * masterVolume, now);
  oscGain.gain.exponentialRampToValueAtTime(0.0005, now + bodyDecay);

  // Bộ lọc Lowpass để giữ âm trầm dịu, triệt tiêu tần số cao gây rè
  const lowFilter = ctx.createBiquadFilter();
  lowFilter.type = 'lowpass';
  lowFilter.frequency.setValueAtTime(450, now);

  osc.connect(lowFilter);
  lowFilter.connect(oscGain);
  oscGain.connect(ctx.destination);

  osc.start(now);
  osc.stop(now + bodyDecay + 0.01);

  // Thành phần 2: Muted Switch Tap (Tiếng tiếp xúc nhựa PBT êm ái, lọc tần số thấp)
  try {
    const bufferSize = Math.floor(ctx.sampleRate * 0.015);
    const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const output = noiseBuffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      output[i] = (Math.random() * 2 - 1) * 0.2;
    }

    const tapNoise = ctx.createBufferSource();
    tapNoise.buffer = noiseBuffer;

    const tapFilter = ctx.createBiquadFilter();
    tapFilter.type = 'lowpass';
    tapFilter.frequency.setValueAtTime(620 * jitter, now);

    const tapGain = ctx.createGain();
    tapGain.gain.setValueAtTime(0.035 * masterVolume, now);
    tapGain.gain.exponentialRampToValueAtTime(0.0005, now + 0.014);

    tapNoise.connect(tapFilter);
    tapFilter.connect(tapGain);
    tapGain.connect(ctx.destination);

    tapNoise.start(now);
    tapNoise.stop(now + 0.016);
  } catch (err) {}
};

/**
 * 2. Profile Typewriter: Tiếng máy đánh chữ cơ học êm dịu + Chuông Ding thanh thoát khi Enter
 */
const playTypewriterSound = (ctx, isSpecialKey) => {
  const now = ctx.currentTime;
  const masterVolume = getAsmrVolume();

  if (isSpecialKey === 'enter') {
    playThockySound(ctx, 'enter');

    // Chuông Ding thanh thoát trong trẻo, không chói
    const bellOsc = ctx.createOscillator();
    const bellGain = ctx.createGain();
    bellOsc.type = 'sine';
    bellOsc.frequency.setValueAtTime(2150, now);
    bellOsc.frequency.exponentialRampToValueAtTime(2130, now + 0.5);

    bellGain.gain.setValueAtTime(0.18 * masterVolume, now + 0.01);
    bellGain.gain.exponentialRampToValueAtTime(0.0005, now + 0.55);

    bellOsc.connect(bellGain);
    bellGain.connect(ctx.destination);

    bellOsc.start(now + 0.01);
    bellOsc.stop(now + 0.6);
    return;
  }

  // Tiếng nhấp cơ khí êm dịu, đã qua lọc bớt tần số chát
  const jitter = 0.96 + Math.random() * 0.08;
  const clickOsc = ctx.createOscillator();
  const clickGain = ctx.createGain();
  clickOsc.type = 'triangle';
  clickOsc.frequency.setValueAtTime(800 * jitter, now);
  clickOsc.frequency.exponentialRampToValueAtTime(280, now + 0.025);

  clickGain.gain.setValueAtTime(0.12 * masterVolume, now);
  clickGain.gain.exponentialRampToValueAtTime(0.0005, now + 0.03);

  const bq = ctx.createBiquadFilter();
  bq.type = 'lowpass';
  bq.frequency.setValueAtTime(1200, now);

  clickOsc.connect(bq);
  bq.connect(clickGain);
  clickGain.connect(ctx.destination);

  clickOsc.start(now);
  clickOsc.stop(now + 0.035);
};

/**
 * 3. Profile Bubble: Âm thanh giọt nước bong bóng pop dịu ngọt xả stress
 */
const playBubbleSound = (ctx, isSpecialKey) => {
  const now = ctx.currentTime;
  const masterVolume = getAsmrVolume();

  const jitter = 0.94 + Math.random() * 0.12;
  const startFreq = (isSpecialKey === 'space' ? 220 : isSpecialKey === 'enter' ? 280 : 360) * jitter;
  const endFreq = startFreq * 1.9;

  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(startFreq, now);
  osc.frequency.exponentialRampToValueAtTime(endFreq, now + 0.045);

  gain.gain.setValueAtTime(0.18 * masterVolume, now);
  gain.gain.exponentialRampToValueAtTime(0.0005, now + 0.05);

  osc.connect(gain);
  gain.connect(ctx.destination);

  osc.start(now);
  osc.stop(now + 0.055);
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

  const key = typeof e === 'string' ? e : e?.key || '';
  // Bỏ qua các phím điều hướng im lặng không in chữ để tránh ồn ào (Shift, Alt, Ctrl, CapsLock)
  if (['Shift', 'Control', 'Alt', 'Meta', 'CapsLock', 'Tab'].includes(key)) {
    return;
  }

  const ctx = getAudioContext();
  if (!ctx) return;

  const profile = forcedProfile || getAsmrProfile();
  const isSpecialKey = key === ' ' || key === 'Spacebar' ? 'space' : key === 'Enter' ? 'enter' : key === 'Backspace' || key === 'Delete' ? 'backspace' : null;

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

export const playKeySound = triggerAsmrKeySound;

/**
 * Bật/tắt nhanh âm thanh bàn phím
 */
export const toggleKeyboardSound = () => {
  const next = !isAsmrKeyboardEnabled();
  setAsmrKeyboardEnabled(next);
  if (next) {
    triggerAsmrKeySound({ key: 'Enter' });
  }
  return next;
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
