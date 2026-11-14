import React, { useState, useEffect, useRef } from 'react';
import {
  playClickSound,
  playMeditationBellSound,
  createRainAmbientNode,
  createFireplaceAmbientNode,
  createCafeAmbientNode,
  createCatPurrAmbientNode,
} from '../../utils/soundEffects';

// Danh sách các bản nhạc hoài niệm & êm dịu góc quán cà phê (Đã kiểm tra 100% bản quyền embed qua YouTube)
const CAFE_PLAYLIST = [
  {
    id: 'kHdMIY0-psY',
    title: 'salvia palth - dream (extended seamless version) [slowed]',
    artist: 'salvia palth',
    tag: 'Gợi ý từ bạn ☕',
    desc: 'Giai điệu guitar lo-fi hoài niệm da diết, trôi lững lờ êm dịu khi tập trung',
    icon: '🎸',
  },
  {
    id: 'P7GUkYg1BAo',
    title: 'salvia palth - dream (original studio audio)',
    artist: 'salvia palth',
    tag: 'Studio Trong Trẻo 🎧',
    desc: 'Bản gốc phòng thu nguyên bản, âm thanh sạch sẽ',
    icon: '☕',
  },
  {
    id: '5qap5aO4i9A',
    title: 'lofi hip hop radio - beats to relax/study to',
    artist: 'Lofi Girl',
    tag: 'Lo-Fi Quán Trưa 🌧️',
    desc: 'Tiếng mưa rơi cùng những nốt nhạc lo-fi êm dịu cho ngày dài',
    icon: '📻',
  },
  {
    id: '7maJOI3QMu0',
    title: 'River Flows in You (Original Master Audio)',
    artist: 'Yiruma',
    tag: 'Dương Cầm Yên Bình 🎹',
    desc: 'Giai điệu dương cầm nhẹ nhàng như làn suối mát trong tâm hồn',
    icon: '🎼',
  },
];

export const CozyWorkCafeModal = ({ isOpen, onClose }) => {
  // Pomodoro Timer state
  const [timerMode, setTimerMode] = useState('work'); // 'work' | 'break'
  const [timeLeft, setTimeLeft] = useState(25 * 60);
  const [isRunning, setIsRunning] = useState(false);
  const [taskName, setTaskName] = useState('Tập trung viết code & giải quyết công việc');
  const [pomodoroCount, setPomodoroCount] = useState(() => {
    return parseInt(localStorage.getItem('freedom_pomo_count') || '0', 10);
  });

  // Tùy chọn giao diện: Đèn bàn ấm áp (Vàng hổ phách vs Đêm lạnh ánh trăng)
  const [isWarmLampOn, setIsWarmLampOn] = useState(true);

  // Âm thanh môi trường đa kênh (Multi-track Ambient Audio)
  const [ambientVolumes, setAmbientVolumes] = useState({
    rain: 0.5,
    cafe: 0.3,
    fireplace: 0.0,
    cat: 0.0,
  });
  const [isPlayingAmbient, setIsPlayingAmbient] = useState(false);

  // Nhạc hoài niệm góc quán cafe (YouTube Ambient Stream)
  const [selectedMusic, setSelectedMusic] = useState(CAFE_PLAYLIST[0]);
  const [isPlayingMusic, setIsPlayingMusic] = useState(false);
  const [isMusicListOpen, setIsMusicListOpen] = useState(false);

  // Audio Node references
  const rainNodeRef = useRef(null);
  const fireplaceNodeRef = useRef(null);
  const cafeNodeRef = useRef(null);
  const catNodeRef = useRef(null);
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
      if (ambientVolumes.cat > 0 && !catNodeRef.current) {
        catNodeRef.current = createCatPurrAmbientNode(ambientVolumes.cat);
      }
    } else {
      stopAllAmbientNodes();
    }
  }, [isPlayingAmbient, isOpen]);

  // Cập nhật âm lượng từng kênh theo thời gian thực
  const handleVolumeChange = (type, val) => {
    const numVal = parseFloat(val);
    const nextVols = { ...ambientVolumes, [type]: numVal };
    setAmbientVolumes(nextVols);

    if (type === 'rain') {
      if (numVal > 0 && !rainNodeRef.current && isPlayingAmbient) {
        rainNodeRef.current = createRainAmbientNode(numVal);
      } else if (rainNodeRef.current) {
        if (numVal === 0) {
          try { rainNodeRef.current.stop(); } catch (_) {}
          rainNodeRef.current = null;
        } else {
          rainNodeRef.current.setVolume(numVal);
        }
      }
    } else if (type === 'fireplace') {
      if (numVal > 0 && !fireplaceNodeRef.current && isPlayingAmbient) {
        fireplaceNodeRef.current = createFireplaceAmbientNode(numVal);
      } else if (fireplaceNodeRef.current) {
        if (numVal === 0) {
          try { fireplaceNodeRef.current.stop(); } catch (_) {}
          fireplaceNodeRef.current = null;
        } else {
          fireplaceNodeRef.current.setVolume(numVal);
        }
      }
    } else if (type === 'cafe') {
      if (numVal > 0 && !cafeNodeRef.current && isPlayingAmbient) {
        cafeNodeRef.current = createCafeAmbientNode(numVal);
      } else if (cafeNodeRef.current) {
        if (numVal === 0) {
          try { cafeNodeRef.current.stop(); } catch (_) {}
          cafeNodeRef.current = null;
        } else {
          cafeNodeRef.current.setVolume(numVal);
        }
      }
    } else if (type === 'cat') {
      if (numVal > 0 && !catNodeRef.current && isPlayingAmbient) {
        catNodeRef.current = createCatPurrAmbientNode(numVal);
      } else if (catNodeRef.current) {
        if (numVal === 0) {
          try { catNodeRef.current.stop(); } catch (_) {}
          catNodeRef.current = null;
        } else {
          catNodeRef.current.setVolume(numVal);
        }
      }
    }
  };

  const stopAllAmbientNodes = () => {
    if (rainNodeRef.current) {
      try { rainNodeRef.current.stop(); } catch (_) {}
      rainNodeRef.current = null;
    }
    if (fireplaceNodeRef.current) {
      try { fireplaceNodeRef.current.stop(); } catch (_) {}
      fireplaceNodeRef.current = null;
    }
    if (cafeNodeRef.current) {
      try { cafeNodeRef.current.stop(); } catch (_) {}
      cafeNodeRef.current = null;
    }
    if (catNodeRef.current) {
      try { catNodeRef.current.stop(); } catch (_) {}
      catNodeRef.current = null;
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
      setIsPlayingMusic(false);
      stopAllAmbientNodes();
    }
  }, [isOpen]);

  // Bắt đầu / Tạm dừng đồng hồ Pomodoro đồng thời điều khiển âm thanh tương ứng
  const toggleTimer = () => {
    playClickSound();
    setIsRunning((prev) => {
      const next = !prev;
      setIsPlayingAmbient(next); // Khi tạm dừng thì ngưng phát âm thanh ngay lập tức
      return next;
    });
  };

  const resetTimer = () => {
    playClickSound();
    setIsRunning(false);
    setIsPlayingAmbient(false);
    stopAllAmbientNodes();
    setTimeLeft(timerMode === 'work' ? 25 * 60 : 5 * 60);
  };

  const switchMode = (mode) => {
    playClickSound();
    setTimerMode(mode);
    setIsRunning(false);
    setIsPlayingAmbient(false);
    stopAllAmbientNodes();
    setTimeLeft(mode === 'work' ? 25 * 60 : 5 * 60);
  };

  // Nút bật/tắt tiếng mèo rung rừ rừ duy trì
  const toggleCatPurr = () => {
    playClickSound();
    const nextVal = ambientVolumes.cat > 0 ? 0.0 : 0.6;
    handleVolumeChange('cat', nextVal);
    if (nextVal > 0 && !isPlayingAmbient) {
      setIsPlayingAmbient(true);
    }
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
            ? 'linear-gradient(160deg, #2a1a10 0%, #362215 45%, #1c1108 100%)'
            : 'linear-gradient(160deg, #090e1a 0%, #0f172a 45%, #050811 100%)',
          border: isWarmLampOn
            ? '2px solid rgba(245, 158, 11, 0.65)'
            : '1.5px solid rgba(56, 189, 248, 0.4)',
          color: '#ffffff',
          boxShadow: isWarmLampOn
            ? '0 30px 90px rgba(0,0,0,0.95), 0 0 60px rgba(245, 158, 11, 0.35)'
            : '0 30px 90px rgba(0,0,0,0.95), 0 0 50px rgba(56, 189, 248, 0.2)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          padding: 0,
          position: 'relative',
          transition: 'background 0.4s ease, border-color 0.4s ease, box-shadow 0.4s ease',
        }}
      >
        {/* Lớp ánh sáng đèn vàng hắt xuống góc phòng (Ấm cúng & Chân thực) */}
        {isWarmLampOn && (
          <div
            style={{
              position: 'absolute',
              top: 0,
              right: 0,
              width: '100%',
              height: '100%',
              background: 'radial-gradient(ellipse 75% 60% at 85% 0%, rgba(251, 191, 36, 0.22) 0%, rgba(245, 158, 11, 0.08) 50%, transparent 80%)',
              pointerEvents: 'none',
              zIndex: 2,
            }}
          />
        )}

        {/* Header Tiệm Cà Phê Mưa */}
        <div
          style={{
            padding: '18px 24px 14px',
            borderBottom: isWarmLampOn ? '1.5px solid rgba(245, 158, 11, 0.3)' : '1.5px solid rgba(56, 189, 248, 0.2)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: isWarmLampOn
              ? 'linear-gradient(135deg, rgba(48, 33, 21, 0.98), rgba(28, 18, 11, 0.98))'
              : 'linear-gradient(135deg, rgba(15, 23, 42, 0.98), rgba(8, 12, 20, 0.98))',
            position: 'relative',
            zIndex: 3,
            transition: 'background 0.3s ease, border-color 0.3s ease',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <span style={{ fontSize: '1.8rem', filter: isWarmLampOn ? 'drop-shadow(0 2px 8px rgba(245, 158, 11, 0.5))' : 'drop-shadow(0 2px 8px rgba(56, 189, 248, 0.4))' }}>
              ☕
            </span>
            <div>
              <h3 style={{ margin: 0, fontSize: '1.25rem', color: isWarmLampOn ? '#fef08a' : '#e0f2fe', fontWeight: 900, textShadow: isWarmLampOn ? '0 2px 8px rgba(245, 158, 11, 0.3)' : 'none' }}>
                Tiệm Cà Phê Mưa & Góc Pomodoro Ấm Cúng
              </h3>
              <p style={{ margin: '3px 0 0', fontSize: '0.82rem', color: isWarmLampOn ? '#fed7aa' : '#94a3b8', fontWeight: 500 }}>
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
                  : 'rgba(255, 255, 255, 0.1)',
                color: isWarmLampOn ? '#000000' : '#e2e8f0',
                border: isWarmLampOn ? '1.5px solid #fbbf24' : '1px solid rgba(255, 255, 255, 0.25)',
                borderRadius: '10px',
                padding: '7px 12px',
                fontSize: '0.78rem',
                fontWeight: 800,
                cursor: 'pointer',
                boxShadow: isWarmLampOn ? '0 2px 14px rgba(245, 158, 11, 0.5)' : 'none',
                transition: 'all 0.2s ease',
              }}
              title="Bật/Tắt hiệu ứng đèn bàn ánh sáng vàng dịu mắt"
            >
              {isWarmLampOn ? '💡 Đèn Vàng: ĐANG BẬT' : '🌑 Đèn Vàng: ĐÃ TẮT'}
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
        <div style={{ flex: 1, overflowY: 'auto', padding: '22px 24px', position: 'relative', zIndex: 3 }}>
          {/* Khung Đồng Hồ Pomodoro Nổi Bật */}
          <div
            style={{
              background: isWarmLampOn
                ? 'linear-gradient(160deg, #2e1d12 0%, #1c1108 100%)'
                : 'linear-gradient(160deg, #131c2e 0%, #0a0f1a 100%)',
              border: isWarmLampOn
                ? '2px solid rgba(245, 158, 11, 0.45)'
                : '1.5px solid rgba(56, 189, 248, 0.35)',
              borderRadius: '22px',
              padding: '22px 20px',
              textAlign: 'center',
              marginBottom: '20px',
              boxShadow: '0 12px 36px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.12)',
              transition: 'background 0.3s ease, border-color 0.3s ease',
            }}
          >
            {/* Chuyển chế độ Làm Việc / Nghỉ Ngơi */}
            <div style={{ display: 'inline-flex', gap: '8px', background: 'rgba(0, 0, 0, 0.45)', padding: '5px', borderRadius: '999px', marginBottom: '16px', border: isWarmLampOn ? '1px solid rgba(245, 158, 11, 0.25)' : '1px solid rgba(56, 189, 248, 0.25)' }}>
              <button
                type="button"
                onClick={() => switchMode('work')}
                style={{
                  background: timerMode === 'work'
                    ? (isWarmLampOn ? 'linear-gradient(135deg, #f59e0b, #d97706)' : 'linear-gradient(135deg, #0284c7, #0369a1)')
                    : 'transparent',
                  color: timerMode === 'work' ? '#ffffff' : '#e2e8f0',
                  border: 'none',
                  borderRadius: '999px',
                  padding: '6px 16px',
                  fontSize: '0.82rem',
                  fontWeight: 900,
                  cursor: 'pointer',
                  boxShadow: timerMode === 'work' ? '0 2px 10px rgba(0, 0, 0, 0.35)' : 'none',
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

            {/* Đồng hồ số khổng lồ */}
            <div
              style={{
                fontSize: '4.8rem',
                fontWeight: 900,
                letterSpacing: '3px',
                fontFamily: "'Courier New', Courier, monospace",
                color: timerMode === 'work'
                  ? (isWarmLampOn ? '#fbbf24' : '#38bdf8')
                  : '#6ee7b7',
                textShadow: timerMode === 'work'
                  ? (isWarmLampOn
                      ? '0 0 25px rgba(245, 158, 11, 0.65), 0 0 50px rgba(245, 158, 11, 0.35)'
                      : '0 0 25px rgba(56, 189, 248, 0.65), 0 0 50px rgba(56, 189, 248, 0.35)')
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
                border: isWarmLampOn ? '1.5px solid rgba(245, 158, 11, 0.35)' : '1.5px solid rgba(56, 189, 248, 0.35)',
                borderRadius: '10px',
                padding: '8px 16px',
                color: isWarmLampOn ? '#fef08a' : '#e0f2fe',
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
                    : (isWarmLampOn ? 'linear-gradient(135deg, #f59e0b, #d97706)' : 'linear-gradient(135deg, #0284c7, #0369a1)'),
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '14px',
                  padding: '12px 32px',
                  fontSize: '0.98rem',
                  fontWeight: 900,
                  cursor: 'pointer',
                  boxShadow: isRunning
                    ? '0 6px 20px rgba(239, 68, 68, 0.45)'
                    : (isWarmLampOn ? '0 6px 20px rgba(245, 158, 11, 0.45)' : '0 6px 20px rgba(2, 132, 199, 0.45)'),
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

            <div style={{ marginTop: '14px', fontSize: '0.8rem', color: isWarmLampOn ? '#fed7aa' : '#94a3b8', fontWeight: 600 }}>
              Đã hoàn thành <strong style={{ color: isWarmLampOn ? '#fbbf24' : '#38bdf8', fontSize: '0.92rem' }}>{pomodoroCount}</strong> chu kỳ tập trung hôm nay 🍅
            </div>
          </div>

          {/* Trình Phát Nhạc Quán Cà Phê Hoài Niệm (Cozy Cafe Music Player) */}
          <div
            style={{
              background: isWarmLampOn
                ? 'linear-gradient(160deg, #2b1c11 0%, #1c1109 100%)'
                : 'linear-gradient(160deg, #131c2e 0%, #0a0f1a 100%)',
              border: isWarmLampOn
                ? '1.5px solid rgba(245, 158, 11, 0.45)'
                : '1.5px solid rgba(56, 189, 248, 0.35)',
              borderRadius: '20px',
              padding: '16px 20px',
              marginBottom: '20px',
              boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
              transition: 'background 0.3s ease, border-color 0.3s ease',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div
                  style={{
                    width: '42px',
                    height: '42px',
                    borderRadius: '50%',
                    background: isWarmLampOn ? 'linear-gradient(135deg, #f59e0b, #b45309)' : 'linear-gradient(135deg, #0284c7, #0369a1)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '1.25rem',
                    boxShadow: isPlayingMusic ? '0 0 16px rgba(245, 158, 11, 0.6)' : 'none',
                    animation: isPlayingMusic ? 'spinRecord 4s linear infinite' : 'none',
                    flexShrink: 0,
                  }}
                >
                  📻
                </div>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <strong style={{ fontSize: '0.92rem', color: isWarmLampOn ? '#fef08a' : '#e0f2fe' }}>
                      {selectedMusic.title}
                    </strong>
                    <span
                      style={{
                        fontSize: '0.66rem',
                        fontWeight: 800,
                        background: 'rgba(245, 158, 11, 0.25)',
                        color: '#fef08a',
                        border: '1px solid rgba(245, 158, 11, 0.5)',
                        padding: '2px 7px',
                        borderRadius: '999px',
                      }}
                    >
                      {selectedMusic.tag}
                    </span>
                  </div>
                  <div style={{ fontSize: '0.76rem', color: isWarmLampOn ? '#fed7aa' : '#94a3b8', marginTop: '2px' }}>
                    {selectedMusic.desc}
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <button
                  type="button"
                  onClick={() => {
                    playClickSound();
                    setIsMusicListOpen((p) => !p);
                  }}
                  style={{
                    background: 'rgba(255, 255, 255, 0.1)',
                    color: '#e2e8f0',
                    border: '1px solid rgba(255, 255, 255, 0.2)',
                    borderRadius: '10px',
                    padding: '7px 12px',
                    fontSize: '0.78rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                  }}
                >
                  {isMusicListOpen ? '✕ Đóng List' : '📜 Đổi Bài'}
                </button>

                <button
                  type="button"
                  onClick={() => {
                    playClickSound();
                    setIsPlayingMusic((p) => !p);
                  }}
                  style={{
                    background: isPlayingMusic
                      ? 'linear-gradient(135deg, #ef4444, #dc2626)'
                      : (isWarmLampOn ? 'linear-gradient(135deg, #f59e0b, #d97706)' : 'linear-gradient(135deg, #0284c7, #0369a1)'),
                    color: '#ffffff',
                    border: 'none',
                    borderRadius: '10px',
                    padding: '7px 16px',
                    fontSize: '0.82rem',
                    fontWeight: 800,
                    cursor: 'pointer',
                    boxShadow: isPlayingMusic ? '0 2px 10px rgba(239, 68, 68, 0.4)' : '0 2px 10px rgba(245, 158, 11, 0.4)',
                  }}
                >
                  {isPlayingMusic ? '⏸ Tắt Nhạc' : '▶️ Bật Nhạc Hoài Niệm'}
                </button>
              </div>
            </div>

            {/* Dropdown danh sách bài hát */}
            {isMusicListOpen && (
              <div
                style={{
                  marginTop: '12px',
                  paddingTop: '12px',
                  borderTop: '1px solid rgba(255, 255, 255, 0.12)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '6px',
                }}
              >
                {CAFE_PLAYLIST.map((track) => {
                  const isSelected = selectedMusic.id === track.id;
                  return (
                    <div
                      key={track.id}
                      onClick={() => {
                        playClickSound();
                        setSelectedMusic(track);
                        setIsPlayingMusic(true);
                        setIsMusicListOpen(false);
                      }}
                      style={{
                        padding: '8px 12px',
                        borderRadius: '10px',
                        background: isSelected ? 'rgba(245, 158, 11, 0.22)' : 'rgba(0, 0, 0, 0.3)',
                        border: isSelected ? '1.5px solid #f59e0b' : '1px solid rgba(255, 255, 255, 0.08)',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        transition: 'background 0.15s ease',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontSize: '1rem' }}>{track.icon}</span>
                        <div>
                          <div style={{ fontSize: '0.82rem', fontWeight: isSelected ? 800 : 600, color: isSelected ? '#fbbf24' : '#e2e8f0' }}>
                            {track.title}
                          </div>
                          <div style={{ fontSize: '0.72rem', color: '#94a3b8' }}>
                            {track.artist} • {track.desc}
                          </div>
                        </div>
                      </div>
                      <span
                        style={{
                          fontSize: '0.7rem',
                          fontWeight: 700,
                          color: isSelected ? '#fbbf24' : '#94a3b8',
                        }}
                      >
                        {isSelected ? 'Đang chọn ✓' : 'Chọn nghe'}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Nhúng iframe YouTube phát audio ngầm sạch sẽ */}
            {isPlayingMusic && (
              <iframe
                key={selectedMusic.id}
                src={`https://www.youtube.com/embed/${selectedMusic.id}?autoplay=1&enablejsapi=1`}
                title={selectedMusic.title}
                allow="autoplay; encrypted-media"
                style={{
                  position: 'absolute',
                  width: '1px',
                  height: '1px',
                  opacity: 0,
                  pointerEvents: 'none',
                  border: 'none',
                }}
              />
            )}
          </div>

          {/* Bàn Trộn Âm Thanh Môi Trường Đa Kênh (Ambient Sound Mixer) */}
          <div
            style={{
              background: isWarmLampOn
                ? 'linear-gradient(160deg, #2b1c11 0%, #1a1008 100%)'
                : 'linear-gradient(160deg, #131c2e 0%, #0a0f1a 100%)',
              border: isWarmLampOn
                ? '1.5px solid rgba(245, 158, 11, 0.4)'
                : '1.5px solid rgba(56, 189, 248, 0.3)',
              borderRadius: '20px',
              padding: '18px 22px',
              boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
              transition: 'background 0.3s ease, border-color 0.3s ease',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px', flexWrap: 'wrap', gap: '10px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '1.3rem' }}>🎛️</span>
                <strong style={{ fontSize: '0.95rem', color: isWarmLampOn ? '#fef08a' : '#e0f2fe', fontWeight: 900 }}>
                  Bàn Trộn Âm Thanh Thư Giãn (Ambient Mixer):
                </strong>
              </div>

              <button
                type="button"
                onClick={() => {
                  playClickSound();
                  setIsPlayingAmbient((p) => {
                    const next = !p;
                    if (!next) {
                      stopAllAmbientNodes();
                    }
                    return next;
                  });
                }}
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

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: '14px' }}>
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

              {/* Kênh 4: Tiếng Mèo Rung Rừ Rừ (Duy Trì Liên Tục) */}
              <div style={{ background: 'rgba(0, 0, 0, 0.4)', padding: '12px 14px', borderRadius: '14px', border: '1px solid rgba(251, 146, 60, 0.35)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem', marginBottom: '8px', fontWeight: 700 }}>
                  <span style={{ color: '#ffedd5' }}>🐱 Mèo Rung Rừ Rừ (Duy trì):</span>
                  <span style={{ color: '#fb923c', fontWeight: 900 }}>{Math.round(ambientVolumes.cat * 100)}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.05"
                  value={ambientVolumes.cat}
                  onChange={(e) => handleVolumeChange('cat', e.target.value)}
                  style={{ width: '100%', accentColor: '#fb923c', cursor: 'pointer' }}
                />
              </div>
            </div>

            {/* Nút bật/tắt nhanh tiếng mèo */}
            <div style={{ marginTop: '14px', display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: '8px' }}>
              <button
                type="button"
                onClick={toggleCatPurr}
                style={{
                  background: ambientVolumes.cat > 0 ? 'rgba(249, 115, 22, 0.25)' : 'transparent',
                  border: ambientVolumes.cat > 0 ? '1px solid #f97316' : '1px solid rgba(255,255,255,0.2)',
                  borderRadius: '999px',
                  padding: '5px 14px',
                  color: ambientVolumes.cat > 0 ? '#ffedd5' : '#fdba74',
                  fontSize: '0.76rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  transition: 'all 0.18s ease',
                }}
              >
                <span>🐱</span>
                <span>{ambientVolumes.cat > 0 ? 'Tiếng Mèo Rừ Rừ: ĐANG PHÁT LIÊN TỤC' : 'Bật tiếng mèo rung rừ rừ (Healing Purr)'}</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

