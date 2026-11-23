/**
 * Tiện ích kiểm định & xử lý Thẻ Nhạc Cá Nhân (User Personal Music Utilities)
 * Hỗ trợ 4 nền tảng âm nhạc trực tuyến phổ biến:
 * 1. Spotify (open.spotify.com)
 * 2. SoundCloud (soundcloud.com)
 * 3. YouTube / YouTube Music (youtube.com, music.youtube.com, youtu.be)
 * 4. Zing MP3 (zingmp3.vn, mp3.zing.vn)
 *
 * Kiểm tra bảo mật chặt chẽ:
 * - Whitelist domains an toàn, chống XSS, chống SSRF, chống giao thức lạ (javascript:, data:).
 * - Tự động trích xuất Embed Player URL an toàn tuân thủ CSP.
 */

// Danh sách domain hợp lệ cho từng nền tảng
const ALLOWED_PLATFORMS = {
  spotify: {
    name: 'Spotify',
    badge: '🟢 Spotify',
    icon: 'fa-brands fa-spotify',
    brandColor: '#1db954',
    glowColor: 'rgba(29, 185, 84, 0.25)',
    domains: ['spotify.com', 'open.spotify.com'],
  },
  soundcloud: {
    name: 'SoundCloud',
    badge: '🟠 SoundCloud',
    icon: 'fa-brands fa-soundcloud',
    brandColor: '#ff5500',
    glowColor: 'rgba(255, 85, 0, 0.25)',
    domains: ['soundcloud.com', 'm.soundcloud.com', 'on.soundcloud.com'],
  },
  youtube: {
    name: 'YouTube Music',
    badge: '🔴 YouTube Music',
    icon: 'fa-brands fa-youtube',
    brandColor: '#ef4444',
    glowColor: 'rgba(239, 68, 68, 0.25)',
    domains: ['youtube.com', 'www.youtube.com', 'm.youtube.com', 'music.youtube.com', 'youtu.be'],
  },
  zingmp3: {
    name: 'Zing MP3',
    badge: '🟣 Zing MP3',
    icon: 'fa-solid fa-compact-disc',
    brandColor: '#8b5cf6',
    glowColor: 'rgba(139, 92, 246, 0.25)',
    domains: ['zingmp3.vn', 'mp3.zing.vn'],
  },
};

/**
 * Tách YouTube Video ID (hỗ trợ cả youtube.com, music.youtube.com và youtu.be)
 */
export const extractYouTubeVideoId = (url) => {
  if (!url || typeof url !== 'string') return null;
  try {
    const parsed = new URL(url);
    if (parsed.hostname === 'youtu.be') {
      const id = parsed.pathname.slice(1).split('/')[0];
      return id && id.length >= 8 ? id : null;
    }
    if (parsed.hostname.includes('youtube.com')) {
      const v = parsed.searchParams.get('v');
      if (v && v.length >= 8) return v;
      // Hỗ trợ dạng /embed/ID hoặc /v/ID
      const parts = parsed.pathname.split('/');
      const embedIdx = parts.indexOf('embed');
      if (embedIdx !== -1 && parts[embedIdx + 1]) {
        return parts[embedIdx + 1];
      }
    }
  } catch (_) {}
  return null;
};

/**
 * Tách Spotify Track/Album/Playlist ID
 */
export const extractSpotifyTrackId = (url) => {
  if (!url || typeof url !== 'string') return null;
  const match = url.match(/(?:track|album|playlist)\/([a-zA-Z0-9]+)/);
  return match ? { type: match[0].split('/')[0], id: match[1] } : null;
};

/**
 * Tách Zing MP3 Song ID
 */
export const extractZingMp3Id = (url) => {
  if (!url || typeof url !== 'string') return null;
  const match = url.match(/\/bai-hat\/[^\/]+\/([a-zA-Z0-9]+)\.html/);
  if (match) return match[1];
  const genericMatch = url.match(/([A-Z0-9]{8,12})\.html/);
  return genericMatch ? genericMatch[1] : null;
};

/**
 * Xác minh & Phân tích URL nhạc cá nhân an toàn
 * @param {string} rawUrl - Đường dẫn do người dùng nhập
 * @returns {object} Kết quả phân tích { isValid, error, provider, cleanUrl, embedUrl, meta }
 */
export const validatePersonalMusicUrl = (rawUrl) => {
  if (!rawUrl || typeof rawUrl !== 'string') {
    return { isValid: false, error: 'Đường dẫn nhạc không được để trống' };
  }

  const clean = rawUrl.trim();

  // 1. Kiểm tra scheme an toàn: Chỉ chấp nhận http hoặc https
  if (!clean.startsWith('http://') && !clean.startsWith('https://')) {
    return {
      isValid: false,
      error: 'Đường dẫn phải bắt đầu bằng https://',
    };
  }

  // 2. Parse URL an toàn bằng chuẩn trình duyệt
  let parsedUrl;
  try {
    parsedUrl = new URL(clean);
  } catch (_) {
    return { isValid: false, error: 'Định dạng URL không hợp lệ' };
  }

  const host = parsedUrl.hostname.toLowerCase();

  // Chống SSRF / Local IP injection
  if (
    host === 'localhost' ||
    host === '127.0.0.1' ||
    host.startsWith('192.168.') ||
    host.startsWith('10.') ||
    host.endsWith('.local')
  ) {
    return { isValid: false, error: 'Không chấp nhận địa chỉ IP nội bộ' };
  }

  // 3. Khớp nền tảng thuộc whitelist
  let matchedProvider = null;
  for (const [key, platform] of Object.entries(ALLOWED_PLATFORMS)) {
    if (platform.domains.some((d) => host === d || host.endsWith('.' + d))) {
      matchedProvider = key;
      break;
    }
  }

  if (!matchedProvider) {
    return {
      isValid: false,
      error: 'Chỉ hỗ trợ liên kết nhạc từ Spotify, SoundCloud, YouTube Music hoặc Zing MP3',
    };
  }

  const platformMeta = ALLOWED_PLATFORMS[matchedProvider];
  let embedUrl = '';
  let trackTitle = '';
  let trackArtist = '';

  if (matchedProvider === 'spotify') {
    const spot = extractSpotifyTrackId(clean);
    if (spot) {
      embedUrl = `https://open.spotify.com/embed/${spot.type}/${spot.id}?utm_source=generator&theme=0`;
      trackTitle = `Spotify ${spot.type === 'album' ? 'Album' : spot.type === 'playlist' ? 'Playlist' : 'Track'}`;
      trackArtist = 'Spotify Artist';
    } else {
      embedUrl = clean;
    }
  } else if (matchedProvider === 'youtube') {
    const ytId = extractYouTubeVideoId(clean);
    if (ytId) {
      embedUrl = `https://www.youtube-nocookie.com/embed/${ytId}?autoplay=1&enablejsapi=1`;
      trackTitle = 'Bản nhạc YouTube Music';
      trackArtist = 'YouTube Creator';
    } else {
      return { isValid: false, error: 'Không tìm thấy mã video YouTube trong đường dẫn này' };
    }
  } else if (matchedProvider === 'soundcloud') {
    embedUrl = `https://w.soundcloud.com/player/?url=${encodeURIComponent(clean)}&color=%23ff5500&auto_play=false&hide_related=true&show_comments=false&show_user=true&show_reposts=false&show_teaser=false`;
    trackTitle = 'Bản nhạc SoundCloud';
    trackArtist = 'SoundCloud Artist';
  } else if (matchedProvider === 'zingmp3') {
    const songId = extractZingMp3Id(clean);
    embedUrl = songId ? `https://zingmp3.vn/embed/song/${songId}` : clean;
    trackTitle = 'Bài hát Zing MP3';
    trackArtist = 'Nghệ sĩ Zing MP3';
  }

  return {
    isValid: true,
    error: null,
    provider: matchedProvider,
    cleanUrl: clean,
    embedUrl,
    title: trackTitle,
    artist: trackArtist,
    badge: platformMeta.badge,
    icon: platformMeta.icon,
    brandColor: platformMeta.brandColor,
    glowColor: platformMeta.glowColor,
    platformName: platformMeta.name,
  };
};

/**
 * Lấy metadata nhà cung cấp theo id
 */
export const getPlatformMeta = (providerId) => {
  return ALLOWED_PLATFORMS[providerId] || ALLOWED_PLATFORMS.spotify;
};
