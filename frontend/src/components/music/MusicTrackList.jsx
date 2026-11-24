import React from 'react';
import { playClickSound } from '../../utils/soundEffects';
import { usePersonalHub } from '../../context/PersonalHubContext';
import { useAuth } from '../../context/AuthContext';

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
  const { likedTracks, toggleTrackLike, trackLikesMap } = usePersonalHub();
  const { isAuthenticated, openLoginModal } = useAuth();

  return (
    <div className="music-tracklist-container">
      {/* Bộ chọn chủ đề (Multi-theme Pills Switcher) */}
      <div className="music-theme-pills-bar">
        <span className="theme-pills-label">
          <i className="fa-solid fa-compass"></i> Chủ đề:
        </span>
        <div className="theme-pills-scroller">
          {allThemes.map((item) => {
            const isFavorites = item.slug === 'favorites';
            const isSelected = item.slug === theme?.slug;
            const hasTracks = item.tracks && item.tracks.length > 0;

            return (
              <button
                key={item.id}
                type="button"
                className={`theme-pill-btn ${isSelected ? 'active' : ''} ${isFavorites ? 'favorites-pill' : ''} ${!hasTracks && !isFavorites ? 'is-coming' : ''}`}
                onClick={() => {
                  playClickSound();
                  onSelectTheme(item.slug);
                }}
                title={
                  isFavorites
                    ? `Nhạc Tôi Đã Thích (${item.tracks?.length || 0} bài)`
                    : hasTracks
                      ? `Chủ đề: ${item.name} (${item.tracks.length} bài hát)`
                      : `Chủ đề: ${item.name} (Sắp ra mắt)`
                }
              >
                <span className="pill-icon">{item.icon}</span>
                <span className="pill-name">{isFavorites ? 'Nhạc Đã Thích' : item.name}</span>
                {isFavorites ? (
                  <span className="pill-track-count" style={{ background: 'rgba(244, 63, 94, 0.25)', color: '#fda4af' }}>
                    {item.tracks?.length || 0}
                  </span>
                ) : !hasTracks ? (
                  <span className="pill-badge-tiny">Sắp có</span>
                ) : (
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
          theme?.slug === 'favorites' ? (
            !isAuthenticated ? (
              <div className="tracklist-empty-card" style={{ borderColor: 'rgba(244, 63, 94, 0.35)', background: 'rgba(244, 63, 94, 0.05)' }}>
                <div className="empty-icon" style={{ filter: 'drop-shadow(0 0 16px rgba(244, 63, 94, 0.4))' }}>❤️</div>
                <h4 className="empty-title">Đăng Nhập Để Lưu Nhạc Yêu Thích</h4>
                <p className="empty-desc">
                  Hãy đăng nhập để lưu trữ các bài hát bạn yêu thích vào danh sách phát riêng và thưởng thức bất cứ lúc nào.
                </p>
                <button
                  type="button"
                  className="empty-action-btn"
                  onClick={() => openLoginModal()}
                  style={{
                    background: 'linear-gradient(135deg, #f43f5e 0%, #e11d48 100%)',
                    color: '#ffffff',
                    border: 'none',
                    boxShadow: '0 4px 16px rgba(244, 63, 94, 0.35)',
                    cursor: 'pointer',
                  }}
                >
                  <i className="fa-solid fa-right-to-bracket"></i> Đăng Nhập Ngay
                </button>
              </div>
            ) : (
              <div className="tracklist-empty-card" style={{ borderColor: 'rgba(244, 63, 94, 0.35)', background: 'rgba(244, 63, 94, 0.05)' }}>
                <div className="empty-icon">🤍</div>
                <h4 className="empty-title">Bạn Chưa Thả Tim Bản Nhạc Nào</h4>
                <p className="empty-desc">
                  Hãy bấm vào biểu tượng <strong>❤️ Thả Tim</strong> trên các bản nhạc Mùa Đông hoặc Giving Some Efforts để gom chúng vào playlist này nhé!
                </p>
                <button
                  type="button"
                  className="empty-action-btn"
                  onClick={() => {
                    playClickSound();
                    onSelectTheme('winter');
                  }}
                >
                  <i className="fa-solid fa-snowflake"></i> Khám Phá Nhạc Mùa Đông
                </button>
              </div>
            )
          ) : (
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
          )
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
                    {track.storyNote && (
                      <span className="track-story-badge" title="Bài hát có lời tâm sự của tác giả">
                        💌 Tâm sự
                      </span>
                    )}
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

                {/* Cột phải: Nút Thả Tim & Play nhanh */}
                <div className="track-right-action" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <button
                    type="button"
                    className={`track-item-heart-btn ${track.id && likedTracks.includes(track.id) ? 'is-liked' : ''}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      if (track.id) toggleTrackLike(track.id);
                    }}
                    title={track.id && likedTracks.includes(track.id) ? 'Bỏ thích bản nhạc này' : 'Thả tim bản nhạc này'}
                  >
                    <i className={`fa-${track.id && likedTracks.includes(track.id) ? 'solid' : 'regular'} fa-heart`}></i>
                    {track.id && trackLikesMap[track.id] > 0 && (
                      <span style={{ fontSize: '0.74rem' }}>{trackLikesMap[track.id]}</span>
                    )}
                  </button>

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
