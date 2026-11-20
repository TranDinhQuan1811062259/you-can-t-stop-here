import { MsEdgeTTS, OUTPUT_FORMAT } from 'msedge-tts';
import googleTTS from 'google-tts-api';

// Bộ nhớ đệm RAM để phản hồi siêu tốc (<1ms) cho các câu văn lặp lại
const audioCache = new Map();
const MAX_CACHE_ITEMS = 500;

// Mapping giọng đọc Neural đa ngôn ngữ chuẩn 100% của Microsoft Edge
const MULTI_LANG_VOICES = {
  vi: {
    female: 'vi-VN-HoaiMyNeural', // Hoài My (Nữ Việt Nam truyền cảm, ấm áp)
    male: 'vi-VN-NamMinhNeural',   // Nam Minh (Nam Việt Nam trầm ấm, đĩnh đạc)
  },
  en: {
    female: 'en-US-JennyNeural',   // Jenny (Nữ Mỹ tự nhiên, biểu cảm)
    male: 'en-US-GuyNeural',       // Guy (Nam Mỹ trầm ấm, đĩnh đạc)
  },
  zh: {
    female: 'zh-CN-XiaoxiaoNeural', // Xiaoxiao (Nữ Bắc Kinh nhẹ nhàng, ngọt ngào)
    male: 'zh-CN-YunxiNeural',      // Yunxi (Nam Bắc Kinh trẻ trung, rõ ràng)
  },
  ja: {
    female: 'ja-JP-NanamiNeural',   // Nanami (Nữ Nhật Bản trong trẻo, lịch thiệp)
    male: 'ja-JP-KeitaNeural',      // Keita (Nam Nhật Bản đĩnh đạc, ấm áp)
  },
  ko: {
    female: 'ko-KR-SunHiNeural',    // SunHi (Nữ Hàn Quốc nhẹ nhàng, truyền cảm)
    male: 'ko-KR-InJoonNeural',     // InJoon (Nam Hàn Quốc trầm ấm, sâu lắng)
  },
};

const GOOGLE_LANG_FALLBACK = {
  vi: 'vi',
  en: 'en',
  zh: 'zh-CN',
  ja: 'ja',
  ko: 'ko',
};

/**
 * Tính toán options { rate, pitch } cho Microsoft Edge TTS theo Vùng Miền & Tâm Trạng
 */
function calculateEdgeVoiceOptions({ lang = 'vi', gender = 'female', region = 'north', mood = 'auto' }) {
  let rateOffset = 0;
  let pitchOffset = 0;

  // 1. Điều chỉnh theo Vùng Miền Việt Nam (Chỉ áp dụng khi ngôn ngữ là Tiếng Việt)
  if (lang === 'vi') {
    if (region === 'central') {
      // Miền Trung (Huế & Đà Nẵng): Da diết, trầm sâu, nhịp điệu chậm rãi và lắng đọng
      rateOffset += -8;
      pitchOffset += gender === 'male' ? -8 : -5;
    } else if (region === 'south') {
      // Miền Nam (Sài Gòn): Ngọt ngào, phóng khoáng, nhịp điệu nhanh và thanh thoát
      rateOffset += gender === 'male' ? 6 : 5;
      pitchOffset += gender === 'male' ? 3 : 4;
    } else {
      // Miền Bắc (Hà Nội): Chuẩn âm thanh lịch, tròn vành rõ chữ
      rateOffset += 0;
      pitchOffset += 0;
    }
  }

  // 2. Điều chỉnh theo Tâm trạng (Mood)
  if (mood === 'melancholic') {
    rateOffset += -6;
    pitchOffset += -4;
  } else if (mood === 'uplifting') {
    rateOffset += 6;
    pitchOffset += 5;
  } else if (mood === 'child') {
    rateOffset += 4;
    pitchOffset += 22;
  } else if (mood === 'podcast') {
    rateOffset += -3;
    pitchOffset += -2;
  }

  const rateStr = rateOffset === 0 ? '+0%' : `${rateOffset > 0 ? '+' : ''}${rateOffset}%`;
  const pitchStr = pitchOffset === 0 ? '+0Hz' : `${pitchOffset > 0 ? '+' : ''}${pitchOffset}%`;

  return { rate: rateStr, pitch: pitchStr, rateOffset, pitchOffset };
}

/**
 * Hàm tổng hợp âm thanh Neural qua Microsoft Edge TTS với cơ chế tự động thử lại (Retry)
 */
async function synthesizeWithEdge(targetVoice, text, voiceOptions = {}, maxRetries = 3) {
  let lastError = null;
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const client = new MsEdgeTTS();
      await client.setMetadata(targetVoice, OUTPUT_FORMAT.AUDIO_24KHZ_48KBITRATE_MONO_MP3);
      
      const streamOptions = {};
      if (voiceOptions.rate && voiceOptions.rate !== '+0%') streamOptions.rate = voiceOptions.rate;
      if (voiceOptions.pitch && voiceOptions.pitch !== '+0Hz') streamOptions.pitch = voiceOptions.pitch;

      const { audioStream } = await client.toStream(text, streamOptions);

      const chunks = [];
      await new Promise((resolve, reject) => {
        audioStream.on('data', (chunk) => chunks.push(chunk));
        audioStream.on('end', resolve);
        audioStream.on('error', (err) => {
          if (chunks.length > 0) {
            resolve();
          } else {
            reject(err);
          }
        });
      });

      if (chunks.length > 0) {
        return Buffer.concat(chunks);
      }
    } catch (err) {
      lastError = err;
      if (attempt < maxRetries) {
        await new Promise((r) => setTimeout(r, 120 * attempt));
      }
    }
  }
  throw lastError || new Error('Không thể khởi tạo luồng âm thanh Microsoft Edge');
}

/**
 * Controller Text-To-Speech (TTS) Đa Ngôn Ngữ & Vùng Miền Chuẩn Neural 100%
 * Hỗ trợ: Tiếng Việt (Bắc/Trung/Nam), Tiếng Anh, Tiếng Trung, Tiếng Nhật, Tiếng Hàn
 */
export const synthesizeVietnameseSpeech = async (req, res) => {
  try {
    const rawText = req.query.text !== undefined ? req.query.text : req.body?.text;

    // 🛡️ BẢO VỆ CHỐNG DOS & QUÁ TẢI BỘ NHỚ:
    // 1. Kiểm tra trường text bắt buộc là chuỗi ký tự
    if (typeof rawText !== 'string') {
      return res.status(400).json({
        success: false,
        message: 'Nội dung cần đọc (text) không hợp lệ hoặc không phải định dạng chuỗi.',
      });
    }

    // 2. Giới hạn độ dài tối đa 2.000 ký tự NGAY TỪ ĐẦU trước khi chạy bất kỳ regex, trim hay xử lý chuỗi nào
    const MAX_TEXT_LENGTH = 2000;
    if (rawText.length > MAX_TEXT_LENGTH) {
      return res.status(400).json({
        success: false,
        message: `Độ dài văn bản vượt quá giới hạn cho phép (tối đa ${MAX_TEXT_LENGTH.toLocaleString('vi-VN')} ký tự mỗi lượt đọc).`,
      });
    }

    const trimmedRawText = rawText.trim();
    if (!trimmedRawText) {
      return res.status(400).json({
        success: false,
        message: 'Nội dung cần đọc không được để trống.',
      });
    }

    const rawGender = (req.query.gender || req.body?.gender || 'female');
    const genderStr = typeof rawGender === 'string' ? rawGender.toLowerCase() : 'female';
    const gender = genderStr.includes('nam') || genderStr === 'male' ? 'male' : 'female';

    const rawLang = req.query.lang || req.body?.lang;
    const lang = typeof rawLang === 'string' ? rawLang.toLowerCase() : 'vi';

    const rawRegion = req.query.region || req.body?.region;
    const region = typeof rawRegion === 'string' ? rawRegion.toLowerCase() : 'north';

    const rawMood = req.query.mood || req.body?.mood;
    const mood = typeof rawMood === 'string' ? rawMood.toLowerCase() : 'auto';

    // Làm sạch emoji và ký tự đặc biệt ở đầu/cuối câu
    const cleanText = trimmedRawText
      .replace(/^[✨🌙☕🌿🌧️💡🍂🕯️🌊🌌❤️🩹\s\-\:]+/, '')
      .replace(/[✨🌙☕🌿🌧️💡🍂🕯️🌊🌌❤️🩹\s]+$/g, '')
      .trim();

    if (!cleanText) {
      return res.status(400).json({
        success: false,
        message: 'Nội dung cần đọc không được để trống.',
      });
    }

    // Giới hạn độ dài mỗi lượt đọc
    const truncatedText = cleanText.slice(0, MAX_TEXT_LENGTH);

    // Xác định giọng đọc theo Ngôn ngữ và Giới tính
    const langVoiceMap = MULTI_LANG_VOICES[lang] || MULTI_LANG_VOICES.vi;
    const targetVoice = langVoiceMap[gender] || langVoiceMap.female;

    // Tính toán options cao độ & tốc độ theo vùng miền và cảm xúc
    const voiceOptions = calculateEdgeVoiceOptions({ lang, gender, region, mood });

    // Cache key bao gồm cả voice, region, mood để âm sắc chuẩn không bị đè cache
    const cacheKey = `${targetVoice}_${region}_${mood}_${voiceOptions.rate}_${truncatedText.toLowerCase()}`;

    // 1. Phục vụ ngay từ bộ đệm RAM nếu đã có
    if (audioCache.has(cacheKey)) {
      const cachedBuffer = audioCache.get(cacheKey);
      res.set({
        'Content-Type': 'audio/mpeg',
        'Content-Length': cachedBuffer.length,
        'Cache-Control': 'public, max-age=86400',
        'X-TTS-Engine': 'Cache-HIT',
        'X-TTS-Voice': targetVoice,
        'X-TTS-Lang': lang,
        'X-TTS-Region': region,
        'X-TTS-Gender': gender,
      });
      return res.end(cachedBuffer);
    }

    // 2. Tạo giọng đọc Neural qua Microsoft Edge TTS
    let audioBuffer = null;
    let engine = 'MsEdge-Neural';
    try {
      audioBuffer = await synthesizeWithEdge(targetVoice, truncatedText, voiceOptions, 3);
    } catch (edgeErr) {
      console.warn('[TTS] Microsoft Edge Neural TTS cần fallback sang Google TTS:', edgeErr.message);
    }

    // 3. Fallback: Google TTS nếu Microsoft Edge chưa phản hồi
    if (!audioBuffer) {
      engine = 'Google-TTS-Fallback';
      const googleLang = GOOGLE_LANG_FALLBACK[lang] || 'vi';
      const base64Audio = await googleTTS.getAudioBase64(truncatedText.slice(0, 200), {
        lang: googleLang,
        slow: region === 'central' || mood === 'melancholic',
        host: 'https://translate.google.com',
        timeout: 8000,
      });
      audioBuffer = Buffer.from(base64Audio, 'base64');
    }

    // Lưu vào bộ nhớ đệm RAM
    if (audioCache.size >= MAX_CACHE_ITEMS) {
      const oldestKey = audioCache.keys().next().value;
      audioCache.delete(oldestKey);
    }
    audioCache.set(cacheKey, audioBuffer);

    res.set({
      'Content-Type': 'audio/mpeg',
      'Content-Length': audioBuffer.length,
      'Cache-Control': 'public, max-age=86400',
      'X-TTS-Engine': engine,
      'X-TTS-Voice': targetVoice,
      'X-TTS-Lang': lang,
      'X-TTS-Region': region,
      'X-TTS-Gender': gender,
    });

    return res.end(audioBuffer);
  } catch (err) {
    console.error('[TTS Controller] Lỗi tạo giọng đọc:', err.message);
    return res.status(500).json({
      success: false,
      message: 'Không thể tạo giọng đọc lúc này',
      error: err.message,
    });
  }
};
