import React, { useState, useEffect } from 'react';
import { playClickSound, playStarChimeSound, playSingingBowlSound } from '../../utils/soundEffects';

const STAR_COLORS = [
  { id: 'gold', name: 'Hoàng Kim', color: '#f59e0b', bg: '#fef3c7', icon: '🌟' },
  { id: 'pink', name: 'Anh Đào', color: '#ec4899', bg: '#fce7f3', icon: '🌸' },
  { id: 'mint', name: 'Bạc Hà', color: '#10b981', bg: '#d1fae5', icon: '🌿' },
  { id: 'sky', name: 'Lam Ngọc', color: '#0ea5e9', bg: '#e0f2fe', icon: '💎' },
  { id: 'purple', name: 'Thạch Anh', color: '#8b5cf6', bg: '#ede9fe', icon: '🔮' },
];

const QUICK_TAGS = [
  '☕ Được mời ly cà phê / trà sữa',
  '☀️ Lúc tan làm trời không mưa',
  '🎧 Nghe được một bài hát siêu hay',
  '🏆 Hoàn thành xong một task khó',
  '🫂 Được ai đó khen ngợi, mỉm cười',
  '🍜 Ăn một bữa trưa thật ngon miệng',
];

const DEFAULT_STARS = [
  {
    id: 1,
    content: 'Hôm nay trời thu Hà Nội se lạnh, được uống một ngụm trà gừng ấm thấy lòng nhẹ nhõm hẳn.',
    color: 'gold',
    date: 'Hôm qua',
  },
  {
    id: 2,
    content: 'Đồng nghiệp mua cho cốc trà đào cam sả động viên lúc mình đang chạy đua deadline.',
    color: 'pink',
    date: '3 ngày trước',
  },
  {
    id: 3,
    content: 'Tìm ra được con bug hành hạ mình suốt 2 ngày, cảm giác nhẹ bẫng như trút được tảng đá!',
    color: 'mint',
    date: 'Tuần trước',
  },
];

export const GratitudeJarModal = ({ isOpen, onClose }) => {
  const [activeTab, setActiveTab] = useState('fold'); // 'fold' | 'jar' | 'draw'
  const [inputText, setInputText] = useState('');
  const [selectedColor, setSelectedColor] = useState('gold');
  const [stars, setStars] = useState(() => {
    try {
      const saved = localStorage.getItem('freedom_gratitude_stars');
      if (saved) return JSON.parse(saved);
    } catch (_) {}
    return DEFAULT_STARS;
  });
  const [drawnStar, setDrawnStar] = useState(null);
  const [isShaking, setIsShaking] = useState(false);
  const [alertMsg, setAlertMsg] = useState('');

  if (!isOpen) return null;

  const handleFoldStar = (e) => {
    e.preventDefault();
    if (!inputText.trim()) return;

    playStarChimeSound();
    const newStar = {
      id: Date.now(),
      content: inputText.trim(),
      color: selectedColor,
      date: new Date().toLocaleDateString('vi-VN', {
        day: '2-digit',
        month: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
      }),
    };

    const updated = [newStar, ...stars];
    setStars(updated);
    try {
      localStorage.setItem('freedom_gratitude_stars', JSON.stringify(updated));
    } catch (_) {}

    setInputText('');
    setAlertMsg('🌟 Đã gấp thành công 1 ngôi sao biết ơn và thả vào chiếc lọ thủy tinh!');
    setTimeout(() => {
      setAlertMsg('');
      setActiveTab('jar');
    }, 1200);
  };

  const handleDrawRandomStar = () => {
    if (stars.length === 0) return;
    playClickSound();
    setIsShaking(true);
    setDrawnStar(null);

    setTimeout(() => {
      setIsShaking(false);
      playSingingBowlSound();
      const random = stars[Math.floor(Math.random() * stars.length)];
      setDrawnStar(random);
    }, 800);
  };

  const handleDeleteStar = (starId, e) => {
    e.stopPropagation();
    const filtered = stars.filter((s) => s.id !== starId);
    setStars(filtered);
    try {
      localStorage.setItem('freedom_gratitude_stars', JSON.stringify(filtered));
    } catch (_) {}
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 99999,
        background: 'rgba(15, 23, 42, 0.75)',
        backdropFilter: 'blur(8px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px',
        animation: 'fadeIn 0.2s ease',
      }}
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: '95%',
          maxWidth: '680px',
          maxHeight: '90vh',
          background: 'linear-gradient(165deg, #0f172a 0%, #1e1b4b 100%)',
          border: '1.5px solid rgba(251, 191, 36, 0.4)',
          borderRadius: '24px',
          boxShadow: '0 20px 50px rgba(0, 0, 0, 0.6), 0 0 30px rgba(245, 158, 11, 0.2)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          color: '#f8fafc',
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: '20px 24px 16px',
            borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ fontSize: '1.8rem' }}>🌟</span>
            <div>
              <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 800, color: '#fef08a' }}>
                Chiếc Lọ Biết Ơn Cuối Ngày
              </h3>
              <p style={{ margin: '2px 0 0', fontSize: '0.78rem', color: '#94a3b8' }}>
                Gấp những niềm vui nhỏ bé thành ngôi sao phát sáng lưu giữ bình yên
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            style={{
              background: 'rgba(255, 255, 255, 0.08)',
              border: 'none',
              color: '#94a3b8',
              width: '32px',
              height: '32px',
              borderRadius: '50%',
              cursor: 'pointer',
              fontSize: '1rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            ✕
          </button>
        </div>

        {/* Tab Navigation */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            padding: '12px 24px 0',
            gap: '8px',
          }}
        >
          <button
            type="button"
            onClick={() => {
              playClickSound();
              setActiveTab('fold');
            }}
            style={{
              padding: '10px',
              borderRadius: '12px',
              border: 'none',
              background: activeTab === 'fold' ? 'rgba(245, 158, 11, 0.25)' : 'rgba(255, 255, 255, 0.04)',
              color: activeTab === 'fold' ? '#fde68a' : '#94a3b8',
              fontWeight: 700,
              fontSize: '0.84rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
            }}
          >
            <span>✨</span> Gấp Sao Mới
          </button>

          <button
            type="button"
            onClick={() => {
              playClickSound();
              setActiveTab('jar');
            }}
            style={{
              padding: '10px',
              borderRadius: '12px',
              border: 'none',
              background: activeTab === 'jar' ? 'rgba(245, 158, 11, 0.25)' : 'rgba(255, 255, 255, 0.04)',
              color: activeTab === 'jar' ? '#fde68a' : '#94a3b8',
              fontWeight: 700,
              fontSize: '0.84rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
            }}
          >
            <span>🏺</span> Chiếc Lọ Của Tôi ({stars.length})
          </button>

          <button
            type="button"
            onClick={() => {
              playClickSound();
              setActiveTab('draw');
              if (!drawnStar && stars.length > 0) {
                handleDrawRandomStar();
              }
            }}
            style={{
              padding: '10px',
              borderRadius: '12px',
              border: 'none',
              background: activeTab === 'draw' ? 'rgba(245, 158, 11, 0.25)' : 'rgba(255, 255, 255, 0.04)',
              color: activeTab === 'draw' ? '#fde68a' : '#94a3b8',
              fontWeight: 700,
              fontSize: '0.84rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
            }}
          >
            <span>🎲</span> Rút Thăm Niềm Vui
          </button>
        </div>

        {/* Content Body */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '16px 24px 24px' }}>
          {alertMsg && (
            <div
              style={{
                background: 'rgba(16, 185, 129, 0.2)',
                border: '1px solid #10b981',
                borderRadius: '12px',
                padding: '10px 14px',
                color: '#a7f3d0',
                fontSize: '0.85rem',
                marginBottom: '14px',
                fontWeight: 600,
                textAlign: 'center',
              }}
            >
              {alertMsg}
            </div>
          )}

          {/* TAB 1: GẤP SAO MỚI */}
          {activeTab === 'fold' && (
            <form onSubmit={handleFoldStar} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.86rem', fontWeight: 700, color: '#fcd34d', marginBottom: '8px' }}>
                  Hôm nay có điều gì nhỏ xíu làm bạn mỉm cười hoặc thấy biết ơn? *
                </label>
                <textarea
                  rows={4}
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  placeholder="Ví dụ: Được đồng nghiệp mời cốc trà đào cam sả, lúc tan ca trời tạnh mưa, tìm ra cách sửa lỗi bug khó nhằn..."
                  required
                  style={{
                    width: '100%',
                    padding: '14px 16px',
                    borderRadius: '14px',
                    background: 'rgba(255, 255, 255, 0.05)',
                    border: '1px solid rgba(255, 255, 255, 0.18)',
                    color: '#f8fafc',
                    fontSize: '0.94rem',
                    lineHeight: '1.6',
                    outline: 'none',
                    resize: 'vertical',
                    boxSizing: 'border-box',
                  }}
                />
              </div>

              {/* Gợi ý nhanh */}
              <div>
                <span style={{ fontSize: '0.78rem', color: '#94a3b8', display: 'block', marginBottom: '6px' }}>
                  Gợi ý nhanh (click để chọn):
                </span>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                  {QUICK_TAGS.map((tag, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setInputText((prev) => (prev ? prev + ' • ' + tag : tag))}
                      style={{
                        background: 'rgba(255, 255, 255, 0.06)',
                        border: '1px solid rgba(255, 255, 255, 0.12)',
                        color: '#cbd5e1',
                        borderRadius: '999px',
                        padding: '4px 10px',
                        fontSize: '0.74rem',
                        cursor: 'pointer',
                        transition: 'all 0.15s',
                      }}
                    >
                      {tag}
                    </button>
                  ))}
                </div>
              </div>

              {/* Chọn màu sắc ngôi sao */}
              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: '#cbd5e1', marginBottom: '8px' }}>
                  Màu sắc ngôi sao may mắn:
                </label>
                <div style={{ display: 'flex', gap: '10px' }}>
                  {STAR_COLORS.map((sc) => (
                    <button
                      key={sc.id}
                      type="button"
                      onClick={() => setSelectedColor(sc.id)}
                      style={{
                        padding: '6px 12px',
                        borderRadius: '10px',
                        border: selectedColor === sc.id ? `2px solid ${sc.color}` : '1px solid rgba(255, 255, 255, 0.1)',
                        background: selectedColor === sc.id ? `${sc.color}22` : 'rgba(255, 255, 255, 0.04)',
                        color: selectedColor === sc.id ? sc.color : '#94a3b8',
                        cursor: 'pointer',
                        fontSize: '0.8rem',
                        fontWeight: 700,
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                      }}
                    >
                      <span>{sc.icon}</span>
                      <span>{sc.name}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Nút bấm gấp sao */}
              <button
                type="submit"
                style={{
                  marginTop: '10px',
                  padding: '13px',
                  borderRadius: '12px',
                  border: 'none',
                  background: 'linear-gradient(135deg, #f59e0b, #d97706)',
                  color: '#0f172a',
                  fontWeight: 800,
                  fontSize: '0.98rem',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  boxShadow: '0 6px 20px rgba(245, 158, 11, 0.35)',
                }}
              >
                <span>✨</span>
                <span>Gấp Ngôi Sao & Thả Vào Chiếc Lọ</span>
              </button>
            </form>
          )}

          {/* TAB 2: CHIẾC LỌ CỦA TÔI */}
          {activeTab === 'jar' && (
            <div>
              <div
                style={{
                  textAlign: 'center',
                  padding: '20px',
                  background: 'radial-gradient(circle, rgba(245, 158, 11, 0.15) 0%, rgba(15, 23, 42, 0) 70%)',
                  borderRadius: '16px',
                  marginBottom: '16px',
                }}
              >
                <span style={{ fontSize: '3rem', display: 'inline-block', filter: 'drop-shadow(0 0 15px #f59e0b)' }}>
                  🏺
                </span>
                <h4 style={{ margin: '8px 0 4px', fontSize: '1.1rem', color: '#fef08a' }}>
                  Hũ Thủy Tinh Lưu Giữ {stars.length} Khoảnh Khắc Hạnh Phúc
                </h4>
                <p style={{ margin: 0, fontSize: '0.8rem', color: '#94a3b8' }}>
                  Mỗi ngôi sao là một bằng chứng cho thấy cuộc sống vẫn luôn có những điều ấm áp dành cho bạn!
                </p>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {stars.map((star) => {
                  const colorConfig = STAR_COLORS.find((c) => c.id === star.color) || STAR_COLORS[0];
                  return (
                    <div
                      key={star.id}
                      style={{
                        background: 'rgba(255, 255, 255, 0.04)',
                        borderLeft: `4px solid ${colorConfig.color}`,
                        borderRadius: '12px',
                        padding: '14px 16px',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'flex-start',
                        gap: '12px',
                      }}
                    >
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: '0.92rem', color: '#f1f5f9', lineHeight: '1.6', marginBottom: '6px' }}>
                          {star.content}
                        </div>
                        <div style={{ fontSize: '0.74rem', color: '#94a3b8', display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <span>{colorConfig.icon}</span>
                          <span>{star.date}</span>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={(e) => handleDeleteStar(star.id, e)}
                        title="Xóa ngôi sao này"
                        style={{
                          background: 'transparent',
                          border: 'none',
                          color: '#64748b',
                          cursor: 'pointer',
                          padding: '4px',
                        }}
                      >
                        ✕
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* TAB 3: RÚT THĂM NIỀM VUI */}
          {activeTab === 'draw' && (
            <div style={{ textAlign: 'center', padding: '16px 0' }}>
              <div
                style={{
                  fontSize: '3.5rem',
                  display: 'inline-block',
                  animation: isShaking ? 'shakeJar 0.6s infinite ease-in-out' : 'none',
                }}
              >
                🏺✨
              </div>

              <h4 style={{ margin: '12px 0 6px', color: '#fcd34d', fontSize: '1.15rem' }}>
                Rút Thăm 1 Niềm Vui Từ Quá Khứ
              </h4>
              <p style={{ margin: '0 0 16px', fontSize: '0.82rem', color: '#94a3b8' }}>
                Khi bạn thấy mệt mỏi hay mất phương hướng, hãy để chính bạn của những ngày vui vẻ tiếp thêm động lực!
              </p>

              <button
                type="button"
                onClick={handleDrawRandomStar}
                disabled={isShaking || stars.length === 0}
                style={{
                  padding: '12px 24px',
                  borderRadius: '12px',
                  border: 'none',
                  background: 'linear-gradient(135deg, #f59e0b, #d97706)',
                  color: '#0f172a',
                  fontWeight: 800,
                  fontSize: '0.94rem',
                  cursor: isShaking ? 'wait' : 'pointer',
                  boxShadow: '0 4px 15px rgba(245, 158, 11, 0.35)',
                }}
              >
                {isShaking ? 'Đang lắc hũ...' : '🎲 Lắc Hũ Rút 1 Ngôi Sao May Mắn'}
              </button>

              {drawnStar && (
                <div
                  style={{
                    marginTop: '24px',
                    background: 'linear-gradient(135deg, rgba(254, 243, 199, 0.1), rgba(254, 243, 199, 0.02))',
                    border: '1.5px solid #f59e0b',
                    borderRadius: '18px',
                    padding: '20px',
                    textAlign: 'left',
                    animation: 'fadeInUp 0.3s ease',
                  }}
                >
                  <span style={{ fontSize: '0.78rem', color: '#f59e0b', fontWeight: 800, textTransform: 'uppercase' }}>
                    🌟 BỨC THÔNG ĐIỆP BẠN ĐÃ RÚT ĐƯỢC:
                  </span>
                  <div style={{ fontSize: '1.05rem', color: '#fffbeb', lineHeight: '1.7', margin: '10px 0' }}>
                    "{drawnStar.content}"
                  </div>
                  <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
                    Ghi lại lúc: {drawnStar.date}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      <style>{`
        @keyframes shakeJar {
          0%, 100% { transform: rotate(0deg); }
          25% { transform: rotate(-8deg) scale(1.05); }
          75% { transform: rotate(8deg) scale(1.05); }
        }
      `}</style>
    </div>
  );
};
