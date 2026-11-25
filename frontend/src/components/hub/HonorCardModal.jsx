import React, { useRef, useEffect, useState, useCallback } from 'react';
import { useAuth } from '../../context/AuthContext';
import { getHighestBadge } from '../../utils/badgeHelper';
import { playClickSound } from '../../utils/soundEffects';

export const HonorCardModal = ({ isOpen, onClose, streakCount = 0 }) => {
  const { user } = useAuth();
  const canvasRef = useRef(null);
  const [isGenerating, setIsGenerating] = useState(true);
  const [previewDataUrl, setPreviewDataUrl] = useState('');
  const [copyFeedback, setCopyFeedback] = useState('');

  const highestBadge = getHighestBadge(streakCount);

  // Tạo ảnh thẻ danh dự bằng Canvas thuần
  const generateHonorCard = useCallback(() => {
    setIsGenerating(true);
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    const width = 960;
    const height = 540;
    canvas.width = width;
    canvas.height = height;

    // 1. Nền tối Gradient Cinematic
    const bgGrad = ctx.createLinearGradient(0, 0, width, height);
    bgGrad.addColorStop(0, '#090d16');
    bgGrad.addColorStop(0.5, '#0f172a');
    bgGrad.addColorStop(1, '#050811');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, width, height);

    // 2. Hạt ánh sáng / Glow trang trí nền
    const radialGlow = ctx.createRadialGradient(width / 2, height / 2 - 20, 50, width / 2, height / 2, 450);
    radialGlow.addColorStop(0, 'rgba(245, 158, 11, 0.14)');
    radialGlow.addColorStop(0.6, 'rgba(234, 88, 12, 0.05)');
    radialGlow.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = radialGlow;
    ctx.fillRect(0, 0, width, height);

    // Điểm xuyết các đốm sáng nhỏ li ti lấp lánh
    const stars = [
      { x: 120, y: 90, r: 2, a: 0.5 },
      { x: 260, y: 140, r: 1.5, a: 0.3 },
      { x: 820, y: 110, r: 2.2, a: 0.6 },
      { x: 740, y: 220, r: 1.8, a: 0.4 },
      { x: 880, y: 430, r: 1.5, a: 0.35 },
      { x: 180, y: 460, r: 2, a: 0.45 },
      { x: 80, y: 320, r: 1.6, a: 0.3 },
    ];
    stars.forEach((s) => {
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(253, 230, 138, ${s.a})`;
      ctx.fill();
    });

    // 3. Khung viền mạ vàng kép sang trọng
    // Viền ngoài
    ctx.strokeStyle = 'rgba(245, 158, 11, 0.35)';
    ctx.lineWidth = 2;
    ctx.strokeRect(24, 24, width - 48, height - 48);

    // Viền trong
    ctx.strokeStyle = 'rgba(245, 158, 11, 0.15)';
    ctx.lineWidth = 1;
    ctx.strokeRect(32, 32, width - 64, height - 64);

    // Góc trang trí vàng kim
    const cornerSize = 16;
    ctx.strokeStyle = '#f59e0b';
    ctx.lineWidth = 3;
    // Góc trên - trái
    ctx.beginPath();
    ctx.moveTo(24, 24 + cornerSize);
    ctx.lineTo(24, 24);
    ctx.lineTo(24 + cornerSize, 24);
    ctx.stroke();
    // Góc trên - phải
    ctx.beginPath();
    ctx.moveTo(width - 24 - cornerSize, 24);
    ctx.lineTo(width - 24, 24);
    ctx.lineTo(width - 24, 24 + cornerSize);
    ctx.stroke();
    // Góc dưới - trái
    ctx.beginPath();
    ctx.moveTo(24, height - 24 - cornerSize);
    ctx.lineTo(24, height - 24);
    ctx.lineTo(24 + cornerSize, height - 24);
    ctx.stroke();
    // Góc dưới - phải
    ctx.beginPath();
    ctx.moveTo(width - 24 - cornerSize, height - 24);
    ctx.lineTo(width - 24, height - 24);
    ctx.lineTo(width - 24, height - 24 - cornerSize);
    ctx.stroke();

    // 4. Header thẻ: Thương hiệu "YOU CAN'T STOP HERE" & Subtitle
    ctx.textAlign = 'center';
    ctx.fillStyle = '#f59e0b';
    ctx.font = 'bold 15px "Plus Jakarta Sans", sans-serif';
    ctx.letterSpacing = '5px';
    ctx.fillText('✦ YOU CAN\'T STOP HERE ✦', width / 2, 70);

    ctx.fillStyle = '#94a3b8';
    ctx.font = '500 13px "Plus Jakarta Sans", sans-serif';
    ctx.letterSpacing = '2px';
    ctx.fillText('CHỨNG NHẬN HÀNH TRÌNH BỀN BỈ & GIỮ LỬA LIÊN TỤC', width / 2, 94);

    // 5. Đường kẻ phân cách vàng kim nhẹ
    const lineGrad = ctx.createLinearGradient(width / 2 - 160, 0, width / 2 + 160, 0);
    lineGrad.addColorStop(0, 'rgba(245, 158, 11, 0)');
    lineGrad.addColorStop(0.5, 'rgba(245, 158, 11, 0.45)');
    lineGrad.addColorStop(1, 'rgba(245, 158, 11, 0)');
    ctx.fillStyle = lineGrad;
    ctx.fillRect(width / 2 - 160, 108, 320, 1.5);

    // 6. Vẽ Avatar người dùng (với fallback CORS an toàn)
    const avatarCenterX = width / 2;
    const avatarCenterY = 185;
    const avatarRadius = 48;

    const continueDrawingCardDetails = () => {
      ctx.textBaseline = 'alphabetic'; // reset

      // 7. Tên người dùng
      ctx.textAlign = 'center';
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 26px "Plus Jakarta Sans", sans-serif';
      ctx.letterSpacing = '0.5px';
      const displayName = user?.name || 'Thành viên Freedom';
      ctx.fillText(displayName, width / 2, 272);

      // 8. Huy hiệu danh dự đạt được
      const badgeIcon = highestBadge?.icon || '🔥';
      const badgeName = highestBadge?.name || 'Chiến Binh Freedom';
      const badgeColor = highestBadge?.color || '#f59e0b';

      // Badge pill background
      const pillWidth = 260;
      const pillHeight = 36;
      const pillX = width / 2 - pillWidth / 2;
      const pillY = 292;
      const pillRadius = 18;

      ctx.beginPath();
      ctx.roundRect(pillX, pillY, pillWidth, pillHeight, pillRadius);
      ctx.fillStyle = 'rgba(30, 41, 59, 0.75)';
      ctx.fill();
      ctx.strokeStyle = badgeColor;
      ctx.lineWidth = 1.5;
      ctx.stroke();

      ctx.fillStyle = badgeColor;
      ctx.font = 'bold 15px "Plus Jakarta Sans", sans-serif';
      ctx.letterSpacing = '0.5px';
      ctx.fillText(`${badgeIcon} Danh Hiệu: ${badgeName}`, width / 2, 316);

      // 9. Cột mốc Streak Lửa Rực Rỡ
      ctx.fillStyle = '#fbbf24';
      ctx.font = 'bold 38px "Plus Jakarta Sans", sans-serif';
      ctx.letterSpacing = '1px';
      ctx.fillText(`🔥 ${streakCount} NGÀY GIỮ LỬA`, width / 2, 390);

      // 10. Châm ngôn động lực
      ctx.fillStyle = '#cbd5e1';
      ctx.font = 'italic 15px "Plus Jakarta Sans", sans-serif';
      ctx.letterSpacing = '0.2px';
      ctx.fillText('“Mỗi ngày tiến lên một bước nhỏ, ngọn lửa bên trong sẽ không bao giờ tắt.”', width / 2, 430);

      // 11. Footer thẻ: Ngày tạo & Verify URL
      const nowVN = new Date();
      const dateFormatted = new Intl.DateTimeFormat('vi-VN', {
        timeZone: 'Asia/Ho_Chi_Minh',
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
      }).format(nowVN);

      ctx.textAlign = 'left';
      ctx.fillStyle = '#64748b';
      ctx.font = '12px "Plus Jakarta Sans", sans-serif';
      ctx.letterSpacing = '0.5px';
      ctx.fillText(`Xác nhận ngày: ${dateFormatted} (GMT+7)`, 50, 495);

      ctx.textAlign = 'right';
      ctx.fillStyle = '#f59e0b';
      ctx.font = 'bold 12px "Plus Jakarta Sans", sans-serif';
      ctx.letterSpacing = '0.5px';
      ctx.fillText('freedom-web • you-cant-stop-here', width - 50, 495);

      try {
        const dataUrl = canvas.toDataURL('image/png');
        setPreviewDataUrl(dataUrl);
      } catch (err) {
        console.warn('[HonorCard] Lỗi export dataUrl:', err);
      } finally {
        setIsGenerating(false);
      }
    };

    const drawFallbackAvatar = () => {
      // Vòng tròn Avatar gradient
      const avGrad = ctx.createLinearGradient(
        avatarCenterX - avatarRadius,
        avatarCenterY - avatarRadius,
        avatarCenterX + avatarRadius,
        avatarCenterY + avatarRadius
      );
      avGrad.addColorStop(0, '#0284c7');
      avGrad.addColorStop(1, '#38bdf8');
      ctx.beginPath();
      ctx.arc(avatarCenterX, avatarCenterY, avatarRadius, 0, Math.PI * 2);
      ctx.fillStyle = avGrad;
      ctx.fill();

      // Viền vàng kim
      ctx.strokeStyle = '#f59e0b';
      ctx.lineWidth = 3;
      ctx.stroke();

      // Ký tự đầu của tên
      const initial = (user?.name || 'U').charAt(0).toUpperCase();
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 36px "Plus Jakarta Sans", sans-serif';
      ctx.letterSpacing = '0px';
      ctx.fillText(initial, avatarCenterX, avatarCenterY);

      continueDrawingCardDetails();
    };

    // Kiểm tra có avatar không
    const userAvatarUrl = user?.avatar;
    if (userAvatarUrl && !userAvatarUrl.includes('default') && !userAvatarUrl.includes('google_avatar')) {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        try {
          ctx.save();
          ctx.beginPath();
          ctx.arc(avatarCenterX, avatarCenterY, avatarRadius, 0, Math.PI * 2);
          ctx.closePath();
          ctx.clip();
          ctx.drawImage(img, avatarCenterX - avatarRadius, avatarCenterY - avatarRadius, avatarRadius * 2, avatarRadius * 2);
          ctx.restore();

          // Viền vàng kim quanh avatar
          ctx.beginPath();
          ctx.arc(avatarCenterX, avatarCenterY, avatarRadius, 0, Math.PI * 2);
          ctx.strokeStyle = '#f59e0b';
          ctx.lineWidth = 3;
          ctx.stroke();

          continueDrawingCardDetails();
        } catch {
          // Nếu bị lỗi canvas tainted, vẽ fallback
          drawFallbackAvatar();
        }
      };
      img.onerror = () => {
        drawFallbackAvatar();
      };
      img.src = userAvatarUrl;
    } else {
      drawFallbackAvatar();
    }
  }, [user, streakCount, highestBadge]);

  useEffect(() => {
    if (isOpen) {
      // Delay nhỏ để DOM canvas sẵn sàng
      const timer = setTimeout(() => {
        generateHonorCard();
      }, 100);
      return () => clearTimeout(timer);
    } else {
      setPreviewDataUrl('');
      setCopyFeedback('');
    }
  }, [isOpen, generateHonorCard]);

  // Đóng khi nhấn ESC
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

  // Xử lý tải ảnh PNG về máy
  const handleDownloadImage = () => {
    playClickSound();
    if (!previewDataUrl) return;

    try {
      const link = document.createElement('a');
      const safeName = (user?.name || 'freedom-member').toLowerCase().replace(/\s+/g, '-');
      link.download = `honor-card-${safeName}-${streakCount}days.png`;
      link.href = previewDataUrl;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      setCopyFeedback('Đã tải ảnh thẻ danh dự về máy thành công!');
      setTimeout(() => setCopyFeedback(''), 4000);
    } catch (err) {
      console.warn('[HonorCard] Lỗi tải ảnh:', err);
      setCopyFeedback('Lỗi tải ảnh. Vui lòng thử lại!');
    }
  };

  // Xử lý sao chép lời nhắn kèm link
  const handleCopyShareText = async () => {
    playClickSound();
    const badgeText = highestBadge ? `${highestBadge.icon} ${highestBadge.name}` : 'Chiến Binh Freedom';
    const shareMessage = `🔥 Tôi vừa đạt chuỗi ${streakCount} ngày giữ lửa liên tục với danh hiệu [${badgeText}] tại You Can't Stop Here! Hãy cùng giữ vững thói quen và tiếp tục tiến bước nhé! 🚀\n${window.location.origin}`;

    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(shareMessage);
      } else {
        // Fallback cho trình duyệt cũ
        const textArea = document.createElement('textarea');
        textArea.value = shareMessage;
        textArea.style.position = 'fixed';
        textArea.style.left = '-9999px';
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
      }
      setCopyFeedback('Đã sao chép lời nhắn vào khay nhớ tạm (Clipboard)!');
      setTimeout(() => setCopyFeedback(''), 4000);
    } catch (err) {
      console.warn('[HonorCard] Lỗi copy:', err);
      setCopyFeedback('Không thể sao chép tự động. Hãy chụp màn hình nhé!');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="honor-card-overlay" onClick={onClose}>
      <div
        className="honor-card-modal-content"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label="Thẻ Danh Dự Kiên Trì"
      >
        <div className="honor-card-modal-header">
          <div className="honor-modal-title">
            <span style={{ fontSize: '1.3rem' }}>🏆</span>
            <h3>Thẻ Danh Dự Kiên Trì</h3>
          </div>
          <button
            type="button"
            className="honor-modal-close-btn"
            onClick={onClose}
            title="Đóng (ESC)"
            aria-label="Đóng thẻ danh dự"
          >
            <i className="fa-solid fa-xmark"></i>
          </button>
        </div>

        <div className="honor-card-preview-area">
          {/* Canvas ẩn dùng để vẽ ảnh có độ phân giải cao */}
          <canvas ref={canvasRef} style={{ display: 'none' }} />

          {isGenerating ? (
            <div className="honor-card-loading">
              <i className="fa-solid fa-spinner fa-spin" style={{ fontSize: '1.8rem', color: '#f59e0b' }}></i>
              <p>Đang khắc thẻ danh dự mạ vàng của bạn...</p>
            </div>
          ) : previewDataUrl ? (
            <div className="honor-card-image-wrap">
              <img
                src={previewDataUrl}
                alt="Thẻ Danh Dự Kiên Trì"
                className="honor-card-preview-img"
              />
            </div>
          ) : (
            <div className="honor-card-loading">
              <p>Chưa thể tạo thẻ danh dự. Vui lòng thử lại.</p>
            </div>
          )}
        </div>

        {copyFeedback && (
          <div className="honor-card-feedback-banner">
            <i className="fa-solid fa-circle-check"></i>
            <span>{copyFeedback}</span>
          </div>
        )}

        <div className="honor-card-modal-actions">
          <button
            type="button"
            className="honor-action-btn download-btn"
            onClick={handleDownloadImage}
            disabled={isGenerating || !previewDataUrl}
            title="Tải thẻ danh dự PNG độ nét cao về thiết bị"
          >
            <i className="fa-solid fa-download"></i>
            <span>Tải Ảnh PNG</span>
          </button>

          <button
            type="button"
            className="honor-action-btn copy-btn"
            onClick={handleCopyShareText}
            disabled={isGenerating}
            title="Sao chép lời nhắn chia sẻ cột mốc thành tựu"
          >
            <i className="fa-solid fa-copy"></i>
            <span>Sao Chép Lời Nhắn</span>
          </button>
        </div>
      </div>
    </div>
  );
};
