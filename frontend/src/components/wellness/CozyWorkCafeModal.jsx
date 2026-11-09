import React, { useState, useEffect, useRef } from 'react';
import {
  playClickSound,
  playMeditationBellSound,
  createRainAmbientNode,
  createFireplaceAmbientNode,
  createCafeAmbientNode,
  playCatPurrSound,
} from '../../utils/soundEffects';

export const CozyWorkCafeModal = ({ isOpen, onClose }) => {
  // Pomodoro Timer state
  const [timerMode, setTimerMode] = useState('work'); // 'work' | 'break'
  const [timeLeft, setTimeLeft] = useState(25 * 60);
  const [isRunning, setIsRunning] = useState(false);
  const [taskName, setTaskName] = useState('Tập trung viết code & giải quyết công việc');
  const [pomodoroCount, setPomodoroCount] = useState(() => {
    return parseInt(localStorage.getItem('freedom_pomo_count') || '0', 10);
  });

  // Tùy chọn giao diện: Đèn bàn ấm áp
  const [isWarmLampOn, setIsWarmLampOn] = useState(true);

  // Âm thanh môi trường đa kênh (Multi-track Ambient Audio)
  const [ambientVolumes, setAmbientVolumes] = useState({
    rain: 0.5,
    cafe: 0.3,
    fireplace: 0.0,
  });
  const [isPlayingAmbient, setIsPlayingAmbient] = useState(false);

  // Audio Node references
  const rainNodeRef = useRef(null);
  const fireplaceNodeRef = useRef(null);
  const cafeNodeRef = useRef(null);
  const timerIntervalRef = useRef(null);

  // Xử lý bật/tắt toàn bộ âm thanh môi trường
  useEffect(() => {
    if (isPlayingAmbient && isOpen) {
      if (ambientVolumes.rain > 0 && !rainNodeRef.current) {
        rainNodeRef.current = createRainAmbientNode(ambientVolumes.rain);
      }
      if (ambientVolumes.fireplace > 0 && !fireplaceNodeRef.current) {
        fireplaceNodeRef.current = createFireplaceAmbientNode(ambientVolumes.fireplace);
      }
      if (ambientVolumes.cafe > 0 && !cafeNodeRef.current) {
        cafeNodeRef.current = createCafeAmbientNode(ambientVolumes.cafe);
      }
    } else {
      stopAllAmbientNodes();
    }
  }, [isPlayingAmbient, isOpen]);

  // Cập nhật âm lượng từng kênh theo thời gian thực
  const handleVolumeChange = (type, val) => {
    const nextVols = { ...ambientVolumes, [type]: parseFloat(val) };
    setAmbientVolumes(nextVols);

    if (type === 'rain') {
      if (val > 0 && !rainNodeRef.current && isPlayingAmbient) {
        rainNodeRef.current = createRainAmbientNode(val);
      } else if (rainNodeRef.current) {
        rainNodeRef.current.setVolume(val);
      }
    } else if (type === 'fireplace') {
      if (val > 0 && !fireplaceNodeRef.current && isPlayingAmbient) {
        fireplaceNodeRef.current = createFireplaceAmbientNode(val);
      } else if (fireplaceNodeRef.current) {
        fireplaceNodeRef.current.setVolume(val);
      }
    } else if (type === 'cafe') {
      if (val > 0 && !cafeNodeRef.current && isPlayingAmbient) {
        cafeNodeRef.current = createCafeAmbientNode(val);
      } else if (cafeNodeRef.current) {
        cafeNodeRef.current.setVolume(val);
      }
    }
  };

  const stopAllAmbientNodes = () => {
    if (rainNodeRef.current) {
      rainNodeRef.current.stop();
      rainNodeRef.current = null;
    }
    if (fireplaceNodeRef.current) {
      fireplaceNodeRef.current.stop();
      fireplaceNodeRef.current = null;
    }
    if (cafeNodeRef.current) {
      cafeNodeRef.current.stop();
      cafeNodeRef.current = null;
    }
  };

  // Vòng lặp đếm ngược Pomodoro
  useEffect(() => {
    if (isRunning) {
      timerIntervalRef.current = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            playMeditationBellSound();
            if (timerMode === 'work') {
              const nextCount = pomodoroCount + 1;
              setPomodoroCount(nextCount);
              localStorage.setItem('freedom_pomo_count', String(nextCount));
              setTimerMode('break');
              return 5 * 60; // 5 phút nghỉ
            } else {
              setTimerMode('work');
              return 25 * 60; // 25 phút làm việc
            }
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      clearInterval(timerIntervalRef.current);
    }

    return () => clearInterval(timerIntervalRef.current);
  }, [isRunning, timerMode, pomodoroCount]);

  // Tự động dọn dẹp âm thanh khi đóng modal
  useEffect(() => {
    if (!isOpen) {
      setIsRunning(false);
      setIsPlayingAmbient(false);
      stopAllAmbientNodes();
    }
  }, [isOpen]);

  const toggleTimer = () => {
    playClickSound();
    setIsRunning((prev) => !prev);
    if (!isPlayingAmbient) {
      setIsPlayingAmbient(true);
    }
  };

  const resetTimer = () => {
    playClickSound();
    setIsRunning(false);
    setTimeLeft(timerMode === 'work' ? 25 * 60 : 5 * 60);
  };

  const switchMode = (mode) => {
    playClickSound();
    setTimerMode(mode);
    setIsRunning(false);
    setTimeLeft(mode === 'work' ? 25 * 60 : 5 * 60);
  };

  if (!isOpen) return null;

  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;
  const formattedTime = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;

  return (
    <div
      className="modal-backdrop"
      onClick={onClose}
      style={{
        zIndex: 99999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px',
        background: 'rgba(15, 23, 42, 0.85)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
      }}
    >
      <div
        className="cozy-cafe-modal-box"
        onClick={(e) => e.stopPropagation()}
        style={{
          width: '95%',
          maxWidth: '720px',
          maxHeight: '90vh',
          borderRadius: '26px',
          background: isWarmLampOn
            ? 'linear-gradient(160deg, #1f1610 0%, #291e15 45%, #18110b 100%)'
            : 'linear-gradient(160deg, #121622 0%, #1b2133 45%, #0f131c 100%)',
          border: '1.5px solid rgba(245, 158, 11, 0.45)',
          color: '#ffffff',
          boxShadow: isWarmLampOn
            ? '0 30px 80px rgba(0,0,0,0.92), 0 0 50px rgba(245, 158, 11, 0.28)'
            : '0 30px 80px rgba(0,0,0,0.92), 0 0 40px rgba(56, 189, 248, 0.2)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          padding: 0,
          transition: 'background 0.4s ease, box-shadow 0.4s ease',
        }}
      >
        {/* Header Tiệm Cà Phê Mưa */}
        <div
          style={{
            padding: '18px 24px 14px',
            borderBottom: '1.5px solid rgba(245, 158, 11, 0.2)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: 'linear-gradient(135deg, rgba(38, 27, 18, 0.95), rgba(24, 17, 11, 0.98))',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <span style={{ fontSize: '1.8rem', filter: 'drop-shadow(0 2px 8px rgba(245, 158, 11, 0.4))' }}>☕</span>
            <div>
              <h3 style={{ margin: 0, fontSize: '1.25rem', color: '#fef08a', fontWeight: 900, textShadow: '0 2px 8px rgba(245, 158, 11, 0.3)' }}>
                Tiệm Cà Phê Mưa & Góc Pomodoro Ấm Cúng
              </h3>
              <p style={{ margin: '3px 0 0', fontSize: '0.82rem', color: '#fed7aa', fontWeight: 500 }}>
                Âm thanh mưa rơi, hương cà phê và đồng hồ tập trung xua tan cô đơn lúc làm việc.
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {/* Nút Bật/Tắt Đèn Bàn Ấm Áp */}
            <button
              type="button"
              onClick={() => { playClickSound(); setIsWarmLampOn((prev) => !prev); }}
              style={{
                background: isWarmLampOn
                  ? 'linear-gradient(135deg, #f59e0b, #d97706)'
                  : 'rgba(255, 255, 255, 0.12)',
                color: isWarmLampOn ? '#000000' : '#e2e8f0',
                border: '1.5px solid rgba(245, 158, 11, 0.5)',
                borderRadius: '10px',
                padding: '7px 12px',
                fontSize: '0.78rem',
                fontWeight: 800,
                cursor: 'pointer',
                boxShadow: isWarmLampOn ? '0 2px 10px rgba(245, 158, 11, 0.4)' : 'none',
                transition: 'all 0.2s ease',
              }}
              title="Bật/Tắt đèn bàn ánh sáng vàng dịu mắt"
            >
              {isWarmLampOn ? '💡 Đèn Vàng: Bật' : '🌑 Đèn Vàng: Tắt'}
            </button>

            <button
              type="button"
              onClick={onClose}
              style={{
                background: 'rgba(255, 255, 255, 0.12)',
                border: '1px solid rgba(255, 255, 255, 0.2)',
                borderRadius: '50%',
                width: '32px',
                height: '32px',
                color: '#f8fafc',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '0.9rem',
                transition: 'background 0.15s ease',
              }}
              onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.25)'}
              onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.12)'}
            >
              ✕
            </button>
          </div>
        </div>

        {/* Thân cửa sổ ngắm mưa & Pomodoro */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '22px 24px' }}>
          {/* Khung Đồng Hồ Pomodoro Nổi Bật (Sắc nét, tương phản cao, không bị chìm) */}
          <div
            style={{
              background: 'linear-gradient(160deg, #271c13 0%, #18110b 100%)',
              border: '2px solid rgba(245, 158, 11, 0.4)',
              borderRadius: '22px',
              padding: '22px 20px',
              textAlign: 'center',
              marginBottom: '20px',
              boxShadow: '0 12px 36px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.12)',
            }}
          >
            {/* Chuyển chế độ Làm Việc / Nghỉ Ngơi */}
            <div style={{ display: 'inline-flex', gap: '8px', background: 'rgba(0, 0, 0, 0.45)', padding: '5px', borderRadius: '999px', marginBottom: '16px', border: '1px solid rgba(245, 158, 11, 0.25)' }}>
              <button
                type="button"
                onClick={() => switchMode('work')}
                style={{
                  background: timerMode === 'work'
                    ? 'linear-gradient(135deg, #f59e0b, #d97706)'
                    : 'transparent',
                  color: timerMode === 'work' ? '#000000' : '#e2e8f0',
                  border: 'none',
                  borderRadius: '999px',
                  padding: '6px 16px',
                  fontSize: '0.82rem',
                  fontWeight: 900,
                  cursor: 'pointer',
                  boxShadow: timerMode === 'work' ? '0 2px 10px rgba(245, 158, 11, 0.45)' : 'none',
                  transition: 'all 0.2s ease',
                }}
              >
                🧠 Tập Trung (25p)
              </button>
              <button
                type="button"
                onClick={() => switchMode('break')}
                style={{
                  background: timerMode === 'break'
                    ? 'linear-gradient(135deg, #10b981, #059669)'
                    : 'transparent',
                  color: timerMode === 'break' ? '#ffffff' : '#e2e8f0',
                  border: 'none',
                  borderRadius: '999px',
                  padding: '6px 16px',
                  fontSize: '0.82rem',
                  fontWeight: 900,
                  cursor: 'pointer',
                  boxShadow: timerMode === 'break' ? '0 2px 10px rgba(16, 185, 129, 0.45)' : 'none',
                  transition: 'all 0.2s ease',
                }}
              >
                ☕ Nghỉ Giải Lao (5p)
              </button>
            </div>

            {/* Đồng hồ số khổng lồ (Glow ấm áp rực rỡ) */}
            <div
              style={{
                fontSize: '4.8rem',
                fontWeight: 900,
                letterSpacing: '3px',
                fontFamily: "'Courier New', Courier, monospace",
                color: timerMode === 'work' ? '#fbbf24' : '#6ee7b7',
                textShadow: timerMode === 'work'
                  ? '0 0 25px rgba(245, 158, 11, 0.65), 0 0 50px rgba(245, 158, 11, 0.35)'
                  : '0 0 25px rgba(16, 185, 129, 0.65), 0 0 50px rgba(16, 185, 129, 0.35)',
                margin: '2px 0 12px',
                lineHeight: 1,
              }}
            >
              {formattedTime}
            </div>

            {/* Tên nhiệm vụ */}
            <input
              type="text"
              value={taskName}
              onChange={(e) => setTaskName(e.target.value)}
              placeholder="Đang tập trung vào việc gì..."
              style={{
                background: 'rgba(0, 0, 0, 0.45)',
                border: '1.5px solid rgba(245, 158, 11, 0.35)',
                borderRadius: '10px',
                padding: '8px 16px',
                color: '#fef08a',
                fontSize: '0.88rem',
                fontWeight: 700,
                width: '85%',
                maxWidth: '380px',
                textAlign: 'center',
                outline: 'none',
                marginBottom: '18px',
                boxShadow: 'inset 0 2px 6px rgba(0,0,0,0.4)',
              }}
            />

            {/* Nút bấm Bắt đầu / Tạm dừng / Đặt lại */}
            <div style={{ display: 'flex', justifyContent: 'center', gap: '12px' }}>
              <button
                type="button"
                onClick={toggleTimer}
                style={{
                  background: isRunning
                    ? 'linear-gradient(135deg, #ef4444, #dc2626)'
                    : 'linear-gradient(135deg, #f59e0b, #d97706)',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '14px',
                  padding: '12px 32px',
                  fontSize: '0.98rem',
                  fontWeight: 900,
                  cursor: 'pointer',
                  boxShadow: isRunning
                    ? '0 6px 20px rgba(239, 68, 68, 0.45)'
                    : '0 6px 20px rgba(245, 158, 11, 0.45)',
                  transition: 'transform 0.15s ease, filter 0.15s ease',
                }}
                onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-2px)'}
                onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
              >
                {isRunning ? '⏸ Tạm Dừng' : '▶️ Bắt Đầu Tập Trung'}
              </button>

              <button
                type="button"
                onClick={resetTimer}
                style={{
                  background: 'rgba(255, 255, 255, 0.12)',
                  color: '#f8fafc',
                  border: '1.5px solid rgba(255, 255, 255, 0.25)',
                  borderRadius: '14px',
                  padding: '12px 20px',
                  fontSize: '0.88rem',
                  fontWeight: 800,
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                }}
                onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.2)'}
                onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.12)'}
              >
                ↺ Đặt Lại
              </button>
            </div>

            <div style={{ marginTop: '14px', fontSize: '0.8rem', color: '#fed7aa', fontWeight: 600 }}>
              Đã hoàn thành <strong style={{ color: '#fbbf24', fontSize: '0.92rem' }}>{pomodoroCount}</strong> chu kỳ tập trung hôm nay 🍅
            </div>
          </div>

          {/* Bàn Trộn Âm Thanh Môi Trường Đa Kênh (Ambient Sound Mixer) */}
          <div
            style={{
              background: 'linear-gradient(160deg, #241a12 0%, #16100a 100%)',
              border: '1.5px solid rgba(245, 158, 11, 0.35)',
              borderRadius: '20px',
              padding: '18px 22px',
              boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '1.3rem' }}>🎛️</span>
                <strong style={{ fontSize: '0.95rem', color: '#fef08a', fontWeight: 900 }}>
                  Bàn Trộn Âm Thanh Thư Giãn (Ambient Mixer):
                </strong>
              </div>

              <button
                type="button"
                onClick={() => { playClickSound(); setIsPlayingAmbient((p) => !p); }}
                style={{
                  background: isPlayingAmbient
                    ? 'linear-gradient(135deg, #10b981, #059669)'
                    : 'rgba(255, 255, 255, 0.12)',
                  color: '#ffffff',
                  border: isPlayingAmbient ? 'none' : '1px solid rgba(255, 255, 255, 0.25)',
                  borderRadius: '999px',
                  padding: '6px 16px',
                  fontSize: '0.78rem',
                  fontWeight: 800,
                  cursor: 'pointer',
                  boxShadow: isPlayingAmbient ? '0 2px 10px rgba(16, 185, 129, 0.45)' : 'none',
                  transition: 'all 0.18s ease',
                }}
              >
                {isPlayingAmbient ? '🔊 Đang Phát Âm Thanh' : '🔇 Âm Thanh Đang Tắt'}
              </button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '14px' }}>
              {/* Kênh 1: Mưa rơi */}
              <div style={{ background: 'rgba(0, 0, 0, 0.4)', padding: '12px 14px', borderRadius: '14px', border: '1px solid rgba(56, 189, 248, 0.25)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem', marginBottom: '8px', fontWeight: 700 }}>
                  <span style={{ color: '#f0f9ff' }}>🌧️ Tiếng Mưa Rơi:</span>
                  <span style={{ color: '#38bdf8', fontWeight: 900 }}>{Math.round(ambientVolumes.rain * 100)}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.05"
                  value={ambientVolumes.rain}
                  onChange={(e) => handleVolumeChange('rain', e.target.value)}
                  style={{ width: '100%', accentColor: '#38bdf8', cursor: 'pointer' }}
                />
              </div>

              {/* Kênh 2: Quán Cà Phê */}
              <div style={{ background: 'rgba(0, 0, 0, 0.4)', padding: '12px 14px', borderRadius: '14px', border: '1px solid rgba(245, 158, 11, 0.25)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem', marginBottom: '8px', fontWeight: 700 }}>
                  <span style={{ color: '#fefce8' }}>☕ Tiệm Cà Phê:</span>
                  <span style={{ color: '#fbbf24', fontWeight: 900 }}>{Math.round(ambientVolumes.cafe * 100)}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.05"
                  value={ambientVolumes.cafe}
                  onChange={(e) => handleVolumeChange('cafe', e.target.value)}
                  style={{ width: '100%', accentColor: '#fbbf24', cursor: 'pointer' }}
                />
              </div>

              {/* Kênh 3: Lò Sưởi */}
              <div style={{ background: 'rgba(0, 0, 0, 0.4)', padding: '12px 14px', borderRadius: '14px', border: '1px solid rgba(249, 115, 22, 0.25)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem', marginBottom: '8px', fontWeight: 700 }}>
                  <span style={{ color: '#fff7ed' }}>🔥 Lò Sưởi Ấm:</span>
                  <span style={{ color: '#fb923c', fontWeight: 900 }}>{Math.round(ambientVolumes.fireplace * 100)}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.05"
                  value={ambientVolumes.fireplace}
                  onChange={(e) => handleVolumeChange('fireplace', e.target.value)}
                  style={{ width: '100%', accentColor: '#fb923c', cursor: 'pointer' }}
                />
              </div>
            </div>

            {/* Nút bấm nghe tiếng mèo cưng nằm ngủ */}
            <div style={{ marginTop: '12px', textAlign: 'right' }}>
              <button
                type="button"
                onClick={playCatPurrSound}
                style={{
                  background: 'transparent',
                  border: '1px solid rgba(255,255,255,0.2)',
                  borderRadius: '999px',
                  padding: '4px 10px',
                  color: '#fdba74',
                  fontSize: '0.72rem',
                  cursor: 'pointer',
                }}
              >
                🐱 Tiếng mèo rung rừ rừ (Healing Purr)
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
