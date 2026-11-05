import { musicService } from '../services/musicService';

/**
 * Danh sách bản nhạc nền đề xuất sẵn cho trang cá nhân
 */
export const MUSIC_PRESETS = [
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
];

/**
 * Tách YouTube Video ID từ link thông dụng
 */
export const extractYouTubeId = (url) => {
  if (!url || typeof url !== 'string') return null;
  const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
  const match = url.match(regExp);
  return match && match[2].length === 11 ? match[2] : null;
};

/**
 * Tách Spotify Track/Album/Playlist ID
 */
export const extractSpotifyId = (url) => {
  if (!url || typeof url !== 'string') return null;
  const match = url.match(/(?:track|album|playlist)\/([a-zA-Z0-9]+)/);
  return match ? match[1] : null;
};

/**
 * Tách TikTok Video/Sound ID
 */
export const extractTikTokId = (url) => {
  if (!url || typeof url !== 'string') return null;
  const match = url.match(/(?:video|v|music)\/([a-zA-Z0-9_-]+)/);
  return match ? match[1] : null;
};

/**
 * Tự động nhận diện nền tảng âm nhạc từ URL
 */
export const detectMusicSource = (url) => {
  if (!url) return 'preset';
  const clean = url.toLowerCase();
  if (clean.includes('youtube.com') || clean.includes('youtu.be')) return 'youtube';
  if (clean.includes('spotify.com')) return 'spotify';
  if (clean.includes('tiktok.com')) return 'tiktok';
  if (clean.includes('soundcloud.com')) return 'soundcloud';
  return 'custom';
};

/**
 * Làm sạch chuỗi tiêu đề
 */
export const cleanTrackTitle = (raw) => {
  if (!raw) return '';
  return raw
    .replace(/\s*[\(\[]\s*(?:official\s*(?:music\s*)?video|official\s*audio|official\s*mv|audio|lyrics?|lyric\s*video|mv|visualizer|remastered|\d{4})\s*[\)\]]/gi, '')
    .replace(/\s*\|\s*(?:official|lyrics?).*$/gi, '')
    .trim();
};

/**
 * Tự động lấy tên bài hát & tên nghệ sĩ từ link nhạc (Backend proxy hoặc trực tiếp)
 */
export const fetchMusicMetadata = async (targetUrl) => {
  if (!targetUrl || typeof targetUrl !== 'string') {
    return null;
  }
  const clean = targetUrl.trim();

  // 1. Thử gọi API backend
  try {
    const res = await musicService.getMetadata(clean);
    if (res?.data) {
      return res.data;
    }
  } catch (backendErr) {
    console.warn('Backend metadata proxy not responding, trying fallback:', backendErr.message);
  }

  // 2. Fallback nếu backend đang bận hoặc chạy offline:
  // YouTube direct oEmbed
  if (clean.includes('youtube.com') || clean.includes('youtu.be')) {
    const ytId = extractYouTubeId(clean);
    try {
      const oembedRes = await fetch(`https://noembed.com/embed?url=${encodeURIComponent(clean)}`);
      if (oembedRes.ok) {
        const d = await oembedRes.json();
        let title = d.title || '';
        let artist = (d.author_name || '').replace(/\s*-\s*Topic$/i, '').trim();

        const splitMatch = title.match(/^(.+?)\s*[-–—:]\s*(.+)$/);
        if (splitMatch) {
          artist = splitMatch[1].trim();
          title = splitMatch[2].trim();
        }
        title = cleanTrackTitle(title);

        return {
          provider: 'youtube',
          title: title || d.title,
          artist: artist || d.author_name || 'YouTube Creator',
          thumbnail: ytId ? `https://i.ytimg.com/vi/${ytId}/hqdefault.jpg` : '',
          videoId: ytId,
        };
      }
    } catch (_) {}

    return {
      provider: 'youtube',
      title: 'YouTube Track',
      artist: 'YouTube Creator',
      thumbnail: ytId ? `https://i.ytimg.com/vi/${ytId}/hqdefault.jpg` : '',
      videoId: ytId,
    };
  }

  // Spotify direct fallback
  if (clean.includes('spotify.com')) {
    const spotifyId = extractSpotifyId(clean);
    return {
      provider: 'spotify',
      title: 'Spotify Track',
      artist: 'Spotify Artist',
      spotifyId,
    };
  }

  // TikTok fallback
  if (clean.includes('tiktok.com')) {
    return {
      provider: 'tiktok',
      title: 'TikTok Sound',
      artist: 'TikTok Creator',
    };
  }

  // MP3 fallback
  const filenameMatch = clean.match(/\/([^\/?#]+)\.(mp3|wav|ogg|m4a)/i);
  return {
    provider: 'custom',
    title: filenameMatch ? decodeURIComponent(filenameMatch[1]).replace(/[-_]/g, ' ') : 'Bản nhạc cá nhân',
    artist: 'Nhạc cá nhân',
  };
};
