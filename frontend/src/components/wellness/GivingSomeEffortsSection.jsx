import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useMusic } from '../../context/MusicContext';
import { playStarChimeSound, playWarmthSound, playClickSound } from '../../utils/soundEffects';
import { resumeAmbientAudioContext } from '../../utils/ambientSoundEngine';

const MOTIVATION_QUOTES = [
  {
    quote: 'Khi bạn cảm thấy muốn bỏ cuộc nhất, hãy thử cố thêm đúng 5 phút nữa. Sau 5 phút, phép màu và sự tập trung thường bắt đầu quay lại.',
    author: 'Freedom Studio • Quy tắc 5 Phút',
    tag: 'Kiên trì',
    icon: '⏳',
  },
  {
    quote: 'Không có cái cây đại thụ nào lớn lên sau một đêm. Mỗi dòng code, mỗi trang sách, mỗi bước chân thầm lặng hôm nay đều đang tạc nên bản lĩnh tương lai.',
    author: 'Small Wins Mindset',
    tag: 'Tích lũy',
    icon: '🌱',
  },
  {
    quote: 'Hôm nay bạn đã hoàn thành một việc nhỏ tử tế, hay chỉ đơn giản là đã vượt qua một ngày khó khăn. Như thế đã là một chiến thắng rực rỡ rồi!',
    author: 'You Can\'t Stop Here',
    tag: 'Tự hào',
    icon: '✨',
  },
  {
    quote: 'Bạn không cần phải hoàn hảo, bạn chỉ cần không dừng lại. Có thể chậm rãi nghỉ ngơi, nhưng ngọn lửa trong tim nhất định phải giữ ấm.',
    author: 'Healing Note',
    tag: 'Bình yên',
    icon: '🔥',
  },
  {
    quote: 'Năng lượng có thể vơi đi sau deadline và áp lực, nhưng từng nhịp cố gắng chân thành sẽ luôn đưa bạn về đích an toàn.',
    author: 'Office Resilience',
    tag: 'Vững vàng',
    icon: '🧭',
  },
  {
    quote: 'Hãy hít sâu một hơi, thả lỏng đôi vai, uống một ngụm nước ấm và cho bản thân một cái ôm ghi nhận. Bạn đã rất nỗ lực rồi!',
    author: 'Góc Tự Vỗ Về',
    tag: 'Yêu thương',
    icon: '☕',
  },
];

const CHEER_MESSAGES = [
  '✨ +1 Nỗ lực nhỏ được ghi nhận! Bạn làm rất tốt!',
  '🌟 Đã tiếp thêm năng lượng! Vững bước qua ngày dài nhé!',
  '💪 Thêm một bước chân bền bỉ trên hành trình của bạn!',
  '☕ Thả lỏng vai một chút và tiếp tục tỏa sáng nào!',
  '🌱 Mỗi cố gắng hôm nay đều đang đơm hoa kết trái!',
];

// Cột mốc vinh danh nỗ lực cá nhân
const EFFORT_MILESTONES = {
  10: { badge: '🌱 Hạt Mầm Bền Bỉ', msg: '🌱 Chúc mừng bạn đạt mốc 10 nỗ lực! Hạt mầm kiên trì đã bắt đầu đâm chồi!' },
  25: { badge: '🏆 Nhịp Bước Vững Vàng', msg: '🏆 Tuyệt vời! Mốc 25 nỗ lực ghi nhận ý chí kiên định phi thường!' },
  50: { badge: '🌟 Ngọn Lửa Tiếp Sức', msg: '🌟 Mốc 50 nỗ lực! Bạn đang lan tỏa năng lượng tích cực mạnh mẽ!' },
  100: { badge: '👑 Bậc Thầy Kiên Trì', msg: '👑 Huyền thoại 100 nỗ lực! Bạn đã chứng minh sức mạnh của sự không dừng lại!' },
  200: { badge: '💎 Bản Lĩnh Thép', msg: '💎 Mốc 200 nỗ lực! Một cột mốc vàng chói lọi của sự nỗ lực không ngừng!' },
};

// Hàm lấy huy hiệu cột mốc hiện tại của người dùng
const getUserMilestoneBadge = (count) => {
  if (count >= 200) return '💎 Bản Lĩnh Thép';
  if (count >= 100) return '👑 Bậc Thầy Kiên Trì';
  if (count >= 50) return '🌟 Ngọn Lửa Tiếp Sức';
  if (count >= 25) return '🏆 Nhịp Bước Vững Vàng';
  if (count >= 10) return '🌱 Hạt Mầm Bền Bỉ';
  return null;
};

// Hàm format giây thành mm:ss an toàn chống NaN
const formatTime = (secs) => {
  if (!secs || isNaN(secs) || !isFinite(secs) || secs < 0) return '0:00';
  const m = Math.floor(secs / 60);
  const s = Math.floor(secs % 60);
  return `${m}:${s < 10 ? '0' : ''}${s}`;
};

export const GivingSomeEffortsSection = ({ compact = false, className = '' }) => {
  const {
    themeSlug,
    currentTrackIndex,
    currentTrack,
    isPlaying,
    isLoading,
    audioError,
    currentTime,
    duration,
    volume,
    isMuted,
    loopMode,
    isShuffle,
    togglePlay,
    nextTrack,
    prevTrack,
    playThemeTrack,
    seekTo,
    changeVolume,
    toggleMute,
    cycleLoopMode,
    toggleShuffle,
  } = useMusic();

  const [isExpanded, setIsExpanded] = useState(true);
  const [quoteIndex, setQuoteIndex] = useState(0);
  const [isQuoteFading, setIsQuoteFading] = useState(false);
  const [isCopied, setIsCopied] = useState(false);
  const [sparkles, setSparkles] = useState([]);
  const [cheerNotice, setCheerNotice] = useState(null);
  const [milestoneNotice, setMilestoneNotice] = useState(null);

  const cheerTimerRef = useRef(null);
  const quoteFadeTimerRef = useRef(null);
  const copyTimerRef = useRef(null);
  const milestoneTimerRef = useRef(null);
  const progressBarRef = useRef(null);

  // Số lượt nỗ lực ghi nhận (cá nhân & cộng đồng)
  const [userEfforts, setUserEfforts] = useState(() => {
    try {
      const saved = localStorage.getItem('freedom_user_effort_count');
      return saved ? parseInt(saved, 10) : 12;
    } catch (_) {
      return 12;
    }
  });

  const [communityEfforts, setCommunityEfforts] = useState(() => {
    try {
      const saved = localStorage.getItem('freedom_community_effort_count');
      return saved ? parseInt(saved, 10) : 1386;
    } catch (_) {
      return 1386;
    }
  });

  // Kiểm tra xem hiện tại có đang phát đúng bài của Giving Some Efforts hay không
  const isEffortTheme = themeSlug === 'giving-some-efforts';
  const currentEffortTrackIdx = isEffortTheme ? currentTrackIndex : -1;
  const isSong1Playing = isEffortTheme && currentTrackIndex === 0 && isPlaying;
  const isSong2Playing = isEffortTheme && currentTrackIndex === 1 && isPlaying;

  // Dọn dẹp toàn bộ timer khi unmount (Quy tắc 3 GEMINI.md)
  useEffect(() => {
    return () => {
      if (cheerTimerRef.current) {
        clearTimeout(cheerTimerRef.current);
      }
      if (quoteFadeTimerRef.current) {
        clearTimeout(quoteFadeTimerRef.current);
      }
      if (copyTimerRef.current) {
        clearTimeout(copyTimerRef.current);
      }
      if (milestoneTimerRef.current) {
        clearTimeout(milestoneTimerRef.current);
      }
    };
  }, []);

  // Chuyển câu truyền động lực mượt mà không gây giật khựng giao diện (CLS = 0)
  const changeQuote = useCallback((nextIdx) => {
    setIsQuoteFading(true);
    if (quoteFadeTimerRef.current) clearTimeout(quoteFadeTimerRef.current);
    quoteFadeTimerRef.current = setTimeout(() => {
      setQuoteIndex(nextIdx);
      setIsQuoteFading(false);
    }, 180);
  }, []);

  // Đổi câu truyền động lực tiếp theo
  const handleNextQuote = useCallback(() => {
    playClickSound();
    changeQuote((quoteIndex + 1) % MOTIVATION_QUOTES.length);
  }, [changeQuote, quoteIndex]);

  const handlePrevQuote = useCallback(() => {
    playClickSound();
    changeQuote((quoteIndex - 1 + MOTIVATION_QUOTES.length) % MOTIVATION_QUOTES.length);
  }, [changeQuote, quoteIndex]);

  // Xử lý nút Phát / Dừng hoặc Chọn Nhịp Nhạc
  const handleSelectTrack = useCallback((trackIdx) => {
    playClickSound();
    try {
      resumeAmbientAudioContext();
    } catch (_) {}
    if (isEffortTheme && currentTrackIndex === trackIdx) {
      // Đang ở đúng bài này, bấm vào thì toggle Play / Pause
      togglePlay();
    } else {
      // Chuyển sang theme Giving Some Efforts và phát bài tương ứng
      playThemeTrack('giving-some-efforts', trackIdx);
    }
  }, [isEffortTheme, currentTrackIndex, togglePlay, playThemeTrack]);

  // Phím tắt thông minh số 1 và 2: Chuyển nhanh giữa 2 nhịp nhạc khi không gõ text
  useEffect(() => {
    const handleBeatShortcuts = (e) => {
      if (e.ctrlKey || e.altKey || e.metaKey) return;
      const target = e.target;
      if (!target) return;
      const tag = target.tagName ? target.tagName.toLowerCase() : '';
      const isInput = tag === 'input' || tag === 'textarea' || tag === 'select';
      const isEditable = target.isContentEditable || target.getAttribute?.('contenteditable') === 'true';
      const isInsideEditor = Boolean(
        target.closest?.(
          'input, textarea, select, [contenteditable="true"], .rich-editor, .ql-editor, .w-md-editor, [role="textbox"]'
        )
      );
      if (isInput || isEditable || isInsideEditor) return;

      if (e.key === '1' || e.code === 'Digit1' || e.code === 'Numpad1') {
        e.preventDefault();
        handleSelectTrack(0);
      } else if (e.key === '2' || e.code === 'Digit2' || e.code === 'Numpad2') {
        e.preventDefault();
        handleSelectTrack(1);
      }
    };

    window.addEventListener('keydown', handleBeatShortcuts);
    return () => {
      window.removeEventListener('keydown', handleBeatShortcuts);
    };
  }, [handleSelectTrack]);

  // Tua thời lượng bài hát
  const handleSeek = (e) => {
    if (!isEffortTheme || !duration || duration <= 0) return;
    const bar = progressBarRef.current;
    if (!bar) return;
    const rect = bar.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const ratio = Math.max(0, Math.min(1, clickX / rect.width));
    seekTo(ratio * duration);
  };

  // Tương tác Tiếp Thêm Năng Lượng / Ghi Nhận Nhịp Cố Gắng (+1 Effort)
  const handleGiveEffort = (e) => {
    e.stopPropagation();
    try {
      playStarChimeSound();
    } catch (_) {}

    // Rung xúc giác haptic nhẹ nhàng trên thiết bị di động hỗ trợ
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      try {
        navigator.vibrate(25);
      } catch (_) {}
    }

    const rect = e.currentTarget.getBoundingClientRect();
    const newSparkleId = Date.now() + Math.random();
    const randOffsetX = (Math.random() - 0.5) * 60;
    const randOffsetY = -20 - Math.random() * 30;

    setSparkles((prev) => [
      ...prev.slice(-6),
      { id: newSparkleId, x: randOffsetX, y: randOffsetY },
    ]);

    setTimeout(() => {
      setSparkles((prev) => prev.filter((s) => s.id !== newSparkleId));
    }, 1100);

    const nextUserCount = userEfforts + 1;
    const nextCommunityCount = communityEfforts + 1;
    setUserEfforts(nextUserCount);
    setCommunityEfforts(nextCommunityCount);

    try {
      localStorage.setItem('freedom_user_effort_count', String(nextUserCount));
      localStorage.setItem('freedom_community_effort_count', String(nextCommunityCount));
    } catch (_) {}

    // Kiểm tra và hiển thị mốc kỷ lục tiếp sức cá nhân
    const reachedMilestone = EFFORT_MILESTONES[nextUserCount];
    if (reachedMilestone) {
      setMilestoneNotice(reachedMilestone.msg);
      if (milestoneTimerRef.current) clearTimeout(milestoneTimerRef.current);
      milestoneTimerRef.current = setTimeout(() => {
        setMilestoneNotice(null);
      }, 4500);
    }

    // Thông điệp khích lệ ngẫu nhiên
    const randomMsg = CHEER_MESSAGES[Math.floor(Math.random() * CHEER_MESSAGES.length)];
    setCheerNotice(randomMsg);
    if (cheerTimerRef.current) clearTimeout(cheerTimerRef.current);
    cheerTimerRef.current = setTimeout(() => {
      setCheerNotice(null);
    }, 2800);
  };

  // Sao chép câu truyền cảm hứng kèm trích dẫn nguồn
  const handleCopyQuote = useCallback(() => {
    playClickSound();
    const textToCopy = `"${currentQuote.quote}" — ${currentQuote.author} • You Can't Stop Here`;

    const copyFallback = (text) => {
      try {
        const ta = document.createElement('textarea');
        ta.value = text;
        ta.style.position = 'fixed';
        ta.style.opacity = '0';
        ta.style.left = '-9999px';
        document.body.appendChild(ta);
        ta.select();
        document.execCommand('copy');
        document.body.removeChild(ta);
        setIsCopied(true);
      } catch (_) {}
    };

    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(textToCopy).then(() => {
        setIsCopied(true);
      }).catch(() => {
        copyFallback(textToCopy);
      });
    } else {
      copyFallback(textToCopy);
    }

    if (copyTimerRef.current) clearTimeout(copyTimerRef.current);
    copyTimerRef.current = setTimeout(() => {
      setIsCopied(false);
    }, 2000);
  }, [currentQuote]);

  const currentQuote = MOTIVATION_QUOTES[quoteIndex];
  const progressPercent = isEffortTheme && duration > 0 ? (currentTime / duration) * 100 : 0;
  const userMilestone = getUserMilestoneBadge(userEfforts);

  return (
    <section
      className={`giving-efforts-section ${isExpanded ? 'is-expanded' : 'is-collapsed'} ${className}`}
      aria-label="Khu vực truyền động lực và tiếp sức Giving Some Efforts"
    >
      <div className="efforts-card-container">
        {/* Header Module: Tiêu đề, Badge & Nút Thu Gọn */}
        <div className="efforts-header-row">
          <div className="efforts-badge-wrap">
            <span className="efforts-pill-badge">
              <span className="efforts-icon-sparkle">✨</span>
              <span>Giving Some Efforts</span>
            </span>
            <span className="efforts-subtitle-chip">
              <i className="fa-solid fa-fire-flame-curved" style={{ marginRight: '5px', color: '#f59e0b' }}></i>
              Tiếp Sức &amp; Kiên Trì
            </span>
          </div>

          <div className="efforts-header-actions">
            <button
              type="button"
              className="efforts-toggle-btn"
              onClick={() => setIsExpanded(!isExpanded)}
              title={isExpanded ? 'Thu gọn module truyền động lực' : 'Mở rộng module truyền động lực'}
              aria-expanded={isExpanded}
            >
              <i className={`fa-solid ${isExpanded ? 'fa-chevron-up' : 'fa-chevron-down'}`}></i>
              <span className="toggle-text">{isExpanded ? 'Thu gọn' : 'Mở tiếp sức'}</span>
            </button>
          </div>
        </div>

        {/* Nội Dung Chính (Khi Mở Rộng) */}
        {isExpanded && (
          <div className="efforts-body-grid">
            {/* Cột Trái: Trình Phát Âm Thanh Tiếp Sức (2 Nhịp Nhạc Studio WAV qua MusicContext) */}
            <div className="efforts-audio-player-card">
              <div className="audio-card-top">
                <div className="audio-player-meta">
                  <span className="player-label">
                    <i className="fa-solid fa-headphones" style={{ marginRight: '6px' }}></i>
                    Giai Điệu Tiếp Lửa • Freedom Studio
                  </span>
                  <h4 className="audio-now-playing-title">
                    {isEffortTheme && currentTrack ? currentTrack.title : 'Chọn nhịp nhạc để tiếp thêm năng lượng'}
                  </h4>
                </div>

                <div className="audio-wav-badge" title="Định dạng Studio WAV Master 24-bit Hi-Fi">
                  <span>HQ WAV</span>
                </div>
              </div>

              {/* Nút Chọn 2 Nhịp Nhạc (Nhịp 1: Bền Bỉ, Nhịp 2: Vươn Lên) */}
              <div className="efforts-beats-selector">
                <button
                  type="button"
                  className={`beat-select-btn ${isEffortTheme && currentEffortTrackIdx === 0 ? 'is-active' : ''}`}
                  onClick={() => handleSelectTrack(0)}
                  title="Nhịp 1: Giai điệu mộc mạc, giữ nhịp kiên trì lúc mỏi mệt (Phím tắt: 1)"
                >
                  <div className="beat-btn-icon-wrap">
                    {isSong1Playing ? (
                      <span className="beat-equalizer-bars" aria-label="Đang phát">
                        <span></span><span></span><span></span>
                      </span>
                    ) : (
                      <i className="fa-solid fa-play"></i>
                    )}
                  </div>
                  <div className="beat-btn-text">
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '6px' }}>
                      <strong className="beat-name">Nhịp 1: Bền Bỉ</strong>
                      <kbd className="beat-kbd-hint" title="Bấm phím 1 để chọn nhanh">1</kbd>
                    </div>
                    <span className="beat-desc">Song 1E • Vững bước qua deadline</span>
                  </div>
                </button>

                <button
                  type="button"
                  className={`beat-select-btn ${isEffortTheme && currentEffortTrackIdx === 1 ? 'is-active' : ''}`}
                  onClick={() => handleSelectTrack(1)}
                  title="Nhịp 2: Giai điệu tươi sáng, tiếp thêm hy vọng và năng lượng (Phím tắt: 2)"
                >
                  <div className="beat-btn-icon-wrap">
                    {isSong2Playing ? (
                      <span className="beat-equalizer-bars" aria-label="Đang phát">
                        <span></span><span></span><span></span>
                      </span>
                    ) : (
                      <i className="fa-solid fa-play"></i>
                    )}
                  </div>
                  <div className="beat-btn-text">
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '6px' }}>
                      <strong className="beat-name">Nhịp 2: Vươn Lên</strong>
                      <kbd className="beat-kbd-hint" title="Bấm phím 2 để chọn nhanh">2</kbd>
                    </div>
                    <span className="beat-desc">Song 2E • Ánh sáng cuối con đường</span>
                  </div>
                </button>
              </div>

              {/* Thông báo lỗi âm thanh nếu có */}
              {audioError && isEffortTheme && (
                <div
                  className="efforts-audio-error-banner"
                  style={{
                    padding: '8px 12px',
                    borderRadius: '10px',
                    background: 'rgba(239, 68, 68, 0.15)',
                    border: '1px solid rgba(239, 68, 68, 0.35)',
                    color: '#fca5a5',
                    fontSize: '0.76rem',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '8px',
                  }}
                >
                  <span>⚠️ {audioError}</span>
                  <button
                    type="button"
                    onClick={() => handleSelectTrack(currentEffortTrackIdx >= 0 ? currentEffortTrackIdx : 0)}
                    style={{
                      background: 'rgba(239, 68, 68, 0.25)',
                      border: '1px solid #f87171',
                      color: '#ffffff',
                      borderRadius: '6px',
                      padding: '2px 8px',
                      fontSize: '0.72rem',
                      cursor: 'pointer',
                      fontWeight: 700,
                    }}
                  >
                    Thử lại
                  </button>
                </div>
              )}

              {/* Thanh Tua Thời Lượng Bài Hát Tương Tác Trực Tiếp (Interactive Seekbar) */}
              <div
                className="efforts-progress-wrap no-swipe"
                onPointerDown={(e) => e.stopPropagation()}
              >
                <div className="efforts-progress-times">
                  <span className="time-text current">{isEffortTheme ? formatTime(currentTime) : '0:00'}</span>
                  <span className="time-text total">
                    {isLoading && isEffortTheme ? (
                      <span className="loading-dots">Đang tải...</span>
                    ) : isEffortTheme && duration > 0 ? (
                      formatTime(duration)
                    ) : (
                      '--:--'
                    )}
                  </span>
                </div>

                <div className="efforts-seekbar-container">
                  <input
                    type="range"
                    min={0}
                    max={duration || 100}
                    step={0.5}
                    value={currentTime}
                    onChange={(e) => {
                      if (isEffortTheme && duration > 0) {
                        seekTo(parseFloat(e.target.value));
                      }
                    }}
                    className="efforts-seekbar-input"
                    aria-label="Thanh tua bài hát"
                    disabled={!isEffortTheme || duration <= 0}
                  />
                  <div
                    className="efforts-seekbar-fill"
                    style={{ width: `${progressPercent}%` }}
                  />
                </div>
              </div>

              {/* Cụm Nút Điều Khiển Phát Nhạc Đầy Đủ (Shuffle, Prev, Play/Pause, Next, Loop) */}
              <div
                className="efforts-controls-suite no-swipe"
                onPointerDown={(e) => e.stopPropagation()}
              >
                {/* Nút ngẫu nhiên (Shuffle) */}
                <button
                  type="button"
                  className={`effort-ctrl-btn secondary ${isShuffle ? 'is-active' : ''}`}
                  onClick={() => {
                    playClickSound();
                    toggleShuffle();
                  }}
                  title={isShuffle ? 'Tắt phát ngẫu nhiên' : 'Bật phát ngẫu nhiên'}
                  aria-label="Phát ngẫu nhiên"
                >
                  <i className="fa-solid fa-shuffle"></i>
                </button>

                {/* Nút nhịp trước (Prev) */}
                <button
                  type="button"
                  className="effort-ctrl-btn nav"
                  onClick={() => {
                    playClickSound();
                    prevTrack();
                  }}
                  title="Nhịp trước"
                  aria-label="Bài trước"
                >
                  <i className="fa-solid fa-backward-step"></i>
                </button>

                {/* Nút Phát / Tạm dừng Trung Tâm Lớn */}
                <button
                  type="button"
                  className={`effort-ctrl-btn master-play ${isPlaying && isEffortTheme ? 'is-playing' : ''}`}
                  onClick={() => {
                    playClickSound();
                    if (!isEffortTheme) {
                      playThemeTrack('giving-some-efforts', 0);
                    } else {
                      togglePlay();
                    }
                  }}
                  title={isPlaying && isEffortTheme ? 'Tạm dừng (Space)' : 'Phát nhạc (Space)'}
                  aria-label="Phát hoặc tạm dừng"
                >
                  {isLoading && isEffortTheme ? (
                    <i className="fa-solid fa-circle-notch fa-spin"></i>
                  ) : isPlaying && isEffortTheme ? (
                    <i className="fa-solid fa-pause"></i>
                  ) : (
                    <i className="fa-solid fa-play" style={{ marginLeft: '3px' }}></i>
                  )}
                </button>

                {/* Nút nhịp tiếp theo (Next) */}
                <button
                  type="button"
                  className="effort-ctrl-btn nav"
                  onClick={() => {
                    playClickSound();
                    nextTrack();
                  }}
                  title="Nhịp tiếp theo"
                  aria-label="Bài tiếp theo"
                >
                  <i className="fa-solid fa-forward-step"></i>
                </button>

                {/* Nút chế độ lặp lại (Loop) */}
                <button
                  type="button"
                  className={`effort-ctrl-btn secondary ${loopMode !== 'none' ? 'is-active' : ''}`}
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
                  aria-label="Chế độ lặp lại"
                >
                  {loopMode === 'one' ? (
                    <span style={{ fontSize: '0.82rem', fontWeight: 800 }}>1🔂</span>
                  ) : (
                    <i className="fa-solid fa-repeat"></i>
                  )}
                </button>
              </div>

              {/* Thanh Điều Chỉnh Âm Lượng & Mute Đồng Bộ MusicContext */}
              <div
                className="efforts-volume-suite no-swipe"
                onPointerDown={(e) => e.stopPropagation()}
              >
                <button
                  type="button"
                  className="efforts-volume-mute-btn"
                  onClick={() => {
                    playClickSound();
                    toggleMute();
                  }}
                  title={isMuted ? 'Bật âm thanh (M)' : 'Tắt tiếng (M)'}
                  aria-label="Bật hoặc tắt tiếng"
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

                <div className="efforts-volume-slider-wrapper">
                  <input
                    type="range"
                    min={0}
                    max={1}
                    step={0.01}
                    value={isMuted ? 0 : volume}
                    onChange={(e) => changeVolume(parseFloat(e.target.value))}
                    className="efforts-volume-input"
                    aria-label="Thanh chỉnh âm lượng"
                  />
                  <div
                    className="efforts-volume-fill"
                    style={{ width: `${(isMuted ? 0 : volume) * 100}%` }}
                  />
                </div>

                <span className="efforts-volume-percent">
                  {isMuted ? '0%' : `${Math.round(volume * 100)}%`}
                </span>
              </div>
            </div>

            {/* Cột Phải: Bộ Luân Chuyển Thông Điệp & Tương Tác Ghi Nhận Cố Gắng (+1 Effort) */}
            <div className="efforts-interactive-card">
              {/* Carousel Thông Điệp Động Lực */}
              <div className="quote-display-card">
                <div className="quote-card-header">
                  <div className="quote-header-left">
                    <span className="quote-category-tag">
                      {currentQuote.icon} {currentQuote.tag}
                    </span>
                    <button
                      type="button"
                      className={`quote-copy-btn ${isCopied ? 'is-copied' : ''}`}
                      onClick={handleCopyQuote}
                      title={isCopied ? 'Đã sao chép câu truyền cảm hứng!' : 'Sao chép câu truyền cảm hứng này'}
                      aria-label="Sao chép câu truyền cảm hứng"
                    >
                      <i className={`fa-solid ${isCopied ? 'fa-check' : 'fa-copy'}`}></i>
                      <span className="copy-label">{isCopied ? 'Đã chép' : 'Sao chép'}</span>
                    </button>
                  </div>
                  <div className="quote-nav-controls">
                    <button
                      type="button"
                      className="quote-nav-btn"
                      onClick={handlePrevQuote}
                      title="Câu truyền cảm hứng trước"
                      aria-label="Câu trước"
                    >
                      <i className="fa-solid fa-arrow-left"></i>
                    </button>
                    <span className="quote-pagination-index">
                      {quoteIndex + 1}/{MOTIVATION_QUOTES.length}
                    </span>
                    <button
                      type="button"
                      className="quote-nav-btn"
                      onClick={handleNextQuote}
                      title="Câu truyền cảm hứng tiếp theo"
                      aria-label="Câu tiếp"
                    >
                      <i className="fa-solid fa-arrow-right"></i>
                    </button>
                  </div>
                </div>

                <blockquote
                  className={`quote-content-text ${isQuoteFading ? 'is-fading' : ''}`}
                  aria-live="polite"
                >
                  "{currentQuote.quote}"
                </blockquote>
                <div className="quote-author-name">
                  — {currentQuote.author}
                </div>
              </div>

              {/* Tương Tác: Tiếp Sức & Ghi Nhận Nhịp Cố Gắng */}
              <div className="effort-action-panel">
                <div className="effort-counters">
                  <div className="counter-item user-counter" title="Số nhịp nỗ lực bạn đã ghi nhận">
                    <span className="counter-label">Nỗ lực của bạn:</span>
                    <strong className="counter-num">{userEfforts}</strong>
                    {userMilestone && (
                      <span className="user-milestone-pill" title="Cột mốc danh dự bạn đã chinh phục">
                        {userMilestone}
                      </span>
                    )}
                  </div>
                  <div className="counter-divider">|</div>
                  <div className="counter-item community-counter" title="Tổng nỗ lực cộng đồng đã cùng nhau tiếp sức">
                    <span className="counter-label">Cộng đồng:</span>
                    <strong className="counter-num">{communityEfforts}</strong>
                  </div>
                </div>

                <div className="effort-button-container">
                  <button
                    type="button"
                    className="give-effort-btn"
                    onClick={handleGiveEffort}
                    title="Ghi nhận thêm 1 nỗ lực nhỏ của bạn hôm nay (+1)"
                  >
                    <span className="btn-icon">⚡</span>
                    <span className="btn-label">Tiếp thêm 1 nhịp cố gắng (+1)</span>
                    <span className="btn-sparkle-glow"></span>
                  </button>

                  {/* Hiệu ứng hạt sáng bay lên khi click */}
                  {sparkles.map((sp) => (
                    <span
                      key={sp.id}
                      className="floating-effort-sparkle"
                      style={{
                        transform: `translate(${sp.x}px, ${sp.y}px)`,
                      }}
                      aria-hidden="true"
                    >
                      +1 ✨
                    </span>
                  ))}
                </div>

                {/* Thông Báo Mốc Kỷ Lục Tiếp Sức */}
                {milestoneNotice && (
                  <div className="effort-milestone-toast" role="status" aria-live="polite">
                    {milestoneNotice}
                  </div>
                )}

                {/* Thông Báo Khích Lệ Nhẹ Nhàng */}
                {cheerNotice && !milestoneNotice && (
                  <div className="effort-cheer-toast" role="status" aria-live="polite">
                    {cheerNotice}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </section>
  );
};

export default GivingSomeEffortsSection;
