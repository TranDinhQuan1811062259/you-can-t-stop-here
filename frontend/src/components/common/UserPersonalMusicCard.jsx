import React, { useState } from 'react';
import { validatePersonalMusicUrl } from '../../utils/personalMusicUtils';
import { pauseSystemMusic } from '../../context/MusicContext';
import { playClickSound } from '../../utils/soundEffects';

/**
 * Thẻ Nhạc Cá Nhân (User Personal Music Card)
 * Hiển thị liên kết âm nhạc cá nhân của tác giả bài viết hoặc profile người dùng.
 * Tách biệt 100% với playlist chính của Góc Nhạc, tự động ngắt nhạc nền hệ thống khi bấm nghe.
 */
export const UserPersonalMusicCard = ({
  musicData,
  url,
  title,
  artist,
  compact = false,
  className = '',
}) => {
  const [isOpenPlayer, setIsOpenPlayer] = useState(false);

  const rawUrl = musicData?.url || url || '';
  if (!rawUrl) return null;

  const validation = validatePersonalMusicUrl(rawUrl);
  if (!validation.isValid) return null;

  const displayTitle = musicData?.title || title || validation.title || 'Giai điệu tâm sự';
  const displayArtist = musicData?.artist || artist || validation.artist || validation.platformName;

  const handleTogglePlay = () => {
    playClickSound();
    const nextState = !isOpenPlayer;
    if (nextState) {
      // Khi user mở trình phát nhạc cá nhân, tự động ngắt nhạc nền hệ thống để chống phát chồng âm
      pauseSystemMusic();
    }
    setIsOpenPlayer(nextState);
  };

  return (
    <div
      className={`user-personal-music-card ${compact ? 'is-compact' : ''} ${className} provider-${validation.provider}`}
      style={{
        '--provider-color': validation.brandColor,
        '--provider-glow': validation.glowColor,
      }}
      data-no-swipe="true"
    >
      <div className="personal-music-inner">
        {/* Cột trái: Icon xoay đĩa than hoặc equalizer */}
        <div className="personal-music-disc-wrap">
          <div className={`personal-music-disc ${isOpenPlayer ? 'is-spinning' : ''}`}>
            <i className={validation.icon} aria-hidden="true"></i>
          </div>
        </div>

        {/* Cột giữa: Thông tin bài hát & huy hiệu nền tảng */}
        <div className="personal-music-info">
          <div className="personal-music-badge-row">
            <span className="personal-music-provider-badge">
              {validation.badge}
            </span>
            <span className="personal-music-label-chip">
              Nhạc cảm xúc của tác giả
            </span>
          </div>

          <h4 className="personal-music-title" title={displayTitle}>
            {displayTitle}
          </h4>
          <p className="personal-music-artist">
            {displayArtist}
          </p>
        </div>

        {/* Cột phải: Các nút hành động */}
        <div className="personal-music-actions">
          <button
            type="button"
            className={`personal-music-play-btn ${isOpenPlayer ? 'is-active' : ''}`}
            onClick={handleTogglePlay}
            title={isOpenPlayer ? 'Thu gọn khung phát nhạc' : 'Mở nghe bài hát này'}
            aria-label={isOpenPlayer ? 'Đóng trình phát' : 'Mở trình phát'}
          >
            <i className={`fa-solid ${isOpenPlayer ? 'fa-pause' : 'fa-play'}`} aria-hidden="true"></i>
            <span>{isOpenPlayer ? 'Thu gọn' : 'Nghe nhạc'}</span>
          </button>

          <a
            href={validation.cleanUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="personal-music-open-link-btn"
            title={`Mở bài hát trực tiếp trên ${validation.platformName}`}
            aria-label={`Mở trên ${validation.platformName}`}
          >
            <i className="fa-solid fa-arrow-up-right-from-square" aria-hidden="true"></i>
          </a>
        </div>
      </div>

      {/* Khung nhúng Player (Iframe Embed Player) xuất hiện mượt mà khi người dùng bấm Nghe */}
      {isOpenPlayer && validation.embedUrl && (
        <div className="personal-music-embed-container">
          {validation.provider === 'spotify' ? (
            <iframe
              src={validation.embedUrl}
              width="100%"
              height="152"
              frameBorder="0"
              allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
              loading="lazy"
              title={`Spotify Player - ${displayTitle}`}
              style={{ borderRadius: '12px' }}
            />
          ) : validation.provider === 'soundcloud' ? (
            <iframe
              src={validation.embedUrl}
              width="100%"
              height="130"
              scrolling="no"
              frameBorder="no"
              allow="autoplay"
              loading="lazy"
              title={`SoundCloud Player - ${displayTitle}`}
              style={{ borderRadius: '12px' }}
            />
          ) : validation.provider === 'youtube' ? (
            <div className="personal-music-yt-wrapper">
              <iframe
                src={validation.embedUrl}
                width="100%"
                height="200"
                frameBorder="0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                allowFullScreen
                loading="lazy"
                title={`YouTube Music Player - ${displayTitle}`}
                style={{ borderRadius: '12px' }}
              />
            </div>
          ) : (
            <div className="personal-music-generic-embed">
              <iframe
                src={validation.embedUrl}
                width="100%"
                height="120"
                frameBorder="0"
                loading="lazy"
                title={`Music Player - ${displayTitle}`}
                style={{ borderRadius: '12px' }}
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default UserPersonalMusicCard;
