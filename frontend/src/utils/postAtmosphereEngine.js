/**
 * =========================================================================
 * 🎭 POST ATMOSPHERE SOUND ENGINE & THEME PRESETS
 * =========================================================================
 * - Tạo âm thanh không gian cảm xúc đặc trưng cho từng bài viết bằng Web Audio API
 * - Các chủ đề:
 *    1. horror: Gió hú u ám, rùng rợn, sub-bass lạnh gáy
 *    2. joy: Nhịp điệu vui tươi, chimes pentatonic rộn ràng, sắc nắng
 *    3. sadness: Tiếng mưa rả rích trên mái hiên, giọt nước rơi cô đơn
 *    4. drama: Nhịp tim thump-thump dồn dập + tiếng đồng hồ tick-tock căng thẳng
 *    5. healing: Tiếng suối reo róc rách, chim rừng khẽ hót, đom đóm
 * - Hỗ trợ Audio Ducking (tự động chìm êm dịu khi nhạc cá nhân bật)
 * - Tự động dọn dẹp khi người dùng rời trang chi tiết
 */

// Định nghĩa dữ liệu các theme không gian
export const ATMOSPHERE_THEMES = {
  default: {
    id: 'default',
    name: 'Mặc định (Tiêu chuẩn)',
    icon: '📝',
    badgeText: 'Tiêu chuẩn',
    tagline: 'Giao diện sáng sủa tiêu chuẩn của cộng đồng Freedom',
    soundLabel: 'Không có âm thanh nền',
    defaultBgPreset: 'default',
    defaultParticle: 'none',
    accentColor: '#0d9488',
    cardBorderColor: 'rgba(13, 148, 136, 0.2)',
  },
  horror: {
    id: 'horror',
    name: 'Bí ẩn & Rùng rợn (Horror/Mystery)',
    icon: '👻',
    badgeText: 'Bí ẩn & Rùng rợn',
    tagline: 'Gió rít đêm khuya, bóng tối u uất, không gian rùng rợn lạnh gáy',
    soundLabel: 'Gió rít u ám & bóng tối rùng rợn',
    defaultBgPreset: 'horror_dark',
    defaultParticle: 'fog',
    accentColor: '#a855f7',
    cardBorderColor: 'rgba(168, 85, 247, 0.45)',
  },
  joy: {
    id: 'joy',
    name: 'Sôi động & Tươi vui (Joy/Celebration)',
    icon: '🎉',
    badgeText: 'Sôi động & Tươi vui',
    tagline: 'Giai điệu rộn ràng, ánh nắng vàng rạng rỡ và pháo hoa rực rỡ',
    soundLabel: 'Nhịp điệu vui tươi & chuông reo rộn rã',
    defaultBgPreset: 'joy_sunset',
    defaultParticle: 'sparkles',
    accentColor: '#f59e0b',
    cardBorderColor: 'rgba(245, 158, 11, 0.45)',
  },
  sadness: {
    id: 'sadness',
    name: 'Trầm buồn & Hoài niệm (Sadness/Rain)',
    icon: '🌧️',
    badgeText: 'Trầm buồn & Hoài niệm',
    tagline: 'Mưa rơi tí tách trên mái hiên, nỗi buồn da diết, giọt lệ lăn dài',
    soundLabel: 'Mưa rơi rả rích & giọt nước tí tách',
    defaultBgPreset: 'sadness_rain',
    defaultParticle: 'rain',
    accentColor: '#38bdf8',
    cardBorderColor: 'rgba(56, 189, 248, 0.45)',
  },
  drama: {
    id: 'drama',
    name: 'Gay cấn & Drama (Tension/Heartbeat)',
    icon: '⚡',
    badgeText: 'Gay cấn & Căng thẳng',
    tagline: 'Nhịp tim đập thình thịch dồn dập, đồng hồ tích tắc đếm ngược kịch tính',
    soundLabel: 'Nhịp tim thình thịch & đồng hồ tích tắc',
    defaultBgPreset: 'drama_crimson',
    defaultParticle: 'heartbeat_pulse',
    accentColor: '#ef4444',
    cardBorderColor: 'rgba(239, 68, 68, 0.5)',
  },
  healing: {
    id: 'healing',
    name: 'Chữa lành & Bình yên (Healing/Zen)',
    icon: '🌿',
    badgeText: 'Chữa lành & Bình yên',
    tagline: 'Tiếng suối reo róc rách, gió thoảng rừng tre, đom đóm thanh tịnh',
    soundLabel: 'Suối chảy róc rách & chim rừng bình yên',
    defaultBgPreset: 'healing_emerald',
    defaultParticle: 'fireflies',
    accentColor: '#10b981',
    cardBorderColor: 'rgba(16, 185, 129, 0.45)',
  },
};

// Định nghĩa các preset background bài viết - Đậm nét, tương phản cao, đặc trưng 100%
export const BACKGROUND_PRESETS = [
  {
    id: 'default',
    name: 'Nền Thường',
    icon: '⚪',
    styleClass: 'post-bg-default',
    dotGradient: 'linear-gradient(135deg, #ffffff 0%, #cbd5e1 100%)',
    previewBg: 'linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)',
    textColor: '#0f172a',
    accentColor: '#0d9488',
    badgeBg: 'rgba(13, 148, 136, 0.12)',
    boxShadow: '0 4px 16px rgba(13, 148, 136, 0.15)',
  },
  {
    id: 'horror_dark',
    name: 'Bóng Đêm Gothic',
    icon: '🌑',
    styleClass: 'post-bg-horror-dark',
    dotGradient: 'linear-gradient(135deg, #c084fc 0%, #7e22ce 100%)',
    previewBg: 'linear-gradient(135deg, #2e1065 0%, #4c1d95 45%, #1e1138 75%, #0d041a 100%)',
    textColor: '#f8fafc',
    accentColor: '#c084fc',
    badgeBg: 'rgba(192, 132, 252, 0.28)',
    boxShadow: '0 8px 28px rgba(147, 51, 234, 0.45)',
  },
  {
    id: 'joy_sunset',
    name: 'Ánh Nắng Vàng Ấm',
    icon: '🌅',
    styleClass: 'post-bg-joy-sunset',
    dotGradient: 'linear-gradient(135deg, #fde047 0%, #ea580c 100%)',
    previewBg: 'linear-gradient(135deg, #fef08a 0%, #fed7aa 35%, #fb923c 70%, #f97316 100%)',
    textColor: '#431407',
    accentColor: '#ea580c',
    badgeBg: 'rgba(234, 88, 12, 0.22)',
    boxShadow: '0 8px 28px rgba(249, 115, 22, 0.35)',
  },
  {
    id: 'sadness_rain',
    name: 'Xanh Mưa Chiều',
    icon: '🌧️',
    styleClass: 'post-bg-sadness-rain',
    dotGradient: 'linear-gradient(135deg, #38bdf8 0%, #0284c7 100%)',
    previewBg: 'linear-gradient(135deg, #075985 0%, #0284c7 40%, #0369a1 70%, #082f49 100%)',
    textColor: '#f0f9ff',
    accentColor: '#38bdf8',
    badgeBg: 'rgba(56, 189, 248, 0.28)',
    boxShadow: '0 8px 28px rgba(2, 132, 199, 0.45)',
  },
  {
    id: 'drama_crimson',
    name: 'Đỏ Than Kịch Tính',
    icon: '🔥',
    styleClass: 'post-bg-drama-crimson',
    dotGradient: 'linear-gradient(135deg, #f87171 0%, #b91c1c 100%)',
    previewBg: 'linear-gradient(135deg, #991b1b 0%, #dc2626 35%, #b91c1c 65%, #450a0a 100%)',
    textColor: '#fef2f2',
    accentColor: '#f87171',
    badgeBg: 'rgba(248, 113, 113, 0.28)',
    boxShadow: '0 8px 28px rgba(220, 38, 38, 0.5)',
  },
  {
    id: 'healing_emerald',
    name: 'Ngọc Bích Thiền Định',
    icon: '🍃',
    styleClass: 'post-bg-healing-emerald',
    dotGradient: 'linear-gradient(135deg, #34d399 0%, #059669 100%)',
    previewBg: 'linear-gradient(135deg, #065f46 0%, #059669 35%, #047857 70%, #022c22 100%)',
    textColor: '#f0fdf4',
    accentColor: '#34d399',
    badgeBg: 'rgba(52, 211, 153, 0.28)',
    boxShadow: '0 8px 28px rgba(5, 150, 105, 0.45)',
  },
  {
    id: 'cyber_neon',
    name: 'Cyberpunk Neon',
    icon: '🌌',
    styleClass: 'post-bg-cyber-neon',
    dotGradient: 'linear-gradient(135deg, #f43f5e 0%, #a855f7 50%, #06b6d4 100%)',
    previewBg: 'linear-gradient(135deg, #581c87 0%, #a21caf 35%, #0284c7 70%, #06b6d4 100%)',
    textColor: '#fdf4ff',
    accentColor: '#f0abfc',
    badgeBg: 'rgba(240, 171, 252, 0.32)',
    boxShadow: '0 8px 32px rgba(162, 28, 175, 0.5)',
  },
  {
    id: 'pastel_dream',
    name: 'Mây Hồng Mơ Mộng',
    icon: '🌸',
    styleClass: 'post-bg-pastel-dream',
    dotGradient: 'linear-gradient(135deg, #f472b6 0%, #c084fc 100%)',
    previewBg: 'linear-gradient(135deg, #fbcfe8 0%, #f472b6 35%, #e879f9 70%, #c084fc 100%)',
    textColor: '#4a044e',
    accentColor: '#db2777',
    badgeBg: 'rgba(219, 39, 119, 0.22)',
    boxShadow: '0 8px 28px rgba(244, 114, 182, 0.4)',
  },
  {
    id: 'custom',
    name: 'Tùy Chỉnh Màu Riêng',
    icon: '🎨',
    styleClass: 'post-bg-custom',
    dotGradient: 'conic-gradient(from 180deg at 50% 50%, #ef4444, #f59e0b, #10b981, #3b82f6, #8b5cf6, #ef4444)',
    previewBg: 'conic-gradient(from 180deg at 50% 50%, #ef4444, #f59e0b, #10b981, #3b82f6, #8b5cf6, #ef4444)',
    textColor: '#ffffff',
    accentColor: '#8b5cf6',
    badgeBg: 'rgba(139, 92, 246, 0.28)',
    boxShadow: '0 8px 28px rgba(139, 92, 246, 0.35)',
  },
];

// Định nghĩa các hiệu ứng hạt chuyển động
export const PARTICLE_EFFECTS = [
  { id: 'none', name: 'Không dùng hạt', icon: '🚫' },
  { id: 'fog', name: 'Sương mù ma quái', icon: '🌫️' },
  { id: 'rain', name: 'Mưa rơi tí tách', icon: '🌧️' },
  { id: 'sparkles', name: 'Lấp lánh & Pháo hoa', icon: '✨' },
  { id: 'heartbeat_pulse', name: 'Viền nhịp tim hồi hộp', icon: '💓' },
  { id: 'fireflies', name: 'Đom đóm thanh tịnh', icon: '💡' },
];

// =========================================================================
// WEB AUDIO API ENGINE CHUYÊN DỤNG CHO BÀI VIẾT
// =========================================================================

let postAudioCtx = null;
let postMasterGain = null;
let currentAtmosphereSources = [];
let currentThemePlaying = null;
let isPostSoundActive = false;
let userVolume = 0.5;
let isDuckByMusic = false;

const getPostAudioContext = () => {
  if (typeof window === 'undefined') return null;
  const AudioContextClass = window.AudioContext || window.webkitAudioContext;
  if (!AudioContextClass) return null;

  if (!postAudioCtx) {
    postAudioCtx = new AudioContextClass();
  }
  if (postAudioCtx.state === 'suspended') {
    postAudioCtx.resume().catch(() => {});
  }
  return postAudioCtx;
};

const createNoiseBuffer = (ctx, duration = 3) => {
  const bufferSize = Math.max(1, Math.floor(ctx.sampleRate * duration));
  const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) {
    data[i] = Math.random() * 2 - 1;
  }
  return buffer;
};

// 1. HORROR SYNTH: Gió rít u ám + Sub-bass rùng rợn + Chuông gió ma quái
const createHorrorSoundscape = (ctx, outNode) => {
  const sources = [];

  // Wind howling
  const noise = ctx.createBufferSource();
  noise.buffer = createNoiseBuffer(ctx, 4);
  noise.loop = true;

  const bandpass = ctx.createBiquadFilter();
  bandpass.type = 'bandpass';
  bandpass.frequency.setValueAtTime(240, ctx.currentTime);
  bandpass.Q.setValueAtTime(4.5, ctx.currentTime);

  const lfo = ctx.createOscillator();
  const lfoGain = ctx.createGain();
  lfo.frequency.setValueAtTime(0.12, ctx.currentTime); // Cơn gió quét qua mỗi 8 giây
  lfoGain.gain.setValueAtTime(160, ctx.currentTime);
  lfo.connect(lfoGain);
  lfoGain.connect(bandpass.frequency);

  const windGain = ctx.createGain();
  windGain.gain.setValueAtTime(0.14, ctx.currentTime);

  noise.connect(bandpass);
  bandpass.connect(windGain);
  windGain.connect(outNode);

  noise.start();
  lfo.start();
  sources.push(noise, lfo);

  // Sub-bass rùng rợn
  const subOsc = ctx.createOscillator();
  subOsc.type = 'sawtooth';
  subOsc.frequency.setValueAtTime(42, ctx.currentTime);

  const subFilter = ctx.createBiquadFilter();
  subFilter.type = 'lowpass';
  subFilter.frequency.setValueAtTime(90, ctx.currentTime);

  const subGain = ctx.createGain();
  subGain.gain.setValueAtTime(0.08, ctx.currentTime);

  subOsc.connect(subFilter);
  subFilter.connect(subGain);
  subGain.connect(outNode);
  subOsc.start();
  sources.push(subOsc);

  // Chuông gió ma mị ngắt quãng
  const bellTimer = setInterval(() => {
    if (!isPostSoundActive || ctx.state === 'closed') return;
    try {
      const now = ctx.currentTime;
      const bell = ctx.createOscillator();
      const bGain = ctx.createGain();
      bell.type = 'sine';
      // Tần số rùng rợn trượt nốt (tritone)
      const freqs = [311.13, 440.0, 622.25, 830.61];
      const f = freqs[Math.floor(Math.random() * freqs.length)];
      bell.frequency.setValueAtTime(f, now);

      bGain.gain.setValueAtTime(0.04, now);
      bGain.gain.exponentialRampToValueAtTime(0.0001, now + 3.0);

      bell.connect(bGain);
      bGain.connect(outNode);
      bell.start(now);
      bell.stop(now + 3.0);
    } catch (e) {}
  }, 4500);

  sources.push({ stop: () => clearInterval(bellTimer) });

  return sources;
};

// 2. JOY SYNTH: Chuỗi nốt marimba / bells pentatonic tươi vui rộn ràng
const createJoySoundscape = (ctx, outNode) => {
  const sources = [];
  const notes = [261.63, 329.63, 392.0, 523.25, 659.25, 783.99]; // C major pentatonic
  let step = 0;

  const arpeggioTimer = setInterval(() => {
    if (!isPostSoundActive || ctx.state === 'closed') return;
    try {
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'triangle';
      const freq = notes[step % notes.length];
      step = (step + 1) % notes.length;
      osc.frequency.setValueAtTime(freq, now);

      gain.gain.setValueAtTime(0.06, now);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.65);

      osc.connect(gain);
      gain.connect(outNode);
      osc.start(now);
      osc.stop(now + 0.7);
    } catch (e) {}
  }, 320);

  sources.push({ stop: () => clearInterval(arpeggioTimer) });

  // Nhạc nền pad ấm áp
  const padOsc = ctx.createOscillator();
  padOsc.type = 'sine';
  padOsc.frequency.setValueAtTime(130.81, ctx.currentTime); // C3
  const padGain = ctx.createGain();
  padGain.gain.setValueAtTime(0.05, ctx.currentTime);
  padOsc.connect(padGain);
  padGain.connect(outNode);
  padOsc.start();
  sources.push(padOsc);

  return sources;
};

// 3. SADNESS SYNTH: Mưa rơi rả rích trên mái hiên + Giọt nước tí tách
const createSadnessSoundscape = (ctx, outNode) => {
  const sources = [];

  // Mưa rào rào (Pink/Lowpass noise)
  const noise = ctx.createBufferSource();
  noise.buffer = createNoiseBuffer(ctx, 3);
  noise.loop = true;

  const filter = ctx.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.setValueAtTime(700, ctx.currentTime);

  const gain = ctx.createGain();
  gain.gain.setValueAtTime(0.12, ctx.currentTime);

  noise.connect(filter);
  filter.connect(gain);
  gain.connect(outNode);
  noise.start();
  sources.push(noise);

  // Giọt nước nhỏ giọt ngẫu nhiên
  const dropTimer = setInterval(() => {
    if (!isPostSoundActive || ctx.state === 'closed') return;
    try {
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const dGain = ctx.createGain();

      osc.type = 'sine';
      const baseF = 800 + Math.random() * 500;
      osc.frequency.setValueAtTime(baseF, now);
      osc.frequency.exponentialRampToValueAtTime(baseF + 200, now + 0.08);

      dGain.gain.setValueAtTime(0.05, now);
      dGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.12);

      osc.connect(dGain);
      dGain.connect(outNode);
      osc.start(now);
      osc.stop(now + 0.15);
    } catch (e) {}
  }, 750);

  sources.push({ stop: () => clearInterval(dropTimer) });

  return sources;
};

// 4. DRAMA SYNTH: Nhịp tim thump-thump dồn dập + Đồng hồ tích tắc
const createDramaSoundscape = (ctx, outNode) => {
  const sources = [];

  // Nhịp tim thump-thump (80 bpm, 750ms mỗi chu kỳ)
  const heartbeatTimer = setInterval(() => {
    if (!isPostSoundActive || ctx.state === 'closed') return;
    try {
      const now = ctx.currentTime;

      // Tiếng "thump" 1 (trầm mạnh)
      const osc1 = ctx.createOscillator();
      const g1 = ctx.createGain();
      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(65, now);
      osc1.frequency.exponentialRampToValueAtTime(35, now + 0.14);

      g1.gain.setValueAtTime(0.2, now);
      g1.gain.exponentialRampToValueAtTime(0.0001, now + 0.18);
      osc1.connect(g1);
      g1.connect(outNode);
      osc1.start(now);
      osc1.stop(now + 0.2);

      // Tiếng "thump" 2 (sau 160ms)
      const osc2 = ctx.createOscillator();
      const g2 = ctx.createGain();
      osc2.type = 'sine';
      osc2.frequency.setValueAtTime(55, now + 0.16);
      osc2.frequency.exponentialRampToValueAtTime(30, now + 0.28);

      g2.gain.setValueAtTime(0.14, now + 0.16);
      g2.gain.exponentialRampToValueAtTime(0.0001, now + 0.32);
      osc2.connect(g2);
      g2.connect(outNode);
      osc2.start(now + 0.16);
      osc2.stop(now + 0.35);

      // Tiếng đồng hồ tick giữa nhịp
      const tickOsc = ctx.createOscillator();
      const tickG = ctx.createGain();
      tickOsc.type = 'square';
      tickOsc.frequency.setValueAtTime(1400, now + 0.42);
      tickG.gain.setValueAtTime(0.03, now + 0.42);
      tickG.gain.exponentialRampToValueAtTime(0.0001, now + 0.45);
      tickOsc.connect(tickG);
      tickG.connect(outNode);
      tickOsc.start(now + 0.42);
      tickOsc.stop(now + 0.47);
    } catch (e) {}
  }, 780);

  sources.push({ stop: () => clearInterval(heartbeatTimer) });

  // Âm sub tension râm ran nhẹ phía dưới
  const droneOsc = ctx.createOscillator();
  droneOsc.type = 'triangle';
  droneOsc.frequency.setValueAtTime(50, ctx.currentTime);
  const droneG = ctx.createGain();
  droneG.gain.setValueAtTime(0.05, ctx.currentTime);
  droneOsc.connect(droneG);
  droneG.connect(outNode);
  droneOsc.start();
  sources.push(droneOsc);

  return sources;
};

// 5. HEALING SYNTH: Suối reo róc rách + Chim rừng khẽ hót
const createHealingSoundscape = (ctx, outNode) => {
  const sources = [];

  // Tiếng suối reo (Modulated noise)
  const noise = ctx.createBufferSource();
  noise.buffer = createNoiseBuffer(ctx, 3);
  noise.loop = true;

  const filter = ctx.createBiquadFilter();
  filter.type = 'bandpass';
  filter.frequency.setValueAtTime(600, ctx.currentTime);
  filter.Q.setValueAtTime(1.5, ctx.currentTime);

  const gain = ctx.createGain();
  gain.gain.setValueAtTime(0.1, ctx.currentTime);

  noise.connect(filter);
  filter.connect(gain);
  gain.connect(outNode);
  noise.start();
  sources.push(noise);

  // Chim khẽ hót thư giãn
  const birdTimer = setInterval(() => {
    if (!isPostSoundActive || ctx.state === 'closed') return;
    try {
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const bGain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(2200 + Math.random() * 400, now);
      osc.frequency.exponentialRampToValueAtTime(3200 + Math.random() * 300, now + 0.08);
      osc.frequency.exponentialRampToValueAtTime(2500, now + 0.16);

      bGain.gain.setValueAtTime(0.04, now);
      bGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.22);

      osc.connect(bGain);
      bGain.connect(outNode);
      osc.start(now);
      osc.stop(now + 0.25);
    } catch (e) {}
  }, 3800);

  sources.push({ stop: () => clearInterval(birdTimer) });

  return sources;
};

// =========================================================================
// QUẢN LÝ PHÁT / TẠM DỪNG / VOLUME / AUDIO DUCKING
// =========================================================================

export const startPostAtmosphere = (themeId, targetVolume = 0.5) => {
  if (!themeId || themeId === 'default') {
    stopPostAtmosphere();
    return;
  }

  const ctx = getPostAudioContext();
  if (!ctx) return;

  // Dọn dẹp âm thanh cũ
  stopPostAtmosphere(false);

  // Tạo master gain cho bài viết
  postMasterGain = ctx.createGain();
  userVolume = typeof targetVolume === 'number' ? targetVolume : 0.5;
  const effectiveVolume = isDuckByMusic ? userVolume * 0.15 : userVolume;
  postMasterGain.gain.setValueAtTime(0, ctx.currentTime);
  postMasterGain.gain.linearRampToValueAtTime(effectiveVolume, ctx.currentTime + 0.8);
  postMasterGain.connect(ctx.destination);

  isPostSoundActive = true;
  currentThemePlaying = themeId;

  switch (themeId) {
    case 'horror':
      currentAtmosphereSources = createHorrorSoundscape(ctx, postMasterGain);
      break;
    case 'joy':
      currentAtmosphereSources = createJoySoundscape(ctx, postMasterGain);
      break;
    case 'sadness':
      currentAtmosphereSources = createSadnessSoundscape(ctx, postMasterGain);
      break;
    case 'drama':
      currentAtmosphereSources = createDramaSoundscape(ctx, postMasterGain);
      break;
    case 'healing':
      currentAtmosphereSources = createHealingSoundscape(ctx, postMasterGain);
      break;
    default:
      break;
  }

  notifyAtmosphereState();
};

export const stopPostAtmosphere = (notify = true) => {
  if (currentAtmosphereSources && currentAtmosphereSources.length > 0) {
    currentAtmosphereSources.forEach((src) => {
      try {
        if (typeof src.stop === 'function') src.stop();
        if (typeof src.disconnect === 'function') src.disconnect();
      } catch (e) {}
    });
    currentAtmosphereSources = [];
  }

  if (postMasterGain && postAudioCtx) {
    try {
      postMasterGain.gain.setValueAtTime(0, postAudioCtx.currentTime);
      postMasterGain.disconnect();
    } catch (e) {}
    postMasterGain = null;
  }

  isPostSoundActive = false;
  currentThemePlaying = null;

  if (notify) {
    notifyAtmosphereState();
  }
};

export const setPostAtmosphereVolume = (vol) => {
  userVolume = Math.max(0, Math.min(1, vol));
  if (postMasterGain && postAudioCtx) {
    const effective = isDuckByMusic ? userVolume * 0.15 : userVolume;
    postMasterGain.gain.setValueAtTime(effective, postAudioCtx.currentTime);
  }
  notifyAtmosphereState();
};

export const isAtmospherePlaying = () => isPostSoundActive;
export const getCurrentTheme = () => currentThemePlaying;
export const getPostAtmosphereVolume = () => userVolume;

// Audio Ducking khi người dùng phát nhạc cá nhân (Profile Music Player)
if (typeof window !== 'undefined') {
  window.addEventListener('freedom_ambient_sound_changed', (e) => {
    const { isMusicDucking } = e.detail || {};
    if (isMusicDucking !== undefined && isMusicDucking !== isDuckByMusic) {
      isDuckByMusic = isMusicDucking;
      if (postMasterGain && postAudioCtx) {
        const now = postAudioCtx.currentTime;
        const target = isDuckByMusic ? userVolume * 0.15 : userVolume;
        postMasterGain.gain.cancelScheduledValues(now);
        postMasterGain.gain.setValueAtTime(postMasterGain.gain.value, now);
        postMasterGain.gain.linearRampToValueAtTime(target, now + 1.2);
      }
    }
  });
}

const notifyAtmosphereState = () => {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(
      new CustomEvent('freedom_post_atmosphere_state_change', {
        detail: {
          isPlaying: isPostSoundActive,
          theme: currentThemePlaying,
          volume: userVolume,
        },
      })
    );
  }
};
