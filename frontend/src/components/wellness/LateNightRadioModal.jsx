import React, { useState, useEffect, useRef } from 'react';
import { playClickSound } from '../../utils/soundEffects';
import {
  getFabPos,
  saveFabPos,
  resolveAntiCollision,
  snapToNearestEdge,
  ensureInBounds,
} from '../../utils/floatingButtonManager';

export const RADIO_STATIONS = [
  {
    id: 'lofi_rain',
    name: 'Lo-Fi Jazz & Mưa Đêm',
    shortName: 'Lo-Fi Jazz Mưa',
    tagline: 'Mưa rơi êm dịu • Đĩa than vinyl lách tách • Hợp âm Rhodes chữa lành',
    icon: '🌧️',
    badge: 'LO-FI JAZZ',
    themeColor: '#818cf8',
    glowColor: 'rgba(129, 140, 248, 0.45)',
    bgGradient: 'linear-gradient(135deg, rgba(30, 27, 75, 0.95), rgba(15, 23, 42, 0.95))',
    subDesc: 'Phù hợp khi học bài, đọc sách, viết nhật ký trong đêm tĩnh lặng.',
  },
  {
    id: 'ocean_sunset',
    name: 'Sóng Biển Hoàng Hôn & Guitar',
    shortName: 'Sóng Biển & Guitar',
    tagline: 'Sóng biển đại dương dạt dào • Giai điệu guitar acoustic mộc mạc êm dịu',
    icon: '🌊',
    badge: 'ACOUSTIC OCEAN',
    themeColor: '#38bdf8',
    glowColor: 'rgba(56, 189, 248, 0.45)',
    bgGradient: 'linear-gradient(135deg, rgba(12, 74, 110, 0.95), rgba(15, 23, 42, 0.95))',
    subDesc: 'Giải tỏa căng thẳng, đưa tâm trí dạo chơi bên bờ cát hoàng hôn.',
  },
  {
    id: 'pine_campfire',
    name: 'Lửa Trại Rừng Thông & Côn Trùng',
    shortName: 'Lửa Trại Rừng Đêm',
    tagline: 'Củi tí tách lốp bốp • Gió thông rì rào • Dế mèn đêm du dương ru ngủ',
    icon: '🌲',
    badge: 'NATURE CAMP',
    themeColor: '#34d399',
    glowColor: 'rgba(52, 211, 153, 0.45)',
    bgGradient: 'linear-gradient(135deg, rgba(6, 78, 59, 0.95), rgba(15, 23, 42, 0.95))',
    subDesc: 'Cảm giác cắm trại giữa đại ngàn thông reo, an yên tuyệt đối.',
  },
  {
    id: 'rainy_cafe',
    name: 'Quán Cà Phê Mưa Chiều & Lofi Beat',
    shortName: 'Quán Cà Phê Chill',
    tagline: 'Mưa gõ mái kính • Ly cà phê ấm • Nhịp beat chill thư thái sâu lắng',
    icon: '☕',
    badge: 'CHILL BEAT',
    themeColor: '#fbbf24',
    glowColor: 'rgba(251, 191, 36, 0.45)',
    bgGradient: 'linear-gradient(135deg, rgba(120, 53, 15, 0.95), rgba(15, 23, 42, 0.95))',
    subDesc: 'Không gian góc quán quen, tập trung làm việc và suy ngẫm sâu.',
  },
  {
    id: 'deep_space_432',
    name: 'Không Gian Vũ Trụ & Sóng Não 432Hz',
    shortName: 'Vũ Trụ Alpha 432Hz',
    tagline: 'Tần số vàng 432Hz • Sóng não Alpha tĩnh tâm • Chuông vũ trụ sâu lắng',
    icon: '🌌',
    badge: 'ALPHA 432Hz',
    themeColor: '#c084fc',
    glowColor: 'rgba(192, 132, 252, 0.45)',
    bgGradient: 'linear-gradient(135deg, rgba(88, 28, 135, 0.95), rgba(15, 23, 42, 0.95))',
    subDesc: 'Giúp cân bằng hệ thần kinh, buông bỏ suy nghĩ vẩn vơ, ngủ sâu giấc.',
  },
];

// =============================================================================
// WEB AUDIO API PROCEDURAL SOUND GENERATOR (100% IN-BROWSER & OFFLINE)
// =============================================================================
let radioAudioCtx = null;
let isRadioPlayingInternal = false;
let masterGainNode = null;
let currentStationId = 'lofi_rain';
let cleanupCurrentStationFn = null;

// --- TRẠM 1: LO-FI JAZZ & MƯA ĐÊM ---
const startLofiRainStation = (ctx, masterNode) => {
  const stationGain = ctx.createGain();
  stationGain.gain.setValueAtTime(1, ctx.currentTime);
  stationGain.connect(masterNode);

  let rainSource = null;
  try {
    const bufferSize = ctx.sampleRate * 2;
    const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const output = noiseBuffer.getChannelData(0);
    let b0 = 0, b1 = 0, b2 = 0;
    for (let i = 0; i < bufferSize; i++) {
      const white = Math.random() * 2 - 1;
      b0 = 0.99886 * b0 + white * 0.0555179;
      b1 = 0.99332 * b1 + white * 0.0750759;
      b2 = 0.96900 * b2 + white * 0.1538520;
      output[i] = (b0 + b1 + b2 + white * 0.5362) * 0.08;
    }
    rainSource = ctx.createBufferSource();
    rainSource.buffer = noiseBuffer;
    rainSource.loop = true;
    const rainFilter = ctx.createBiquadFilter();
    rainFilter.type = 'lowpass';
    rainFilter.frequency.setValueAtTime(950, ctx.currentTime);
    const rainGain = ctx.createGain();
    rainGain.gain.setValueAtTime(0.22, ctx.currentTime);
    rainSource.connect(rainFilter);
    rainFilter.connect(rainGain);
    rainGain.connect(stationGain);
    rainSource.start();
  } catch (e) {}

  let vinylSource = null;
  try {
    const bufferSize = ctx.sampleRate * 1.5;
    const crackleBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = crackleBuffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() > 0.992 ? (Math.random() * 2 - 1) * 0.22 : 0;
    }
    vinylSource = ctx.createBufferSource();
    vinylSource.buffer = crackleBuffer;
    vinylSource.loop = true;
    const vinylFilter = ctx.createBiquadFilter();
    vinylFilter.type = 'bandpass';
    vinylFilter.frequency.setValueAtTime(2500, ctx.currentTime);
    const vinylGain = ctx.createGain();
    vinylGain.gain.setValueAtTime(0.18, ctx.currentTime);
    vinylSource.connect(vinylFilter);
    vinylFilter.connect(vinylGain);
    vinylGain.connect(stationGain);
    vinylSource.start();
  } catch (e) {}

  const chords = [
    [146.83, 220.0, 277.18, 369.99], // Dmaj7
    [185.0, 220.0, 277.18, 369.99],  // F#m7
    [196.0, 246.94, 293.66, 392.0],  // Gmaj7
    [220.0, 277.18, 329.63, 440.0],  // A7
    [246.94, 293.66, 369.99, 440.0, 554.37], // Bm9
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
      gain.gain.linearRampToValueAtTime(0.07, now + 0.15);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 3.2);
      osc.connect(gain);
      gain.connect(stationGain);
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
      stationGain.disconnect();
    } catch (e) {}
  };
};

// --- TRẠM 2: SÓNG BIỂN HOÀNG HÔN & GUITAR MỘC ---
const startOceanGuitarStation = (ctx, masterNode) => {
  const stationGain = ctx.createGain();
  stationGain.gain.setValueAtTime(1, ctx.currentTime);
  stationGain.connect(masterNode);

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

    const waveFilter = ctx.createBiquadFilter();
    waveFilter.type = 'lowpass';
    waveFilter.frequency.setValueAtTime(320, ctx.currentTime);

    const waveGain = ctx.createGain();
    waveGain.gain.setValueAtTime(0.18, ctx.currentTime);

    waveLfo = ctx.createOscillator();
    waveLfo.type = 'sine';
    waveLfo.frequency.setValueAtTime(0.13, ctx.currentTime);

    const lfoFilterGain = ctx.createGain();
    lfoFilterGain.gain.setValueAtTime(240, ctx.currentTime);
    waveLfo.connect(lfoFilterGain);
    lfoFilterGain.connect(waveFilter.frequency);

    const lfoGainGain = ctx.createGain();
    lfoGainGain.gain.setValueAtTime(0.1, ctx.currentTime);
    waveLfo.connect(lfoGainGain);
    lfoGainGain.connect(waveGain.gain);

    waveSource.connect(waveFilter);
    waveFilter.connect(waveGain);
    waveGain.connect(stationGain);

    waveSource.start();
    waveLfo.start();
  } catch (e) {}

  const guitarChords = [
    [196.0, 246.94, 293.66, 369.99, 440.0],  // Gmaj9
    [130.81, 196.0, 246.94, 293.66, 329.63], // Cadd9
    [164.81, 196.0, 246.94, 293.66, 392.0],  // Em7
    [146.83, 220.0, 293.66, 392.0, 440.0],   // Dsus4
    [110.0, 164.81, 220.0, 261.63, 329.63],  // Am7
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
      gain.connect(stationGain);

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
      stationGain.disconnect();
    } catch (e) {}
  };
};

// --- TRẠM 3: LỬA TRẠI RỪNG THÔNG & DẾ MÈN ---
const startCampfireStation = (ctx, masterNode) => {
  const stationGain = ctx.createGain();
  stationGain.gain.setValueAtTime(1, ctx.currentTime);
  stationGain.connect(masterNode);

  let windSource = null;
  try {
    const bufferSize = ctx.sampleRate * 2;
    const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = noiseBuffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * 0.12;
    }
    windSource = ctx.createBufferSource();
    windSource.buffer = noiseBuffer;
    windSource.loop = true;
    const windFilter = ctx.createBiquadFilter();
    windFilter.type = 'lowpass';
    windFilter.frequency.setValueAtTime(320, ctx.currentTime);
    const windGain = ctx.createGain();
    windGain.gain.setValueAtTime(0.18, ctx.currentTime);
    windSource.connect(windFilter);
    windFilter.connect(windGain);
    windGain.connect(stationGain);
    windSource.start();
  } catch (e) {}

  let crackleSource = null;
  try {
    const bufferSize = ctx.sampleRate * 2;
    const fireBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = fireBuffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      const isPop = Math.random() > 0.993;
      data[i] = isPop ? (Math.random() * 2 - 1) * 0.35 : (Math.random() * 2 - 1) * 0.02;
    }
    crackleSource = ctx.createBufferSource();
    crackleSource.buffer = fireBuffer;
    crackleSource.loop = true;
    const fireFilter = ctx.createBiquadFilter();
    fireFilter.type = 'bandpass';
    fireFilter.frequency.setValueAtTime(1800, ctx.currentTime);
    const fireGain = ctx.createGain();
    fireGain.gain.setValueAtTime(0.24, ctx.currentTime);
    crackleSource.connect(fireFilter);
    fireFilter.connect(fireGain);
    fireGain.connect(stationGain);
    crackleSource.start();
  } catch (e) {}

  const snapTimer = setInterval(() => {
    if (!ctx || ctx.state === 'closed') return;
    if (Math.random() > 0.45) {
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(160 + Math.random() * 120, now);
      osc.frequency.exponentialRampToValueAtTime(35, now + 0.08);
      gain.gain.setValueAtTime(0.08, now);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.09);
      osc.connect(gain);
      gain.connect(stationGain);
      osc.start(now);
      osc.stop(now + 0.1);
    }
  }, 1200);

  const cricketTimer = setInterval(() => {
    if (!ctx || ctx.state === 'closed') return;
    const now = ctx.currentTime;
    [0, 0.08, 0.16].forEach((offset) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(4500 + Math.random() * 300, now + offset);
      gain.gain.setValueAtTime(0.001, now + offset);
      gain.gain.linearRampToValueAtTime(0.015, now + offset + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + offset + 0.05);
      osc.connect(gain);
      gain.connect(stationGain);
      osc.start(now + offset);
      osc.stop(now + offset + 0.06);
    });
  }, 2600);

  const kalimbaNotes = [293.66, 329.63, 392.0, 440.0, 493.88, 587.33];
  let noteIdx = 0;
  const playKalimba = () => {
    if (!ctx || ctx.state === 'closed') return;
    const chosen = [
      kalimbaNotes[noteIdx % kalimbaNotes.length],
      kalimbaNotes[(noteIdx + 2) % kalimbaNotes.length],
    ];
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
      gain.connect(stationGain);
      osc.start(now);
      osc.stop(now + 2.6);
    });
  };
  playKalimba();
  const kalimbaTimer = setInterval(playKalimba, 4800);

  return () => {
    clearInterval(snapTimer);
    clearInterval(cricketTimer);
    clearInterval(kalimbaTimer);
    try {
      if (windSource) { windSource.stop(); windSource.disconnect(); }
      if (crackleSource) { crackleSource.stop(); crackleSource.disconnect(); }
      stationGain.disconnect();
    } catch (e) {}
  };
};

// --- TRẠM 4: QUÁN CÀ PHÊ MƯA CHIỀU & LOFI BEAT ---
const startRainyCafeStation = (ctx, masterNode) => {
  const stationGain = ctx.createGain();
  stationGain.gain.setValueAtTime(1, ctx.currentTime);
  stationGain.connect(masterNode);

  let rainSource = null;
  try {
    const bufferSize = ctx.sampleRate * 2;
    const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = noiseBuffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * 0.14;
    }
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
    rainGain.connect(stationGain);
    rainSource.start();
  } catch (e) {}

  const cafeChords = [
    [207.65, 261.63, 311.13, 392.0],  // Abmaj7
    [174.61, 207.65, 261.63, 311.13], // Fm7
    [116.54, 174.61, 233.08, 277.18], // Bbm7
    [155.56, 196.0, 233.08, 349.23],  // Eb9
  ];
  let chordIdx = 0;
  let beatStep = 0;

  const beatInterval = setInterval(() => {
    if (!ctx || ctx.state === 'closed') return;
    const now = ctx.currentTime;
    const isKick = beatStep % 4 === 0 || beatStep % 4 === 2;
    const isSnare = beatStep % 4 === 1 || beatStep % 4 === 3;

    if (isKick) {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(110, now);
      osc.frequency.exponentialRampToValueAtTime(42, now + 0.16);
      gain.gain.setValueAtTime(0.09, now);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.2);
      osc.connect(gain);
      gain.connect(stationGain);
      osc.start(now);
      osc.stop(now + 0.22);
    }

    if (isSnare) {
      try {
        const snareBuffer = ctx.createBuffer(1, ctx.sampleRate * 0.1, ctx.sampleRate);
        const data = snareBuffer.getChannelData(0);
        for (let i = 0; i < data.length; i++) data[i] = (Math.random() * 2 - 1) * 0.08;
        const snareSource = ctx.createBufferSource();
        snareSource.buffer = snareBuffer;
        const snareFilter = ctx.createBiquadFilter();
        snareFilter.type = 'highpass';
        snareFilter.frequency.setValueAtTime(1200, now);
        const snareGain = ctx.createGain();
        snareGain.gain.setValueAtTime(0.06, now);
        snareGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.1);
        snareSource.connect(snareFilter);
        snareFilter.connect(snareGain);
        snareGain.connect(stationGain);
        snareSource.start(now);
      } catch (e) {}
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
        gain.connect(stationGain);
        osc.start(chordNow);
        osc.stop(chordNow + 3.0);
      });
    }

    beatStep++;
  }, 833);

  const clinkInterval = setInterval(() => {
    if (!ctx || ctx.state === 'closed') return;
    if (Math.random() > 0.5) {
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(2900 + Math.random() * 400, now);
      gain.gain.setValueAtTime(0.025, now);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.25);
      osc.connect(gain);
      gain.connect(stationGain);
      osc.start(now);
      osc.stop(now + 0.28);
    }
  }, 6000);

  return () => {
    clearInterval(beatInterval);
    clearInterval(clinkInterval);
    try {
      if (rainSource) { rainSource.stop(); rainSource.disconnect(); }
      stationGain.disconnect();
    } catch (e) {}
  };
};

// --- TRẠM 5: KHÔNG GIAN VŨ TRỤ & SÓNG NÃO 432Hz ---
const startDeepSpace432Station = (ctx, masterNode) => {
  const stationGain = ctx.createGain();
  stationGain.gain.setValueAtTime(1, ctx.currentTime);
  stationGain.connect(masterNode);

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

    merger.connect(stationGain);
    leftOsc.start();
    rightOsc.start();
  } catch (e) {}

  let subOsc = null;
  try {
    subOsc = ctx.createOscillator();
    subOsc.type = 'sine';
    subOsc.frequency.setValueAtTime(108, ctx.currentTime);
    const subFilter = ctx.createBiquadFilter();
    subFilter.type = 'lowpass';
    subFilter.frequency.setValueAtTime(160, ctx.currentTime);
    const subGain = ctx.createGain();
    subGain.gain.setValueAtTime(0.065, ctx.currentTime);
    subOsc.connect(subFilter);
    subFilter.connect(subGain);
    subGain.connect(stationGain);
    subOsc.start();
  } catch (e) {}

  const bowlTimer = setInterval(() => {
    if (!ctx || ctx.state === 'closed') return;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const osc2 = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(864, now);
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(868, now);

    gain.gain.setValueAtTime(0.001, now);
    gain.gain.linearRampToValueAtTime(0.04, now + 0.15);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 4.8);

    osc.connect(gain);
    osc2.connect(gain);
    gain.connect(stationGain);

    osc.start(now);
    osc2.start(now);
    osc.stop(now + 5.0);
    osc2.stop(now + 5.0);
  }, 5200);

  return () => {
    clearInterval(bowlTimer);
    try {
      if (leftOsc) { leftOsc.stop(); leftOsc.disconnect(); }
      if (rightOsc) { rightOsc.stop(); rightOsc.disconnect(); }
      if (subOsc) { subOsc.stop(); subOsc.disconnect(); }
      stationGain.disconnect();
    } catch (e) {}
  };
};

const switchStation = (stationId) => {
  if (cleanupCurrentStationFn) {
    cleanupCurrentStationFn();
    cleanupCurrentStationFn = null;
  }
  currentStationId = stationId;
  if (!isRadioPlayingInternal || !radioAudioCtx) return;

  if (stationId === 'ocean_sunset') {
    cleanupCurrentStationFn = startOceanGuitarStation(radioAudioCtx, masterGainNode);
  } else if (stationId === 'pine_campfire') {
    cleanupCurrentStationFn = startCampfireStation(radioAudioCtx, masterGainNode);
  } else if (stationId === 'rainy_cafe') {
    cleanupCurrentStationFn = startRainyCafeStation(radioAudioCtx, masterGainNode);
  } else if (stationId === 'deep_space_432') {
    cleanupCurrentStationFn = startDeepSpace432Station(radioAudioCtx, masterGainNode);
  } else {
    cleanupCurrentStationFn = startLofiRainStation(radioAudioCtx, masterGainNode);
  }
};

const startRadioEngine = (stationId = 'lofi_rain', volume = 0.5) => {
  const AudioContextClass = window.AudioContext || window.webkitAudioContext;
  if (!AudioContextClass) return;

  if (!radioAudioCtx || radioAudioCtx.state === 'closed') {
    radioAudioCtx = new AudioContextClass();
  }
  if (radioAudioCtx.state === 'suspended') {
    radioAudioCtx.resume().catch(() => {});
  }

  masterGainNode = radioAudioCtx.createGain();
  masterGainNode.gain.setValueAtTime(volume, radioAudioCtx.currentTime);
  masterGainNode.connect(radioAudioCtx.destination);

  isRadioPlayingInternal = true;
  switchStation(stationId);
};

const stopRadioEngine = () => {
  if (cleanupCurrentStationFn) {
    cleanupCurrentStationFn();
    cleanupCurrentStationFn = null;
  }
  if (radioAudioCtx) {
    try {
      radioAudioCtx.close();
    } catch (e) {}
    radioAudioCtx = null;
  }
  isRadioPlayingInternal = false;
};

const setRadioEngineVolume = (vol) => {
  if (masterGainNode && radioAudioCtx) {
    masterGainNode.gain.setValueAtTime(vol, radioAudioCtx.currentTime);
  }
};

const DEFAULT_THOUGHTS = [
  '🌙 Dù hôm nay có mệt mỏi thế nào, bạn cũng đã làm rất tốt rồi! Nghỉ ngơi nhé.',
  '☕ Bật nhạc lên, hít một hơi thật sâu, ngày mai sẽ dịu dàng hơn.',
  '✨ Gửi một cái ôm ấm áp đến những bạn đang chạy deadline đêm muộn lúc này!',
  '🌿 Đừng so sánh hành trình của mình với người khác. Mỗi bông hoa nở vào một mùa riêng.',
  '🌧️ Ngồi nghe tiếng mưa lách tách, mọi muộn phiền ngoài kia tạm thời gác lại...',
  '💡 Nhớ uống một ngụm nước ấm và vươn vai thư giãn mắt nhé!',
];

export const LateNightRadioModal = ({ isOpen, onClose }) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [volume, setVolume] = useState(0.5);
  const [isMiniMode, setIsMiniMode] = useState(false);
  const [activeStationId, setActiveStationId] = useState(() => {
    try {
      return localStorage.getItem('freedom_radio_station') || 'lofi_rain';
    } catch (e) {
      return 'lofi_rain';
    }
  });

  const [thoughts, setThoughts] = useState(() => {
    try {
      const saved = localStorage.getItem('freedom_radio_thoughts');
      if (saved) return JSON.parse(saved);
    } catch (e) {}
    return DEFAULT_THOUGHTS;
  });
  const [myThoughtInput, setMyThoughtInput] = useState('');
  const [activeThoughtIndex, setActiveThoughtIndex] = useState(0);

  // Kéo thả di chuyển tự do cho Mini Pill
  const [btnPos, setBtnPos] = useState(() => {
    const raw = getFabPos('radio');
    return resolveAntiCollision('radio', raw, true);
  });
  const [isDragging, setIsDragging] = useState(false);
  const dragStartRef = useRef({ mouseX: 0, mouseY: 0, btnX: 0, btnY: 0 });
  const hasMovedRef = useRef(false);
  const btnRef = useRef(null);
  const activePointerIdRef = useRef(null);

  const activeStation =
    RADIO_STATIONS.find((s) => s.id === activeStationId) || RADIO_STATIONS[0];

  // Tính số lượng bạn bè đang nghe dựa trên thời gian thực
  const getListenersCount = () => {
    const hour = new Date().getHours();
    if (hour >= 0 && hour <= 4) return 18 + hour * 3 + Math.floor(Math.sin(Date.now() / 10000) * 4);
    if (hour >= 5 && hour <= 8) return 35 + hour * 2;
    if (hour >= 9 && hour <= 17) return 65 + (hour % 10);
    return 85 + hour * 2;
  };
  const [listenerCount, setListenerCount] = useState(getListenersCount());

  useEffect(() => {
    const timer = setInterval(() => {
      setListenerCount(getListenersCount());
      setActiveThoughtIndex((prev) => (prev + 1) % thoughts.length);
    }, 6000);
    return () => clearInterval(timer);
  }, [thoughts.length]);

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

  // Lắng nghe khi các nút khác (Chat, Write, Mascot, Pref, PWA) di chuyển để chống va chạm
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

  // Bật/tắt phát nhạc
  const handleTogglePlay = () => {
    playClickSound();
    if (isPlaying) {
      stopRadioEngine();
      setIsPlaying(false);
    } else {
      startRadioEngine(activeStationId, volume);
      setIsPlaying(true);
    }
  };

  // Chọn kênh / trạm phát
  const handleSelectStation = (stationId) => {
    playClickSound();
    setActiveStationId(stationId);
    try {
      localStorage.setItem('freedom_radio_station', stationId);
    } catch (e) {}

    if (isPlaying) {
      switchStation(stationId);
    } else {
      startRadioEngine(stationId, volume);
      setIsPlaying(true);
    }
  };

  // Chuyển kênh tiếp theo
  const handleNextStation = () => {
    playClickSound();
    const currIndex = RADIO_STATIONS.findIndex((s) => s.id === activeStationId);
    const nextIndex = (currIndex + 1) % RADIO_STATIONS.length;
    const nextStation = RADIO_STATIONS[nextIndex];
    handleSelectStation(nextStation.id);
  };

  // Quay lại kênh trước
  const handlePrevStation = () => {
    playClickSound();
    const currIndex = RADIO_STATIONS.findIndex((s) => s.id === activeStationId);
    const prevIndex = (currIndex - 1 + RADIO_STATIONS.length) % RADIO_STATIONS.length;
    const prevStation = RADIO_STATIONS[prevIndex];
    handleSelectStation(prevStation.id);
  };

  const handleVolumeChange = (newVol) => {
    setVolume(newVol);
    setRadioEngineVolume(newVol);
  };

  const handleSendThought = (e) => {
    e.preventDefault();
    if (!myThoughtInput.trim()) return;
    playClickSound();

    const newThought = `✨ ${myThoughtInput.trim()}`;
    const updated = [newThought, ...thoughts.slice(0, 15)];
    setThoughts(updated);
    setActiveThoughtIndex(0);
    setMyThoughtInput('');
    try {
      localStorage.setItem('freedom_radio_thoughts', JSON.stringify(updated));
    } catch (e) {}
  };

  // =========================================================================
  // XỬ LÝ KÉO THẢ POINTER EVENTS CHO MINI FLOATING PILL (KHÔNG DÍNH CHUỘT)
  // =========================================================================
  const handlePointerDown = (e) => {
    if (e.target.closest('button')) return;
    if (e.pointerType === 'mouse' && e.button !== 0) return;

    e.preventDefault();
    e.stopPropagation();

    try {
      e.currentTarget.setPointerCapture(e.pointerId);
      activePointerIdRef.current = e.pointerId;
    } catch (_) {}

    dragStartRef.current = {
      mouseX: e.clientX,
      mouseY: e.clientY,
      btnX: btnPos.x,
      btnY: btnPos.y,
    };
    hasMovedRef.current = false;
    setIsDragging(true);
  };

  const handlePointerMove = (e) => {
    if (!isDragging) return;
    e.preventDefault();

    const dx = e.clientX - dragStartRef.current.mouseX;
    const dy = e.clientY - dragStartRef.current.mouseY;

    if (Math.hypot(dx, dy) > 4) {
      hasMovedRef.current = true;
    }

    const nextX = dragStartRef.current.btnX + dx;
    const nextY = dragStartRef.current.btnY + dy;
    setBtnPos(ensureInBounds('radio', { x: nextX, y: nextY }));
  };

  const handlePointerUp = (e) => {
    if (!isDragging) return;

    try {
      if (activePointerIdRef.current !== null && e.currentTarget) {
        e.currentTarget.releasePointerCapture(activePointerIdRef.current);
      }
    } catch (_) {}
    activePointerIdRef.current = null;
    setIsDragging(false);

    if (hasMovedRef.current) {
      setBtnPos((current) => {
        const snapped = snapToNearestEdge('radio', current);
        saveFabPos('radio', snapped);
        return snapped;
      });
    }
  };

  const handlePointerCancel = (e) => {
    if (isDragging) {
      handlePointerUp(e);
    }
  };

  const handlePillClick = () => {
    if (hasMovedRef.current) {
      hasMovedRef.current = false;
      return;
    }
    playClickSound();
    setIsMiniMode(false);
    window.dispatchEvent(new CustomEvent('freedom_open_radio'));
  };

  const handleCloseMini = () => {
    playClickSound();
    stopRadioEngine();
    setIsPlaying(false);
    setIsMiniMode(false);
  };

  // =========================================================================
  // GIAO DIỆN MINI FLOATING PILL (KHI THU NHỎ & ĐANG PHÁT NHẠC)
  // =========================================================================
  if (isMiniMode && isPlaying) {
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
          zIndex: isDragging ? 99994 : 99980,
          cursor: isDragging ? 'grabbing' : 'grab',
          transition: isDragging
            ? 'none'
            : 'left 0.28s cubic-bezier(0.2, 0.8, 0.2, 1), top 0.28s cubic-bezier(0.2, 0.8, 0.2, 1), transform 0.2s, box-shadow 0.2s',
          touchAction: 'none',
          userSelect: 'none',
          WebkitUserSelect: 'none',
          '--station-accent': activeStation.themeColor,
          '--station-glow': activeStation.glowColor,
        }}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerCancel}
        onClick={handlePillClick}
        title={`${activeStation.name} • Giữ và kéo để di chuyển tự do khắp màn hình, hoặc bấm để mở rộng trạm Radio!`}
        role="button"
        tabIndex={0}
      >
        {/* Nút cầm kéo tay cầm Drag Handle */}
        <span className="mini-radio-drag-handle" title="Giữ và kéo để di chuyển vị trí">
          <i className="fa-solid fa-grip-vertical" style={{ fontSize: '0.78rem', opacity: 0.65 }}></i>
        </span>

        {/* Icon đài phát */}
        <span
          className="mini-radio-station-icon"
          style={{
            fontSize: '1.15rem',
            animation: isPlaying ? 'pulseDot 1.4s infinite alternate' : 'none',
            display: 'inline-flex',
            alignItems: 'center',
          }}
        >
          {activeStation.icon}
        </span>

        {/* Tên trạm */}
        <span
          className="mini-radio-title-text"
          style={{ whiteSpace: 'nowrap', fontWeight: 800, fontSize: '0.82rem', color: '#f8fafc' }}
        >
          {activeStation.shortName || activeStation.name}
        </span>

        {/* Dải sóng nhạc mini */}
        <div style={{ display: 'flex', gap: '2px', alignItems: 'flex-end', height: '14px', margin: '0 3px' }}>
          <span style={{ width: '3px', height: '12px', background: activeStation.themeColor, borderRadius: '2px', animation: 'pulseDot 0.8s infinite alternate' }} />
          <span style={{ width: '3px', height: '7px', background: '#e0e7ff', borderRadius: '2px', animation: 'pulseDot 1.1s infinite alternate' }} />
          <span style={{ width: '3px', height: '14px', background: activeStation.themeColor, borderRadius: '2px', animation: 'pulseDot 0.6s infinite alternate' }} />
        </div>

        {/* Nút đổi kênh nhanh tiếp theo (Next Station) */}
        <button
          type="button"
          className="mini-radio-action-btn"
          onClick={(e) => {
            e.stopPropagation();
            handleNextStation();
          }}
          title="Chuyển sang kênh Radio tiếp theo"
          aria-label="Đổi kênh tiếp theo"
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

        {/* Nút Đóng / Ẩn Mini Player */}
        <button
          type="button"
          className="mini-radio-action-btn mini-radio-close-btn"
          onClick={(e) => {
            e.stopPropagation();
            handleCloseMini();
          }}
          title="Tắt trạm Radio"
          aria-label="Đóng"
        >
          ✕
        </button>
      </aside>
    );
  }

  if (!isOpen) return null;

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
        padding: '16px',
        animation: 'fadeIn 0.25s ease-out',
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          playClickSound();
          onClose();
        }
      }}
    >
      <div
        className="late-night-radio-card"
        style={{
          width: '100%',
          maxWidth: '580px',
          background: 'linear-gradient(160deg, #0b0f19 0%, #1a1742 60%, #090d16 100%)',
          border: `1.5px solid ${activeStation.themeColor}55`,
          borderRadius: '28px',
          boxShadow: `0 25px 60px rgba(0, 0, 0, 0.8), 0 0 40px ${activeStation.glowColor}`,
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          color: '#f8fafc',
          position: 'relative',
          transition: 'border-color 0.3s ease, box-shadow 0.3s ease',
        }}
      >
        {/* Top Header */}
        <div
          style={{
            padding: '18px 24px',
            borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: 'rgba(15, 23, 42, 0.6)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <span
              className="healing-icon-pill"
              style={{
                width: '40px',
                height: '40px',
                fontSize: '1.15rem',
                background: `${activeStation.themeColor}22`,
                border: `1.5px solid ${activeStation.themeColor}`,
                color: activeStation.themeColor,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                borderRadius: '12px',
              }}
            >
              <i className="fa-solid fa-radio"></i>
            </span>
            <div>
              <h2 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 800, color: '#e0e7ff' }}>
                Trạm Radio Đêm Muộn 24/7
              </h2>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.78rem', color: '#34d399' }}>
                <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#34d399', boxShadow: '0 0 6px #34d399' }} />
                <span>
                  Đang cùng thức: <strong>{listenerCount} người bạn</strong>
                </span>
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {isPlaying && (
              <button
                type="button"
                onClick={() => {
                  playClickSound();
                  setIsMiniMode(true);
                  onClose();
                }}
                title="Thu nhỏ thành thanh nổi có thể kéo thả di chuyển tự do khắp màn hình"
                style={{
                  background: 'rgba(255, 255, 255, 0.08)',
                  border: '1px solid rgba(255, 255, 255, 0.15)',
                  borderRadius: '10px',
                  color: '#cbd5e1',
                  padding: '6px 12px',
                  fontSize: '0.78rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  transition: 'all 0.2s',
                }}
              >
                <i className="fa-regular fa-window-minimize"></i> Thu Nhỏ
              </button>
            )}
            <button
              type="button"
              onClick={() => {
                playClickSound();
                onClose();
              }}
              style={{
                background: 'rgba(255, 255, 255, 0.08)',
                border: 'none',
                color: '#cbd5e1',
                width: '32px',
                height: '32px',
                borderRadius: '50%',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '0.95rem',
              }}
              aria-label="Đóng"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Thanh Chọn Kênh Radio Đa Dạng (5 Kênh Chữa Lành) */}
        <div className="radio-stations-nav">
          {RADIO_STATIONS.map((station) => {
            const isActive = station.id === activeStationId;
            return (
              <button
                key={station.id}
                type="button"
                className={`radio-station-chip ${isActive ? 'is-active' : ''}`}
                style={{
                  '--station-color': station.themeColor,
                  '--station-glow': station.glowColor,
                  '--station-bg': `${station.themeColor}25`,
                }}
                onClick={() => handleSelectStation(station.id)}
              >
                <span>{station.icon}</span>
                <span>{station.shortName}</span>
                <span
                  style={{
                    fontSize: '0.62rem',
                    padding: '1px 5px',
                    borderRadius: '4px',
                    background: isActive ? `${station.themeColor}` : 'rgba(255, 255, 255, 0.1)',
                    color: isActive ? '#000' : '#cbd5e1',
                    fontWeight: 900,
                  }}
                >
                  {station.badge}
                </span>
              </button>
            );
          })}
        </div>

        {/* Khung Trình Phát Trung Tâm & DJ Controls */}
        <div style={{ padding: '24px 24px 20px', textAlign: 'center', position: 'relative' }}>
          {/* Cụm điều khiển: Kênh trước - Loa chính - Kênh sau */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '24px',
              margin: '0 auto 16px',
            }}
          >
            {/* Nút Kênh Trước */}
            <button
              type="button"
              onClick={handlePrevStation}
              title="Kênh trước (Previous Station)"
              style={{
                width: '42px',
                height: '42px',
                borderRadius: '50%',
                background: 'rgba(255, 255, 255, 0.08)',
                border: '1px solid rgba(255, 255, 255, 0.15)',
                color: '#e2e8f0',
                fontSize: '1.1rem',
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
                width: '128px',
                height: '128px',
                borderRadius: '50%',
                background: isPlaying
                  ? `radial-gradient(circle, ${activeStation.themeColor}dd 0%, #1e1b4b 60%, #0f172a 100%)`
                  : 'radial-gradient(circle, #334155 0%, #1e293b 100%)',
                border: isPlaying ? `3.5px solid ${activeStation.themeColor}` : '3.5px solid #475569',
                boxShadow: isPlaying ? `0 0 35px ${activeStation.glowColor}` : 'none',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                transition: 'all 0.3s ease',
              }}
              onClick={handleTogglePlay}
              title={isPlaying ? 'Bấm để tạm dừng' : 'Bấm để phát nhạc'}
            >
              <span style={{ fontSize: '2.5rem' }}>{isPlaying ? '⏸' : '▶️'}</span>
            </div>

            {/* Nút Kênh Sau */}
            <button
              type="button"
              onClick={handleNextStation}
              title="Kênh tiếp theo (Next Station)"
              style={{
                width: '42px',
                height: '42px',
                borderRadius: '50%',
                background: 'rgba(255, 255, 255, 0.08)',
                border: '1px solid rgba(255, 255, 255, 0.15)',
                color: '#e2e8f0',
                fontSize: '1.1rem',
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

          <h3 style={{ margin: '0 0 6px', fontSize: '1.25rem', color: '#f1f5f9', fontWeight: 800 }}>
            {activeStation.icon} {activeStation.name}
          </h3>
          <p style={{ margin: '0 0 6px', fontSize: '0.84rem', color: activeStation.themeColor, fontWeight: 600 }}>
            {activeStation.tagline}
          </p>
          <p style={{ margin: '0 0 16px', fontSize: '0.78rem', color: '#94a3b8' }}>
            {activeStation.subDesc}
          </p>

          {/* Dải sóng âm thanh 16 cột đổi màu theo trạm */}
          {isPlaying && (
            <div
              style={{
                display: 'flex',
                justifyContent: 'center',
                gap: '4px',
                height: '28px',
                alignItems: 'flex-end',
                marginBottom: '16px',
              }}
            >
              {[14, 24, 18, 28, 20, 10, 26, 16, 28, 22, 12, 26, 18, 24, 14, 20].map((h, i) => (
                <span
                  key={i}
                  style={{
                    width: '4px',
                    height: `${h}px`,
                    background: `linear-gradient(to top, ${activeStation.themeColor}, #ffffff)`,
                    borderRadius: '3px',
                    animation: `pulseDot ${0.5 + (i % 6) * 0.18}s infinite alternate`,
                  }}
                />
              ))}
            </div>
          )}

          {/* Thanh Âm Lượng */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '12px',
              maxWidth: '300px',
              margin: '0 auto',
            }}
          >
            <span style={{ fontSize: '0.9rem' }}>🔈</span>
            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={volume}
              onChange={(e) => handleVolumeChange(parseFloat(e.target.value))}
              style={{ flex: 1, accentColor: activeStation.themeColor, cursor: 'pointer' }}
            />
            <span style={{ fontSize: '0.9rem' }}>🔊</span>
          </div>
        </div>

        {/* Dải Lời Nhắn Vô Danh (Live Anonymous Thoughts) */}
        <div
          style={{
            background: 'rgba(0, 0, 0, 0.35)',
            borderTop: '1px solid rgba(255, 255, 255, 0.08)',
            padding: '16px 24px',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
            <span style={{ fontSize: '0.8rem', fontWeight: 700, color: activeStation.themeColor }}>
              💬 LỜI NHẮN ĐỘNG VIÊN VÔ DANH
            </span>
            <span style={{ fontSize: '0.72rem', color: '#64748b' }}>Tự động đổi mỗi 6s</span>
          </div>

          <div
            style={{
              padding: '12px 16px',
              borderRadius: '12px',
              background: 'rgba(255, 255, 255, 0.04)',
              border: `1px solid ${activeStation.themeColor}33`,
              color: '#e0e7ff',
              fontSize: '0.88rem',
              lineHeight: '1.5',
              fontStyle: 'italic',
              minHeight: '44px',
              display: 'flex',
              alignItems: 'center',
              animation: 'fadeIn 0.4s ease',
            }}
          >
            {thoughts[activeThoughtIndex] || DEFAULT_THOUGHTS[0]}
          </div>

          {/* Ô Gửi Lời Nhắn Vô Danh */}
          <form onSubmit={handleSendThought} style={{ marginTop: '12px', display: 'flex', gap: '8px' }}>
            <input
              type="text"
              placeholder="Gửi một lời chúc ấm áp cho những người cùng nghe..."
              value={myThoughtInput}
              onChange={(e) => setMyThoughtInput(e.target.value)}
              maxLength={120}
              style={{
                flex: 1,
                padding: '10px 14px',
                borderRadius: '10px',
                background: 'rgba(255, 255, 255, 0.06)',
                border: '1px solid rgba(255, 255, 255, 0.15)',
                color: '#fff',
                fontSize: '0.85rem',
                outline: 'none',
              }}
            />
            <button
              type="submit"
              disabled={!myThoughtInput.trim()}
              style={{
                padding: '10px 18px',
                borderRadius: '10px',
                background: myThoughtInput.trim() ? activeStation.themeColor : 'rgba(255, 255, 255, 0.1)',
                border: 'none',
                color: myThoughtInput.trim() ? '#000' : '#fff',
                fontWeight: 800,
                fontSize: '0.84rem',
                cursor: myThoughtInput.trim() ? 'pointer' : 'default',
                transition: 'all 0.2s ease',
              }}
            >
              Gửi ✨
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};
