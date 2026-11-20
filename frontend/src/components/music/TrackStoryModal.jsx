import React, { useEffect } from 'react';
import { playClickSound } from '../../utils/soundEffects';

/**
 * Modal hiển thị "Tâm Sự Sau Bản Thu" (Behind-The-Track Whispers)
 * Nơi chia sẻ những khoảnh khắc và cảm hứng mộc mạc khi sáng tác & thu âm đêm khuya.
 * Tuân thủ Quy tắc 3 GEMINI.md: Dọn dẹp phím tắt Escape khi unmount.
 */
export const TrackStoryModal = ({ isOpen, onClose, track }) => {
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen || !track) return null;

  return (
    <div
      className="track-story-backdrop"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          playClickSound();
          onClose();
        }
      }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="track-story-title"
    >
      <div className="track-story-card">
        {/* Nút đóng modal */}
        <button
          type="button"
          className="track-story-close-btn"
          onClick={() => {
            playClickSound();
            onClose();
          }}
          title="Đóng tâm sự (Esc)"
          aria-label="Đóng"
        >
          <i className="fa-solid fa-xmark"></i>
        </button>

        {/* Header bưu thiếp tâm sự */}
        <div className="track-story-header">
          <div className="story-stamp-wrap">
            <span className="story-stamp-icon">💌</span>
            <div className="story-stamp-badge">Chính Chủ</div>
          </div>
          <div className="story-header-texts">
            <span className="story-subtitle">Tâm Sự Sau Bản Thu • Behind The Track</span>
            <h2 id="track-story-title" className="story-title">
              {track.title}
            </h2>
            <div className="story-meta-row">
              <span className="story-artist">
                <i className="fa-solid fa-microphone-lines"></i> {track.artist || 'Freedom Studio'}
              </span>
              {track.recordedAt && (
                <span className="story-date-tag">
                  <i className="fa-regular fa-clock"></i> {track.recordedAt}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Nội dung lời tự sự */}
        <div className="track-story-body">
          <div className="story-quote-symbol left">“</div>
          <div className="story-text-content">
            {track.storyNote ? (
              track.storyNote.split('\n\n').map((para, idx) => (
                <p key={idx} className="story-paragraph">
                  {para}
                </p>
              ))
            ) : (
              <p className="story-paragraph">
                Bản thu âm mộc được cắm đàn thu trực tiếp vào soundcard đêm khuya, không qua chỉnh sửa cầu kỳ để giữ nguyên vẹn cảm xúc tự nhiên của tiếng đàn.
              </p>
            )}
          </div>
          <div className="story-quote-symbol right">”</div>

          {/* Hộp ghi chú bản thu mộc */}
          <div className="story-warmth-box">
            <span className="warmth-icon">🎙️</span>
            <div className="warmth-text">
              <strong>Ghi chú bản thu:</strong> Thu âm mộc trực tiếp qua soundcard, không cắt ghép hay chỉnh sửa để giữ lại độ tự nhiên và cảm xúc chân thật nhất.
            </div>
          </div>
        </div>

        {/* Footer hành động */}
        <div className="track-story-footer">
          <span className="story-footer-tip">
            ❄️ <em>Âm nhạc vẫn đang nhẹ nhàng ngân vang bên dưới...</em>
          </span>
          <button
            type="button"
            className="story-continue-btn"
            onClick={() => {
              playClickSound();
              onClose();
            }}
          >
            <span>Tiếp Tục Lắng Nghe</span>
            <i className="fa-solid fa-headphones"></i>
          </button>
        </div>
      </div>
    </div>
  );
};
