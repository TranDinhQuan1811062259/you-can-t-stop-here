import React, { useState, useEffect } from 'react';
import { playWarmthSound } from '../../utils/soundEffects';

const WARMTH_OPTIONS = [
  { id: 'hug', icon: '🫂', label: 'Gửi một cái ôm', message: 'Một đồng nghiệp ẩn danh vừa gửi bạn một cái ôm ấm áp: "Cố lên nhé, bạn không hề cô độc!"' },
  { id: 'tea', icon: '☕', label: 'Mời tách trà nóng', message: 'Ai đó vừa mời bạn một tách trà thảo mộc: "Nghỉ tay một chút và nhâm nhi nhé."' },
  { id: 'goodjob', icon: '🌟', label: 'Bạn làm tốt lắm', message: 'Một người lắng nghe gửi lời nhắn: "Hôm nay bạn đã nỗ lực rất tuyệt vời rồi!"' },
  { id: 'sleep', icon: '🌙', label: 'Chúc ngủ ngon', message: 'Lời chúc ngọt ngào: "Gác lại deadline thôi, chúc bạn tối nay ngủ một giấc thật sâu."' },
];

export const AnonymousWarmthBox = ({ postId, authorName }) => {
  const storageKey = `freedom_warmth_${postId || 'demo'}`;

  const [warmthList, setWarmthList] = useState(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) return JSON.parse(saved);
    } catch (e) {}
    return [
      { id: 1, icon: '🫂', text: 'Một đồng nghiệp ẩn danh gửi bạn cái ôm ấm áp', time: '5 phút trước' },
      { id: 2, icon: '☕', text: 'Ai đó vừa mời bạn một tách trà gừng nóng', time: '22 phút trước' },
    ];
  });

  const [floatingParticles, setFloatingParticles] = useState([]);
  const [justSentMsg, setJustSentMsg] = useState('');

  const handleSendWarmth = (opt) => {
    playWarmthSound();

    // Thêm vào danh sách
    const newItem = {
      id: Date.now(),
      icon: opt.icon,
      text: opt.message,
      time: 'Vừa xong',
    };
    const updated = [newItem, ...warmthList.slice(0, 5)];
    setWarmthList(updated);
    try {
      localStorage.setItem(storageKey, JSON.stringify(updated));
    } catch (e) {}

    // Hiển thị thông báo cảm ơn
    setJustSentMsg(`✓ Bạn vừa gửi ${opt.label.toLowerCase()} đến tác giả! Cảm ơn bạn đã sẻ chia ❤️`);
    setTimeout(() => setJustSentMsg(''), 4500);

    // Kích hoạt hạt bay lên
    const particleId = Date.now();
    setFloatingParticles((prev) => [...prev, { id: particleId, icon: opt.icon }]);
    setTimeout(() => {
      setFloatingParticles((prev) => prev.filter((p) => p.id !== particleId));
    }, 2000);
  };

  return (
    <div
      className="anonymous-warmth-card"
      style={{
        background: 'linear-gradient(135deg, #fffbeb 0%, #fef3c7 40%, #ffedd5 100%)',
        border: '1.5px solid #fde68a',
        borderRadius: '16px',
        padding: '18px 20px',
        margin: '26px 0',
        position: 'relative',
        overflow: 'hidden',
        boxShadow: '0 4px 16px rgba(245, 158, 11, 0.12)',
      }}
    >
      {/* Hạt bay lên khi bấm gửi */}
      {floatingParticles.map((p) => (
        <span
          key={p.id}
          style={{
            position: 'absolute',
            bottom: '20px',
            left: '50%',
            fontSize: '2.5rem',
            pointerEvents: 'none',
            animation: 'floatWarmthUp 1.8s ease-out forwards',
            zIndex: 10,
          }}
        >
          {p.icon}
        </span>
      ))}

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px', flexWrap: 'wrap', gap: '8px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '1.4rem' }}>💌</span>
          <div>
            <strong style={{ fontSize: '0.98rem', color: '#92400e' }}>
              Hộp Thư Sưởi Ấm Tâm Hồn (Gửi Ẩn Danh)
            </strong>
            <p style={{ margin: 0, fontSize: '0.78rem', color: '#b45309' }}>
              Không cần bình luận dài dòng, bạn có thể gửi tặng {authorName || 'tác giả'} một cử chỉ ấm áp:
            </p>
          </div>
        </div>
        <span
          style={{
            background: 'rgba(217, 119, 6, 0.12)',
            color: '#92400e',
            fontSize: '0.72rem',
            fontWeight: 700,
            padding: '2px 9px',
            borderRadius: '999px',
            border: '1px solid rgba(217, 119, 6, 0.25)',
          }}
        >
          {warmthList.length} lời sưởi ấm
        </span>
      </div>

      {/* Thông báo xác nhận vừa gửi */}
      {justSentMsg && (
        <div
          style={{
            background: '#ecfdf5',
            color: '#065f46',
            border: '1px solid #a7f3d0',
            borderRadius: '8px',
            padding: '7px 12px',
            fontSize: '0.8rem',
            fontWeight: 700,
            marginBottom: '12px',
          }}
        >
          {justSentMsg}
        </div>
      )}

      {/* 4 Nút gửi một chạm */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '14px' }}>
        {WARMTH_OPTIONS.map((opt) => (
          <button
            key={opt.id}
            type="button"
            onClick={() => handleSendWarmth(opt)}
            style={{
              background: '#ffffff',
              border: '1px solid #fde68a',
              borderRadius: '999px',
              padding: '6px 14px',
              fontSize: '0.82rem',
              fontWeight: 700,
              color: '#92400e',
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              boxShadow: '0 1px 3px rgba(245, 158, 11, 0.15)',
              transition: 'all 0.15s ease',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-2px)';
              e.currentTarget.style.boxShadow = '0 4px 10px rgba(245, 158, 11, 0.25)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'none';
              e.currentTarget.style.boxShadow = '0 1px 3px rgba(245, 158, 11, 0.15)';
            }}
          >
            <span>{opt.icon}</span>
            <span>{opt.label}</span>
          </button>
        ))}
      </div>

      {/* Danh sách những lời sưởi ấm vừa gửi */}
      {warmthList.length > 0 && (
        <div style={{ background: 'rgba(255, 255, 255, 0.75)', borderRadius: '10px', padding: '10px 14px', fontSize: '0.78rem', color: '#78350f' }}>
          <div style={{ fontWeight: 700, marginBottom: '6px', fontSize: '0.74rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            ✨ Những cái ôm gần đây:
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            {warmthList.slice(0, 3).map((item) => (
              <div key={item.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span>{item.icon}</span>
                  <span>{item.text}</span>
                </span>
                <span style={{ fontSize: '0.7rem', color: '#b45309' }}>{item.time}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default AnonymousWarmthBox;
