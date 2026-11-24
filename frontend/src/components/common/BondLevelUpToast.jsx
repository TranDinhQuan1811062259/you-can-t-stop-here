import React, { useState, useEffect } from 'react';
import { triggerHaptic, triggerToneHaptic } from '../../utils/haptics';
import {
  playCampfireSound,
  playNotificationTone,
  isCampfireSoundEnabled,
} from '../../utils/campfireAudio';

export const BondLevelUpToast = () => {
  const [levelUpData, setLevelUpData] = useState(null);

  useEffect(() => {
    let hideTimer = null;

    const handleLevelUp = (e) => {
      const data = e.detail;
      if (!data || !data.tierName) return;

      setLevelUpData(data);

      if (isCampfireSoundEnabled()) {
        playNotificationTone(null, { volume: 0.55 });
        playCampfireSound({ volume: 0.35 });
        triggerToneHaptic();
      } else {
        triggerHaptic([20, 40, 20]);
      }

      if (hideTimer) clearTimeout(hideTimer);
      hideTimer = setTimeout(() => {
        setLevelUpData(null);
      }, 5000);
    };

    window.addEventListener('freedom_bond_level_up', handleLevelUp);

    return () => {
      window.removeEventListener('freedom_bond_level_up', handleLevelUp);
      if (hideTimer) clearTimeout(hideTimer);
    };
  }, []);

  if (!levelUpData) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      style={{
        position: 'fixed',
        top: '20px',
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 999999,
        width: '92%',
        maxWidth: '440px',
        pointerEvents: 'auto',
        animation: 'bondLevelUpSlideDown 0.35s cubic-bezier(0.16, 1, 0.3, 1)',
        boxSizing: 'border-box',
      }}
    >
      <div
        style={{
          background: 'linear-gradient(135deg, rgba(15, 23, 42, 0.96) 0%, rgba(30, 41, 59, 0.98) 100%)',
          border: '1.5px solid #f59e0b',
          borderRadius: '16px',
          padding: '12px 16px',
          boxShadow: '0 12px 35px rgba(0, 0, 0, 0.6), 0 0 25px rgba(245, 158, 11, 0.3)',
          backdropFilter: 'blur(12px)',
          WebkitBackdropFilter: 'blur(12px)',
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          color: '#f8fafc',
        }}
      >
        <div
          style={{
            width: '42px',
            height: '42px',
            borderRadius: '50%',
            background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '1.35rem',
            flexShrink: 0,
            boxShadow: '0 2px 10px rgba(245, 158, 11, 0.4)',
          }}
        >
          ✨
        </div>

        <div style={{ flex: '1 1 auto', minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
            <span
              style={{
                fontSize: '0.72rem',
                fontWeight: 800,
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
                color: '#f59e0b',
              }}
            >
              Thăng Cấp Kết Nối
            </span>
            <span
              style={{
                fontSize: '0.7rem',
                background: 'rgba(245, 158, 11, 0.2)',
                color: '#fbbf24',
                padding: '1px 6px',
                borderRadius: '4px',
                fontWeight: 700,
              }}
            >
              +{levelUpData.mutualScore}đ
            </span>
          </div>

          <div
            style={{
              fontSize: '0.88rem',
              fontWeight: 700,
              color: '#ffffff',
              margin: '2px 0 0',
              lineHeight: 1.35,
              wordBreak: 'break-word',
            }}
          >
            Kết nối với <strong style={{ color: '#38bdf8' }}>{levelUpData.partnerName}</strong> vừa đạt cấp{' '}
            <span style={{ color: '#f59e0b' }}>{levelUpData.badge || levelUpData.tierName}</span>!
          </div>
        </div>

        <button
          type="button"
          onClick={() => setLevelUpData(null)}
          title="Đóng thông báo"
          style={{
            background: 'transparent',
            border: 'none',
            color: '#94a3b8',
            fontSize: '1.1rem',
            cursor: 'pointer',
            padding: '4px',
            lineHeight: 1,
            flexShrink: 0,
          }}
        >
          ✕
        </button>
      </div>

      <style>{`
        @keyframes bondLevelUpSlideDown {
          from {
            opacity: 0;
            transform: translate(-50%, -15px) scale(0.96);
          }
          to {
            opacity: 1;
            transform: translate(-50%, 0) scale(1);
          }
        }
      `}</style>
    </div>
  );
};

export default BondLevelUpToast;
