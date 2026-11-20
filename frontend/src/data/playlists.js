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
        wavSrc: '/audio/winter/winter-song-1.wav',
        streamUrl: '/audio/winter/winter-song-1.mp3', // Stream nhẹ tối ưu 4G (tự động fallback về wavSrc nếu chưa có)
        badge: 'HQ WAV',
        mood: 'Tĩnh lặng • Sâu lắng',
        suggestedVolume: 0.45,
        recordedAt: 'Đêm khuya 01:30 AM • Soundcard direct in',
        storyNote: `Bài này mình thu vào một đêm cuối năm lúc gần 1h30 sáng. Lúc đó xong việc tắt đèn phòng, mở hé cửa sổ thấy gió mùa đông thổi vào lành lạnh, tự nhiên có hứng cắm tai nghe rồi cắm đàn thẳng vào soundcard gảy vài vòng hợp âm.

Đánh thấy êm tai quá nên mình bấm nút record thu một mạch luôn, không cắt ghép hay chỉnh sửa hiệu ứng gì nhiều. Tiếng đàn mộc nguyên bản, có thể vẫn còn chút tiếng chạm phím hay tạp âm nhỏ nhưng mình thích giữ trọn vẹn cái không khí tĩnh lặng của căn phòng lúc đó.

Nếu bạn đang ngồi làm việc khuya, chạy deadline hoặc đơn giản là muốn một chút âm thanh cho đỡ trống trải thì cứ bật lên để ở mức vừa nghe nhé.`,
      },
      {
        id: 'winter-song-2',
        title: 'Song 2 (Khúc Hoài Niệm Bếp Lửa)',
        artist: 'Freedom Studio',
        album: 'Mùa Đông & Nỗi Nhớ',
        src: '/audio/winter/song-2.wav',
        wavSrc: '/audio/winter/song-2.wav',
        streamUrl: '/audio/winter/song-2.mp3', // Stream nhẹ tối ưu 4G (tự động fallback về wavSrc nếu chưa có)
        badge: 'HQ WAV',
        mood: 'Ấm áp • Chill Lofi',
        suggestedVolume: 0.45,
        recordedAt: 'Chiều muộn mưa lạnh • Home studio take',
        storyNote: `Khúc này ra đời vào một chiều trời mưa rét, lúc mình đang ngồi bên bàn làm việc pha vội cốc nước ấm nghỉ ngơi. Cầm đàn lên dạo mấy hợp âm ngẫu hứng theo kiểu lofi ấm áp, thấy giai điệu cứ lặp lại nhẹ nhàng, dễ chịu nên mình mở máy cắm jack thu lại luôn.

Bản thu này mang cảm giác mộc mạc và gần gũi. Những lúc đầu óc bị quá tải vì công việc hay thấy mệt mỏi với những chuyện linh tinh ngoài kia, mình thường bật đoạn này lên để nhịp thở chậm lại một chút.

Hy vọng khi nghe bài này, bạn cũng tìm được một chút cảm giác thoải mái và nhẹ đầu sau một ngày dài.`,
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

/**
 * Lấy URL phát âm thanh theo tùy chọn chất lượng (Dual-Source: WAV Master vs Fast Stream)
 * @param {object} track - Đối tượng bài hát
 * @param {boolean} preferWav - Bật Studio WAV Master (true) hoặc Fast Stream (false)
 * @returns {string} URL bài hát an toàn
 */
export const getTrackAudioSrc = (track, preferWav = true) => {
  if (!track) return '';
  if (preferWav) {
    return track.wavSrc || track.src || '';
  }
  return track.streamUrl || track.wavSrc || track.src || '';
};
