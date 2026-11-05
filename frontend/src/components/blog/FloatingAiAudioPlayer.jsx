import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  MOOD_VOICE_PRESETS,
  detectPostEmotion,
  aiVoicePlayer,
  cleanTextForSpeech,
} from '../../utils/aiVoiceEngine';
import { useAuth } from '../../context/AuthContext';
import { VoiceCloningModal } from './VoiceCloningModal';
import { playClickSound } from '../../utils/soundEffects';

export const FloatingAiAudioPlayer = () => {
  const { user } = useAuth();
  const [currentPost, setCurrentPost] = useState(null);
  const [playbackState, setPlaybackState] = useState('idle'); // 'idle' | 'playing' | 'paused'
  const [progress, setProgress] = useState(0);
  const [currentSentence, setCurrentSentence] = useState('');
  const [selectedMood, setSelectedMood] = useState('auto');
  const [speed, setSpeed] = useState(1.0);
  const [isMinimized, setIsMinimized] = useState(false);
  const [isCloningOpen, setIsCloningOpen] = useState(false);
  const [activeVoiceProfile, setActiveVoiceProfile] = useState(() => {
    try {
      const raw = localStorage.getItem('freedom_custom_voice_profile');
      if (raw) return JSON.parse(raw);
    } catch (e) {}
    return user?.customVoiceProfile || null;
  });

  // Tự động phân tích tâm trạng nội dung bài viết
  const detectedMood = useMemo(() => {
    if (!currentPost) return null;
    return detectPostEmotion(currentPost);
  }, [currentPost]);

  // Làm sạch văn bản để đọc
  const fullText = useMemo(() => {
    if (!currentPost) return '';
    const content = currentPost.content || currentPost.summary || '';
    return `${currentPost.title || ''}. ${cleanTextForSpeech(content)}`;
  }, [currentPost]);

  // Phát sóng trạng thái phát ra toàn bộ ứng dụng để các thẻ PostCard đổi icon
  const broadcastAudioState = (postId, state) => {
    window.dispatchEvent(
      new CustomEvent('freedom_ai_audio_state_change', {
        detail: {
          postId: postId || currentPost?._id || currentPost?.slug,
          state,
        },
      })
    );
  };

  // Khởi động phát âm thanh cho 1 bài viết cụ thể
  const startPlayingPost = (post, moodOverride = null) => {
    if (!post) return;
    setCurrentPost(post);
    const targetMood = moodOverride || post.audioMood || selectedMood || 'auto';
    setSelectedMood(targetMood);

    const postEmotion = detectPostEmotion(post);
    const textToRead = `${post.title || ''}. ${cleanTextForSpeech(post.content || post.summary || '')}`;

    aiVoicePlayer.play({
      text: textToRead,
      moodId: targetMood,
      speed,
      detectedMood: postEmotion,
      customVoiceProfile: activeVoiceProfile,
      onProgress: (percent, chunkIdx, chunkText) => {
        setProgress(percent);
        setCurrentSentence(chunkText);
      },
      onStateChange: (state) => {
        setPlaybackState(state);
        broadcastAudioState(post._id || post.slug, state);
      },
    });
  };

  // Lắng nghe sự kiện kích hoạt đọc từ PostCard hoặc các trang con
  useEffect(() => {
    aiVoicePlayer.initVoices();

    const handlePlayRequest = (e) => {
      const post = e.detail?.post || e.detail;
      const mood = e.detail?.moodId;
      if (post) {
        // Nếu đang phát đúng bài này thì toggle play/pause
        if (currentPost && (currentPost._id === post._id || currentPost.slug === post.slug)) {
          handleTogglePlay();
        } else {
          startPlayingPost(post, mood);
        }
      }
    };

    window.addEventListener('freedom_play_ai_post', handlePlayRequest);

    return () => {
      window.removeEventListener('freedom_play_ai_post', handlePlayRequest);
    };
  }, [currentPost, selectedMood, speed, activeVoiceProfile]);

  // Toggle Play / Pause
  const handleTogglePlay = () => {
    playClickSound();
    if (playbackState === 'playing') {
      aiVoicePlayer.pause();
      setPlaybackState('paused');
      broadcastAudioState(currentPost?._id || currentPost?.slug, 'paused');
    } else if (playbackState === 'paused') {
      aiVoicePlayer.resume(detectedMood);
      setPlaybackState('playing');
      broadcastAudioState(currentPost?._id || currentPost?.slug, 'playing');
    } else if (currentPost) {
      startPlayingPost(currentPost, selectedMood);
    }
  };

  // Dừng phát và đóng thanh phát
  const handleClose = () => {
    playClickSound();
    aiVoicePlayer.stop();
    setPlaybackState('idle');
    setProgress(0);
    setCurrentSentence('');
    broadcastAudioState(currentPost?._id || currentPost?.slug, 'idle');
    setCurrentPost(null);
  };

  // Đổi tốc độ đọc
  const handleSpeedToggle = () => {
    playClickSound();
    const speeds = [1.0, 1.25, 1.5, 0.85];
    const nextIdx = (speeds.indexOf(speed) + 1) % speeds.length;
    const nextSpeed = speeds[nextIdx];
    setSpeed(nextSpeed);
    aiVoicePlayer.setSpeed(nextSpeed, detectedMood);
  };

  // Đổi Mood giọng đọc
  const handleMoodSelect = (e) => {
    const nextMood = e.target.value;
    playClickSound();
    setSelectedMood(nextMood);
    if (currentPost && playbackState === 'playing') {
      startPlayingPost(currentPost, nextMood);
    }
  };

  // Tua tiến độ
  const handleSeek = (e) => {
    const val = Number(e.target.value);
    setProgress(val);
    aiVoicePlayer.seekTo(val, detectedMood);
  };

  // Khi chưa có bài viết nào được chọn để nghe, ẩn player
  if (!currentPost) return null;

  const currentPresetInfo = MOOD_VOICE_PRESETS.find((p) => p.id === selectedMood) || MOOD_VOICE_PRESETS[0];

  return (
    <>
      <aside
        className={`floating-ai-audio-player-bar ${isMinimized ? 'is-minimized' : ''}`}
        aria-label="Thanh nghe A.I đọc bài viết cảm xúc"
      >
        {isMinimized ? (
          /* Trạng thái Thu Gọn Tối Giản */
          <div className="mini-audio-pill-wrap" onClick={() => setIsMinimized(false)}>
            <span className="mini-pulse-icon">{playbackState === 'playing' ? '🔊' : '⏸'}</span>
            <span className="mini-post-title">{currentPost.title}</span>
            <button
              type="button"
              className="mini-play-toggle"
              onClick={(e) => {
                e.stopPropagation();
                handleTogglePlay();
              }}
            >
              {playbackState === 'playing' ? '⏸' : '▶'}
            </button>
            <button
              type="button"
              className="mini-expand-btn"
              onClick={(e) => {
                e.stopPropagation();
                setIsMinimized(false);
              }}
              title="Mở rộng bảng điều khiển"
            >
              ⤢
            </button>
          </div>
        ) : (
          /* Trạng thái Mở Rộng Đầy Đủ */
          <div className="floating-audio-card">
            {/* Thanh tiến trình siêu mảnh trên đỉnh */}
            <div className="floating-audio-progress-bar-wrap">
              <input
                type="range"
                min="0"
                max="100"
                value={progress}
                onChange={handleSeek}
                className="floating-audio-progress-range"
                title={`Tiến trình đọc: ${progress}%`}
              />
              <div
                className="floating-audio-progress-fill"
                style={{ width: `${progress}%`, background: currentPresetInfo.color || '#0d9488' }}
              />
            </div>

            <div className="floating-audio-inner">
              {/* Cụm 1: Thông tin bài viết & Ảnh bìa */}
              <div className="floating-audio-meta-col">
                <img
                  src={currentPost.coverImage || '/images/sun.jpg'}
                  alt={currentPost.title}
                  className="floating-audio-thumb"
                />
                <div className="floating-audio-text-group">
                  <div className="floating-audio-tag-row">
                    <span className="audio-live-pill">
                      {playbackState === 'playing' ? (
                        <>
                          <span className="audio-live-dot" />
                          <span>ĐANG ĐỌC A.I</span>
                        </>
                      ) : (
                        <span>TẠM DỪNG</span>
                      )}
                    </span>
                    <span className="audio-mood-detected-tag" title={detectedMood?.reason}>
                      {detectedMood?.icon} {detectedMood?.label}
                    </span>
                  </div>
                  <h4 className="floating-audio-title" title={currentPost.title}>
                    {currentPost.title}
                  </h4>
                  <div className="floating-audio-subinfo">
                    Tác giả: <strong>{currentPost.author || currentPost.user?.name || 'Trần Đình Quân'}</strong>
                  </div>
                </div>
              </div>

              {/* Cụm 2: Dòng phụ đề thời gian thực (Subtitle Ticker) */}
              <div className="floating-audio-subtitle-col">
                <div className="floating-audio-sub-marquee">
                  <span className="subtitle-quote-icon">“</span>
                  <span className="subtitle-text">
                    {currentSentence || 'A.I đang chuẩn bị giọng đọc truyền cảm cho câu chuyện này...'}
                  </span>
                  <span className="subtitle-quote-icon">”</span>
                </div>
              </div>

              {/* Cụm 3: Cụm điều khiển chính (Play/Pause, Tốc độ, Mood, Thu âm) */}
              <div className="floating-audio-actions-col">
                {/* Chọn Ngữ Điệu Cảm Xúc */}
                <div className="floating-mood-selector-wrap">
                  <select
                    value={selectedMood}
                    onChange={handleMoodSelect}
                    className="floating-mood-select"
                    title="Chọn phong cách / ngữ điệu giọng đọc A.I"
                  >
                    {MOOD_VOICE_PRESETS.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.icon} {p.shortName}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Nút Đổi Tốc Độ (0.8x, 1.0x, 1.25x, 1.5x) */}
                <button
                  type="button"
                  className="floating-speed-btn"
                  onClick={handleSpeedToggle}
                  title="Thay đổi tốc độ đọc"
                >
                  {speed}x
                </button>

                {/* Nút Play / Pause Nổi Bật */}
                <button
                  type="button"
                  className={`floating-play-btn ${playbackState === 'playing' ? 'is-playing' : ''}`}
                  onClick={handleTogglePlay}
                  title={playbackState === 'playing' ? 'Tạm dừng' : 'Tiếp tục nghe'}
                >
                  {playbackState === 'playing' ? '⏸' : '▶'}
                </button>

                {/* Nút Mở Studio Thu Âm Nhân Bản Giọng Nói */}
                <button
                  type="button"
                  className="floating-voice-clone-btn"
                  onClick={() => setIsCloningOpen(true)}
                  title="Thu âm giọng của bạn để A.I nhân bản đọc câu chuyện"
                >
                  🎙️
                </button>

                {/* Nút Thu Gọn */}
                <button
                  type="button"
                  className="floating-control-icon-btn"
                  onClick={() => setIsMinimized(true)}
                  title="Thu nhỏ thanh phát"
                >
                  ⚊
                </button>

                {/* Nút Đóng / Tắt */}
                <button
                  type="button"
                  className="floating-control-icon-btn close-btn"
                  onClick={handleClose}
                  title="Dừng và đóng thanh nghe"
                >
                  ✕
                </button>
              </div>
            </div>
          </div>
        )}
      </aside>

      {/* Modal Thu Âm Nhân Bản Giọng Nói */}
      <VoiceCloningModal
        isOpen={isCloningOpen}
        onClose={() => setIsCloningOpen(false)}
        onVoiceSaved={(profile) => {
          setActiveVoiceProfile(profile);
          setSelectedMood('custom_voice');
          if (currentPost) {
            startPlayingPost(currentPost, 'custom_voice');
          }
        }}
      />
    </>
  );
};

