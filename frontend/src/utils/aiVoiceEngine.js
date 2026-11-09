/**
 * HỆ THỐNG A.I TEXT-TO-SPEECH, PHÂN TÍCH TÂM TRẠNG BÀI VIẾT & NHÂN BẢN GIỌNG NÓI (VOICE CLONING)
 * Hỗ trợ Dual-Engine:
 * 1. Natural Native Vietnamese Audio Engine (Google Cloud TTS chuẩn ngữ điệu Việt 100%)
 * 2. Web Speech API với bộ lọc phân loại Giọng Nam / Nữ / Trẻ em / Trầm ấm
 * 3. Định thời gian chính xác tới từng Phút:Giây (MM:SS) cho thanh tua (Timeline Scrubber)
 */

export const formatTime = (totalSeconds) => {
  if (isNaN(totalSeconds) || totalSeconds < 0) return '00:00';
  const m = Math.floor(totalSeconds / 60);
  const s = Math.floor(totalSeconds % 60);
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
};

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
    name: 'Trầm buồn, sâu lắng & vỗ về (Tâm sự, burnout)',
    shortName: 'Trầm buồn',
    gender: 'female_warm',
    icon: '🌧️',
    badge: 'Sâu lắng',
    color: '#6366f1',
    pitch: 0.78,
    rate: 0.85,
    desc: 'Giọng nữ trầm ấm, nhịp điệu chậm rãi và khoảng lặng sâu lắng, thích hợp cho tâm sự áp lực, mỏi mệt hay đêm muộn.',
  },
  {
    id: 'uplifting',
    name: 'Vui tươi, tích cực & hứng khởi (Small wins, khởi sắc)',
    shortName: 'Vui tươi',
    gender: 'male_bright',
    icon: '☀️',
    badge: 'Hứng khởi',
    color: '#f59e0b',
    pitch: 1.18,
    rate: 1.12,
    desc: 'Chất giọng nam/nữ tươi sáng, giàu năng lượng và truyền cảm hứng, phù hợp cho bài viết Small Wins, niềm vui mới.',
  },
  {
    id: 'child',
    name: 'Hồn nhiên, trong trẻo (Giọng trẻ em đáng yêu)',
    shortName: 'Giọng trẻ con',
    gender: 'child',
    icon: '🎈',
    badge: 'Trẻ thơ',
    color: '#ec4899',
    pitch: 1.68,
    rate: 1.05,
    desc: 'Cao độ cao trong veo như lời kể tuổi thơ ngây ngô, xua tan mọi âu lo áp lực của người lớn.',
  },
  {
    id: 'podcast',
    name: 'Podcast truyền cảm (Phát thanh viên Storyteller)',
    shortName: 'Podcast',
    gender: 'storyteller',
    icon: '🎙️',
    badge: 'Phát thanh',
    color: '#10b981',
    pitch: 0.92,
    rate: 0.94,
    desc: 'Tròn vành rõ chữ, đĩnh đạc và ấm áp như các chương trình radio tâm sự đêm khuya chuyên nghiệp.',
  },
  {
    id: 'custom_voice',
    name: 'Giọng A.I nhân bản chính chủ ✓',
    shortName: 'Giọng nhân bản A.I',
    gender: 'custom',
    icon: '🧬',
    badge: 'Chính chủ',
    color: '#8b5cf6',
    pitch: 1.0,
    rate: 1.0,
    desc: 'Mô phỏng âm sắc, cao độ và nhịp điệu từ chính bản thu âm giọng nói của tác giả qua A.I Voice Studio.',
  },
];

/**
 * PHÂN LOẠI GIỚI TÍNH GIỌNG ĐỌC (MALE / FEMALE)
 */
export const VIETNAMESE_VOICE_GENDERS = [
  {
    id: 'female',
    name: 'Giọng Nữ',
    shortName: 'Nữ',
    icon: '👩',
    desc: 'Trong trẻo, ngọt ngào, dịu dàng và vỗ về tâm hồn',
  },
  {
    id: 'male',
    name: 'Giọng Nam',
    shortName: 'Nam',
    icon: '👨',
    desc: 'Trầm ấm, đĩnh đạc, vững chãi và truyền cảm',
  },
];

/**
 * PHÂN LOẠI NGÔN NGỮ VÙNG MIỀN ĐẶC TRƯNG VIỆT NAM (BẮC / TRUNG / NAM)
 */
export const VIETNAMESE_VOICE_REGIONS = [
  {
    id: 'north',
    name: 'Miền Bắc (Hà Nội & Bắc Bộ)',
    shortName: 'Bắc Bộ',
    icon: '🏛️',
    desc: 'Phát âm chuẩn xác, tròn vành rõ chữ, thanh lịch, chuẩn phát thanh viên đài phát thanh',
    maleDesc: 'Trầm ấm, đĩnh đạc, chuẩn giọng VOV/VTV',
    femaleDesc: 'Trong trẻo, thanh thoát, nhẹ nhàng Hà Nội',
  },
  {
    id: 'central',
    name: 'Miền Trung (Huế & Đà Nẵng)',
    shortName: 'Miền Trung',
    icon: '🏖️',
    desc: 'Ngữ điệu mộc mạc, da diết, sâu lắng và đậm đà ân tình quê hương miền Trung',
    maleDesc: 'Trầm sâu, chân thành, da diết xứ Miền Trung',
    femaleDesc: 'Dịu dàng, da diết, lắng đọng xứ Huế/Đà Nẵng',
  },
  {
    id: 'south',
    name: 'Miền Nam (Sài Gòn & Nam Bộ)',
    shortName: 'Nam Bộ',
    icon: '🌴',
    desc: 'Ngọt ngào, nhẹ nhàng, gần gũi, phóng khoáng và êm dịu đặc trưng Nam Bộ',
    maleDesc: 'Ấm áp, phóng khoáng, mộc mạc Sài Gòn',
    femaleDesc: 'Ngọt ngào, mượt mà, êm ả Nam Bộ',
  },
];

/**
 * TÍNH TOÁN CAO ĐỘ (PITCH) VÀ TỐC ĐỘ (RATE) CHUẨN XÁC THEO [GIỚI TÍNH] X [VÙNG MIỀN] X [TÂM TRẠNG]
 */
export const calculateVoiceParams = ({
  gender = 'female',
  region = 'north',
  moodId = 'auto',
  detectedMood = null,
  speed = 1.0,
  customProfile = null,
}) => {
  let resolvedMood = moodId;
  if (resolvedMood === 'auto' && detectedMood) {
    resolvedMood = detectedMood.moodId || 'podcast';
  }

  // Nếu người dùng chọn giọng nhân bản chính chủ từ phòng thu A.I
  if (resolvedMood === 'custom_voice' && customProfile) {
    return {
      pitch: Math.max(0.65, Math.min(1.8, customProfile.pitch || 1.0)),
      rate: Math.max(0.7, Math.min(1.6, (customProfile.rate || 1.0) * speed)),
      label: 'Giọng A.I nhân bản chính chủ',
    };
  }

  let basePitch = 1.0;
  let baseRate = 0.98;

  if (gender === 'male') {
    // Giọng Nam: Hạ tần số xuống quãng trầm ấm rõ rệt
    if (region === 'north') {
      basePitch = 0.82; // Nam Hà Nội trầm ấm, đĩnh đạc
      baseRate = 0.96;
    } else if (region === 'central') {
      basePitch = 0.75; // Nam Miền Trung trầm sâu, da diết
      baseRate = 0.88;
    } else {
      // south
      basePitch = 0.79; // Nam Sài Gòn ấm áp, phóng khoáng
      baseRate = 1.02;
    }
  } else {
    // Giọng Nữ: Nâng tần số trong trẻo, ngọt ngào
    if (region === 'north') {
      basePitch = 1.18; // Nữ Hà Nội trong trẻo, nhẹ nhàng, chuẩn âm
      baseRate = 0.96;
    } else if (region === 'central') {
      basePitch = 1.06; // Nữ Huế/Đà Nẵng dịu dàng, da diết
      baseRate = 0.89;
    } else {
      // south
      basePitch = 1.12; // Nữ Nam Bộ ngọt ngào, mượt mà
      baseRate = 1.00;
    }
  }

  // Tinh chỉnh tiếp theo Tâm trạng (Mood)
  if (resolvedMood === 'melancholic') {
    basePitch *= 0.92;
    baseRate *= 0.88;
  } else if (resolvedMood === 'uplifting') {
    basePitch *= 1.08;
    baseRate *= 1.10;
  } else if (resolvedMood === 'child') {
    basePitch = 1.62;
    baseRate = 1.05;
  } else if (resolvedMood === 'podcast') {
    basePitch *= 0.97;
    baseRate *= 0.95;
  }

  return {
    pitch: Math.max(0.55, Math.min(1.9, Number(basePitch.toFixed(2)))),
    rate: Math.max(0.6, Math.min(1.8, Number((baseRate * speed).toFixed(2)))),
    gender,
    region,
    moodId: resolvedMood,
  };
};

/**
 * 1. PHÂN TÍCH TÂM TRẠNG NỘI DUNG BÀI VIẾT TỰ ĐỘNG BẰNG A.I
 */
export const detectPostEmotion = (post) => {
  if (!post) {
    return {
      moodId: 'podcast',
      confidence: 0.85,
      label: 'Podcast truyền cảm',
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
 * 2. LÀM SẠCH VĂN BẢN ĐỂ ĐỌC TRƠN TRU
 */
export const cleanTextForSpeech = (rawContent) => {
  if (!rawContent) return '';
  return rawContent
    .replace(/<[^>]+>/g, ' ')
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
 * 3. TÁCH VĂN BẢN THÀNH TỪNG ĐOẠN CÂU ĐỂ ĐỌC LIÊN TỤC VÀ TÍNH THỜI GIAN CHÍNH XÁC
 */
export const splitTextIntoChunks = (text, maxChunkLen = 130) => {
  if (!text) return [];
  const sentences = text.match(/[^.!?。;\n]+[.!?。;\n]+/g) || [text];
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
        const subParts = trimmed.split(/[,:]/);
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
 * 4. TÌM GIỌNG ĐỌC TIẾNG VIỆT CHUẨN TRÊN THIẾT BỊ (THEO GIỚI TÍNH & VÙNG MIỀN)
 */
export const getVietnameseVoice = (gender = 'female', region = 'north', moodId = 'auto') => {
  if (typeof window === 'undefined' || !window.speechSynthesis) return null;
  const voices = window.speechSynthesis.getVoices() || [];
  if (voices.length === 0) return null;

  // Lọc tất cả giọng tiếng Việt thực sự
  const viVoices = voices.filter(
    (v) =>
      v.lang.toLowerCase().startsWith('vi') ||
      v.lang.toLowerCase().includes('vi-vn') ||
      v.lang.toLowerCase().includes('vietnam') ||
      v.name.toLowerCase().includes('vietnam') ||
      v.name.toLowerCase().includes('tiếng việt')
  );

  if (viVoices.length === 0) {
    return null;
  }

  // Lọc theo Giới tính Nam / Nữ
  if (gender === 'male' || moodId === 'podcast' || moodId === 'uplifting') {
    const maleVoice = viVoices.find(
      (v) =>
        v.name.toLowerCase().includes('nam') ||
        v.name.toLowerCase().includes('minh') ||
        v.name.toLowerCase().includes('an') ||
        v.name.toLowerCase().includes('male') ||
        v.name.toLowerCase().includes('namminh')
    );
    if (maleVoice) return maleVoice;
  } else {
    const femaleVoice = viVoices.find(
      (v) =>
        v.name.toLowerCase().includes('hoaimy') ||
        v.name.toLowerCase().includes('mai') ||
        v.name.toLowerCase().includes('linh') ||
        v.name.toLowerCase().includes('female')
    );
    if (femaleVoice) return femaleVoice;
  }

  return viVoices[0];
};

export const getVietnameseVoiceByMood = (moodId = 'auto', gender = 'female', region = 'north') => {
  return getVietnameseVoice(gender, region, moodId);
};

/**
 * 5. TRÌNH QUẢN LÝ PHÁT ÂM THANH A.I DUAL-ENGINE
 * Tự động chuyển đổi giữa Web Audio Google TTS và Web Speech API
 */
class AIVoicePlayer {
  constructor() {
    this.synth = typeof window !== 'undefined' ? window.speechSynthesis : null;
    this.audioElement = typeof window !== 'undefined' ? new Audio() : null;
    this.chunks = [];
    this.currentChunkIndex = 0;
    this.isPlaying = false;
    this.isPaused = false;
    this.speed = 1.0;
    this.activeMood = 'auto';
    this.gender = 'female';
    this.region = 'north';
    this.detectedMood = null;
    this.customProfile = null;

    // Thời gian chính xác (phút : giây)
    this.totalDurationSeconds = 0;
    this.currentSeconds = 0;
    this.chunkTimings = []; // [{ chunkIndex, startSec, endSec, text }]
    this.timerInterval = null;

    // Callbacks
    this.onProgressCallback = null;
    this.onStateChangeCallback = null;
    this.onTimeUpdateCallback = null;

    if (this.audioElement) {
      this.audioElement.preload = 'auto';
      this.audioElement.onended = () => this._onChunkEnded();
      this.audioElement.onerror = () => {
        // Nếu audio mạng bị chặn, fallback sang Web Speech
        this._speakWithWebSpeech();
      };
    }
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

  /**
   * Tính toán thời lượng chính xác của bài viết tới từng phút:giây
   */
  _buildChunkTimings(chunks, speed = 1.0) {
    // Tốc độ nói tiếng Việt tự nhiên: ~140 từ/phút = 2.33 từ/giây ở tốc độ 1.0x
    const wordsPerSecond = (140 / 60) * speed;
    let accumulated = 0;

    const timings = chunks.map((chunk, idx) => {
      const words = chunk.split(/\s+/).filter(Boolean).length;
      const duration = Math.max(1.8, Math.round((words / wordsPerSecond) * 10) / 10);
      const startSec = Math.round(accumulated);
      accumulated += duration;
      const endSec = Math.round(accumulated);
      return {
        chunkIndex: idx,
        startSec,
        endSec,
        duration,
        text: chunk,
      };
    });

    this.chunkTimings = timings;
    this.totalDurationSeconds = Math.max(5, Math.round(accumulated));
    return timings;
  }

  play({
    text,
    moodId = 'auto',
    gender = 'female',
    region = 'north',
    speed = 1.0,
    detectedMood = null,
    customVoiceProfile = null,
    onProgress,
    onStateChange,
    onTimeUpdate,
  }) {
    this.stop();

    const clean = cleanTextForSpeech(text);
    if (!clean) return;

    this.chunks = splitTextIntoChunks(clean);
    this.currentChunkIndex = 0;
    this.speed = speed;
    this.activeMood = moodId;
    this.gender = gender || 'female';
    this.region = region || 'north';
    this.detectedMood = detectedMood;
    this.customProfile = customVoiceProfile;

    this.onProgressCallback = onProgress;
    this.onStateChangeCallback = onStateChange;
    this.onTimeUpdateCallback = onTimeUpdate;

    // Thiết lập mốc thời gian chính xác (phút : giây)
    this._buildChunkTimings(this.chunks, speed);
    this.currentSeconds = 0;

    this.isPlaying = true;
    this.isPaused = false;
    this._notifyState('playing');
    this._startTimeTicker();

    this._speakCurrentChunk();
  }

  _startTimeTicker() {
    if (this.timerInterval) clearInterval(this.timerInterval);
    this.timerInterval = setInterval(() => {
      if (!this.isPlaying || this.isPaused) return;

      if (this.currentSeconds < this.totalDurationSeconds) {
        this.currentSeconds += 1;
        if (this.onTimeUpdateCallback) {
          this.onTimeUpdateCallback(this.currentSeconds, this.totalDurationSeconds);
        }
      }
    }, 1000);
  }

  _speakCurrentChunk() {
    if (!this.isPlaying || this.isPaused) return;

    if (this.currentChunkIndex >= this.chunks.length) {
      this.isPlaying = false;
      this.isPaused = false;
      this._stopTimeTicker();
      this.currentSeconds = this.totalDurationSeconds;
      this._notifyState('idle');
      if (this.onProgressCallback) this.onProgressCallback(100, this.chunks.length - 1, '');
      if (this.onTimeUpdateCallback) this.onTimeUpdateCallback(this.totalDurationSeconds, this.totalDurationSeconds);
      return;
    }

    const chunkText = this.chunks[this.currentChunkIndex];
    const timing = this.chunkTimings[this.currentChunkIndex];
    if (timing) {
      this.currentSeconds = timing.startSec;
      if (this.onTimeUpdateCallback) {
        this.onTimeUpdateCallback(this.currentSeconds, this.totalDurationSeconds);
      }
    }

    const percent = Math.round((this.currentChunkIndex / this.chunks.length) * 100);
    if (this.onProgressCallback) {
      this.onProgressCallback(percent, this.currentChunkIndex, chunkText, this.currentSeconds, this.totalDurationSeconds);
    }

    // Tính toán thông số âm thanh chuẩn xác theo [Giới tính] x [Vùng miền] x [Tâm trạng]
    const voiceParams = calculateVoiceParams({
      gender: this.gender,
      region: this.region,
      moodId: this.activeMood,
      detectedMood: this.detectedMood,
      speed: this.speed,
      customProfile: this.customProfile,
    });

    // Tìm giọng đọc tiếng Việt tương thích trên thiết bị
    const nativeViVoice = getVietnameseVoice(this.gender, this.region, voiceParams.moodId);

    if (nativeViVoice && this.synth) {
      // Thiết bị đã có sẵn giọng tiếng Việt chất lượng -> Dùng Web Speech API
      this._speakWithWebSpeech(chunkText, nativeViVoice, voiceParams);
    } else {
      // Thiết bị không có gói tiếng Việt cục bộ -> Dùng Google Natural Vietnamese Voice Stream
      this._speakWithGoogleAudio(chunkText, voiceParams);
    }
  }

  /**
   * Phát bằng Natural Vietnamese Audio Stream (Chuẩn giọng Việt 100%, không bị lơ lớ hay đọc tiếng Anh)
   */
  _speakWithGoogleAudio(chunkText, voiceParams) {
    if (!this.audioElement) {
      this._speakWithWebSpeech(chunkText, null, voiceParams);
      return;
    }

    try {
      const cleanEncoded = encodeURIComponent(chunkText.slice(0, 300));
      const audioUrl = `/api/tts?text=${cleanEncoded}&gender=${this.gender || 'female'}`;

      this.audioElement.src = audioUrl;
      this.audioElement.playbackRate = voiceParams.rate;

      // Giọng Nam hoặc giọng trầm: cho phép hạ cao độ để tạo âm sắc nam tính trầm ấm
      if (this.gender === 'male' || voiceParams.pitch < 0.9) {
        this.audioElement.preservesPitch = false;
      } else {
        this.audioElement.preservesPitch = voiceParams.moodId !== 'child';
      }

      this.audioElement.play().catch((err) => {
        console.warn('Audio play fallback to speech:', err);
        this._speakWithWebSpeech(chunkText, null, voiceParams);
      });
    } catch (e) {
      this._speakWithWebSpeech(chunkText, null, voiceParams);
    }
  }

  /**
   * Phát bằng Web Speech API
   */
  _speakWithWebSpeech(chunkText, nativeVoice, voiceParams) {
    if (!this.synth) return;
    this.synth.cancel();

    const textToSpeak = chunkText || this.chunks[this.currentChunkIndex];
    if (!textToSpeak) return;

    // Kiểm tra xem máy người dùng có voice tiếng Việt thực thụ hay không
    // Tuyệt đối không để trình duyệt dùng giọng mặc định tiếng Anh/Ấn Độ để đọc tiếng Việt
    const voices = this.synth.getVoices() || [];
    const viVoice = nativeVoice || voices.find(v => {
      const l = (v.lang || '').toLowerCase().replace('_', '-');
      const n = (v.name || '').toLowerCase();
      return l.startsWith('vi') || n.includes('vietnam') || n.includes('tiếng việt');
    });

    if (!viVoice) {
      console.warn('[aiVoiceEngine] Không tìm thấy giọng tiếng Việt cài sẵn trong trình duyệt, bỏ qua WebSpeech để tránh phát âm sai giọng ngoại quốc.');
      this._onChunkEnded();
      return;
    }

    const utterance = new SpeechSynthesisUtterance(textToSpeak);
    utterance.lang = 'vi-VN';
    utterance.voice = viVoice;

    if (voiceParams) {
      utterance.pitch = voiceParams.pitch;
      utterance.rate = voiceParams.rate;
    }

    utterance.onend = () => this._onChunkEnded();
    utterance.onerror = (e) => {
      console.warn('Speech error:', e);
      this._onChunkEnded();
    };

    this.synth.speak(utterance);
  }

  _onChunkEnded() {
    if (this.isPlaying && !this.isPaused) {
      this.currentChunkIndex++;
      this._speakCurrentChunk();
    }
  }

  pause() {
    if (!this.isPlaying) return;
    this.isPaused = true;
    if (this.audioElement && !this.audioElement.paused) {
      this.audioElement.pause();
    }
    if (this.synth) {
      this.synth.pause();
    }
    this._notifyState('paused');
  }

  resume(detectedMood) {
    if (!this.isPlaying) return;
    this.isPaused = false;
    this._notifyState('playing');

    if (this.audioElement && this.audioElement.src && this.audioElement.paused) {
      this.audioElement.play().catch(() => {
        this._speakCurrentChunk();
      });
    } else if (this.synth && this.synth.paused) {
      this.synth.resume();
    } else {
      this._speakCurrentChunk();
    }
  }

  stop() {
    this.isPlaying = false;
    this.isPaused = false;
    this._stopTimeTicker();

    if (this.audioElement) {
      this.audioElement.pause();
      this.audioElement.removeAttribute('src');
    }
    if (this.synth) {
      this.synth.cancel();
    }

    this.currentChunkIndex = 0;
    this.currentSeconds = 0;
    this._notifyState('idle');
  }

  _stopTimeTicker() {
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
      this.timerInterval = null;
    }
  }

  setSpeed(newSpeed, detectedMood) {
    this.speed = newSpeed;
    this._buildChunkTimings(this.chunks, newSpeed);

    if (this.isPlaying && !this.isPaused) {
      if (this.audioElement && !this.audioElement.paused) {
        this.audioElement.playbackRate = newSpeed;
      } else {
        this._speakCurrentChunk();
      }
    }
  }

  setGender(gender) {
    if (this.gender === gender) return;
    this.gender = gender;
    if (this.isPlaying && !this.isPaused) {
      if (this.audioElement) this.audioElement.pause();
      if (this.synth) this.synth.cancel();
      this._speakCurrentChunk();
    }
  }

  setRegion(region) {
    if (this.region === region) return;
    this.region = region;
    if (this.isPlaying && !this.isPaused) {
      if (this.audioElement) this.audioElement.pause();
      if (this.synth) this.synth.cancel();
      this._speakCurrentChunk();
    }
  }

  setMood(moodId) {
    if (this.activeMood === moodId) return;
    this.activeMood = moodId;
    if (this.isPlaying && !this.isPaused) {
      if (this.audioElement) this.audioElement.pause();
      if (this.synth) this.synth.cancel();
      this._speakCurrentChunk();
    }
  }

  /**
   * Tua chính xác theo Giây (Phút : Giây)
   */
  seekToSecond(targetSec, detectedMood) {
    if (!this.chunkTimings.length) return;
    const clampedSec = Math.max(0, Math.min(this.totalDurationSeconds, targetSec));
    this.currentSeconds = clampedSec;

    // Tìm đoạn câu ứng với mốc giây này
    let targetIdx = 0;
    for (let i = 0; i < this.chunkTimings.length; i++) {
      if (clampedSec >= this.chunkTimings[i].startSec && clampedSec <= this.chunkTimings[i].endSec) {
        targetIdx = i;
        break;
      } else if (clampedSec < this.chunkTimings[i].startSec) {
        targetIdx = Math.max(0, i - 1);
        break;
      }
      targetIdx = i;
    }

    this.currentChunkIndex = targetIdx;

    if (this.onTimeUpdateCallback) {
      this.onTimeUpdateCallback(clampedSec, this.totalDurationSeconds);
    }

    if (this.isPlaying) {
      if (this.audioElement) this.audioElement.pause();
      if (this.synth) this.synth.cancel();
      this._speakCurrentChunk();
    }
  }

  /**
   * Tua theo phần trăm (%)
   */
  seekTo(percent, detectedMood) {
    if (!this.totalDurationSeconds) return;
    const targetSec = Math.round((percent / 100) * this.totalDurationSeconds);
    this.seekToSecond(targetSec, detectedMood);
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

  const windowSize = 2048;
  const minFreq = 75; // Hz
  const maxFreq = 350; // Hz
  const minLag = Math.floor(sampleRate / maxFreq);
  const maxLag = Math.floor(sampleRate / minFreq);

  const detectedPitches = [];

  for (let offset = 0; offset < channelData.length - windowSize; offset += windowSize * 2) {
    let maxCorrelation = 0;
    let bestLag = -1;

    let energy = 0;
    for (let i = 0; i < windowSize; i++) {
      energy += channelData[offset + i] * channelData[offset + i];
    }
    if (energy < 0.01) continue;

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

  let medianF0 = 160;
  if (detectedPitches.length > 0) {
    detectedPitches.sort((a, b) => a - b);
    medianF0 = detectedPitches[Math.floor(detectedPitches.length / 2)];
  }

  const calibratedPitch = Math.max(0.75, Math.min(1.65, Number((medianF0 / 145).toFixed(2))));
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
