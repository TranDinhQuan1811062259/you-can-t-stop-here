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

export const PostAudioPlayer = ({ post }) => {
  const { user } = useAuth();

  const [playbackState, setPlaybackState] = useState('idle'); // 'idle' | 'playing' | 'paused'
  const [progress, setProgress] = useState(0);
  const [currentSentence, setCurrentSentence] = useState('');
  const [selectedMood, setSelectedMood] = useState(() => post?.audioMood || 'auto');
  const [speed, setSpeed] = useState(1.0);
  const [isCloningOpen, setIsCloningOpen] = useState(false);
  const [activeVoiceProfile, setActiveVoiceProfile] = useState(() => {
    if (post?.customVoiceProfile?.pitch) return post.customVoiceProfile;
    if (user?.customVoiceProfile?.pitch) return user.customVoiceProfile;
    try {
      const raw = localStorage.getItem('freedom_custom_voice_profile');
      if (raw) return JSON.parse(raw);
    } catch (e) {}
    return null;
  });

  // Tự động phân tích tâm trạng nội dung bài viết
  const detectedMood = useMemo(() => {
    return detectPostEmotion(post);
  }, [post]);

  // Ước tính tổng thời lượng nghe (dựa trên số lượng từ tiếng Việt: ~160 từ/phút)
  const fullText = useMemo(() => {
    if (!post) return '';
    return `${post.title || ''}. ${cleanTextForSpeech(post.content || post.summary || '')}`;
  }, [post]);

  const estimatedMinutes = useMemo(() => {
    const wordCount = fullText.split(/\s+/).filter(Boolean).length;
    return Math.max(1, Math.round(wordCount / 150));
  }, [fullText]);

  // Cleanup khi unmount hoặc đổi bài viết
  useEffect(() => {
    return () => {
      aiVoicePlayer.stop();
    };
  }, [post?._id]);

  // Khởi tạo giọng đọc trình duyệt
  useEffect(() => {
    aiVoicePlayer.initVoices();
  }, []);

  const handleTogglePlay = () => {
    playClickSound();

    if (playbackState === 'playing') {
      aiVoicePlayer.pause();
      return;
    }

    if (playbackState === 'paused') {
      aiVoicePlayer.resume(detectedMood);
      return;
    }

    // Bắt đầu đọc từ đầu
    aiVoicePlayer.play({
      text: fullText,
      moodId: selectedMood,
      speed,
      detectedMood,
      customVoiceProfile: activeVoiceProfile,
      onProgress: (percent, chunkIdx, chunkText) => {
        setProgress(percent);
        setCurrentSentence(chunkText);
      },
      onStateChange: (state) => {
        setPlaybackState(state);
      },
    });
  };

  const handleStop = () => {
    playClickSound();
    aiVoicePlayer.stop();
    setProgress(0);
    setCurrentSentence('');
  };

  const handleChangeMood = (newMood) => {
    playClickSound();
    setSelectedMood(newMood);

    // Nếu đang phát, tự động chuyển sang mood mới ngay
    if (playbackState === 'playing') {
      aiVoicePlayer.play({
        text: fullText,
        moodId: newMood,
        speed,
        detectedMood,
        customVoiceProfile: activeVoiceProfile,
        onProgress: (percent, chunkIdx, chunkText) => {
          setProgress(percent);
          setCurrentSentence(chunkText);
        },
        onStateChange: (state) => {
          setPlaybackState(state);
        },
      });
    }
  };

  const handleChangeSpeed = (newSpeed) => {
    playClickSound();
    setSpeed(newSpeed);
    aiVoicePlayer.setSpeed(newSpeed, detectedMood);
  };

  const handleSeek = (e) => {
    const val = Number(e.target.value);
    setProgress(val);
    aiVoicePlayer.seekTo(val, detectedMood);
  };

  const currentPreset = useMemo(() => {
    if (selectedMood === 'auto') {
      const match = MOOD_VOICE_PRESETS.find((p) => p.id === detectedMood.moodId);
      return {
        ...match,
        name: `✨ Tự động theo tâm trạng (Phát hiện: ${detectedMood.label})`,
      };
    }
    return MOOD_VOICE_PRESETS.find((p) => p.id === selectedMood) || MOOD_VOICE_PRESETS[0];
  }, [selectedMood, detectedMood]);

  return (
    <section className="post-audio-player-wrapper" aria-label="Trình đọc bài viết AI cảm xúc">
      <div className="post-audio-player-card">
        {/* Header thông tin tâm trạng & Giọng đọc AI */}
        <div className="audio-player-top-header">
          <div className="audio-player-brand-badge">
            <span className="audio-headphone-icon">🎧</span>
            <div className="audio-brand-meta">
              <span className="audio-brand-title">BẢN ĐỌC A.I CẢM XÚC (TEXT-TO-SPEECH)</span>
              <span className="audio-brand-subtitle">
                Tâm trạng phát hiện: <strong>{detectedMood.icon} {detectedMood.label}</strong> • Ước tính ~{estimatedMinutes} phút
              </span>
            </div>
          </div>

          {/* Nút Mở Phòng Thu Âm Nhân Bản Giọng Nói */}
          <button
            type="button"
            className="audio-voice-clone-studio-btn"
            onClick={() => setIsCloningOpen(true)}
            title="Thu âm mẫu giọng của bạn để A.I đọc bài viết bằng chính chất giọng này"
          >
            <span className="mic-icon">🎙️</span>
            <span>{activeVoiceProfile ? 'Giọng A.I của bạn ✓' : 'Thu âm giọng để AI học'}</span>
          </button>
        </div>

        {/* Khung Điều Khiển Phát Chính (Play/Pause, Thanh Tiến Trình & Visualizer) */}
        <div className="audio-player-main-controls">
          {/* Nút Play / Pause tròn nổi bật */}
          <button
            type="button"
            className={`audio-play-trigger-btn ${playbackState === 'playing' ? 'is-playing' : ''}`}
            onClick={handleTogglePlay}
            title={playbackState === 'playing' ? 'Tạm dừng đọc' : 'Bấm để nghe đọc bài viết này'}
          >
            <span className="play-icon-symbol">
              {playbackState === 'playing' ? '⏸' : '▶'}
            </span>
          </button>

          {/* Nút Dừng hẳn */}
          {playbackState !== 'idle' && (
            <button
              type="button"
              className="audio-stop-trigger-btn"
              onClick={handleStop}
              title="Dừng đọc bài viết"
            >
              ⏹
            </button>
          )}

          {/* Thanh Tiến Trình và Thời Lượng */}
          <div className="audio-timeline-wrap">
            <div className="audio-timeline-labels">
              <span className="audio-current-label">
                {playbackState === 'playing'
                  ? 'Đang đọc theo dòng cảm xúc...'
                  : playbackState === 'paused'
                  ? 'Đang tạm dừng'
                  : 'Sẵn sàng phát'}
              </span>
              <span className="audio-progress-percent">{progress}%</span>
            </div>

            <input
              type="range"
              min="0"
              max="100"
              value={progress}
              onChange={handleSeek}
              className="audio-progress-slider"
              title="Kéo để tua nhanh đoạn đọc"
            />
          </div>

          {/* Sóng Nhạc Equalizer Động Khi Đang Phát */}
          <div className={`audio-equalizer-bars ${playbackState === 'playing' ? 'active' : ''}`}>
            <span className="eq-bar bar-1" />
            <span className="eq-bar bar-2" />
            <span className="eq-bar bar-3" />
            <span className="eq-bar bar-4" />
            <span className="eq-bar bar-5" />
          </div>
        </div>

        {/* Đoạn văn đang được đọc nổi bật */}
        {currentSentence && playbackState !== 'idle' && (
          <div className="audio-reading-sentence-bubble">
            <span className="sentence-quote-icon">“</span>
            <p className="sentence-text">{currentSentence}</p>
          </div>
        )}

        {/* Thanh Tùy Biến Giọng Đọc, Tâm Trạng & Tốc Độ */}
        <div className="audio-player-custom-row">
          {/* Lựa chọn Tâm trạng & Giọng đọc */}
          <div className="audio-mood-picker">
            <label className="audio-ctrl-label">
              <span>{currentPreset.icon}</span>
              <span>Tâm trạng giọng đọc:</span>
            </label>
            <select
              value={selectedMood}
              onChange={(e) => handleChangeMood(e.target.value)}
              className="audio-mood-select"
            >
              <option value="auto">
                ✨ Tự động theo tâm trạng (A.I: {detectedMood.label})
              </option>
              <option value="melancholic">
                🌧️ Trầm buồn, sâu lắng & vỗ về (Tâm sự, burnout)
              </option>
              <option value="uplifting">
                ☀️ Vui tươi, tích cực & hứng khởi (Small wins, khởi sắc)
              </option>
              <option value="child">
                🎈 Hồn nhiên, trong trẻo (Giọng trẻ em đáng yêu)
              </option>
              <option value="podcast">
                🎙️ Podcast truyền cảm (Phát thanh viên Storyteller)
              </option>
              <option value="custom_voice">
                🧬 Giọng A.I nhân bản chính chủ {activeVoiceProfile ? '✓' : '(Cần thu âm trước)'}
              </option>
            </select>
          </div>

          {/* Tốc độ đọc */}
          <div className="audio-speed-picker">
            <label className="audio-ctrl-label">Tốc độ:</label>
            <div className="audio-speed-btn-group">
              {[0.8, 1.0, 1.25, 1.5].map((s) => (
                <button
                  key={s}
                  type="button"
                  className={`audio-speed-btn ${speed === s ? 'active' : ''}`}
                  onClick={() => handleChangeSpeed(s)}
                >
                  {s}x
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Modal Phòng Thu Âm Nhân Bản Giọng Nói */}
      <VoiceCloningModal
        isOpen={isCloningOpen}
        onClose={() => setIsCloningOpen(false)}
        onVoiceSaved={(newProfile) => {
          setActiveVoiceProfile(newProfile);
          setSelectedMood('custom_voice');
        }}
      />
    </section>
  );
};

