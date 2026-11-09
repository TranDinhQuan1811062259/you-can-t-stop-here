import React, { useState, useEffect, useRef } from 'react';
import { playClickSound } from '../../utils/soundEffects';
import { AnonymousWhisperWall } from './AnonymousWhisperWall';
import {
  getFabPos,
  saveFabPos,
  resolveAntiCollision,
  snapToNearestEdge,
  ensureInBounds,
} from '../../utils/floatingButtonManager';

// =============================================================================
// DANH SÁCH 8 BÀI NHẠC CHỮA LÀNH ĐA DẠNG CỦA TRẠM RADIO ĐÊM MUỘN
// =============================================================================
export const RADIO_TRACKS = [
  {
    id: 'track_1',
    title: 'Giai Điệu Đêm Mưa Hà Nội',
    artist: 'Freedom Lo-Fi Studio',
    genre: 'LO-FI JAZZ',
    icon: '🌧️',
    themeColor: '#818cf8',
    glowColor: 'rgba(129, 140, 248, 0.45)',
    tagline: 'Mưa rơi mái hiên • Hợp âm Rhodes êm dịu • Đĩa than vinyl lách tách',
    duration: '3:45',
    engine: 'lofi_rain',
  },
  {
    id: 'track_2',
    title: 'Hoàng Hôn Trên Biển Vắng',
    artist: 'Acoustic Waves',
    genre: 'ACOUSTIC',
    icon: '🌊',
    themeColor: '#38bdf8',
    glowColor: 'rgba(56, 189, 248, 0.45)',
    tagline: 'Sóng biển đại dương vỗ bờ dạt dào • Tiếng guitar acoustic mộc mạc',
    duration: '4:12',
    engine: 'ocean_sunset',
  },
  {
    id: 'track_3',
    title: 'Đà Lạt Đêm Sương & Lửa Trại',
    artist: 'Pine Woods Ensemble',
    genre: 'NATURE CAMP',
    icon: '🌲',
    themeColor: '#34d399',
    glowColor: 'rgba(52, 211, 153, 0.45)',
    tagline: 'Củi tí tách lốp bốp • Gió thông rì rào • Dế mèn đêm du dương ru ngủ',
    duration: '4:30',
    engine: 'pine_campfire',
  },
  {
    id: 'track_4',
    title: 'Góc Quán Quen Chiều Mưa',
    artist: 'Coffee & Chill Beats',
    genre: 'CHILL BEAT',
    icon: '☕',
    themeColor: '#fbbf24',
    glowColor: 'rgba(251, 191, 36, 0.45)',
    tagline: 'Mưa gõ mái kính • Ly cà phê ấm • Nhịp beat downtempo thư thái',
    duration: '3:50',
    engine: 'rainy_cafe',
  },
  {
    id: 'track_5',
    title: 'Khúc Ru Vũ Trụ Alpha 432Hz',
    artist: 'Deep Sleep Frequency',
    genre: 'HEALING 432Hz',
    icon: '🌌',
    themeColor: '#c084fc',
    glowColor: 'rgba(192, 132, 252, 0.45)',
    tagline: 'Tần số vàng 432Hz • Sóng não Alpha tĩnh tâm • Chuông vũ trụ sâu lắng',
    duration: '5:00',
    engine: 'deep_space_432',
  },
  {
    id: 'track_6',
    title: 'Khu Vườn Ban Mai & Tiếng Chim',
    artist: 'Morning Dew Garden',
    genre: 'MORNING ZEN',
    icon: '🌸',
    themeColor: '#f472b6',
    glowColor: 'rgba(244, 114, 182, 0.45)',
    tagline: 'Tiếng chim lảnh lót ban mai • Gió sớm trong lành • Giai điệu hạc cầm Harp',
    duration: '3:35',
    engine: 'morning_zen',
  },
  {
    id: 'track_7',
    title: 'Chiếc Lá Thu Rơi Muộn',
    artist: 'Autumn Nostalgia',
    genre: 'CELLO NOSTALGIA',
    icon: '🍂',
    themeColor: '#f97316',
    glowColor: 'rgba(249, 115, 22, 0.45)',
    tagline: 'Tiếng cello trầm ấm da diết • Tiếng lá xào xạc • Trầm tư hoài niệm',
    duration: '4:20',
    engine: 'autumn_cello',
  },
  {
    id: 'track_8',
    title: 'Ngọn Nến Đêm Thanh Thản',
    artist: 'Tibetan Peace Project',
    genre: 'MEDITATION',
    icon: '🕯️',
    themeColor: '#a78bfa',
    glowColor: 'rgba(167, 139, 250, 0.45)',
    tagline: 'Chuông xoay Tây Tạng ngân vang • Hơi thở đều đặn • Buông bỏ mọi âu lo',
    duration: '5:30',
    engine: 'zen_candle',
  },
];

// =============================================================================
// WEB AUDIO API SOUND ENGINES
// =============================================================================
let radioAudioCtx = null;
let isRadioPlayingInternal = false;
let masterGainNode = null;
let cleanupCurrentEngineFn = null;

const ensureAudioContext = () => {
  const AudioContextClass = window.AudioContext || window.webkitAudioContext;
  if (!AudioContextClass) return null;
  if (!radioAudioCtx || radioAudioCtx.state === 'closed') {
    radioAudioCtx = new AudioContextClass();
  }
  if (radioAudioCtx.state === 'suspended') {
    radioAudioCtx.resume().catch(() => {});
  }
  return radioAudioCtx;
};

// --- ENGINE 1: LO-FI RAIN ---
const startLofiRainEngine = (ctx, masterNode) => {
  const node = ctx.createGain();
  node.gain.setValueAtTime(1, ctx.currentTime);
  node.connect(masterNode);

  let rainSource = null;
  try {
    const bufferSize = ctx.sampleRate * 2;
    const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = noiseBuffer.getChannelData(0);
    let b0 = 0, b1 = 0, b2 = 0;
    for (let i = 0; i < bufferSize; i++) {
      const white = Math.random() * 2 - 1;
      b0 = 0.99886 * b0 + white * 0.0555179;
      b1 = 0.99332 * b1 + white * 0.0750759;
      b2 = 0.96900 * b2 + white * 0.1538520;
      data[i] = (b0 + b1 + b2 + white * 0.5362) * 0.05;
    }
    rainSource = ctx.createBufferSource();
    rainSource.buffer = noiseBuffer;
    rainSource.loop = true;
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(650, ctx.currentTime);
    const rainGain = ctx.createGain();
    rainGain.gain.setValueAtTime(0.065, ctx.currentTime);
    rainSource.connect(filter);
    filter.connect(rainGain);
    rainGain.connect(node);
    rainSource.start();
  } catch (e) {}

  let vinylSource = null;
  try {
    const bufferSize = ctx.sampleRate * 1.5;
    const crackleBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = crackleBuffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      // Tiếng đĩa than rất thưa và nhẹ nhàng, không gây rè hay chát tai
      data[i] = Math.random() > 0.998 ? (Math.random() * 2 - 1) * 0.08 : 0;
    }
    vinylSource = ctx.createBufferSource();
    vinylSource.buffer = crackleBuffer;
    vinylSource.loop = true;
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(1200, ctx.currentTime);
    const vinylGain = ctx.createGain();
    vinylGain.gain.setValueAtTime(0.016, ctx.currentTime);
    vinylSource.connect(filter);
    filter.connect(vinylGain);
    vinylGain.connect(node);
    vinylSource.start();
  } catch (e) {}

  const chords = [
    [146.83, 220.0, 277.18, 369.99], // Dmaj7
    [185.0, 220.0, 277.18, 369.99],  // F#m7
    [196.0, 246.94, 293.66, 392.0],  // Gmaj7
    [220.0, 277.18, 329.63, 440.0],  // A7
    [246.94, 293.66, 369.99, 440.0], // Bm9
    [164.81, 246.94, 293.66, 392.0], // Em7
  ];
  let chordIdx = 0;
  const playChord = () => {
    if (!ctx || ctx.state === 'closed') return;
    const notes = chords[chordIdx % chords.length];
    chordIdx++;
    notes.forEach((freq, i) => {
      const now = ctx.currentTime + i * 0.08;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now);
      gain.gain.setValueAtTime(0.001, now);
      gain.gain.linearRampToValueAtTime(0.05, now + 0.18);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 3.2);
      osc.connect(gain);
      gain.connect(node);
      osc.start(now);
      osc.stop(now + 3.4);
    });
  };
  playChord();
  const timer = setInterval(playChord, 3800);

  return () => {
    clearInterval(timer);
    try {
      if (rainSource) { rainSource.stop(); rainSource.disconnect(); }
      if (vinylSource) { vinylSource.stop(); vinylSource.disconnect(); }
      node.disconnect();
    } catch (e) {}
  };
};

// --- ENGINE 2: OCEAN GUITAR ---
const startOceanGuitarEngine = (ctx, masterNode) => {
  const node = ctx.createGain();
  node.gain.setValueAtTime(1, ctx.currentTime);
  node.connect(masterNode);

  let waveSource = null;
  let waveLfo = null;
  try {
    const bufferSize = ctx.sampleRate * 4;
    const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = noiseBuffer.getChannelData(0);
    let last = 0;
    for (let i = 0; i < bufferSize; i++) {
      const white = Math.random() * 2 - 1;
      data[i] = (last + 0.02 * white) / 1.02;
      last = data[i];
      data[i] *= 3.5;
    }
    waveSource = ctx.createBufferSource();
    waveSource.buffer = noiseBuffer;
    waveSource.loop = true;

    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(320, ctx.currentTime);

    const waveGain = ctx.createGain();
    waveGain.gain.setValueAtTime(0.18, ctx.currentTime);

    waveLfo = ctx.createOscillator();
    waveLfo.type = 'sine';
    waveLfo.frequency.setValueAtTime(0.13, ctx.currentTime);

    const lfoFilterGain = ctx.createGain();
    lfoFilterGain.gain.setValueAtTime(240, ctx.currentTime);
    waveLfo.connect(lfoFilterGain);
    lfoFilterGain.connect(filter.frequency);

    const lfoGainGain = ctx.createGain();
    lfoGainGain.gain.setValueAtTime(0.1, ctx.currentTime);
    waveLfo.connect(lfoGainGain);
    lfoGainGain.connect(waveGain.gain);

    waveSource.connect(filter);
    filter.connect(waveGain);
    waveGain.connect(node);

    waveSource.start();
    waveLfo.start();
  } catch (e) {}

  const guitarChords = [
    [196.0, 246.94, 293.66, 369.99, 440.0],
    [130.81, 196.0, 246.94, 293.66, 329.63],
    [164.81, 196.0, 246.94, 293.66, 392.0],
    [146.83, 220.0, 293.66, 392.0, 440.0],
    [110.0, 164.81, 220.0, 261.63, 329.63],
  ];
  let chordIdx = 0;
  const playGuitarPattern = () => {
    if (!ctx || ctx.state === 'closed') return;
    const notes = guitarChords[chordIdx % guitarChords.length];
    chordIdx++;
    [0, 1, 2, 3, 2, 1].forEach((noteIdx, step) => {
      const freq = notes[noteIdx % notes.length];
      const now = ctx.currentTime + step * 0.22;
      const osc = ctx.createOscillator();
      const osc2 = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, now);

      osc2.type = 'sine';
      osc2.frequency.setValueAtTime(freq * 2, now);

      gain.gain.setValueAtTime(0.001, now);
      gain.gain.linearRampToValueAtTime(0.048, now + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 1.6);

      osc.connect(gain);
      osc2.connect(gain);
      gain.connect(node);

      osc.start(now);
      osc2.start(now);
      osc.stop(now + 1.7);
      osc2.stop(now + 1.7);
    });
  };
  playGuitarPattern();
  const timer = setInterval(playGuitarPattern, 4200);

  return () => {
    clearInterval(timer);
    try {
      if (waveSource) { waveSource.stop(); waveSource.disconnect(); }
      if (waveLfo) { waveLfo.stop(); waveLfo.disconnect(); }
      node.disconnect();
    } catch (e) {}
  };
};

// --- ENGINE 3: PINE CAMPFIRE ---
const startCampfireEngine = (ctx, masterNode) => {
  const node = ctx.createGain();
  node.gain.setValueAtTime(1, ctx.currentTime);
  node.connect(masterNode);

  let windSource = null;
  try {
    const bufferSize = ctx.sampleRate * 2;
    const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = noiseBuffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) data[i] = (Math.random() * 2 - 1) * 0.06;
    windSource = ctx.createBufferSource();
    windSource.buffer = noiseBuffer;
    windSource.loop = true;
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(280, ctx.currentTime);
    const windGain = ctx.createGain();
    windGain.gain.setValueAtTime(0.08, ctx.currentTime);
    windSource.connect(filter);
    filter.connect(windGain);
    windGain.connect(node);
    windSource.start();
  } catch (e) {}

  let crackleSource = null;
  try {
    const bufferSize = ctx.sampleRate * 2;
    const fireBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = fireBuffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      // Đốm lửa nổ tí tách rất êm ái, thưa thớt, không bị rè
      data[i] = Math.random() > 0.998 ? (Math.random() * 2 - 1) * 0.12 : (Math.random() * 2 - 1) * 0.005;
    }
    crackleSource = ctx.createBufferSource();
    crackleSource.buffer = fireBuffer;
    crackleSource.loop = true;
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(1100, ctx.currentTime);
    const fireGain = ctx.createGain();
    fireGain.gain.setValueAtTime(0.022, ctx.currentTime);
    crackleSource.connect(filter);
    filter.connect(fireGain);
    fireGain.connect(node);
    crackleSource.start();
  } catch (e) {}

  const kalimbaNotes = [293.66, 329.63, 392.0, 440.0, 493.88, 587.33];
  let noteIdx = 0;
  const playKalimba = () => {
    if (!ctx || ctx.state === 'closed') return;
    const chosen = [kalimbaNotes[noteIdx % kalimbaNotes.length], kalimbaNotes[(noteIdx + 2) % kalimbaNotes.length]];
    noteIdx += 1;
    chosen.forEach((f, i) => {
      const now = ctx.currentTime + i * 0.35;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(f, now);
      gain.gain.setValueAtTime(0.001, now);
      gain.gain.linearRampToValueAtTime(0.045, now + 0.03);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 2.5);
      osc.connect(gain);
      gain.connect(node);
      osc.start(now);
      osc.stop(now + 2.6);
    });
  };
  playKalimba();
  const timer = setInterval(playKalimba, 4800);

  return () => {
    clearInterval(timer);
    try {
      if (windSource) { windSource.stop(); windSource.disconnect(); }
      if (crackleSource) { crackleSource.stop(); crackleSource.disconnect(); }
      node.disconnect();
    } catch (e) {}
  };
};

// --- ENGINE 4: RAINY CAFE ---
const startRainyCafeEngine = (ctx, masterNode) => {
  const node = ctx.createGain();
  node.gain.setValueAtTime(1, ctx.currentTime);
  node.connect(masterNode);

  let rainSource = null;
  try {
    const bufferSize = ctx.sampleRate * 2;
    const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = noiseBuffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) data[i] = (Math.random() * 2 - 1) * 0.14;
    rainSource = ctx.createBufferSource();
    rainSource.buffer = noiseBuffer;
    rainSource.loop = true;
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(1100, ctx.currentTime);
    const rainGain = ctx.createGain();
    rainGain.gain.setValueAtTime(0.18, ctx.currentTime);
    rainSource.connect(filter);
    filter.connect(rainGain);
    rainGain.connect(node);
    rainSource.start();
  } catch (e) {}

  const cafeChords = [
    [207.65, 261.63, 311.13, 392.0],
    [174.61, 207.65, 261.63, 311.13],
    [116.54, 174.61, 233.08, 277.18],
    [155.56, 196.0, 233.08, 349.23],
  ];
  let chordIdx = 0;
  let beatStep = 0;

  const timer = setInterval(() => {
    if (!ctx || ctx.state === 'closed') return;
    const now = ctx.currentTime;
    const isKick = beatStep % 4 === 0 || beatStep % 4 === 2;

    if (isKick) {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(110, now);
      osc.frequency.exponentialRampToValueAtTime(42, now + 0.16);
      gain.gain.setValueAtTime(0.09, now);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.2);
      osc.connect(gain);
      gain.connect(node);
      osc.start(now);
      osc.stop(now + 0.22);
    }

    if (beatStep % 4 === 0) {
      const notes = cafeChords[chordIdx % cafeChords.length];
      chordIdx++;
      notes.forEach((f, i) => {
        const chordNow = now + i * 0.06;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(f, chordNow);
        gain.gain.setValueAtTime(0.001, chordNow);
        gain.gain.linearRampToValueAtTime(0.055, chordNow + 0.14);
        gain.gain.exponentialRampToValueAtTime(0.0001, chordNow + 2.8);
        osc.connect(gain);
        gain.connect(node);
        osc.start(chordNow);
        osc.stop(chordNow + 3.0);
      });
    }
    beatStep++;
  }, 833);

  return () => {
    clearInterval(timer);
    try {
      if (rainSource) { rainSource.stop(); rainSource.disconnect(); }
      node.disconnect();
    } catch (e) {}
  };
};

// --- ENGINE 5: DEEP SPACE 432Hz ---
const startDeepSpaceEngine = (ctx, masterNode) => {
  const node = ctx.createGain();
  node.gain.setValueAtTime(1, ctx.currentTime);
  node.connect(masterNode);

  let leftOsc = null;
  let rightOsc = null;
  try {
    const merger = ctx.createChannelMerger(2);

    leftOsc = ctx.createOscillator();
    leftOsc.type = 'sine';
    leftOsc.frequency.setValueAtTime(432, ctx.currentTime);
    const leftGain = ctx.createGain();
    leftGain.gain.setValueAtTime(0.045, ctx.currentTime);
    leftOsc.connect(leftGain);
    leftGain.connect(merger, 0, 0);

    rightOsc = ctx.createOscillator();
    rightOsc.type = 'sine';
    rightOsc.frequency.setValueAtTime(442, ctx.currentTime);
    const rightGain = ctx.createGain();
    rightGain.gain.setValueAtTime(0.045, ctx.currentTime);
    rightOsc.connect(rightGain);
    rightGain.connect(merger, 0, 1);

    merger.connect(node);
    leftOsc.start();
    rightOsc.start();
  } catch (e) {}

  const bowlTimer = setInterval(() => {
    if (!ctx || ctx.state === 'closed') return;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(864, now);
    gain.gain.setValueAtTime(0.001, now);
    gain.gain.linearRampToValueAtTime(0.04, now + 0.15);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 4.8);
    osc.connect(gain);
    gain.connect(node);
    osc.start(now);
    osc.stop(now + 5.0);
  }, 5200);

  return () => {
    clearInterval(bowlTimer);
    try {
      if (leftOsc) { leftOsc.stop(); leftOsc.disconnect(); }
      if (rightOsc) { rightOsc.stop(); rightOsc.disconnect(); }
      node.disconnect();
    } catch (e) {}
  };
};

// --- ENGINE 6: MORNING ZEN HARP ---
const startMorningZenEngine = (ctx, masterNode) => {
  const node = ctx.createGain();
  node.gain.setValueAtTime(1, ctx.currentTime);
  node.connect(masterNode);

  const harpNotes = [261.63, 293.66, 329.63, 392.0, 440.0, 523.25, 587.33, 659.25];
  let step = 0;
  const timer = setInterval(() => {
    if (!ctx || ctx.state === 'closed') return;
    const now = ctx.currentTime;
    const f = harpNotes[step % harpNotes.length];
    step++;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(f, now);
    gain.gain.setValueAtTime(0.001, now);
    gain.gain.linearRampToValueAtTime(0.045, now + 0.04);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 2.2);
    osc.connect(gain);
    gain.connect(node);
    osc.start(now);
    osc.stop(now + 2.3);
  }, 1100);

  return () => {
    clearInterval(timer);
    node.disconnect();
  };
};

// --- ENGINE 7: AUTUMN CELLO ---
const startAutumnCelloEngine = (ctx, masterNode) => {
  const node = ctx.createGain();
  node.gain.setValueAtTime(1, ctx.currentTime);
  node.connect(masterNode);

  const celloNotes = [130.81, 146.83, 164.81, 196.0, 220.0];
  let step = 0;
  const timer = setInterval(() => {
    if (!ctx || ctx.state === 'closed') return;
    const now = ctx.currentTime;
    const f = celloNotes[step % celloNotes.length];
    step++;

    const osc = ctx.createOscillator();
    const filter = ctx.createBiquadFilter();
    const gain = ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(f, now);

    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(450, now);

    gain.gain.setValueAtTime(0.001, now);
    gain.gain.linearRampToValueAtTime(0.05, now + 0.4);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 3.4);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(node);
    osc.start(now);
    osc.stop(now + 3.6);
  }, 3600);

  return () => {
    clearInterval(timer);
    node.disconnect();
  };
};

// --- ENGINE 8: ZEN TIBETAN BOWL ---
const startZenCandleEngine = (ctx, masterNode) => {
  const node = ctx.createGain();
  node.gain.setValueAtTime(1, ctx.currentTime);
  node.connect(masterNode);

  const bowlNotes = [216, 432, 648];
  let idx = 0;
  const timer = setInterval(() => {
    if (!ctx || ctx.state === 'closed') return;
    const now = ctx.currentTime;
    const baseF = bowlNotes[idx % bowlNotes.length];
    idx++;

    [1, 2.01].forEach((mult) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(baseF * mult, now);
      gain.gain.setValueAtTime(0.001, now);
      gain.gain.linearRampToValueAtTime(0.04, now + 0.2);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 5.0);
      osc.connect(gain);
      gain.connect(node);
      osc.start(now);
      osc.stop(now + 5.2);
    });
  }, 4400);

  return () => {
    clearInterval(timer);
    node.disconnect();
  };
};

const switchTrackEngine = (engineType) => {
  if (cleanupCurrentEngineFn) {
    cleanupCurrentEngineFn();
    cleanupCurrentEngineFn = null;
  }
  const ctx = ensureAudioContext();
  if (!isRadioPlayingInternal || !ctx || !masterGainNode) return;

  if (engineType === 'ocean_sunset') {
    cleanupCurrentEngineFn = startOceanGuitarEngine(ctx, masterGainNode);
  } else if (engineType === 'pine_campfire') {
    cleanupCurrentEngineFn = startCampfireEngine(ctx, masterGainNode);
  } else if (engineType === 'rainy_cafe') {
    cleanupCurrentEngineFn = startRainyCafeEngine(ctx, masterGainNode);
  } else if (engineType === 'deep_space_432') {
    cleanupCurrentEngineFn = startDeepSpaceEngine(ctx, masterGainNode);
  } else if (engineType === 'morning_zen') {
    cleanupCurrentEngineFn = startMorningZenEngine(ctx, masterGainNode);
  } else if (engineType === 'autumn_cello') {
    cleanupCurrentEngineFn = startAutumnCelloEngine(ctx, masterGainNode);
  } else if (engineType === 'zen_candle') {
    cleanupCurrentEngineFn = startZenCandleEngine(ctx, masterGainNode);
  } else {
    cleanupCurrentEngineFn = startLofiRainEngine(ctx, masterGainNode);
  }
};

const startRadioEngine = (engineType = 'lofi_rain', volume = 0.5) => {
  const ctx = ensureAudioContext();
  if (!ctx) return;

  if (!masterGainNode) {
    masterGainNode = ctx.createGain();
    masterGainNode.gain.setValueAtTime(volume * 0.8, ctx.currentTime);

    // Bộ lọc Lowpass làm mịn toàn dải, triệt tiêu mọi tạp âm số chát tai
    const masterFilter = ctx.createBiquadFilter();
    masterFilter.type = 'lowpass';
    masterFilter.frequency.setValueAtTime(4200, ctx.currentTime);

    // Bộ nén Dynamics Compressor chuẩn phòng thu - chống tuyệt đối rè loa / clipping
    const compressor = ctx.createDynamicsCompressor();
    compressor.threshold.setValueAtTime(-18, ctx.currentTime);
    compressor.knee.setValueAtTime(12, ctx.currentTime);
    compressor.ratio.setValueAtTime(4.2, ctx.currentTime);
    compressor.attack.setValueAtTime(0.003, ctx.currentTime);
    compressor.release.setValueAtTime(0.25, ctx.currentTime);

    masterGainNode.connect(masterFilter);
    masterFilter.connect(compressor);
    compressor.connect(ctx.destination);
  } else {
    masterGainNode.gain.setValueAtTime(volume * 0.8, ctx.currentTime);
  }

  isRadioPlayingInternal = true;
  switchTrackEngine(engineType);
};

const stopRadioEngine = () => {
  if (cleanupCurrentEngineFn) {
    cleanupCurrentEngineFn();
    cleanupCurrentEngineFn = null;
  }
  if (radioAudioCtx) {
    try {
      radioAudioCtx.close();
    } catch (e) {}
    radioAudioCtx = null;
  }
  masterGainNode = null;
  isRadioPlayingInternal = false;
};

const setRadioEngineVolume = (vol) => {
  if (masterGainNode && radioAudioCtx) {
    masterGainNode.gain.setValueAtTime(vol, radioAudioCtx.currentTime);
  }
};

const DEFAULT_THOUGHTS = [
  'Dù hôm nay có mệt mỏi thế nào, bạn cũng đã làm rất tốt rồi! Nghỉ ngơi nhé.',
  'Bật nhạc lên, hít một hơi thật sâu, ngày mai sẽ dịu dàng hơn với bạn.',
  'Gửi một cái ôm ấm áp đến những bạn đang chạy deadline đêm muộn lúc này!',
  'Đừng so sánh hành trình của mình với người khác. Mỗi bông hoa nở vào một mùa riêng.',
  'Ngồi nghe tiếng mưa lách tách, mọi muộn phiền ngoài kia tạm thời gác lại...',
  'Nhớ uống một ngụm nước ấm và vươn vai thư giãn mắt nhé!',
];

export const LateNightRadioModal = ({ isOpen, onClose }) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [volume, setVolume] = useState(0.5);
  const [isMiniMode, setIsMiniMode] = useState(false);
  const [internalOpen, setInternalOpen] = useState(false);
  const [showPlaylistDrawer, setShowPlaylistDrawer] = useState(false);
  const [activeModalTab, setActiveModalTab] = useState('radio'); // 'radio' | 'whispers'

  // Chỉ số bài hát đang phát (0 -> 7)
  const [trackIndex, setTrackIndex] = useState(() => {
    try {
      const saved = localStorage.getItem('freedom_radio_track_idx');
      if (saved !== null) {
        const val = parseInt(saved, 10);
        if (!isNaN(val) && val >= 0 && val < RADIO_TRACKS.length) return val;
      }
    } catch (e) {}
    return 0;
  });

  const activeTrack = RADIO_TRACKS[trackIndex] || RADIO_TRACKS[0];

  // Tính năng Voice đọc lời nhắn chuẩn tiếng Việt (Dual-Engine TTS)
  const [isVoiceEnabled, setIsVoiceEnabled] = useState(() => {
    try {
      return localStorage.getItem('freedom_radio_voice_enabled') === 'true';
    } catch (e) {
      return true;
    }
  });
  const [isSpeaking, setIsSpeaking] = useState(false);

  // Lựa chọn Giới tính & Vùng miền cho Voice đọc lời nhắn
  const [voiceGender, setVoiceGender] = useState(() => {
    try {
      return localStorage.getItem('freedom_radio_voice_gender') || 'female';
    } catch (e) {
      return 'female';
    }
  });

  const [voiceRegion, setVoiceRegion] = useState(() => {
    try {
      return localStorage.getItem('freedom_radio_voice_region') || 'north';
    } catch (e) {
      return 'north';
    }
  });

  const ttsAudioRef = useRef(null);

  const [thoughts, setThoughts] = useState(() => {
    try {
      const saved = localStorage.getItem('freedom_radio_thoughts');
      if (saved) return JSON.parse(saved);
    } catch (e) {}
    return DEFAULT_THOUGHTS;
  });
  const [myThoughtInput, setMyThoughtInput] = useState('');
  const [activeThoughtIndex, setActiveThoughtIndex] = useState(0);

  // Toạ độ & Kéo thả di chuyển tự do cho Mini Pill
  const [btnPos, setBtnPos] = useState(() => {
    const raw = getFabPos('radio');
    return resolveAntiCollision('radio', raw, true);
  });
  const [isDragging, setIsDragging] = useState(false);
  const dragStartRef = useRef({ mouseX: 0, mouseY: 0, btnX: 0, btnY: 0 });
  const hasMovedRef = useRef(false);
  const btnRef = useRef(null);

  // Tính số lượng người cùng nghe
  const getListenersCount = () => {
    const hour = new Date().getHours();
    if (hour >= 0 && hour <= 4) return 18 + hour * 3 + Math.floor(Math.sin(Date.now() / 10000) * 4);
    if (hour >= 5 && hour <= 8) return 35 + hour * 2;
    if (hour >= 9 && hour <= 17) return 65 + (hour % 10);
    return 85 + hour * 2;
  };
  const [listenerCount, setListenerCount] = useState(getListenersCount());

  // =========================================================================
  // DỪNG GIỌNG ĐỌC VÀ KHÔI PHỤC ÂM LƯỢNG NHẠC
  // =========================================================================
  const stopSpeaking = () => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      try {
        window.speechSynthesis.cancel();
      } catch (_) {}
    }
    if (ttsAudioRef.current) {
      try {
        ttsAudioRef.current.pause();
        ttsAudioRef.current.removeAttribute('src');
        ttsAudioRef.current.load();
      } catch (_) {}
      ttsAudioRef.current = null;
    }
    setIsSpeaking(false);
    if (masterGainNode && radioAudioCtx) {
      try {
        masterGainNode.gain.setValueAtTime(volume, radioAudioCtx.currentTime);
      } catch (_) {}
    }
  };

  const handleToggleVoiceGender = (newGender) => {
    playClickSound();
    setVoiceGender(newGender);
    try {
      localStorage.setItem('freedom_radio_voice_gender', newGender);
    } catch (_) {}
    stopSpeaking();
  };

  const handleToggleVoiceRegion = (newRegion) => {
    playClickSound();
    setVoiceRegion(newRegion);
    try {
      localStorage.setItem('freedom_radio_voice_region', newRegion);
    } catch (_) {}
    stopSpeaking();
  };

  // =========================================================================
  // VOICE ĐỌC LỜI NHẮN ĐỘNG VIÊN CHUẨN TIẾNG VIỆT 100% (TTS WITH AUDIO DUCKING)
  // =========================================================================
  const speakCurrentThought = (textToRead) => {
    stopSpeaking();

    const rawText = textToRead || thoughts[activeThoughtIndex] || DEFAULT_THOUGHTS[0];
    const cleanText = rawText.replace(/^[✨🌙☕🌿🌧️💡🍂🕯️🌊🌌\s]+/, '').trim();
    if (!cleanText) return;

    // Audio Ducking: Khi phát thanh viên đọc, hạ nhẹ âm lượng nhạc xuống 25%
    if (masterGainNode && radioAudioCtx) {
      try {
        masterGainNode.gain.setValueAtTime(volume * 0.25, radioAudioCtx.currentTime);
      } catch (_) {}
    }
    setIsSpeaking(true);

    const onSpeechFinished = () => {
      setIsSpeaking(false);
      if (masterGainNode && radioAudioCtx) {
        try {
          masterGainNode.gain.setValueAtTime(volume, radioAudioCtx.currentTime);
        } catch (_) {}
      }
    };

    // 1. Kiểm tra xem thiết bị có giọng tiếng Việt thực sự hay không
    let nativeViVoice = null;
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      const voices = window.speechSynthesis.getVoices() || [];
      const viVoices = voices.filter(
        (v) =>
          v.lang.toLowerCase().startsWith('vi') ||
          v.lang.toLowerCase().includes('vi-vn') ||
          v.name.toLowerCase().includes('vietnam') ||
          v.name.toLowerCase().includes('tiếng việt')
      );

      if (viVoices.length > 0) {
        if (voiceGender === 'male') {
          nativeViVoice =
            viVoices.find(
              (v) =>
                v.name.toLowerCase().includes('nam') ||
                v.name.toLowerCase().includes('minh') ||
                v.name.toLowerCase().includes('male')
            ) || viVoices[0];
        } else {
          nativeViVoice =
            viVoices.find(
              (v) =>
                v.name.toLowerCase().includes('hoaimy') ||
                v.name.toLowerCase().includes('mai') ||
                v.name.toLowerCase().includes('female')
            ) || viVoices[0];
        }
      }
    }

    if (nativeViVoice && 'speechSynthesis' in window) {
      // Thiết bị CÓ giọng đọc tiếng Việt bản địa: Dùng Web Speech API với tinh chỉnh chuẩn
      const utterance = new SpeechSynthesisUtterance(cleanText);
      utterance.voice = nativeViVoice;
      utterance.lang = 'vi-VN';

      if (voiceGender === 'male') {
        utterance.pitch = voiceRegion === 'north' ? 0.82 : 0.76;
        utterance.rate = voiceRegion === 'north' ? 0.88 : 0.94;
      } else {
        utterance.pitch = voiceRegion === 'north' ? 1.08 : 1.15;
        utterance.rate = voiceRegion === 'north' ? 0.88 : 0.92;
      }

      utterance.onend = onSpeechFinished;
      utterance.onerror = onSpeechFinished;

      try {
        window.speechSynthesis.speak(utterance);
      } catch (_) {
        onSpeechFinished();
      }
    } else {
      // Thiết bị KHÔNG CÓ giọng tiếng Việt (Windows mặc định tiếng Anh David/Zira):
      // Tuyệt đối KHÔNG gọi Web Speech vì sẽ phát âm lơ lớ kiểu Tây rất khó chịu!
      // Sử dụng Google Natural Vietnamese Stream phát âm 100% chuẩn tiếng Việt!
      try {
        const encoded = encodeURIComponent(cleanText.slice(0, 180));
        const audioUrl = `https://translate.google.com/translate_tts?ie=UTF-8&tl=vi&client=tw-ob&q=${encoded}`;
        const audio = new Audio(audioUrl);
        ttsAudioRef.current = audio;

        if (voiceGender === 'male') {
          // Nam: cho phép hạ cao độ (preservesPitch = false) để tạo chất giọng nam trầm ấm
          audio.preservesPitch = false;
          audio.playbackRate = voiceRegion === 'north' ? 0.88 : 0.92;
        } else {
          // Nữ: giữ cao độ tự nhiên trong trẻo, thanh lịch
          audio.preservesPitch = true;
          audio.playbackRate = voiceRegion === 'north' ? 0.95 : 1.0;
        }

        audio.onended = onSpeechFinished;
        audio.onerror = () => {
          onSpeechFinished();
        };

        audio.play().catch(() => {
          onSpeechFinished();
        });
      } catch (_) {
        onSpeechFinished();
      }
    }
  };

  // Tự động xoay tua lời nhắn mỗi 8s, nếu bật voice thì tự động đọc
  useEffect(() => {
    const timer = setInterval(() => {
      setListenerCount(getListenersCount());
      setActiveThoughtIndex((prev) => {
        const nextIdx = (prev + 1) % thoughts.length;
        if (isVoiceEnabled && isPlaying) {
          setTimeout(() => speakCurrentThought(thoughts[nextIdx]), 600);
        }
        return nextIdx;
      });
    }, 8500);
    return () => clearInterval(timer);
  }, [thoughts.length, isVoiceEnabled, isPlaying]);

  // Giữ mini pill trong màn hình khi thay đổi kích thước cửa sổ
  useEffect(() => {
    const handleResize = () => {
      setBtnPos((prev) => {
        const bounded = ensureInBounds('radio', prev);
        const resolved = resolveAntiCollision('radio', bounded, true);
        saveFabPos('radio', resolved);
        return resolved;
      });
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Chống va chạm với các nút khác
  useEffect(() => {
    const handleRecheckCollision = (e) => {
      if (e?.detail?.type === 'radio') return;
      setBtnPos((curr) => {
        const safe = resolveAntiCollision('radio', curr, true);
        if (safe.x !== curr.x || safe.y !== curr.y) {
          saveFabPos('radio', safe);
          return safe;
        }
        return curr;
      });
    };
    window.addEventListener('freedom_fab_pos_changed', handleRecheckCollision);
    window.addEventListener('freedom_festive_mascot_updated', handleRecheckCollision);
    return () => {
      window.removeEventListener('freedom_fab_pos_changed', handleRecheckCollision);
      window.removeEventListener('freedom_festive_mascot_updated', handleRecheckCollision);
    };
  }, []);

  // Dọn dẹp âm thanh khi unmount
  useEffect(() => {
    return () => {
      stopSpeaking();
    };
  }, []);

  // Bật/tắt phát nhạc
  const handleTogglePlay = () => {
    playClickSound();
    if (isPlaying) {
      stopRadioEngine();
      setIsPlaying(false);
      stopSpeaking();
    } else {
      startRadioEngine(activeTrack.engine, volume);
      setIsPlaying(true);
    }
  };

  // Chọn bài hát bất kỳ từ danh sách
  const handleSelectTrack = (index) => {
    playClickSound();
    stopSpeaking();
    setTrackIndex(index);
    try {
      localStorage.setItem('freedom_radio_track_idx', String(index));
    } catch (_) {}

    const track = RADIO_TRACKS[index] || RADIO_TRACKS[0];
    if (isPlaying) {
      switchTrackEngine(track.engine);
    } else {
      startRadioEngine(track.engine, volume);
      setIsPlaying(true);
    }
  };

  // Chuyển sang bài nhạc tiếp theo
  const handleNextTrack = () => {
    playClickSound();
    const nextIdx = (trackIndex + 1) % RADIO_TRACKS.length;
    handleSelectTrack(nextIdx);
  };

  // Quay lại bài nhạc trước đó
  const handlePrevTrack = () => {
    playClickSound();
    const prevIdx = (trackIndex - 1 + RADIO_TRACKS.length) % RADIO_TRACKS.length;
    handleSelectTrack(prevIdx);
  };

  const handleVolumeChange = (newVol) => {
    setVolume(newVol);
    setRadioEngineVolume(newVol);
  };

  const handleSendThought = (e) => {
    e.preventDefault();
    if (!myThoughtInput.trim()) return;
    playClickSound();

    const newThought = myThoughtInput.trim();
    const updated = [newThought, ...thoughts.slice(0, 15)];
    setThoughts(updated);
    setActiveThoughtIndex(0);
    setMyThoughtInput('');
    try {
      localStorage.setItem('freedom_radio_thoughts', JSON.stringify(updated));
    } catch (_) {}

    if (isVoiceEnabled && isPlaying) {
      speakCurrentThought(newThought);
    }
  };

  const handleToggleVoice = () => {
    playClickSound();
    setIsVoiceEnabled((prev) => {
      const next = !prev;
      try {
        localStorage.setItem('freedom_radio_voice_enabled', String(next));
      } catch (_) {}
      if (!next) {
        stopSpeaking();
      } else if (next && isPlaying) {
        speakCurrentThought();
      }
      return next;
    });
  };

  // Lắng nghe sự kiện mở Radio từ bất kỳ đâu để tự thoát chế độ thu nhỏ và mở modal ngay
  useEffect(() => {
    const handleOpenRadio = () => {
      setIsMiniMode(false);
      setInternalOpen(true);
    };
    window.addEventListener('freedom_open_radio', handleOpenRadio);
    return () => window.removeEventListener('freedom_open_radio', handleOpenRadio);
  }, []);

  useEffect(() => {
    if (isOpen) {
      setIsMiniMode(false);
      setInternalOpen(true);
    }
  }, [isOpen]);

  const isModalVisible = (isOpen || internalOpen) && !isMiniMode;

  const handleExpandRadio = () => {
    playClickSound();
    setIsMiniMode(false);
    setInternalOpen(true);
    window.dispatchEvent(new CustomEvent('freedom_open_radio'));
  };

  // Thu nhỏ thành thanh Mini Pill nổi (khi bấm ra ngoài hoặc bấm nút Thu nhỏ)
  const handleMinimize = () => {
    playClickSound();
    stopSpeaking();
    setIsMiniMode(true);
    setInternalOpen(false);
    if (onClose) onClose();
  };

  // Tắt hẳn trạm Radio (khi người dùng chủ động bấm nút ✕)
  const handleCloseFullModal = () => {
    playClickSound();
    stopSpeaking();
    stopRadioEngine();
    setIsPlaying(false);
    setIsMiniMode(false);
    setInternalOpen(false);
    if (onClose) onClose();
  };

  // Lắng nghe phím ESC để thu nhỏ êm ái thay vì tắt
  useEffect(() => {
    if (!isModalVisible) return;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        handleMinimize();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isModalVisible]);

  // =========================================================================
  // XỬ LÝ KÉO THẢ CHUẨN XÁC TOÀN CẦU (WINDOW LISTENERS - DI CHUYỂN MƯỢT MÀ 100%)
  // =========================================================================
  const handleStartDrag = (clientX, clientY) => {
    dragStartRef.current = {
      mouseX: clientX,
      mouseY: clientY,
      btnX: btnPos.x,
      btnY: btnPos.y,
    };
    hasMovedRef.current = false;
    setIsDragging(true);
  };

  const handleMouseDown = (e) => {
    if (e.button !== 0) return;
    if (e.target.closest('button')) return;
    handleStartDrag(e.clientX, e.clientY);
  };

  const handleTouchStart = (e) => {
    if (e.touches.length === 1) {
      if (e.target.closest('button')) return;
      handleStartDrag(e.touches[0].clientX, e.touches[0].clientY);
    }
  };

  useEffect(() => {
    if (!isDragging) return;

    const handleMouseMove = (e) => {
      const dx = e.clientX - dragStartRef.current.mouseX;
      const dy = e.clientY - dragStartRef.current.mouseY;

      if (Math.hypot(dx, dy) > 8) {
        hasMovedRef.current = true;
      }

      const nextX = dragStartRef.current.btnX + dx;
      const nextY = dragStartRef.current.btnY + dy;
      setBtnPos(ensureInBounds('radio', { x: nextX, y: nextY }));
    };

    const handleTouchMove = (e) => {
      if (e.touches.length === 1) {
        const dx = e.touches[0].clientX - dragStartRef.current.mouseX;
        const dy = e.touches[0].clientY - dragStartRef.current.mouseY;

        if (Math.hypot(dx, dy) > 8) {
          hasMovedRef.current = true;
        }

        const nextX = dragStartRef.current.btnX + dx;
        const nextY = dragStartRef.current.btnY + dy;
        setBtnPos(ensureInBounds('radio', { x: nextX, y: nextY }));
      }
    };

    const handleEndDrag = (e) => {
      setIsDragging(false);

      if (hasMovedRef.current) {
        setBtnPos((current) => {
          const snapped = snapToNearestEdge('radio', current);
          saveFabPos('radio', snapped);
          return snapped;
        });
        setTimeout(() => {
          hasMovedRef.current = false;
        }, 120);
      } else {
        // Người dùng nhấp/chạm mà không kéo -> Mở ngay toàn bộ modal Radio!
        if (e && e.target && e.target.closest && e.target.closest('button')) return;
        handleExpandRadio();
      }
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleEndDrag);
    window.addEventListener('touchmove', handleTouchMove);
    window.addEventListener('touchend', handleEndDrag);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleEndDrag);
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('touchend', handleEndDrag);
    };
  }, [isDragging]);

  const handlePillClick = (e) => {
    if (hasMovedRef.current) {
      hasMovedRef.current = false;
      return;
    }
    if (e && e.target && e.target.closest && e.target.closest('button')) return;
    handleExpandRadio();
  };

  const handleCloseMini = (e) => {
    e.stopPropagation();
    playClickSound();
    stopRadioEngine();
    setIsPlaying(false);
    setIsMiniMode(false);
    setInternalOpen(false);
    stopSpeaking();
    if (onClose) onClose();
  };

  // =========================================================================
  // GIAO DIỆN MINI FLOATING PILL (KHI THU NHỎ)
  // =========================================================================
  if (isMiniMode) {
    return (
      <aside
        ref={btnRef}
        className={`mini-lofi-radio-pill ${isDragging ? 'is-dragging' : ''}`}
        style={{
          position: 'fixed',
          left: `${btnPos.x}px`,
          top: `${btnPos.y}px`,
          right: 'auto',
          bottom: 'auto',
          width: '310px',
          maxWidth: 'calc(100vw - 32px)',
          boxSizing: 'border-box',
          zIndex: isDragging ? 99995 : 99980,
          cursor: isDragging ? 'grabbing' : 'grab',
          transition: isDragging
            ? 'none'
            : 'left 0.28s cubic-bezier(0.2, 0.8, 0.2, 1), top 0.28s cubic-bezier(0.2, 0.8, 0.2, 1), transform 0.2s, box-shadow 0.2s',
          touchAction: 'none',
          userSelect: 'none',
          WebkitUserSelect: 'none',
          '--station-accent': activeTrack.themeColor,
          '--station-glow': activeTrack.glowColor,
        }}
        onMouseDown={handleMouseDown}
        onTouchStart={handleTouchStart}
        onClick={handlePillClick}
        title={`[${trackIndex + 1}/${RADIO_TRACKS.length}] ${activeTrack.title} • Giữ và kéo để di chuyển tự do khắp màn hình!`}
        role="button"
        tabIndex={0}
      >
        {/* Nút cầm kéo tay cầm Drag Handle */}
        <span className="mini-radio-drag-handle" title="Giữ và kéo để di chuyển vị trí" style={{ flexShrink: 0 }}>
          <i className="fa-solid fa-grip-vertical" style={{ fontSize: '0.78rem', opacity: 0.7 }}></i>
        </span>

        {/* Icon & Số thứ tự bài */}
        <span
          className="mini-radio-station-icon"
          style={{
            fontSize: '1rem',
            animation: isPlaying ? 'pulseDot 1.4s infinite alternate' : 'none',
            display: 'inline-flex',
            alignItems: 'center',
            flexShrink: 0,
          }}
        >
          {activeTrack.icon}
        </span>

        {/* Tên bài hát & số thứ tự */}
        <span
          className="mini-radio-title-text"
          style={{
            flex: 1,
            minWidth: 0,
            whiteSpace: 'nowrap',
            fontWeight: 800,
            fontSize: '0.78rem',
            color: '#f8fafc',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}
        >
          {trackIndex + 1}. {activeTrack.title}
        </span>

        {/* Dải sóng nhạc mini */}
        <div style={{ display: 'flex', gap: '2px', alignItems: 'flex-end', height: '14px', margin: '0 1px', flexShrink: 0 }}>
          <span style={{ width: '2.5px', height: '11px', background: activeTrack.themeColor, borderRadius: '2px', animation: 'pulseDot 0.8s infinite alternate' }} />
          <span style={{ width: '2.5px', height: '6px', background: '#e0e7ff', borderRadius: '2px', animation: 'pulseDot 1.1s infinite alternate' }} />
          <span style={{ width: '2.5px', height: '13px', background: activeTrack.themeColor, borderRadius: '2px', animation: 'pulseDot 0.6s infinite alternate' }} />
        </div>

        {/* Cụm 4 nút điều khiển mini - Giữ vững không bị xô lệch */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', flexShrink: 0 }}>
          {/* Nút đổi bài tiếp theo (Next Track) */}
          <button
            type="button"
            className="mini-radio-action-btn"
            onClick={(e) => {
              e.stopPropagation();
              handleNextTrack();
            }}
            title="Chuyển sang bài nhạc tiếp theo"
            aria-label="Bài tiếp theo"
          >
            ⏭️
          </button>

          {/* Nút Tạm Dừng / Phát tiếp */}
          <button
            type="button"
            className="mini-radio-action-btn"
            onClick={(e) => {
              e.stopPropagation();
              handleTogglePlay();
            }}
            title={isPlaying ? 'Tạm dừng nhạc' : 'Phát tiếp'}
            aria-label="Tạm dừng hoặc phát"
          >
            {isPlaying ? '⏸' : '▶️'}
          </button>

          {/* Nút Phóng To / Mở Rộng toàn màn hình */}
          <button
            type="button"
            className="mini-radio-action-btn"
            onClick={(e) => {
              e.stopPropagation();
              handleExpandRadio();
            }}
            title="Mở rộng lại giao diện Trạm Radio"
            aria-label="Mở rộng"
          >
            🗖
          </button>

          {/* Nút Đóng / Tắt Mini Player */}
          <button
            type="button"
            className="mini-radio-action-btn mini-radio-close-btn"
            onClick={handleCloseMini}
            title="Tắt trạm Radio"
            aria-label="Đóng"
          >
            ✕
          </button>
        </div>
      </aside>
    );
  }

  if (!isModalVisible) return null;

  // =========================================================================
  // GIAO DIỆN MODAL TOÀN PHẦN (FULLSCREEN DIALOG VIEW)
  // =========================================================================
  return (
    <div
      className="late-night-radio-overlay"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 99999,
        background: 'rgba(5, 5, 20, 0.88)',
        backdropFilter: 'blur(14px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px 12px',
        overflowY: 'auto',
        animation: 'fadeIn 0.25s ease-out',
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          handleMinimize();
        }
      }}
    >
      <div
        className="late-night-radio-card"
        style={{
          width: '100%',
          maxWidth: '560px',
          maxHeight: 'min(92vh, 680px)',
          margin: 'auto',
          background: 'linear-gradient(160deg, #0b0f19 0%, #1a1742 60%, #090d16 100%)',
          border: `1.5px solid ${activeTrack.themeColor}55`,
          borderRadius: '24px',
          boxShadow: `0 25px 60px rgba(0, 0, 0, 0.85), 0 0 35px ${activeTrack.glowColor}`,
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          color: '#f8fafc',
          position: 'relative',
          transition: 'border-color 0.3s ease, box-shadow 0.3s ease',
        }}
      >
        {/* Top Header - Luôn cố định trên đỉnh, không bao giờ bị tràn/mất mép */}
        <div
          style={{
            padding: '14px 18px',
            borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: 'rgba(15, 23, 42, 0.95)',
            backdropFilter: 'blur(12px)',
            flexShrink: 0,
            position: 'sticky',
            top: 0,
            zIndex: 30,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span
              className="healing-icon-pill"
              style={{
                width: '38px',
                height: '38px',
                fontSize: '1.1rem',
                background: `${activeTrack.themeColor}22`,
                border: `1.5px solid ${activeTrack.themeColor}`,
                color: activeTrack.themeColor,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                borderRadius: '11px',
              }}
            >
              <i className="fa-solid fa-radio"></i>
            </span>
            <div>
              <h2 style={{ margin: 0, fontSize: '1.12rem', fontWeight: 800, color: '#e0e7ff', lineHeight: 1.2 }}>
                Trạm Radio Đêm Muộn 24/7
              </h2>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.74rem', color: '#34d399' }}>
                <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#34d399', boxShadow: '0 0 6px #34d399' }} />
                <span>
                  Đang cùng thức: <strong>{listenerCount} người bạn</strong>
                </span>
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '7px' }}>
            {/* Nút Bật/Tắt Voice Đọc Tâm Sự */}
            <button
              type="button"
              onClick={handleToggleVoice}
              title={isVoiceEnabled ? 'Đang BẬT giọng đọc phát thanh viên (Bấm để tắt)' : 'Đang TẮT giọng đọc (Bấm để bật)'}
              style={{
                background: isVoiceEnabled ? `${activeTrack.themeColor}25` : 'rgba(255, 255, 255, 0.08)',
                border: `1px solid ${isVoiceEnabled ? activeTrack.themeColor : 'rgba(255, 255, 255, 0.15)'}`,
                borderRadius: '9px',
                color: isVoiceEnabled ? activeTrack.themeColor : '#cbd5e1',
                padding: '5px 9px',
                fontSize: '0.74rem',
                fontWeight: 700,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                transition: 'all 0.2s',
              }}
            >
              <span>{isVoiceEnabled ? '🎙️ Giọng đọc: BẬT' : '🔇 Giọng đọc: TẮT'}</span>
            </button>

            {/* Nút Thu Nhỏ */}
            <button
              type="button"
              onClick={handleMinimize}
              title="Thu nhỏ thành thanh nổi có thể kéo thả di chuyển tự do khắp màn hình (hoặc bấm ra ngoài vùng tối)"
              style={{
                background: 'rgba(255, 255, 255, 0.08)',
                border: '1px solid rgba(255, 255, 255, 0.15)',
                borderRadius: '9px',
                color: '#cbd5e1',
                padding: '5px 10px',
                fontSize: '0.74rem',
                fontWeight: 700,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '5px',
                transition: 'all 0.2s',
              }}
            >
              <i className="fa-regular fa-window-minimize"></i> Thu Nhỏ
            </button>

            {/* Nút Đóng / Tắt hẳn Modal */}
            <button
              type="button"
              onClick={handleCloseFullModal}
              title="Tắt hẳn trạm Radio"
              style={{
                background: 'rgba(255, 255, 255, 0.08)',
                border: 'none',
                color: '#cbd5e1',
                width: '30px',
                height: '30px',
                borderRadius: '50%',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '0.9rem',
                transition: 'background 0.2s, color 0.2s',
              }}
              aria-label="Tắt hẳn"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Cụm Chuyển Đổi Tab: [ 📻 Trạm Phát Radio ] vs [ 💬 Thì Thầm Vô Danh ] */}
        <div
          style={{
            display: 'flex',
            gap: '8px',
            padding: '8px 16px',
            background: 'rgba(10, 15, 30, 0.85)',
            borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
            flexShrink: 0,
          }}
        >
          <button
            type="button"
            onClick={() => setActiveModalTab('radio')}
            style={{
              flex: 1,
              padding: '7px 12px',
              borderRadius: '10px',
              border: activeModalTab === 'radio' ? `1.5px solid ${activeTrack.themeColor}` : '1px solid rgba(255,255,255,0.1)',
              background: activeModalTab === 'radio' ? `${activeTrack.themeColor}25` : 'transparent',
              color: activeModalTab === 'radio' ? '#fff' : '#94a3b8',
              fontWeight: activeModalTab === 'radio' ? 700 : 500,
              fontSize: '0.82rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              transition: 'all 0.2s ease',
            }}
          >
            <span>📻 Trạm Phát Radio</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveModalTab('whispers')}
            style={{
              flex: 1,
              padding: '7px 12px',
              borderRadius: '10px',
              border: activeModalTab === 'whispers' ? `1.5px solid ${activeTrack.themeColor}` : '1px solid rgba(255,255,255,0.1)',
              background: activeModalTab === 'whispers' ? `${activeTrack.themeColor}25` : 'transparent',
              color: activeModalTab === 'whispers' ? '#fff' : '#94a3b8',
              fontWeight: activeModalTab === 'whispers' ? 700 : 500,
              fontSize: '0.82rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              transition: 'all 0.2s ease',
            }}
          >
            <span>💬 Bức Tường Thì Thầm</span>
            <span style={{ fontSize: '0.62rem', padding: '1px 6px', borderRadius: '8px', background: '#ec4899', color: '#fff', fontWeight: 800 }}>Mới</span>
          </button>
        </div>

        {activeModalTab === 'whispers' ? (
          <div style={{ flex: 1, minHeight: 0, overflowY: 'auto' }}>
            <AnonymousWhisperWall themeColor={activeTrack.themeColor} />
          </div>
        ) : (
          <>
            {/* Thanh Lướt Nhanh 8 Bài Nhạc Chữa Lành */}
            <div className="radio-stations-nav" style={{ flexShrink: 0 }}>
          {RADIO_TRACKS.map((track, idx) => {
            const isActive = idx === trackIndex;
            return (
              <button
                key={track.id}
                type="button"
                className={`radio-station-chip ${isActive ? 'is-active' : ''}`}
                style={{
                  '--station-color': track.themeColor,
                  '--station-glow': track.glowColor,
                  '--station-bg': `${track.themeColor}25`,
                }}
                onClick={() => handleSelectTrack(idx)}
              >
                <span>{track.icon}</span>
                <span>
                  {idx + 1}. {track.title}
                </span>
                <span
                  style={{
                    fontSize: '0.62rem',
                    padding: '1px 5px',
                    borderRadius: '4px',
                    background: isActive ? track.themeColor : 'rgba(255, 255, 255, 0.1)',
                    color: isActive ? '#000' : '#cbd5e1',
                    fontWeight: 900,
                  }}
                >
                  {track.genre}
                </span>
              </button>
            );
          })}
        </div>

        {/* Thân Modal Cuộn Mượt Mà (Scrollable Body) */}
        <div
          className="late-night-radio-body-scroll"
          style={{
            flex: 1,
            overflowY: 'auto',
            overscrollBehavior: 'contain',
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          {/* Khung Trình Phát Trung Tâm & DJ Controls */}
          <div style={{ padding: '16px 20px 12px', textAlign: 'center', position: 'relative' }}>
            {/* Cụm điều khiển: Bài trước - Loa chính - Bài sau */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '20px',
                margin: '0 auto 10px',
              }}
            >
              {/* Nút Bài Trước (Previous Track) */}
              <button
                type="button"
                onClick={handlePrevTrack}
                title="Bài trước đó (Previous Track)"
                style={{
                  width: '40px',
                  height: '40px',
                  borderRadius: '50%',
                  background: 'rgba(255, 255, 255, 0.08)',
                  border: '1.5px solid rgba(255, 255, 255, 0.18)',
                  color: '#e2e8f0',
                  fontSize: '1.05rem',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transition: 'all 0.2s',
                }}
              >
                ⏮️
              </button>

              {/* Cụm Loa Chính Phát Nhạc */}
              <div
                style={{
                  width: '88px',
                  height: '88px',
                  borderRadius: '50%',
                  background: isPlaying
                    ? `radial-gradient(circle, ${activeTrack.themeColor}dd 0%, #1e1b4b 60%, #0f172a 100%)`
                    : 'radial-gradient(circle, #334155 0%, #1e293b 100%)',
                  border: isPlaying ? `3px solid ${activeTrack.themeColor}` : '3px solid #475569',
                  boxShadow: isPlaying ? `0 0 24px ${activeTrack.glowColor}` : 'none',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  transition: 'all 0.3s ease',
                }}
                onClick={handleTogglePlay}
                title={isPlaying ? 'Bấm để tạm dừng nhạc' : 'Bấm để phát nhạc'}
              >
                <span style={{ fontSize: '1.85rem' }}>{isPlaying ? '⏸' : '▶️'}</span>
              </div>

              {/* Nút Bài Kế Tiếp (Next Track) */}
              <button
                type="button"
                onClick={handleNextTrack}
                title="Bài kế tiếp (Next Track)"
                style={{
                  width: '40px',
                  height: '40px',
                  borderRadius: '50%',
                  background: 'rgba(255, 255, 255, 0.08)',
                  border: '1.5px solid rgba(255, 255, 255, 0.18)',
                  color: '#e2e8f0',
                  fontSize: '1.05rem',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transition: 'all 0.2s',
                }}
              >
                ⏭️
              </button>
            </div>

            {/* Thông tin bài hát hiện tại */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', marginBottom: '3px' }}>
              <span
                style={{
                  fontSize: '0.7rem',
                  background: `${activeTrack.themeColor}33`,
                  color: activeTrack.themeColor,
                  border: `1px solid ${activeTrack.themeColor}`,
                  padding: '2px 8px',
                  borderRadius: '999px',
                  fontWeight: 900,
                }}
              >
                BÀI {trackIndex + 1}/{RADIO_TRACKS.length} • {activeTrack.genre}
              </span>
              <span style={{ fontSize: '0.74rem', color: '#94a3b8' }}>• {activeTrack.artist}</span>
            </div>

            <h3 style={{ margin: '0 0 2px', fontSize: '1.18rem', color: '#f1f5f9', fontWeight: 800 }}>
              {activeTrack.icon} {activeTrack.title}
            </h3>
            <p style={{ margin: '0 0 10px', fontSize: '0.78rem', color: activeTrack.themeColor, fontWeight: 600 }}>
              {activeTrack.tagline}
            </p>

            {/* Dải sóng âm thanh 16 cột đổi màu theo bài hát */}
            {isPlaying && (
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'center',
                  gap: '3px',
                  height: '20px',
                  alignItems: 'flex-end',
                  marginBottom: '10px',
                }}
              >
                {[12, 20, 16, 24, 18, 9, 22, 14, 24, 19, 11, 22, 16, 20, 12, 18].map((h, i) => (
                  <span
                    key={i}
                    style={{
                      width: '3.5px',
                      height: `${h}px`,
                      background: `linear-gradient(to top, ${activeTrack.themeColor}, #ffffff)`,
                      borderRadius: '3px',
                      animation: `pulseDot ${0.5 + (i % 6) * 0.18}s infinite alternate`,
                    }}
                  />
                ))}
              </div>
            )}

            {/* Thanh Âm Lượng & Nút Bật Drawer Danh Sách Bài */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '10px',
                maxWidth: '340px',
                margin: '0 auto',
              }}
            >
              <span style={{ fontSize: '0.84rem' }}>🔈</span>
              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={volume}
                onChange={(e) => handleVolumeChange(parseFloat(e.target.value))}
                style={{ flex: 1, accentColor: activeTrack.themeColor, cursor: 'pointer' }}
              />
              <span style={{ fontSize: '0.84rem' }}>🔊</span>

              <button
                type="button"
                onClick={() => setShowPlaylistDrawer((prev) => !prev)}
                title="Xem danh sách bài hát"
                style={{
                  background: showPlaylistDrawer ? activeTrack.themeColor : 'rgba(255, 255, 255, 0.08)',
                  color: showPlaylistDrawer ? '#000' : '#cbd5e1',
                  border: '1px solid rgba(255, 255, 255, 0.15)',
                  borderRadius: '7px',
                  padding: '3px 8px',
                  fontSize: '0.72rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                }}
              >
                📋 Danh sách ({RADIO_TRACKS.length})
              </button>
            </div>

            {/* Hộp danh sách 8 bài hát dạng thả xuống (Playlist Drawer) */}
            {showPlaylistDrawer && (
              <div
                style={{
                  marginTop: '10px',
                  background: 'rgba(15, 23, 42, 0.94)',
                  borderRadius: '12px',
                  border: `1px solid ${activeTrack.themeColor}44`,
                  padding: '8px',
                  maxHeight: '145px',
                  overflowY: 'auto',
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(230px, 1fr))',
                  gap: '6px',
                  animation: 'fadeIn 0.2s ease',
                }}
              >
                {RADIO_TRACKS.map((t, i) => {
                  const isCur = i === trackIndex;
                  return (
                    <div
                      key={t.id}
                      onClick={() => handleSelectTrack(i)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '6px 10px',
                        borderRadius: '7px',
                        background: isCur ? `${t.themeColor}25` : 'rgba(255, 255, 255, 0.04)',
                        border: `1px solid ${isCur ? t.themeColor : 'transparent'}`,
                        cursor: 'pointer',
                        fontSize: '0.76rem',
                        color: isCur ? '#fff' : '#cbd5e1',
                        minWidth: 0,
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', minWidth: 0, overflow: 'hidden' }}>
                        <span style={{ flexShrink: 0 }}>{t.icon}</span>
                        <strong
                          style={{
                            color: isCur ? t.themeColor : 'inherit',
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                          }}
                        >
                          {i + 1}. {t.title}
                        </strong>
                      </div>
                      {isCur && (
                        <span
                          style={{
                            color: t.themeColor,
                            fontSize: '0.68rem',
                            fontWeight: 700,
                            flexShrink: 0,
                            marginLeft: '6px',
                            background: `${t.themeColor}18`,
                            padding: '1px 5px',
                            borderRadius: '4px',
                          }}
                        >
                          Đang phát ılı
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Dải Lời Nhắn Vô Danh & Voice Đọc Tâm Sự */}
          <div
            style={{
              background: 'rgba(0, 0, 0, 0.4)',
              borderTop: '1px solid rgba(255, 255, 255, 0.08)',
              padding: '14px 18px',
              marginTop: 'auto',
            }}
          >
            {/* Tiêu đề & Nút Nghe đọc / Dừng đọc */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px', flexWrap: 'wrap', gap: '6px' }}>
              <span style={{ fontSize: '0.76rem', fontWeight: 800, color: activeTrack.themeColor, display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span>💬 LỜI NHẮN ĐỘNG VIÊN VÔ DANH</span>
                {isSpeaking && (
                  <span style={{ fontSize: '0.68rem', color: '#facc15', animation: 'pulseDot 0.8s infinite alternate' }}>
                    (🎙️ Đang đọc...)
                  </span>
                )}
              </span>

              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <button
                  type="button"
                  onClick={() => {
                    if (isSpeaking) {
                      stopSpeaking();
                    } else {
                      speakCurrentThought();
                    }
                  }}
                  title={isSpeaking ? 'Dừng phát giọng đọc lời nhắn' : 'Nghe phát thanh viên đọc lời nhắn này'}
                  style={{
                    background: isSpeaking ? 'rgba(239, 68, 68, 0.2)' : 'rgba(255, 255, 255, 0.08)',
                    border: `1px solid ${isSpeaking ? '#ef4444' : 'rgba(255, 255, 255, 0.15)'}`,
                    borderRadius: '6px',
                    color: isSpeaking ? '#f87171' : '#e2e8f0',
                    padding: '2px 8px',
                    fontSize: '0.72rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    transition: 'all 0.2s',
                  }}
                >
                  {isSpeaking ? '⏹ Dừng đọc' : '🔊 Nghe đọc'}
                </button>
                <span style={{ fontSize: '0.68rem', color: '#64748b' }}>Đổi mỗi 8s</span>
              </div>
            </div>

            {/* Bộ Điều Chỉnh Giọng Đọc: Nam / Nữ & Giọng Bắc / Giọng Nam Chuẩn 100% Tiếng Việt */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '8px',
                padding: '6px 10px',
                background: 'rgba(255, 255, 255, 0.03)',
                borderRadius: '8px',
                border: '1px solid rgba(255, 255, 255, 0.06)',
                marginBottom: '10px',
                flexWrap: 'wrap',
              }}
            >
              {/* Giới tính: Nữ / Nam */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                <span style={{ fontSize: '0.7rem', color: '#94a3b8', fontWeight: 600 }}>Giới tính:</span>
                <div style={{ display: 'inline-flex', background: 'rgba(0, 0, 0, 0.3)', borderRadius: '6px', padding: '2px' }}>
                  <button
                    type="button"
                    onClick={() => handleToggleVoiceGender('female')}
                    style={{
                      background: voiceGender === 'female' ? `${activeTrack.themeColor}33` : 'transparent',
                      border: `1px solid ${voiceGender === 'female' ? activeTrack.themeColor : 'transparent'}`,
                      color: voiceGender === 'female' ? activeTrack.themeColor : '#94a3b8',
                      borderRadius: '5px',
                      padding: '2px 7px',
                      fontSize: '0.7rem',
                      fontWeight: voiceGender === 'female' ? 800 : 500,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '3px',
                      transition: 'all 0.2s',
                    }}
                  >
                    👩 Nữ
                  </button>
                  <button
                    type="button"
                    onClick={() => handleToggleVoiceGender('male')}
                    style={{
                      background: voiceGender === 'male' ? `${activeTrack.themeColor}33` : 'transparent',
                      border: `1px solid ${voiceGender === 'male' ? activeTrack.themeColor : 'transparent'}`,
                      color: voiceGender === 'male' ? activeTrack.themeColor : '#94a3b8',
                      borderRadius: '5px',
                      padding: '2px 7px',
                      fontSize: '0.7rem',
                      fontWeight: voiceGender === 'male' ? 800 : 500,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '3px',
                      transition: 'all 0.2s',
                    }}
                  >
                    👨 Nam
                  </button>
                </div>
              </div>

              {/* Ngữ điệu: Bắc / Nam */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                <span style={{ fontSize: '0.7rem', color: '#94a3b8', fontWeight: 600 }}>Ngữ điệu:</span>
                <div style={{ display: 'inline-flex', background: 'rgba(0, 0, 0, 0.3)', borderRadius: '6px', padding: '2px' }}>
                  <button
                    type="button"
                    onClick={() => handleToggleVoiceRegion('north')}
                    style={{
                      background: voiceRegion === 'north' ? `${activeTrack.themeColor}33` : 'transparent',
                      border: `1px solid ${voiceRegion === 'north' ? activeTrack.themeColor : 'transparent'}`,
                      color: voiceRegion === 'north' ? activeTrack.themeColor : '#94a3b8',
                      borderRadius: '5px',
                      padding: '2px 7px',
                      fontSize: '0.7rem',
                      fontWeight: voiceRegion === 'north' ? 800 : 500,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '3px',
                      transition: 'all 0.2s',
                    }}
                  >
                    🏛️ Giọng Bắc
                  </button>
                  <button
                    type="button"
                    onClick={() => handleToggleVoiceRegion('south')}
                    style={{
                      background: voiceRegion === 'south' ? `${activeTrack.themeColor}33` : 'transparent',
                      border: `1px solid ${voiceRegion === 'south' ? activeTrack.themeColor : 'transparent'}`,
                      color: voiceRegion === 'south' ? activeTrack.themeColor : '#94a3b8',
                      borderRadius: '5px',
                      padding: '2px 7px',
                      fontSize: '0.7rem',
                      fontWeight: voiceRegion === 'south' ? 800 : 500,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '3px',
                      transition: 'all 0.2s',
                    }}
                  >
                    🌴 Giọng Nam
                  </button>
                </div>
              </div>

              {/* Huy hiệu phát âm chuẩn Tiếng Việt 100% */}
              <span
                style={{
                  fontSize: '0.64rem',
                  color: '#34d399',
                  background: 'rgba(52, 211, 153, 0.1)',
                  border: '1px solid rgba(52, 211, 153, 0.3)',
                  padding: '2px 6px',
                  borderRadius: '4px',
                  fontWeight: 700,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '3px',
                }}
              >
                ✓ Chuẩn tiếng Việt 100%
              </span>
            </div>

            {/* Ô hiển thị lời nhắn */}
            <div
              style={{
                padding: '10px 14px',
                borderRadius: '11px',
                background: 'rgba(255, 255, 255, 0.04)',
                border: `1px solid ${activeTrack.themeColor}33`,
                color: '#e0e7ff',
                fontSize: '0.84rem',
                lineHeight: '1.5',
                fontStyle: 'italic',
                minHeight: '40px',
                display: 'flex',
                alignItems: 'center',
                animation: 'fadeIn 0.35s ease',
              }}
            >
              {thoughts[activeThoughtIndex] || DEFAULT_THOUGHTS[0]}
            </div>

            {/* Ô Gửi Lời Nhắn Vô Danh */}
            <form onSubmit={handleSendThought} style={{ marginTop: '9px', display: 'flex', gap: '8px' }}>
              <input
                type="text"
                placeholder="Gửi một lời chúc ấm áp cho những người cùng nghe..."
                value={myThoughtInput}
                onChange={(e) => setMyThoughtInput(e.target.value)}
                maxLength={120}
                style={{
                  flex: 1,
                  padding: '8px 12px',
                  borderRadius: '9px',
                  background: 'rgba(255, 255, 255, 0.06)',
                  border: '1px solid rgba(255, 255, 255, 0.15)',
                  color: '#fff',
                  fontSize: '0.82rem',
                  outline: 'none',
                }}
              />
              <button
                type="submit"
                disabled={!myThoughtInput.trim()}
                style={{
                  padding: '8px 14px',
                  borderRadius: '9px',
                  background: myThoughtInput.trim() ? activeTrack.themeColor : 'rgba(255, 255, 255, 0.1)',
                  border: 'none',
                  color: myThoughtInput.trim() ? '#000' : '#fff',
                  fontWeight: 800,
                  fontSize: '0.8rem',
                  cursor: myThoughtInput.trim() ? 'pointer' : 'default',
                  transition: 'all 0.2s ease',
                }}
              >
                Gửi ✨
              </button>
            </form>
          </div>
        </div>
      </>
    )}
  </div>
</div>
  );
};
