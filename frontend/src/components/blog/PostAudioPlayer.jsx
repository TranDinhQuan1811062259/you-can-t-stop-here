import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  MOOD_VOICE_PRESETS,
  VIETNAMESE_VOICE_GENDERS,
  VIETNAMESE_VOICE_REGIONS,
  detectPostEmotion,
  aiVoicePlayer,
  cleanTextForSpeech,
  formatTime,
} from '../../utils/aiVoiceEngine';
import { useAuth } from '../../context/AuthContext';
import { VoiceCloningModal } from './VoiceCloningModal';
import { playClickSound } from '../../utils/soundEffects';

export const PostAudioPlayer = ({ post }) => {
  const { user } = useAuth();

  const [playbackState, setPlaybackState] = useState('idle'); // 'idle' | 'playing' | 'paused'
  const [progress, setProgress] = useState(0);
  const [currentSeconds, setCurrentSeconds] = useState(0);
  const [totalDurationSeconds, setTotalDurationSeconds] = useState(0);
  const [currentSentence, setCurrentSentence] = useState('');
  const [selectedMood, setSelectedMood] = useState(() => post?.audioMood || 'auto');
  const [selectedGender, setSelectedGender] = useState(() => post?.voiceGender || 'female');
  const [selectedRegion, setSelectedRegion] = useState(() => post?.voiceRegion || 'north');
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

  // Đồng bộ cấu hình giọng đọc của tác giả khi mở bài viết
  useEffect(() => {
    if (post) {
      if (post.voiceGender) setSelectedGender(post.voiceGender);
      if (post.voiceRegion) setSelectedRegion(post.voiceRegion);
      if (post.audioMood) setSelectedMood(post.audioMood);
    }
  }, [post?._id, post?.voiceGender, post?.voiceRegion, post?.audioMood]);

  // Tự động phân tích tâm trạng nội dung bài viết
  const detectedMood = useMemo(() => {
    return detectPostEmotion(post);
  }, [post]);

  // Toàn bộ văn bản bài viết
  const fullText = useMemo(() => {
    if (!post) return '';
    return `${post.title || ''}. ${cleanTextForSpeech(post.content || post.summary || '')}`;
  }, [post]);

  // Ước tính tổng thời lượng nghe theo giây (dựa trên số lượng từ tiếng Việt: ~140 từ/phút)
  useEffect(() => {
    if (fullText) {
      const wordCount = fullText.split(/\s+/).filter(Boolean).length;
      const initialTotal = Math.max(10, Math.round((wordCount / (140 / 60)) / speed));
      setTotalDurationSeconds(initialTotal);
    }
  }, [fullText, speed]);

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

    // Bắt đầu đọc với đầy đủ cấu hình Giới tính (Nam/Nữ) & Vùng miền (Bắc/Trung/Nam)
    aiVoicePlayer.play({
      text: fullText,
      moodId: selectedMood,
      gender: selectedGender,
      region: selectedRegion,
      speed,
      detectedMood,
      customVoiceProfile: activeVoiceProfile,
      onProgress: (percent, chunkIdx, chunkText, curSec, totSec) => {
        setProgress(percent);
        setCurrentSentence(chunkText);
        if (curSec !== undefined) setCurrentSeconds(curSec);
        if (totSec !== undefined) setTotalDurationSeconds(totSec);
      },
      onStateChange: (state) => {
        setPlaybackState(state);
      },
      onTimeUpdate: (curSec, totSec) => {
        setCurrentSeconds(curSec);
        if (totSec) setTotalDurationSeconds(totSec);
      },
    });
  };

  const handleStop = () => {
    playClickSound();
    aiVoicePlayer.stop();
    setProgress(0);
    setCurrentSeconds(0);
    setCurrentSentence('');
  };

  const handleChangeGender = (newGender) => {
    playClickSound();
    setSelectedGender(newGender);
    aiVoicePlayer.setGender(newGender);
  };

  const handleChangeRegion = (newRegion) => {
    playClickSound();
    setSelectedRegion(newRegion);
    aiVoicePlayer.setRegion(newRegion);
  };

  const handleChangeMood = (newMood) => {
    playClickSound();
    setSelectedMood(newMood);
    aiVoicePlayer.setMood(newMood);
  };

  const handleChangeSpeed = (newSpeed) => {
    playClickSound();
    setSpeed(newSpeed);
    aiVoicePlayer.setSpeed(newSpeed, detectedMood);
  };

  // Kéo tua chính xác tới từng Phút : Giây
  const handleSeek = (e) => {
    const val = Number(e.target.value);
    setCurrentSeconds(val);
    aiVoicePlayer.seekToSecond(val, detectedMood);
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

  const currentRegion = useMemo(() => {
    return VIETNAMESE_VOICE_REGIONS.find((r) => r.id === selectedRegion) || VIETNAMESE_VOICE_REGIONS[0];
  }, [selectedRegion]);

  const currentGender = useMemo(() => {
    return VIETNAMESE_VOICE_GENDERS.find((g) => g.id === selectedGender) || VIETNAMESE_VOICE_GENDERS[0];
  }, [selectedGender]);

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
                Tâm trạng phát hiện: <strong>{detectedMood.icon} {detectedMood.label}</strong> • Giọng mặc định: <strong>{currentGender.icon} {currentGender.name} ({currentRegion.shortName})</strong>
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

          {/* Thanh Tiến Trình Hiển Thị Chuẩn Xác Tới Từng Phút : Giây */}
          <div className="audio-timeline-wrap">
            <div className="audio-timeline-labels">
              <span className="audio-current-label">
                {playbackState === 'playing'
                  ? 'Đang đọc theo dòng cảm xúc...'
                  : playbackState === 'paused'
                  ? 'Đang tạm dừng'
                  : 'Sẵn sàng phát'}
              </span>

              {/* Mốc thời gian chính xác tới từng giây: Phút:Giây Hiện Tại / Tổng Phút:Giây */}
              <div
                className="audio-exact-time-display"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                  background: 'rgba(15, 23, 42, 0.65)',
                  padding: '2px 8px',
                  borderRadius: '6px',
                  border: '1px solid rgba(45, 212, 191, 0.3)',
                  fontFamily: 'monospace',
                  fontSize: '0.82rem',
                }}
              >
                <span style={{ fontWeight: 800, color: '#2dd4bf' }}>
                  {formatTime(currentSeconds)}
                </span>
                <span style={{ color: '#64748b' }}>/</span>
                <span style={{ color: '#94a3b8' }}>
                  {formatTime(totalDurationSeconds)}
                </span>
              </div>
            </div>

            {/* Thanh trượt tua chính xác tới từng giây */}
            <input
              type="range"
              min="0"
              max={totalDurationSeconds || 60}
              step="1"
              value={currentSeconds}
              onChange={handleSeek}
              className="audio-progress-slider"
              title={`Kéo để tua chính xác: ${formatTime(currentSeconds)} / ${formatTime(totalDurationSeconds)}`}
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

        {/* HÀNG 1: TÙY BIẾN GIỚI TÍNH GIỌNG (NAM/NỮ) & NGÔN NGỮ VÙNG MIỀN (BẮC/TRUNG/NAM) */}
        <div className="audio-voice-selection-row">
          {/* Lựa chọn Giới tính Nam / Nữ */}
          <div className="audio-gender-picker">
            <label className="audio-ctrl-label">
              <span>👤</span>
              <span>Giới tính giọng:</span>
            </label>
            <div className="audio-gender-btn-group">
              {VIETNAMESE_VOICE_GENDERS.map((g) => (
                <button
                  key={g.id}
                  type="button"
                  className={`audio-gender-btn ${selectedGender === g.id ? 'active' : ''}`}
                  onClick={() => handleChangeGender(g.id)}
                  title={g.desc}
                >
                  <span className="audio-gender-icon">{g.icon}</span>
                  <span className="audio-gender-text">{g.name}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Lựa chọn Ngôn ngữ Vùng miền Việt Nam */}
          <div className="audio-region-picker">
            <label className="audio-ctrl-label">
              <span>📍</span>
              <span>Vùng miền:</span>
            </label>
            <select
              value={selectedRegion}
              onChange={(e) => handleChangeRegion(e.target.value)}
              className="audio-region-select"
            >
              {VIETNAMESE_VOICE_REGIONS.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.icon} {r.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* HÀNG 2: TÙY BIẾN TÂM TRẠNG & TỐC ĐỘ */}
        <div className="audio-player-custom-row">
          {/* Lựa chọn Tâm trạng & Ngữ điệu */}
          <div className="audio-mood-picker">
            <label className="audio-ctrl-label">
              <span>{currentPreset.icon}</span>
              <span>Tâm trạng đọc:</span>
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

        {/* Chú thích đặc trưng của chất giọng & vùng miền đang chọn */}
        <div className="audio-voice-feature-badge">
          <span>
            ✨ <strong>Âm sắc A.I:</strong> {currentGender.name} • {currentRegion.name} ({selectedGender === 'male' ? currentRegion.maleDesc : currentRegion.femaleDesc})
          </span>
          <span className="audio-desc-sep">•</span>
          <span>
            {currentPreset.desc}
          </span>
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

