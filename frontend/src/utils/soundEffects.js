/**
 * Hệ thống âm thanh tương tác Web Audio API (Click, Hover & Âm Thanh Sự Kiện Lễ Hội)
 * Không phụ thuộc file âm thanh ngoài, hoạt động mượt mà 0ms độ trễ.
 */

let audioCtx = null;

// Khởi tạo AudioContext an toàn sau tương tác người dùng
export const getAudioContext = () => {
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

// Tạo buffer tiếng ồn trắng (White Noise) cho hiệu ứng nổ, pháo hoa, chũm chọe
const createNoiseBuffer = (ctx, duration = 1) => {
  const bufferSize = Math.max(1, Math.floor(ctx.sampleRate * duration));
  const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) {
    data[i] = Math.random() * 2 - 1;
  }
  return buffer;
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
  } catch (e) {}
};

/* ==========================================================================
   HỆ THỐNG ÂM THANH SỰ KIỆN LỄ HỘI CHUYÊN BIỆT (FESTIVE EVENT SOUND SYNTHESIZER)
   Tự động tổng hợp âm thanh chân thực 100% bằng Web Audio API
   ========================================================================== */

/**
 * 1. Tiếng Pháo Hoa (Fireworks Explosion & Sparkles Crackles)
 * Áp dụng cho: 30/4, 2/9, Tết Nguyên Đán, Tết Dương Lịch, Giao Thừa
 */
const playFireworksSound = (ctx, now) => {
  // Phase 1: Tiếng pháo bắn vút lên trời (Whistle Rocket Launch: 0s -> 0.28s)
  const whistleOsc = ctx.createOscillator();
  const whistleGain = ctx.createGain();
  whistleOsc.type = 'triangle';
  whistleOsc.frequency.setValueAtTime(420, now);
  whistleOsc.frequency.exponentialRampToValueAtTime(1650, now + 0.26);

  whistleGain.gain.setValueAtTime(0.02, now);
  whistleGain.gain.linearRampToValueAtTime(0.12, now + 0.22);
  whistleGain.gain.exponentialRampToValueAtTime(0.001, now + 0.28);

  whistleOsc.connect(whistleGain);
  whistleGain.connect(ctx.destination);
  whistleOsc.start(now);
  whistleOsc.stop(now + 0.29);

  // Phase 2: Tiếng NỔ BÙM Vang Dội (Deep Explosive Blast: 0.27s -> 0.9s)
  const boomTime = now + 0.27;

  // Sub-bass rung chuyển lồng ngực (Sine 85Hz -> 30Hz)
  const subOsc = ctx.createOscillator();
  const subGain = ctx.createGain();
  subOsc.type = 'sine';
  subOsc.frequency.setValueAtTime(85, boomTime);
  subOsc.frequency.exponentialRampToValueAtTime(30, boomTime + 0.55);

  subGain.gain.setValueAtTime(0.38, boomTime);
  subGain.gain.exponentialRampToValueAtTime(0.001, boomTime + 0.6);

  subOsc.connect(subGain);
  subGain.connect(ctx.destination);
  subOsc.start(boomTime);
  subOsc.stop(boomTime + 0.62);

  // Lowpass Noise Blast (Sóng xung kích pháo hoa)
  const noiseBuf = createNoiseBuffer(ctx, 0.7);
  const noiseNode = ctx.createBufferSource();
  noiseNode.buffer = noiseBuf;

  const lowpass = ctx.createBiquadFilter();
  lowpass.type = 'lowpass';
  lowpass.frequency.setValueAtTime(950, boomTime);
  lowpass.frequency.exponentialRampToValueAtTime(70, boomTime + 0.65);

  const noiseGain = ctx.createGain();
  noiseGain.gain.setValueAtTime(0.35, boomTime);
  noiseGain.gain.exponentialRampToValueAtTime(0.001, boomTime + 0.68);

  noiseNode.connect(lowpass);
  lowpass.connect(noiseGain);
  noiseGain.connect(ctx.destination);
  noiseNode.start(boomTime);
  noiseNode.stop(boomTime + 0.7);

  // Phase 3: Tiếng pháo tép / hoa lửa nổ lách tách liên hồi (Sparkle Crackles)
  const crackleCount = 14;
  const crackleBuffer = createNoiseBuffer(ctx, 0.05);

  for (let i = 0; i < crackleCount; i++) {
    const crackleTime = boomTime + 0.12 + Math.random() * 1.45;
    const crackleSource = ctx.createBufferSource();
    crackleSource.buffer = crackleBuffer;

    const bpFilter = ctx.createBiquadFilter();
    bpFilter.type = 'bandpass';
    bpFilter.frequency.setValueAtTime(1800 + Math.random() * 2800, crackleTime);
    bpFilter.Q.setValueAtTime(5.5, crackleTime);

    const crkGain = ctx.createGain();
    const crkVolume = 0.04 + Math.random() * 0.1;
    crkGain.gain.setValueAtTime(crkVolume, crackleTime);
    crkGain.gain.exponentialRampToValueAtTime(0.0001, crackleTime + 0.045);

    crackleSource.connect(bpFilter);
    bpFilter.connect(crkGain);
    crkGain.connect(ctx.destination);
    crackleSource.start(crackleTime);
    crackleSource.stop(crackleTime + 0.05);
  }
};

/**
 * 2. Tiếng Chuông Ngân Giáng Sinh (Jingle Bells & Noel Chimes)
 * Áp dụng cho: Giáng Sinh (Noel / Christmas)
 */
const playSingleBell = (ctx, freq, time, duration = 0.75, volume = 0.13) => {
  // Chuông kim loại: Tần số cơ bản + Overtones kim loại (2.76x, 5.4x)
  [1, 2.76, 5.4].forEach((mult, idx) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = idx === 0 ? 'sine' : 'triangle';
    osc.frequency.setValueAtTime(freq * mult, time);

    const vol = volume * (idx === 0 ? 1 : idx === 1 ? 0.38 : 0.16);
    gain.gain.setValueAtTime(vol, time);
    gain.gain.exponentialRampToValueAtTime(0.0001, time + duration / (idx + 1));

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(time);
    osc.stop(time + duration + 0.03);
  });
};

const playChristmasBellsSound = (ctx, now) => {
  // Giai điệu Jingle Bells kinh điển: E - E - E, E - E - E, E - G - C - D - E
  const E5 = 659.25;
  const G5 = 783.99;
  const C5 = 523.25;
  const D5 = 587.33;

  const notes = [
    { freq: E5, t: 0.00, d: 0.45, v: 0.13 },
    { freq: E5, t: 0.18, d: 0.45, v: 0.13 },
    { freq: E5, t: 0.38, d: 0.75, v: 0.16 },
    { freq: E5, t: 0.72, d: 0.45, v: 0.13 },
    { freq: E5, t: 0.90, d: 0.45, v: 0.13 },
    { freq: E5, t: 1.10, d: 0.75, v: 0.16 },
    { freq: E5, t: 1.45, d: 0.4, v: 0.12 },
    { freq: G5, t: 1.65, d: 0.4, v: 0.15 },
    { freq: C5, t: 1.85, d: 0.4, v: 0.13 },
    { freq: D5, t: 2.05, d: 0.4, v: 0.13 },
    { freq: E5, t: 2.25, d: 1.3, v: 0.2 },
  ];

  notes.forEach((n) => {
    playSingleBell(ctx, n.freq, now + n.t, n.d, n.v);
  });
};

/**
 * 3. Tiếng Đàn Hạc & Chuông Gió Thần Tiên (Romantic Harp & Fairy Chimes)
 * Áp dụng cho: 8/3, 20/10 (Ngày Phụ Nữ)
 */
const playRomanticHarpSound = (ctx, now) => {
  // Chuỗi nốt ngũ cung C Major lãng mạn, du dương
  const harpNotes = [
    523.25, // C5
    659.25, // E5
    783.99, // G5
    880.0,  // A5
    1046.5, // C6
    1318.5, // E6
    1567.98,// G6
    2093.0, // C7
  ];

  harpNotes.forEach((freq, idx) => {
    const t = now + idx * 0.085;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, t);

    // Warm overtone
    const osc2 = ctx.createOscillator();
    osc2.type = 'triangle';
    osc2.frequency.setValueAtTime(freq * 2, t);

    const noteVol = 0.09 - idx * 0.005;
    gain.gain.setValueAtTime(0.001, t);
    gain.gain.linearRampToValueAtTime(noteVol, t + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + 1.25);

    osc.connect(gain);
    osc2.connect(gain);
    gain.connect(ctx.destination);

    osc.start(t);
    osc2.start(t);
    osc.stop(t + 1.3);
    osc2.stop(t + 1.3);
  });
};

/**
 * 4. Tiếng Trống Múa Lân & Chũm Chọe (Lion Dance Drum & Cymbal)
 * Áp dụng cho: Tết Trung Thu
 */
const playLionDanceDrumSound = (ctx, now) => {
  // Tiếng "Tùng" (Bass drum da trâu trầm ấm)
  const playTung = (time, vol = 0.32) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(125, time);
    osc.frequency.exponentialRampToValueAtTime(50, time + 0.3);
    gain.gain.setValueAtTime(vol, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + 0.35);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(time);
    osc.stop(time + 0.36);
  };

  // Tiếng "Cắc" (Woodblock rim-shot gõ vành trống)
  const playCac = (time, vol = 0.18) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(1850, time);
    filter.Q.setValueAtTime(5, time);
    osc.type = 'square';
    osc.frequency.setValueAtTime(750, time);
    gain.gain.setValueAtTime(vol, time);
    gain.gain.exponentialRampToValueAtTime(0.0001, time + 0.06);
    osc.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);
    osc.start(time);
    osc.stop(time + 0.07);
  };

  // Tiếng chũm chọe "Xoèng!"
  const playCymbal = (time, vol = 0.1) => {
    const noiseBuf = createNoiseBuffer(ctx, 0.45);
    const noise = ctx.createBufferSource();
    noise.buffer = noiseBuf;
    const filter = ctx.createBiquadFilter();
    filter.type = 'highpass';
    filter.frequency.setValueAtTime(4500, time);
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(vol, time);
    gain.gain.exponentialRampToValueAtTime(0.0001, time + 0.42);
    noise.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);
    noise.start(time);
    noise.stop(time + 0.44);
  };

  // Nhịp điệu trống lân: Tùng... Tùng... Cắc... Tùng... Xoèng!
  playTung(now, 0.34);
  playTung(now + 0.28, 0.32);
  playCac(now + 0.52, 0.2);
  playTung(now + 0.72, 0.36);
  playCymbal(now + 0.95, 0.12);
};

/**
 * 5. Tiếng Bong Bóng Nước & Đồ Chơi Tuổi Thơ (Playful Bubbles & Toy Pop)
 * Áp dụng cho: Quốc Tế Thiếu Nhi 1/6
 */
const playPlayfulBubblesSound = (ctx, now) => {
  const freqs = [320, 480, 600, 750, 920];
  freqs.forEach((baseFreq, i) => {
    const t = now + i * 0.12;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(baseFreq, t);
    osc.frequency.exponentialRampToValueAtTime(baseFreq * 2.2, t + 0.08);

    gain.gain.setValueAtTime(0.12, t);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.085);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(t);
    osc.stop(t + 0.09);
  });
};

/**
 * 6. Tiếng Chuông Trường & Giai Điệu Tri Ân (School Chime)
 * Áp dụng cho: Ngày Nhà Giáo 20/11
 */
const playSchoolChimeSound = (ctx, now) => {
  const notes = [440, 554.37, 659.25, 880];
  notes.forEach((freq, i) => {
    const t = now + i * 0.26;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, t);

    gain.gain.setValueAtTime(0.14, t);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + 1.1);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(t);
    osc.stop(t + 1.15);
  });
};

/**
 * 7. Tiếng Kèn Ăn Mừng & Pháo Giấy Kim Tuyến (Celebration Fanfare & Confetti Pop)
 * Áp dụng cho: Sự kiện tùy biến (Custom) hoặc mặc định
 */
const playCelebrationFanfareSound = (ctx, now) => {
  // Tiếng Confetti Pop "Bụp!"
  const popBuf = createNoiseBuffer(ctx, 0.06);
  const popSrc = ctx.createBufferSource();
  popSrc.buffer = popBuf;
  const popFilter = ctx.createBiquadFilter();
  popFilter.type = 'bandpass';
  popFilter.frequency.setValueAtTime(1400, now);
  const popGain = ctx.createGain();
  popGain.gain.setValueAtTime(0.22, now);
  popGain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);
  popSrc.connect(popFilter);
  popFilter.connect(popGain);
  popGain.connect(ctx.destination);
  popSrc.start(now);
  popSrc.stop(now + 0.06);

  // Hợp âm kèn chúc mừng (Major Triad Fanfare C5 - E5 - G5 - C6)
  [523.25, 659.25, 783.99, 1046.50].forEach((freq, idx) => {
    const t = now + 0.05 + idx * 0.065;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(freq, t);
    gain.gain.setValueAtTime(0.13, t);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.85);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(t);
    osc.stop(t + 0.9);
  });
};

/**
 * Tự động phân tích và xác định loại âm thanh phù hợp nhất dựa trên ID hoặc Tên sự kiện
 */
export const getFestiveSoundType = (eventOrId) => {
  if (!eventOrId) return 'fireworks';
  const id = typeof eventOrId === 'string' ? eventOrId : eventOrId.id || '';
  const name = typeof eventOrId === 'object' ? (eventOrId.name || '').toLowerCase() : id.toLowerCase();

  // 1. Pháo Hoa: 30/4, 2/9, Tết Nguyên Đán, Tết Dương Lịch
  if (
    id === 'giai_phong_30_4' ||
    id === 'quoc_khanh_2_9' ||
    id === 'tet_duong_lich' ||
    id === 'tet_nguyen_dan' ||
    name.includes('30/4') ||
    name.includes('2/9') ||
    name.includes('giải phóng') ||
    name.includes('quốc khánh') ||
    name.includes('tết') ||
    name.includes('pháo hoa') ||
    name.includes('năm mới') ||
    name.includes('new year')
  ) {
    return 'fireworks';
  }

  // 2. Giáng Sinh (Noel): Chuông ngân Jingle Bells
  if (
    id === 'giang_sinh_noel' ||
    name.includes('giáng sinh') ||
    name.includes('noel') ||
    name.includes('christmas')
  ) {
    return 'christmas_bells';
  }

  // 3. Ngày Phụ Nữ: 8/3, 20/10 - Đàn hạc & chuông gió lãng mạn
  if (
    id === 'quoc_te_phu_nu_8_3' ||
    id === 'phu_nu_viet_nam_20_10' ||
    name.includes('8/3') ||
    name.includes('20/10') ||
    name.includes('phụ nữ') ||
    name.includes('women')
  ) {
    return 'romantic_harp';
  }

  // 4. Tết Trung Thu: Trống múa lân rộn ràng
  if (
    id === 'tet_trung_thu' ||
    name.includes('trung thu') ||
    name.includes('trăng rằm') ||
    name.includes('đèn lồng')
  ) {
    return 'lion_dance_drum';
  }

  // 5. Quốc Tế Thiếu Nhi: 1/6 - Bong bóng vui nhộn
  if (
    id === 'quoc_te_thieu_nhi_1_6' ||
    name.includes('thiếu nhi') ||
    name.includes('1/6') ||
    name.includes('trẻ em')
  ) {
    return 'playful_bubbles';
  }

  // 6. Ngày Nhà Giáo: 20/11 - Chuông trường tri ân
  if (
    id === 'nha_giao_viet_nam_20_11' ||
    name.includes('nhà giáo') ||
    name.includes('20/11') ||
    name.includes('thầy cô')
  ) {
    return 'school_chime';
  }

  // Mặc định: Kèn ăn mừng & pháo hoa giấy
  return 'celebration';
};

/**
 * Phát âm thanh tương ứng với sự kiện lễ hội
 * @param {object|string} eventOrId - Object sự kiện hoặc chuỗi ID/tên sự kiện
 */
export const playFestiveEventSound = (eventOrId) => {
  if (!isSoundEnabled()) return;
  const ctx = getAudioContext();
  if (!ctx) return;

  try {
    const soundType = getFestiveSoundType(eventOrId);
    const now = ctx.currentTime;

    switch (soundType) {
      case 'fireworks':
        playFireworksSound(ctx, now);
        break;
      case 'christmas_bells':
        playChristmasBellsSound(ctx, now);
        break;
      case 'romantic_harp':
        playRomanticHarpSound(ctx, now);
        break;
      case 'lion_dance_drum':
        playLionDanceDrumSound(ctx, now);
        break;
      case 'playful_bubbles':
        playPlayfulBubblesSound(ctx, now);
        break;
      case 'school_chime':
        playSchoolChimeSound(ctx, now);
        break;
      case 'celebration':
      default:
        playCelebrationFanfareSound(ctx, now);
        break;
    }
  } catch (err) {
    console.warn('[Audio] Không thể phát âm thanh sự kiện:', err);
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
