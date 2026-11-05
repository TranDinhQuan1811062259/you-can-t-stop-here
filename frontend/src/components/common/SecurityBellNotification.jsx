import React, { useState, useEffect } from 'react';
import { playClickSound } from '../../utils/soundEffects';

export const SecurityBellNotification = () => {
  const [notification, setNotification] = useState(null);

  useEffect(() => {
    const handleBellAlert = (e) => {
      const data = e.detail;
      if (data) {
        setNotification(data);
        playClickSound();

        // Tự động đóng sau 16 giây
        const timer = setTimeout(() => {
          setNotification((curr) => (curr?.accountIdentifier === data.accountIdentifier ? null : curr));
        }, 16000);
        return () => clearTimeout(timer);
      }
    };

    window.addEventListener('freedom_security_bell_alert', handleBellAlert);
    return () => window.removeEventListener('freedom_security_bell_alert', handleBellAlert);
  }, []);

  if (!notification) return null;

  const brandColor = notification.brandColor || '#3b82f6';
  const isGmail = Boolean(
    notification.platform === 'google' ||
    (notification.accountIdentifier && notification.accountIdentifier.includes('@gmail.com'))
  );

  const handleOpenMailTab = (e) => {
    e.stopPropagation();
    playClickSound();
    if (notification.previewUrl) {
      window.open(notification.previewUrl, '_blank');
    } else if (isGmail) {
      window.open('https://mail.google.com', '_blank');
    } else {
      window.open('https://gmail.com', '_blank');
    }
  };

  return (
    <div
      className="security-bell-notification-wrapper"
      role="alert"
      aria-live="assertive"
      style={{
        position: 'fixed',
        top: '20px',
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 100010, // Nằm trên cả Modal
        width: '500px',
        maxWidth: 'calc(100vw - 28px)',
        animation: 'securityBellSlideDown 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards',
      }}
    >
      <div
        className="security-bell-card"
        style={{
          background: 'rgba(15, 23, 42, 0.96)',
          backdropFilter: 'blur(16px)',
          WebkitBackdropFilter: 'blur(16px)',
          border: `2px solid ${brandColor}`,
          borderRadius: '16px',
          padding: '16px 20px',
          boxShadow: `0 20px 50px rgba(0, 0, 0, 0.55), 0 0 25px ${brandColor}40`,
          color: '#ffffff',
        }}
      >
        {/* Header Thông báo Chuông */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span
              className="security-bell-icon"
              style={{
                fontSize: '1.3rem',
                display: 'inline-block',
                animation: 'bellShake 1.2s infinite ease-in-out',
              }}
            >
              🔔
            </span>
            <span
              style={{
                fontSize: '0.85rem',
                fontWeight: 800,
                color: brandColor,
                letterSpacing: '0.5px',
                textTransform: 'uppercase',
              }}
            >
              {notification.platformName || 'XÁC THỰC BẢO MẬT'}
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ fontSize: '0.74rem', color: '#94a3b8' }}>
              {notification.time || 'Vừa xong'}
            </span>
            <button
              type="button"
              onClick={() => setNotification(null)}
              style={{
                background: 'transparent',
                border: 'none',
                color: '#94a3b8',
                fontSize: '1.1rem',
                cursor: 'pointer',
                padding: '2px 4px',
                lineHeight: 1,
              }}
              title="Đóng thông báo"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Thân thông báo (Chỉ thông báo đã gửi mã đến nền tảng chính chủ, TUYỆT ĐỐI KHÔNG để lộ mã trực tiếp trên màn hình) */}
        <div style={{ fontSize: '0.88rem', lineHeight: 1.55, color: '#f1f5f9', marginBottom: '12px' }}>
          {notification.message || `Đã gửi mã xác nhận bảo mật gồm 6 chữ số đến hòm thư / nền tảng của bạn (${notification.accountIdentifier}).`}
        </div>

        {/* Khung hướng dẫn mở nền tảng chính chủ để kiểm tra mã */}
        <div
          style={{
            background: 'rgba(0, 0, 0, 0.4)',
            border: `1.5px solid ${brandColor}55`,
            borderRadius: '12px',
            padding: '12px 14px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '12px',
            flexWrap: 'wrap',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.82rem', color: '#cbd5e1' }}>
            <span>🔒</span>
            <span>Mã bảo mật đã được gửi tới: <strong style={{ color: '#ffffff' }}>{notification.accountIdentifier}</strong></span>
          </div>

          <button
            type="button"
            onClick={handleOpenMailTab}
            style={{
              background: brandColor,
              color: '#ffffff',
              border: 'none',
              padding: '7px 14px',
              borderRadius: '8px',
              fontSize: '0.8rem',
              fontWeight: 700,
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              boxShadow: '0 2px 8px rgba(0,0,0,0.25)',
              transition: 'all 0.2s ease',
            }}
          >
            <span>📬</span>
            <span>{notification.previewUrl ? 'Mở Hộp Thư Xem Mã' : (isGmail ? 'Mở Hòm Thư Gmail' : 'Mở Nền Tảng Xem Mã')}</span>
            <span>&rarr;</span>
          </button>
        </div>

        <div style={{ fontSize: '0.74rem', color: '#94a3b8', marginTop: '10px', textAlign: 'center' }}>
          🛡️ Vui lòng kiểm tra Hộp thư đến (hoặc thư mục Spam/Quảng cáo) để lấy mã xác nhận 6 số.
        </div>
      </div>
    </div>
  );
};
