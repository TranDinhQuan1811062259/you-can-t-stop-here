import React, { useState, useEffect } from 'react';
import { playClickSound, playSingingBowlSound } from '../../utils/soundEffects';

/**
 * PeaceCandleBox - Nến Thắp Bình Yên
 * Một không gian tĩnh lặng ở chân bài viết để người đọc có thể thắp một ngọn nến
 * gửi gắm sự đồng cảm, an ủi thầm lặng tới tác giả mà không cần gõ chữ.
 */
export const PeaceCandleBox = ({ postId, authorName = 'tác giả' }) => {
  const key = `freedom_candle_post_${postId || 'demo'}`;
  const userLitKey = `freedom_user_lit_candle_${postId || 'demo'}`;

  // Sinh số nến mặc định tự nhiên theo mã hash của postId (25 - 68)
  const defaultBaseCount = Math.abs(
    (postId || 'post').split('').reduce((acc, char) => acc + char.charCodeAt(0), 0) % 45
  ) + 24;

  const [candleCount, setCandleCount] = useState(() => {
    try {
      const saved = localStorage.getItem(key);
      if (saved) return parseInt(saved, 10);
    } catch (_) {}
    return defaultBaseCount;
  });

  const [hasLit, setHasLit] = useState(() => {
    try {
      return localStorage.getItem(userLitKey) === 'true';
    } catch (_) {}
    return false;
  });

  const [isAnimating, setIsAnimating] = useState(false);
  const [sparks, setSparks] = useState([]);

  const handleLightCandle = () => {
    if (hasLit) return;

    playSingingBowlSound();
    setIsAnimating(true);
    setHasLit(true);
    setCandleCount((prev) => {
      const next = prev + 1;
      try {
        localStorage.setItem(key, next.toString());
        localStorage.setItem(userLitKey, 'true');
      } catch (_) {}
      return next;
    });

    // Tạo chùm tia sáng vàng bung nở
    const newSparks = Array.from({ length: 12 }).map((_, i) => ({
      id: Date.now() + i,
      x: (Math.random() - 0.5) * 90,
      y: (Math.random() - 0.5) * 80 - 30,
      size: Math.random() * 6 + 3,
      delay: Math.random() * 0.2,
    }));
    setSparks(newSparks);

    setTimeout(() => {
      setIsAnimating(false);
      setSparks([]);
    }, 2000);
  };

  return (
    <div
      className="peace-candle-box"
      style={{
        margin: '24px 0',
        padding: '24px 22px',
        borderRadius: '20px',
        background: 'linear-gradient(135deg, rgba(254, 243, 199, 0.08) 0%, rgba(15, 23, 42, 0.75) 100%)',
        border: '1.5px solid rgba(251, 191, 36, 0.35)',
        boxShadow: hasLit
          ? '0 12px 36px rgba(245, 158, 11, 0.2), 0 0 25px rgba(245, 158, 11, 0.15)'
          : '0 8px 24px rgba(0, 0, 0, 0.25)',
        position: 'relative',
        overflow: 'hidden',
        textAlign: 'center',
        transition: 'all 0.4s ease',
      }}
    >
      {/* Vầng sáng vàng ấm nền */}
      <div
        style={{
          position: 'absolute',
          top: '-30px',
          left: '50%',
          transform: 'translateX(-50%)',
          width: '180px',
          height: '140px',
          background: hasLit
            ? 'radial-gradient(circle, rgba(251, 191, 36, 0.35) 0%, transparent 70%)'
            : 'radial-gradient(circle, rgba(251, 191, 36, 0.15) 0%, transparent 70%)',
          filter: 'blur(15px)',
          pointerEvents: 'none',
          transition: 'all 0.5s ease',
        }}
      />

      {/* Cây Nến 3D Tương Tác */}
      <div style={{ position: 'relative', display: 'inline-block', margin: '6px 0 16px' }}>
        {/* Tia sáng nở bung khi thắp */}
        {sparks.map((s) => (
          <span
            key={s.id}
            style={{
              position: 'absolute',
              top: '0',
              left: '50%',
              width: `${s.size}px`,
              height: `${s.size}px`,
              borderRadius: '50%',
              background: '#fef08a',
              boxShadow: '0 0 10px #f59e0b',
              transform: `translate(${s.x}px, ${s.y}px)`,
              animation: `sparkleFly 1.5s ease-out forwards ${s.delay}s`,
              pointerEvents: 'none',
            }}
          />
        ))}

        {/* Ngọn Lửa Nến */}
        <div
          className={`candle-flame ${hasLit ? 'is-glowing-bright' : 'is-flickering'}`}
          style={{
            width: '18px',
            height: '28px',
            margin: '0 auto 2px',
            borderRadius: '50% 50% 35% 35% / 60% 60% 40% 40%',
            background: hasLit
              ? 'linear-gradient(180deg, #ffffff 0%, #fef08a 30%, #f59e0b 70%, #d97706 100%)'
              : 'linear-gradient(180deg, #fef3c7 0%, #fbbf24 45%, #b45309 100%)',
            boxShadow: hasLit
              ? '0 0 20px #fbbf24, 0 0 35px #f59e0b, 0 0 50px rgba(245, 158, 11, 0.6)'
              : '0 0 10px rgba(245, 158, 11, 0.5)',
            animation: 'candleFlameFlicker 2s infinite ease-in-out alternate',
            transformOrigin: 'center bottom',
          }}
        />

        {/* Tim nến (Bấc nến) */}
        <div
          style={{
            width: '2px',
            height: '7px',
            background: '#451a03',
            margin: '0 auto',
            borderRadius: '1px',
          }}
        />

        {/* Thân Nến Sáp Sang Trọng */}
        <div
          style={{
            width: '38px',
            height: '52px',
            background: 'linear-gradient(180deg, #fef3c7 0%, #fde68a 35%, #f59e0b 100%)',
            borderRadius: '5px 5px 4px 4px',
            boxShadow: '0 6px 14px rgba(0, 0, 0, 0.4), inset 0 2px 4px rgba(255, 255, 255, 0.6)',
            position: 'relative',
          }}
        >
          {/* Giọt sáp chảy mềm mại */}
          <span
            style={{
              position: 'absolute',
              top: '4px',
              left: '6px',
              width: '6px',
              height: '16px',
              background: '#fef3c7',
              borderRadius: '0 0 6px 6px',
            }}
          />
        </div>

        {/* Đĩa Nến Đồng */}
        <div
          style={{
            width: '64px',
            height: '10px',
            margin: '0 auto',
            background: 'linear-gradient(180deg, #92400e, #451a03)',
            borderRadius: '0 0 14px 14px',
            border: '1px solid rgba(245, 158, 11, 0.35)',
            boxShadow: '0 4px 10px rgba(0,0,0,0.5)',
          }}
        />
      </div>

      {/* Tiêu đề & Thông điệp */}
      <div style={{ position: 'relative', zIndex: 2, maxWidth: '520px', margin: '0 auto' }}>
        <h4 style={{ margin: '0 0 6px', fontSize: '1.12rem', fontWeight: 800, color: '#fef3c7' }}>
          🕯️ Thắp Một Ngọn Nến Bình Yên
        </h4>
        <p style={{ margin: '0 0 14px', fontSize: '0.86rem', color: '#cbd5e1', lineHeight: 1.6 }}>
          Nếu bạn đồng cảm với câu chuyện này nhưng chưa biết bình luận gì, hãy thắp lên một ngọn nến để gửi lời chúc bình yên thầm lặng đến <strong>{authorName}</strong>.
        </p>

        {/* Số Lượng Nến Đã Thắp */}
        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            padding: '6px 16px',
            borderRadius: '999px',
            background: 'rgba(245, 158, 11, 0.18)',
            border: '1px solid rgba(251, 191, 36, 0.4)',
            color: '#fef08a',
            fontSize: '0.84rem',
            fontWeight: 700,
            marginBottom: '16px',
          }}
        >
          <span>🔥</span>
          <span>
            Đã có <strong>{candleCount}</strong> ngọn nến được thắp sáng cho tâm sự này
          </span>
        </div>

        {/* Nút Thắp Nến */}
        <div>
          <button
            type="button"
            onClick={handleLightCandle}
            disabled={hasLit}
            style={{
              padding: '12px 28px',
              borderRadius: '999px',
              background: hasLit
                ? 'rgba(16, 185, 129, 0.25)'
                : 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
              border: hasLit ? '1.5px solid #34d399' : 'none',
              color: hasLit ? '#6ee7b7' : '#0f172a',
              fontWeight: 800,
              fontSize: '0.92rem',
              cursor: hasLit ? 'default' : 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              boxShadow: hasLit ? 'none' : '0 8px 24px rgba(245, 158, 11, 0.45)',
              transition: 'all 0.25s ease',
            }}
          >
            <span>{hasLit ? '✨' : '🕯️'}</span>
            <span>
              {hasLit
                ? 'Ngọn nến của bạn đang cháy sáng • Cảm ơn sự ấm áp của bạn 🌿'
                : 'Thắp Nến Sẻ Chia Ngay'}
            </span>
          </button>
        </div>

        {hasLit && (
          <p
            style={{
              marginTop: '12px',
              fontSize: '0.78rem',
              color: '#fcd34d',
              fontStyle: 'italic',
              animation: 'fadeIn 0.3s ease',
            }}
          >
            "Một ngọn nến thắp lên không làm mất đi ánh sáng của chính nó, nhưng có thể xoa dịu cả một góc đêm tối của ai đó."
          </p>
        )}
      </div>

      <style>{`
        @keyframes candleFlameFlicker {
          0% { transform: scale(1) rotate(-1.5deg); }
          50% { transform: scale(1.06, 0.96) rotate(1.5deg); }
          100% { transform: scale(0.96, 1.05) rotate(-0.5deg); }
        }
        @keyframes sparkleFly {
          0% { opacity: 1; transform: translate(0, 0) scale(1); }
          100% { opacity: 0; transform: translate(var(--tx, 30px), var(--ty, -50px)) scale(0); }
        }
      `}</style>
    </div>
  );
};
