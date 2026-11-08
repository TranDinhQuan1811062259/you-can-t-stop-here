import React, { useState, useEffect, useRef } from 'react';
import { playClickSound } from '../../utils/soundEffects';

let radioAudioCtx = null;
let isRadioPlayingInternal = false;
let rainNode = null;
let vinylNode = null;
let melodyInterval = null;
let masterGainNode = null;

// Lofi Chord notes (Frequencies in Hz)
const CHORDS = [
  [146.83, 220.0, 277.18, 369.99], // Dmaj7
  [185.0, 220.0, 277.18, 369.99],  // F#m7
  [196.0, 246.94, 293.66, 392.0],  // Gmaj7
  [220.0, 277.18, 329.63, 440.0],  // A7
];

const startLofiSoundEngine = (volume = 0.5) => {
  if (isRadioPlayingInternal) return;

  const AudioContextClass = window.AudioContext || window.webkitAudioContext;
  if (!AudioContextClass) return;

  radioAudioCtx = new AudioContextClass();
  if (radioAudioCtx.state === 'suspended') {
    radioAudioCtx.resume().catch(() => {});
  }

  masterGainNode = radioAudioCtx.createGain();
  masterGainNode.gain.setValueAtTime(volume, radioAudioCtx.currentTime);
  masterGainNode.connect(radioAudioCtx.destination);

  // 1. Tiếng mưa rơi êm dịu (Pink Noise filtered)
  try {
    const bufferSize = radioAudioCtx.sampleRate * 2;
    const noiseBuffer = radioAudioCtx.createBuffer(1, bufferSize, radioAudioCtx.sampleRate);
    const output = noiseBuffer.getChannelData(0);
    let b0 = 0, b1 = 0, b2 = 0;
    for (let i = 0; i < bufferSize; i++) {
      const white = Math.random() * 2 - 1;
      b0 = 0.99886 * b0 + white * 0.0555179;
      b1 = 0.99332 * b1 + white * 0.0750759;
      b2 = 0.96900 * b2 + white * 0.1538520;
      output[i] = (b0 + b1 + b2 + white * 0.5362) * 0.08;
    }

    rainNode = radioAudioCtx.createBufferSource();
    rainNode.buffer = noiseBuffer;
    rainNode.loop = true;

    const rainFilter = radioAudioCtx.createBiquadFilter();
    rainFilter.type = 'lowpass';
    rainFilter.frequency.setValueAtTime(950, radioAudioCtx.currentTime);

    const rainGain = radioAudioCtx.createGain();
    rainGain.gain.setValueAtTime(0.22, radioAudioCtx.currentTime);

    rainNode.connect(rainFilter);
    rainFilter.connect(rainGain);
    rainGain.connect(masterGainNode);
    rainNode.start();
  } catch (e) {}

  // 2. Tiếng đĩa than Vinyl Crackle lách tách ấm
  try {
    const bufferSize = radioAudioCtx.sampleRate * 1.5;
    const crackleBuffer = radioAudioCtx.createBuffer(1, bufferSize, radioAudioCtx.sampleRate);
    const data = crackleBuffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() > 0.992 ? (Math.random() * 2 - 1) * 0.25 : 0;
    }

    vinylNode = radioAudioCtx.createBufferSource();
    vinylNode.buffer = crackleBuffer;
    vinylNode.loop = true;

    const vinylFilter = radioAudioCtx.createBiquadFilter();
    vinylFilter.type = 'bandpass';
    vinylFilter.frequency.setValueAtTime(2500, radioAudioCtx.currentTime);

    const vinylGain = radioAudioCtx.createGain();
    vinylGain.gain.setValueAtTime(0.18, radioAudioCtx.currentTime);

    vinylNode.connect(vinylFilter);
    vinylFilter.connect(vinylGain);
    vinylGain.connect(masterGainNode);
    vinylNode.start();
  } catch (e) {}

  // 3. Hợp âm Rhodes / Piano Lo-Fi rải nhẹ nhàng
  let chordIndex = 0;
  const playNextChord = () => {
    if (!radioAudioCtx || radioAudioCtx.state === 'closed') return;
    const notes = CHORDS[chordIndex % CHORDS.length];
    chordIndex++;

    notes.forEach((freq, i) => {
      const now = radioAudioCtx.currentTime + i * 0.08;
      const osc = radioAudioCtx.createOscillator();
      const gain = radioAudioCtx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now);

      gain.gain.setValueAtTime(0.001, now);
      gain.gain.linearRampToValueAtTime(0.08, now + 0.15);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 3.2);

      osc.connect(gain);
      gain.connect(masterGainNode);

      osc.start(now);
      osc.stop(now + 3.4);
    });
  };

  playNextChord();
  melodyInterval = setInterval(playNextChord, 3800);
  isRadioPlayingInternal = true;
};

const stopLofiSoundEngine = () => {
  if (melodyInterval) {
    clearInterval(melodyInterval);
    melodyInterval = null;
  }
  if (rainNode) {
    try {
      rainNode.stop();
      rainNode.disconnect();
    } catch (e) {}
    rainNode = null;
  }
  if (vinylNode) {
    try {
      vinylNode.stop();
      vinylNode.disconnect();
    } catch (e) {}
    vinylNode = null;
  }
  if (radioAudioCtx) {
    try {
      radioAudioCtx.close();
    } catch (e) {}
    radioAudioCtx = null;
  }
  isRadioPlayingInternal = false;
};

const setRadioEngineVolume = (vol) => {
  if (masterGainNode && radioAudioCtx) {
    masterGainNode.gain.setValueAtTime(vol, radioAudioCtx.currentTime);
  }
};

const DEFAULT_THOUGHTS = [
  '🌙 Dù hôm nay có mệt mỏi thế nào, bạn cũng đã làm rất tốt rồi! Nghỉ ngơi nhé.',
  '☕ Bật nhạc lên, hít một hơi thật sâu, ngày mai sẽ dịu dàng hơn.',
  '✨ Gửi một cái ôm ấm áp đến những bạn đang chạy deadline đêm muộn lúc này!',
  '🌿 Đừng so sánh hành trình của mình với người khác. Mỗi bông hoa nở vào một mùa riêng.',
  '🌧️ Ngồi nghe tiếng mưa lách tách, mọi muộn phiền ngoài kia tạm thời gác lại...',
  '💡 Nhớ uống một ngụm nước ấm và vươn vai thư giãn mắt nhé!',
];

export const LateNightRadioModal = ({ isOpen, onClose }) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [volume, setVolume] = useState(0.5);
  const [isMiniMode, setIsMiniMode] = useState(false);
  const [thoughts, setThoughts] = useState(() => {
    try {
      const saved = localStorage.getItem('freedom_radio_thoughts');
      if (saved) return JSON.parse(saved);
    } catch (e) {}
    return DEFAULT_THOUGHTS;
  });
  const [myThoughtInput, setMyThoughtInput] = useState('');
  const [activeThoughtIndex, setActiveThoughtIndex] = useState(0);

  // Tính số lượng bạn bè đang nghe dựa trên thời gian thực
  const getListenersCount = () => {
    const hour = new Date().getHours();
    if (hour >= 0 && hour <= 4) return 18 + (hour * 3) + Math.floor(Math.sin(Date.now() / 10000) * 4);
    if (hour >= 5 && hour <= 8) return 35 + (hour * 2);
    if (hour >= 9 && hour <= 17) return 65 + (hour % 10);
    return 85 + (hour * 2);
  };
  const [listenerCount, setListenerCount] = useState(getListenersCount());

  useEffect(() => {
    const timer = setInterval(() => {
      setListenerCount(getListenersCount());
      setActiveThoughtIndex((prev) => (prev + 1) % thoughts.length);
    }, 6000);
    return () => clearInterval(timer);
  }, [thoughts.length]);

  const handleTogglePlay = () => {
    playClickSound();
    if (isPlaying) {
      stopLofiSoundEngine();
      setIsPlaying(false);
    } else {
      startLofiSoundEngine(volume);
      setIsPlaying(true);
    }
  };

  const handleVolumeChange = (newVol) => {
    setVolume(newVol);
    setRadioEngineVolume(newVol);
  };

  const handleSendThought = (e) => {
    e.preventDefault();
    if (!myThoughtInput.trim()) return;
    playClickSound();

    const newThought = `✨ ${myThoughtInput.trim()}`;
    const updated = [newThought, ...thoughts.slice(0, 15)];
    setThoughts(updated);
    setActiveThoughtIndex(0);
    setMyThoughtInput('');
    try {
      localStorage.setItem('freedom_radio_thoughts', JSON.stringify(updated));
    } catch (e) {}
  };

  // Nếu người dùng thu nhỏ thành Mini Mode, hiển thị thanh nổi ở góc
  if (isMiniMode && isPlaying) {
    return (
      <div
        className="mini-lofi-radio-pill"
        onClick={() => {
          playClickSound();
          setIsMiniMode(false);
        }}
        title="Bấm để mở rộng Trạm Radio Lo-Fi Đêm Muộn"
        style={{
          position: 'fixed',
          bottom: '86px',
          right: '24px',
          zIndex: 99990,
          background: 'linear-gradient(135deg, rgba(30, 27, 75, 0.95), rgba(15, 23, 42, 0.95))',
          border: '1.5px solid #818cf8',
          borderRadius: '9999px',
          padding: '8px 18px',
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          boxShadow: '0 8px 25px rgba(0, 0, 0, 0.6), 0 0 15px rgba(99, 102, 241, 0.4)',
          cursor: 'pointer',
          color: '#e0e7ff',
          fontSize: '0.85rem',
          fontWeight: 700,
          backdropFilter: 'blur(10px)',
          animation: 'fadeInUp 0.3s ease',
        }}
      >
        <span style={{ fontSize: '1.2rem', animation: 'spin 8s linear infinite' }}>📻</span>
        <span>Lo-Fi Radio Đang Phát</span>
        <div style={{ display: 'flex', gap: '2px', alignItems: 'flex-end', height: '14px' }}>
          <span style={{ width: '3px', height: '12px', background: '#a5b4fc', borderRadius: '2px', animation: 'pulseDot 0.8s infinite alternate' }} />
          <span style={{ width: '3px', height: '8px', background: '#818cf8', borderRadius: '2px', animation: 'pulseDot 1.1s infinite alternate' }} />
          <span style={{ width: '3px', height: '14px', background: '#c7d2fe', borderRadius: '2px', animation: 'pulseDot 0.6s infinite alternate' }} />
        </div>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            handleTogglePlay();
          }}
          style={{
            background: 'rgba(255, 255, 255, 0.1)',
            border: 'none',
            borderRadius: '50%',
            color: '#fff',
            width: '24px',
            height: '24px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
          }}
        >
          ⏸
        </button>
      </div>
    );
  }

  if (!isOpen) return null;

  return (
    <div
      className="late-night-radio-overlay"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 99999,
        background: 'rgba(5, 5, 20, 0.88)',
        backdropFilter: 'blur(14px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px',
        animation: 'fadeIn 0.25s ease-out',
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          playClickSound();
          onClose();
        }
      }}
    >
      <div
        className="late-night-radio-card"
        style={{
          width: '100%',
          maxWidth: '560px',
          background: 'linear-gradient(160deg, #0b0f19 0%, #1e1b4b 60%, #090d16 100%)',
          border: '1.5px solid rgba(129, 140, 248, 0.35)',
          borderRadius: '28px',
          boxShadow: '0 25px 60px rgba(0, 0, 0, 0.8), 0 0 40px rgba(99, 102, 241, 0.25)',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          color: '#f8fafc',
          position: 'relative',
        }}
      >
        {/* Top Header */}
        <div
          style={{
            padding: '18px 24px',
            borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: 'rgba(15, 23, 42, 0.6)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <span className="healing-icon-pill healing-icon-rose" style={{ width: '40px', height: '40px', fontSize: '1.15rem' }}>
              <i className="fa-solid fa-radio"></i>
            </span>
            <div>
              <h2 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 800, color: '#e0e7ff' }}>
                Trạm Radio Đêm Muộn 24/7
              </h2>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.78rem', color: '#34d399' }}>
                <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#34d399', boxShadow: '0 0 6px #34d399' }} />
                <span>Đang cùng thức: <strong>{listenerCount} người bạn</strong></span>
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {isPlaying && (
              <button
                type="button"
                onClick={() => {
                  playClickSound();
                  setIsMiniMode(true);
                  onClose();
                }}
                title="Thu nhỏ để vừa nghe vừa đọc bài"
                style={{
                  background: 'rgba(255, 255, 255, 0.08)',
                  border: '1px solid rgba(255, 255, 255, 0.15)',
                  borderRadius: '10px',
                  color: '#cbd5e1',
                  padding: '5px 10px',
                  fontSize: '0.76rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '5px',
                }}
              >
                <i className="fa-regular fa-window-minimize"></i> Thu Nhỏ
              </button>
            )}
            <button
              type="button"
              onClick={() => {
                playClickSound();
                onClose();
              }}
              style={{
                background: 'rgba(255, 255, 255, 0.08)',
                border: 'none',
                color: '#cbd5e1',
                width: '32px',
                height: '32px',
                borderRadius: '50%',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '0.95rem',
              }}
            >
              <i className="fa-solid fa-xmark"></i>
            </button>
          </div>
        </div>

        {/* Radio Retro Visualizer Center */}
        <div style={{ padding: '26px 24px', textAlign: 'center', position: 'relative' }}>
          {/* Cụm loa Retro & Hào quang */}
          <div
            style={{
              width: '130px',
              height: '130px',
              margin: '0 auto 18px',
              borderRadius: '50%',
              background: isPlaying
                ? 'radial-gradient(circle, #4338ca 0%, #1e1b4b 60%, #0f172a 100%)'
                : 'radial-gradient(circle, #334155 0%, #1e293b 100%)',
              border: isPlaying ? '3px solid #818cf8' : '3px solid #475569',
              boxShadow: isPlaying ? '0 0 35px rgba(129, 140, 248, 0.5)' : 'none',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              transition: 'all 0.3s ease',
            }}
            onClick={handleTogglePlay}
          >
            <span style={{ fontSize: '2.6rem' }}>{isPlaying ? '⏸' : '▶️'}</span>
          </div>

          <h3 style={{ margin: '0 0 6px', fontSize: '1.15rem', color: '#f1f5f9', fontWeight: 700 }}>
            {isPlaying ? 'Lo-Fi Jazz Piano & Mưa Rơi Đêm' : 'Chạm Vào Loa Để Bật Nhạc'}
          </h3>
          <p style={{ margin: '0 0 16px', fontSize: '0.82rem', color: '#94a3b8' }}>
            Hòa âm: Tiếng mưa rơi êm dịu • Đĩa than vinyl lách tách • Hợp âm Rhodes chữa lành
          </p>

          {/* Dải sóng âm thanh */}
          {isPlaying && (
            <div style={{ display: 'flex', justifyContent: 'center', gap: '4px', height: '28px', alignItems: 'flex-end', marginBottom: '16px' }}>
              {[18, 26, 14, 28, 20, 10, 24, 16, 28, 22, 12, 26, 18].map((h, i) => (
                <span
                  key={i}
                  style={{
                    width: '4px',
                    height: `${h}px`,
                    background: 'linear-gradient(to top, #6366f1, #a5b4fc)',
                    borderRadius: '3px',
                    animation: `pulseDot ${0.5 + (i % 5) * 0.2}s infinite alternate`,
                  }}
                />
              ))}
            </div>
          )}

          {/* Thanh Âm Lượng */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px', maxWidth: '300px', margin: '0 auto' }}>
            <span style={{ fontSize: '0.9rem' }}>🔈</span>
            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={volume}
              onChange={(e) => handleVolumeChange(parseFloat(e.target.value))}
              style={{ flex: 1, accentColor: '#818cf8', cursor: 'pointer' }}
            />
            <span style={{ fontSize: '0.9rem' }}>🔊</span>
          </div>
        </div>

        {/* Dải Lời Nhắn Vô Danh (Live Anonymous Thoughts) */}
        <div
          style={{
            background: 'rgba(0, 0, 0, 0.35)',
            borderTop: '1px solid rgba(255, 255, 255, 0.08)',
            padding: '16px 24px',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
            <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#a5b4fc' }}>
              💬 LỜI NHẮN ĐỘNG VIÊN VÔ DANH
            </span>
            <span style={{ fontSize: '0.72rem', color: '#64748b' }}>Tự động đổi mỗi 6s</span>
          </div>

          <div
            style={{
              padding: '12px 16px',
              borderRadius: '12px',
              background: 'rgba(99, 102, 241, 0.12)',
              border: '1px solid rgba(129, 140, 248, 0.25)',
              color: '#e0e7ff',
              fontSize: '0.88rem',
              lineHeight: '1.5',
              fontStyle: 'italic',
              minHeight: '44px',
              display: 'flex',
              alignItems: 'center',
              animation: 'fadeIn 0.4s ease',
            }}
          >
            {thoughts[activeThoughtIndex] || DEFAULT_THOUGHTS[0]}
          </div>

          {/* Ô Gửi Lời Nhắn Vô Danh */}
          <form onSubmit={handleSendThought} style={{ marginTop: '12px', display: 'flex', gap: '8px' }}>
            <input
              type="text"
              placeholder="Gửi một lời chúc ấm áp cho những người cùng nghe..."
              value={myThoughtInput}
              onChange={(e) => setMyThoughtInput(e.target.value)}
              maxLength={120}
              style={{
                flex: 1,
                padding: '10px 14px',
                borderRadius: '10px',
                background: 'rgba(255, 255, 255, 0.06)',
                border: '1px solid rgba(255, 255, 255, 0.15)',
                color: '#fff',
                fontSize: '0.85rem',
                outline: 'none',
              }}
            />
            <button
              type="submit"
              disabled={!myThoughtInput.trim()}
              style={{
                padding: '10px 18px',
                borderRadius: '10px',
                background: myThoughtInput.trim() ? '#6366f1' : 'rgba(255, 255, 255, 0.1)',
                border: 'none',
                color: '#fff',
                fontWeight: 700,
                fontSize: '0.84rem',
                cursor: myThoughtInput.trim() ? 'pointer' : 'default',
                transition: 'all 0.2s ease',
              }}
            >
              Gửi ✨
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};
