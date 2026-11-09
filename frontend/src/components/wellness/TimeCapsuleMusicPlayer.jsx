import React, { useState, useEffect, useRef } from 'react';
import { playClickSound } from '../../utils/soundEffects';

/**
 * Trích xuất YouTube Video ID từ nhiều định dạng URL khác nhau
 */
const extractYouTubeId = (url) => {
  if (!url) return '';
  const trimmed = url.trim();
  // Nếu đã là 11 ký tự id
  if (/^[a-zA-Z0-9_-]{11}$/.test(trimmed)) return trimmed;

  const match = trimmed.match(
    /(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=|shorts\/))([\w-]{11})/
  );
  return match ? match[1] : '';
};

/**
 * Danh sách Theme Nhạc Chữa Lành trong Hộp Thời Gian
 */
const MUSIC_THEMES = {
  heartbreak_love: {
    id: 'heartbreak_love',
    badge: '🥀 SỰ TIẾC NUỐI • VỖ VỀ KÝ ỨC',
    moodName: 'Sự Tiếc Nuối',
    tagline: 'Giai điệu da diết của I Think It’s Love vỗ về những tiếc nuối, ký ức xưa và khoảng lặng trong tim...',
    accentColor: '#f43f5e',
    glowColor: 'rgba(244, 63, 94, 0.25)',
    cardBg: 'linear-gradient(135deg, rgba(225, 29, 72, 0.18) 0%, rgba(76, 29, 149, 0.35) 50%, rgba(15, 23, 42, 0.85) 100%)',
    borderColor: 'rgba(244, 63, 94, 0.45)',
    textColor: '#ffe4e6',
    songTitle: '사랑인 것 같아 (I Think It’s Love) • TAEMIN',
    songSubtitle: 'Trình bày: TAEMIN (태민) • Giai điệu ballad sâu lắng vỗ về sự tiếc nuối và hoài niệm',
    defaultVideoId: 'G7NW70kOURQ',
  },
  hopeful: {
    id: 'hopeful',
    badge: '✨ TIA SÁNG HY VỌNG • CHỮA LÀNH TÂM TRÍ',
    moodName: 'Tia Sáng Hy Vọng',
    tagline: 'Hạc cầm Lightning Moment thắp sáng niềm tin, tiếp thêm sức mạnh vươn lên vào tương lai...',
    accentColor: '#f59e0b',
    glowColor: 'rgba(245, 158, 11, 0.25)',
    cardBg: 'linear-gradient(135deg, rgba(245, 158, 11, 0.16) 0%, rgba(30, 27, 75, 0.75) 100%)',
    borderColor: 'rgba(251, 191, 36, 0.4)',
    textColor: '#fef3c7',
    songTitle: 'Lightning Moment (Harp Version) • TypeD',
    songSubtitle: 'Sáng tác: Ngô Hạo (吴浩) • Giai điệu hạc cầm xoa dịu tâm hồn và khơi gợi hy vọng',
    defaultVideoId: 'KVremu955Qk',
  },
};

/**
 * TimeCapsuleMusicPlayer
 * 
 * Bộ phát nhạc nền lặp vô tận (Infinite Loop) cho Hộp Thời Gian
 * Hỗ trợ các chủ đề cảm xúc:
 * 1. 💔 Tâm sự tình trường (Cô đơn, đơn phương, khi mất ai đó)
 * 2. ✨ Tia sáng hy vọng (Tiếp thêm niềm tin & nghị lực)
 * 3. 🔗 Khả năng dán link YouTube bất kỳ để tùy biến theo ý thích
 * 
 * Bản quyền: Phát trực tiếp qua YouTube Embedded Player chính thức (chuẩn YouTube Developer TOS),
 * bảo vệ quyền sở hữu trí tuệ của tác giả TypeD / 吴浩 (海纳音子 ℗ 2025).
 */
export const TimeCapsuleMusicPlayer = ({
  autoPlay = true,
  currentMood = 'heartbreak_love',
  onMoodChange,
}) => {
  const [isPlaying, setIsPlaying] = useState(true);
  const [isMuted, setIsMuted] = useState(false);
  const [volume, setVolume] = useState(75);
  const [showVideo, setShowVideo] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isReady, setIsReady] = useState(false);
  const [hasInteracted, setHasInteracted] = useState(false);

  // Video ID hiện tại (mặc định lấy theo mood: Sự Tiếc Nuối -> G7NW70kOURQ)
  const [activeVideoId, setActiveVideoId] = useState(() => {
    const defaultTheme = MUSIC_THEMES[currentMood] || MUSIC_THEMES.heartbreak_love;
    return defaultTheme.defaultVideoId || 'G7NW70kOURQ';
  });

  // Input dán URL YouTube tùy chỉnh
  const [showCustomInput, setShowCustomInput] = useState(false);
  const [customUrlInput, setCustomUrlInput] = useState('');
  const [customSongName, setCustomSongName] = useState('');

  const iframeRef = useRef(null);
  const containerRef = useRef(null);

  // Xác định cấu hình theme hiện tại
  const theme = MUSIC_THEMES[currentMood] || MUSIC_THEMES.heartbreak_love;

  // Gửi lệnh điều khiển tới YouTube Iframe thông qua postMessage
  const postToPlayer = (func, args = []) => {
    if (iframeRef.current && iframeRef.current.contentWindow) {
      try {
        iframeRef.current.contentWindow.postMessage(
          JSON.stringify({
            event: 'command',
            func,
            args,
          }),
          '*'
        );
      } catch (e) {
        // Bỏ qua lỗi giao tiếp cross-origin
      }
    }
  };

  // Khởi tạo và lắng nghe phản hồi từ YouTube Player
  useEffect(() => {
    const handleMessage = (event) => {
      try {
        const data = typeof event.data === 'string' ? JSON.parse(event.data) : event.data;
        if (data?.event === 'onReady') {
          setIsReady(true);
          postToPlayer('setVolume', [volume]);
          if (autoPlay) {
            postToPlayer('playVideo');
          }
        }
        if (data?.event === 'infoDelivery' && data?.info) {
          if (typeof data.info.playerState !== 'undefined') {
            const state = data.info.playerState;
            // 1: Playing, 2: Paused, 0: Ended
            if (state === 1) setIsPlaying(true);
            if (state === 2) setIsPlaying(false);
            if (state === 0) {
              // Video kết thúc -> Bật lại từ đầu để lặp vô tận (Infinite Loop)
              postToPlayer('seekTo', [0, true]);
              postToPlayer('playVideo');
              setIsPlaying(true);
            }
          }
        }
      } catch (err) {
        // Ignore non-youtube messages
      }
    };

    window.addEventListener('message', handleMessage);
    return () => {
      window.removeEventListener('message', handleMessage);
    };
  }, [autoPlay, volume, activeVideoId]);

  // Đảm bảo âm thanh phát được ngay khi có cử chỉ người dùng (user gesture)
  useEffect(() => {
    const handleGesture = () => {
      if (!hasInteracted) {
        setHasInteracted(true);
        postToPlayer('unMute');
        postToPlayer('setVolume', [volume]);
        postToPlayer('playVideo');
      }
    };
    window.addEventListener('click', handleGesture, { once: true });
    window.addEventListener('keydown', handleGesture, { once: true });
    return () => {
      window.removeEventListener('click', handleGesture);
      window.removeEventListener('keydown', handleGesture);
    };
  }, [hasInteracted, volume]);

  // Điều khiển Play / Pause
  const togglePlay = () => {
    playClickSound();
    setHasInteracted(true);
    if (isPlaying) {
      postToPlayer('pauseVideo');
      setIsPlaying(false);
    } else {
      postToPlayer('unMute');
      postToPlayer('setVolume', [volume]);
      postToPlayer('playVideo');
      setIsPlaying(true);
    }
  };

  // Điều khiển Mute / Unmute
  const toggleMute = () => {
    playClickSound();
    setHasInteracted(true);
    if (isMuted) {
      postToPlayer('unMute');
      postToPlayer('setVolume', [volume]);
      setIsMuted(false);
    } else {
      postToPlayer('mute');
      setIsMuted(true);
    }
  };

  // Điều khiển Âm lượng
  const handleVolumeChange = (e) => {
    const newVol = parseInt(e.target.value, 10);
    setVolume(newVol);
    setHasInteracted(true);
    postToPlayer('setVolume', [newVol]);
    if (newVol > 0 && isMuted) {
      postToPlayer('unMute');
      setIsMuted(false);
    }
  };

  // Áp dụng link YouTube tùy chỉnh
  const handleApplyCustomUrl = (e) => {
    e.preventDefault();
    playClickSound();
    const id = extractYouTubeId(customUrlInput);
    if (!id) {
      alert('Vui lòng nhập link YouTube hợp lệ (ví dụ: https://www.youtube.com/watch?v=...)');
      return;
    }
    setActiveVideoId(id);
    setCustomSongName(`Bài nhạc tùy chỉnh (${id})`);
    setShowCustomInput(false);
    setIsPlaying(true);
  };

  // Đồng bộ Video ID khi đổi tâm trạng từ bên ngoài
  useEffect(() => {
    if (currentMood && MUSIC_THEMES[currentMood]) {
      const themeConfig = MUSIC_THEMES[currentMood];
      if (themeConfig.defaultVideoId) {
        setActiveVideoId(themeConfig.defaultVideoId);
        setCustomSongName('');
      }
    }
  }, [currentMood]);

  // Chọn chủ đề nhanh
  const handleSelectTheme = (moodId) => {
    playClickSound();
    if (onMoodChange) {
      onMoodChange(moodId);
    }
    const targetTheme = MUSIC_THEMES[moodId] || MUSIC_THEMES.heartbreak_love;
    setActiveVideoId(targetTheme.defaultVideoId || 'G7NW70kOURQ');
    setCustomSongName('');
    setShowCustomInput(false);
    setIsPlaying(true);
  };

  return (
    <div
      ref={containerRef}
      className="hope-music-player-container"
      style={{
        borderRadius: '16px',
        background: theme.cardBg,
        border: `1.5px solid ${theme.borderColor}`,
        boxShadow: `0 8px 30px rgba(0, 0, 0, 0.4), 0 0 25px ${theme.glowColor}`,
        padding: isCollapsed ? '10px 16px' : '14px 18px',
        marginBottom: '16px',
        position: 'relative',
        transition: 'all 0.3s ease',
        overflow: 'hidden',
      }}
    >
      {/* Hiệu ứng ánh sáng nền lung linh */}
      <div
        style={{
          position: 'absolute',
          top: '-40px',
          right: '-40px',
          width: '130px',
          height: '130px',
          background: `radial-gradient(circle, ${theme.glowColor} 0%, rgba(0, 0, 0, 0) 70%)`,
          pointerEvents: 'none',
          filter: 'blur(12px)',
        }}
      />

      {/* Thanh chọn chủ đề nhanh */}
      {!isCollapsed && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            marginBottom: '10px',
            flexWrap: 'wrap',
          }}
        >
          <span style={{ fontSize: '0.74rem', color: '#cbd5e1', fontWeight: 600 }}>
            Tâm trạng âm nhạc:
          </span>

          <button
            type="button"
            onClick={() => handleSelectTheme('heartbreak_love')}
            style={{
              padding: '4px 10px',
              borderRadius: '20px',
              fontSize: '0.74rem',
              fontWeight: 700,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '5px',
              background:
                currentMood === 'heartbreak_love' && !customSongName
                  ? 'rgba(244, 63, 94, 0.3)'
                  : 'rgba(255, 255, 255, 0.06)',
              border:
                currentMood === 'heartbreak_love' && !customSongName
                  ? '1.5px solid #f43f5e'
                  : '1px solid rgba(255, 255, 255, 0.12)',
              color: currentMood === 'heartbreak_love' && !customSongName ? '#ffe4e6' : '#cbd5e1',
              transition: 'all 0.2s ease',
            }}
          >
            <span>🥀</span>
            <span>Sự Tiếc Nuối</span>
          </button>

          <button
            type="button"
            onClick={() => handleSelectTheme('hopeful')}
            style={{
              padding: '4px 10px',
              borderRadius: '20px',
              fontSize: '0.74rem',
              fontWeight: 700,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '5px',
              background:
                currentMood === 'hopeful' && !customSongName
                  ? 'rgba(245, 158, 11, 0.3)'
                  : 'rgba(255, 255, 255, 0.06)',
              border:
                currentMood === 'hopeful' && !customSongName
                  ? '1.5px solid #f59e0b'
                  : '1px solid rgba(255, 255, 255, 0.12)',
              color: currentMood === 'hopeful' && !customSongName ? '#fef3c7' : '#cbd5e1',
              transition: 'all 0.2s ease',
            }}
          >
            <span>✨</span>
            <span>Tia Sáng Hy Vọng</span>
          </button>

          <button
            type="button"
            onClick={() => {
              playClickSound();
              setShowCustomInput(!showCustomInput);
            }}
            style={{
              padding: '4px 10px',
              borderRadius: '20px',
              fontSize: '0.74rem',
              fontWeight: 600,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '5px',
              background: showCustomInput || customSongName ? 'rgba(56, 189, 248, 0.25)' : 'rgba(255, 255, 255, 0.06)',
              border: showCustomInput || customSongName ? '1.5px solid #38bdf8' : '1px solid rgba(255, 255, 255, 0.12)',
              color: showCustomInput || customSongName ? '#bae6fd' : '#94a3b8',
              transition: 'all 0.2s ease',
            }}
          >
            <span>🔗</span>
            <span>{customSongName ? 'Đổi Link' : 'Dán Link YouTube'}</span>
          </button>
        </div>
      )}

      {/* Khung nhập Link YouTube tùy chỉnh */}
      {showCustomInput && (
        <form
          onSubmit={handleApplyCustomUrl}
          style={{
            display: 'flex',
            gap: '8px',
            marginBottom: '12px',
            padding: '8px 12px',
            borderRadius: '10px',
            background: 'rgba(0, 0, 0, 0.35)',
            border: '1px solid rgba(56, 189, 248, 0.3)',
            animation: 'fadeIn 0.2s ease',
          }}
        >
          <input
            type="text"
            placeholder="Dán link bài hát YouTube (vd: https://www.youtube.com/watch?v=...)"
            value={customUrlInput}
            onChange={(e) => setCustomUrlInput(e.target.value)}
            style={{
              flex: 1,
              padding: '6px 10px',
              borderRadius: '8px',
              background: 'rgba(255, 255, 255, 0.08)',
              border: '1px solid rgba(255, 255, 255, 0.2)',
              color: '#f8fafc',
              fontSize: '0.8rem',
              outline: 'none',
            }}
          />
          <button
            type="submit"
            style={{
              padding: '6px 14px',
              borderRadius: '8px',
              background: 'linear-gradient(135deg, #0284c7, #0369a1)',
              border: 'none',
              color: '#fff',
              fontSize: '0.8rem',
              fontWeight: 700,
              cursor: 'pointer',
            }}
          >
            Phát Vô Tận ♾️
          </button>
        </form>
      )}

      {/* Header thanh phát nhạc */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '12px',
          flexWrap: 'wrap',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: '220px', flex: 1 }}>
          {/* Nút Play / Pause tròn viền phát sáng */}
          <button
            type="button"
            onClick={togglePlay}
            title={isPlaying ? 'Tạm dừng giai điệu' : 'Phát giai điệu vô tận'}
            style={{
              width: '42px',
              height: '42px',
              borderRadius: '50%',
              background: isPlaying
                ? `linear-gradient(135deg, ${theme.accentColor}, #be123c)`
                : 'rgba(255, 255, 255, 0.1)',
              border: `2px solid ${theme.textColor}`,
              color: '#ffffff',
              fontSize: '1rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              flexShrink: 0,
              boxShadow: isPlaying ? `0 0 16px ${theme.glowColor}` : 'none',
              transition: 'all 0.2s ease',
            }}
          >
            {isPlaying ? (
              <i className="fa-solid fa-pause"></i>
            ) : (
              <i className="fa-solid fa-play" style={{ marginLeft: '2px' }}></i>
            )}
          </button>

          {/* Thông tin bài hát & huy hiệu */}
          <div style={{ minWidth: 0, flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '2px' }}>
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                  fontSize: '0.68rem',
                  fontWeight: 800,
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px',
                  padding: '2px 8px',
                  borderRadius: '6px',
                  background: 'rgba(0, 0, 0, 0.35)',
                  color: theme.textColor,
                  border: `1px solid ${theme.borderColor}`,
                }}
              >
                {theme.badge}
              </span>

              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                  fontSize: '0.68rem',
                  fontWeight: 700,
                  color: '#a7f3d0',
                  background: 'rgba(16, 185, 129, 0.2)',
                  padding: '2px 6px',
                  borderRadius: '6px',
                  border: '1px solid rgba(52, 211, 153, 0.3)',
                }}
              >
                <span>♾️</span> Lặp vô tận
              </span>
            </div>

            <div
              style={{
                fontSize: '0.88rem',
                fontWeight: 700,
                color: theme.textColor,
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}
            >
              {customSongName || theme.songTitle}
            </div>
            <div style={{ fontSize: '0.74rem', color: '#cbd5e1' }}>
              {theme.tagline}
            </div>
          </div>
        </div>

        {/* Thanh sóng âm Visualizer (Equalizer Animation) */}
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: '3px', height: '22px', padding: '0 4px' }}>
          {[14, 22, 10, 18, 12].map((height, idx) => (
            <span
              key={idx}
              style={{
                width: '3.5px',
                height: isPlaying ? `${height}px` : '4px',
                background: theme.accentColor,
                borderRadius: '3px',
                transition: 'height 0.2s ease',
                animation: isPlaying ? `equalizerPulse 0.8s ease-in-out infinite alternate ${idx * 0.15}s` : 'none',
              }}
            />
          ))}
        </div>

        {/* Cụm điều khiển: Âm lượng, Mute, Xem video, Thu gọn */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          {/* Nút Mute / Unmute */}
          <button
            type="button"
            onClick={toggleMute}
            title={isMuted ? 'Bật tiếng' : 'Tắt tiếng'}
            style={{
              background: 'rgba(255, 255, 255, 0.08)',
              border: '1px solid rgba(255, 255, 255, 0.15)',
              color: isMuted ? '#f43f5e' : '#cbd5e1',
              width: '32px',
              height: '32px',
              borderRadius: '8px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              fontSize: '0.86rem',
            }}
          >
            <i className={isMuted ? 'fa-solid fa-volume-xmark' : volume > 50 ? 'fa-solid fa-volume-high' : 'fa-solid fa-volume-low'}></i>
          </button>

          {/* Slider âm lượng */}
          {!isCollapsed && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <input
                type="range"
                min="0"
                max="100"
                value={isMuted ? 0 : volume}
                onChange={handleVolumeChange}
                style={{
                  width: '65px',
                  accentColor: theme.accentColor,
                  cursor: 'pointer',
                  height: '4px',
                }}
                title={`Âm lượng: ${isMuted ? 0 : volume}%`}
              />
              <span style={{ fontSize: '0.72rem', color: '#94a3b8', width: '28px' }}>
                {isMuted ? '0%' : `${volume}%`}
              </span>
            </div>
          )}

          {/* Nút bật/tắt xem MV video gốc */}
          <button
            type="button"
            onClick={() => {
              playClickSound();
              setShowVideo(!showVideo);
            }}
            title={showVideo ? 'Ẩn màn hình video (chỉ nghe nhạc)' : 'Mở rộng xem MV hạc cầm trên YouTube'}
            style={{
              padding: '5px 9px',
              borderRadius: '8px',
              background: showVideo ? 'rgba(244, 63, 94, 0.3)' : 'rgba(255, 255, 255, 0.08)',
              border: showVideo ? `1px solid ${theme.accentColor}` : '1px solid rgba(255, 255, 255, 0.15)',
              color: showVideo ? theme.textColor : '#cbd5e1',
              fontSize: '0.75rem',
              fontWeight: 600,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
            }}
          >
            <i className="fa-brands fa-youtube" style={{ color: '#ef4444' }}></i>
            <span>{showVideo ? 'Ẩn MV' : 'Xem MV'}</span>
          </button>

          {/* Nút thu gọn / mở rộng */}
          <button
            type="button"
            onClick={() => {
              playClickSound();
              setIsCollapsed(!isCollapsed);
            }}
            title={isCollapsed ? 'Mở rộng chi tiết' : 'Thu gọn thanh nhạc'}
            style={{
              background: 'transparent',
              border: 'none',
              color: '#94a3b8',
              cursor: 'pointer',
              fontSize: '0.85rem',
              padding: '4px',
            }}
          >
            <i className={isCollapsed ? 'fa-solid fa-chevron-down' : 'fa-solid fa-chevron-up'}></i>
          </button>
        </div>
      </div>

      {/* Thông tin bản quyền & Ghi chú tính năng */}
      {!isCollapsed && !showVideo && (
        <div
          style={{
            marginTop: '10px',
            paddingTop: '8px',
            borderTop: '1px solid rgba(255, 255, 255, 0.08)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            fontSize: '0.72rem',
            color: '#94a3b8',
            flexWrap: 'wrap',
            gap: '8px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ color: '#f43f5e' }}>🥀</span>
            <span>Giai điệu lặp vô tận cùng bạn viết nên những tâm tư chân thật nhất</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ color: '#10b981' }}>🛡️</span>
            <span>
              {theme.id === 'heartbreak_love'
                ? 'Bản quyền ℗ SM Entertainment / TAEMIN (태민) • Phát an toàn qua YouTube Embed'
                : 'Bản quyền ℗ 2025 海纳音子 / TypeD / 吴浩 • Phát an toàn qua YouTube Embed'}
            </span>
          </div>
        </div>
      )}

      {/* Khung nhúng YouTube Video IFrame (Giữ iframe luôn nằm trong viewport để trình duyệt/Electron không tạm dừng âm thanh) */}
      <div
        style={
          showVideo
            ? {
                marginTop: '12px',
                height: '260px',
                width: '100%',
                overflow: 'hidden',
                borderRadius: '12px',
                transition: 'all 0.3s ease',
                background: '#000',
                position: 'relative',
              }
            : {
                position: 'absolute',
                bottom: 0,
                right: 0,
                width: '200px',
                height: '120px',
                opacity: 0.001,
                pointerEvents: 'none',
                zIndex: -1,
              }
        }
      >
        <iframe
          ref={iframeRef}
          key={activeVideoId}
          id="yt-hope-capsule-player"
          title="Hộp Thời Gian - Nhạc Chữa Lành Lặp Vô Tận"
          width="100%"
          height="100%"
          src={`https://www.youtube.com/embed/${activeVideoId}?enablejsapi=1&autoplay=1&loop=1&playlist=${activeVideoId}&playsinline=1&controls=1&rel=0&modestbranding=1${typeof window !== 'undefined' && window.location.origin ? `&origin=${encodeURIComponent(window.location.origin)}` : ''}`}
          frameBorder="0"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          allowFullScreen
          onLoad={() => {
            setIsReady(true);
            setTimeout(() => {
              postToPlayer('unMute');
              postToPlayer('setVolume', [volume]);
              if (autoPlay) {
                postToPlayer('playVideo');
              }
            }, 600);
          }}
          style={{
            display: 'block',
            width: '100%',
            height: '100%',
            border: 'none',
          }}
        />
      </div>

      {/* Keyframe animation cho sóng nhạc */}
      <style>{`
        @keyframes equalizerPulse {
          0% { height: 4px; }
          100% { height: 22px; }
        }
      `}</style>
    </div>
  );
};
