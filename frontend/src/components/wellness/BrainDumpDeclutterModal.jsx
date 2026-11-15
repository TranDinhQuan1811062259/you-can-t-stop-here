import React, { useState, useEffect } from 'react';
import { playClickSound, getAudioContext, isSoundEnabled } from '../../utils/soundEffects';

// Web Audio API: Tiếng gió thổi thả bóng bay lên trời
const playReleaseWindSound = () => {
  if (!isSoundEnabled()) return;
  const ctx = getAudioContext();
  if (!ctx) return;
  try {
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(300, now);
    osc.frequency.exponentialRampToValueAtTime(800, now + 0.3);
    osc.frequency.exponentialRampToValueAtTime(1200, now + 0.7);
    gain.gain.setValueAtTime(0.18, now);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.75);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.75);
  } catch (e) {
    console.warn('Audio err:', e);
  }
};

// Web Audio API: Tiếng hoàn thành việc nhỏ (chime)
const playDoneChimeSound = () => {
  if (!isSoundEnabled()) return;
  const ctx = getAudioContext();
  if (!ctx) return;
  try {
    const now = ctx.currentTime;
    [523.25, 659.25, 783.99].forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, now + i * 0.08);
      gain.gain.setValueAtTime(0.18, now + i * 0.08);
      gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.08 + 0.4);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now + i * 0.08);
      osc.stop(now + i * 0.08 + 0.4);
    });
  } catch (e) {
    console.warn('Audio err:', e);
  }
};

const DEFAULT_PRESET_THOUGHTS = [
  { id: 1, text: 'Sếp có vẻ không hài lòng với email mình gửi', category: 'uncontrolled' },
  { id: 2, text: 'Deadline slide thuyết trình chiều mai', category: 'controlled', isDone: false },
  { id: 3, text: 'Lỡ sau này bị sa thải thì biết làm sao?', category: 'fear' },
];

export const BrainDumpDeclutterModal = ({ isOpen, onClose }) => {
  const [inputText, setInputText] = useState('');
  const [thoughts, setThoughts] = useState(() => {
    try {
      const saved = localStorage.getItem('freedom_declutter_thoughts');
      return saved ? JSON.parse(saved) : DEFAULT_PRESET_THOUGHTS;
    } catch {
      return DEFAULT_PRESET_THOUGHTS;
    }
  });

  const [activeFearQuestion, setActiveFearQuestion] = useState(null);

  useEffect(() => {
    try {
      localStorage.setItem('freedom_declutter_thoughts', JSON.stringify(thoughts));
    } catch (e) {
      console.warn('Save err:', e);
    }
  }, [thoughts]);

  if (!isOpen) return null;

  const handleAddThought = (e) => {
    e.preventDefault();
    if (!inputText.trim()) return;
    playClickSound();
    const newThought = {
      id: Date.now(),
      text: inputText.trim(),
      category: 'inbox', // 'inbox' | 'controlled' | 'uncontrolled' | 'fear'
      isDone: false,
    };
    setThoughts([newThought, ...thoughts]);
    setInputText('');
  };

  const handleMoveCategory = (id, targetCat) => {
    if (targetCat === 'uncontrolled') {
      playReleaseWindSound();
    } else {
      playClickSound();
    }
    setThoughts((prev) =>
      prev.map((t) => (t.id === id ? { ...t, category: targetCat } : t))
    );
  };

  const handleToggleDone = (id) => {
    playDoneChimeSound();
    setThoughts((prev) =>
      prev.map((t) => (t.id === id ? { ...t, isDone: !t.isDone } : t))
    );
  };

  const handleReleaseFlyAway = (id) => {
    playReleaseWindSound();
    setThoughts((prev) => prev.filter((t) => t.id !== id));
  };

  const inboxList = thoughts.filter((t) => t.category === 'inbox');
  const controlledList = thoughts.filter((t) => t.category === 'controlled');
  const uncontrolledList = thoughts.filter((t) => t.category === 'uncontrolled');
  const fearList = thoughts.filter((t) => t.category === 'fear');

  return (
    <div
      className="wellness-modal-backdrop"
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(15, 23, 42, 0.78)',
        backdropFilter: 'blur(8px)',
        zIndex: 1050,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px',
        animation: 'fadeIn 0.25s ease',
      }}
    >
      <div
        className="declutter-canvas-container"
        onClick={(e) => e.stopPropagation()}
        style={{
          width: '100%',
          maxWidth: '920px',
          maxHeight: '92vh',
          backgroundColor: '#0f172a',
          color: '#f8fafc',
          borderRadius: '24px',
          border: '1.5px solid rgba(139, 92, 246, 0.3)',
          boxShadow: '0 25px 60px -12px rgba(0, 0, 0, 0.6), 0 0 40px rgba(139, 92, 246, 0.15)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
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
            background: 'linear-gradient(90deg, rgba(30, 27, 75, 0.95), rgba(15, 23, 42, 0.95))',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <div
              style={{
                width: '46px',
                height: '46px',
                borderRadius: '14px',
                background: 'linear-gradient(135deg, #8b5cf6, #6366f1)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '1.5rem',
                boxShadow: '0 8px 16px rgba(139, 92, 246, 0.3)',
              }}
            >
              🧶
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 700, color: '#ffffff' }}>
                  Chiếc Bàn Tháo Gỡ Cuộn Rối
                </h3>
                <span
                  style={{
                    fontSize: '0.72rem',
                    padding: '2px 8px',
                    borderRadius: '20px',
                    backgroundColor: 'rgba(139, 92, 246, 0.2)',
                    color: '#c4b5fd',
                    fontWeight: 600,
                  }}
                >
                  Brain Dump & Declutter
                </span>
              </div>
              <p style={{ margin: '4px 0 0', fontSize: '0.82rem', color: '#94a3b8' }}>
                Gõ hết những suy nghĩ đang làm bạn rối bời và sắp xếp lại trật tự cho tâm trí
              </p>
            </div>
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

        {/* Thân Canvas */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Ô nhập Brain Dump */}
          <form
            onSubmit={handleAddThought}
            style={{
              display: 'flex',
              gap: '12px',
              backgroundColor: 'rgba(30, 41, 59, 0.7)',
              padding: '12px 16px',
              borderRadius: '16px',
              border: '1.5px solid rgba(139, 92, 246, 0.3)',
            }}
          >
            <input
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder="Có điều gì đang làm bạn rối trí, băn khoăn hay ngộp thở lúc này? Gõ vào đây..."
              style={{
                flex: 1,
                backgroundColor: 'transparent',
                border: 'none',
                color: '#ffffff',
                fontSize: '0.95rem',
                outline: 'none',
              }}
            />
            <button
              type="submit"
              disabled={!inputText.trim()}
              style={{
                backgroundColor: '#8b5cf6',
                color: '#ffffff',
                border: 'none',
                padding: '8px 20px',
                borderRadius: '12px',
                fontSize: '0.88rem',
                fontWeight: 700,
                cursor: inputText.trim() ? 'pointer' : 'default',
                opacity: inputText.trim() ? 1 : 0.6,
                boxShadow: '0 4px 12px rgba(139, 92, 246, 0.3)',
              }}
            >
              + Xả Ra
            </button>
          </form>

          {/* Hàng chưa phân loại (Inbox) */}
          {inboxList.length > 0 && (
            <div
              style={{
                backgroundColor: 'rgba(30, 41, 59, 0.5)',
                borderRadius: '16px',
                padding: '16px',
                border: '1px dashed rgba(255, 255, 255, 0.2)',
              }}
            >
              <div style={{ fontSize: '0.82rem', fontWeight: 700, color: '#cbd5e1', marginBottom: '10px' }}>
                💡 Vừa xả ra (Chọn 1 trong 3 giỏ bên dưới để xếp vào):
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
                {inboxList.map((t) => (
                  <div
                    key={t.id}
                    style={{
                      backgroundColor: 'rgba(15, 23, 42, 0.8)',
                      padding: '10px 14px',
                      borderRadius: '14px',
                      border: '1px solid rgba(255, 255, 255, 0.12)',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '8px',
                    }}
                  >
                    <span style={{ fontSize: '0.9rem', color: '#f8fafc' }}>{t.text}</span>
                    <div style={{ display: 'flex', gap: '6px' }}>
                      <button
                        type="button"
                        onClick={() => handleMoveCategory(t.id, 'controlled')}
                        style={{
                          backgroundColor: 'rgba(16, 185, 129, 0.2)',
                          color: '#34d399',
                          border: 'none',
                          padding: '3px 8px',
                          borderRadius: '6px',
                          fontSize: '0.72rem',
                          cursor: 'pointer',
                          fontWeight: 600,
                        }}
                      >
                        🟢 Tôi kiểm soát được
                      </button>
                      <button
                        type="button"
                        onClick={() => handleMoveCategory(t.id, 'uncontrolled')}
                        style={{
                          backgroundColor: 'rgba(239, 68, 68, 0.2)',
                          color: '#f87171',
                          border: 'none',
                          padding: '3px 8px',
                          borderRadius: '6px',
                          fontSize: '0.72rem',
                          cursor: 'pointer',
                          fontWeight: 600,
                        }}
                      >
                        🎈 Ngoài tầm với
                      </button>
                      <button
                        type="button"
                        onClick={() => handleMoveCategory(t.id, 'fear')}
                        style={{
                          backgroundColor: 'rgba(245, 158, 11, 0.2)',
                          color: '#fbbf24',
                          border: 'none',
                          padding: '3px 8px',
                          borderRadius: '6px',
                          fontSize: '0.72rem',
                          cursor: 'pointer',
                          fontWeight: 600,
                        }}
                      >
                        🔍 Nỗi sợ tưởng tượng
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 3 Giỏ Phân Loại Thông Thái */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
              gap: '16px',
            }}
          >
            {/* GIỎ 1: TÔI KIỂM SOÁT ĐƯỢC */}
            <div
              style={{
                backgroundColor: 'rgba(16, 185, 129, 0.08)',
                border: '1.5px solid rgba(16, 185, 129, 0.3)',
                borderRadius: '18px',
                padding: '16px',
                display: 'flex',
                flexDirection: 'column',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontSize: '1.2rem' }}>🟢</span>
                  <div>
                    <h5 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 700, color: '#34d399' }}>
                      Tôi Kiểm Soát Được
                    </h5>
                    <span style={{ fontSize: '0.72rem', color: '#94a3b8' }}>Chia nhỏ ra & làm từng việc</span>
                  </div>
                </div>
                <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#34d399' }}>
                  {controlledList.length}
                </span>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', flex: 1 }}>
                {controlledList.length === 0 ? (
                  <div style={{ fontSize: '0.78rem', color: '#94a3b8', fontStyle: 'italic', textAlign: 'center', padding: '20px 0' }}>
                    Chưa có việc nào trong giỏ này
                  </div>
                ) : (
                  controlledList.map((t) => (
                    <div
                      key={t.id}
                      onClick={() => handleToggleDone(t.id)}
                      style={{
                        backgroundColor: 'rgba(15, 23, 42, 0.7)',
                        padding: '10px 12px',
                        borderRadius: '12px',
                        border: '1px solid rgba(16, 185, 129, 0.2)',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '10px',
                        cursor: 'pointer',
                        transition: 'all 0.2s',
                        opacity: t.isDone ? 0.6 : 1,
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={Boolean(t.isDone)}
                        onChange={() => {}}
                        style={{ cursor: 'pointer', accentColor: '#10b981' }}
                      />
                      <span
                        style={{
                          fontSize: '0.85rem',
                          color: t.isDone ? '#94a3b8' : '#ffffff',
                          textDecoration: t.isDone ? 'line-through' : 'none',
                          flex: 1,
                        }}
                      >
                        {t.text}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* GIỎ 2: NGOÀI TẦM KIỂM SOÁT (THẢ BAY MẤT) */}
            <div
              style={{
                backgroundColor: 'rgba(239, 68, 68, 0.08)',
                border: '1.5px solid rgba(239, 68, 68, 0.3)',
                borderRadius: '18px',
                padding: '16px',
                display: 'flex',
                flexDirection: 'column',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontSize: '1.2rem' }}>🎈</span>
                  <div>
                    <h5 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 700, color: '#f87171' }}>
                      Ngoài Tầm Kiểm Soát
                    </h5>
                    <span style={{ fontSize: '0.72rem', color: '#94a3b8' }}>Thái độ người khác, thời tiết...</span>
                  </div>
                </div>
                <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#f87171' }}>
                  {uncontrolledList.length}
                </span>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', flex: 1 }}>
                {uncontrolledList.length === 0 ? (
                  <div style={{ fontSize: '0.78rem', color: '#94a3b8', fontStyle: 'italic', textAlign: 'center', padding: '20px 0' }}>
                    Tâm trí đã buông bỏ được các việc ngoài tầm với
                  </div>
                ) : (
                  uncontrolledList.map((t) => (
                    <div
                      key={t.id}
                      style={{
                        backgroundColor: 'rgba(15, 23, 42, 0.7)',
                        padding: '10px 12px',
                        borderRadius: '12px',
                        border: '1px solid rgba(239, 68, 68, 0.2)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: '8px',
                      }}
                    >
                      <span style={{ fontSize: '0.85rem', color: '#cbd5e1', flex: 1 }}>
                        {t.text}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleReleaseFlyAway(t.id)}
                        style={{
                          backgroundColor: 'rgba(239, 68, 68, 0.2)',
                          color: '#f87171',
                          border: 'none',
                          padding: '4px 10px',
                          borderRadius: '8px',
                          fontSize: '0.72rem',
                          fontWeight: 700,
                          cursor: 'pointer',
                          whiteSpace: 'nowrap',
                        }}
                        title="Bấm để thả bóng bay mất khỏi tâm trí"
                      >
                        🎈 Thả Bay Đi
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* GIỎ 3: NỖI SỢ TƯỞNG TƯỢNG (CÂU HỎI CBT) */}
            <div
              style={{
                backgroundColor: 'rgba(245, 158, 11, 0.08)',
                border: '1.5px solid rgba(245, 158, 11, 0.3)',
                borderRadius: '18px',
                padding: '16px',
                display: 'flex',
                flexDirection: 'column',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontSize: '1.2rem' }}>🔍</span>
                  <div>
                    <h5 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 700, color: '#fbbf24' }}>
                      Nỗi Sợ Tưởng Tượng
                    </h5>
                    <span style={{ fontSize: '0.72rem', color: '#94a3b8' }}>Phản biện để hạ nhiệt lo âu</span>
                  </div>
                </div>
                <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#fbbf24' }}>
                  {fearList.length}
                </span>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', flex: 1 }}>
                {fearList.length === 0 ? (
                  <div style={{ fontSize: '0.78rem', color: '#94a3b8', fontStyle: 'italic', textAlign: 'center', padding: '20px 0' }}>
                    Không có nỗi sợ nào đang ám ảnh
                  </div>
                ) : (
                  fearList.map((t) => (
                    <div
                      key={t.id}
                      style={{
                        backgroundColor: 'rgba(15, 23, 42, 0.7)',
                        padding: '10px 12px',
                        borderRadius: '12px',
                        border: '1px solid rgba(245, 158, 11, 0.2)',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '6px',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <span style={{ fontSize: '0.85rem', color: '#fef3c7', fontWeight: 600 }}>
                          {t.text}
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            playClickSound();
                            setActiveFearQuestion(activeFearQuestion === t.id ? null : t.id);
                          }}
                          style={{
                            background: 'none',
                            border: 'none',
                            color: '#38bdf8',
                            fontSize: '0.72rem',
                            cursor: 'pointer',
                          }}
                        >
                          {activeFearQuestion === t.id ? 'Thu lại' : 'Hỏi phản biện 💡'}
                        </button>
                      </div>

                      {/* 3 câu hỏi CBT hạ nhiệt nỗi sợ */}
                      {activeFearQuestion === t.id && (
                        <div
                          style={{
                            backgroundColor: 'rgba(30, 41, 59, 0.8)',
                            padding: '8px 10px',
                            borderRadius: '8px',
                            fontSize: '0.75rem',
                            color: '#cbd5e1',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '4px',
                            lineHeight: 1.4,
                          }}
                        >
                          <div>1. Xác suất thực tế chuyện này xảy ra là bao nhiêu %?</div>
                          <div>2. Nếu lỡ xảy ra, giải pháp tệ nhất của mình là gì?</div>
                          <div>3. Nếu bạn thân lo sợ việc này, mình sẽ an ủi họ thế nào?</div>
                          <button
                            type="button"
                            onClick={() => handleReleaseFlyAway(t.id)}
                            style={{
                              marginTop: '4px',
                              backgroundColor: 'rgba(56, 189, 248, 0.2)',
                              color: '#38bdf8',
                              border: 'none',
                              padding: '3px 8px',
                              borderRadius: '6px',
                              cursor: 'pointer',
                              fontWeight: 600,
                            }}
                          >
                            ✓ Đã hiểu & Buông Bỏ Nỗi Sợ Này
                          </button>
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
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
          <span>🧠 Nhận thức rõ ràng là khởi đầu của sự bình yên nội tâm</span>
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
            Đầu óc đã nhẹ nhõm
          </button>
        </div>
      </div>
    </div>
  );
};
