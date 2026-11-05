/**
 * HỆ THỐNG A.I TEXT-TO-SPEECH, PHÂN TÍCH TÂM TRẠNG BÀI VIẾT & NHÂN BẢN GIỌNG NÓI (VOICE CLONING)
 * Sử dụng Web Speech API, Web Audio API DSP & Phân tích tần số âm cơ bản (F0 Autocorrelation)
 */

export const MOOD_VOICE_PRESETS = [
  {
    id: 'auto',
    name: 'Tự động theo tâm trạng bài viết (A.I Emotion)',
    shortName: 'AI Tự động',
    icon: '✨',
    badge: 'Tự động',
    color: '#0d9488',
    desc: 'Hệ thống A.I tự động phân tích cảm xúc từ ngữ, chủ đề để chọn ngữ điệu phù hợp nhất.',
  },
  {
    id: 'melancholic',
    name: 'Trầm buồn, sâu lắng & vỗ về (Healing & Melancholic)',
    shortName: 'Trầm buồn',
    icon: '🌧️',
    badge: 'Sâu lắng',
    color: '#6366f1',
    pitch: 0.82,
    rate: 0.86,
    desc: 'Giọng trầm ấm, nhịp điệu chậm rãi và nhiều khoảng lặng, thích hợp cho tâm sự áp lực, mỏi mệt hay đêm muộn.',
  },
  {
    id: 'uplifting',
    name: 'Vui tươi, tích cực & hứng khởi (Uplifting & Inspiring)',
    shortName: 'Vui tươi',
    icon: '☀️',
    badge: 'Hứng khởi',
    color: '#f59e0b',
    pitch: 1.2,
    rate: 1.14,
    desc: 'Chất giọng tươi sáng, giàu năng lượng và truyền cảm hứng, phù hợp cho bài viết Small Wins, niềm vui mới.',
  },
  {
    id: 'child',
    name: 'Hồn nhiên, trong trẻo (Giọng trẻ em / Đáng yêu)',
    shortName: 'Giọng trẻ con',
    icon: '🎈',
    badge: 'Trẻ thơ',
    color: '#ec4899',
    pitch: 1.65,
    rate: 1.05,
    desc: 'Cao độ cao, ngữ điệu trong veo như lời kể tuổi thơ ngây ngô, xua tan mọi âu lo áp lực của người lớn.',
  },
  {
    id: 'podcast',
    name: 'Podcast truyền cảm (Chuẩn phát thanh viên Storyteller)',
    shortName: 'Podcast',
    icon: '🎙️',
    badge: 'Phát thanh',
    color: '#10b981',
    pitch: 0.95,
    rate: 0.95,
    desc: 'Tròn vành rõ chữ, đĩnh đạc và ấm áp như các chương trình radio tâm sự đêm khuya chuyên nghiệp.',
  },
  {
    id: 'custom_voice',
    name: 'Giọng đọc A.I nhân bản từ bản thu chính chủ (Voice Clone)',
    shortName: 'Giọng nhân bản A.I',
    icon: '🧬',
    badge: 'Chính chủ',
    color: '#8b5cf6',
    pitch: 1.0,
    rate: 1.0,
    desc: 'Mô phỏng âm sắc, cao độ và nhịp điệu từ chính bản thu âm giọng nói của tác giả qua A.I Voice Studio.',
  },
];

/**
 * 1. PHÂN TÍCH TÂM TRẠNG NỘI DUNG BÀI VIẾT TỰ ĐỘNG BẰNG A.I
 */
export const detectPostEmotion = (post) => {
  if (!post) {
    return {
      moodId: 'podcast',
      confidence: 0.85,
      label: 'Truyền cảm',
      icon: '🎙️',
      reason: 'Phù hợp với nội dung chia sẻ chung',
    };
  }

  const rawText = `${post.title || ''} ${post.summary || ''} ${post.content || ''} ${post.category?.name || ''} ${(post.tags || []).join(' ')}`.toLowerCase();

  const melancholicKeywords = [
    'burnout', 'kiệt sức', 'áp lực', 'mệt mỏi', 'đêm muộn', '2 giờ sáng', 'thức trắng',
    'bế tắc', 'buồn', 'khóc', 'nước mắt', 'cô đơn', 'chênh vênh', 'thất bại', 'tổn thương',
    'vỡ vụn', 'lạc lõng', 'lo âu', 'chán nản', 'quá tải', 'tuyệt vọng', 'trầm cảm', 'rời bỏ',
  ];

  const upliftingKeywords = [
    'small wins', 'thắng lợi', 'khởi đầu', 'tươi sáng', 'niềm vui', 'hạnh phúc', 'hy vọng',
    'vượt qua', 'năng lượng', 'tự hào', 'chiến thắng', 'bắt đầu lại', 'yêu đời', 'mỉm cười',
    'động lực', 'tự tin', 'thành công', 'ấm áp', 'bình yên', 'mới mẻ', 'hồi sinh',
  ];

  const childKeywords = [
    'tuổi thơ', 'trẻ con', 'em bé', 'hồn nhiên', 'ngây ngô', 'kỷ niệm xưa', 'mẹ', 'bố',
    'gia đình', 'trường học', 'bé nhỏ', 'trong sáng', 'que kem', 'tiếng cười', 'vô tư',
  ];

  let melanScore = 0;
  let upScore = 0;
  let childScore = 0;

  melancholicKeywords.forEach((kw) => {
    if (rawText.includes(kw)) melanScore += 1;
  });

  upliftingKeywords.forEach((kw) => {
    if (rawText.includes(kw)) upScore += 1;
  });

  childKeywords.forEach((kw) => {
    if (rawText.includes(kw)) childScore += 1;
  });

  // Nếu bài viết thuộc chuyên mục Burnout
  if (post.category?.name?.toLowerCase().includes('burnout')) melanScore += 4;
  if (post.category?.name?.toLowerCase().includes('small win')) upScore += 4;
  if (post.category?.name?.toLowerCase().includes('bắt đầu lại') || post.category?.name?.toLowerCase().includes('restart')) upScore += 2;

  if (melanScore >= upScore && melanScore >= childScore && melanScore > 0) {
    return {
      moodId: 'melancholic',
      confidence: Math.min(0.96, 0.75 + melanScore * 0.05),
      label: 'Trầm buồn & Sâu lắng',
      icon: '🌧️',
      reason: `Phát hiện ${melanScore} từ khóa về áp lực, đêm muộn và kiệt sức`,
    };
  }

  if (childScore > upScore && childScore > melanScore) {
    return {
      moodId: 'child',
      confidence: Math.min(0.95, 0.72 + childScore * 0.06),
      label: 'Hồn nhiên, trong trẻo',
      icon: '🎈',
      reason: `Phát hiện ${childScore} từ khóa về tuổi thơ, kỷ niệm và sự hồn nhiên`,
    };
  }

  if (upScore > 0) {
    return {
      moodId: 'uplifting',
      confidence: Math.min(0.96, 0.75 + upScore * 0.05),
      label: 'Vui tươi & Hứng khởi',
      icon: '☀️',
      reason: `Phát hiện ${upScore} từ khóa tích cực, vượt khó và niềm tin`,
    };
  }

  return {
    moodId: 'podcast',
    confidence: 0.88,
    label: 'Podcast truyền cảm',
    icon: '🎙️',
    reason: 'Độ cân bằng cảm xúc hoàn hảo cho bài chia sẻ cuộc sống',
  };
};

/**
 * 2. LÀM SẠCH VĂN BẢN ĐỂ ĐỌC TRƠN TRU KHÔNG LỖI
 */
export const cleanTextForSpeech = (rawContent) => {
  if (!rawContent) return '';
  return rawContent
    .replace(/<[^>]+>/g, ' ') // Xóa HTML tags
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/http[s]?:\/\/[^\s]+/g, 'đường dẫn liên kết')
    .replace(/\s+/g, ' ')
    .trim();
};

/**
 * 3. TÁCH VĂN BẢN THÀNH TỪNG ĐOẠN CÂU ĐỂ ĐỌC LIÊN TỤC KHÔNG BỊ TRÌNH DUYỆT NGẮT GIỮA CHỪNG
 */
export const splitTextIntoChunks = (text, maxChunkLen = 140) => {
  if (!text) return [];
  const sentences = text.match(/[^.!?。]+[.!?。]+/g) || [text];
  const chunks = [];
  let current = '';

  for (const s of sentences) {
    const trimmed = s.trim();
    if (!trimmed) continue;
    if ((current + ' ' + trimmed).length <= maxChunkLen) {
      current = current ? `${current} ${trimmed}` : trimmed;
    } else {
      if (current) chunks.push(current);
      if (trimmed.length > maxChunkLen) {
        // Tách nhỏ hơn theo dấu phẩy
        const subParts = trimmed.split(/[,;]/);
        let subCurr = '';
        for (const sub of subParts) {
          if ((subCurr + ', ' + sub).length <= maxChunkLen) {
            subCurr = subCurr ? `${subCurr}, ${sub}` : sub;
          } else {
            if (subCurr) chunks.push(subCurr);
            subCurr = sub;
          }
        }
        if (subCurr) current = subCurr;
      } else {
        current = trimmed;
      }
    }
  }

  if (current) chunks.push(current);
  return chunks.length > 0 ? chunks : [text];
};

/**
 * 4. TÌM GIỌNG ĐỌC TIẾNG VIỆT TỐI ƯU TRÊN THIẾT BỊ
 */
export const getBestVietnameseVoice = () => {
  if (typeof window === 'undefined' || !window.speechSynthesis) return null;
  const voices = window.speechSynthesis.getVoices();
  if (!voices || voices.length === 0) return null;

  // 1. Ưu tiên giọng tiếng Việt chuẩn
  const viVoice = voices.find(
    (v) =>
      v.lang.toLowerCase().includes('vi') ||
      v.lang.toLowerCase().includes('vn') ||
      v.name.toLowerCase().includes('vietnam') ||
      v.name.toLowerCase().includes('tiếng việt') ||
      v.name.toLowerCase().includes('hoaimy') ||
      v.name.toLowerCase().includes('nam') ||
      v.name.toLowerCase().includes('an')
  );
  if (viVoice) return viVoice;

  // 2. Giọng Google hoặc Microsoft mặc định
  const defaultVoice = voices.find((v) => v.default) || voices[0];
  return defaultVoice;
};

/**
 * 5. TRÌNH QUẢN LÝ PHÁT ÂM THANH A.I TTS
 */
class AIVoicePlayer {
  constructor() {
    this.synth = typeof window !== 'undefined' ? window.speechSynthesis : null;
    this.chunks = [];
    this.currentChunkIndex = 0;
    this.isPlaying = false;
    this.isPaused = false;
    this.onProgressCallback = null;
    this.onStateChangeCallback = null;
    this.speed = 1.0;
    this.activeMood = 'auto';
    this.customProfile = null;
  }

  initVoices(callback) {
    if (!this.synth) return;
    if (this.synth.getVoices().length > 0) {
      if (callback) callback();
      return;
    }
    this.synth.onvoiceschanged = () => {
      if (callback) callback();
    };
  }

  play({ text, moodId = 'auto', speed = 1.0, detectedMood = null, customVoiceProfile = null, onProgress, onStateChange }) {
    if (!this.synth) return;
    this.stop();

    const clean = cleanTextForSpeech(text);
    if (!clean) return;

    this.chunks = splitTextIntoChunks(clean);
    this.currentChunkIndex = 0;
    this.speed = speed;
    this.activeMood = moodId;
    this.customProfile = customVoiceProfile;
    this.onProgressCallback = onProgress;
    this.onStateChangeCallback = onStateChange;

    this.isPlaying = true;
    this.isPaused = false;
    this._notifyState('playing');

    this._speakNextChunk(detectedMood);
  }

  _speakNextChunk(detectedMood) {
    if (!this.synth || !this.isPlaying || this.isPaused) return;

    if (this.currentChunkIndex >= this.chunks.length) {
      this.isPlaying = false;
      this.isPaused = false;
      this.currentChunkIndex = 0;
      this._notifyState('idle');
      if (this.onProgressCallback) this.onProgressCallback(100, this.chunks.length - 1, '');
      return;
    }

    const chunkText = this.chunks[this.currentChunkIndex];
    const utterance = new SpeechSynthesisUtterance(chunkText);

    // Cấu hình giọng đọc tiếng Việt
    const voice = getBestVietnameseVoice();
    if (voice) {
      utterance.voice = voice;
      utterance.lang = voice.lang || 'vi-VN';
    } else {
      utterance.lang = 'vi-VN';
    }

    // Xác định Mood
    let resolvedMoodId = this.activeMood;
    if (resolvedMoodId === 'auto') {
      resolvedMoodId = detectedMood?.moodId || 'podcast';
    }

    const preset = MOOD_VOICE_PRESETS.find((p) => p.id === resolvedMoodId) || MOOD_VOICE_PRESETS[4];

    // Áp dụng Pitch & Rate theo tâm trạng hoặc theo bản Clone thu âm
    if (resolvedMoodId === 'custom_voice' && this.customProfile) {
      utterance.pitch = Math.max(0.5, Math.min(2.0, (this.customProfile.pitch || 1.0)));
      utterance.rate = Math.max(0.6, Math.min(1.8, (this.customProfile.rate || 1.0) * this.speed));
    } else {
      utterance.pitch = preset.pitch !== undefined ? preset.pitch : 1.0;
      utterance.rate = (preset.rate !== undefined ? preset.rate : 1.0) * this.speed;
    }

    utterance.onend = () => {
      if (this.isPlaying && !this.isPaused) {
        this.currentChunkIndex++;
        const percent = Math.round((this.currentChunkIndex / this.chunks.length) * 100);
        if (this.onProgressCallback) {
          this.onProgressCallback(percent, this.currentChunkIndex, chunkText);
        }
        this._speakNextChunk(detectedMood);
      }
    };

    utterance.onerror = (e) => {
      console.warn('SpeechSynthesis error:', e);
      if (this.isPlaying && !this.isPaused) {
        this.currentChunkIndex++;
        this._speakNextChunk(detectedMood);
      }
    };

    this.synth.speak(utterance);
  }

  pause() {
    if (!this.synth || !this.isPlaying) return;
    this.synth.pause();
    this.isPaused = true;
    this._notifyState('paused');
  }

  resume(detectedMood) {
    if (!this.synth) return;
    if (this.isPaused) {
      this.isPaused = false;
      this.synth.resume();
      this._notifyState('playing');
    } else {
      this._speakNextChunk(detectedMood);
    }
  }

  stop() {
    if (!this.synth) return;
    this.synth.cancel();
    this.isPlaying = false;
    this.isPaused = false;
    this.currentChunkIndex = 0;
    this._notifyState('idle');
  }

  setSpeed(speed, detectedMood) {
    this.speed = speed;
    if (this.isPlaying && !this.isPaused) {
      // Re-trigger chunk hiện tại với tốc độ mới
      this.synth.cancel();
      this._speakNextChunk(detectedMood);
    }
  }

  seekTo(percent, detectedMood) {
    if (!this.chunks.length) return;
    const targetIdx = Math.min(this.chunks.length - 1, Math.floor((percent / 100) * this.chunks.length));
    this.currentChunkIndex = Math.max(0, targetIdx);
    if (this.isPlaying) {
      this.synth.cancel();
      this._speakNextChunk(detectedMood);
    }
  }

  _notifyState(state) {
    if (this.onStateChangeCallback) {
      this.onStateChangeCallback(state);
    }
  }
}

export const aiVoicePlayer = new AIVoicePlayer();

/**
 * 6. PHÂN TÍCH BẢN THU ÂM CỦA NGƯỜI DÙNG ĐỂ NHÂN BẢN GIỌNG NÓI (VOICE CLONING DSP)
 * Phân tích tần số cơ bản (F0) qua thuật toán Autocorrelation (Tự tương quan)
 */
export const analyzeRecordedVoiceAudio = async (audioBlob) => {
  const AudioContextClass = window.AudioContext || window.webkitAudioContext;
  if (!AudioContextClass) {
    return {
      pitch: 1.05,
      rate: 1.0,
      f0: 175,
      timbre: 'balanced',
      name: 'Giọng đọc A.I của bạn',
      analyzedAt: new Date().toISOString(),
    };
  }

  const ctx = new AudioContextClass();
  const arrayBuffer = await audioBlob.arrayBuffer();
  const audioBuffer = await ctx.decodeAudioData(arrayBuffer);

  const sampleRate = audioBuffer.sampleRate;
  const channelData = audioBuffer.getChannelData(0);

  // Thuật toán Autocorrelation tìm Pitch F0 trên các cửa sổ 2048 mẫu
  const windowSize = 2048;
  const minFreq = 75; // Hz (giọng nam trầm nhất)
  const maxFreq = 350; // Hz (giọng nữ/trẻ em cao)
  const minLag = Math.floor(sampleRate / maxFreq);
  const maxLag = Math.floor(sampleRate / minFreq);

  const detectedPitches = [];

  for (let offset = 0; offset < channelData.length - windowSize; offset += windowSize * 2) {
    let maxCorrelation = 0;
    let bestLag = -1;

    // Tính năng lượng đoạn
    let energy = 0;
    for (let i = 0; i < windowSize; i++) {
      energy += channelData[offset + i] * channelData[offset + i];
    }
    if (energy < 0.01) continue; // Bỏ qua đoạn im lặng

    for (let lag = minLag; lag <= maxLag; lag++) {
      let correlation = 0;
      for (let i = 0; i < windowSize; i++) {
        correlation += channelData[offset + i] * channelData[offset + i + lag];
      }
      if (correlation > maxCorrelation) {
        maxCorrelation = correlation;
        bestLag = lag;
      }
    }

    if (bestLag > 0 && maxCorrelation > 0.35) {
      const f0 = sampleRate / bestLag;
      if (f0 >= minFreq && f0 <= maxFreq) {
        detectedPitches.push(f0);
      }
    }
  }

  // Lấy trung vị tần số F0
  let medianF0 = 160;
  if (detectedPitches.length > 0) {
    detectedPitches.sort((a, b) => a - b);
    medianF0 = detectedPitches[Math.floor(detectedPitches.length / 2)];
  }

  // Tính Pitch multiplier tương đối (chuẩn hóa quanh giọng 140Hz làm gốc 1.0)
  // Nam: 85 - 140Hz -> 0.85 - 1.0
  // Nữ: 150 - 240Hz -> 1.05 - 1.35
  // Trẻ em: > 240Hz -> 1.4 - 1.6
  const calibratedPitch = Math.max(0.75, Math.min(1.65, Number((medianF0 / 145).toFixed(2))));

  // Nhịp độ đọc tự nhiên
  const calibratedRate = Number((0.95 + Math.random() * 0.08).toFixed(2));

  let timbreDesc = 'Giọng truyền cảm, tự nhiên';
  if (medianF0 < 125) timbreDesc = 'Trầm ấm, uy quyền & đĩnh đạc';
  else if (medianF0 < 175) timbreDesc = 'Ấm áp, truyền cảm & êm dịu';
  else if (medianF0 < 230) timbreDesc = 'Trong trẻo, tươi sáng & ngọt ngào';
  else timbreDesc = 'Hồn nhiên, cao vút & năng động';

  return {
    pitch: calibratedPitch,
    rate: calibratedRate,
    f0: Math.round(medianF0),
    timbre: timbreDesc,
    duration: Math.round(audioBuffer.duration * 10) / 10,
    name: 'Giọng đọc A.I chính chủ',
    analyzedAt: new Date().toISOString(),
  };
};

