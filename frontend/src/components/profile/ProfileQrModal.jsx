import React, { useRef, useState, useEffect } from 'react';
import { QRCodeCanvas } from 'qrcode.react';
import { playClickSound } from '../../utils/soundEffects';

export const ProfileQrModal = ({ isOpen, onClose, user, profileUrl }) => {
  const qrRef = useRef(null);
  const [copyFeedback, setCopyFeedback] = useState('');
  const [qrSize, setQrSize] = useState(210);

  const targetUrl = profileUrl || (typeof window !== 'undefined' ? `${window.location.origin}/profile/${user?._id || ''}` : '');

  // Tự động điều chỉnh kích thước QR Canvas theo chiều rộng màn hình (chống tràn trên 360px - 430px)
  useEffect(() => {
    const updateQrSize = () => {
      if (typeof window === 'undefined') return;
      const w = window.innerWidth;
      if (w <= 375) {
        setQrSize(175);
      } else if (w <= 430) {
        setQrSize(195);
      } else {
        setQrSize(215);
      }
    };
    updateQrSize();
    window.addEventListener('resize', updateQrSize);
    return () => window.removeEventListener('resize', updateQrSize);
  }, []);

  // Đóng khi bấm phím Escape (Quy tắc 3 GEMINI.md)
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Sao chép link trang cá nhân vào Clipboard
  const handleCopyLink = async () => {
    playClickSound();
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(targetUrl);
      } else {
        const textArea = document.createElement('textarea');
        textArea.value = targetUrl;
        textArea.style.position = 'fixed';
        textArea.style.left = '-9999px';
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
      }
      setCopyFeedback('✓ Đã sao chép liên kết hồ sơ!');
      setTimeout(() => setCopyFeedback(''), 3000);
    } catch (err) {
      console.warn('Lỗi copy link:', err);
      setCopyFeedback('Không thể tự động sao chép. Vui lòng copy thủ công!');
    }
  };

  // Tải ảnh mã QR dạng PNG về máy
  const handleDownloadQr = () => {
    playClickSound();
    try {
      const canvas = qrRef.current?.querySelector('canvas');
      if (!canvas) return;

      const dataUrl = canvas.toDataURL('image/png');
      const safeName = (user?.name || 'profile').toLowerCase().replace(/\s+/g, '-');
      const link = document.createElement('a');
      link.download = `qr-profile-${safeName}.png`;
      link.href = dataUrl;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      setCopyFeedback('✓ Đã tải mã QR về máy thành công!');
      setTimeout(() => setCopyFeedback(''), 3000);
    } catch (err) {
      console.warn('Lỗi tải mã QR:', err);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(4, 7, 16, 0.85)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        zIndex: 99999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '0.85rem',
        boxSizing: 'border-box',
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: 'linear-gradient(165deg, rgba(17, 24, 39, 0.98) 0%, rgba(10, 15, 30, 0.99) 100%)',
          border: '1px solid rgba(56, 189, 248, 0.35)',
          borderRadius: '20px',
          boxShadow: '0 25px 60px rgba(0, 0, 0, 0.75), 0 0 45px rgba(56, 189, 248, 0.12)',
          width: '100%',
          maxWidth: '430px',
          maxHeight: '94vh',
          overflowY: 'auto',
          WebkitOverflowScrolling: 'touch',
          display: 'flex',
          flexDirection: 'column',
          animation: 'fadeIn 0.25s ease',
          boxSizing: 'border-box',
        }}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label="Mã QR Hồ Sơ Cá Nhân"
      >
        {/* Header Modal */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '1rem 1.25rem',
            borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
            background: 'rgba(15, 23, 42, 0.6)',
            flexShrink: 0,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ fontSize: '1.25rem' }}>📱</span>
            <div>
              <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 800, color: '#f8fafc' }}>
                Mã QR Trang Cá Nhân
              </h3>
              <span style={{ fontSize: '0.72rem', color: '#94a3b8' }}>
                Scan-To-Profile &bull; Quét để mở trực tiếp
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            title="Đóng (ESC)"
            style={{
              background: 'rgba(255, 255, 255, 0.06)',
              border: '1px solid rgba(255, 255, 255, 0.12)',
              color: '#cbd5e1',
              width: '32px',
              height: '32px',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '0.9rem',
              cursor: 'pointer',
              flexShrink: 0,
            }}
          >
            ✕
          </button>
        </div>

        {/* Nội dung QR Body */}
        <div style={{ padding: '1.4rem 1.1rem', textAlign: 'center', flex: '1 1 auto' }}>
          {/* Thông tin chủ hồ sơ */}
          <div style={{ marginBottom: '1rem' }}>
            <h4 style={{ margin: 0, fontSize: '1.1rem', color: '#f8fafc', fontWeight: 800 }}>
              {user?.name || 'Thành viên Freedom'}
            </h4>
            <p style={{ margin: '3px 0 0', fontSize: '0.78rem', color: '#94a3b8' }}>
              {user?.jobTitle || 'Người đi làm'}
            </p>
          </div>

          {/* Vùng chứa mã QR */}
          <div
            ref={qrRef}
            style={{
              display: 'inline-block',
              background: '#ffffff',
              padding: '12px',
              borderRadius: '16px',
              boxShadow: '0 12px 35px rgba(0, 0, 0, 0.5), 0 0 25px rgba(56, 189, 248, 0.15)',
              border: '3px solid #38bdf8',
              maxWidth: '100%',
              boxSizing: 'border-box',
            }}
          >
            <QRCodeCanvas
              value={targetUrl}
              size={qrSize}
              level="H"
              includeMargin={true}
              bgColor="#ffffff"
              fgColor="#0f172a"
              style={{ display: 'block', maxWidth: '100%', height: 'auto' }}
            />
          </div>

          <p style={{ margin: '12px 0 0', fontSize: '0.78rem', color: '#cbd5e1', lineHeight: 1.45 }}>
            Dùng camera điện thoại quét mã QR để mở thẳng hồ sơ trên trình duyệt!
          </p>

          {copyFeedback && (
            <div
              style={{
                marginTop: '10px',
                background: 'rgba(34, 197, 94, 0.15)',
                border: '1px solid rgba(34, 197, 94, 0.35)',
                color: '#4ade80',
                padding: '6px 12px',
                borderRadius: '8px',
                fontSize: '0.78rem',
                fontWeight: 600,
                animation: 'fadeIn 0.2s ease',
              }}
            >
              {copyFeedback}
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '1rem 1.1rem',
            borderTop: '1px solid rgba(255, 255, 255, 0.08)',
            background: 'rgba(15, 23, 42, 0.5)',
            flexShrink: 0,
          }}
        >
          <button
            type="button"
            onClick={handleCopyLink}
            style={{
              flex: 1,
              padding: '10px 10px',
              borderRadius: '10px',
              background: 'rgba(255, 255, 255, 0.08)',
              border: '1px solid rgba(255, 255, 255, 0.15)',
              color: '#f8fafc',
              fontSize: '0.82rem',
              fontWeight: 700,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              whiteSpace: 'nowrap',
            }}
          >
            <span>🔗</span>
            <span>Sao Chép Link</span>
          </button>

          <button
            type="button"
            onClick={handleDownloadQr}
            style={{
              flex: 1,
              padding: '10px 10px',
              borderRadius: '10px',
              background: 'linear-gradient(135deg, #0284c7 0%, #38bdf8 100%)',
              border: 'none',
              color: '#ffffff',
              fontSize: '0.82rem',
              fontWeight: 700,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              boxShadow: '0 4px 15px rgba(2, 132, 199, 0.35)',
              whiteSpace: 'nowrap',
            }}
          >
            <span>⬇️</span>
            <span>Tải Ảnh QR</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default ProfileQrModal;
