import React, { useState, useEffect } from 'react';
import { playClickSound } from '../../utils/soundEffects';

export const SecurityBellNotification = () => {
  const [notification, setNotification] = useState(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const handleBellAlert = (e) => {
      const data = e.detail;
      if (data) {
        setNotification(data);
        setCopied(false);
        playClickSound();

        // Tự động đóng sau 24 giây
        const timer = setTimeout(() => {
          setNotification((curr) => (curr?.accountIdentifier === data.accountIdentifier ? null : curr));
        }, 24000);
        return () => clearTimeout(timer);
      }
    };

    window.addEventListener('freedom_security_bell_alert', handleBellAlert);
    return () => window.removeEventListener('freedom_security_bell_alert', handleBellAlert);
  }, []);

  const handleCopyOtp = (e) => {
    e.stopPropagation();
    if (!notification?.otpCode) return;
    try {
      navigator.clipboard.writeText(notification.otpCode);
      setCopied(true);
      playClickSound();
      setTimeout(() => setCopied(false), 3000);
    } catch (err) {
      console.warn('Clipboard write error:', err);
    }
  };

  const handleAutofillOtp = (e) => {
    e.stopPropagation();
    if (!notification?.otpCode) return;
    playClickSound();
    window.dispatchEvent(
      new CustomEvent('freedom_autofill_otp', {
        detail: { code: notification.otpCode },
      })
    );
  };

  if (!notification) return null;

  const brandColor = notification.brandColor || '#3b82f6';
  const isFacebook = notification.platform === 'facebook';
  const isTikTok = notification.platform === 'tiktok';
  const isPhone = Boolean(
    !isFacebook && !isTikTok &&
    (notification.isPhone ||
      notification.platform === 'sms' ||
      (notification.accountIdentifier && !notification.accountIdentifier.includes('@') && /^[0-9+\s\-()]{8,15}$/.test(notification.accountIdentifier.replace(/\s+/g, ''))))
  );
  const isGmail = Boolean(
    !isFacebook && !isTikTok && !isPhone &&
    (notification.platform === 'google' || (notification.accountIdentifier && notification.accountIdentifier.includes('@gmail.com')))
  );

  const handleActionClick = (e) => {
    e.stopPropagation();
    playClickSound();
    if (isFacebook) {
      window.open('https://facebook.com', '_blank');
      return;
    }
    if (isTikTok) {
      window.open('https://tiktok.com', '_blank');
      return;
    }
    if (isPhone) {
      // Mở popup SMS alert nổi
      window.dispatchEvent(
        new CustomEvent('freedom_sms_alert_received', {
          detail: {
            phoneNumber: notification.accountIdentifier,
            sender: notification.platformName || 'SMS Security',
            content: `[Xác Thực Bảo Mật] SĐT ${notification.accountIdentifier} vừa được yêu cầu đăng nhập. Vui lòng hoàn tất xác thực trên web.`,
            time: 'Vừa xong',
          },
        })
      );
      return;
    }
    if (notification.previewUrl) {
      window.open(notification.previewUrl, '_blank');
    } else if (isGmail) {
      window.open('https://mail.google.com', '_blank');
    } else if (notification.url) {
      window.open(notification.url, '_blank');
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

        {/* Thân thông báo */}
        <div style={{ fontSize: '0.88rem', lineHeight: 1.55, color: '#f1f5f9', marginBottom: '12px' }}>
          {notification.message || `Đã gửi mã xác nhận bảo mật gồm 6 chữ số đến hòm thư / nền tảng của bạn (${notification.accountIdentifier}).`}
        </div>

        {/* Khung Mã Xác Nhận OTP kiểu TikTok (Có nút Sao Chép Mã & Tự Điền Nhanh) */}
        {notification.otpCode && (
          <div
            style={{
              background: 'rgba(255, 255, 255, 0.09)',
              border: `1.5px dashed ${brandColor}`,
              borderRadius: '12px',
              padding: '12px 16px',
              marginBottom: '12px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '12px',
              flexWrap: 'wrap',
            }}
          >
            <div>
              <div style={{ fontSize: '0.72rem', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '2px' }}>
                🔑 Mã xác nhận bảo mật của bạn:
              </div>
              <div
                style={{
                  fontFamily: 'monospace',
                  fontSize: '1.45rem',
                  fontWeight: 800,
                  letterSpacing: '4px',
                  color: '#ffffff',
                }}
              >
                {notification.otpCode.slice(0, 3)} {notification.otpCode.slice(3)}
              </div>
            </div>

            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                type="button"
                onClick={handleCopyOtp}
                style={{
                  background: copied ? '#059669' : 'rgba(255, 255, 255, 0.16)',
                  color: '#ffffff',
                  border: '1px solid rgba(255, 255, 255, 0.25)',
                  padding: '7px 14px',
                  borderRadius: '8px',
                  fontSize: '0.8rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  transition: 'all 0.2s ease',
                }}
              >
                <span>{copied ? '✓' : '📋'}</span>
                <span>{copied ? 'Đã sao chép' : 'Sao chép mã'}</span>
              </button>

              <button
                type="button"
                onClick={handleAutofillOtp}
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
                  boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
                  transition: 'all 0.2s ease',
                }}
              >
                <span>⚡</span>
                <span>Chạm tự điền</span>
              </button>
            </div>
          </div>
        )}

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
            <span>{isFacebook ? '👥' : isTikTok ? '🎵' : isPhone ? '📱' : '🔒'}</span>
            <span>
              {isFacebook
                ? 'Phê duyệt bảo mật gửi đến Facebook: '
                : isTikTok
                ? 'Phê duyệt bảo mật gửi đến TikTok: '
                : isPhone
                ? 'Mã bảo mật SMS đã gửi tới SĐT: '
                : 'Mã bảo mật đã được gửi tới: '}
              <strong style={{ color: '#ffffff' }}>{notification.accountIdentifier}</strong>
            </span>
          </div>

          <button
            type="button"
            onClick={handleActionClick}
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
            <span>{isFacebook ? '🔔' : isTikTok ? '🎵' : isPhone ? '📱' : '📬'}</span>
            <span>
              {isFacebook
                ? 'Mở Facebook Phê Duyệt'
                : isTikTok
                ? 'Mở TikTok Phê Duyệt'
                : isPhone
                ? 'Xem Tin Nhắn SMS'
                : notification.previewUrl
                ? 'Mở Hộp Thư Xem Mã'
                : isGmail
                ? 'Mở Hòm Thư Gmail'
                : 'Mở Hòm Thư Email'}
            </span>
            <span>&rarr;</span>
          </button>
        </div>

        <div style={{ fontSize: '0.74rem', color: '#94a3b8', marginTop: '10px', textAlign: 'center' }}>
          {isFacebook
            ? '🛡️ Vui lòng kiểm tra thông báo phê duyệt trên Facebook hoặc sao chép mã 6 số ở trên.'
            : isTikTok
            ? '🛡️ Vui lòng kiểm tra thông báo phê duyệt trên TikTok hoặc sao chép mã 6 số ở trên.'
            : isPhone
            ? '🛡️ Vui lòng kiểm tra Tin nhắn SMS trên điện thoại của bạn để lấy mã xác nhận 6 số.'
            : '🛡️ Vui lòng kiểm tra Hộp thư đến (hoặc thư mục Spam/Quảng cáo) để lấy mã xác nhận 6 số.'}
        </div>
      </div>
    </div>
  );
};
