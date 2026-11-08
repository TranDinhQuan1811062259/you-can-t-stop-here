/**
 * =========================================================================
 * 🎧 HỆ THỐNG ÂM THANH MÔI TRƯỜNG DUY TRÌ & TỰ ĐỘNG CHÌM NHẠC (AUDIO DUCKING)
 * =========================================================================
 * - Trạng thái DUY TRÌ (Ambient Loops) 100% bằng Web Audio API không phụ thuộc file ngoài
 * - Tự động hòa âm COMBINED SOUNDSCAPE khi bật cả Thời Tiết & Sự Kiện Lễ Hội
 * - Cơ chế AUDIO DUCKING: Tự động hạ âm thanh môi trường xuống 15% khi phát nhạc cá nhân
 *   và khôi phục êm ái khi dừng bài hát.
 */

let audioCtx = null;

// Gain Nodes quản lý âm lượng độc lập
let weatherMasterGain = null;
let eventMasterGain = null;
let combinedMasterGain = null;

// Trạng thái bật/tắt
let isWeatherSoundActive = false;
let isEventSoundActive = false;
let isMusicDucking = false;
let currentSeasonId = 'winter';
let currentMelodicSeasonId = 'winter';
let currentEventId = 'default';

// Node tham chiếu đang chạy (để dừng khi tắt)
let activeWeatherSources = [];
let activeEventSources = [];

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

// Khởi tạo đồ thị âm thanh (Audio Graph)
const initAudioGraph = () => {
  const ctx = getAudioContext();
  if (!ctx || combinedMasterGain) return;

  combinedMasterGain = ctx.createGain();
  combinedMasterGain.gain.setValueAtTime(0.7, ctx.currentTime);
  combinedMasterGain.connect(ctx.destination);

  weatherMasterGain = ctx.createGain();
  weatherMasterGain.gain.setValueAtTime(0, ctx.currentTime);
  weatherMasterGain.connect(combinedMasterGain);

  eventMasterGain = ctx.createGain();
  eventMasterGain.gain.setValueAtTime(0, ctx.currentTime);
  eventMasterGain.connect(combinedMasterGain);
};

// Tạo buffer tiếng ồn trắng
const createNoiseBuffer = (ctx, duration = 2) => {
  const bufferSize = Math.max(1, Math.floor(ctx.sampleRate * duration));
  const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) {
    data[i] = Math.random() * 2 - 1;
  }
  return buffer;
};

// =========================================================================
// 1. TẠO ÂM THANH DUY TRÌ CHO CÁC MÙA (SEASONS AMBIENT)
// =========================================================================

// Mùa Đông: Tiếng gió bấc rít êm dịu + bếp lửa bập bùng
const createWinterSoundscape = (ctx, outputNode) => {
  const sources = [];

  // 1. Tiếng gió bấc thổi qua tán cây (Filtered Noise với LFO)
  const noise = ctx.createBufferSource();
  noise.buffer = createNoiseBuffer(ctx, 3);
  noise.loop = true;

  const bandpass = ctx.createBiquadFilter();
  bandpass.type = 'bandpass';
  bandpass.frequency.setValueAtTime(380, ctx.currentTime);
  bandpass.Q.setValueAtTime(3.0, ctx.currentTime);

  // LFO làm gió thổi từng cơn
  const lfo = ctx.createOscillator();
  const lfoGain = ctx.createGain();
  lfo.frequency.setValueAtTime(0.18, ctx.currentTime); // Chu kỳ gió 5.5s
  lfoGain.gain.setValueAtTime(220, ctx.currentTime);
  lfo.connect(lfoGain);
  lfoGain.connect(bandpass.frequency);

  const windGain = ctx.createGain();
  windGain.gain.setValueAtTime(0.12, ctx.currentTime);

  noise.connect(bandpass);
  bandpass.connect(windGain);
  windGain.connect(outputNode);

  noise.start();
  lfo.start();
  sources.push(noise, lfo);

  // 2. Tiếng lửa sưởi tí tách ấm áp (Random crackle)
  const crackleTimer = setInterval(() => {
    if (!isWeatherSoundActive) return;
    try {
      const crackleOsc = ctx.createOscillator();
      const crackleGain = ctx.createGain();
      crackleOsc.type = 'triangle';
      crackleOsc.frequency.setValueAtTime(800 + Math.random() * 1200, ctx.currentTime);

      crackleGain.gain.setValueAtTime(0.015, ctx.currentTime);
      crackleGain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.04);

      crackleOsc.connect(crackleGain);
      crackleGain.connect(outputNode);

      crackleOsc.start();
      crackleOsc.stop(ctx.currentTime + 0.045);
    } catch (e) {}
  }, 240);

  sources.push({ stop: () => clearInterval(crackleTimer) });
  return sources;
};

// Mùa Xuân: Tiếng chim hót líu lo + gió xuân nhẹ nhàng
const createSpringSoundscape = (ctx, outputNode) => {
  const sources = [];

  // Gió xuân nhẹ
  const noise = ctx.createBufferSource();
  noise.buffer = createNoiseBuffer(ctx, 2.5);
  noise.loop = true;

  const filter = ctx.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.setValueAtTime(600, ctx.currentTime);

  const gain = ctx.createGain();
  gain.gain.setValueAtTime(0.06, ctx.currentTime);

  noise.connect(filter);
  filter.connect(gain);
  gain.connect(outputNode);
  noise.start();
  sources.push(noise);

  // Chim hót líu lo ngẫu nhiên
  const birdTimer = setInterval(() => {
    if (!isWeatherSoundActive) return;
    try {
      const now = ctx.currentTime;
      const birdOsc = ctx.createOscillator();
      const birdGain = ctx.createGain();

      birdOsc.type = 'sine';
      birdOsc.frequency.setValueAtTime(2200 + Math.random() * 800, now);
      birdOsc.frequency.exponentialRampToValueAtTime(3200 + Math.random() * 600, now + 0.08);
      birdOsc.frequency.exponentialRampToValueAtTime(1800, now + 0.16);

      birdGain.gain.setValueAtTime(0.001, now);
      birdGain.gain.linearRampToValueAtTime(0.025, now + 0.04);
      birdGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.18);

      birdOsc.connect(birdGain);
      birdGain.connect(outputNode);

      birdOsc.start(now);
      birdOsc.stop(now + 0.2);
    } catch (e) {}
  }, 2200);

  sources.push({ stop: () => clearInterval(birdTimer) });
  return sources;
};

// Mùa Hạ: Tiếng sóng biển rì rào + tiếng ve thì thầm
const createSummerSoundscape = (ctx, outputNode) => {
  const sources = [];

  // Sóng biển dạt dào
  const noise = ctx.createBufferSource();
  noise.buffer = createNoiseBuffer(ctx, 4);
  noise.loop = true;

  const filter = ctx.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.setValueAtTime(450, ctx.currentTime);

  const lfo = ctx.createOscillator();
  const lfoGain = ctx.createGain();
  lfo.frequency.setValueAtTime(0.12, ctx.currentTime); // Chu kỳ sóng 8s
  lfoGain.gain.setValueAtTime(0.08, ctx.currentTime);

  const waveGain = ctx.createGain();
  waveGain.gain.setValueAtTime(0.07, ctx.currentTime);
  lfo.connect(lfoGain);
  lfoGain.connect(waveGain.gain);

  noise.connect(filter);
  filter.connect(waveGain);
  waveGain.connect(outputNode);

  noise.start();
  lfo.start();
  sources.push(noise, lfo);

  return sources;
};

// Mùa Thu: Tiếng lá xào xạc + mưa phùn êm dịu
const createAutumnSoundscape = (ctx, outputNode) => {
  const sources = [];

  const noise = ctx.createBufferSource();
  noise.buffer = createNoiseBuffer(ctx, 3);
  noise.loop = true;

  const bandpass = ctx.createBiquadFilter();
  bandpass.type = 'bandpass';
  bandpass.frequency.setValueAtTime(1400, ctx.currentTime);
  bandpass.Q.setValueAtTime(1.2, ctx.currentTime);

  const rainGain = ctx.createGain();
  rainGain.gain.setValueAtTime(0.08, ctx.currentTime);

  noise.connect(bandpass);
  bandpass.connect(rainGain);
  rainGain.connect(outputNode);

  noise.start();
  sources.push(noise);

  return sources;
};

// =========================================================================
// 2. TẠO ÂM THANH DUY TRÌ CHO SỰ KIỆN LỄ HỘI (FESTIVE EVENT AMBIENT)
// =========================================================================

/**
 * Âm thanh Sự Kiện Tết (Tết Nguyên Đán & Tết Dương Lịch):
 * Tiếng Trống Hội rộn rã (Tùng... Tùng... Cắc... Tùng) kết hợp Tiếng Chiêng Đồng ngân vang
 * Duy trì liên tục, ngân vang rộn ràng cho đến khi tắt
 */
const createTetSoundscape = (ctx, outputNode) => {
  const sources = [];

  // 1. Nhịp Trống Hội & Chiêng Đồng lặp lại định kỳ
  let step = 0;
  const tetTimer = setInterval(() => {
    if (!isEventSoundActive) return;
    try {
      const now = ctx.currentTime;

      // Tiếng trống TÙNG (Bass drum trầm ấm, màng trống da bò)
      const playDrumTung = (time, freq = 82, decay = 0.42, vol = 0.14) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, time);
        osc.frequency.exponentialRampToValueAtTime(32, time + decay);

        gain.gain.setValueAtTime(vol, time);
        gain.gain.exponentialRampToValueAtTime(0.001, time + decay);

        osc.connect(gain);
        gain.connect(outputNode);
        osc.start(time);
        osc.stop(time + decay + 0.02);
      };

      // Tiếng gõ CẮC (Tang trống gỗ thanh giòn)
      const playDrumCac = (time) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(780, time);
        osc.frequency.exponentialRampToValueAtTime(260, time + 0.05);

        gain.gain.setValueAtTime(0.06, time);
        gain.gain.exponentialRampToValueAtTime(0.001, time + 0.055);

        osc.connect(gain);
        gain.connect(outputNode);
        osc.start(time);
        osc.stop(time + 0.06);
      };

      // Tiếng CHIÊNG ĐỒNG ngân vang (Brass gong with rich shimmering harmonics)
      const playGongChieng = (time, baseFreq = 415) => {
        const harmonics = [baseFreq, baseFreq * 1.48, baseFreq * 2.08, baseFreq * 2.76];
        harmonics.forEach((freq, idx) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = idx === 0 ? 'sine' : 'triangle';
          osc.frequency.setValueAtTime(freq, time);

          const vol = 0.06 / (idx + 1);
          gain.gain.setValueAtTime(vol, time);
          gain.gain.exponentialRampToValueAtTime(0.0001, time + 2.8);

          osc.connect(gain);
          gain.connect(outputNode);
          osc.start(time);
          osc.stop(time + 2.9);
        });
      };

      // Chuỗi tiết tấu hội Tết: Tùng... Tùng... Cắc... Tùng + Chiêng ngân
      if (step % 2 === 0) {
        playDrumTung(now, 86, 0.45, 0.13); // TÙNG 1
        playDrumTung(now + 0.38, 80, 0.45, 0.12); // TÙNG 2
        playDrumCac(now + 0.76); // CẮC
        playDrumTung(now + 1.1, 75, 0.55, 0.15); // TÙNG dứt khoát
        playGongChieng(now + 1.12, 420); // Chiêng đồng ngân vang
      } else {
        // Nhịp rộn rã luân phiên
        playDrumTung(now, 82, 0.38, 0.12);
        playDrumCac(now + 0.35);
        playDrumTung(now + 0.68, 88, 0.42, 0.13);
        playGongChieng(now + 0.7, 440); // Chiêng ngân vọng xa
      }
      step++;
    } catch (e) {}
  }, 2400);

  // Nền shimmer ấm cúng ngày Tết
  const warmPad = ctx.createOscillator();
  const padGain = ctx.createGain();
  warmPad.type = 'sine';
  warmPad.frequency.setValueAtTime(261.63, ctx.currentTime); // C4
  padGain.gain.setValueAtTime(0.018, ctx.currentTime);

  warmPad.connect(padGain);
  padGain.connect(outputNode);
  warmPad.start();

  sources.push(warmPad);
  sources.push({ stop: () => clearInterval(tetTimer) });
  return sources;
};

/**
 * Âm thanh Sự Kiện Giáng Sinh (Merry Christmas):
 * Tiếng chuông Jingle Bells thánh thót + tiếng chuông nhà thờ ngân nga du dương
 * Duy trì liên tục ngân vang êm đềm cho đến khi tắt
 */
const createChristmasSoundscape = (ctx, outputNode) => {
  const sources = [];

  // 1. Nhịp điệu chuông Jingle Bells (Tinkling Sleigh Bells)
  const jingleTimer = setInterval(() => {
    if (!isEventSoundActive) return;
    try {
      const now = ctx.currentTime;
      const playJingle = (time, freq, vol = 0.045) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, time);
        gain.gain.setValueAtTime(vol, time);
        gain.gain.exponentialRampToValueAtTime(0.0001, time + 0.22);
        osc.connect(gain);
        gain.connect(outputNode);
        osc.start(time);
        osc.stop(time + 0.25);
      };

      // Giai điệu Jingle: Mi - Mi - Mi
      playJingle(now, 1318.51, 0.04); // E6
      playJingle(now + 0.18, 1318.51, 0.04);
      playJingle(now + 0.36, 1318.51, 0.055);
    } catch (e) {}
  }, 2800);

  // 2. Tiếng Chuông Nhà Thờ (Cathedral / Church Bell Chimes) ngân vang trầm bổng định kỳ
  let churchNoteIdx = 0;
  const churchTimer = setInterval(() => {
    if (!isEventSoundActive) return;
    try {
      const now = ctx.currentTime;
      // Dàn hợp âm chuông nhà thờ ngân nga: C5, G4, A4, F4
      const churchPitches = [523.25, 392.00, 440.00, 349.23];
      const pitch = churchPitches[churchNoteIdx % churchPitches.length];
      churchNoteIdx++;

      // Họa âm chuông nhà thờ (Rich cathedral bell timbre)
      const harmonics = [pitch, pitch * 1.5, pitch * 2.0, pitch * 2.76];
      harmonics.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = idx === 0 ? 'sine' : 'triangle';
        osc.frequency.setValueAtTime(freq, now);

        const bellVol = 0.05 / (idx + 1);
        gain.gain.setValueAtTime(bellVol, now);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + 4.2);

        osc.connect(gain);
        gain.connect(outputNode);
        osc.start(now);
        osc.stop(now + 4.3);
      });
    } catch (e) {}
  }, 5500);

  // Nền đệm tuyết trắng Giáng Sinh
  const snowPad = ctx.createOscillator();
  const snowGain = ctx.createGain();
  snowPad.type = 'sine';
  snowPad.frequency.setValueAtTime(329.63, ctx.currentTime); // E4
  snowGain.gain.setValueAtTime(0.018, ctx.currentTime);

  snowPad.connect(snowGain);
  snowGain.connect(outputNode);
  snowPad.start();

  sources.push(snowPad);
  sources.push({ stop: () => clearInterval(jingleTimer) });
  sources.push({ stop: () => clearInterval(churchTimer) });
  return sources;
};

// Cấu hình 4 Bài Âm Hưởng Ngân Nga Theo 4 Mùa (Mỗi Mùa 1 Bản Hòa Âm Riêng Biệt)
export const MELODIC_SEASONS = {
  spring: {
    id: 'spring',
    name: 'Mùa Xuân',
    title: 'Khúc Giao Mùa Đâm Chồi',
    icon: '🌸',
    desc: 'Chuông gió phong linh & hợp âm mầm xanh tươi mới',
    tag: 'Xuân tươi mới',
  },
  summer: {
    id: 'summer',
    name: 'Mùa Hạ',
    title: 'Bản Tình Ca Biển Chiều',
    icon: '☀️',
    desc: 'Hợp âm phím đàn lofi hoàng hôn ấm áp & thư thái',
    tag: 'Hạ rực rỡ',
  },
  autumn: {
    id: 'autumn',
    name: 'Mùa Thu',
    title: 'Giai Điệu Lá Vàng Lắng Đọng',
    icon: '🍁',
    desc: 'Khúc ngân phím đàn sâu lắng & hoài niệm dịu êm',
    tag: 'Thu lắng đọng',
  },
  winter: {
    id: 'winter',
    name: 'Mùa Đông',
    title: 'Tiếng Chuông Tuyết An Yên',
    icon: '❄️',
    desc: 'Chuông ngân pha lê & hợp âm an lành sưởi ấm',
    tag: 'Đông an yên',
  },
};

// 1. Mùa Xuân: Khúc Giao Mùa Đâm Chồi (Spring Wind Chimes & Pentatonic Joy)
const createSpringMelodicSoundscape = (ctx, outputNode) => {
  const sources = [];
  const notes = [523.25, 587.33, 659.25, 783.99, 880.0, 1046.5]; // C5, D5, E5, G5, A5, C6

  let step = 0;
  const melodyTimer = setInterval(() => {
    if (!isEventSoundActive) return;
    try {
      const now = ctx.currentTime;
      const n1 = notes[step % notes.length];
      const n2 = notes[(step + 2) % notes.length];
      step++;

      const playChime = (time, freq, vol) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, time);

        gain.gain.setValueAtTime(vol, time);
        gain.gain.exponentialRampToValueAtTime(0.0001, time + 2.4);

        osc.connect(gain);
        gain.connect(outputNode);
        osc.start(time);
        osc.stop(time + 2.5);
      };

      playChime(now, n1, 0.045);
      playChime(now + 0.35, n2, 0.035);
    } catch (e) {}
  }, 2600);

  // Nền pad mầm xanh êm ái
  const padOsc = ctx.createOscillator();
  const padGain = ctx.createGain();
  padOsc.type = 'triangle';
  padOsc.frequency.setValueAtTime(261.63, ctx.currentTime); // C4
  padGain.gain.setValueAtTime(0.015, ctx.currentTime);
  padOsc.connect(padGain);
  padGain.connect(outputNode);
  padOsc.start();

  sources.push(padOsc);
  sources.push({ stop: () => clearInterval(melodyTimer) });
  return sources;
};

// 2. Mùa Hạ: Bản Tình Ca Biển Chiều (Summer Sunset Lofi Chords & Warm Melancholy)
const createSummerMelodicSoundscape = (ctx, outputNode) => {
  const sources = [];
  const chords = [
    [349.23, 440.0, 523.25, 659.25], // Fmaj7 (F4, A4, C5, E5)
    [329.63, 392.0, 493.88, 587.33], // Em7 (E4, G4, B4, D5)
    [293.66, 349.23, 440.0, 523.25], // Dm7 (D4, F4, A4, C5)
    [261.63, 329.63, 392.0, 523.25], // Cmaj (C4, E4, G4, C5)
  ];

  let chordIdx = 0;
  const chordTimer = setInterval(() => {
    if (!isEventSoundActive) return;
    try {
      const now = ctx.currentTime;
      const currentChord = chords[chordIdx % chords.length];
      chordIdx++;

      currentChord.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now + idx * 0.12);

        gain.gain.setValueAtTime(0.032, now + idx * 0.12);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + idx * 0.12 + 2.8);

        osc.connect(gain);
        gain.connect(outputNode);
        osc.start(now + idx * 0.12);
        osc.stop(now + idx * 0.12 + 2.9);
      });
    } catch (e) {}
  }, 3400);

  // Nền hoàng hôn ấm áp
  const padOsc = ctx.createOscillator();
  const padGain = ctx.createGain();
  padOsc.type = 'sine';
  padOsc.frequency.setValueAtTime(174.61, ctx.currentTime); // F3
  padGain.gain.setValueAtTime(0.016, ctx.currentTime);
  padOsc.connect(padGain);
  padGain.connect(outputNode);
  padOsc.start();

  sources.push(padOsc);
  sources.push({ stop: () => clearInterval(chordTimer) });
  return sources;
};

// 3. Mùa Thu: Giai Điệu Lá Vàng Lắng Đọng (Autumn Reverie & Piano Reflections)
const createAutumnMelodicSoundscape = (ctx, outputNode) => {
  const sources = [];
  const notes = [293.66, 349.23, 440.0, 523.25, 659.25, 587.33]; // D4, F4, A4, C5, E5, D5

  let step = 0;
  const autumnTimer = setInterval(() => {
    if (!isEventSoundActive) return;
    try {
      const now = ctx.currentTime;
      const note = notes[step % notes.length];
      const harmony = notes[(step + 2) % notes.length] * 0.5;
      step++;

      [note, harmony].forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = idx === 0 ? 'sine' : 'triangle';
        osc.frequency.setValueAtTime(freq, now);

        const vol = idx === 0 ? 0.042 : 0.022;
        gain.gain.setValueAtTime(vol, now);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + 3.0);

        osc.connect(gain);
        gain.connect(outputNode);
        osc.start(now);
        osc.stop(now + 3.1);
      });
    } catch (e) {}
  }, 2900);

  // Nền lá thu rơi nhẹ nhàng
  const droneOsc = ctx.createOscillator();
  const droneGain = ctx.createGain();
  droneOsc.type = 'sine';
  droneOsc.frequency.setValueAtTime(220.0, ctx.currentTime); // A3
  droneGain.gain.setValueAtTime(0.015, ctx.currentTime);
  droneOsc.connect(droneGain);
  droneGain.connect(outputNode);
  droneOsc.start();

  sources.push(droneOsc);
  sources.push({ stop: () => clearInterval(autumnTimer) });
  return sources;
};

// 4. Mùa Đông: Tiếng Chuông Tuyết An Yên (Winter Peace & Crystal Chimes)
const createWinterMelodicSoundscape = (ctx, outputNode) => {
  const sources = [];
  const crystalChimes = [329.63, 415.30, 493.88, 659.25, 830.61]; // E4, G#4, B4, E5, G#5

  let chimeIdx = 0;
  const winterTimer = setInterval(() => {
    if (!isEventSoundActive) return;
    try {
      const now = ctx.currentTime;
      const note = crystalChimes[chimeIdx % crystalChimes.length];
      const overNote = crystalChimes[(chimeIdx + 1) % crystalChimes.length];
      chimeIdx++;

      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(note, now);

      gain.gain.setValueAtTime(0.045, now);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 3.4);

      osc.connect(gain);
      gain.connect(outputNode);
      osc.start(now);
      osc.stop(now + 3.5);

      const osc2 = ctx.createOscillator();
      const gain2 = ctx.createGain();
      osc2.type = 'triangle';
      osc2.frequency.setValueAtTime(overNote * 1.5, now + 0.2);
      gain2.gain.setValueAtTime(0.02, now + 0.2);
      gain2.gain.exponentialRampToValueAtTime(0.0001, now + 2.2);

      osc2.connect(gain2);
      gain2.connect(outputNode);
      osc2.start(now + 0.2);
      osc2.stop(now + 2.3);
    } catch (e) {}
  }, 3200);

  // Nền tuyết trắng an yên
  const snowOsc = ctx.createOscillator();
  const snowGain = ctx.createGain();
  snowOsc.type = 'sine';
  snowOsc.frequency.setValueAtTime(164.81, ctx.currentTime); // E3
  snowGain.gain.setValueAtTime(0.016, ctx.currentTime);
  snowOsc.connect(snowGain);
  snowGain.connect(outputNode);
  snowOsc.start();

  sources.push(snowOsc);
  sources.push({ stop: () => clearInterval(winterTimer) });
  return sources;
};

// Chuông ngân lễ hội thông thường
const createFestiveSoundscape = (ctx, outputNode) => {
  const sources = [];

  const bellTimer = setInterval(() => {
    if (!isEventSoundActive) return;
    try {
      const now = ctx.currentTime;
      const chordNotes = [523.25, 659.25, 783.99, 1046.5];
      const freq = chordNotes[Math.floor(Math.random() * chordNotes.length)];

      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now);

      gain.gain.setValueAtTime(0.045, now);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 1.8);

      osc.connect(gain);
      gain.connect(outputNode);

      osc.start(now);
      osc.stop(now + 1.9);
    } catch (e) {}
  }, 3500);

  const shimmerOsc = ctx.createOscillator();
  const shimmerGain = ctx.createGain();
  shimmerOsc.type = 'sine';
  shimmerOsc.frequency.setValueAtTime(329.63, ctx.currentTime);
  shimmerGain.gain.setValueAtTime(0.02, ctx.currentTime);

  shimmerOsc.connect(shimmerGain);
  shimmerGain.connect(outputNode);
  shimmerOsc.start();
  sources.push(shimmerOsc);
  sources.push({ stop: () => clearInterval(bellTimer) });

  return sources;
};

// =========================================================================
// 3. ĐIỀU KHIỂN & BẬT / TẮT DUY TRÌ & HÒA ÂM (COMBINED SOUNDSCAPE)
// =========================================================================

export const startWeatherAmbient = (seasonId = 'winter') => {
  initAudioGraph();
  const ctx = getAudioContext();
  if (!ctx) return;

  stopWeatherAmbient();
  currentSeasonId = seasonId;
  isWeatherSoundActive = true;

  const now = ctx.currentTime;
  weatherMasterGain.gain.cancelScheduledValues(now);

  const targetGain = isEventSoundActive ? 0.6 : 0.9;
  weatherMasterGain.gain.setValueAtTime(0, now);
  weatherMasterGain.gain.linearRampToValueAtTime(targetGain, now + 1.2);

  if (seasonId === 'spring') {
    activeWeatherSources = createSpringSoundscape(ctx, weatherMasterGain);
  } else if (seasonId === 'summer') {
    activeWeatherSources = createSummerSoundscape(ctx, weatherMasterGain);
  } else if (seasonId === 'autumn') {
    activeWeatherSources = createAutumnSoundscape(ctx, weatherMasterGain);
  } else {
    activeWeatherSources = createWinterSoundscape(ctx, weatherMasterGain);
  }

  notifyStateChange();
};

export const stopWeatherAmbient = () => {
  if (activeWeatherSources && activeWeatherSources.length > 0) {
    activeWeatherSources.forEach((src) => {
      try {
        if (typeof src.stop === 'function') src.stop();
        if (typeof src.disconnect === 'function') src.disconnect();
      } catch (e) {}
    });
    activeWeatherSources = [];
  }
  if (weatherMasterGain && audioCtx) {
    weatherMasterGain.gain.setValueAtTime(0, audioCtx.currentTime);
  }
  isWeatherSoundActive = false;
  notifyStateChange();
};

/**
 * Tắt âm hưởng giai điệu sự kiện/mùa
 */
export function stopEventAmbient() {
  if (activeEventSources && activeEventSources.length > 0) {
    activeEventSources.forEach((src) => {
      try {
        if (typeof src.stop === 'function') src.stop();
        if (typeof src.disconnect === 'function') src.disconnect();
      } catch (e) {}
    });
    activeEventSources = [];
  }
  if (eventMasterGain && audioCtx) {
    eventMasterGain.gain.setValueAtTime(0, audioCtx.currentTime);
  }
  isEventSoundActive = false;
  notifyStateChange();
}

/**
 * Bật/chuyển đổi Âm Hưởng Ngân Nga (theo Mùa hoặc theo Sự Kiện Lễ Hội)
 */
export function startEventAmbient(targetId = 'default') {
  initAudioGraph();
  const ctx = getAudioContext();
  if (!ctx) return;

  stopEventAmbient();
  currentEventId = targetId;
  isEventSoundActive = true;

  const now = ctx.currentTime;
  eventMasterGain.gain.cancelScheduledValues(now);

  const targetGain = isWeatherSoundActive ? 0.6 : 0.9;
  eventMasterGain.gain.setValueAtTime(0, now);
  eventMasterGain.gain.linearRampToValueAtTime(targetGain, now + 1.2);

  const normalizedId = String(targetId || '').toLowerCase();

  // Nếu targetId là 1 trong 4 mùa thì lưu làm mùa giai điệu hiện tại
  if (['spring', 'summer', 'autumn', 'winter'].includes(normalizedId)) {
    currentMelodicSeasonId = normalizedId;
  }

  if (
    normalizedId.includes('tet') ||
    normalizedId.includes('nam_moi') ||
    normalizedId.includes('new_year') ||
    normalizedId.includes('countdown')
  ) {
    activeEventSources = createTetSoundscape(ctx, eventMasterGain);
  } else if (
    normalizedId.includes('giang_sinh') ||
    normalizedId.includes('noel') ||
    normalizedId.includes('christmas')
  ) {
    activeEventSources = createChristmasSoundscape(ctx, eventMasterGain);
  } else {
    // Phát bài giai điệu hòa âm theo mùa (Mỗi mùa là 1 bài đặc trưng)
    const effectiveSeason = ['spring', 'summer', 'autumn', 'winter'].includes(normalizedId)
      ? normalizedId
      : (currentMelodicSeasonId || currentSeasonId || 'winter');

    if (effectiveSeason === 'spring') {
      activeEventSources = createSpringMelodicSoundscape(ctx, eventMasterGain);
    } else if (effectiveSeason === 'summer') {
      activeEventSources = createSummerMelodicSoundscape(ctx, eventMasterGain);
    } else if (effectiveSeason === 'autumn') {
      activeEventSources = createAutumnMelodicSoundscape(ctx, eventMasterGain);
    } else {
      activeEventSources = createWinterMelodicSoundscape(ctx, eventMasterGain);
    }
  }

  notifyStateChange();
}

/**
 * Chuyển đổi mùa giai điệu âm hưởng (Spring, Summer, Autumn, Winter)
 */
export function setMelodicSeason(seasonId = 'winter') {
  if (['spring', 'summer', 'autumn', 'winter'].includes(seasonId)) {
    currentMelodicSeasonId = seasonId;
    if (isEventSoundActive) {
      startEventAmbient(seasonId);
    } else {
      notifyStateChange();
    }
  }
}

export const startMelodicAmbient = (...args) => startEventAmbient(...args);
export const stopMelodicAmbient = (...args) => stopEventAmbient(...args);

// =========================================================================
// 4. AUDIO DUCKING KHI MỞ BÀI NHẠC CÁ NHÂN (FADE NHẸ ÂM MÔI TRƯỜNG)
// =========================================================================

/**
 * Làm chìm âm thanh môi trường khi nhạc cá nhân bật lên (Duck down to 15%)
 */
export const duckAmbientForMusic = () => {
  initAudioGraph();
  const ctx = getAudioContext();
  if (!ctx || !combinedMasterGain) return;

  isMusicDucking = true;
  const now = ctx.currentTime;
  combinedMasterGain.gain.cancelScheduledValues(now);
  combinedMasterGain.gain.setValueAtTime(combinedMasterGain.gain.value, now);
  // Chìm dần mềm mại trong 1.5 giây
  combinedMasterGain.gain.linearRampToValueAtTime(0.12, now + 1.5);
};

/**
 * Khôi phục âm lượng môi trường khi nhạc kết thúc / tạm dừng (Fade back to 70%)
 */
export const restoreAmbientFromMusic = () => {
  initAudioGraph();
  const ctx = getAudioContext();
  if (!ctx || !combinedMasterGain) return;

  isMusicDucking = false;
  const now = ctx.currentTime;
  combinedMasterGain.gain.cancelScheduledValues(now);
  combinedMasterGain.gain.setValueAtTime(combinedMasterGain.gain.value, now);
  // Tăng dần trở lại trong 2 giây
  combinedMasterGain.gain.linearRampToValueAtTime(0.7, now + 2.0);
};

export const getAmbientState = () => {
  return {
    isWeatherSoundActive,
    isEventSoundActive,
    isCombined: isWeatherSoundActive && isEventSoundActive,
    isMusicDucking,
    currentSeasonId,
    currentMelodicSeasonId,
    currentEventId,
  };
};

const notifyStateChange = () => {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('freedom_ambient_sound_changed', { detail: getAmbientState() }));
  }
};
