/**
 * Bộ tạo âm thanh Tiếng Củi Bùng Lửa & Tí Tách (Campfire Crackle SFX)
 * Sử dụng Web Audio API thuần (procedural audio synthesis), không tải file ngoài.
 * An toàn với chính sách Autoplay của trình duyệt & tự động thu hồi tài nguyên (Quy tắc 3 & 4 GEMINI.md).
 */

import { hasUserInteracted } from './audio-gesture-guard';

let campfireAudioCtx = null;

const getAudioContext = () => {
  if (typeof window === 'undefined') return null;
  if (!hasUserInteracted()) return null;
  const AudioCtxClass = window.AudioContext || window.webkitAudioContext;
  if (!AudioCtxClass) return null;

  if (!campfireAudioCtx || campfireAudioCtx.state === 'closed') {
    campfireAudioCtx = new AudioCtxClass();
  }
  return campfireAudioCtx;
};

/**
 * Kiểm tra xem người dùng có đang bật hiệu ứng âm thanh giữ lửa không (Mặc định bật)
 */
export const isCampfireSoundEnabled = () => {
  try {
    if (typeof localStorage === 'undefined') return true;
    const val = localStorage.getItem('freedom_campfire_sfx_enabled');
    return val !== 'false';
  } catch (_) {
    return true;
  }
};

/**
 * Cập nhật tùy chọn bật/tắt âm thanh giữ lửa
 */
export const setCampfireSoundEnabled = (enabled) => {
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('freedom_campfire_sfx_enabled', enabled ? 'true' : 'false');
    }
  } catch (_) {}
};

// Danh sách các AudioNode đang hoạt động để dọn dẹp triệt để khi hoàn tất (Quy tắc 3 GEMINI.md)
let activeCampfireNodes = [];
let campfireCleanupTimer = null;

/**
 * Ngắt kết nối và giải phóng toàn bộ các node âm thanh đang phát
 */
export const stopCampfireSound = () => {
  if (campfireCleanupTimer) {
    clearTimeout(campfireCleanupTimer);
    campfireCleanupTimer = null;
  }
  if (activeCampfireNodes.length > 0) {
    activeCampfireNodes.forEach((node) => {
      try {
        if (typeof node.stop === 'function') {
          node.stop();
        }
      } catch (_) {}
      try {
        if (typeof node.disconnect === 'function') {
          node.disconnect();
        }
      } catch (_) {}
    });
    activeCampfireNodes = [];
  }
};

/**
 * Phát hiệu ứng tiếng củi lửa lách tách và bùng lửa ấm áp kéo dài khoảng 0.7s - 0.85s
 */
export const playCampfireSound = async ({ volume = 0.45 } = {}) => {
  if (!isCampfireSoundEnabled()) return;

  try {
    // Thu hồi các node âm thanh cũ nếu đang phát dang dở
    stopCampfireSound();

    const ctx = getAudioContext();
    if (!ctx) return;

    // Kích hoạt lại AudioContext nếu đang ở trạng thái suspended do Autoplay Policy (Quy tắc 4 GEMINI.md)
    if (ctx.state === 'suspended') {
      try {
        await ctx.resume();
      } catch (resumeErr) {
        console.warn('[CampfireAudio] Autoplay policy blocked resume:', resumeErr);
      }
    }

    const now = ctx.currentTime;
    const duration = 0.85;
    const currentNodes = [];

    // Master Gain Node cho toàn bộ hiệu ứng
    const masterGain = ctx.createGain();
    masterGain.gain.setValueAtTime(Math.max(0, Math.min(1, volume)), now);
    masterGain.connect(ctx.destination);
    currentNodes.push(masterGain);

    // =========================================================================
    // 1. TIẾNG BÙNG LỬA TRẦM ẤM (WARM IGNITION WHOOSH)
    // =========================================================================
    // Dao động sóng sin quét từ 130Hz -> 65Hz tạo tiếng "phù" ấm áp của ngọn lửa
    const osc = ctx.createOscillator();
    const oscGain = ctx.createGain();
    const oscFilter = ctx.createBiquadFilter();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(130, now);
    osc.frequency.exponentialRampToValueAtTime(55, now + 0.6);

    oscFilter.type = 'lowpass';
    oscFilter.frequency.setValueAtTime(220, now);

    oscGain.gain.setValueAtTime(0.001, now);
    oscGain.gain.linearRampToValueAtTime(0.35, now + 0.08);
    oscGain.gain.exponentialRampToValueAtTime(0.001, now + 0.65);

    osc.connect(oscFilter);
    oscFilter.connect(oscGain);
    oscGain.connect(masterGain);

    osc.start(now);
    osc.stop(now + 0.7);
    currentNodes.push(osc, oscFilter, oscGain);

    // =========================================================================
    // 2. TIẾNG THỞ CỦA NGỌN LỬA (FLAME AIR BREATH NOISE)
    // =========================================================================
    // Buffer tạo tiếng xì xào mềm của luồng khí nóng
    const bufferSize = Math.floor(ctx.sampleRate * duration);
    const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const output = noiseBuffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      output[i] = Math.random() * 2 - 1;
    }

    const noiseSource = ctx.createBufferSource();
    noiseSource.buffer = noiseBuffer;

    const noiseFilter = ctx.createBiquadFilter();
    noiseFilter.type = 'bandpass';
    noiseFilter.frequency.setValueAtTime(480, now);
    noiseFilter.frequency.exponentialRampToValueAtTime(320, now + 0.7);
    noiseFilter.Q.setValueAtTime(1.8, now);

    const noiseGain = ctx.createGain();
    noiseGain.gain.setValueAtTime(0.001, now);
    noiseGain.gain.linearRampToValueAtTime(0.25, now + 0.06);
    noiseGain.gain.exponentialRampToValueAtTime(0.001, now + duration);

    noiseSource.connect(noiseFilter);
    noiseFilter.connect(noiseGain);
    noiseGain.connect(masterGain);

    noiseSource.start(now);
    noiseSource.stop(now + duration);
    currentNodes.push(noiseSource, noiseFilter, noiseGain);

    // =========================================================================
    // 3. TIẾNG CỦI LÁCH TÁCH (CAMPFIRE CRACKLES / MICRO-POPS)
    // =========================================================================
    // Tạo 6 đốm nổ tí tách ngẫu nhiên đặc trưng của củi khô bén lửa
    const crackleTimes = [0.08, 0.18, 0.29, 0.42, 0.55, 0.68];

    crackleTimes.forEach((delay) => {
      const popTime = now + delay + (Math.random() - 0.5) * 0.04;
      const popDuration = 0.012 + Math.random() * 0.015;

      const popBuffer = ctx.createBuffer(1, Math.floor(ctx.sampleRate * popDuration), ctx.sampleRate);
      const popData = popBuffer.getChannelData(0);
      for (let j = 0; j < popData.length; j++) {
        popData[j] = (Math.random() * 2 - 1) * Math.exp(-j / (popData.length * 0.3));
      }

      const popSource = ctx.createBufferSource();
      popSource.buffer = popBuffer;

      const popFilter = ctx.createBiquadFilter();
      popFilter.type = 'highpass';
      popFilter.frequency.setValueAtTime(1800 + Math.random() * 800, popTime);

      const popGain = ctx.createGain();
      const popVol = 0.28 + Math.random() * 0.35;
      popGain.gain.setValueAtTime(popVol, popTime);
      popGain.gain.exponentialRampToValueAtTime(0.001, popTime + popDuration);

      popSource.connect(popFilter);
      popFilter.connect(popGain);
      popGain.connect(masterGain);

      popSource.start(popTime);
      popSource.stop(popTime + popDuration);
      currentNodes.push(popSource, popFilter, popGain);
    });

    activeCampfireNodes = currentNodes;

    // Tự động ngắt kết nối và giải phóng toàn bộ AudioNode sau khi phát xong (Quy tắc 3 GEMINI.md)
    campfireCleanupTimer = setTimeout(() => {
      stopCampfireSound();
    }, duration * 1000 + 120);
  } catch (err) {
    console.warn('[CampfireAudio] Không thể phát âm thanh campfire:', err);
  }
};

// =============================================================================
// HỆ THỐNG ÂM BÁO KẾT NỐI & THÔNG BÁO CÁ NHÂN HÓA (NOTIFICATION TONE SELECTOR)
// =============================================================================

export const NOTIFICATION_TONE_STORAGE_KEY = 'freedom_notification_tone_v1';

export const NOTIFICATION_TONES = [
  {
    id: 'bamboo_chime',
    name: 'Chuông Gió Tre',
    icon: '🎋',
    desc: 'Thanh thoát, mộc mạc, vang nhẹ tự nhiên',
  },
  {
    id: 'zen_bell',
    name: 'Chuông Ngân Tĩnh Tâm',
    icon: '🔔',
    desc: 'Trầm ấm, ngân dài dịu nhẹ, an yên',
  },
  {
    id: 'gentle_stream',
    name: 'Tiếng Nước Chảy Nhẹ',
    icon: '💧',
    desc: 'Nhịp âm giọt nước suối mát lành, êm ái',
  },
  {
    id: 'muted',
    name: 'Tắt Âm Báo',
    icon: '🔕',
    desc: 'Không phát âm thanh khi có thông báo kết nối',
  },
];

/**
 * Lấy preset âm báo hiện tại từ localStorage (fallback 'bamboo_chime')
 */
export const getStoredNotificationTone = () => {
  try {
    if (typeof localStorage === 'undefined') return 'bamboo_chime';
    const val = localStorage.getItem(NOTIFICATION_TONE_STORAGE_KEY);
    if (!val) return 'bamboo_chime';
    const isValid = NOTIFICATION_TONES.some((t) => t.id === val);
    return isValid ? val : 'bamboo_chime';
  } catch (_) {
    return 'bamboo_chime';
  }
};

/**
 * Lưu preset âm báo vào localStorage và dispatch sự kiện đồng bộ toàn app
 */
export const setStoredNotificationTone = (toneId) => {
  try {
    if (typeof localStorage !== 'undefined') {
      const targetId = toneId || 'bamboo_chime';
      localStorage.setItem(NOTIFICATION_TONE_STORAGE_KEY, targetId);
      window.dispatchEvent(
        new CustomEvent('freedom_notification_tone_changed', { detail: { toneId: targetId } })
      );
    }
  } catch (_) {}
};

let activeNotificationNodes = [];
let notificationCleanupTimer = null;

/**
 * Dọn dẹp an toàn các node âm báo đang phát
 */
export const stopNotificationTone = () => {
  if (notificationCleanupTimer) {
    clearTimeout(notificationCleanupTimer);
    notificationCleanupTimer = null;
  }
  if (activeNotificationNodes.length > 0) {
    activeNotificationNodes.forEach((node) => {
      try {
        if (typeof node.stop === 'function') node.stop();
      } catch (_) {}
      try {
        if (typeof node.disconnect === 'function') node.disconnect();
      } catch (_) {}
    });
    activeNotificationNodes = [];
  }
};

/**
 * Phát âm báo kết nối theo preset (bamboo_chime, zen_bell, gentle_stream, hoặc muted)
 * Tự động ngắt kết nối dọn dẹp RAM, an toàn với autoplay policy.
 */
export const playNotificationTone = async (toneId, { volume = 0.45 } = {}) => {
  const selectedTone = toneId || getStoredNotificationTone();
  if (selectedTone === 'muted') return;
  if (!isCampfireSoundEnabled()) return;

  try {
    stopNotificationTone();

    const ctx = getAudioContext();
    if (!ctx) return;

    if (ctx.state === 'suspended') {
      try {
        await ctx.resume();
      } catch (_) {}
    }

    const now = ctx.currentTime;
    const currentNodes = [];
    let totalDuration = 0.6;

    const masterGain = ctx.createGain();
    const safeVolume = Math.max(0.01, Math.min(1, volume));
    masterGain.gain.setValueAtTime(safeVolume, now);
    masterGain.connect(ctx.destination);
    currentNodes.push(masterGain);

    if (selectedTone === 'zen_bell') {
      // -----------------------------------------------------------------------
      // 1. ZEN BELL: Chuông ngân tĩnh tâm Tây Tạng trầm ấm (G4 392Hz + harmonics)
      // -----------------------------------------------------------------------
      totalDuration = 1.15;

      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(1400, now);
      filter.connect(masterGain);
      currentNodes.push(filter);

      // Nốt chính G4 (392Hz)
      const osc1 = ctx.createOscillator();
      const gain1 = ctx.createGain();
      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(392, now);
      gain1.gain.setValueAtTime(0.0001, now);
      gain1.gain.linearRampToValueAtTime(0.55, now + 0.02);
      gain1.gain.exponentialRampToValueAtTime(0.0001, now + 1.1);
      osc1.connect(gain1);
      gain1.connect(filter);
      osc1.start(now);
      osc1.stop(now + 1.12);
      currentNodes.push(osc1, gain1);

      // Họa âm vi sai (Beating Shimmer 394.5Hz) tạo độ ngân chuông đồng
      const oscBeat = ctx.createOscillator();
      const gainBeat = ctx.createGain();
      oscBeat.type = 'sine';
      oscBeat.frequency.setValueAtTime(394.5, now);
      gainBeat.gain.setValueAtTime(0.0001, now);
      gainBeat.gain.linearRampToValueAtTime(0.3, now + 0.025);
      gainBeat.gain.exponentialRampToValueAtTime(0.0001, now + 0.95);
      oscBeat.connect(gainBeat);
      gainBeat.connect(filter);
      oscBeat.start(now);
      oscBeat.stop(now + 0.98);
      currentNodes.push(oscBeat, gainBeat);

      // Họa âm D5 (588Hz)
      const oscHarmonic = ctx.createOscillator();
      const gainHarmonic = ctx.createGain();
      oscHarmonic.type = 'sine';
      oscHarmonic.frequency.setValueAtTime(588, now);
      gainHarmonic.gain.setValueAtTime(0.0001, now);
      gainHarmonic.gain.linearRampToValueAtTime(0.2, now + 0.015);
      gainHarmonic.gain.exponentialRampToValueAtTime(0.0001, now + 0.7);
      oscHarmonic.connect(gainHarmonic);
      gainHarmonic.connect(filter);
      oscHarmonic.start(now);
      oscHarmonic.stop(now + 0.72);
      currentNodes.push(oscHarmonic, gainHarmonic);
    } else if (selectedTone === 'gentle_stream') {
      // -----------------------------------------------------------------------
      // 2. GENTLE STREAM: Tiếng giọt nước suối chảy nhẹ nhàng (3 giọt róc rách)
      // -----------------------------------------------------------------------
      totalDuration = 0.65;

      const drops = [
        { time: now, startFreq: 520, peakFreq: 980, vol: 0.45, dur: 0.1 },
        { time: now + 0.11, startFreq: 680, peakFreq: 1220, vol: 0.38, dur: 0.09 },
        { time: now + 0.22, startFreq: 580, peakFreq: 1040, vol: 0.42, dur: 0.11 },
      ];

      drops.forEach((d) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(d.startFreq, d.time);
        osc.frequency.exponentialRampToValueAtTime(d.peakFreq, d.time + 0.035);

        gain.gain.setValueAtTime(0.0001, d.time);
        gain.gain.linearRampToValueAtTime(d.vol, d.time + 0.01);
        gain.gain.exponentialRampToValueAtTime(0.0001, d.time + d.dur);

        osc.connect(gain);
        gain.connect(masterGain);
        osc.start(d.time);
        osc.stop(d.time + d.dur + 0.01);
        currentNodes.push(osc, gain);
      });

      // Âm nền dòng chảy êm dịu
      const bufferSize = Math.floor(ctx.sampleRate * 0.45);
      const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const data = noiseBuffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = (Math.random() * 2 - 1) * 0.15;
      }
      const noise = ctx.createBufferSource();
      noise.buffer = noiseBuffer;
      const noiseFilter = ctx.createBiquadFilter();
      noiseFilter.type = 'bandpass';
      noiseFilter.frequency.setValueAtTime(680, now);
      noiseFilter.Q.setValueAtTime(2.5, now);
      const noiseGain = ctx.createGain();
      noiseGain.gain.setValueAtTime(0.0001, now);
      noiseGain.gain.linearRampToValueAtTime(0.06, now + 0.04);
      noiseGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.45);

      noise.connect(noiseFilter);
      noiseFilter.connect(noiseGain);
      noiseGain.connect(masterGain);
      noise.start(now);
      noise.stop(now + 0.46);
      currentNodes.push(noise, noiseFilter, noiseGain);
    } else {
      // -----------------------------------------------------------------------
      // 3. BAMBOO CHIME (Mặc định): Chuông gió tre thanh thoát, vang nhẹ
      // -----------------------------------------------------------------------
      totalDuration = 0.58;

      // Ống tre 1: A5 (880Hz)
      const osc1 = ctx.createOscillator();
      const gain1 = ctx.createGain();
      const filter1 = ctx.createBiquadFilter();
      filter1.type = 'bandpass';
      filter1.frequency.setValueAtTime(880, now);
      filter1.Q.setValueAtTime(6, now);

      osc1.type = 'triangle';
      osc1.frequency.setValueAtTime(880, now);
      gain1.gain.setValueAtTime(0.0001, now);
      gain1.gain.linearRampToValueAtTime(0.55, now + 0.008);
      gain1.gain.exponentialRampToValueAtTime(0.0001, now + 0.38);

      osc1.connect(filter1);
      filter1.connect(gain1);
      gain1.connect(masterGain);
      osc1.start(now);
      osc1.stop(now + 0.39);
      currentNodes.push(osc1, filter1, gain1);

      // Ống tre 2: D6 (1174.66Hz) ngân sau 0.08s
      const t2 = now + 0.08;
      const osc2 = ctx.createOscillator();
      const gain2 = ctx.createGain();
      const filter2 = ctx.createBiquadFilter();
      filter2.type = 'bandpass';
      filter2.frequency.setValueAtTime(1175, t2);
      filter2.Q.setValueAtTime(6.5, t2);

      osc2.type = 'sine';
      osc2.frequency.setValueAtTime(1175, t2);
      gain2.gain.setValueAtTime(0.0001, t2);
      gain2.gain.linearRampToValueAtTime(0.5, t2 + 0.008);
      gain2.gain.exponentialRampToValueAtTime(0.0001, t2 + 0.42);

      osc2.connect(filter2);
      filter2.connect(gain2);
      gain2.connect(masterGain);
      osc2.start(t2);
      osc2.stop(t2 + 0.43);
      currentNodes.push(osc2, filter2, gain2);

      // Tiếng gõ chạm gỗ tre mộc mạc (wood knock click)
      const knockSize = Math.floor(ctx.sampleRate * 0.015);
      const knockBuffer = ctx.createBuffer(1, knockSize, ctx.sampleRate);
      const knockData = knockBuffer.getChannelData(0);
      for (let i = 0; i < knockSize; i++) {
        knockData[i] = (Math.random() * 2 - 1) * Math.exp(-i / (knockSize * 0.35));
      }
      const knock = ctx.createBufferSource();
      knock.buffer = knockBuffer;
      const knockFilter = ctx.createBiquadFilter();
      knockFilter.type = 'bandpass';
      knockFilter.frequency.setValueAtTime(1350, now);
      const knockGain = ctx.createGain();
      knockGain.gain.setValueAtTime(0.18, now);
      knockGain.gain.exponentialRampToValueAtTime(0.001, now + 0.015);

      knock.connect(knockFilter);
      knockFilter.connect(knockGain);
      knockGain.connect(masterGain);
      knock.start(now);
      knock.stop(now + 0.016);
      currentNodes.push(knock, knockFilter, knockGain);
    }

    activeNotificationNodes = currentNodes;

    // Giải phóng toàn bộ node sau khi phát xong (Quy tắc 3 GEMINI.md)
    notificationCleanupTimer = setTimeout(() => {
      stopNotificationTone();
    }, totalDuration * 1000 + 80);
  } catch (err) {
    console.warn('[NotificationTone] Không thể phát âm báo:', err);
  }
};
