/**
 * Danh mục Playlist đa chủ đề & cấu hình âm nhạc cho Freedom Web
 * Kiến trúc mở (Data-driven): Sau này chỉ cần thả file audio vào thư mục
 * public/audio/<themeId>/ và thêm 1 object bài hát vào mảng tracks bên dưới.
 */

export const PLAYLIST_THEMES = [
  {
    id: 'winter',
    slug: 'winter',
    name: 'Mùa Đông',
    title: 'Winter Whispers & Cozy Hearth',
    subtitle: 'Không gian tĩnh lặng, trầm ấm & hoài niệm',
    badge: 'Đông Tuyết ❄️',
    icon: '❄️',
    accentColor: '#38bdf8', // Frost Blue
    secondaryColor: '#0284c7',
    glowColor: 'rgba(56, 189, 248, 0.22)',
    atmosphere: {
      type: 'snow',
      speed: 0.6,
      density: 35, // Tối ưu GPU, nhẹ nhàng không gây lag
      vibeText: 'Gió bấc se lạnh • Bếp lửa bập bùng • Kỷ niệm xa xôi',
    },
    quote: 'Dù bên ngoài gió rét bao nhiêu, chỉ cần trong lòng ta giữ ấm một ngọn lửa nhỏ.',
    tracks: [
      {
        id: 'winter-song-1',
        title: 'Winter Song 1 (Gió Bấc & Tĩnh Lặng)',
        artist: 'Freedom Studio',
        album: 'Mùa Đông & Nỗi Nhớ',
        src: '/audio/winter/winter-song-1.wav',
        badge: 'HQ WAV',
        mood: 'Tĩnh lặng • Sâu lắng',
        suggestedVolume: 0.45,
      },
      {
        id: 'winter-song-2',
        title: 'Song 2 (Khúc Hoài Niệm Bếp Lửa)',
        artist: 'Freedom Studio',
        album: 'Mùa Đông & Nỗi Nhớ',
        src: '/audio/winter/song-2.wav',
        badge: 'HQ WAV',
        mood: 'Ấm áp • Chill Lofi',
        suggestedVolume: 0.45,
      },
    ],
  },
  {
    id: 'rain',
    slug: 'rain',
    name: 'Mưa Đêm',
    title: 'Midnight Rain & Warm Coffee',
    subtitle: 'Tiếng mưa rơi đều bên ô cửa sổ',
    badge: 'Mưa Rơi 🌧️',
    icon: '🌧️',
    accentColor: '#818cf8',
    secondaryColor: '#4f46e5',
    glowColor: 'rgba(129, 140, 248, 0.22)',
    atmosphere: {
      type: 'rain',
      speed: 1.0,
      density: 25,
      vibeText: 'Mưa đêm tí tách • Hương cà phê ấm • Yên ả một góc quen',
    },
    quote: 'Mỗi giọt mưa rơi xuống như gột rửa bớt những muộn phiền của ngày dài.',
    tracks: [], // Sắp ra mắt - Người dùng có thể bổ sung file audio bất kỳ lúc nào
  },
  {
    id: 'autumn',
    slug: 'autumn',
    name: 'Mùa Thu',
    title: 'Autumn Nostalgia & Golden Leaves',
    subtitle: 'Heo may xao xuyến, khoảng lặng hoàng hôn',
    badge: 'Thu Vàng 🍂',
    icon: '🍂',
    accentColor: '#f97316',
    secondaryColor: '#c2410c',
    glowColor: 'rgba(249, 115, 22, 0.22)',
    atmosphere: {
      type: 'leaves',
      speed: 0.5,
      density: 20,
      vibeText: 'Heo may dịu nhẹ • Lá vàng khẽ bay • Khoảng lặng an yên',
    },
    quote: 'Mùa thu nhắc ta rằng đôi khi buông rơi cũng là một nét đẹp bình yên.',
    tracks: [], // Sắp ra mắt
  },
];

/**
 * Lấy playlist theo slug hoặc ID
 * @param {string} slugOrId
 * @returns {object} Theme playlist tương ứng hoặc mặc định là theme đầu tiên (winter)
 */
export const getPlaylistBySlug = (slugOrId) => {
  if (!slugOrId) return PLAYLIST_THEMES[0];
  const clean = String(slugOrId).toLowerCase().trim();
  const found = PLAYLIST_THEMES.find((p) => p.slug === clean || p.id === clean);
  return found || PLAYLIST_THEMES[0];
};

/**
 * Lấy toàn bộ danh sách chủ đề playlist
 */
export const getAllPlaylists = () => PLAYLIST_THEMES;
