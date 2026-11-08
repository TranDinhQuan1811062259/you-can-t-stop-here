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
   Tự động tổng hợp âm thanh đa tầng, hoành tráng, vang vọng 100% bằng Web Audio API
   Không phụ thuộc file ngoài, có Reverb Stadium/Concert Hall ngân vang tự nhiên!
   ========================================================================== */

let spatialReverbBus = null;

/**
 * Tạo không gian vang dội Acoustic Concert Hall / Stadium Reverb
 * Giúp âm thanh lan toả tự nhiên, kéo dài đuôi ngân vang 3.4s, KHÔNG BAO GIỜ BỊ CỤC!
 */
const getSpatialReverbBus = (ctx) => {
  if (spatialReverbBus && spatialReverbBus.context === ctx) {
    return spatialReverbBus;
  }

  try {
    const convolver = ctx.createConvolver();
    const duration = 3.4; // 3.4 giây ngân vang vọng xa
    const sampleRate = ctx.sampleRate;
    const length = Math.floor(sampleRate * duration);
    const impulse = ctx.createBuffer(2, length, sampleRate);
    const left = impulse.getChannelData(0);
    const right = impulse.getChannelData(1);

    for (let i = 0; i < length; i++) {
      const t = i / length;
      const decay = Math.pow(1 - t, 2.2);
      left[i] = (Math.random() * 2 - 1) * decay;
      right[i] = (Math.random() * 2 - 1) * decay;
    }
    convolver.buffer = impulse;

    // Bộ lọc làm ấm tiếng vang (Lowpass 3600Hz) để âm thanh ấm áp, không chói gắt
    const reverbFilter = ctx.createBiquadFilter();
    reverbFilter.type = 'lowpass';
    reverbFilter.frequency.setValueAtTime(3600, ctx.currentTime);

    const wetGain = ctx.createGain();
    wetGain.gain.setValueAtTime(0.46, ctx.currentTime);

    convolver.connect(reverbFilter);
    reverbFilter.connect(wetGain);
    wetGain.connect(ctx.destination);

    spatialReverbBus = { convolver, wetGain, context: ctx };
    return spatialReverbBus;
  } catch (e) {
    return null;
  }
};

/**
 * Định tuyến âm thanh qua cả kênh phát trực tiếp (Dry) và kênh ngân vang Reverb (Wet)
 */
const routeAudio = (ctx, sourceNode, dryGainVal = 0.85, wetGainVal = 0.44) => {
  const dryGain = ctx.createGain();
  dryGain.gain.setValueAtTime(dryGainVal, ctx.currentTime);
  sourceNode.connect(dryGain);
  dryGain.connect(ctx.destination);

  const bus = getSpatialReverbBus(ctx);
  if (bus) {
    const sendGain = ctx.createGain();
    sendGain.gain.setValueAtTime(wetGainVal, ctx.currentTime);
    sourceNode.connect(sendGain);
    sendGain.connect(bus.convolver);
  }
};

/**
 * 1. Tiếng Pháo Hoa Đại Lễ Hoành Tráng (Epic Grand Fireworks Finale)
 * Áp dụng cho: 30/4, 2/9, Tết Nguyên Đán, Tết Dương Lịch
 * Gồm chùm pháo 3 đợt liên hoàn + đại bác tầm cao + mưa sao băng kim tuyến kéo dài 4.2s
 */
const playFireworksSound = (ctx, now) => {
  // Hàm phụ tạo 1 quả pháo phóng vút lên và nổ bùm
  const launchShell = (launchTime, blastDelay, whistleFreqStart, whistleFreqEnd, blastPitch, blastVol, crackleSeed) => {
    // Tiếng rít xé gió vút lên tầng không
    const whistleOsc = ctx.createOscillator();
    const whistleGain = ctx.createGain();
    whistleOsc.type = 'triangle';
    whistleOsc.frequency.setValueAtTime(whistleFreqStart, launchTime);
    whistleOsc.frequency.exponentialRampToValueAtTime(whistleFreqEnd, launchTime + blastDelay * 0.92);

    whistleGain.gain.setValueAtTime(0.015, launchTime);
    whistleGain.gain.linearRampToValueAtTime(0.14, launchTime + blastDelay * 0.75);
    whistleGain.gain.exponentialRampToValueAtTime(0.001, launchTime + blastDelay);

    whistleOsc.connect(whistleGain);
    routeAudio(ctx, whistleGain, 0.7, 0.35);
    whistleOsc.start(launchTime);
    whistleOsc.stop(launchTime + blastDelay + 0.02);

    // Thời điểm phát nổ
    const boomTime = launchTime + blastDelay;

    // Lớp 1: Sub-bass rung chuyển (Sine wave siêu trầm)
    const subOsc = ctx.createOscillator();
    const subGain = ctx.createGain();
    subOsc.type = 'sine';
    subOsc.frequency.setValueAtTime(blastPitch, boomTime);
    subOsc.frequency.exponentialRampToValueAtTime(26, boomTime + 0.65);

    subGain.gain.setValueAtTime(blastVol, boomTime);
    subGain.gain.exponentialRampToValueAtTime(0.001, boomTime + 0.72);

    subOsc.connect(subGain);
    routeAudio(ctx, subGain, 0.9, 0.5);
    subOsc.start(boomTime);
    subOsc.stop(boomTime + 0.75);

    // Lớp 2: Sóng xung kích nổ rền (Lowpass Noise Blast)
    const noiseBuf = createNoiseBuffer(ctx, 0.85);
    const noiseNode = ctx.createBufferSource();
    noiseNode.buffer = noiseBuf;

    const lowpass = ctx.createBiquadFilter();
    lowpass.type = 'lowpass';
    lowpass.frequency.setValueAtTime(1100, boomTime);
    lowpass.frequency.exponentialRampToValueAtTime(65, boomTime + 0.8);

    const noiseGain = ctx.createGain();
    noiseGain.gain.setValueAtTime(blastVol * 0.95, boomTime);
    noiseGain.gain.exponentialRampToValueAtTime(0.001, boomTime + 0.82);

    noiseNode.connect(lowpass);
    lowpass.connect(noiseGain);
    routeAudio(ctx, noiseGain, 0.85, 0.55);
    noiseNode.start(boomTime);
    noiseNode.stop(boomTime + 0.85);

    // Lớp 3: Chùm pháo tép lách tách (Sparkle Crackles)
    const crackleBuffer = createNoiseBuffer(ctx, 0.06);
    const count = crackleSeed || 16;
    for (let i = 0; i < count; i++) {
      const crkTime = boomTime + 0.14 + Math.random() * 1.5;
      const crkSrc = ctx.createBufferSource();
      crkSrc.buffer = crackleBuffer;

      const bpFilter = ctx.createBiquadFilter();
      bpFilter.type = 'bandpass';
      bpFilter.frequency.setValueAtTime(1900 + Math.random() * 3200, crkTime);
      bpFilter.Q.setValueAtTime(6, crkTime);

      const crkGain = ctx.createGain();
      const crkVol = 0.035 + Math.random() * 0.09;
      crkGain.gain.setValueAtTime(crkVol, crkTime);
      crkGain.gain.exponentialRampToValueAtTime(0.0001, crkTime + 0.05);

      crkSrc.connect(bpFilter);
      bpFilter.connect(crkGain);
      routeAudio(ctx, crkGain, 0.8, 0.4);
      crkSrc.start(crkTime);
      crkSrc.stop(crkTime + 0.055);
    }
  };

  // ĐỢT 1 (Launch 1): Mở màn - quả pháo đầu tiên vút lên bầu trời
  launchShell(now, 0.32, 420, 1850, 85, 0.38, 14);

  // ĐỢT 2 (Launch 2 & 3): Chùm pháo đôi bắn dồn dập
  launchShell(now + 0.48, 0.36, 480, 2100, 95, 0.42, 18);
  launchShell(now + 0.72, 0.38, 380, 1950, 80, 0.45, 20);

  // ĐỢT 3 (Grand Climax Finale): Quả pháo đại bác tầm cao bùng nổ cực đại
  const finaleTime = now + 1.25;
  const finaleBoom = finaleTime + 0.45;

  launchShell(finaleTime, 0.45, 320, 2400, 68, 0.55, 32);

  // Tiếng rền sấm sét hậu chấn của đại pháo hoa
  const rumbleBuf = createNoiseBuffer(ctx, 1.8);
  const rumbleNode = ctx.createBufferSource();
  rumbleNode.buffer = rumbleBuf;
  const rumbleFilter = ctx.createBiquadFilter();
  rumbleFilter.type = 'lowpass';
  rumbleFilter.frequency.setValueAtTime(260, finaleBoom);
  rumbleFilter.frequency.exponentialRampToValueAtTime(45, finaleBoom + 1.6);
  const rumbleGain = ctx.createGain();
  rumbleGain.gain.setValueAtTime(0.28, finaleBoom);
  rumbleGain.gain.exponentialRampToValueAtTime(0.001, finaleBoom + 1.7);
  rumbleNode.connect(rumbleFilter);
  rumbleFilter.connect(rumbleGain);
  routeAudio(ctx, rumbleGain, 0.6, 0.65);
  rumbleNode.start(finaleBoom);
  rumbleNode.stop(finaleBoom + 1.8);

  // Lớp hợp âm vinh quang (Majestic Celebration Chord C4 - G4 - C5) ngân dài 4.2s
  [261.63, 392.00, 523.25, 659.25].forEach((freq) => {
    const chordOsc = ctx.createOscillator();
    const chordGain = ctx.createGain();
    chordOsc.type = 'sine';
    chordOsc.frequency.setValueAtTime(freq, finaleBoom);
    chordGain.gain.setValueAtTime(0.001, finaleBoom);
    chordGain.gain.linearRampToValueAtTime(0.065, finaleBoom + 0.25);
    chordGain.gain.exponentialRampToValueAtTime(0.0001, finaleBoom + 2.5);
    chordOsc.connect(chordGain);
    routeAudio(ctx, chordGain, 0.5, 0.7);
    chordOsc.start(finaleBoom);
    chordOsc.stop(finaleBoom + 2.6);
  });
};

/**
 * 2. Tiếng Chuông Ngân Giáng Sinh Diệu Kỳ (Grand Orchestral Christmas Bells)
 * Áp dụng cho: Giáng Sinh (Noel / Christmas)
 * Chuông đồng nhà thờ ngân vang qua Reverb + Chuông lắc tuần lộc rộn rã
 */
const playSingleBell = (ctx, freq, time, duration = 1.6, volume = 0.16) => {
  // Dàn hài âm chuông kim loại chuẩn Carillon (1x, 2.76x, 4.07x, 5.4x)
  [1, 2.76, 4.07, 5.4].forEach((mult, idx) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = idx === 0 ? 'sine' : 'triangle';
    osc.frequency.setValueAtTime(freq * mult, time);

    const vol = volume * (idx === 0 ? 1 : idx === 1 ? 0.42 : idx === 2 ? 0.22 : 0.12);
    gain.gain.setValueAtTime(vol, time);
    // Độ ngân vang tự nhiên kéo dài, không bị cục
    gain.gain.exponentialRampToValueAtTime(0.0001, time + duration / (idx * 0.4 + 1));

    osc.connect(gain);
    routeAudio(ctx, gain, 0.85, 0.55);
    osc.start(time);
    osc.stop(time + duration + 0.05);
  });
};

const playChristmasBellsSound = (ctx, now) => {
  const E5 = 659.25;
  const G5 = 783.99;
  const C5 = 523.25;
  const D5 = 587.33;

  const notes = [
    { freq: E5, t: 0.00, d: 0.9, v: 0.16 },
    { freq: E5, t: 0.22, d: 0.9, v: 0.16 },
    { freq: E5, t: 0.46, d: 1.4, v: 0.20 },
    { freq: E5, t: 0.88, d: 0.9, v: 0.16 },
    { freq: E5, t: 1.10, d: 0.9, v: 0.16 },
    { freq: E5, t: 1.35, d: 1.4, v: 0.20 },
    { freq: E5, t: 1.76, d: 0.85, v: 0.15 },
    { freq: G5, t: 1.98, d: 0.95, v: 0.18 },
    { freq: C5, t: 2.22, d: 0.95, v: 0.16 },
    { freq: D5, t: 2.45, d: 0.95, v: 0.16 },
    { freq: E5, t: 2.70, d: 2.4, v: 0.24 }, // Nốt ngân cuối bài ngân dài 2.4s rực rỡ
  ];

  notes.forEach((n) => {
    playSingleBell(ctx, n.freq, now + n.t, n.d, n.v);
  });

  // Tiếng lắc chuông xe trượt tuyết tuần lộc (Sleigh Bells Shimmer)
  const sleighCount = 10;
  for (let i = 0; i < sleighCount; i++) {
    const t = now + i * 0.28;
    const noiseBuf = createNoiseBuffer(ctx, 0.08);
    const noise = ctx.createBufferSource();
    noise.buffer = noiseBuf;
    const filter = ctx.createBiquadFilter();
    filter.type = 'highpass';
    filter.frequency.setValueAtTime(6200, t);
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.045, t);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.08);
    noise.connect(filter);
    filter.connect(gain);
    routeAudio(ctx, gain, 0.7, 0.4);
    noise.start(t);
    noise.stop(t + 0.085);
  }
};

/**
 * 3. Tiếng Đàn Hạc Thần Tiên & Chuông Gió Lộng Lẫy (Celestial Harp & Crystal Chimes)
 * Áp dụng cho: 8/3, 20/10 (Ngày Phụ Nữ)
 * Cung đàn hạc lướt sóng đôi 14 nốt + Chuông gió pha lê ngân nga
 */
const playRomanticHarpSound = (ctx, now) => {
  // Chuỗi nốt hạc lướt từ thấp lên cao rồi rót xuống lãng mạn
  const harpNotes = [
    { freq: 261.63, t: 0.00 }, // C4
    { freq: 329.63, t: 0.07 }, // E4
    { freq: 392.00, t: 0.14 }, // G4
    { freq: 440.00, t: 0.21 }, // A4
    { freq: 523.25, t: 0.28 }, // C5
    { freq: 659.25, t: 0.35 }, // E5
    { freq: 783.99, t: 0.42 }, // G5
    { freq: 880.00, t: 0.49 }, // A5
    { freq: 1046.5, t: 0.58 }, // C6
    { freq: 1318.5, t: 0.68 }, // E6
    { freq: 1567.9, t: 0.80 }, // G6
    { freq: 1046.5, t: 0.98 }, // C6 (rót xuống)
    { freq: 783.99, t: 1.15 }, // G5
    { freq: 523.25, t: 1.35 }, // C5 (ngân dài như suối ngọc)
  ];

  harpNotes.forEach((n, idx) => {
    const t = now + n.t;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(n.freq, t);

    // Warm Overtone
    const osc2 = ctx.createOscillator();
    osc2.type = 'triangle';
    osc2.frequency.setValueAtTime(n.freq * 2, t);

    const noteVol = idx === harpNotes.length - 1 ? 0.14 : 0.09;
    const duration = idx === harpNotes.length - 1 ? 2.6 : 1.8;

    gain.gain.setValueAtTime(0.001, t);
    gain.gain.linearRampToValueAtTime(noteVol, t + 0.025);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + duration);

    osc.connect(gain);
    osc2.connect(gain);
    routeAudio(ctx, gain, 0.8, 0.6);

    osc.start(t);
    osc2.start(t);
    osc.stop(t + duration + 0.05);
    osc2.stop(t + duration + 0.05);
  });

  // Hạt bụi tiên sa pha lê (Crystal Fairy Chimes)
  [1760, 2093, 2637, 3135].forEach((freq, i) => {
    const ct = now + 0.5 + i * 0.18;
    const chOsc = ctx.createOscillator();
    const chGain = ctx.createGain();
    chOsc.type = 'sine';
    chOsc.frequency.setValueAtTime(freq, ct);
    chGain.gain.setValueAtTime(0.035, ct);
    chGain.gain.exponentialRampToValueAtTime(0.0001, ct + 1.2);
    chOsc.connect(chGain);
    routeAudio(ctx, chGain, 0.6, 0.6);
    chOsc.start(ct);
    chOsc.stop(ct + 1.25);
  });
};

/**
 * 4. Tiếng Trống Múa Lân & Chũm Chọe Lễ Hội Tưng Bừng (Grand Lion Dance Drumroll)
 * Áp dụng cho: Tết Trung Thu
 * Hồi trống múa lân hoàn chỉnh 3.4s: Mở đầu -> Trống dồn nhịp dồn dập -> Vành trống cắc -> Đại trống cao trào & Chũm chọe đồng
 */
const playLionDanceDrumSound = (ctx, now) => {
  // Tiếng "Tùng" (Đại cổ da trâu vang trầm hùng tráng)
  const playTung = (time, vol = 0.42, pitch = 135) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(pitch, time);
    osc.frequency.exponentialRampToValueAtTime(42, time + 0.42);

    gain.gain.setValueAtTime(vol, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + 0.5);

    osc.connect(gain);
    routeAudio(ctx, gain, 0.9, 0.45);
    osc.start(time);
    osc.stop(time + 0.52);
  };

  // Tiếng "Cắc" (Gõ vành trống giòn giã)
  const playCac = (time, vol = 0.22) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(1950, time);
    filter.Q.setValueAtTime(6, time);

    osc.type = 'square';
    osc.frequency.setValueAtTime(820, time);
    gain.gain.setValueAtTime(vol, time);
    gain.gain.exponentialRampToValueAtTime(0.0001, time + 0.075);

    osc.connect(filter);
    filter.connect(gain);
    routeAudio(ctx, gain, 0.85, 0.35);
    osc.start(time);
    osc.stop(time + 0.08);
  };

  // Tiếng Chũm chọe đồng "Xoèng...!" ngân vang
  const playCymbal = (time, vol = 0.18, duration = 1.4) => {
    const noiseBuf = createNoiseBuffer(ctx, duration);
    const noise = ctx.createBufferSource();
    noise.buffer = noiseBuf;

    const filter = ctx.createBiquadFilter();
    filter.type = 'highpass';
    filter.frequency.setValueAtTime(4200, time);

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(vol, time);
    gain.gain.exponentialRampToValueAtTime(0.0001, time + duration);

    noise.connect(filter);
    filter.connect(gain);
    routeAudio(ctx, gain, 0.8, 0.55);
    noise.start(time);
    noise.stop(time + duration + 0.05);
  };

  // 1. Mở màn dạo nhịp
  playTung(now, 0.44, 140);
  playCac(now + 0.28, 0.24);
  playTung(now + 0.52, 0.42, 135);

  // 2. Hồi trống dồn dập (Lion Dance Drumroll tăng tốc)
  const rollTimes = [0.82, 0.98, 1.14, 1.30, 1.45, 1.60];
  rollTimes.forEach((t, i) => {
    playTung(now + t, 0.32 + i * 0.025, 145 + i * 4);
  });

  // 3. Vành trống gõ cắc giòn tan
  playCac(now + 1.76, 0.25);
  playCac(now + 1.90, 0.26);

  // 4. Đại trống cao trào & Chũm chọe đồng vang dội
  playTung(now + 2.08, 0.52, 130);
  playCymbal(now + 2.08, 0.22, 1.5);

  playTung(now + 2.40, 0.55, 125);

  playTung(now + 2.72, 0.62, 120);
  playCymbal(now + 2.72, 0.28, 2.0); // Chũm chọe kết bài ngân dài 2.0s
};

/**
 * 5. Tiếng Bong Bóng Nước & Đồ Chơi Tuổi Thơ (Playful Bubbles & Joyful Pops)
 * Áp dụng cho: Quốc Tế Thiếu Nhi 1/6
 */
const playPlayfulBubblesSound = (ctx, now) => {
  const freqs = [320, 480, 620, 780, 960, 1180, 1420];
  freqs.forEach((baseFreq, i) => {
    const t = now + i * 0.11;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(baseFreq, t);
    osc.frequency.exponentialRampToValueAtTime(baseFreq * 2.4, t + 0.1);

    gain.gain.setValueAtTime(0.14, t);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.11);

    osc.connect(gain);
    routeAudio(ctx, gain, 0.85, 0.45);
    osc.start(t);
    osc.stop(t + 0.12);
  });
};

/**
 * 6. Tiếng Chuông Trường & Giai Điệu Tri Ân (Grand School Chime & Bells)
 * Áp dụng cho: Ngày Nhà Giáo 20/11
 */
const playSchoolChimeSound = (ctx, now) => {
  const notes = [
    { freq: 440.00, t: 0.00 },
    { freq: 554.37, t: 0.32 },
    { freq: 659.25, t: 0.64 },
    { freq: 880.00, t: 1.00 },
  ];
  notes.forEach((n, i) => {
    const t = now + n.t;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(n.freq, t);

    const dur = i === notes.length - 1 ? 2.4 : 1.6;
    gain.gain.setValueAtTime(0.16, t);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + dur);

    osc.connect(gain);
    routeAudio(ctx, gain, 0.8, 0.6);
    osc.start(t);
    osc.stop(t + dur + 0.05);
  });
};

/**
 * 7. Tiếng Kèn Khải Hoàn & Pháo Giấy Kim Tuyến (Triumphant Celebration Fanfare)
 * Áp dụng cho: Sự kiện tùy biến (Custom) hoặc chúc mừng
 */
const playCelebrationFanfareSound = (ctx, now) => {
  // Tiếng Pháo Giấy Kim Tuyến "BỤP!"
  const popBuf = createNoiseBuffer(ctx, 0.08);
  const popSrc = ctx.createBufferSource();
  popSrc.buffer = popBuf;
  const popFilter = ctx.createBiquadFilter();
  popFilter.type = 'bandpass';
  popFilter.frequency.setValueAtTime(1350, now);
  const popGain = ctx.createGain();
  popGain.gain.setValueAtTime(0.32, now);
  popGain.gain.exponentialRampToValueAtTime(0.001, now + 0.075);
  popSrc.connect(popFilter);
  popFilter.connect(popGain);
  routeAudio(ctx, popGain, 0.85, 0.45);
  popSrc.start(now);
  popSrc.stop(now + 0.08);

  // Hợp âm kèn đồng Major Triad Fanfare (Trumpets & Horns) ngân vang 3.2s
  const brassNotes = [
    { freq: 261.63, t: 0.06 }, // C4
    { freq: 392.00, t: 0.14 }, // G4
    { freq: 523.25, t: 0.22 }, // C5
    { freq: 659.25, t: 0.30 }, // E5
    { freq: 783.99, t: 0.40 }, // G5
    { freq: 1046.5, t: 0.52 }, // C6 (đỉnh cao trào ngân dài 2.5s)
  ];

  brassNotes.forEach((n, idx) => {
    const t = now + n.t;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(n.freq, t);

    const dur = idx === brassNotes.length - 1 ? 2.5 : 1.2;
    const vol = idx === brassNotes.length - 1 ? 0.22 : 0.14;

    gain.gain.setValueAtTime(0.001, t);
    gain.gain.linearRampToValueAtTime(vol, t + 0.03);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + dur);

    osc.connect(gain);
    routeAudio(ctx, gain, 0.8, 0.6);
    osc.start(t);
    osc.stop(t + dur + 0.05);
  });
};

/**
 * 7. Tiếng Gió Rít & Đàn Organ Ma Mị Đêm Halloween (Spooky Organ & Ghostly Wind)
 */
const playHalloweenSpookySound = (ctx, now) => {
  // A. Hợp âm đàn Organ ma quái (D minor / D - F - A - C#)
  const spookyNotes = [
    { freq: 293.66, t: 0.00, dur: 2.8, vol: 0.16 }, // D4
    { freq: 349.23, t: 0.15, dur: 2.6, vol: 0.14 }, // F4
    { freq: 440.00, t: 0.30, dur: 2.4, vol: 0.15 }, // A4
    { freq: 554.37, t: 0.45, dur: 2.5, vol: 0.18 }, // C#5 (âm hưởng rùng rợn bí ẩn)
  ];

  spookyNotes.forEach((n) => {
    const t = now + n.t;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(n.freq, t);
    // Rung tần số nhẹ (vibrato) tạo cảm giác ma quái rùng mình
    osc.frequency.linearRampToValueAtTime(n.freq + 4, t + n.dur * 0.5);
    osc.frequency.linearRampToValueAtTime(n.freq - 3, t + n.dur);

    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(1100, t);
    filter.frequency.exponentialRampToValueAtTime(450, t + n.dur);

    gain.gain.setValueAtTime(0.001, t);
    gain.gain.linearRampToValueAtTime(n.vol, t + 0.12);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + n.dur);

    osc.connect(filter);
    filter.connect(gain);
    routeAudio(ctx, gain, 0.7, 0.75); // Reverb sâu hun hút
    osc.start(t);
    osc.stop(t + n.dur + 0.05);
  });

  // B. Tiếng gió rít hú rờn rợn
  const windBuf = createNoiseBuffer(ctx, 2.2);
  const windSource = ctx.createBufferSource();
  windSource.buffer = windBuf;
  const windFilter = ctx.createBiquadFilter();
  windFilter.type = 'bandpass';
  windFilter.frequency.setValueAtTime(320, now);
  windFilter.frequency.exponentialRampToValueAtTime(750, now + 0.9);
  windFilter.frequency.exponentialRampToValueAtTime(220, now + 2.0);
  windFilter.Q.setValueAtTime(4.5, now);

  const windGain = ctx.createGain();
  windGain.gain.setValueAtTime(0.01, now);
  windGain.gain.linearRampToValueAtTime(0.08, now + 0.7);
  windGain.gain.exponentialRampToValueAtTime(0.0001, now + 2.1);

  windSource.connect(windFilter);
  windFilter.connect(windGain);
  routeAudio(ctx, windGain, 0.6, 0.8);
  windSource.start(now);
  windSource.stop(now + 2.2);
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

  // 7. Lễ Hội Halloween: Âm hưởng đàn organ ma mị & tiếng gió rít bí ẩn
  if (
    id === 'le_hoi_halloween' ||
    id?.includes('halloween') ||
    name.includes('halloween') ||
    name.includes('ma quái')
  ) {
    return 'halloween_spooky';
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
      case 'halloween_spooky':
        playHalloweenSpookySound(ctx, now);
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
 * Phát âm thanh xé giấy / máy cắt vụn tài liệu (Paper Shredder & Catharsis Sound)
 */
export const playPaperShredSound = () => {
  if (!isSoundEnabled()) return;
  const ctx = getAudioContext();
  if (!ctx) return;

  try {
    const now = ctx.currentTime;
    const duration = 1.4;

    // 1. Tiếng ồn rách giấy (Noise với Filter biến thiên)
    const noiseBuffer = createNoiseBuffer(ctx, duration);
    const noiseSource = ctx.createBufferSource();
    noiseSource.buffer = noiseBuffer;

    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(1200, now);
    filter.frequency.linearRampToValueAtTime(2400, now + 0.4);
    filter.frequency.linearRampToValueAtTime(800, now + duration);
    filter.Q.setValueAtTime(2.2, now);

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.01, now);
    gain.gain.linearRampToValueAtTime(0.12, now + 0.08);
    gain.gain.setValueAtTime(0.1, now + 0.9);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);

    noiseSource.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);

    noiseSource.start(now);
    noiseSource.stop(now + duration);

    // 2. Tiếng mô tơ máy xé giấy cơ học rung nhẹ
    const motor = ctx.createOscillator();
    const motorGain = ctx.createGain();
    motor.type = 'sawtooth';
    motor.frequency.setValueAtTime(75, now);
    motor.frequency.linearRampToValueAtTime(60, now + duration);

    motorGain.gain.setValueAtTime(0.02, now);
    motorGain.gain.exponentialRampToValueAtTime(0.0001, now + duration);

    motor.connect(motorGain);
    motorGain.connect(ctx.destination);

    motor.start(now);
    motor.stop(now + duration);
  } catch (err) {}
};

/**
 * Phát âm thanh chuông xoay Tây Tạng / Chuông chánh niệm (Singing Bowl / Zen Chime)
 * Dành cho bài tập thở 4-7-8 và Nghi thức tan ca
 */
export const playSingingBowlSound = () => {
  if (!isSoundEnabled()) return;
  const ctx = getAudioContext();
  if (!ctx) return;

  try {
    const now = ctx.currentTime;
    const duration = 3.5;

    // Tần số chữa lành 432Hz & bồi âm 864Hz
    [432, 864, 1296].forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now);

      const initialVol = idx === 0 ? 0.08 : idx === 1 ? 0.035 : 0.015;
      gain.gain.setValueAtTime(initialVol, now);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + duration);
    });
  } catch (err) {}
};

/**
 * Phát âm thanh ấm áp, lung linh khi gửi cái ôm / tách trà ẩn danh (Warmth Sparkle)
 */
export const playWarmthSound = () => {
  if (!isSoundEnabled()) return;
  const ctx = getAudioContext();
  if (!ctx) return;

  try {
    const now = ctx.currentTime;
    const notes = [523.25, 659.25, 783.99, 1046.5]; // C5, E5, G5, C6 arpeggio

    notes.forEach((freq, idx) => {
      const startTime = now + idx * 0.07;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, startTime);

      gain.gain.setValueAtTime(0.06, startTime);
      gain.gain.exponentialRampToValueAtTime(0.0001, startTime + 0.6);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(startTime);
      osc.stop(startTime + 0.65);
    });
  } catch (err) {}
};

// =========================================================================
// 8. HỆ THỐNG ÂM THANH ĐẶC TRƯNG MÙA MÀNG & SỰ KIỆN KHI CHUYỂN TRANG
// =========================================================================

/**
 * Mùa Xuân: Tiếng chim hót líu lo ríu rít + làn gió xuân ấm áp
 */
export const playSpringTransitionSound = () => {
  if (!isSoundEnabled()) return;
  const ctx = getAudioContext();
  if (!ctx) return;

  try {
    const now = ctx.currentTime;

    // Tiếng chim hót 3 nhịp líu lo trong trẻo
    const playChirp = (startTime, startFreq, endFreq, duration = 0.1) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(startFreq, startTime);
      osc.frequency.exponentialRampToValueAtTime(endFreq, startTime + duration * 0.5);
      osc.frequency.exponentialRampToValueAtTime(startFreq * 0.9, startTime + duration);

      gain.gain.setValueAtTime(0.001, startTime);
      gain.gain.linearRampToValueAtTime(0.055, startTime + duration * 0.3);
      gain.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);

      osc.connect(gain);
      routeAudio(ctx, gain, 0.8, 0.45);
      osc.start(startTime);
      osc.stop(startTime + duration + 0.05);
    };

    playChirp(now, 2600, 3600, 0.09);
    playChirp(now + 0.11, 2900, 4200, 0.12);
    playChirp(now + 0.25, 2400, 3800, 0.14);

    // Gió xuân nhẹ nhàng thoáng qua
    const noise = ctx.createBufferSource();
    noise.buffer = createNoiseBuffer(ctx, 0.6);
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(650, now);
    const windGain = ctx.createGain();
    windGain.gain.setValueAtTime(0.001, now);
    windGain.gain.linearRampToValueAtTime(0.045, now + 0.2);
    windGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.58);

    noise.connect(filter);
    filter.connect(windGain);
    routeAudio(ctx, windGain, 0.6, 0.3);
    noise.start(now);
    noise.stop(now + 0.6);
  } catch (e) {}
};

/**
 * Mùa Hạ: Tiếng giẫm cỏ thiên nhiên + ánh sáng chiếu nhẹ / tiếng Thiên Đàng ngân nga
 */
export const playSummerTransitionSound = () => {
  if (!isSoundEnabled()) return;
  const ctx = getAudioContext();
  if (!ctx) return;

  try {
    const now = ctx.currentTime;

    // 1. Tiếng Thiên Đàng ánh sáng chiếu rọi: Dàn chuông pha lê ngân nga (Celestial Chimes)
    const heavenlyNotes = [1046.50, 1318.51, 1567.98, 1975.53, 2093.00]; // C6, E6, G6, B6, C7
    heavenlyNotes.forEach((freq, idx) => {
      const noteTime = now + idx * 0.07;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, noteTime);

      gain.gain.setValueAtTime(0.001, noteTime);
      gain.gain.linearRampToValueAtTime(0.045, noteTime + 0.03);
      gain.gain.exponentialRampToValueAtTime(0.0001, noteTime + 1.4);

      osc.connect(gain);
      routeAudio(ctx, gain, 0.7, 0.6); // Reverb sâu lắng như nhà thờ/thiên đàng
      osc.start(noteTime);
      osc.stop(noteTime + 1.45);
    });

    // 2. Tiếng giẫm cỏ xào xạc dưới chân (Grass rustle steps)
    const grassNoise = ctx.createBufferSource();
    grassNoise.buffer = createNoiseBuffer(ctx, 0.4);
    const bandpass = ctx.createBiquadFilter();
    bandpass.type = 'bandpass';
    bandpass.frequency.setValueAtTime(1400, now);
    bandpass.Q.setValueAtTime(2.0, now);

    const stepGain = ctx.createGain();
    stepGain.gain.setValueAtTime(0.001, now);
    stepGain.gain.linearRampToValueAtTime(0.05, now + 0.08);
    stepGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.38);

    grassNoise.connect(bandpass);
    bandpass.connect(stepGain);
    routeAudio(ctx, stepGain, 0.7, 0.25);
    grassNoise.start(now);
    grassNoise.stop(now + 0.4);
  } catch (e) {}
};

/**
 * Mùa Thu: Tiếng lá rơi xào xạc theo làn gió cuốn
 */
export const playAutumnTransitionSound = () => {
  if (!isSoundEnabled()) return;
  const ctx = getAudioContext();
  if (!ctx) return;

  try {
    const now = ctx.currentTime;

    // Cơn gió cuốn một đợt lá khô xào xạc (Dual Bandpass Flutter)
    const noise = ctx.createBufferSource();
    noise.buffer = createNoiseBuffer(ctx, 0.75);

    const bp1 = ctx.createBiquadFilter();
    bp1.type = 'bandpass';
    bp1.frequency.setValueAtTime(1600, now);
    bp1.frequency.linearRampToValueAtTime(2200, now + 0.4);
    bp1.frequency.linearRampToValueAtTime(1200, now + 0.7);
    bp1.Q.setValueAtTime(2.2, now);

    // LFO mô phỏng tiếng lá cọ xát xào xạc
    const flutterLfo = ctx.createOscillator();
    const flutterGain = ctx.createGain();
    flutterLfo.frequency.setValueAtTime(14, now); // 14Hz xào xạc
    flutterGain.gain.setValueAtTime(0.03, now);
    flutterLfo.connect(flutterGain.gain);

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.001, now);
    gain.gain.linearRampToValueAtTime(0.075, now + 0.2);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.72);

    noise.connect(bp1);
    bp1.connect(gain);
    gain.connect(flutterGain);
    routeAudio(ctx, flutterGain, 0.8, 0.35);

    noise.start(now);
    flutterLfo.start(now);
    noise.stop(now + 0.75);
    flutterLfo.stop(now + 0.75);
  } catch (e) {}
};

/**
 * Mùa Đông: Tiếng gió bấc rít từng cơn lạnh buốt + tiếng chuông băng giá
 */
export const playWinterTransitionSound = () => {
  if (!isSoundEnabled()) return;
  const ctx = getAudioContext();
  if (!ctx) return;

  try {
    const now = ctx.currentTime;

    // Gió rít qua khe cửa vù vù (Whistling cold wind sweep)
    const noise = ctx.createBufferSource();
    noise.buffer = createNoiseBuffer(ctx, 0.8);

    const bp = ctx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.setValueAtTime(320, now);
    bp.frequency.exponentialRampToValueAtTime(680, now + 0.35);
    bp.frequency.exponentialRampToValueAtTime(280, now + 0.75);
    bp.Q.setValueAtTime(4.2, now);

    const windGain = ctx.createGain();
    windGain.gain.setValueAtTime(0.001, now);
    windGain.gain.linearRampToValueAtTime(0.12, now + 0.3);
    windGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.78);

    noise.connect(bp);
    bp.connect(windGain);
    routeAudio(ctx, windGain, 0.75, 0.45);
    noise.start(now);
    noise.stop(now + 0.8);

    // Chuông băng giá pha lê tuyết
    const iceOsc = ctx.createOscillator();
    const iceGain = ctx.createGain();
    iceOsc.type = 'sine';
    iceOsc.frequency.setValueAtTime(3135.96, now + 0.15); // G7
    iceGain.gain.setValueAtTime(0.025, now + 0.15);
    iceGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.75);
    iceOsc.connect(iceGain);
    routeAudio(ctx, iceGain, 0.5, 0.5);
    iceOsc.start(now + 0.15);
    iceOsc.stop(now + 0.8);
  } catch (e) {}
};

/**
 * Giáng Sinh: Tiếng "Hô Hô Hô" của Ông Già Noel + Tiếng chuông Jingle Bells
 */
export const playSantaHoHoSound = () => {
  if (!isSoundEnabled()) return;
  const ctx = getAudioContext();
  if (!ctx) return;

  try {
    const now = ctx.currentTime;

    // Giọng nói tổng hợp Formant trầm ấm "Hô! Hô! Hô!"
    const playSingleHo = (startTime, pitch = 135) => {
      // Nguồn âm thanh thanh quản
      const vocalOsc = ctx.createOscillator();
      vocalOsc.type = 'sawtooth';
      vocalOsc.frequency.setValueAtTime(pitch, startTime);
      vocalOsc.frequency.exponentialRampToValueAtTime(pitch * 0.85, startTime + 0.18);

      // Formant bộ lọc tạo âm "Ô" (F1 = 480Hz, F2 = 850Hz)
      const f1 = ctx.createBiquadFilter();
      f1.type = 'bandpass';
      f1.frequency.setValueAtTime(480, startTime);
      f1.Q.setValueAtTime(4.0, startTime);

      const f2 = ctx.createBiquadFilter();
      f2.type = 'bandpass';
      f2.frequency.setValueAtTime(850, startTime);
      f2.Q.setValueAtTime(3.5, startTime);

      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0.001, startTime);
      gain.gain.linearRampToValueAtTime(0.12, startTime + 0.03);
      gain.gain.exponentialRampToValueAtTime(0.0001, startTime + 0.2);

      vocalOsc.connect(f1);
      vocalOsc.connect(f2);
      f1.connect(gain);
      f2.connect(gain);
      routeAudio(ctx, gain, 0.85, 0.4);

      vocalOsc.start(startTime);
      vocalOsc.stop(startTime + 0.22);
    };

    // 3 tiếng HÔ rền vang: HÔ!... HÔ!... HÔ!
    playSingleHo(now, 145);
    playSingleHo(now + 0.22, 138);
    playSingleHo(now + 0.44, 128);

    // Kèm theo tiếng chuông tuần lộc lắc vui nhộn
    const bellNotes = [2637.02, 3135.96, 3951.07]; // E7, G7, B7
    bellNotes.forEach((freq, idx) => {
      const bTime = now + 0.05 + idx * 0.16;
      const bOsc = ctx.createOscillator();
      const bGain = ctx.createGain();
      bOsc.type = 'sine';
      bOsc.frequency.setValueAtTime(freq, bTime);
      bGain.gain.setValueAtTime(0.045, bTime);
      bGain.gain.exponentialRampToValueAtTime(0.0001, bTime + 0.35);
      bOsc.connect(bGain);
      routeAudio(ctx, bGain, 0.6, 0.5);
      bOsc.start(bTime);
      bOsc.stop(bTime + 0.4);
    });
  } catch (e) {}
};

/**
 * 30/4: Tiếng xe tăng gầm rú & tiếng hút vào tường / logo trang
 */
export const playTank304TransitionSound = () => {
  if (!isSoundEnabled()) return;
  const ctx = getAudioContext();
  if (!ctx) return;

  try {
    const now = ctx.currentTime;

    // 1. Tiếng động cơ xe tăng rầm rập (Heavy diesel rumble)
    const engineOsc = ctx.createOscillator();
    engineOsc.type = 'triangle';
    engineOsc.frequency.setValueAtTime(52, now);
    engineOsc.frequency.linearRampToValueAtTime(78, now + 0.45); // Tăng tốc xông pha
    engineOsc.frequency.exponentialRampToValueAtTime(180, now + 0.65); // Hút vào tường

    const engineGain = ctx.createGain();
    engineGain.gain.setValueAtTime(0.05, now);
    engineGain.gain.linearRampToValueAtTime(0.14, now + 0.35);
    engineGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.72);

    engineOsc.connect(engineGain);
    routeAudio(ctx, engineGain, 0.85, 0.35);
    engineOsc.start(now);
    engineOsc.stop(now + 0.75);

    // 2. Tiếng xích xe tăng nghiến rầm rập (Caterpillar metal treads)
    const trackNoise = ctx.createBufferSource();
    trackNoise.buffer = createNoiseBuffer(ctx, 0.6);
    const trackFilter = ctx.createBiquadFilter();
    trackFilter.type = 'bandpass';
    trackFilter.frequency.setValueAtTime(950, now);
    trackFilter.Q.setValueAtTime(2.0, now);
    const trackGain = ctx.createGain();
    trackGain.gain.setValueAtTime(0.04, now);
    trackGain.gain.linearRampToValueAtTime(0.09, now + 0.3);
    trackGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.6);

    trackNoise.connect(trackFilter);
    trackFilter.connect(trackGain);
    routeAudio(ctx, trackGain, 0.7, 0.25);
    trackNoise.start(now);
    trackNoise.stop(now + 0.62);

    // 3. Tiếng hút vào tường / Title trang (Suction whoosh vortex + Golden impact chime)
    const vortexOsc = ctx.createOscillator();
    vortexOsc.type = 'sine';
    vortexOsc.frequency.setValueAtTime(140, now + 0.3);
    vortexOsc.frequency.exponentialRampToValueAtTime(880, now + 0.65); // Tần số hút vút lên

    const vortexGain = ctx.createGain();
    vortexGain.gain.setValueAtTime(0.001, now + 0.3);
    vortexGain.gain.linearRampToValueAtTime(0.11, now + 0.58);
    vortexGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.68);

    vortexOsc.connect(vortexGain);
    routeAudio(ctx, vortexGain, 0.8, 0.5);
    vortexOsc.start(now + 0.3);
    vortexOsc.stop(now + 0.7);

    // Tiếng ngân vang khải hoàn khi hút trúng title (523Hz C5)
    const victoryChime = ctx.createOscillator();
    const chimeGain = ctx.createGain();
    victoryChime.type = 'triangle';
    victoryChime.frequency.setValueAtTime(523.25, now + 0.6);
    chimeGain.gain.setValueAtTime(0.08, now + 0.6);
    chimeGain.gain.exponentialRampToValueAtTime(0.0001, now + 1.2);
    victoryChime.connect(chimeGain);
    routeAudio(ctx, chimeGain, 0.7, 0.6);
    victoryChime.start(now + 0.6);
    victoryChime.stop(now + 1.25);
  } catch (e) {}
};

/**
 * 2/9: Tiếng Hào Hùng Vinh Quang (Triumphant Victory Fanfare & Timpani Roll)
 */
export const playNationalDay29TransitionSound = () => {
  if (!isSoundEnabled()) return;
  const ctx = getAudioContext();
  if (!ctx) return;

  try {
    const now = ctx.currentTime;

    // Kèn đồng chiến thắng rộn rã (Brass Fanfare Chords)
    const brassNotes = [466.16, 587.33, 698.46, 932.33]; // Bb4, D5, F5, Bb5
    brassNotes.forEach((freq, idx) => {
      const bTime = now + idx * 0.05;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(freq, bTime);

      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(1800, bTime);

      gain.gain.setValueAtTime(0.001, bTime);
      gain.gain.linearRampToValueAtTime(0.065, bTime + 0.04);
      gain.gain.exponentialRampToValueAtTime(0.0001, bTime + 0.85);

      osc.connect(filter);
      filter.connect(gain);
      routeAudio(ctx, gain, 0.75, 0.55);
      osc.start(bTime);
      osc.stop(bTime + 0.9);
    });

    // Trống định âm Timpani dồn dập
    const timpani = ctx.createOscillator();
    const timpaniGain = ctx.createGain();
    timpani.type = 'sine';
    timpani.frequency.setValueAtTime(116.54, now); // Bb2
    timpani.frequency.exponentialRampToValueAtTime(58, now + 0.5);
    timpaniGain.gain.setValueAtTime(0.12, now);
    timpaniGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.55);

    timpani.connect(timpaniGain);
    routeAudio(ctx, timpaniGain, 0.9, 0.4);
    timpani.start(now);
    timpani.stop(now + 0.6);
  } catch (e) {}
};

/**
 * Ngày Nhà Giáo Việt Nam 20/11:
 * Tiếng phấn cà lên bảng đen sột soạt chân thực + tiếng chuông trường ngân vang hoài niệm
 */
export const playTeachersDayChalkSound = () => {
  if (!isSoundEnabled()) return;
  const ctx = getAudioContext();
  if (!ctx) return;

  try {
    const now = ctx.currentTime;

    // Hàm tạo 1 nét phấn cà lên bảng đen (Chalk on blackboard stroke)
    const playChalkStroke = (startTime, duration = 0.12, basePitch = 2200) => {
      // 1. Tiếng cọ xát ma sát của phấn trên bảng đen (Friction noise)
      const noise = ctx.createBufferSource();
      noise.buffer = createNoiseBuffer(ctx, duration);

      const bp = ctx.createBiquadFilter();
      bp.type = 'bandpass';
      bp.frequency.setValueAtTime(basePitch, startTime);
      bp.frequency.linearRampToValueAtTime(basePitch * 1.25, startTime + duration * 0.6);
      bp.frequency.linearRampToValueAtTime(basePitch * 0.9, startTime + duration);
      bp.Q.setValueAtTime(5.5, startTime);

      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0.001, startTime);
      gain.gain.linearRampToValueAtTime(0.08, startTime + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);

      noise.connect(bp);
      bp.connect(gain);
      routeAudio(ctx, gain, 0.85, 0.35);
      noise.start(startTime);
      noise.stop(startTime + duration + 0.02);

      // 2. Tiếng gõ phấn nhẹ khi bắt đầu chạm bảng
      const tapOsc = ctx.createOscillator();
      const tapGain = ctx.createGain();
      tapOsc.type = 'triangle';
      tapOsc.frequency.setValueAtTime(1180, startTime);
      tapGain.gain.setValueAtTime(0.045, startTime);
      tapGain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.025);
      tapOsc.connect(tapGain);
      routeAudio(ctx, tapGain, 0.7, 0.2);
      tapOsc.start(startTime);
      tapOsc.stop(startTime + 0.03);
    };

    // Chuỗi nét viết phấn: "Xoạt... Xoẹt... Tích... Xoạt"
    playChalkStroke(now, 0.15, 2400);
    playChalkStroke(now + 0.16, 0.12, 2800);
    playChalkStroke(now + 0.3, 0.06, 1900); // Nét chấm phấn
    playChalkStroke(now + 0.38, 0.18, 2200);

    // Chuông trường ngân nga hoài niệm (School Chime Notes)
    const schoolNotes = [523.25, 659.25, 783.99, 1046.5]; // C5, E5, G5, C6
    schoolNotes.forEach((freq, idx) => {
      const cTime = now + 0.2 + idx * 0.11;
      const cOsc = ctx.createOscillator();
      const cGain = ctx.createGain();
      cOsc.type = 'sine';
      cOsc.frequency.setValueAtTime(freq, cTime);
      cGain.gain.setValueAtTime(0.04, cTime);
      cGain.gain.exponentialRampToValueAtTime(0.0001, cTime + 0.8);
      cOsc.connect(cGain);
      routeAudio(ctx, cGain, 0.6, 0.5);
      cOsc.start(cTime);
      cOsc.stop(cTime + 0.85);
    });
  } catch (e) {}
};

/**
 * Tết Trung Thu:
 * Tiếng trống múa lân rộn rã tùng cắc tùng + tiếng chuông đèn lồng ngân nga
 */
export const playMidAutumnTransitionSound = () => {
  if (!isSoundEnabled()) return;
  const ctx = getAudioContext();
  if (!ctx) return;
  try {
    playLionDanceDrumSound(ctx, ctx.currentTime);
  } catch (e) {}
};

/**
 * Điều phối âm thanh chuyển trang thông minh:
 * Tự động chọn âm thanh Sự Kiện Lễ Hội nếu có sự kiện đang chạy,
 * hoặc phát âm thanh Mùa Màng (Xuân, Hạ, Thu, Đông)
 */
export const playPageTransitionAtmosphereSound = ({ seasonId = 'winter', eventId = null } = {}) => {
  if (!isSoundEnabled()) return;

  const normalizedEvent = String(eventId || '').toLowerCase();

  // 1. Ưu tiên sự kiện lễ hội nếu đang kích hoạt
  if (normalizedEvent.includes('30_4') || normalizedEvent.includes('30/4') || normalizedEvent.includes('giai_phong')) {
    playTank304TransitionSound();
    return;
  }
  if (normalizedEvent.includes('2_9') || normalizedEvent.includes('2/9') || normalizedEvent.includes('quoc_khanh')) {
    playNationalDay29TransitionSound();
    return;
  }
  if (
    normalizedEvent.includes('tet_duong') ||
    normalizedEvent.includes('tet_nguyen') ||
    normalizedEvent.includes('nam_moi') ||
    normalizedEvent.includes('new_year')
  ) {
    playFestiveEventSound('fireworks'); // Tiếng pháo hoa đì đùng
    return;
  }
  if (
    normalizedEvent.includes('giang_sinh') ||
    normalizedEvent.includes('noel') ||
    normalizedEvent.includes('christmas')
  ) {
    playSantaHoHoSound(); // Tiếng Hô Hô Ông Già Noel
    return;
  }
  if (
    normalizedEvent.includes('phu_nu') ||
    normalizedEvent.includes('8_3') ||
    normalizedEvent.includes('20_10') ||
    normalizedEvent.includes('women')
  ) {
    playRomanticHarpSound(getAudioContext(), getAudioContext()?.currentTime || 0);
    return;
  }
  if (
    normalizedEvent.includes('trung_thu') ||
    normalizedEvent.includes('rằm') ||
    normalizedEvent.includes('đèn lồng')
  ) {
    playMidAutumnTransitionSound(); // Tiếng trống múa lân rộn ràng
    return;
  }
  if (
    normalizedEvent.includes('20_11') ||
    normalizedEvent.includes('nha_giao') ||
    normalizedEvent.includes('thầy cô')
  ) {
    playTeachersDayChalkSound(); // Tiếng phấn cà lên bảng đen
    return;
  }

  // 2. Nếu không có sự kiện đặc thù, phát âm thanh theo mùa màng
  const normalizedSeason = String(seasonId || 'winter').toLowerCase();
  if (normalizedSeason === 'spring') {
    playSpringTransitionSound();
  } else if (normalizedSeason === 'summer') {
    playSummerTransitionSound();
  } else if (normalizedSeason === 'autumn') {
    playAutumnTransitionSound();
  } else {
    playWinterTransitionSound();
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
