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
    id: 'giving-some-efforts',
    slug: 'giving-some-efforts',
    name: 'Truyền Động Lực',
    title: 'Giving Some Efforts • Cố Gắng Thêm Một Chút',
    subtitle: 'Âm hưởng bền bỉ, tiếp thêm sức mạnh không bỏ cuộc',
    badge: 'Động Lực ✨',
    icon: '✨',
    accentColor: '#f59e0b', // Amber Gold
    secondaryColor: '#d97706',
    glowColor: 'rgba(245, 158, 11, 0.22)',
    atmosphere: {
      type: 'effort',
      speed: 0.7,
      density: 25,
      vibeText: 'Từng bước bền bỉ • Giữ vững niềm tin • Thành quả từ nỗ lực',
    },
    quote: 'Dù chặng đường phía trước còn xa, mỗi bước chân bền bỉ hôm nay đều đưa bạn đến gần hơn với phiên bản tốt đẹp hơn của chính mình.',
    tracks: [
      {
        id: 'effort-song-1',
        title: 'Nhịp 1: Bền Bỉ (Song 1E)',
        artist: 'Freedom Studio 🎙️',
        album: 'Giving Some Efforts',
        src: '/audio/giving-some-efforts/Song1E.wav',
        wavSrc: '/audio/giving-some-efforts/Song1E.wav',
        streamUrl: '/audio/giving-some-efforts/Song1E.wav',
        badge: 'HQ WAV',
        mood: 'Kiên trì • Vững bước qua deadline',
        suggestedVolume: 0.5,
        recordedAt: 'Freedom Studio Take • Studio Master Direct 24-bit',
        storyNote: `Giai điệu được sáng tác và thu âm cho những khoảnh khắc bạn cảm thấy bước chân trĩu nặng nhưng vẫn muốn cố gắng thêm một chút. Mỗi nốt nhạc là một lời nhắc nhở rằng mọi thành quả lớn lao đều được xây dựng từ những nỗ lực thầm lặng và bền bỉ mỗi ngày. Hãy đeo tai nghe và tiếp tục hành trình nhé!`,
      },
      {
        id: 'effort-song-2',
        title: 'Nhịp 2: Vươn Lên (Song 2E)',
        artist: 'Freedom Studio 🎙️',
        album: 'Giving Some Efforts',
        src: '/audio/giving-some-efforts/Song2E.wav',
        wavSrc: '/audio/giving-some-efforts/Song2E.wav',
        streamUrl: '/audio/giving-some-efforts/Song2E.wav',
        badge: 'HQ WAV',
        mood: 'Lạc quan • Ánh sáng cuối con đường',
        suggestedVolume: 0.5,
        recordedAt: 'Freedom Studio Take • Studio Master Direct 24-bit',
        storyNote: `Bản thu mang âm hưởng tươi sáng và tràn đầy năng lượng tích cực. Hãy bật giai điệu này khi bạn bắt tay vào công việc, đối mặt với thử thách hay cần tìm lại sự tự tin vào chính bản thân mình. Sau cơn mưa trời sẽ sáng!`,
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
    tracks: [
      {
        id: 'rain-song-1',
        title: 'Rain Song 1 (Gió Mưa Đêm & Tí Tách)',
        artist: 'Freedom Studio 🎙️',
        album: 'Mưa Đêm & Cà Phê Ấm',
        src: '/audio/midnight-river-song.mp4',
        wavSrc: '/audio/midnight-river-song.mp4',
        streamUrl: '/audio/midnight-river-song.mp4',
        badge: 'Ambient HQ',
        mood: 'Bình yên • Trầm lặng',
        suggestedVolume: 0.4,
        recordedAt: 'Đêm mưa tĩnh mịch • Soundcard direct in',
        storyNote: `Âm hưởng mưa rơi dịu êm hòa cùng tiếng đàn mộc, lý tưởng cho những đêm cần tập trung đọc sách, suy ngẫm hoặc tìm lại sự bình yên sau giờ tan ca.`,
      },
      {
        id: 'rain-song-2',
        title: 'Rain Song 2 (Dòng Sông Nửa Đêm & Yên Ả)',
        artist: 'Freedom Studio 🎙️',
        album: 'Mưa Đêm & Cà Phê Ấm',
        src: '/audio/midnight-river-song.mp4',
        wavSrc: '/audio/midnight-river-song.mp4',
        streamUrl: '/audio/midnight-river-song.mp4',
        badge: 'HQ Master',
        mood: 'Thư thái • Chữa lành',
        suggestedVolume: 0.4,
        recordedAt: 'Góc phòng ấm cúng • Studio session take',
        storyNote: `Giai điệu chảy trôi nhẹ nhàng như dòng sông đêm, xua tan căng thẳng và mang lại giấc ngủ an lành.`,
      },
    ],
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
    tracks: [
      {
        id: 'autumn-song-1',
        title: 'Autumn Song 1 (Heo May & Lá Rơi)',
        artist: 'Freedom Studio 🎙️',
        album: 'Thu Vàng & Khoảng Lặng',
        src: '/audio/winter/song-2.wav',
        wavSrc: '/audio/winter/song-2.wav',
        streamUrl: '/audio/winter/song-2.wav',
        badge: 'Acoustic',
        mood: 'Hoài niệm • Lắng đọng',
        suggestedVolume: 0.45,
        recordedAt: 'Chiều thu vàng êm ả • Home studio take',
        storyNote: `Giai điệu acoustic guitar mộc mạc lưu giữ những rung động tinh tế của khúc giao mùa thu vàng.`,
      },
      {
        id: 'autumn-song-2',
        title: 'Autumn Song 2 (Khúc Giao Mùa Chiều Muộn)',
        artist: 'Freedom Studio 🎙️',
        album: 'Thu Vàng & Khoảng Lặng',
        src: '/audio/winter/winter-song-1.wav',
        wavSrc: '/audio/winter/winter-song-1.wav',
        streamUrl: '/audio/winter/winter-song-1.wav',
        badge: 'HQ Master',
        mood: 'Ấm áp • Nhẹ đầu',
        suggestedVolume: 0.45,
        recordedAt: 'Hoàng hôn giao mùa • Soundcard direct in',
        storyNote: `Khúc dạo nhẹ nhàng giúp bạn thả lỏng đôi vai, hít một hơi thật sâu sau những áp lực của cuộc sống hối hả.`,
      },
    ],
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
