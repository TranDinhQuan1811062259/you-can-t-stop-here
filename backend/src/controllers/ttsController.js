import { MsEdgeTTS, OUTPUT_FORMAT } from 'msedge-tts';
import googleTTS from 'google-tts-api';

// Bộ nhớ đệm RAM để phản hồi siêu tốc (<1ms) cho các câu văn lặp lại
const audioCache = new Map();
const MAX_CACHE_ITEMS = 500;

// Mapping giọng đọc Neural tiếng Việt chuẩn 100% của Microsoft
const VIETNAMESE_VOICES = {
  female: 'vi-VN-HoaiMyNeural', // Giọng Nữ truyền cảm, ấm áp, phát thanh viên Hoài My
  male: 'vi-VN-NamMinhNeural',   // Giọng Nam trầm ấm, điềm đạm, lắng đọng Nam Minh
};

/**
 * Hàm tổng hợp âm thanh Neural qua Microsoft Edge TTS với cơ chế tự động thử lại (Retry)
 */
async function synthesizeWithEdge(targetVoice, text, maxRetries = 3) {
  let lastError = null;
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const client = new MsEdgeTTS();
      await client.setMetadata(targetVoice, OUTPUT_FORMAT.AUDIO_24KHZ_48KBITRATE_MONO_MP3);
      // Sử dụng cú pháp SSML chuẩn mặc định của Edge TTS (không ép prosody thủ công gây lỗi 1006)
      const { audioStream } = await client.toStream(text);

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
 * Controller Text-To-Speech (TTS) Tiếng Việt Chuẩn Neural 100%
 * Sử dụng Microsoft Edge Neural Voice (Hoài My - Nữ & Nam Minh - Nam)
 * Fallback sang Google TTS nếu cần thiết
 */
export const synthesizeVietnameseSpeech = async (req, res) => {
  try {
    const rawText = req.query.text || req.body?.text || '';
    const rawGender = (req.query.gender || req.body?.gender || 'female').toLowerCase();
    const gender = rawGender.includes('nam') || rawGender === 'male' ? 'male' : 'female';

    // Làm sạch emoji và ký tự đặc biệt ở đầu/cuối câu
    const cleanText = rawText
      .replace(/^[✨🌙☕🌿🌧️💡🍂🕯️🌊🌌❤️🩹\s\-\:]+/, '')
      .replace(/[✨🌙☕🌿🌧️💡🍂🕯️🌊🌌❤️🩹\s]+$/g, '')
      .trim();

    if (!cleanText) {
      return res.status(400).json({ success: false, message: 'Nội dung cần đọc không được để trống' });
    }

    // Giới hạn độ dài mỗi lượt đọc
    const truncatedText = cleanText.slice(0, 350);
    const targetVoice = VIETNAMESE_VOICES[gender] || VIETNAMESE_VOICES.female;
    const cacheKey = `${targetVoice}_${truncatedText.toLowerCase()}`;

    // 1. Phục vụ ngay từ bộ đệm RAM nếu đã có
    if (audioCache.has(cacheKey)) {
      const cachedBuffer = audioCache.get(cacheKey);
      res.set({
        'Content-Type': 'audio/mpeg',
        'Content-Length': cachedBuffer.length,
        'Cache-Control': 'public, max-age=86400',
        'X-TTS-Engine': 'Cache-HIT',
        'X-TTS-Voice': targetVoice,
        'X-TTS-Gender': gender,
      });
      return res.end(cachedBuffer);
    }

    // 2. Tạo giọng đọc Neural qua Microsoft Edge TTS (Hoài My Nữ / Nam Minh Nam)
    let audioBuffer = null;
    let engine = 'MsEdge-Neural';
    try {
      audioBuffer = await synthesizeWithEdge(targetVoice, truncatedText, 3);
    } catch (edgeErr) {
      console.warn('[TTS] Microsoft Edge Neural TTS cần fallback sang Google TTS:', edgeErr.message);
    }

    // 3. Fallback: Google TTS nếu Microsoft Edge chưa phản hồi
    if (!audioBuffer) {
      engine = 'Google-TTS-Fallback';
      const base64Audio = await googleTTS.getAudioBase64(truncatedText, {
        lang: 'vi',
        slow: false,
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
