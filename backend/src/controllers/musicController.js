import { sendSuccess, sendError } from '../utils/apiResponse.js';

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
 * Trích xuất Metadata bài hát từ URL (YouTube, Spotify, TikTok, SoundCloud, v.v.)
 */
export const getMusicMetadata = async (req, res) => {
  try {
    const targetUrl = req.query.url;
    if (!targetUrl || typeof targetUrl !== 'string') {
      return sendError(res, { message: 'Vui lòng cung cấp URL bài hát hợp lệ.', status: 400 });
    }

    const cleanUrl = targetUrl.trim();

    // 1. YouTube
    if (cleanUrl.includes('youtube.com') || cleanUrl.includes('youtu.be')) {
      const ytId = extractYouTubeId(cleanUrl);
      try {
        const oembedUrl = `https://www.youtube.com/oembed?url=${encodeURIComponent(cleanUrl)}&format=json`;
        const fetchRes = await fetch(oembedUrl);
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
    if (cleanUrl.includes('spotify.com')) {
      const spotifyId = extractSpotifyId(cleanUrl);
      try {
        const oembedUrl = `https://open.spotify.com/oembed?url=${encodeURIComponent(cleanUrl)}`;
        const fetchRes = await fetch(oembedUrl);
        if (fetchRes.ok) {
          const data = await fetchRes.json();
          let title = cleanSongTitle(data.title || 'Spotify Track');
          let artist = 'Spotify Artist';

          // Cào nhanh meta tag để lấy tên nghệ sĩ chính xác
          try {
            const pageRes = await fetch(cleanUrl, {
              headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' },
            });
            if (pageRes.ok) {
              const html = await pageRes.text();
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
    if (cleanUrl.includes('tiktok.com')) {
      try {
        const oembedUrl = `https://www.tiktok.com/oembed?url=${encodeURIComponent(cleanUrl)}`;
        const fetchRes = await fetch(oembedUrl);
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

