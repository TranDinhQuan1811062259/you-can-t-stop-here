/**
 * =========================================================================
 * 🎵 STORY AUDIO ENGINE (100% Web Audio API - Hoạt động độc lập & Không phụ thuộc mạng)
 * =========================================================================
 * - Đảm bảo âm thanh Story luôn luôn phát thành công, không bao giờ bị lỗi CORS hay 403 Forbidden.
 * - Cung cấp 5 bản nhạc nền Lofi / Healing / Mưa Rơi / Deep Focus / Acoustic du dương.
 */

let storyAudioCtx = null;
let currentStorySources = [];
let storyMasterGain = null;
let activePresetId = null;

const getStoryAudioContext = () => {
  if (typeof window === 'undefined') return null;
  const AudioContextClass = window.AudioContext || window.webkitAudioContext;
  if (!AudioContextClass) return null;

  if (!storyAudioCtx) {
    storyAudioCtx = new AudioContextClass();
  }
  if (storyAudioCtx.state === 'suspended') {
    storyAudioCtx.resume().catch(() => {});
  }
  return storyAudioCtx;
};

// Dừng toàn bộ âm thanh story đang phát
export const stopStoryMusic = () => {
  if (currentStorySources && currentStorySources.length > 0) {
    currentStorySources.forEach((src) => {
      try {
        if (typeof src.stop === 'function') src.stop();
        if (typeof src.disconnect === 'function') src.disconnect();
      } catch (e) {}
    });
    currentStorySources = [];
  }
  if (storyMasterGain && storyAudioCtx) {
    try {
      storyMasterGain.gain.setValueAtTime(0, storyAudioCtx.currentTime);
    } catch (e) {}
  }
  activePresetId = null;
};

// 1. Lofi Night Beat (Đêm muộn ở văn phòng)
const createLofiNightSynth = (ctx, master) => {
  const sources = [];
  // Hợp âm Lofi: Cmaj7 (C4, E4, G4, B4) -> Am7 (A3, C4, E4, G4) -> Dm7 (D4, F4, A4, C5)
  const chords = [
    [261.63, 329.63, 392.00, 493.88], // Cmaj7
    [220.00, 261.63, 329.63, 392.00], // Am7
    [293.66, 349.23, 440.00, 523.25], // Dm7
    [196.00, 246.94, 293.66, 349.23], // G7
  ];

  let chordIndex = 0;
  const chordInterval = setInterval(() => {
    try {
      const now = ctx.currentTime;
      const notes = chords[chordIndex % chords.length];
      chordIndex++;

      notes.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, now + idx * 0.04);

        // Filter làm ấm tiếng đàn
        const filter = ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(800, now);

        gain.gain.setValueAtTime(0.045, now + idx * 0.04);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + 2.2);

        osc.connect(filter);
        filter.connect(gain);
        gain.connect(master);

        osc.start(now + idx * 0.04);
        osc.stop(now + 2.3);
      });
    } catch (e) {}
  }, 2200);

  // Nhịp beat lofi êm ái
  const beatInterval = setInterval(() => {
    try {
      const now = ctx.currentTime;
      // Kick nhẹ
      const kick = ctx.createOscillator();
      const kickGain = ctx.createGain();
      kick.frequency.setValueAtTime(90, now);
      kick.frequency.exponentialRampToValueAtTime(30, now + 0.15);
      kickGain.gain.setValueAtTime(0.06, now);
      kickGain.gain.exponentialRampToValueAtTime(0.001, now + 0.16);
      kick.connect(kickGain);
      kickGain.connect(master);
      kick.start(now);
      kick.stop(now + 0.18);
    } catch (e) {}
  }, 1100);

  sources.push({ stop: () => clearInterval(chordInterval) });
  sources.push({ stop: () => clearInterval(beatInterval) });
  return sources;
};

// 2. Healing Piano (Dương cầm chữa lành)
const createHealingPianoSynth = (ctx, master) => {
  const sources = [];
  const arpeggios = [
    349.23, 440.0, 523.25, 659.25, // F4, A4, C5, E5 (Fmaj7)
    261.63, 329.63, 392.0, 523.25, // C4, E4, G4, C5 (C)
    220.0, 261.63, 329.63, 440.0,  // A3, C4, E4, A4 (Am)
    196.0, 246.94, 293.66, 392.0,  // G3, B3, D4, G4 (G)
  ];

  let noteIdx = 0;
  const pianoInterval = setInterval(() => {
    try {
      const now = ctx.currentTime;
      const freq = arpeggios[noteIdx % arpeggios.length];
      noteIdx++;

      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now);

      gain.gain.setValueAtTime(0.06, now);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 2.5);

      // Hòa âm bồi
      const sub = ctx.createOscillator();
      const subGain = ctx.createGain();
      sub.type = 'triangle';
      sub.frequency.setValueAtTime(freq * 0.5, now);
      subGain.gain.setValueAtTime(0.03, now);
      subGain.gain.exponentialRampToValueAtTime(0.0001, now + 1.8);

      osc.connect(gain);
      gain.connect(master);
      sub.connect(subGain);
      subGain.connect(master);

      osc.start(now);
      osc.stop(now + 2.6);
      sub.start(now);
      sub.stop(now + 1.9);
    } catch (e) {}
  }, 750);

  sources.push({ stop: () => clearInterval(pianoInterval) });
  return sources;
};

// 3. Rain & Coffee (Tiếng mưa & Lofi Guitar)
const createRainCoffeeSynth = (ctx, master) => {
  const sources = [];

  // 1. Tiếng mưa rơi rả rích bằng White/Pink noise lọc thông dải
  const bufferSize = ctx.sampleRate * 2;
  const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) {
    data[i] = Math.random() * 2 - 1;
  }

  const rainNoise = ctx.createBufferSource();
  rainNoise.buffer = buffer;
  rainNoise.loop = true;

  const rainFilter = ctx.createBiquadFilter();
  rainFilter.type = 'bandpass';
  rainFilter.frequency.setValueAtTime(1200, ctx.currentTime);
  rainFilter.Q.setValueAtTime(0.7, ctx.currentTime);

  const rainGain = ctx.createGain();
  rainGain.gain.setValueAtTime(0.04, ctx.currentTime);

  rainNoise.connect(rainFilter);
  rainFilter.connect(rainGain);
  rainGain.connect(master);
  rainNoise.start();
  sources.push(rainNoise);

  // 2. Nốt guitar acoustic mộc mạc
  const guitarNotes = [293.66, 369.99, 440.0, 587.33]; // D, F#, A, D
  let gIdx = 0;
  const guitarInterval = setInterval(() => {
    try {
      const now = ctx.currentTime;
      const freq = guitarNotes[gIdx % guitarNotes.length];
      gIdx++;

      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, now);

      gain.gain.setValueAtTime(0.05, now);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 1.8);

      osc.connect(gain);
      gain.connect(master);
      osc.start(now);
      osc.stop(now + 1.9);
    } catch (e) {}
  }, 1800);

  sources.push({ stop: () => clearInterval(guitarInterval) });
  return sources;
};

// 4. Deep Focus (Tần số 432Hz tập trung)
const createDeepFocusSynth = (ctx, master) => {
  const sources = [];

  // Tần số hòa âm ấm 432Hz
  const osc1 = ctx.createOscillator();
  const osc2 = ctx.createOscillator();
  const droneGain = ctx.createGain();

  osc1.type = 'sine';
  osc1.frequency.setValueAtTime(432, ctx.currentTime);

  osc2.type = 'sine';
  osc2.frequency.setValueAtTime(216, ctx.currentTime); // Sub octave

  droneGain.gain.setValueAtTime(0.045, ctx.currentTime);

  osc1.connect(droneGain);
  osc2.connect(droneGain);
  droneGain.connect(master);

  osc1.start();
  osc2.start();
  sources.push(osc1, osc2);

  // Chuông ngân định kỳ mỗi 4 giây
  const bowlInterval = setInterval(() => {
    try {
      const now = ctx.currentTime;
      const bowl = ctx.createOscillator();
      const bowlGain = ctx.createGain();
      bowl.type = 'sine';
      bowl.frequency.setValueAtTime(648, now); // 432 * 1.5

      bowlGain.gain.setValueAtTime(0.035, now);
      bowlGain.gain.exponentialRampToValueAtTime(0.0001, now + 3.8);

      bowl.connect(bowlGain);
      bowlGain.connect(master);
      bowl.start(now);
      bowl.stop(now + 3.9);
    } catch (e) {}
  }, 4000);

  sources.push({ stop: () => clearInterval(bowlInterval) });
  return sources;
};

// 5. Acoustic Sunset (Bình yên sau tan ca)
const createAcousticSunsetSynth = (ctx, master) => {
  const sources = [];
  const sunsetChords = [
    [164.81, 246.94, 329.63, 415.3], // E, B, E4, G#4
    [220.0, 277.18, 329.63, 440.0],  // A, C#, E, A
    [138.59, 207.65, 277.18, 329.63], // C#m
    [196.0, 246.94, 293.66, 392.0],  // G
  ];

  let cIdx = 0;
  const strumInterval = setInterval(() => {
    try {
      const now = ctx.currentTime;
      const chord = sunsetChords[cIdx % sunsetChords.length];
      cIdx++;

      chord.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, now + idx * 0.05);

        gain.gain.setValueAtTime(0.045, now + idx * 0.05);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + 2.4);

        osc.connect(gain);
        gain.connect(master);
        osc.start(now + idx * 0.05);
        osc.stop(now + 2.5);
      });
    } catch (e) {}
  }, 2400);

  sources.push({ stop: () => clearInterval(strumInterval) });
  return sources;
};

/**
 * Phát nhạc Story Preset tự tổng hợp bằng Web Audio API
 */
export const playStoryPresetSound = (presetKey = 'lofi_night', volume = 0.5) => {
  const ctx = getStoryAudioContext();
  if (!ctx) return;

  stopStoryMusic();
  activePresetId = presetKey;

  storyMasterGain = ctx.createGain();
  storyMasterGain.gain.setValueAtTime(volume, ctx.currentTime);
  storyMasterGain.connect(ctx.destination);

  const cleanKey = String(presetKey || '').toLowerCase();

  if (cleanKey.includes('piano') || cleanKey.includes('healing')) {
    currentStorySources = createHealingPianoSynth(ctx, storyMasterGain);
  } else if (cleanKey.includes('rain') || cleanKey.includes('coffee') || cleanKey.includes('mưa')) {
    currentStorySources = createRainCoffeeSynth(ctx, storyMasterGain);
  } else if (cleanKey.includes('focus') || cleanKey.includes('tập trung')) {
    currentStorySources = createDeepFocusSynth(ctx, storyMasterGain);
  } else if (cleanKey.includes('sunset') || cleanKey.includes('acoustic') || cleanKey.includes('tan ca')) {
    currentStorySources = createAcousticSunsetSynth(ctx, storyMasterGain);
  } else {
    // Mặc định: Lofi Night
    currentStorySources = createLofiNightSynth(ctx, storyMasterGain);
  }
};

export const isStoryMusicActive = () => Boolean(activePresetId);
export const getActiveStoryPresetId = () => activePresetId;
