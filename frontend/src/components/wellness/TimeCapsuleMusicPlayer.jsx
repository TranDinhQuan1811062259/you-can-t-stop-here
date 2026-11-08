import React, { useState, useEffect, useRef } from 'react';
import { playClickSound } from '../../utils/soundEffects';

/**
 * TimeCapsuleMusicPlayer
 * 
 * Phát bài nhạc chữa lành "Lightning Moment (竖琴版 • Harp Version) - TypeD (Sáng tác: 吴浩 / Wu Hao)"
 * Từ YouTube: https://www.youtube.com/watch?v=KVremu955Qk (ID: KVremu955Qk)
 * Cơ chế: Vòng lặp vô tận (Infinite Loop), điều khiển Play/Pause, Âm lượng, Mute, Thu gọn / Xem MV.
 * Tuân thủ bản quyền: Nhúng chính thức qua YouTube IFrame Player (YouTube TOS), lượt xem/nghe và bản quyền 
 * thuộc về đơn vị nắm bản quyền gốc (TypeD / 吴浩 / 海纳音子 ℗ 2025).
 */
export const TimeCapsuleMusicPlayer = ({
  autoPlay = true,
  currentMood = 'hopeful',
  onMoodChange,
}) => {
  const [isPlaying, setIsPlaying] = useState(true);
  const [isMuted, setIsMuted] = useState(false);
  const [volume, setVolume] = useState(75);
  const [showVideo, setShowVideo] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isReady, setIsReady] = useState(false);
  const [hasInteracted, setHasInteracted] = useState(false);

  const iframeRef = useRef(null);
  const containerRef = useRef(null);

  const VIDEO_ID = 'KVremu955Qk';

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
  }, [autoPlay, volume]);

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

  // Trực tiếp phát video khi người dùng tương tác trong modal
  const handleStartMusicPrompt = () => {
    playClickSound();
    setHasInteracted(true);
    postToPlayer('unMute');
    postToPlayer('setVolume', [volume]);
    postToPlayer('playVideo');
    setIsPlaying(true);
  };

  return (
    <div
      ref={containerRef}
      className="hope-music-player-container"
      style={{
        borderRadius: '16px',
        background: 'linear-gradient(135deg, rgba(245, 158, 11, 0.12) 0%, rgba(30, 27, 75, 0.7) 100%)',
        border: '1.5px solid rgba(251, 191, 36, 0.35)',
        boxShadow: '0 8px 30px rgba(0, 0, 0, 0.35), 0 0 25px rgba(245, 158, 11, 0.12)',
        padding: isCollapsed ? '10px 16px' : '14px 18px',
        marginBottom: '16px',
        position: 'relative',
        transition: 'all 0.3s ease',
        overflow: 'hidden',
      }}
    >
      {/* Tia sáng hy vọng lung linh nền */}
      <div
        style={{
          position: 'absolute',
          top: '-40px',
          right: '-40px',
          width: '120px',
          height: '120px',
          background: 'radial-gradient(circle, rgba(251, 191, 36, 0.25) 0%, rgba(251, 191, 36, 0) 70%)',
          pointerEvents: 'none',
          filter: 'blur(10px)',
        }}
      />

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
            title={isPlaying ? 'Tạm dừng giai điệu' : 'Phát giai điệu Tia Sáng Hy Vọng'}
            style={{
              width: '42px',
              height: '42px',
              borderRadius: '50%',
              background: isPlaying
                ? 'linear-gradient(135deg, #f59e0b, #d97706)'
                : 'rgba(255, 255, 255, 0.1)',
              border: '2px solid #fde68a',
              color: isPlaying ? '#0f172a' : '#fef3c7',
              fontSize: '1rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              flexShrink: 0,
              boxShadow: isPlaying ? '0 0 16px rgba(245, 158, 11, 0.6)' : 'none',
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
                  background: 'rgba(245, 158, 11, 0.25)',
                  color: '#fef3c7',
                  border: '1px solid rgba(251, 191, 36, 0.4)',
                }}
              >
                <span>✨</span> TIA SÁNG HY VỌNG
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
                color: '#fef3c7',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}
            >
              Lightning Moment (Harp Version) • TypeD
            </div>
            <div style={{ fontSize: '0.74rem', color: '#cbd5e1' }}>
              Sáng tác: Ngô Hạo (吴浩) • Giai điệu hạc cầm xoa dịu tâm trí
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
                background: '#fbbf24',
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
                  accentColor: '#f59e0b',
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
              background: showVideo ? 'rgba(245, 158, 11, 0.3)' : 'rgba(255, 255, 255, 0.08)',
              border: showVideo ? '1px solid #f59e0b' : '1px solid rgba(255, 255, 255, 0.15)',
              color: showVideo ? '#fde68a' : '#cbd5e1',
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
            <span style={{ color: '#38bdf8' }}>🕊️</span>
            <span>Giai điệu tự động đồng hành cùng bạn khi viết thư gửi tương lai</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ color: '#10b981' }}>🛡️</span>
            <span>Bản quyền ℗ 2025 海纳音子 / TypeD / 吴浩 • Phát an toàn qua YouTube Embed</span>
          </div>
        </div>
      )}

      {/* Khung nhúng YouTube Video IFrame (Giữ iframe luôn active với kích thước thực để tránh trình duyệt tạm dừng audio) */}
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
                top: '-9999px',
                left: '-9999px',
                width: '240px',
                height: '180px',
                opacity: 0.001,
                pointerEvents: 'none',
              }
        }
      >
        <iframe
          ref={iframeRef}
          id="yt-hope-capsule-player"
          title="Tia Sáng Hy Vọng - Lightning Moment (Harp Version) TypeD"
          width="100%"
          height="100%"
          src={`https://www.youtube.com/embed/${VIDEO_ID}?enablejsapi=1&autoplay=1&loop=1&playlist=${VIDEO_ID}&playsinline=1&controls=1&rel=0&modestbranding=1`}
          frameBorder="0"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
          onLoad={() => {
            setIsReady(true);
            postToPlayer('unMute');
            postToPlayer('setVolume', [volume]);
            if (autoPlay) {
              postToPlayer('playVideo');
            }
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
