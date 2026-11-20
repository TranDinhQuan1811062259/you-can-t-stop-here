import { sendSuccess, sendError } from '../utils/apiResponse.js';

/**
 * Danh sách bản nhạc nền thư giãn mặc định
 */
export const getMusicPresets = async (req, res) => {
  return sendSuccess(res, {
    message: 'Danh sách bài hát thư giãn mặc định',
    data: [
      {
        id: 'lofi_night',
        title: 'Lofi Chill - Đêm muộn ở văn phòng',
        artist: 'Freedom Chill Beat',
        genre: 'Lofi Chill / Hip Hop',
        icon: '🌙',
        url: 'https://cdn.pixabay.com/download/audio/2022/05/27/audio_1808fbf07a.mp3?filename=lofi-study-112191.mp3',
        description: 'Âm hưởng lofi ấm áp, êm đềm cho những buổi làm việc khuya.',
      },
      {
        id: 'healing_piano',
        title: 'Healing Piano - Khoảng lặng tâm hồn',
        artist: 'Peaceful Mind',
        genre: 'Piano / Acoustic',
        icon: '🎹',
        url: 'https://cdn.pixabay.com/download/audio/2022/01/18/audio_d0a13f69d2.mp3?filename=ambient-piano-amp-strings-10711.mp3',
        description: 'Giai điệu dương cầm nhẹ nhàng chữa lành những tổn thương và áp lực.',
      },
      {
        id: 'rain_coffee',
        title: 'Rain & Coffee - Tiếng mưa bên ô cửa sổ',
        artist: 'Acoustic Rain Project',
        genre: 'Rain & Lofi Guitar',
        icon: '☕',
        url: 'https://cdn.pixabay.com/download/audio/2021/09/06/audio_731a104051.mp3?filename=rain-and-nostalgia-chill-lofi-song-8493.mp3',
        description: 'Âm thanh mưa rơi lách tách hòa cùng tiếng guitar mộc mạc.',
      },
      {
        id: 'deep_focus',
        title: 'Deep Focus - Nhịp điệu tập trung',
        artist: 'Ambient Flow',
        genre: 'Synth Ambient / Focus',
        icon: '🎧',
        url: 'https://cdn.pixabay.com/download/audio/2022/03/15/audio_c8c8a73467.mp3?filename=lofi-orchestra-16230.mp3',
        description: 'Nhịp điệu đều đặn giúp bạn lấy lại sự tĩnh tâm và tập trung cao độ.',
      },
      {
        id: 'acoustic_sunset',
        title: 'Acoustic Sunset - Bình yên sau tan ca',
        artist: 'Acoustic Soul',
        genre: 'Warm Acoustic Guitar',
        icon: '🌅',
        url: 'https://cdn.pixabay.com/download/audio/2022/11/06/audio_c93e43d61f.mp3?filename=warm-acoustic-guitar-124928.mp3',
        description: 'Cảm giác thở phào nhẹ nhõm sau một ngày dài làm việc căng thẳng.',
      },
    ],
  });
};

/**
 * Làm sạch tiêu đề video loại bỏ các hậu tố MV, Official Music Video, v.v.
 */
const cleanSongTitle = (rawTitle) => {
  if (!rawTitle) return '';
  return rawTitle
    .replace(/\s*[\(\[]\s*(?:official\s*(?:music\s*)?video|official\s*audio|official\s*mv|audio|lyrics?|lyric\s*video|mv|visualizer|remastered|\d{4})\s*[\)\]]/gi, '')
    .replace(/\s*\|\s*(?:official|lyrics?).*$/gi, '')
    .replace(/\s*-\s*lyrics?.*$/gi, '')
    .trim();
};

/**
 * Làm sạch tên kênh / nghệ sĩ loại bỏ Topic, VEVO, Official
 */
const cleanArtistName = (rawArtist) => {
  if (!rawArtist) return '';
  return rawArtist
    .replace(/\s*-\s*Topic$/i, '')
    .replace(/\s*VEVO$/i, '')
    .replace(/\s*Official$/i, '')
    .replace(/\s*Channel$/i, '')
    .trim();
};

/**
 * Tách YouTube Video ID
 */
const extractYouTubeId = (url) => {
  if (!url || typeof url !== 'string') return null;
  const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
  const match = url.match(regExp);
  return match && match[2].length === 11 ? match[2] : null;
};

/**
 * Tách Spotify Track ID
 */
const extractSpotifyId = (url) => {
  if (!url || typeof url !== 'string') return null;
  const match = url.match(/(?:track|album|playlist)\/([a-zA-Z0-9]+)/);
  return match ? match[1] : null;
};

/**
 * Danh sách tên miền nguồn phát nhạc được chấp nhận hợp lệ
 */
const ALLOWED_MUSIC_HOSTS = new Set([
  // Spotify
  'open.spotify.com',
  'spotify.com',
  'www.spotify.com',
  // YouTube
  'youtube.com',
  'www.youtube.com',
  'm.youtube.com',
  'music.youtube.com',
  'youtu.be',
  // TikTok
  'tiktok.com',
  'www.tiktok.com',
  'm.tiktok.com',
  'vt.tiktok.com',
  // SoundCloud
  'soundcloud.com',
  'www.soundcloud.com',
  'm.soundcloud.com',
  // CDN media tĩnh
  'res.cloudinary.com',
  'cdn.pixabay.com',
]);

/**
 * Kiểm tra hostname có thuộc danh sách an toàn không
 */
const isAllowedMusicHost = (hostname) => {
  if (!hostname) return false;
  const host = hostname.toLowerCase().trim();
  if (ALLOWED_MUSIC_HOSTS.has(host)) return true;
  return (
    host.endsWith('.spotify.com') ||
    host.endsWith('.youtube.com') ||
    host.endsWith('.tiktok.com') ||
    host.endsWith('.soundcloud.com')
  );
};

/**
 * Kiểm tra và ngăn chặn các địa chỉ IP nội bộ, localhost, link-local, cloud metadata
 */
const isPrivateOrInternalHost = (host) => {
  if (!host) return true;
  const lower = host.toLowerCase().trim();

  // Chặn localhost, loopback, mDNS, internal names
  if (
    lower === 'localhost' ||
    lower === '127.0.0.1' ||
    lower === '0.0.0.0' ||
    lower === '::1' ||
    lower.endsWith('.local') ||
    lower.endsWith('.internal') ||
    lower.endsWith('.localhost') ||
    lower.includes('metadata') ||
    lower.includes('169.254')
  ) {
    return true;
  }

  // Chặn IPv4 dạng số thập phân (10.x, 172.16-31.x, 192.168.x, 127.x, 169.254.x, 0.x)
  const ipv4Match = lower.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
  if (ipv4Match) {
    return true; // Chặn mọi IP raw trực tiếp
  }

  // Chặn IPv6
  if (lower.includes(':') || lower.startsWith('[') || lower.endsWith(']')) {
    return true;
  }

  return false;
};

/**
 * Đọc tối đa maxBytes từ response stream để chống cạn kiệt bộ nhớ (OOM attack)
 */
const readLimitedText = async (response, maxBytes = 200 * 1024) => {
  if (response.body && typeof response.body.getReader === 'function') {
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let totalBytes = 0;
    let text = '';
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      totalBytes += value.length;
      text += decoder.decode(value, { stream: true });
      if (totalBytes >= maxBytes) {
        await reader.cancel();
        break;
      }
    }
    return text;
  }
  const rawText = await response.text();
  return rawText.slice(0, maxBytes);
};

/**
 * Trích xuất Metadata bài hát từ URL (YouTube, Spotify, TikTok, SoundCloud, v.v.)
 */
export const getMusicMetadata = async (req, res) => {
  try {
    const targetUrl = req.query.url;
    if (!targetUrl || typeof targetUrl !== 'string') {
      return sendError(res, { message: 'Vui lòng cung cấp URL bài hát hợp lệ.', status: 400 });
    }

    const trimmedUrl = targetUrl.trim();

    // 🛡️ BẢO VỆ CHỐNG TẤN CÔNG SSRF:
    // 1. Phân tích cú pháp URL bằng new URL(...)
    let parsedUrl;
    try {
      parsedUrl = new URL(trimmedUrl);
    } catch (_) {
      return sendError(res, { message: 'Định dạng URL không hợp lệ hoặc không thể phân tích cú pháp.', status: 400 });
    }

    // 2. Kiểm tra giao thức bắt buộc là HTTPS
    if (parsedUrl.protocol !== 'https:') {
      return sendError(res, { message: 'Giao thức không an toàn. Chỉ chấp nhận các liên kết bảo mật có giao thức HTTPS.', status: 400 });
    }

    // 🛡️ Chặn port khác 443 (chống quét cổng nội bộ qua SSRF)
    if (parsedUrl.port && parsedUrl.port !== '443') {
      return sendError(res, { message: 'Cổng kết nối không an toàn. Chỉ chấp nhận cổng mặc định 443 cho giao thức HTTPS.', status: 400 });
    }

    const hostname = parsedUrl.hostname.toLowerCase();

    // 3. Ngăn chặn triệt để IP nội bộ, localhost, link-local, cloud metadata
    if (isPrivateOrInternalHost(hostname)) {
      return sendError(res, { message: 'Địa chỉ IP hoặc tên miền mạng nội bộ không được phép truy cập.', status: 400 });
    }

    // 4. Kiểm tra danh sách whitelist các nguồn nhạc được hỗ trợ
    if (!isAllowedMusicHost(hostname)) {
      return sendError(res, {
        message: 'Nền tảng âm nhạc không được hỗ trợ hoặc tên miền không nằm trong danh sách an toàn. Chỉ hỗ trợ Spotify, YouTube, TikTok hoặc SoundCloud.',
        status: 400,
      });
    }

    const cleanUrl = parsedUrl.toString();

    // 1. YouTube
    if (hostname === 'youtu.be' || hostname.endsWith('.youtube.com') || hostname === 'youtube.com') {
      const ytId = extractYouTubeId(cleanUrl);
      try {
        const oembedUrl = `https://www.youtube.com/oembed?url=${encodeURIComponent(cleanUrl)}&format=json`;
        const fetchRes = await fetch(oembedUrl, {
          redirect: 'error',
          signal: AbortSignal.timeout(4000),
        });
        if (fetchRes.ok) {
          const data = await fetchRes.json();
          let rawTitle = data.title || '';
          let channelName = cleanArtistName(data.author_name || '');
          let title = rawTitle;
          let artist = channelName;

          // Nếu title có dạng "Nghệ sĩ - Tên bài hát"
          const splitMatch = rawTitle.match(/^(.+?)\s*[-–—:]\s*(.+)$/);
          if (splitMatch) {
            artist = cleanArtistName(splitMatch[1].trim());
            title = splitMatch[2].trim();
          }

          title = cleanSongTitle(title);

          return sendSuccess(res, {
            message: 'Trích xuất thông tin bài hát YouTube thành công!',
            data: {
              provider: 'youtube',
              title: title || rawTitle,
              artist: artist || channelName || 'YouTube Artist',
              author: channelName,
              thumbnail: data.thumbnail_url || (ytId ? `https://i.ytimg.com/vi/${ytId}/hqdefault.jpg` : ''),
              videoId: ytId,
              originalUrl: cleanUrl,
            },
          });
        }
      } catch (err) {
        console.warn('Lỗi fetch YouTube oEmbed:', err.message);
      }

      // Fallback nếu YouTube oEmbed tạm thời nghẽn
      return sendSuccess(res, {
        message: 'Nhận diện link YouTube',
        data: {
          provider: 'youtube',
          title: 'YouTube Track',
          artist: 'YouTube Creator',
          thumbnail: ytId ? `https://i.ytimg.com/vi/${ytId}/hqdefault.jpg` : '',
          videoId: ytId,
          originalUrl: cleanUrl,
        },
      });
    }

    // 2. Spotify
    if (hostname === 'spotify.com' || hostname.endsWith('.spotify.com')) {
      const spotifyId = extractSpotifyId(cleanUrl);
      try {
        const oembedUrl = `https://open.spotify.com/oembed?url=${encodeURIComponent(cleanUrl)}`;
        const fetchRes = await fetch(oembedUrl, {
          redirect: 'error',
          signal: AbortSignal.timeout(4000),
        });
        if (fetchRes.ok) {
          const data = await fetchRes.json();
          let title = cleanSongTitle(data.title || 'Spotify Track');
          let artist = 'Spotify Artist';

          // Cào nhanh meta tag để lấy tên nghệ sĩ chính xác (tối đa 200KB HTML)
          try {
            const pageRes = await fetch(cleanUrl, {
              headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' },
              redirect: 'error',
              signal: AbortSignal.timeout(4000),
            });
            if (pageRes.ok) {
              const html = await readLimitedText(pageRes, 200 * 1024);
              const musMatch = html.match(/name="music:musician_description"\s+content="([^"]+)"/i);
              if (musMatch && musMatch[1]) {
                artist = musMatch[1].trim();
              } else {
                const ogMatch = html.match(/property="og:description"\s+content="([^"]+)"/i);
                if (ogMatch && ogMatch[1]) {
                  const parts = ogMatch[1].split(/[·•]/);
                  if (parts[0]) artist = parts[0].trim();
                }
              }
            }
          } catch (_) {}

          return sendSuccess(res, {
            message: 'Trích xuất thông tin bài hát Spotify thành công!',
            data: {
              provider: 'spotify',
              title,
              artist,
              thumbnail: data.thumbnail_url || '',
              spotifyId,
              originalUrl: cleanUrl,
            },
          });
        }
      } catch (err) {
        console.warn('Lỗi fetch Spotify oEmbed:', err.message);
      }

      return sendSuccess(res, {
        message: 'Nhận diện link Spotify',
        data: {
          provider: 'spotify',
          title: 'Spotify Track',
          artist: 'Spotify Artist',
          spotifyId,
          originalUrl: cleanUrl,
        },
      });
    }

    // 3. TikTok
    if (hostname === 'tiktok.com' || hostname.endsWith('.tiktok.com')) {
      try {
        const oembedUrl = `https://www.tiktok.com/oembed?url=${encodeURIComponent(cleanUrl)}`;
        const fetchRes = await fetch(oembedUrl, {
          redirect: 'error',
          signal: AbortSignal.timeout(4000),
        });
        if (fetchRes.ok) {
          const data = await fetchRes.json();
          return sendSuccess(res, {
            message: 'Trích xuất thông tin TikTok thành công!',
            data: {
              provider: 'tiktok',
              title: cleanSongTitle(data.title || 'TikTok Audio'),
              artist: cleanArtistName(data.author_name || 'TikTok Creator'),
              thumbnail: data.thumbnail_url || '',
              originalUrl: cleanUrl,
            },
          });
        }
      } catch (err) {
        console.warn('Lỗi fetch TikTok oEmbed:', err.message);
      }

      return sendSuccess(res, {
        message: 'Nhận diện link TikTok',
        data: {
          provider: 'tiktok',
          title: 'TikTok Sound Track',
          artist: 'TikTok Creator',
          originalUrl: cleanUrl,
        },
      });
    }

    // 4. File âm thanh trực tiếp (mp3, wav, ogg) hoặc link khác
    const filenameMatch = cleanUrl.match(/\/([^\/?#]+)\.(mp3|wav|ogg|m4a)/i);
    const fallbackTitle = filenameMatch
      ? decodeURIComponent(filenameMatch[1]).replace(/[-_]/g, ' ')
      : 'Bản nhạc cá nhân';

    return sendSuccess(res, {
      message: 'Nhận diện link âm thanh',
      data: {
        provider: 'custom',
        title: fallbackTitle,
        artist: 'Nhạc cá nhân',
        thumbnail: '',
        originalUrl: cleanUrl,
      },
    });
  } catch (error) {
    return sendError(res, { message: error.message || 'Không thể trích xuất thông tin bài hát.', status: 500 });
  }
};

