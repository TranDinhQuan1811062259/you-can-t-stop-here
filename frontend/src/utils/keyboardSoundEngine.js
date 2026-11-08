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

// Cấu hình 8 Thể Loại Âm Thanh Bàn Phím ASMR Thư Giãn Đa Dạng
export const ASMR_PROFILES = {
  thocky: {
    id: 'thocky',
    name: 'Phím Cơ Thocky',
    category: 'Phím cơ',
    desc: 'Âm switch bôi trơn (lubed) trầm ấm, êm dịu, không gắt',
    icon: '⌨️',
    badge: 'Trầm ấm',
    color: '#10b981',
  },
  creamy: {
    id: 'creamy',
    name: 'Phím Cơ Creamy',
    category: 'Phím cơ',
    desc: 'Âm xốp mịn, nịnh tai, trơn tru mượt mà như bơ',
    icon: '🥛',
    badge: 'Xốp mịn',
    color: '#f59e0b',
  },
  clacky: {
    id: 'clacky',
    name: 'Phím Cơ Clacky Hi-Fi',
    category: 'Phím cơ',
    desc: 'Âm tactile giòn giã, tách bạch, nảy tay cực đã',
    icon: '⚡',
    badge: 'Giòn tan',
    color: '#06b6d4',
  },
  typewriter: {
    id: 'typewriter',
    name: 'Máy Đánh Chữ Retro',
    category: 'Cổ điển',
    desc: 'Âm cơ học giòn tan & chuông Ding thanh thoát khi Enter',
    icon: '📜',
    badge: 'Cổ điển',
    color: '#f97316',
  },
  bubble: {
    id: 'bubble',
    name: 'Bong Bóng Pop',
    category: 'Thư giãn',
    desc: 'Âm nổ bong bóng tươi vui, giải tỏa áp lực deadline',
    icon: '🫧',
    badge: 'Xả stress',
    color: '#ec4899',
  },
  raindrop: {
    id: 'raindrop',
    name: 'Giọt Mưa Mái Kính',
    category: 'Thiên nhiên',
    desc: 'Tiếng giọt mưa tí tách rơi trên cửa kính êm dịu',
    icon: '🌧️',
    badge: 'Mưa rơi',
    color: '#38bdf8',
  },
  pencil: {
    id: 'pencil',
    name: 'Bút Chì Phác Thảo',
    category: 'Hoài niệm',
    desc: 'Âm ngòi chì sột soạt trên trang giấy thô mộc mạc',
    icon: '✏️',
    badge: 'Mộc mạc',
    color: '#a78bfa',
  },
  crystal: {
    id: 'crystal',
    name: 'Đá Băng Pha Lê',
    category: 'Thanh khiết',
    desc: 'Chuông pha lê ngân trong veo như đá va trong ly nước',
    icon: '🧊',
    badge: 'Trong veo',
    color: '#818cf8',
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

/**
 * 4. Profile Creamy: Tiếng phím Milky/Oil King xốp mịn nịnh tai
 */
const playCreamySound = (ctx, isSpecialKey) => {
  const now = ctx.currentTime;
  const masterVolume = getAsmrVolume();
  const jitter = 0.97 + Math.random() * 0.06;
  const baseFreq = (isSpecialKey === 'space' ? 95 : isSpecialKey === 'enter' ? 110 : 135) * jitter;

  const osc1 = ctx.createOscillator();
  const osc2 = ctx.createOscillator();
  const gain = ctx.createGain();

  osc1.type = 'sine';
  osc1.frequency.setValueAtTime(baseFreq * 1.25, now);
  osc1.frequency.exponentialRampToValueAtTime(baseFreq, now + 0.03);

  osc2.type = 'sine';
  osc2.frequency.setValueAtTime(baseFreq * 2.1, now);
  osc2.frequency.exponentialRampToValueAtTime(baseFreq * 1.8, now + 0.025);

  gain.gain.setValueAtTime(0.18 * masterVolume, now);
  gain.gain.exponentialRampToValueAtTime(0.0005, now + 0.045);

  const lp = ctx.createBiquadFilter();
  lp.type = 'lowpass';
  lp.frequency.setValueAtTime(520, now);

  osc1.connect(lp);
  osc2.connect(lp);
  lp.connect(gain);
  gain.connect(ctx.destination);

  osc1.start(now);
  osc2.start(now);
  osc1.stop(now + 0.05);
  osc2.stop(now + 0.05);
};

/**
 * 5. Profile Clacky: Phím cơ Hi-Fi Tactile giòn giã, nảy tay
 */
const playClackySound = (ctx, isSpecialKey) => {
  const now = ctx.currentTime;
  const masterVolume = getAsmrVolume();
  const jitter = 0.95 + Math.random() * 0.1;
  const baseFreq = (isSpecialKey === 'space' ? 140 : isSpecialKey === 'enter' ? 180 : 220) * jitter;

  // Clicky micro snap
  const clickOsc = ctx.createOscillator();
  const clickGain = ctx.createGain();
  clickOsc.type = 'triangle';
  clickOsc.frequency.setValueAtTime(baseFreq * 8.5, now);
  clickOsc.frequency.exponentialRampToValueAtTime(baseFreq * 2.2, now + 0.012);

  clickGain.gain.setValueAtTime(0.18 * masterVolume, now);
  clickGain.gain.exponentialRampToValueAtTime(0.0005, now + 0.016);

  const bpFilter = ctx.createBiquadFilter();
  bpFilter.type = 'bandpass';
  bpFilter.frequency.setValueAtTime(2100 * jitter, now);
  bpFilter.Q.setValueAtTime(2.5, now);

  clickOsc.connect(bpFilter);
  bpFilter.connect(clickGain);
  clickGain.connect(ctx.destination);
  clickOsc.start(now);
  clickOsc.stop(now + 0.02);

  // Bottom-out clack
  const thudOsc = ctx.createOscillator();
  const thudGain = ctx.createGain();
  thudOsc.type = 'sine';
  thudOsc.frequency.setValueAtTime(baseFreq * 1.5, now);
  thudOsc.frequency.exponentialRampToValueAtTime(baseFreq * 0.8, now + 0.028);

  thudGain.gain.setValueAtTime(0.14 * masterVolume, now);
  thudGain.gain.exponentialRampToValueAtTime(0.0005, now + 0.035);

  const lpFilter = ctx.createBiquadFilter();
  lpFilter.type = 'lowpass';
  lpFilter.frequency.setValueAtTime(950, now);

  thudOsc.connect(lpFilter);
  lpFilter.connect(thudGain);
  thudGain.connect(ctx.destination);
  thudOsc.start(now);
  thudOsc.stop(now + 0.04);
};

/**
 * 6. Profile Raindrop: Tiếng giọt mưa tí tách rơi trên mặt kính
 */
const playRaindropSound = (ctx, isSpecialKey) => {
  const now = ctx.currentTime;
  const masterVolume = getAsmrVolume();
  const jitter = 0.92 + Math.random() * 0.16;
  const startFreq = (isSpecialKey === 'space' ? 680 : isSpecialKey === 'enter' ? 820 : 1050) * jitter;
  const endFreq = startFreq * 0.42;

  const osc = ctx.createOscillator();
  const gain = ctx.createGain();

  osc.type = 'sine';
  osc.frequency.setValueAtTime(startFreq, now);
  osc.frequency.exponentialRampToValueAtTime(endFreq, now + 0.035);

  gain.gain.setValueAtTime(0.20 * masterVolume, now);
  gain.gain.exponentialRampToValueAtTime(0.0005, now + 0.045);

  const resOsc = ctx.createOscillator();
  const resGain = ctx.createGain();
  resOsc.type = 'triangle';
  resOsc.frequency.setValueAtTime(endFreq * 1.4, now);

  resGain.gain.setValueAtTime(0.06 * masterVolume, now);
  resGain.gain.exponentialRampToValueAtTime(0.0005, now + 0.06);

  osc.connect(gain);
  gain.connect(ctx.destination);
  resOsc.connect(resGain);
  resGain.connect(ctx.destination);

  osc.start(now);
  osc.stop(now + 0.05);
  resOsc.start(now);
  resOsc.stop(now + 0.065);
};

/**
 * 7. Profile Pencil: Tiếng ngòi bút chì sột soạt vẽ trên giấy thô
 */
const playPencilSound = (ctx, isSpecialKey) => {
  const now = ctx.currentTime;
  const masterVolume = getAsmrVolume();
  const jitter = 0.9 + Math.random() * 0.2;

  try {
    const dur = isSpecialKey === 'space' ? 0.045 : isSpecialKey === 'enter' ? 0.055 : 0.035;
    const bufferSize = Math.floor(ctx.sampleRate * dur);
    const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = noiseBuffer.getChannelData(0);

    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.sin((i / bufferSize) * Math.PI);
    }

    const noise = ctx.createBufferSource();
    noise.buffer = noiseBuffer;

    const bp = ctx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.setValueAtTime(1450 * jitter, now);
    bp.Q.setValueAtTime(1.9, now);

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.12 * masterVolume, now);
    gain.gain.exponentialRampToValueAtTime(0.0005, now + dur);

    noise.connect(bp);
    bp.connect(gain);
    gain.connect(ctx.destination);

    noise.start(now);
    noise.stop(now + dur + 0.005);
  } catch (_) {}
};

/**
 * 8. Profile Crystal: Tiếng chuông đá băng pha lê ngân trong veo
 */
const playCrystalSound = (ctx, isSpecialKey) => {
  const now = ctx.currentTime;
  const masterVolume = getAsmrVolume();
  const jitter = 0.96 + Math.random() * 0.08;
  const baseFreq = (isSpecialKey === 'space' ? 1450 : isSpecialKey === 'enter' ? 2200 : 1850) * jitter;

  const osc1 = ctx.createOscillator();
  const osc2 = ctx.createOscillator();
  const gain = ctx.createGain();

  osc1.type = 'sine';
  osc1.frequency.setValueAtTime(baseFreq, now);

  osc2.type = 'sine';
  osc2.frequency.setValueAtTime(baseFreq * 2.02, now);

  const decay = isSpecialKey === 'enter' ? 0.35 : 0.16;
  gain.gain.setValueAtTime(0.16 * masterVolume, now);
  gain.gain.exponentialRampToValueAtTime(0.0005, now + decay);

  osc1.connect(gain);
  osc2.connect(gain);
  gain.connect(ctx.destination);

  osc1.start(now);
  osc2.start(now);
  osc1.stop(now + decay + 0.01);
  osc2.stop(now + decay + 0.01);
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
    } else if (profile === 'creamy') {
      playCreamySound(ctx, isSpecialKey);
    } else if (profile === 'clacky') {
      playClackySound(ctx, isSpecialKey);
    } else if (profile === 'raindrop') {
      playRaindropSound(ctx, isSpecialKey);
    } else if (profile === 'pencil') {
      playPencilSound(ctx, isSpecialKey);
    } else if (profile === 'crystal') {
      playCrystalSound(ctx, isSpecialKey);
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
