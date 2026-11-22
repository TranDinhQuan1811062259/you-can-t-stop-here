import React, { useState } from 'react';
import { playClickSound } from '../../utils/soundEffects';
import { TrackStoryModal } from './TrackStoryModal';

/**
 * Định dạng số giây thành chuỗi mm:ss
 */
const formatTime = (seconds) => {
  if (!seconds || isNaN(seconds) || seconds < 0) return '00:00';
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins < 10 ? '0' : ''}${mins}:${secs < 10 ? '0' : ''}${secs}`;
};

/**
 * Component trình phát nhạc chính (Vinyl Spotlight, Seekbar & Controls)
 */
export const MusicPlayerCard = ({
  theme,
  player,
  isZenMode,
  onToggleZenMode,
}) => {
  const {
    currentTrack,
    isPlaying,
    isLoading,
    audioError,
    isAutoplayBlocked,
    currentTime,
    duration,
    volume,
    isMuted,
    loopMode,
    isShuffle,
    isWavMaster,
    togglePlay,
    nextTrack,
    prevTrack,
    seekTo,
    changeVolume,
    toggleMute,
    cycleLoopMode,
    toggleShuffle,
    toggleAudioQuality,
    dismissAutoplayBlocked,
  } = player;

  const [isStoryModalOpen, setIsStoryModalOpen] = useState(false);

  const progressPercent = duration > 0 ? (currentTime / duration) * 100 : 0;

  const handleSeekChange = (e) => {
    const val = parseFloat(e.target.value);
    seekTo(val);
  };

  const handleVolumeChange = (e) => {
    const val = parseFloat(e.target.value);
    changeVolume(val);
  };

  return (
    <div className={`music-player-card ${isZenMode ? 'is-zen' : ''}`}>
      {/* Cảnh báo chặn Autoplay thân thiện (Quy tắc 4 GEMINI.md) */}
      {isAutoplayBlocked && (
        <div
          className="music-autoplay-alert"
          onClick={dismissAutoplayBlocked}
          role="button"
          tabIndex={0}
          title="Bấm để bắt đầu nghe nhạc"
        >
          <span className="alert-sparkle">❄️</span>
          <span className="alert-text">
            Trình duyệt tạm dừng tự phát. <strong>Chạm nhẹ vào đây</strong> để bắt đầu lắng nghe khúc nhạc mùa đông.
          </span>
          <button type="button" className="alert-btn">
            Bật Nhạc
          </button>
        </div>
      )}

      {/* Thông báo lỗi tải bài hát nếu có */}
      {audioError && (
        <div className="music-error-notice">
          <i className="fa-solid fa-circle-exclamation"></i>
          <span>{audioError}</span>
        </div>
      )}

      {/* Spotlight Đĩa Than Mùa Đông (Minimalist Frost Vinyl) */}
      <div className="music-vinyl-wrapper">
        <div className={`music-vinyl-disc ${isPlaying ? 'spinning' : 'paused'}`}>
          <div className="vinyl-groove groove-1" />
          <div className="vinyl-groove groove-2" />
          <div className="vinyl-groove groove-3" />
          
          <div className="vinyl-center-label">
            <span className="vinyl-theme-icon">{theme?.icon || '❄️'}</span>
            <span className="vinyl-center-hole" />
          </div>
        </div>

        {/* Vòng hào quang phát sáng theo nhịp phát */}
        <div className={`vinyl-glow-aura ${isPlaying ? 'active' : ''}`} />

        {/* Nút bật/tắt chế độ tĩnh lặng (Zen Mode) */}
        <button
          type="button"
          className={`zen-mode-toggle-btn ${isZenMode ? 'active' : ''}`}
          onClick={() => {
            playClickSound();
            onToggleZenMode();
          }}
          title={isZenMode ? 'Thoát chế độ Zen Mode' : 'Bật chế độ Zen Mode (Chỉ đĩa xoay & tuyết rơi)'}
        >
          <i className={`fa-solid ${isZenMode ? 'fa-compress' : 'fa-moon'}`}></i>
          <span>{isZenMode ? 'Thu gọn' : 'Zen Mode'}</span>
        </button>
      </div>

      {/* Thông tin bài hát hiện tại */}
      <div className="music-meta-info">
        <div className="music-badges-row">
          <span className="music-badge-pill theme-badge">
            {theme?.badge || 'Mùa Đông ❄️'}
          </span>

          {/* Nút bật/tắt Dual-Source Audio (Studio WAV Master vs Fast Stream) */}
          <button
            type="button"
            className={`music-badge-pill quality-toggle-pill ${isWavMaster ? 'is-master' : 'is-stream'}`}
            onClick={() => {
              playClickSound();
              toggleAudioQuality();
            }}
            title={
              isWavMaster
                ? 'Đang phát: Studio WAV Master (Lossless chất lượng phòng thu). Bấm để đổi sang Fast Stream.'
                : 'Đang phát: Fast Stream (Tối ưu tải nhanh 4G). Bấm để đổi sang Studio WAV Master.'
            }
          >
            <i className={`fa-solid ${isWavMaster ? 'fa-gem' : 'fa-bolt'}`}></i>
            <span>{isWavMaster ? 'Studio WAV Master' : 'Fast Stream 4G'}</span>
          </button>

          {/* Nút mở Thẻ Tâm Sự Sau Bản Thu */}
          {currentTrack?.storyNote && (
            <button
              type="button"
              className="music-badge-pill story-note-pill"
              onClick={() => {
                playClickSound();
                setIsStoryModalOpen(true);
              }}
              title="Đọc tâm sự mộc mạc của tác giả khi thu âm bản nhạc này"
            >
              <i className="fa-solid fa-envelope-open-text"></i>
              <span>Tâm sự sau bản thu</span>
              <span className="story-pill-dot" />
            </button>
          )}

          {currentTrack?.mood && (
            <span className="music-badge-pill mood-badge">
              {currentTrack.mood}
            </span>
          )}
        </div>

        <h2 className="music-track-title" title={currentTrack?.title || 'Chưa chọn bài'}>
          {currentTrack?.title || 'Đang tải danh sách phát...'}
        </h2>
        <p className="music-track-artist">
          {currentTrack?.artist || 'Freedom Studio'}
          {currentTrack?.album && <span className="track-album-separator"> • </span>}
          {currentTrack?.album && <span className="track-album-name">{currentTrack.album}</span>}
        </p>
      </div>

      {/* Thanh tua thời lượng (Seekbar) */}
      <div className="music-progress-suite">
        <div className="music-progress-times">
          <span className="time-text current">{formatTime(currentTime)}</span>
          <span className="time-text total">{formatTime(duration)}</span>
        </div>
        <div className="music-seekbar-container">
          <input
            type="range"
            min={0}
            max={duration || 100}
            step={0.5}
            value={currentTime}
            onChange={handleSeekChange}
            className="music-seekbar-input"
            aria-label="Thanh tua thời gian"
          />
          <div
            className="music-seekbar-fill"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>

      {/* Cụm nút điều khiển chính */}
      <div className="music-control-suite">
        {/* Nút ngẫu nhiên (Shuffle) */}
        <button
          type="button"
          className={`control-btn secondary-btn ${isShuffle ? 'active' : ''}`}
          onClick={() => {
            playClickSound();
            toggleShuffle();
          }}
          title={isShuffle ? 'Tắt phát ngẫu nhiên' : 'Bật phát ngẫu nhiên'}
        >
          <i className="fa-solid fa-shuffle"></i>
        </button>

        {/* Nút bài trước (Prev) */}
        <button
          type="button"
          className="control-btn nav-btn"
          onClick={() => {
            playClickSound();
            prevTrack();
          }}
          title="Bài trước"
        >
          <i className="fa-solid fa-backward-step"></i>
        </button>

        {/* Nút Phát / Tạm dừng (Play / Pause Big Button) */}
        <button
          type="button"
          className={`control-btn play-pause-master-btn ${isPlaying ? 'is-playing' : ''}`}
          onClick={() => {
            playClickSound();
            togglePlay();
          }}
          title={isPlaying ? 'Tạm dừng (Space)' : 'Phát nhạc (Space)'}
        >
          {isLoading ? (
            <i className="fa-solid fa-circle-notch fa-spin"></i>
          ) : isPlaying ? (
            <i className="fa-solid fa-pause"></i>
          ) : (
            <i className="fa-solid fa-play" style={{ marginLeft: '3px' }}></i>
          )}
        </button>

        {/* Nút bài kế tiếp (Next) */}
        <button
          type="button"
          className="control-btn nav-btn"
          onClick={() => {
            playClickSound();
            nextTrack();
          }}
          title="Bài kế tiếp"
        >
          <i className="fa-solid fa-forward-step"></i>
        </button>

        {/* Nút chế độ lặp lại (Loop) */}
        <button
          type="button"
          className={`control-btn secondary-btn ${loopMode !== 'none' ? 'active' : ''}`}
          onClick={() => {
            playClickSound();
            cycleLoopMode();
          }}
          title={
            loopMode === 'all'
              ? 'Đang lặp lại cả danh sách'
              : loopMode === 'one'
              ? 'Đang lặp lại bài này'
              : 'Không lặp lại'
          }
        >
          {loopMode === 'one' ? (
            <span style={{ fontSize: '0.85rem', fontWeight: 'bold' }}>1🔂</span>
          ) : (
            <i className="fa-solid fa-repeat"></i>
          )}
        </button>
      </div>

      {/* Thanh chỉnh âm lượng an toàn */}
      <div className="music-volume-suite">
        <button
          type="button"
          className="volume-mute-btn"
          onClick={() => {
            playClickSound();
            toggleMute();
          }}
          title={isMuted ? 'Bật âm thanh (M)' : 'Tắt tiếng (M)'}
        >
          <i
            className={`fa-solid ${
              isMuted || volume === 0
                ? 'fa-volume-xmark'
                : volume < 0.5
                ? 'fa-volume-low'
                : 'fa-volume-high'
            }`}
          ></i>
        </button>

        <div className="volume-slider-wrapper">
          <input
            type="range"
            min={0}
            max={1}
            step={0.01}
            value={isMuted ? 0 : volume}
            onChange={handleVolumeChange}
            className="volume-slider-input"
            aria-label="Thanh chỉnh âm lượng"
          />
          <div
            className="volume-slider-fill"
            style={{ width: `${(isMuted ? 0 : volume) * 100}%` }}
          />
        </div>

        <span className="volume-percentage-text">
          {isMuted ? '0%' : `${Math.round(volume * 100)}%`}
        </span>
      </div>

      {/* Modal Bưu Thiếp Tâm Sự Sau Bản Thu */}
      <TrackStoryModal
        isOpen={isStoryModalOpen}
        onClose={() => setIsStoryModalOpen(false)}
        track={currentTrack}
      />
    </div>
  );
};
