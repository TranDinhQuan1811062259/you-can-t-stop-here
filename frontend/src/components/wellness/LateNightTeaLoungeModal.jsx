import React, { useState, useEffect, useRef } from 'react';
import { playClickSound, getAudioContext, isSoundEnabled } from '../../utils/soundEffects';

// Web Audio API: Tiếng rót nước trà róc rách
const playTeaPourSound = () => {
  if (!isSoundEnabled()) return;
  const ctx = getAudioContext();
  if (!ctx) return;
  try {
    const now = ctx.currentTime;
    for (let i = 0; i < 4; i++) {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      const startFreq = 600 + Math.random() * 300;
      osc.frequency.setValueAtTime(startFreq, now + i * 0.08);
      osc.frequency.exponentialRampToValueAtTime(startFreq + 200, now + i * 0.08 + 0.06);
      gain.gain.setValueAtTime(0.15, now + i * 0.08);
      gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.08 + 0.08);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now + i * 0.08);
      osc.stop(now + i * 0.08 + 0.08);
    }
  } catch (e) {
    console.warn('Audio err:', e);
  }
};

// Web Audio API: Tiếng chuông gió pha lê leng keng
const playWindChimeSound = () => {
  if (!isSoundEnabled()) return;
  const ctx = getAudioContext();
  if (!ctx) return;
  try {
    const now = ctx.currentTime;
    const notes = [1046.5, 1174.66, 1318.51, 1567.98, 1760.0];
    notes.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now + idx * 0.07);
      gain.gain.setValueAtTime(0.18, now + idx * 0.07);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + idx * 0.07 + 0.9);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now + idx * 0.07);
      osc.stop(now + idx * 0.07 + 0.9);
    });
  } catch (e) {
    console.warn('Audio err:', e);
  }
};

// Web Audio API: Tiếng quẹt diêm thắp nến ấm
const playCandleLightSound = () => {
  if (!isSoundEnabled()) return;
  const ctx = getAudioContext();
  if (!ctx) return;
  try {
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(320, now);
    osc.frequency.exponentialRampToValueAtTime(540, now + 0.12);
    gain.gain.setValueAtTime(0.2, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.25);
  } catch (e) {
    console.warn('Audio err:', e);
  }
};

const DEFAULT_TEA_NOTES = [
  { id: 1, text: 'Vừa xong bản vẽ lúc 1h30 sáng, rót chén trà thấy lòng dịu lại.', time: '5 phút trước' },
  { id: 2, text: 'Chúc ai đó đang còn thức sẽ có một giấc ngủ thật sâu và bình an.', time: '12 phút trước' },
  { id: 3, text: 'Hôm nay mệt thật đấy, nhưng may quá vẫn có góc trà ấm này.', time: '25 phút trước' },
  { id: 4, text: 'Ngày mai sẽ là một ngày nhẹ nhàng hơn, cố lên tôi ơi!', time: '40 phút trước' },
];

export const LateNightTeaLoungeModal = ({ isOpen, onClose }) => {
  const [onlineCount, setOnlineCount] = useState(23);
  const [teaCount, setTeaCount] = useState(148);
  const [isLampOn, setIsLampOn] = useState(true);
  const [isPouring, setIsPouring] = useState(false);
  const [isChiming, setIsChiming] = useState(false);
  const [hugSentNotice, setHugSentNotice] = useState('');
  const [noteInput, setNoteInput] = useState('');
  const [guestNotes, setGuestNotes] = useState(() => {
    try {
      const saved = localStorage.getItem('freedom_tea_lounge_notes');
      return saved ? JSON.parse(saved) : DEFAULT_TEA_NOTES;
    } catch {
      return DEFAULT_TEA_NOTES;
    }
  });

  useEffect(() => {
    if (isOpen) {
      // Số người cùng hiện diện dao động tự nhiên theo giờ
      const h = new Date().getHours();
      const base = h >= 22 || h <= 4 ? 28 : 15;
      setOnlineCount(base + Math.floor(Math.random() * 9));
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handlePourTea = () => {
    if (isPouring) return;
    playTeaPourSound();
    setIsPouring(true);
    setTeaCount((prev) => prev + 1);
    setTimeout(() => {
      setIsPouring(false);
    }, 1200);
  };

  const handleToggleLamp = () => {
    playCandleLightSound();
    setIsLampOn((prev) => !prev);
  };

  const handleRingChime = () => {
    if (isChiming) return;
    playWindChimeSound();
    setIsChiming(true);
    setTimeout(() => setIsChiming(false), 1000);
  };

  const handleSendWarmHug = () => {
    playClickSound();
    setHugSentNotice('✨ Một cái ôm ấm áp vừa được gửi tới một người bạn đang thức khuya!');
    setTimeout(() => setHugSentNotice(''), 3500);
  };

  const handleAddNote = (e) => {
    e.preventDefault();
    if (!noteInput.trim()) return;
    playClickSound();
    const newNote = {
      id: Date.now(),
      text: noteInput.trim().slice(0, 70),
      time: 'Vừa xong',
    };
    const updated = [newNote, ...guestNotes].slice(0, 15);
    setGuestNotes(updated);
    setNoteInput('');
    try {
      localStorage.setItem('freedom_tea_lounge_notes', JSON.stringify(updated));
    } catch (e) {
      console.warn('Err:', e);
    }
  };

  return (
    <div
      className="wellness-modal-backdrop"
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(10, 15, 29, 0.82)',
        backdropFilter: 'blur(10px)',
        zIndex: 1050,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px',
        animation: 'fadeIn 0.25s ease',
      }}
    >
      <div
        className="tea-lounge-container"
        onClick={(e) => e.stopPropagation()}
        style={{
          width: '100%',
          maxWidth: '850px',
          maxHeight: '92vh',
          backgroundColor: isLampOn ? '#171a26' : '#0e111a',
          color: '#f8fafc',
          borderRadius: '24px',
          border: '1.5px solid rgba(245, 158, 11, 0.25)',
          boxShadow: isLampOn
            ? '0 25px 60px -12px rgba(0, 0, 0, 0.7), 0 0 50px rgba(245, 158, 11, 0.12)'
            : '0 25px 60px -12px rgba(0, 0, 0, 0.9)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          transition: 'background-color 0.4s ease, box-shadow 0.4s ease',
        }}
      >
        {/* Header Quán Trà */}
        <div
          style={{
            padding: '20px 24px',
            borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: 'linear-gradient(90deg, rgba(30, 27, 46, 0.95), rgba(15, 23, 42, 0.95))',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <div
              style={{
                width: '46px',
                height: '46px',
                borderRadius: '14px',
                background: 'linear-gradient(135deg, #d97706, #b45309)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '1.5rem',
                boxShadow: '0 8px 16px rgba(217, 119, 6, 0.3)',
              }}
            >
              🍵
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 700, color: '#fef3c7' }}>
                  Quán Trà Nửa Đêm Ẩn Danh
                </h3>
                <span
                  style={{
                    fontSize: '0.72rem',
                    padding: '2px 8px',
                    borderRadius: '20px',
                    backgroundColor: 'rgba(245, 158, 11, 0.2)',
                    color: '#fbbf24',
                    fontWeight: 600,
                  }}
                >
                  Late-Night Tea Lounge
                </span>
              </div>
              <p style={{ margin: '4px 0 0', fontSize: '0.82rem', color: '#94a3b8' }}>
                Không gian đồng hành thầm lặng • Ngồi bên khung cửa sổ mưa đêm cùng những người bạn phương xa
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            {/* Bộ đếm người cùng thức */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                backgroundColor: 'rgba(245, 158, 11, 0.12)',
                border: '1px solid rgba(245, 158, 11, 0.3)',
                padding: '6px 14px',
                borderRadius: '20px',
              }}
            >
              <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#10b981', display: 'inline-block', boxShadow: '0 0 8px #10b981' }} />
              <span style={{ fontSize: '0.8rem', color: '#fef3c7', fontWeight: 600 }}>
                {onlineCount} người đang cùng thức
              </span>
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
              title="Rời quán trà"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Thân Quán Trà */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '24px', display: 'flex', flexDirection: 'column', gap: '22px' }}>
          {/* Cửa sổ mưa đêm và Bàn Trà */}
          <div
            style={{
              position: 'relative',
              borderRadius: '20px',
              padding: '28px 24px',
              background: isLampOn
                ? 'radial-gradient(ellipse at 50% 30%, rgba(245, 158, 11, 0.22) 0%, rgba(17, 24, 39, 0.95) 70%)'
                : 'linear-gradient(180deg, rgba(15, 23, 42, 0.9), rgba(10, 15, 29, 0.95))',
              border: '1.5px solid rgba(245, 158, 11, 0.25)',
              boxShadow: isLampOn ? 'inset 0 0 40px rgba(245, 158, 11, 0.1)' : 'none',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              textAlign: 'center',
              overflow: 'hidden',
              transition: 'all 0.4s ease',
            }}
          >
            {/* Hơi khói trà bay lên */}
            <div
              style={{
                fontSize: '3.5rem',
                marginBottom: '10px',
                position: 'relative',
                animation: isPouring ? 'bounce 0.6s ease infinite' : 'none',
              }}
            >
              🍵
              {/* Khói hơi nước */}
              <div
                style={{
                  position: 'absolute',
                  top: '-15px',
                  left: '50%',
                  transform: 'translateX(-50%)',
                  fontSize: '1.4rem',
                  opacity: 0.8,
                  animation: 'pulse 2s ease infinite',
                }}
              >
                ♨️
              </div>
            </div>

            <h4 style={{ margin: 0, fontSize: '1.3rem', fontWeight: 700, color: '#fef3c7' }}>
              Một ngụm trà ấm giữa đêm khuya tịch mịch
            </h4>
            <p style={{ margin: '8px 0 18px', fontSize: '0.88rem', color: '#cbd5e1', maxWidth: '520px', lineHeight: 1.6 }}>
              Dù hôm nay có bao nhiêu deadline dang dở hay điều gì làm bạn chạnh lòng, lúc này hãy thả lỏng hai vai. Đêm nay bạn không hề đơn độc một mình.
            </p>

            {/* Thông báo gửi ôm */}
            {hugSentNotice && (
              <div
                style={{
                  backgroundColor: 'rgba(236, 72, 153, 0.2)',
                  border: '1px solid rgba(236, 72, 153, 0.4)',
                  color: '#f472b6',
                  padding: '8px 16px',
                  borderRadius: '20px',
                  fontSize: '0.82rem',
                  fontWeight: 600,
                  marginBottom: '14px',
                  animation: 'fadeIn 0.3s ease',
                }}
              >
                {hugSentNotice}
              </div>
            )}

            {/* Các nút tương tác phi ngôn ngữ (Non-verbal actions) */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', justifyContent: 'center' }}>
              {/* Rót trà */}
              <button
                type="button"
                onClick={handlePourTea}
                style={{
                  backgroundColor: 'rgba(217, 119, 6, 0.25)',
                  border: '1.5px solid #d97706',
                  color: '#fef3c7',
                  padding: '10px 18px',
                  borderRadius: '24px',
                  fontSize: '0.88rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  transition: 'all 0.2s',
                  boxShadow: '0 4px 12px rgba(217, 119, 6, 0.2)',
                }}
              >
                <span>🫖</span> Rót Thêm Chén Trà Ấm ({teaCount})
              </button>

              {/* Bật/Tắt Đèn Bàn */}
              <button
                type="button"
                onClick={handleToggleLamp}
                style={{
                  backgroundColor: isLampOn ? 'rgba(245, 158, 11, 0.2)' : 'rgba(255, 255, 255, 0.08)',
                  border: isLampOn ? '1.5px solid #f59e0b' : '1.5px solid rgba(255, 255, 255, 0.15)',
                  color: isLampOn ? '#fbbf24' : '#cbd5e1',
                  padding: '10px 18px',
                  borderRadius: '24px',
                  fontSize: '0.88rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  transition: 'all 0.2s',
                }}
              >
                <span>{isLampOn ? '🕯️' : '🌑'}</span> {isLampOn ? 'Ánh Đèn Vàng Ấm' : 'Tắt Đèn Dịu Mắt'}
              </button>

              {/* Rung Chuông Gió */}
              <button
                type="button"
                onClick={handleRingChime}
                style={{
                  backgroundColor: isChiming ? 'rgba(56, 189, 248, 0.25)' : 'rgba(255, 255, 255, 0.08)',
                  border: '1.5px solid rgba(56, 189, 248, 0.4)',
                  color: '#7dd3fc',
                  padding: '10px 18px',
                  borderRadius: '24px',
                  fontSize: '0.88rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  transition: 'all 0.2s',
                }}
              >
                <span>🎐</span> Rung Chuông Gió Pha Lê
              </button>

              {/* Gửi cái ôm */}
              <button
                type="button"
                onClick={handleSendWarmHug}
                style={{
                  backgroundColor: 'rgba(236, 72, 153, 0.18)',
                  border: '1.5px solid rgba(236, 72, 153, 0.45)',
                  color: '#f472b6',
                  padding: '10px 18px',
                  borderRadius: '24px',
                  fontSize: '0.88rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  transition: 'all 0.2s',
                }}
              >
                <span>🫂</span> Gửi Vỗ Vai Ấm Áp
              </button>
            </div>
          </div>

          {/* Bức Tường Sổ Tay Quán Trà (Guestbook Notes) */}
          <div
            style={{
              backgroundColor: 'rgba(30, 41, 59, 0.6)',
              borderRadius: '20px',
              padding: '20px 24px',
              border: '1px solid rgba(255, 255, 255, 0.08)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '1.2rem' }}>📜</span>
                <h5 style={{ margin: 0, fontSize: '1rem', fontWeight: 700, color: '#fef3c7' }}>
                  Sổ Lưu Bút Khách Đêm Ẩn Danh
                </h5>
              </div>
              <span style={{ fontSize: '0.78rem', color: '#94a3b8' }}>Để lại một câu chúc lành cho người cùng thức</span>
            </div>

            {/* Ô nhập ghi chú nhanh */}
            <form noValidate onSubmit={handleAddNote} style={{ display: 'flex', gap: '10px', marginBottom: '16px', flexWrap: 'wrap' }}>
              <input
                type="text"
                value={noteInput}
                onChange={(e) => setNoteInput(e.target.value)}
                placeholder="Gửi một dòng động viên ngắn ngủi (ví dụ: Chúc bạn ngủ thật ngon nhé!)..."
                maxLength={70}
                style={{
                  flex: 1,
                  minWidth: 0,
                  backgroundColor: 'rgba(15, 23, 42, 0.8)',
                  border: '1px solid rgba(255, 255, 255, 0.12)',
                  borderRadius: '12px',
                  padding: '10px 14px',
                  color: '#ffffff',
                  fontSize: '0.85rem',
                  outline: 'none',
                }}
              />
              <button
                type="submit"
                disabled={!noteInput.trim()}
                style={{
                  backgroundColor: '#d97706',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '12px',
                  padding: '10px 20px',
                  fontSize: '0.85rem',
                  fontWeight: 700,
                  flexShrink: 0,
                  cursor: noteInput.trim() ? 'pointer' : 'not-allowed',
                  opacity: noteInput.trim() ? 1 : 0.6,
                }}
              >
                Ghim Lên
              </button>
            </form>

            {/* Danh sách note */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
                gap: '12px',
              }}
            >
              {guestNotes.map((n) => (
                <div
                  key={n.id}
                  style={{
                    backgroundColor: 'rgba(15, 23, 42, 0.7)',
                    padding: '12px 14px',
                    borderRadius: '14px',
                    borderLeft: '3px solid #f59e0b',
                    borderTop: '1px solid rgba(255, 255, 255, 0.05)',
                    borderRight: '1px solid rgba(255, 255, 255, 0.05)',
                    borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    minHeight: '70px',
                  }}
                >
                  <div style={{ fontSize: '0.85rem', color: '#e2e8f0', lineHeight: 1.5 }}>
                    "{n.text}"
                  </div>
                  <div style={{ fontSize: '0.72rem', color: '#94a3b8', marginTop: '6px', textAlign: 'right' }}>
                    Một người bạn • {n.time}
                  </div>
                </div>
              ))}
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
          <span>🌧️ Tiếng mưa đêm ngoài hiên • Cảm ơn bạn vì đã kiên trì đến tận giờ phút này</span>
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
            Nghỉ ngơi thôi
          </button>
        </div>
      </div>
    </div>
  );
};
