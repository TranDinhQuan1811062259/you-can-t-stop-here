import React, { useState, useEffect, useRef } from 'react';
import { playClickSound, getAudioContext, isSoundEnabled } from '../../utils/soundEffects';

// Web Audio API: Bộ tạo âm thanh Sóng Não Alpha (Binaural Beats 10Hz) & Tiếng Mưa Dịu
class CocoonAudioEngine {
  constructor() {
    this.ctx = null;
    this.oscLeft = null;
    this.oscRight = null;
    this.noiseNode = null;
    this.gainNode = null;
    this.isPlaying = false;
  }

  start(soundType = 'alpha') {
    this.stop();
    const ctx = getAudioContext();
    if (!ctx) return;
    this.ctx = ctx;

    try {
      this.gainNode = ctx.createGain();
      this.gainNode.gain.setValueAtTime(0.01, ctx.currentTime);
      this.gainNode.gain.exponentialRampToValueAtTime(0.12, ctx.currentTime + 1.5);
      this.gainNode.connect(ctx.destination);

      if (soundType === 'alpha') {
        // Binaural 200Hz + 210Hz => 10Hz Alpha Waves
        this.oscLeft = ctx.createOscillator();
        this.oscRight = ctx.createOscillator();
        const pannerL = ctx.createStereoPanner ? ctx.createStereoPanner() : null;
        const pannerR = ctx.createStereoPanner ? ctx.createStereoPanner() : null;

        this.oscLeft.type = 'sine';
        this.oscRight.type = 'sine';
        this.oscLeft.frequency.setValueAtTime(200, ctx.currentTime);
        this.oscRight.frequency.setValueAtTime(210, ctx.currentTime);

        if (pannerL && pannerR) {
          pannerL.pan.setValueAtTime(-1, ctx.currentTime);
          pannerR.pan.setValueAtTime(1, ctx.currentTime);
          this.oscLeft.connect(pannerL);
          this.oscRight.connect(pannerR);
          pannerL.connect(this.gainNode);
          pannerR.connect(this.gainNode);
        } else {
          this.oscLeft.connect(this.gainNode);
          this.oscRight.connect(this.gainNode);
        }

        this.oscLeft.start();
        this.oscRight.start();
      } else if (soundType === 'rain' || soundType === 'ocean') {
        // Pink / White noise giả lập mưa đêm hoặc sóng biển
        const bufferSize = ctx.sampleRate * 2;
        const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
        const data = buffer.getChannelData(0);
        let b0 = 0, b1 = 0, b2 = 0;
        for (let i = 0; i < bufferSize; i++) {
          const white = Math.random() * 2 - 1;
          b0 = 0.99886 * b0 + white * 0.0555179;
          b1 = 0.99332 * b1 + white * 0.0750759;
          b2 = 0.96900 * b2 + white * 0.1538520;
          data[i] = (b0 + b1 + b2) * 0.15;
        }

        this.noiseNode = ctx.createBufferSource();
        this.noiseNode.buffer = buffer;
        this.noiseNode.loop = true;

        const filter = ctx.createBiquadFilter();
        filter.type = soundType === 'ocean' ? 'bandpass' : 'lowpass';
        filter.frequency.setValueAtTime(soundType === 'ocean' ? 350 : 800, ctx.currentTime);

        this.noiseNode.connect(filter);
        filter.connect(this.gainNode);
        this.noiseNode.start();
      }

      this.isPlaying = true;
    } catch (e) {
      console.warn('Cocoon audio err:', e);
    }
  }

  stop() {
    if (this.ctx && this.gainNode) {
      try {
        this.gainNode.gain.exponentialRampToValueAtTime(0.0001, this.ctx.currentTime + 0.5);
      } catch {}
    }
    setTimeout(() => {
      if (this.oscLeft) {
        try { this.oscLeft.stop(); } catch {}
        this.oscLeft = null;
      }
      if (this.oscRight) {
        try { this.oscRight.stop(); } catch {}
        this.oscRight = null;
      }
      if (this.noiseNode) {
        try { this.noiseNode.stop(); } catch {}
        this.noiseNode = null;
      }
      this.isPlaying = false;
    }, 500);
  }
}

const cocoonAudio = new CocoonAudioEngine();

export const FocusSleepCocoonModal = ({ isOpen, onClose }) => {
  const [mode, setMode] = useState('focus'); // 'focus' | 'sleep'
  const [soundType, setSoundType] = useState('alpha'); // 'alpha' | 'rain' | 'ocean' | 'mute'
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);

  // Timer Focus
  const [focusSeconds, setFocusSeconds] = useState(25 * 60);
  const [isTimerRunning, setIsTimerRunning] = useState(false);

  // Sleep Timer options
  const [sleepMinutes, setSleepMinutes] = useState(30);

  // Mầm cây đã trồng
  const [sproutCount, setSproutCount] = useState(() => {
    try {
      return Number(localStorage.getItem('freedom_cocoon_sprouts') || '3');
    } catch {
      return 3;
    }
  });

  const timerRef = useRef(null);

  // Xử lý đếm ngược Timer
  useEffect(() => {
    if (isTimerRunning && focusSeconds > 0) {
      timerRef.current = setInterval(() => {
        setFocusSeconds((prev) => {
          if (prev <= 1) {
            clearInterval(timerRef.current);
            setIsTimerRunning(false);
            cocoonAudio.stop();
            setIsPlayingAudio(false);
            // Thưởng mầm cây
            setSproutCount((c) => {
              const updated = c + 1;
              try { localStorage.setItem('freedom_cocoon_sprouts', String(updated)); } catch {}
              return updated;
            });
            alert('🎉 Chúc mừng bạn đã hoàn thành trọn vẹn phiên tập trung! Bạn vừa ươm thêm 1 mầm cây xanh vào Khu Vườn Tâm Hồn 🌱');
            return 25 * 60;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isTimerRunning, focusSeconds]);

  // Tự tắt audio khi đóng modal
  useEffect(() => {
    if (!isOpen) {
      setIsTimerRunning(false);
      cocoonAudio.stop();
      setIsPlayingAudio(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleToggleTimer = () => {
    playClickSound();
    if (!isTimerRunning) {
      setIsTimerRunning(true);
      if (soundType !== 'mute') {
        cocoonAudio.start(soundType);
        setIsPlayingAudio(true);
      }
    } else {
      setIsTimerRunning(false);
      cocoonAudio.stop();
      setIsPlayingAudio(false);
    }
  };

  const handleResetTimer = () => {
    playClickSound();
    setIsTimerRunning(false);
    setFocusSeconds(mode === 'focus' ? 25 * 60 : sleepMinutes * 60);
    cocoonAudio.stop();
    setIsPlayingAudio(false);
  };

  const handleChangeSound = (st) => {
    playClickSound();
    setSoundType(st);
    if (isTimerRunning) {
      if (st === 'mute') {
        cocoonAudio.stop();
        setIsPlayingAudio(false);
      } else {
        cocoonAudio.start(st);
        setIsPlayingAudio(true);
      }
    }
  };

  const formatTime = (secs) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <div
      className="wellness-modal-backdrop"
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(7, 10, 19, 0.88)',
        backdropFilter: 'blur(12px)',
        zIndex: 1050,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px',
        animation: 'fadeIn 0.25s ease',
      }}
    >
      <div
        className="focus-cocoon-container"
        onClick={(e) => e.stopPropagation()}
        style={{
          width: '100%',
          maxWidth: '840px',
          maxHeight: '92vh',
          backgroundColor: '#0c101c',
          color: '#f8fafc',
          borderRadius: '26px',
          border: '1.5px solid rgba(45, 212, 191, 0.3)',
          boxShadow: '0 25px 60px -12px rgba(0, 0, 0, 0.75), 0 0 50px rgba(45, 212, 191, 0.15)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          transition: 'all 0.4s ease',
        }}
      >
        {/* Header Modal */}
        <div
          style={{
            padding: '20px 24px',
            borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: 'linear-gradient(90deg, rgba(13, 148, 136, 0.25), rgba(15, 23, 42, 0.95))',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <div
              style={{
                width: '46px',
                height: '46px',
                borderRadius: '14px',
                background: 'linear-gradient(135deg, #14b8a6, #0d9488)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '1.5rem',
                boxShadow: '0 8px 16px rgba(20, 184, 166, 0.3)',
              }}
            >
              🎧
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 700, color: '#f0fdfa' }}>
                  Kén Tập Trung & Ngủ Sâu
                </h3>
                <span
                  style={{
                    fontSize: '0.72rem',
                    padding: '2px 8px',
                    borderRadius: '20px',
                    backgroundColor: 'rgba(45, 212, 191, 0.2)',
                    color: '#2dd4bf',
                    fontWeight: 600,
                  }}
                >
                  Focus & Sleep Cocoon
                </span>
              </div>
              <p style={{ margin: '4px 0 0', fontSize: '0.82rem', color: '#94a3b8' }}>
                Bao bọc giác quan trong không gian tĩnh mịch • Sóng não Alpha & mầm xanh bình yên
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            {/* Chuyển 2 chế độ Focus & Sleep */}
            <div
              style={{
                display: 'flex',
                backgroundColor: 'rgba(30, 41, 59, 0.8)',
                borderRadius: '12px',
                padding: '3px',
                border: '1px solid rgba(255, 255, 255, 0.08)',
              }}
            >
              <button
                type="button"
                onClick={() => {
                  playClickSound();
                  setMode('focus');
                  setFocusSeconds(25 * 60);
                  setIsTimerRunning(false);
                  cocoonAudio.stop();
                  setIsPlayingAudio(false);
                }}
                style={{
                  border: 'none',
                  background: mode === 'focus' ? '#0d9488' : 'transparent',
                  color: mode === 'focus' ? '#ffffff' : '#94a3b8',
                  padding: '6px 14px',
                  borderRadius: '9px',
                  fontSize: '0.8rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                }}
              >
                🎯 Tập Trung Sâu
              </button>
              <button
                type="button"
                onClick={() => {
                  playClickSound();
                  setMode('sleep');
                  setFocusSeconds(sleepMinutes * 60);
                  setIsTimerRunning(false);
                  cocoonAudio.stop();
                  setIsPlayingAudio(false);
                }}
                style={{
                  border: 'none',
                  background: mode === 'sleep' ? '#4f46e5' : 'transparent',
                  color: mode === 'sleep' ? '#ffffff' : '#94a3b8',
                  padding: '6px 14px',
                  borderRadius: '9px',
                  fontSize: '0.8rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                }}
              >
                🌙 Kén Ngủ Êm
              </button>
            </div>

            <button
              type="button"
              onClick={onClose}
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '10px',
                backgroundColor: 'rgba(255, 255, 255, 0.06)',
                border: 'none',
                color: '#cbd5e1',
                fontSize: '1.1rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              ✕
            </button>
          </div>
        </div>

        {/* Thân Kén */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '24px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '24px' }}>
          {/* Đồng Hồ Đếm Ngược Phát Sáng */}
          <div
            style={{
              width: '240px',
              height: '240px',
              borderRadius: '50%',
              background: mode === 'focus'
                ? 'radial-gradient(circle at 50% 50%, rgba(20, 184, 166, 0.15) 0%, rgba(12, 16, 28, 0.95) 75%)'
                : 'radial-gradient(circle at 50% 50%, rgba(99, 102, 241, 0.15) 0%, rgba(12, 16, 28, 0.95) 75%)',
              border: mode === 'focus' ? '3px solid #14b8a6' : '3px solid #6366f1',
              boxShadow: isTimerRunning
                ? (mode === 'focus' ? '0 0 45px rgba(20, 184, 166, 0.4)' : '0 0 45px rgba(99, 102, 241, 0.4)')
                : '0 8px 24px rgba(0, 0, 0, 0.4)',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              position: 'relative',
              transition: 'all 0.4s ease',
              animation: isTimerRunning ? 'pulse 3s ease infinite' : 'none',
            }}
          >
            <span style={{ fontSize: '0.85rem', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: 600 }}>
              {mode === 'focus' ? 'Thời Gian Sâu' : 'Hẹn Giờ Tắt Âm'}
            </span>
            <div
              style={{
                fontSize: '3.6rem',
                fontWeight: 800,
                color: '#ffffff',
                fontFamily: 'monospace',
                letterSpacing: '2px',
                margin: '6px 0',
              }}
            >
              {formatTime(focusSeconds)}
            </div>
            <span style={{ fontSize: '0.8rem', color: mode === 'focus' ? '#2dd4bf' : '#a5b4fc', fontWeight: 600 }}>
              {isTimerRunning ? 'Đang kích hoạt...' : 'Sẵn sàng bắt đầu'}
            </span>
          </div>

          {/* Cụm Nút Điều Khiển Timer */}
          <div style={{ display: 'flex', gap: '14px', alignItems: 'center' }}>
            <button
              type="button"
              onClick={handleToggleTimer}
              style={{
                backgroundColor: isTimerRunning ? '#e11d48' : (mode === 'focus' ? '#0d9488' : '#4f46e5'),
                color: '#ffffff',
                border: 'none',
                padding: '12px 36px',
                borderRadius: '30px',
                fontSize: '1rem',
                fontWeight: 700,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                boxShadow: '0 8px 20px rgba(0, 0, 0, 0.3)',
                transition: 'all 0.2s',
              }}
            >
              <span>{isTimerRunning ? '⏸️ Tạm Dừng' : '▶️ Bắt Đầu Phiên'}</span>
            </button>

            <button
              type="button"
              onClick={handleResetTimer}
              style={{
                backgroundColor: 'rgba(255, 255, 255, 0.08)',
                color: '#cbd5e1',
                border: '1px solid rgba(255, 255, 255, 0.15)',
                padding: '12px 20px',
                borderRadius: '30px',
                fontSize: '0.9rem',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              🔄 Đặt Lại
            </button>
          </div>

          {/* Bộ Chọn Âm Thanh Nền Thư Giãn (Soundscapes) */}
          <div
            style={{
              width: '100%',
              backgroundColor: 'rgba(30, 41, 59, 0.5)',
              borderRadius: '20px',
              padding: '18px 20px',
              border: '1px solid rgba(255, 255, 255, 0.08)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
              <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#f8fafc' }}>
                🎵 Âm thanh sóng não & thiên nhiên (Bật cùng phiên đếm ngược):
              </span>
              {isPlayingAudio && (
                <span style={{ fontSize: '0.75rem', color: '#34d399', fontWeight: 600 }}>
                  ● Đang phát sóng êm dịu
                </span>
              )}
            </div>

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
                gap: '10px',
              }}
            >
              {[
                { id: 'alpha', label: 'Sóng Não Alpha 10Hz', icon: '🧠', desc: 'Tăng tập trung & thư giãn' },
                { id: 'rain', label: 'Mưa Rừng Êm Dịu', icon: '🌧️', desc: 'Rào rào xoa dịu thần kinh' },
                { id: 'ocean', label: 'Sóng Biển Đêm', icon: '🌊', desc: 'Vỗ về từng nhịp thở' },
                { id: 'mute', label: 'Im Lặng Tuyệt Đối', icon: '🔇', desc: 'Không âm thanh' },
              ].map((s) => {
                const isActive = soundType === s.id;
                return (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => handleChangeSound(s.id)}
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'flex-start',
                      padding: '10px 14px',
                      borderRadius: '12px',
                      border: isActive ? '1.5px solid #2dd4bf' : '1px solid rgba(255, 255, 255, 0.08)',
                      backgroundColor: isActive ? 'rgba(45, 212, 191, 0.15)' : 'rgba(15, 23, 42, 0.6)',
                      cursor: 'pointer',
                      textAlign: 'left',
                      transition: 'all 0.2s',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '2px' }}>
                      <span>{s.icon}</span>
                      <span style={{ fontSize: '0.82rem', fontWeight: 700, color: isActive ? '#2dd4bf' : '#ffffff' }}>
                        {s.label}
                      </span>
                    </div>
                    <span style={{ fontSize: '0.7rem', color: '#94a3b8' }}>{s.desc}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Khu Vườn Tâm Hồn (Sprout Garden) */}
          <div
            style={{
              width: '100%',
              backgroundColor: 'rgba(16, 185, 129, 0.08)',
              border: '1px solid rgba(16, 185, 129, 0.25)',
              borderRadius: '18px',
              padding: '14px 20px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '12px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <span style={{ fontSize: '1.8rem' }}>🌱</span>
              <div>
                <div style={{ fontSize: '0.9rem', fontWeight: 700, color: '#34d399' }}>
                  Khu Vườn Bình Yên: Đã ươm {sproutCount} mầm cây
                </div>
                <div style={{ fontSize: '0.78rem', color: '#cbd5e1' }}>
                  Mỗi lần hoàn thành 25 phút tập trung hoặc 1 phiên ngủ ngon, một mầm xanh hy vọng sẽ nảy mầm.
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '4px' }}>
              {Array.from({ length: Math.min(sproutCount, 10) }).map((_, i) => (
                <span key={i} style={{ fontSize: '1.1rem' }}>🌱</span>
              ))}
              {sproutCount > 10 && <span style={{ fontSize: '0.8rem', color: '#34d399', fontWeight: 700 }}>+{sproutCount - 10}</span>}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div
          style={{
            padding: '14px 24px',
            borderTop: '1px solid rgba(255, 255, 255, 0.08)',
            backgroundColor: 'rgba(15, 23, 42, 0.95)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            fontSize: '0.78rem',
            color: '#94a3b8',
          }}
        >
          <span>🎧 Không gian an tĩnh • Bảo vệ sự tập trung và giấc ngủ của bạn</span>
          <button
            type="button"
            onClick={onClose}
            style={{
              padding: '6px 16px',
              backgroundColor: 'rgba(255, 255, 255, 0.1)',
              border: 'none',
              borderRadius: '8px',
              color: '#ffffff',
              cursor: 'pointer',
              fontWeight: 600,
            }}
          >
            Đóng Kén
          </button>
        </div>
      </div>
    </div>
  );
};
