import React, { useState, useEffect, useRef } from 'react';
import { extractYouTubeId, extractSpotifyId, extractTikTokId, MUSIC_PRESETS } from '../../utils/musicPresets';

const QUALITY_MAP = {
  standard: { label: '🌱 128k', title: 'Chất lượng tiêu chuẩn (128 kbps)' },
  high: { label: '🎧 HD 256k', title: 'Chất lượng cao HD (256 kbps)' },
  lossless: { label: '💎 Hi-Res 320k', title: 'Chất lượng Hi-Res Studio (320 kbps)' },
};

const PROFILE_MAP = {
  balanced: { icon: '🎵', name: 'Cân bằng', title: 'Chế độ âm sắc cân bằng nguyên bản' },
  lofi: { icon: '📻', name: 'Lofi Tape', title: 'Chế độ âm sắc Lofi ấm áp hoài niệm' },
  bass: { icon: '🔊', name: 'Bass Boost', title: 'Chế độ tăng cường âm trầm Deep Bass' },
  vocal: { icon: '✨', name: 'Vocal Trong', title: 'Chế độ tôn giọng hát trong trẻo' },
  spatial: { icon: '🌌', name: '3D Reverb', title: 'Chế độ âm vang không gian 3D' },
};

/**
 * Widget phát nhạc nền trang cá nhân (Profile Background Music Player)
 * Hỗ trợ bản nhạc thư giãn đề xuất, YouTube, Spotify, TikTok Sound và tệp MP3.
 * Có thanh chỉnh âm lượng an toàn (Safe Volume Slider) và Bộ lọc chất lượng âm thanh tùy chỉnh.
 */
export const ProfileMusicPlayer = ({ musicConfig, authorName, isSelf, onOpenSettings }) => {
  const config = musicConfig || {
    enabled: true,
    title: 'Lofi Chill - Đêm muộn ở văn phòng',
    artist: 'Freedom Chill Beat',
    sourceType: 'preset',
    presetId: 'lofi_night',
    url: 'https://cdn.pixabay.com/download/audio/2022/05/27/audio_1808fbf07a.mp3?filename=lofi-study-112191.mp3',
    defaultVolume: 0.35,
    audioQuality: 'high',
    audioProfile: 'balanced',
  };

  const isEnabled = config.enabled !== false;
  const youtubeId = extractYouTubeId(config.url);
  const spotifyId = extractSpotifyId(config.url);
  const tiktokId = extractTikTokId(config.url);

  const isYouTube = config.sourceType === 'youtube' || Boolean(youtubeId);
  const isSpotify = config.sourceType === 'spotify' || Boolean(spotifyId);
  const isTikTok = config.sourceType === 'tiktok' || Boolean(tiktokId);

  const audioQuality = config.audioQuality || 'high';
  const audioProfile = config.audioProfile || 'balanced';

  // Tìm URL bài hát: nếu là preset thì tra trong MUSIC_PRESETS
  const resolvedUrl =
    config.sourceType === 'preset' && config.presetId
      ? MUSIC_PRESETS.find((p) => p.id === config.presetId)?.url || config.url
      : config.url;

  const audioRef = useRef(null);
  const ytIframeRef = useRef(null);
  const [isPlaying, setIsPlaying] = useState(false);

  // Mức âm lượng mặc định an toàn: 35% hoặc mức chủ trang đặt
  const [volume, setVolume] = useState(() => {
    const saved = localStorage.getItem('freedom_music_volume');
    if (saved !== null) return parseFloat(saved);
    return typeof config.defaultVolume === 'number' ? config.defaultVolume : 0.35;
  });
  const [isMuted, setIsMuted] = useState(false);
  const [audioError, setAudioError] = useState(null);

  // Đồng bộ âm lượng sang YouTube Iframe qua postMessage API
  const syncYouTubeVolume = (volVal, mutedVal) => {
    if (ytIframeRef.current && ytIframeRef.current.contentWindow) {
      try {
        if (mutedVal) {
          ytIframeRef.current.contentWindow.postMessage(
            JSON.stringify({ event: 'command', func: 'mute', args: [] }),
            '*'
          );
        } else {
          ytIframeRef.current.contentWindow.postMessage(
            JSON.stringify({ event: 'command', func: 'unMute', args: [] }),
            '*'
          );
          ytIframeRef.current.contentWindow.postMessage(
            JSON.stringify({
              event: 'command',
              func: 'setVolume',
              args: [Math.round(volVal * 100)],
            }),
            '*'
          );
        }
      } catch (err) {
        console.warn('Lỗi postMessage YouTube volume:', err);
      }
    }
  };

  // Dừng phát nhạc khi unmount hoặc đổi link
  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
      }
    };
  }, [config.url]);

  // Cập nhật âm lượng cho HTML5 audio và YouTube iframe
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = isMuted ? 0 : volume;
    }
    syncYouTubeVolume(volume, isMuted);
    localStorage.setItem('freedom_music_volume', String(volume));
  }, [volume, isMuted]);

  // Khi iframe YouTube tải xong, set ngay mức âm lượng an toàn
  const handleYouTubeIframeLoad = () => {
    setTimeout(() => {
      syncYouTubeVolume(volume, isMuted);
    }, 400);
  };

  const togglePlay = () => {
    setAudioError(null);

    // Đối với Spotify hoặc YouTube: bật/tắt phát
    if (isYouTube || isSpotify || isTikTok) {
      setIsPlaying((prev) => !prev);
      return;
    }

    if (!audioRef.current) return;

    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current
        .play()
        .then(() => {
          setIsPlaying(true);
        })
        .catch((err) => {
          console.warn('Audio play failed:', err);
          setAudioError('Trình duyệt cần bạn chạm vào để cho phép phát âm thanh.');
          setIsPlaying(false);
        });
    }
  };

  const toggleMute = () => {
    setIsMuted((prev) => !prev);
  };

  const handleVolumeChange = (newVol) => {
    const clamped = Math.max(0, Math.min(1, newVol));
    setVolume(clamped);
    if (isMuted && clamped > 0) {
      setIsMuted(false);
    }
  };

  if (!isEnabled) {
    if (isSelf) {
      return (
        <div className="profile-music-disabled-box">
          <span className="music-disabled-icon">🎵</span>
          <span className="music-disabled-text">Bạn chưa bật nhạc nền trang cá nhân.</span>
          <button type="button" className="music-setup-pill-btn" onClick={onOpenSettings}>
            + Cài đặt nhạc nền
          </button>
        </div>
      );
    }
    return null;
  }

  // Quyết định nhãn nền tảng
  let providerBadge = '🎧 Nhạc nền trang cá nhân';
  if (isSpotify) providerBadge = '🟢 Spotify';
  else if (isTikTok) providerBadge = '🎵 TikTok Sound';
  else if (isYouTube) providerBadge = '🔴 YouTube Music';

  const volumePercent = isMuted ? 0 : Math.round(volume * 100);
  const qMeta = QUALITY_MAP[audioQuality] || QUALITY_MAP.high;
  const pMeta = PROFILE_MAP[audioProfile] || PROFILE_MAP.balanced;

  return (
    <div style={{ margin: '18px 0 24px 0' }}>
      <div className={`profile-music-capsule ${isPlaying ? 'is-playing' : ''}`}>
        {/* Thẻ Audio HTML5 nếu là Preset hoặc File âm thanh trực tiếp */}
        {!isYouTube && !isSpotify && !isTikTok && resolvedUrl && (
          <audio
            ref={audioRef}
            src={resolvedUrl}
            loop
            preload="metadata"
            onEnded={() => setIsPlaying(false)}
            onError={() => setAudioError('Không thể tải file âm thanh.')}
          />
        )}

        {/* Embedded YouTube Player dạng ẩn để phát luồng âm thanh */}
        {isYouTube && youtubeId && isPlaying && (
          <div className="profile-youtube-audio-stream" style={{ display: 'none' }}>
            <iframe
              ref={ytIframeRef}
              width="200"
              height="200"
              src={`https://www.youtube.com/embed/${youtubeId}?autoplay=1&loop=1&playlist=${youtubeId}&enablejsapi=1&origin=${encodeURIComponent(window.location.origin)}`}
              title="Profile Background Music Stream"
              allow="autoplay"
              onLoad={handleYouTubeIframeLoad}
            />
          </div>
        )}

        {/* Đĩa than xoay & Sóng nhạc */}
        <div className="music-disc-wrap" onClick={togglePlay} title={isPlaying ? 'Bấm để tạm dừng' : 'Bấm để nghe nhạc'}>
          <div className={`music-disc-icon ${isPlaying ? 'spinning' : ''}`}>
            {isSpotify ? '🟢' : isTikTok ? '🎵' : isYouTube ? '💿' : '📻'}
          </div>
          {isPlaying && (
            <div className="music-equalizer-bars">
              <span className="eq-bar bar-1"></span>
              <span className="eq-bar bar-2"></span>
              <span className="eq-bar bar-3"></span>
              <span className="eq-bar bar-4"></span>
            </div>
          )}
        </div>

        {/* Thông tin bài hát & Chất lượng âm thanh */}
        <div className="music-info-meta">
          <div className="music-header-row">
            <span
              className="music-badge-tag"
              style={
                isSpotify
                  ? { background: 'rgba(29, 185, 84, 0.15)', color: '#16a34a' }
                  : isTikTok
                  ? { background: 'rgba(236, 72, 153, 0.15)', color: '#db2777' }
                  : isYouTube
                  ? { background: 'rgba(239, 68, 68, 0.12)', color: '#dc2626' }
                  : {}
              }
            >
              {providerBadge}
            </span>

            {/* Huy hiệu chất lượng âm thanh tùy chỉnh do chủ trang thiết lập */}
            <span className="music-quality-tag" title={`${qMeta.title} • ${pMeta.title}`}>
              <span className="quality-text">{qMeta.label}</span>
              <span className="quality-divider">•</span>
              <span className="quality-profile">{pMeta.icon} {pMeta.name}</span>
            </span>

            {isSelf && (
              <button
                type="button"
                className="music-edit-shortcut-btn"
                onClick={onOpenSettings}
                title="Đổi bài hát hoặc cài đặt nhạc nền"
              >
                ✏️ Đổi bài
              </button>
            )}
          </div>

          <div className="music-song-title" title={config.title || 'Giai điệu thư giãn'}>
            {config.title || 'Giai điệu thư giãn'}
          </div>
          <div className="music-song-artist">
            {config.artist || authorName || 'Cộng đồng You Can\'t Stop Here'}
          </div>
        </div>

        {/* Cụm điều khiển Play/Pause & Thanh chỉnh âm lượng (Luôn hiển thị cho mọi nguồn nhạc) */}
        <div className="music-controls-cluster">
          <button
            type="button"
            className={`music-play-btn ${isPlaying ? 'playing' : ''}`}
            onClick={togglePlay}
            title={isPlaying ? 'Tạm dừng nhạc' : `Phát nhạc nền của ${authorName}`}
            style={
              isSpotify
                ? { background: isPlaying ? 'linear-gradient(135deg, #10b981, #059669)' : 'linear-gradient(135deg, #1db954, #15803d)' }
                : isTikTok
                ? { background: isPlaying ? 'linear-gradient(135deg, #ec4899, #be185d)' : 'linear-gradient(135deg, #0f172a, #334155)' }
                : {}
            }
          >
            {isPlaying ? (
              <>
                <span className="play-icon">⏸️</span>
                <span className="play-label">Dừng</span>
              </>
            ) : (
              <>
                <span className="play-icon">▶️</span>
                <span className="play-label">Nghe nhạc</span>
              </>
            )}
          </button>

          {/* Thanh chỉnh âm lượng an toàn (Safe Volume Cluster) */}
          <div className="music-volume-group" title={`Âm lượng hiện tại: ${volumePercent}% (Mức an toàn khuyên dùng 30% - 40%)`}>
            <button
              type="button"
              className="music-mute-btn"
              onClick={toggleMute}
              title={isMuted ? 'Bật lại âm thanh' : 'Tắt tiếng tạm thời'}
            >
              {isMuted || volume === 0 ? '🔇' : volume < 0.4 ? '🔉' : '🔊'}
            </button>

            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={isMuted ? 0 : volume}
              onChange={(e) => handleVolumeChange(parseFloat(e.target.value))}
              className="music-volume-slider"
              aria-label="Thanh chỉnh âm lượng nhạc nền"
            />

            <span className="music-volume-percent">
              {volumePercent}%
            </span>

            {/* Quick volume buttons */}
            <div className="music-quick-vol-pills">
              <button
                type="button"
                className={`quick-vol-btn ${volume === 0.25 && !isMuted ? 'active' : ''}`}
                onClick={() => handleVolumeChange(0.25)}
                title="Đặt mức nhỏ 25%"
              >
                25%
              </button>
              <button
                type="button"
                className={`quick-vol-btn ${volume === 0.4 && !isMuted ? 'active' : ''}`}
                onClick={() => handleVolumeChange(0.4)}
                title="Đặt mức vừa 40% (Khuyên dùng)"
              >
                40%
              </button>
              <button
                type="button"
                className={`quick-vol-btn ${volume === 0.75 && !isMuted ? 'active' : ''}`}
                onClick={() => handleVolumeChange(0.75)}
                title="Đặt mức to 75%"
              >
                75%
              </button>
            </div>
          </div>
        </div>

        {audioError && <span className="music-error-hint">{audioError}</span>}
      </div>

      {/* Embedded Spotify Player mượt mà khi người dùng bật phát */}
      {isSpotify && spotifyId && isPlaying && (
        <div
          style={{
            marginTop: '10px',
            borderRadius: '12px',
            overflow: 'hidden',
            boxShadow: '0 4px 14px rgba(0,0,0,0.1)',
            animation: 'fadeInUp 0.3s ease',
          }}
        >
          <iframe
            src={`https://open.spotify.com/embed/track/${spotifyId}?utm_source=generator&theme=0`}
            width="100%"
            height="80"
            frameBorder="0"
            allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
            loading="lazy"
            style={{ borderRadius: '12px', border: 'none', display: 'block' }}
            title="Spotify Music Stream"
          />
        </div>
      )}

      {/* TikTok Sound Player khi người dùng bật phát */}
      {isTikTok && tiktokId && isPlaying && (
        <div
          style={{
            marginTop: '10px',
            borderRadius: '12px',
            overflow: 'hidden',
            boxShadow: '0 4px 14px rgba(0,0,0,0.1)',
            animation: 'fadeInUp 0.3s ease',
          }}
        >
          <iframe
            src={`https://www.tiktok.com/embed/v2/${tiktokId}?lang=vi-VN`}
            width="100%"
            height="180"
            frameBorder="0"
            allow="autoplay"
            style={{ borderRadius: '12px', border: 'none', display: 'block' }}
            title="TikTok Sound Stream"
          />
        </div>
      )}
    </div>
  );
};
