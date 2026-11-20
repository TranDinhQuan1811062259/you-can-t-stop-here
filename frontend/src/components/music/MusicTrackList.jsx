import React from 'react';
import { playClickSound } from '../../utils/soundEffects';

/**
 * Component hiển thị danh sách bài hát & bộ chọn chủ đề đa mùa
 */
export const MusicTrackList = ({
  theme,
  allThemes = [],
  currentTrackIndex = 0,
  isPlaying = false,
  onSelectTrack,
  onSelectTheme,
}) => {
  const tracks = theme?.tracks || [];

  return (
    <div className="music-tracklist-container">
      {/* Bộ chọn chủ đề (Multi-theme Pills Switcher) */}
      <div className="music-theme-pills-bar">
        <span className="theme-pills-label">
          <i className="fa-solid fa-compass"></i> Chủ đề:
        </span>
        <div className="theme-pills-scroller">
          {allThemes.map((item) => {
            const isSelected = item.slug === theme?.slug;
            const hasTracks = item.tracks && item.tracks.length > 0;

            return (
              <button
                key={item.id}
                type="button"
                className={`theme-pill-btn ${isSelected ? 'active' : ''} ${!hasTracks ? 'is-coming' : ''}`}
                onClick={() => {
                  playClickSound();
                  onSelectTheme(item.slug);
                }}
                title={
                  hasTracks
                    ? `Chủ đề: ${item.name} (${item.tracks.length} bài hát)`
                    : `Chủ đề: ${item.name} (Sắp ra mắt)`
                }
              >
                <span className="pill-icon">{item.icon}</span>
                <span className="pill-name">{item.name}</span>
                {!hasTracks && <span className="pill-badge-tiny">Sắp có</span>}
                {hasTracks && (
                  <span className="pill-track-count">{item.tracks.length}</span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Header của danh sách bài hát */}
      <div className="tracklist-header-card">
        <div className="tracklist-header-left">
          <h3 className="tracklist-theme-title">
            <span className="theme-accent-icon">{theme?.icon}</span>
            {theme?.title || 'Danh Sách Phát'}
          </h3>
          <p className="tracklist-theme-subtitle">
            {theme?.subtitle || 'Giai điệu nhẹ nhàng vỗ về tâm trí'}
          </p>
        </div>
        <div className="tracklist-header-right">
          <span className="tracklist-count-badge">
            <i className="fa-solid fa-music"></i> {tracks.length} bản nhạc
          </span>
        </div>
      </div>

      {/* Danh sách các bài hát trong playlist */}
      <div className="tracklist-items-wrapper">
        {tracks.length === 0 ? (
          <div className="tracklist-empty-card">
            <div className="empty-icon">🎧</div>
            <h4 className="empty-title">Chủ đề đang chuẩn bị giai điệu</h4>
            <p className="empty-desc">
              Các bài hát cho chủ đề <strong>{theme?.name}</strong> đang được ghi âm và hoàn thiện.
              Bạn có thể chuyển về <strong>Mùa Đông ❄️</strong> để thưởng thức các bản thu sẵn có!
            </p>
            <button
              type="button"
              className="empty-action-btn"
              onClick={() => {
                playClickSound();
                onSelectTheme('winter');
              }}
            >
              <i className="fa-solid fa-snowflake"></i> Về Playlist Mùa Đông
            </button>
          </div>
        ) : (
          tracks.map((track, idx) => {
            const isActive = idx === currentTrackIndex;

            return (
              <div
                key={track.id || idx}
                className={`tracklist-item-card ${isActive ? 'is-active' : ''}`}
                onClick={() => {
                  playClickSound();
                  onSelectTrack(idx);
                }}
                role="button"
                tabIndex={0}
              >
                {/* Cột trái: Số thứ tự hoặc Equalizer động */}
                <div className="track-left-indicator">
                  {isActive && isPlaying ? (
                    <div className="track-equalizer-bars" title="Đang phát">
                      <span className="eq-bar bar-1" />
                      <span className="eq-bar bar-2" />
                      <span className="eq-bar bar-3" />
                      <span className="eq-bar bar-4" />
                    </div>
                  ) : (
                    <span className="track-index-num">
                      {(idx + 1).toString().padStart(2, '0')}
                    </span>
                  )}
                </div>

                {/* Cột giữa: Tên bài & thông tin chi tiết */}
                <div className="track-meta-content">
                  <div className="track-title-row">
                    <strong className="track-name" title={track.title}>
                      {track.title}
                    </strong>
                    {track.badge && (
                      <span className="track-badge-mini">{track.badge}</span>
                    )}
                  </div>
                  <div className="track-sub-row">
                    <span className="track-artist-name">{track.artist}</span>
                    {track.mood && (
                      <>
                        <span className="track-dot-sep">•</span>
                        <span className="track-mood-text">{track.mood}</span>
                      </>
                    )}
                  </div>
                </div>

                {/* Cột phải: Nút Play nhanh */}
                <div className="track-right-action">
                  <button
                    type="button"
                    className={`track-quick-play-btn ${isActive && isPlaying ? 'playing' : ''}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      playClickSound();
                      onSelectTrack(idx);
                    }}
                    title={isActive && isPlaying ? 'Tạm dừng' : 'Phát bài này'}
                  >
                    <i
                      className={`fa-solid ${
                        isActive && isPlaying ? 'fa-pause' : 'fa-play'
                      }`}
                    ></i>
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Thẻ trích dẫn thư giãn mùa đông (Winter Quote & Vibe Card) */}
      {theme?.quote && (
        <div className="tracklist-vibe-card">
          <div className="vibe-icon-quote">
            <i className="fa-solid fa-quote-left"></i>
          </div>
          <div className="vibe-card-body">
            <p className="vibe-quote-text">“{theme.quote}”</p>
            {theme?.atmosphere?.vibeText && (
              <span className="vibe-tag-text">
                <i className="fa-solid fa-sparkles"></i> {theme.atmosphere.vibeText}
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
