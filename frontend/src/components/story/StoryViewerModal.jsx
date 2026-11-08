import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../context/AuthContext';
import { storyService } from '../../services/storyService';
import { playClickSound } from '../../utils/soundEffects';
import { playStoryPresetSound, stopStoryMusic } from '../../utils/storyAudioEngine';

const STORY_GRADIENTS_MAP = {
  sunset: 'linear-gradient(135deg, #f97316 0%, #ec4899 50%, #8b5cf6 100%)',
  midnight: 'linear-gradient(135deg, #0f172a 0%, #1e1b4b 50%, #312e81 100%)',
  emerald: 'linear-gradient(135deg, #065f46 0%, #0d9488 50%, #059669 100%)',
  lavender: 'linear-gradient(135deg, #6366f1 0%, #a855f7 50%, #d946ef 100%)',
  warm: 'linear-gradient(135deg, #fbbf24 0%, #f59e0b 50%, #d97706 100%)',
};

export const StoryViewerModal = ({ isOpen, onClose, initialIndex = 0, stories = [], onEditStory }) => {
  const { user } = useAuth();
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [isPaused, setIsPaused] = useState(false);
  const [progress, setProgress] = useState(0);
  const [isMuted, setIsMuted] = useState(false);

  // Trạng thái bình luận / Gửi tin nhắn trực tiếp cho Story (Direct Message)
  const [replyText, setReplyText] = useState('');
  const [isSendingReply, setIsSendingReply] = useState(false);
  const [sentFeedback, setSentFeedback] = useState('');
  const [showRepliesDrawer, setShowRepliesDrawer] = useState(false);

  const QUICK_REACTIONS = ['❤️', '🔥', '👏', '😂', '😮', '😢'];

  const audioRef = useRef(null);
  const videoRef = useRef(null);
  const timerRef = useRef(null);
  const STORY_DURATION = 6500; // 6.5 giây mỗi story

  useEffect(() => {
    if (isOpen) {
      setCurrentIndex(initialIndex);
      setProgress(0);
      setIsPaused(false);
      setReplyText('');
      setShowRepliesDrawer(false);
    } else {
      stopStoryMusic();
    }

    return () => {
      stopStoryMusic();
    };
  }, [isOpen, initialIndex]);

  useEffect(() => {
    setReplyText('');
    setShowRepliesDrawer(false);
  }, [currentIndex]);

  const currentStory = stories[currentIndex] || null;

  // Xử lý đếm tiến trình tự động chuyển story
  useEffect(() => {
    if (!isOpen || !currentStory || isPaused) return;

    const intervalTime = 50;
    const step = (intervalTime / STORY_DURATION) * 100;

    timerRef.current = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          handleNext();
          return 0;
        }
        return prev + step;
      });
    }, intervalTime);

    return () => clearInterval(timerRef.current);
  }, [isOpen, currentIndex, isPaused, stories.length]);

  // Xử lý phát nhạc cho story (Kết hợp Audio Element & Web Audio API fallback)
  useEffect(() => {
    if (!isOpen || !currentStory) {
      stopStoryMusic();
      return;
    }

    const musicKey = currentStory.musicTitle || 'lofi';

    if (isMuted) {
      stopStoryMusic();
      if (audioRef.current) audioRef.current.pause();
      return;
    }

    if (isPaused) {
      stopStoryMusic();
      if (audioRef.current) audioRef.current.pause();
      return;
    }

    // Thử phát bằng thẻ Audio trước, nếu lỗi hoặc không có sẽ fallback sang Web Audio API
    if (audioRef.current && currentStory.musicUrl) {
      audioRef.current
        .play()
        .then(() => {
          // Audio thẻ html chạy được
        })
        .catch(() => {
          // Trình duyệt chặn hoặc lỗi CORS -> Khởi chạy Web Audio API Synthesizer
          playStoryPresetSound(musicKey, 0.55);
        });
    } else if (currentStory.musicTitle) {
      playStoryPresetSound(musicKey, 0.55);
    }

    return () => {
      stopStoryMusic();
    };
  }, [isOpen, currentIndex, isPaused, isMuted, currentStory?.musicUrl, currentStory?.musicTitle]);

  // Điều khiển Video play / pause theo trạng thái Story
  useEffect(() => {
    if (videoRef.current) {
      if (isPaused) {
        videoRef.current.pause();
      } else {
        videoRef.current.play().catch(() => {});
      }
    }
  }, [isPaused, currentIndex]);

  // Lắng nghe phím tắt bàn phím (Mũi tên Trái / Phải, Phím Space, Phím Escape)
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e) => {
      // Khi đang gõ tin nhắn trong ô input thì không kích hoạt phím tắt chuyển story / pause
      if (e.target && (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA')) {
        return;
      }

      if (e.key === 'ArrowRight') {
        e.preventDefault();
        handleNext();
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        handlePrev();
      } else if (e.key === ' ' || e.code === 'Space') {
        e.preventDefault();
        togglePause();
      } else if (e.key === 'Escape') {
        e.preventDefault();
        handleModalClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, currentIndex, isPaused, stories.length]);

  const handleNext = () => {
    playClickSound();
    if (currentIndex < stories.length - 1) {
      setCurrentIndex((prev) => prev + 1);
      setProgress(0);
    } else {
      handleModalClose();
    }
  };

  const handlePrev = () => {
    playClickSound();
    if (currentIndex > 0) {
      setCurrentIndex((prev) => prev - 1);
      setProgress(0);
    }
  };

  const togglePause = () => {
    playClickSound();
    setIsPaused((prev) => !prev);
  };

  const toggleMute = () => {
    playClickSound();
    setIsMuted((prev) => !prev);
  };

  const handleModalClose = () => {
    stopStoryMusic();
    onClose();
  };

  const handleDeleteStory = async () => {
    if (!currentStory) return;
    const confirmDelete = window.confirm('Bạn có chắc chắn muốn xóa vĩnh viễn Story này không?');
    if (!confirmDelete) return;

    try {
      await storyService.deleteStory(currentStory._id);
      window.dispatchEvent(new Event('freedom_story_updated'));
      if (stories.length <= 1) {
        handleModalClose();
      } else {
        handleNext();
      }
    } catch (err) {
      alert(`Lỗi xóa story: ${err.message}`);
    }
  };

  const handleEditClick = () => {
    if (onEditStory && currentStory) {
      handleModalClose();
      onEditStory(currentStory);
    }
  };

  // Gửi phản hồi / tin nhắn trực tiếp cho tác giả Story (DM Reply)
  const handleSendReply = async (customEmoji = null) => {
    const textToSend = customEmoji || replyText.trim();
    if (!textToSend || !currentStory) return;
    if (!user) {
      alert('Vui lòng đăng nhập để gửi tin nhắn phản hồi Story!');
      return;
    }

    setIsSendingReply(true);
    playClickSound();

    try {
      const res = await storyService.replyToStory(currentStory._id, {
        message: customEmoji ? '' : textToSend,
        reactionEmoji: customEmoji || '',
      });

      if (res?.data) {
        currentStory.replies = currentStory.replies || [];
        currentStory.replies.push(res.data);
      }

      setReplyText('');
      setSentFeedback(customEmoji ? `Đã gửi ${customEmoji} cho ${currentStory.userName}!` : `Đã gửi tin nhắn cho ${currentStory.userName}!`);
      setTimeout(() => setSentFeedback(''), 3000);
      setIsPaused(false);
    } catch (err) {
      alert(err.message || 'Lỗi gửi tin nhắn phản hồi story');
    } finally {
      setIsSendingReply(false);
    }
  };

  if (!isOpen || !currentStory) return null;

  const isOwner = user && (String(user._id) === String(currentStory.userId) || user.role === 'admin');
  const bgCss = STORY_GRADIENTS_MAP[currentStory.bgGradient] || STORY_GRADIENTS_MAP.sunset;

  // Tính thời gian còn lại trước khi hết 24h
  const expiresAt = new Date(currentStory.expiresAt).getTime();
  const hoursLeft = Math.max(1, Math.round((expiresAt - Date.now()) / (1000 * 60 * 60)));

  const isVideoStory =
    currentStory.mediaType === 'video' ||
    (currentStory.mediaUrl && currentStory.mediaUrl.match(/\.(mp4|webm|mov|ogg|m4v)$/i)) ||
    (currentStory.mediaUrl && currentStory.mediaUrl.startsWith('data:video/'));

  return (
    <div
      className="modal-backdrop story-viewer-backdrop"
      onClick={handleModalClose}
      style={{
        zIndex: 100000,
        position: 'fixed',
        inset: 0,
        width: '100vw',
        height: '100vh',
        background: 'rgba(0, 0, 0, 0.94)',
        backdropFilter: 'blur(12px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      {/* Thẻ audio dự phòng (nếu link mp3 hoạt động được) */}
      {currentStory.musicUrl && (
        <audio
          ref={audioRef}
          src={currentStory.musicUrl}
          loop
          muted={isMuted}
          preload="auto"
          onError={() => {
            // Khi thẻ audio lỗi mạng hoặc 403, tự động chuyển sang Web Audio API Synthesizer
            if (!isMuted && !isPaused) {
              playStoryPresetSound(currentStory.musicTitle || 'lofi', 0.55);
            }
          }}
        />
      )}

      {/* Bao Bọc Toàn Bộ: Nút Lùi ‹ + Khung Story + Nút Tiếp › */}
      <div className="story-viewer-wrap" onClick={(e) => e.stopPropagation()}>
        {/* Nút Lùi Về Story Trước (Previous Button) */}
        <button
          type="button"
          onClick={handlePrev}
          disabled={currentIndex === 0}
          className="story-nav-btn story-nav-btn-prev"
          title="Story trước (Phím Mũi tên Trái)"
        >
          <i className="fa-solid fa-chevron-left"></i>
        </button>

        {/* Khung Story Điện Thoại */}
        <div
          className="story-viewer-frame"
          onMouseDown={() => setIsPaused(true)}
          onMouseUp={() => setIsPaused(false)}
          onTouchStart={() => setIsPaused(true)}
          onTouchEnd={() => setIsPaused(false)}
          style={{
            width: '380px',
            height: '640px',
            maxWidth: '92vw',
            maxHeight: '90vh',
            borderRadius: '24px',
            background: currentStory.mediaUrl ? '#0f172a' : bgCss,
            position: 'relative',
            overflow: 'hidden',
            boxShadow: '0 25px 70px rgba(0, 0, 0, 0.75)',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            alignItems: 'center',
            padding: '24px',
            boxSizing: 'border-box',
            userSelect: 'none',
          }}
        >
          {/* Media Video hoặc Hình Ảnh */}
          {currentStory.mediaUrl && (
            <>
              {isVideoStory ? (
                <video
                  ref={videoRef}
                  src={currentStory.mediaUrl}
                  autoPlay
                  playsInline
                  loop
                  muted={isMuted}
                  style={{
                    position: 'absolute',
                    inset: 0,
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover',
                    zIndex: 1,
                  }}
                />
              ) : (
                <img
                  src={currentStory.mediaUrl}
                  alt="Story Media"
                  style={{
                    position: 'absolute',
                    inset: 0,
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover',
                    zIndex: 1,
                  }}
                />
              )}
              {/* Lớp phủ mờ giúp text caption luôn tương phản sắc nét */}
              <div
                style={{
                  position: 'absolute',
                  inset: 0,
                  background: 'linear-gradient(180deg, rgba(0,0,0,0.55) 0%, rgba(0,0,0,0.1) 45%, rgba(0,0,0,0.55) 100%)',
                  zIndex: 1,
                  pointerEvents: 'none',
                }}
              />
            </>
          )}

          {/* Thanh tiến trình phân đoạn ở trên cùng (Instagram / Facebook Stories style) */}
          <div
            style={{
              position: 'absolute',
              top: '12px',
              left: '14px',
              right: '14px',
              display: 'flex',
              gap: '5px',
              zIndex: 10,
            }}
          >
            {stories.map((s, idx) => (
              <div
                key={s._id || idx}
                style={{
                  flex: 1,
                  height: '3.5px',
                  background: 'rgba(255, 255, 255, 0.35)',
                  borderRadius: '2px',
                  overflow: 'hidden',
                }}
              >
                <div
                  style={{
                    height: '100%',
                    background: '#ffffff',
                    width: idx < currentIndex ? '100%' : idx === currentIndex ? `${progress}%` : '0%',
                    transition: idx === currentIndex ? 'width 0.05s linear' : 'none',
                  }}
                />
              </div>
            ))}
          </div>

          {/* Thanh thông tin tác giả & các nút điều khiển (Góc trên) */}
          <div
            style={{
              position: 'absolute',
              top: '24px',
              left: '16px',
              right: '16px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              zIndex: 10,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '9px' }}>
              <img
                src={currentStory.userAvatar || '/images/man.jpg'}
                alt={currentStory.userName}
                style={{
                  width: '38px',
                  height: '38px',
                  borderRadius: '50%',
                  objectFit: 'cover',
                  border: '2px solid #ffffff',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.4)',
                }}
              />
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <strong style={{ color: '#ffffff', fontSize: '0.88rem', textShadow: '0 1px 4px rgba(0,0,0,0.6)' }}>
                    {currentStory.userName}
                  </strong>
                  <span style={{ color: 'rgba(255,255,255,0.8)', fontSize: '0.72rem' }}>
                    • {hoursLeft}h
                  </span>
                </div>
                {currentStory.musicTitle && (
                  <div
                    style={{
                      color: 'rgba(255,255,255,0.92)',
                      fontSize: '0.72rem',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '5px',
                    }}
                  >
                    <i className="fa-solid fa-music"></i>
                    <span style={{ maxWidth: '130px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {currentStory.musicTitle}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Cụm nút công cụ: Pause/Play, Bật/Tắt Âm Thanh, Sửa, Xóa, Đóng */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              {/* Nút Pause / Play */}
              <button
                type="button"
                onClick={togglePause}
                style={{
                  background: isPaused ? 'rgba(236, 72, 153, 0.7)' : 'rgba(0,0,0,0.45)',
                  border: '1px solid rgba(255,255,255,0.3)',
                  borderRadius: '50%',
                  width: '32px',
                  height: '32px',
                  color: '#ffffff',
                  cursor: 'pointer',
                  fontSize: '0.86rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  backdropFilter: 'blur(6px)',
                  transition: 'all 0.2s ease',
                }}
                title={isPaused ? 'Tiếp tục xem (Phím Space)' : 'Tạm dừng Story (Phím Space)'}
              >
                {isPaused ? <i className="fa-solid fa-play"></i> : <i className="fa-solid fa-pause"></i>}
              </button>

              {/* Nút Tắt / Bật Âm Thanh */}
              <button
                type="button"
                onClick={toggleMute}
                style={{
                  background: isMuted ? 'rgba(239, 68, 68, 0.7)' : 'rgba(0,0,0,0.45)',
                  border: '1px solid rgba(255,255,255,0.3)',
                  borderRadius: '50%',
                  width: '32px',
                  height: '32px',
                  color: '#ffffff',
                  cursor: 'pointer',
                  fontSize: '0.86rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  backdropFilter: 'blur(6px)',
                }}
                title={isMuted ? 'Bật âm thanh' : 'Tắt tiếng'}
              >
                {isMuted ? <i className="fa-solid fa-volume-xmark"></i> : <i className="fa-solid fa-volume-high"></i>}
              </button>

              {/* Nút Sửa (Owner / Admin) */}
              {isOwner && (
                <>
                  <button
                    type="button"
                    onClick={handleEditClick}
                    style={{
                      background: 'rgba(0,0,0,0.45)',
                      border: '1px solid rgba(255,255,255,0.3)',
                      borderRadius: '50%',
                      width: '32px',
                      height: '32px',
                      color: '#ffffff',
                      cursor: 'pointer',
                      fontSize: '0.86rem',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                    title="Chỉnh sửa Story này"
                  >
                    <i className="fa-solid fa-pen"></i>
                  </button>
                  <button
                    type="button"
                    onClick={handleDeleteStory}
                    style={{
                      background: 'rgba(220,38,38,0.7)',
                      border: '1px solid rgba(255,255,255,0.3)',
                      borderRadius: '50%',
                      width: '32px',
                      height: '32px',
                      color: '#ffffff',
                      cursor: 'pointer',
                      fontSize: '0.86rem',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                    title="Xóa Story này"
                  >
                    <i className="fa-solid fa-trash-can"></i>
                  </button>
                </>
              )}

              {/* Nút Đóng */}
              <button
                type="button"
                onClick={handleModalClose}
                style={{
                  background: 'rgba(0,0,0,0.5)',
                  border: '1px solid rgba(255,255,255,0.3)',
                  borderRadius: '50%',
                  width: '32px',
                  height: '32px',
                  color: '#ffffff',
                  cursor: 'pointer',
                  fontSize: '0.95rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
                title="Đóng (Phím Esc)"
              >
                <i className="fa-solid fa-xmark"></i>
              </button>
            </div>
          </div>

          {/* VÙNG CHẠM ĐỂ CHUYỂN STORY (TAP LEFT / RIGHT) */}
          <div
            onClick={handlePrev}
            style={{
              position: 'absolute',
              top: '60px',
              bottom: '100px',
              left: 0,
              width: '35%',
              zIndex: 5,
              cursor: 'pointer',
            }}
            title="Chạm để xem Story trước"
          />
          <div
            onClick={handleNext}
            style={{
              position: 'absolute',
              top: '60px',
              bottom: '100px',
              right: 0,
              width: '65%',
              zIndex: 5,
              cursor: 'pointer',
            }}
            title="Chạm để xem Story tiếp theo"
          />

          {/* Nội dung chữ của Story */}
          {currentStory.content && (
            <div
              style={{
                color: '#ffffff',
                fontSize: currentStory.content.length > 150 ? '1.02rem' : currentStory.content.length > 80 ? '1.22rem' : '1.45rem',
                fontWeight: 800,
                textAlign: 'center',
                lineHeight: 1.55,
                textShadow: '0 2px 12px rgba(0, 0, 0, 0.75)',
                zIndex: 2,
                maxHeight: '380px',
                overflowY: 'auto',
                padding: '0 12px',
                wordBreak: 'break-word',
                pointerEvents: 'none',
              }}
            >
              {currentStory.content}
            </div>
          )}

          {/* Canvas vẽ tay đè lên trên */}
          {currentStory.drawingData && (
            <img
              src={currentStory.drawingData}
              alt="Nét vẽ Story"
              style={{
                position: 'absolute',
                inset: 0,
                width: '100%',
                height: '100%',
                objectFit: 'contain',
                zIndex: 3,
                pointerEvents: 'none',
              }}
            />
          )}

          {/* Thông Báo Gửi Tin Nhắn Phản Hồi Thành Công */}
          {sentFeedback && (
            <div
              style={{
                position: 'absolute',
                bottom: '105px',
                left: '50%',
                transform: 'translateX(-50%)',
                background: 'rgba(13, 148, 136, 0.95)',
                color: '#ffffff',
                padding: '7px 18px',
                borderRadius: '999px',
                fontSize: '0.82rem',
                fontWeight: 700,
                zIndex: 35,
                boxShadow: '0 6px 18px rgba(0, 0, 0, 0.5)',
                whiteSpace: 'nowrap',
                backdropFilter: 'blur(8px)',
              }}
            >
              ✓ {sentFeedback}
            </div>
          )}

          {/* Chỉ báo trạng thái đang tạm dừng */}
          {isPaused && !replyText && (
            <div
              style={{
                position: 'absolute',
                bottom: isOwner ? '60px' : '96px',
                background: 'rgba(0,0,0,0.65)',
                backdropFilter: 'blur(8px)',
                border: '1px solid rgba(255,255,255,0.2)',
                color: '#ffffff',
                borderRadius: '999px',
                padding: '5px 14px',
                fontSize: '0.74rem',
                fontWeight: 700,
                zIndex: 10,
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
              }}
            >
              <i className="fa-solid fa-pause"></i>
              <span>Đang tạm dừng &bull; Bấm Space để tiếp tục</span>
            </div>
          )}

          {/* THANH BÌNH LUẬN DẠNG GỬI TIN NHẮN (STORY DIRECT MESSAGE REPLY BAR) */}
          <div
            className="story-reply-container"
            onClick={(e) => e.stopPropagation()}
            onMouseDown={(e) => e.stopPropagation()}
            onTouchStart={(e) => e.stopPropagation()}
            style={{
              position: 'absolute',
              bottom: '12px',
              left: '12px',
              right: '12px',
              zIndex: 25,
            }}
          >
            {!isOwner ? (
              <>
                {/* Dải Cảm Xúc Nhanh (Quick Reaction Emojis) */}
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px',
                    marginBottom: '8px',
                  }}
                >
                  {QUICK_REACTIONS.map((emoji) => (
                    <button
                      key={emoji}
                      type="button"
                      onClick={() => handleSendReply(emoji)}
                      style={{
                        background: 'rgba(0, 0, 0, 0.5)',
                        border: '1px solid rgba(255, 255, 255, 0.22)',
                        borderRadius: '50%',
                        width: '32px',
                        height: '32px',
                        fontSize: '1.05rem',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        backdropFilter: 'blur(6px)',
                        transition: 'transform 0.15s ease',
                      }}
                      title={`Gửi biểu tượng ${emoji} cho ${currentStory.userName}`}
                    >
                      {emoji}
                    </button>
                  ))}
                </div>

                {/* Ô Nhập Tin Nhắn Phản Hồi Story */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <input
                    type="text"
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                    onFocus={() => setIsPaused(true)}
                    onBlur={() => {
                      if (!replyText) setIsPaused(false);
                    }}
                    onKeyDown={(e) => {
                      e.stopPropagation();
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleSendReply();
                      }
                    }}
                    placeholder={`Gửi tin nhắn cho ${currentStory.userName}...`}
                    style={{
                      flex: 1,
                      background: 'rgba(15, 23, 42, 0.75)',
                      border: '1.5px solid rgba(255, 255, 255, 0.35)',
                      borderRadius: '999px',
                      padding: '8px 16px',
                      color: '#ffffff',
                      fontSize: '0.84rem',
                      fontWeight: 600,
                      outline: 'none',
                      backdropFilter: 'blur(10px)',
                      boxShadow: '0 2px 10px rgba(0, 0, 0, 0.35)',
                      boxSizing: 'border-box',
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => handleSendReply()}
                    disabled={isSendingReply || !replyText.trim()}
                    style={{
                      background: replyText.trim()
                        ? 'linear-gradient(135deg, #0d9488 0%, #059669 100%)'
                        : 'rgba(255, 255, 255, 0.25)',
                      border: 'none',
                      borderRadius: '50%',
                      width: '36px',
                      height: '36px',
                      color: '#ffffff',
                      cursor: replyText.trim() ? 'pointer' : 'default',
                      fontSize: '0.95rem',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      transition: 'all 0.2s ease',
                      flexShrink: 0,
                      boxShadow: replyText.trim() ? '0 2px 8px rgba(13, 148, 136, 0.4)' : 'none',
                    }}
                    title="Gửi tin nhắn phản hồi"
                  >
                    <i className="fa-solid fa-paper-plane"></i>
                  </button>
                </div>
              </>
            ) : (
              /* Dành Cho Tác Giả: Xem Lượt Xem & Tin Nhắn Phản Hồi */
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  background: 'rgba(15, 23, 42, 0.8)',
                  backdropFilter: 'blur(10px)',
                  border: '1.5px solid rgba(255, 255, 255, 0.25)',
                  borderRadius: '999px',
                  padding: '7px 16px',
                  color: '#ffffff',
                  fontSize: '0.82rem',
                  fontWeight: 600,
                  boxShadow: '0 4px 14px rgba(0, 0, 0, 0.4)',
                }}
              >
                <span><i className="fa-regular fa-eye" style={{ marginRight: '6px' }}></i>{currentStory.viewsCount || 0} lượt xem</span>
                <button
                  type="button"
                  onClick={() => {
                    setIsPaused(true);
                    setShowRepliesDrawer(!showRepliesDrawer);
                  }}
                  style={{
                    background: 'rgba(45, 212, 191, 0.15)',
                    border: '1px solid #2dd4bf',
                    borderRadius: '999px',
                    color: '#2dd4bf',
                    fontWeight: 700,
                    padding: '3px 10px',
                    cursor: 'pointer',
                    fontSize: '0.78rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '5px',
                  }}
                >
                  <i className="fa-regular fa-comment-dots"></i>
                  <span>{currentStory.replies?.length || 0} tin nhắn</span>
                </button>
              </div>
            )}
          </div>

          {/* Bảng Danh Sách Tin Nhắn Phản Hồi Cho Tác Giả (Replies Drawer) */}
          {showRepliesDrawer && isOwner && (
            <div
              onClick={(e) => e.stopPropagation()}
              style={{
                position: 'absolute',
                bottom: 0,
                left: 0,
                right: 0,
                maxHeight: '340px',
                background: 'rgba(15, 23, 42, 0.96)',
                backdropFilter: 'blur(16px)',
                borderTop: '1.5px solid rgba(45, 212, 191, 0.4)',
                borderTopLeftRadius: '20px',
                borderTopRightRadius: '20px',
                padding: '16px 18px',
                zIndex: 40,
                display: 'flex',
                flexDirection: 'column',
                boxShadow: '0 -10px 30px rgba(0, 0, 0, 0.6)',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                <strong style={{ color: '#ffffff', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <i className="fa-regular fa-comment-dots"></i>
                  Tin nhắn phản hồi Story ({currentStory.replies?.length || 0})
                </strong>
                <button
                  type="button"
                  onClick={() => setShowRepliesDrawer(false)}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: '#94a3b8',
                    cursor: 'pointer',
                    fontSize: '1rem',
                  }}
                >
                  <i className="fa-solid fa-xmark"></i>
                </button>
              </div>

              <div style={{ overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {!currentStory.replies || currentStory.replies.length === 0 ? (
                  <div style={{ color: '#94a3b8', fontSize: '0.82rem', textAlign: 'center', padding: '20px 0' }}>
                    Chưa có tin nhắn phản hồi nào cho Story này.
                  </div>
                ) : (
                  currentStory.replies.map((rep) => (
                    <div
                      key={rep._id}
                      style={{
                        background: 'rgba(255, 255, 255, 0.06)',
                        border: '1px solid rgba(255, 255, 255, 0.1)',
                        borderRadius: '10px',
                        padding: '8px 12px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '10px',
                      }}
                    >
                      <img
                        src={rep.user?.avatar || '/images/man.jpg'}
                        alt={rep.user?.name}
                        style={{ width: '28px', height: '28px', borderRadius: '50%', objectFit: 'cover' }}
                      />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ color: '#2dd4bf', fontWeight: 700, fontSize: '0.78rem' }}>
                          {rep.user?.name || 'Thành viên'}
                        </div>
                        <div style={{ color: '#ffffff', fontSize: '0.82rem', wordBreak: 'break-word' }}>
                          {rep.content}
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        {/* Nút Sang Story Tiếp Theo (Next Button) */}
        <button
          type="button"
          onClick={handleNext}
          className="story-nav-btn story-nav-btn-next"
          title="Story tiếp theo (Phím Mũi tên Phải)"
        >
          <i className="fa-solid fa-chevron-right"></i>
        </button>
      </div>
    </div>
  );
};

export default StoryViewerModal;
