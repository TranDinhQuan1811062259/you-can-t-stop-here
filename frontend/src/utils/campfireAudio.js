/**
 * Bộ tạo âm thanh Tiếng Củi Bùng Lửa & Tí Tách (Campfire Crackle SFX)
 * Sử dụng Web Audio API thuần (procedural audio synthesis), không tải file ngoài.
 * An toàn với chính sách Autoplay của trình duyệt & tự động thu hồi tài nguyên (Quy tắc 3 & 4 GEMINI.md).
 */

let campfireAudioCtx = null;

const getAudioContext = () => {
  if (typeof window === 'undefined') return null;
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

/**
 * Phát hiệu ứng tiếng củi lửa lách tách và bùng lửa ấm áp kéo dài khoảng 0.7s - 0.85s
 */
export const playCampfireSound = async ({ volume = 0.45 } = {}) => {
  if (!isCampfireSoundEnabled()) return;

  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    // Kích hoạt lại AudioContext nếu đang ở trạng thái suspended do Autoplay Policy
    if (ctx.state === 'suspended') {
      try {
        await ctx.resume();
      } catch (resumeErr) {
        console.warn('[CampfireAudio] Autoplay policy blocked resume:', resumeErr);
      }
    }

    const now = ctx.currentTime;
    const duration = 0.85;

    // Master Gain Node cho toàn bộ hiệu ứng
    const masterGain = ctx.createGain();
    masterGain.gain.setValueAtTime(Math.max(0, Math.min(1, volume)), now);
    masterGain.connect(ctx.destination);

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
    });

    // Tự động ngắt kết nối sau khi phát xong để chống rò rỉ bộ nhớ
    setTimeout(() => {
      try {
        masterGain.disconnect();
      } catch (_) {}
    }, duration * 1000 + 100);
  } catch (err) {
    console.warn('[CampfireAudio] Không thể phát âm thanh campfire:', err);
  }
};
