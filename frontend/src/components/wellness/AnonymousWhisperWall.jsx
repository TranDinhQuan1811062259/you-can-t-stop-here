import React, { useState, useEffect } from 'react';
import { playClickSound, playSingingBowlSound } from '../../utils/soundEffects';

const INITIAL_WHISPERS = [
  { id: 'w1', icon: '🕊️', sender: 'Người lạ qua đường', text: 'Dù hôm nay có nhiều chuyện không như ý, bạn đã cố gắng hết sức rồi. Ngủ một giấc thật sâu nhé!', hearts: 42, color: '#38bdf8' },
  { id: 'w2', icon: '☕', sender: 'Góc quán quen', text: 'Gửi bạn một tách trà hoa cúc ấm. Đừng để deadline hay áp lực đè nặng lên trái tim bạn đêm nay.', hearts: 35, color: '#fbbf24' },
  { id: 'w3', icon: '🌱', sender: 'Đang học cách lớn', text: 'Chậm lại một chút cũng không sao đâu. Mỗi bông hoa đều có mùa nở riêng của chính nó.', hearts: 58, color: '#34d399' },
  { id: 'w4', icon: '🌙', sender: 'Cú đêm cô đơn', text: 'Nếu bạn đang khóc một mình trong phòng tối, mình gửi bạn một cái ôm thật chặt từ xa nhé.', hearts: 67, color: '#c084fc' },
  { id: 'w5', icon: '🧸', sender: 'Bạn cùng bàn', text: 'Ngày mai thức dậy, nhớ ăn một bữa sáng thật ngon và mỉm cười với chính mình trước gương nha!', hearts: 29, color: '#f472b6' },
  { id: 'w6', icon: '✨', sender: 'Tia sáng nhỏ', text: 'Bạn làm tốt hơn bạn nghĩ nhiều lắm. Đừng tự trách mình nữa, bạn tuyệt vời lắm rồi!', hearts: 51, color: '#fde047' },
  { id: 'w7', icon: '🌸', sender: 'Mùa xuân phương xa', text: 'Mọi nỗi đau rồi cũng sẽ dịu lại. Hãy tin vào sức mạnh bền bỉ bên trong bạn.', hearts: 38, color: '#fb7185' },
  { id: 'w8', icon: '🍵', sender: 'Bình yên đêm muộn', text: 'Tắt đèn, hít một hơi thật sâu, thở ra nhẹ nhàng. Bạn an toàn ở đây rồi.', hearts: 44, color: '#2dd4bf' },
];

export const AnonymousWhisperWall = ({ themeColor = '#818cf8' }) => {
  const STORAGE_KEY = 'freedom_anonymous_whispers';

  const [whispers, setWhispers] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) return JSON.parse(saved);
    } catch (_) {}
    return INITIAL_WHISPERS;
  });

  const [activeWhisper, setActiveWhisper] = useState(null);
  const [newText, setNewText] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [likedIds, setLikedIds] = useState({});

  const handleOpenWhisper = (w) => {
    playClickSound();
    setActiveWhisper(w);
  };

  const handleLike = (wId, e) => {
    e.stopPropagation();
    playClickSound();
    if (likedIds[wId]) return;

    setLikedIds((prev) => ({ ...prev, [wId]: true }));
    setWhispers((prev) => {
      const updated = prev.map((item) =>
        item.id === wId ? { ...item, hearts: item.hearts + 1 } : item
      );
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      } catch (_) {}
      return updated;
    });

    if (activeWhisper && activeWhisper.id === wId) {
      setActiveWhisper((prev) => ({ ...prev, hearts: prev.hearts + 1 }));
    }
  };

  const handleSendWhisper = (e) => {
    e.preventDefault();
    if (!newText.trim()) return;

    playSingingBowlSound();
    setIsSending(true);

    const ICONS = ['🕊️', '☕', '✨', '🌙', '🧸', '🌸', '🌱', '🍵', '🕯️'];
    const COLORS = ['#38bdf8', '#fbbf24', '#34d399', '#c084fc', '#f472b6', '#2dd4bf'];
    const randomIcon = ICONS[Math.floor(Math.random() * ICONS.length)];
    const randomColor = COLORS[Math.floor(Math.random() * COLORS.length)];

    const newWhisper = {
      id: `w_${Date.now()}`,
      icon: randomIcon,
      sender: 'Bạn vô danh',
      text: newText.trim(),
      hearts: 1,
      color: randomColor,
    };

    const updated = [newWhisper, ...whispers];
    setWhispers(updated);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    } catch (_) {}

    setNewText('');
    setIsSending(false);
  };

  return (
    <div
      className="anonymous-whisper-wall-container"
      style={{
        padding: '16px 20px',
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        minHeight: '380px',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Intro Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '14px',
          flexWrap: 'wrap',
          gap: '8px',
        }}
      >
        <div>
          <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 800, color: '#fef3c7' }}>
            💬 Bức Tường Thì Thầm Vô Danh
          </h3>
          <p style={{ margin: 0, fontSize: '0.76rem', color: '#94a3b8' }}>
            Chạm vào bất kỳ bong bóng nào để nhận lời ủi an từ một người bạn phương xa
          </p>
        </div>

        <span
          style={{
            fontSize: '0.72rem',
            padding: '3px 10px',
            borderRadius: '12px',
            background: 'rgba(255, 255, 255, 0.08)',
            color: '#cbd5e1',
          }}
        >
          🎈 {whispers.length} lời thì thầm đang bay
        </span>
      </div>

      {/* Floating Bubbles Canvas Container */}
      <div
        style={{
          flex: 1,
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(170px, 1fr))',
          gap: '12px',
          overflowY: 'auto',
          padding: '8px 4px 16px',
        }}
      >
        {whispers.map((w, index) => {
          const isLiked = likedIds[w.id];
          return (
            <div
              key={w.id}
              onClick={() => handleOpenWhisper(w)}
              className="whisper-bubble"
              style={{
                borderRadius: '18px',
                padding: '12px 14px',
                background: `linear-gradient(145deg, ${w.color}15 0%, rgba(15, 23, 42, 0.8) 100%)`,
                border: `1.5px solid ${w.color}45`,
                boxShadow: `0 4px 16px rgba(0, 0, 0, 0.3), 0 0 14px ${w.color}20`,
                cursor: 'pointer',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                transition: 'all 0.22s ease',
                animation: `bubbleFloat 4s ease-in-out infinite alternate ${index * 0.35}s`,
              }}
            >
              <div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                  <span style={{ fontSize: '1.3rem' }}>{w.icon}</span>
                  <span style={{ fontSize: '0.68rem', color: w.color, fontWeight: 700 }}>
                    {w.sender}
                  </span>
                </div>
                <p
                  style={{
                    margin: 0,
                    fontSize: '0.8rem',
                    color: '#f1f5f9',
                    lineHeight: 1.5,
                    display: '-webkit-box',
                    WebkitLineClamp: 3,
                    WebkitBoxOrient: 'vertical',
                    overflow: 'hidden',
                  }}
                >
                  "{w.text}"
                </p>
              </div>

              <div
                style={{
                  marginTop: '10px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  paddingTop: '6px',
                  borderTop: '1px solid rgba(255, 255, 255, 0.08)',
                }}
              >
                <span style={{ fontSize: '0.7rem', color: '#94a3b8' }}>Chạm để đọc</span>
                <button
                  type="button"
                  onClick={(e) => handleLike(w.id, e)}
                  style={{
                    background: isLiked ? `${w.color}35` : 'transparent',
                    border: 'none',
                    color: isLiked ? '#f43f5e' : '#cbd5e1',
                    fontSize: '0.72rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    padding: '2px 6px',
                    borderRadius: '8px',
                  }}
                >
                  <span>{isLiked ? '❤️' : '🤍'}</span>
                  <span>{w.hearts}</span>
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Input to send a new whisper */}
      <form
        onSubmit={handleSendWhisper}
        style={{
          marginTop: '12px',
          display: 'flex',
          gap: '8px',
          background: 'rgba(0, 0, 0, 0.4)',
          padding: '8px 12px',
          borderRadius: '14px',
          border: '1px solid rgba(255, 255, 255, 0.15)',
        }}
      >
        <input
          type="text"
          placeholder="Viết một lời thì thầm ấm áp gửi ai đó đêm nay..."
          value={newText}
          onChange={(e) => setNewText(e.target.value)}
          maxLength={140}
          style={{
            flex: 1,
            background: 'transparent',
            border: 'none',
            color: '#f8fafc',
            fontSize: '0.84rem',
            outline: 'none',
          }}
        />
        <button
          type="submit"
          disabled={!newText.trim() || isSending}
          style={{
            padding: '6px 14px',
            borderRadius: '10px',
            background: newText.trim()
              ? 'linear-gradient(135deg, #f59e0b, #d97706)'
              : 'rgba(255, 255, 255, 0.1)',
            border: 'none',
            color: newText.trim() ? '#0f172a' : '#64748b',
            fontSize: '0.8rem',
            fontWeight: 800,
            cursor: newText.trim() ? 'pointer' : 'default',
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
          }}
        >
          <span>🎈</span>
          <span>Thả Bong Bóng</span>
        </button>
      </form>

      {/* Pop-up Opened Whisper Modal */}
      {activeWhisper && (
        <div
          onClick={() => setActiveWhisper(null)}
          style={{
            position: 'absolute',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.8)',
            backdropFilter: 'blur(8px)',
            zIndex: 100,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '16px',
            animation: 'fadeIn 0.2s ease',
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              width: '100%',
              maxWidth: '380px',
              borderRadius: '20px',
              padding: '24px',
              background: 'linear-gradient(165deg, #0f172a 0%, #1e1b4b 100%)',
              border: `2px solid ${activeWhisper.color}`,
              boxShadow: `0 16px 40px rgba(0, 0, 0, 0.7), 0 0 25px ${activeWhisper.color}40`,
              textAlign: 'center',
            }}
          >
            <div style={{ fontSize: '3rem', marginBottom: '8px' }}>{activeWhisper.icon}</div>
            <div style={{ fontSize: '0.8rem', color: activeWhisper.color, fontWeight: 800, marginBottom: '12px', textTransform: 'uppercase' }}>
              Lời nhắn từ {activeWhisper.sender}
            </div>
            <p
              style={{
                fontSize: '1rem',
                color: '#f8fafc',
                lineHeight: 1.7,
                margin: '0 0 20px',
                fontStyle: 'italic',
              }}
            >
              "{activeWhisper.text}"
            </p>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px' }}>
              <button
                type="button"
                onClick={(e) => handleLike(activeWhisper.id, e)}
                style={{
                  padding: '8px 18px',
                  borderRadius: '12px',
                  background: likedIds[activeWhisper.id] ? 'rgba(244, 63, 94, 0.3)' : 'rgba(255, 255, 255, 0.1)',
                  border: `1px solid ${likedIds[activeWhisper.id] ? '#f43f5e' : 'rgba(255, 255, 255, 0.2)'}`,
                  color: likedIds[activeWhisper.id] ? '#fca5a5' : '#ffffff',
                  fontSize: '0.84rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                }}
              >
                <span>❤️</span>
                <span>{likedIds[activeWhisper.id] ? 'Đã cảm ơn' : 'Cảm ơn bạn!'} ({activeWhisper.hearts})</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveWhisper(null)}
                style={{
                  padding: '8px 16px',
                  borderRadius: '12px',
                  background: 'rgba(255, 255, 255, 0.08)',
                  border: 'none',
                  color: '#cbd5e1',
                  fontSize: '0.84rem',
                  cursor: 'pointer',
                }}
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes bubbleFloat {
          0% { transform: translateY(0px) rotate(0deg); }
          100% { transform: translateY(-6px) rotate(1deg); }
        }
      `}</style>
    </div>
  );
};
