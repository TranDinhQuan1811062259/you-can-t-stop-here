import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '../../context/AuthContext';
import { usePersonalHub } from '../../context/PersonalHubContext';
import { playClickSound } from '../../utils/soundEffects';

const SESSION_DISMISS_KEY = 'freedom_focus_reminder_dismissed';
const COOLDOWN_MS = 4 * 60 * 1000; // 4 phút cooldown

export const FocusGoalReminderToast = () => {
  const { isAuthenticated } = useAuth();
  const { personalNotes, openHub, setActiveTab } = usePersonalHub();
  const [isVisible, setIsVisible] = useState(false);
  const lastShownTimeRef = useRef(0);
  const autoHideTimeoutRef = useRef(null);

  // Đếm số mục tiêu chưa hoàn thành
  const pendingNotesCount = (personalNotes || []).filter((n) => !n.completed).length;

  // Xử lý khi user rê chuột ra ngoài mép trên trình duyệt
  const handleMouseLeave = useCallback(
    (e) => {
      // Chỉ kích hoạt khi user di chuột lên đỉnh thanh URL (clientY <= 5)
      if (e.clientY > 5) return;
      if (!isAuthenticated) return;
      if (pendingNotesCount === 0) return;

      // Kiểm tra phiên làm việc đã bị người dùng chọn tắt chưa
      try {
        if (sessionStorage.getItem(SESSION_DISMISS_KEY) === 'true') {
          return;
        }
      } catch {
        // bỏ qua nếu lỗi storage
      }

      // Kiểm tra cooldown giữa các lần hiển thị
      const now = Date.now();
      if (now - lastShownTimeRef.current < COOLDOWN_MS) {
        return;
      }

      lastShownTimeRef.current = now;
      setIsVisible(true);

      // Tự động ẩn sau 10 giây nếu không tương tác
      if (autoHideTimeoutRef.current) {
        clearTimeout(autoHideTimeoutRef.current);
      }
      autoHideTimeoutRef.current = setTimeout(() => {
        setIsVisible(false);
      }, 10000);
    },
    [isAuthenticated, pendingNotesCount]
  );

  useEffect(() => {
    document.addEventListener('mouseleave', handleMouseLeave);
    return () => {
      document.removeEventListener('mouseleave', handleMouseLeave);
      if (autoHideTimeoutRef.current) {
        clearTimeout(autoHideTimeoutRef.current);
      }
    };
  }, [handleMouseLeave]);

  // Đóng tạm thời toast
  const handleDismiss = () => {
    playClickSound();
    setIsVisible(false);
    if (autoHideTimeoutRef.current) {
      clearTimeout(autoHideTimeoutRef.current);
    }
  };

  // Tắt hẳn trong phiên này
  const handleMuteThisSession = () => {
    playClickSound();
    setIsVisible(false);
    try {
      sessionStorage.setItem(SESSION_DISMISS_KEY, 'true');
    } catch {
      // bỏ qua
    }
    if (autoHideTimeoutRef.current) {
      clearTimeout(autoHideTimeoutRef.current);
    }
  };

  // Bấm xem mục tiêu: mở Hub và chuyển sang tab notes
  const handleViewGoals = () => {
    playClickSound();
    setIsVisible(false);
    if (autoHideTimeoutRef.current) {
      clearTimeout(autoHideTimeoutRef.current);
    }
    setActiveTab('notes');
    openHub();
  };

  if (!isVisible || pendingNotesCount === 0) return null;

  return (
    <div
      className="focus-reminder-toast-container"
      role="alert"
      aria-live="polite"
    >
      <div className="focus-reminder-card">
        <div className="focus-reminder-header">
          <div className="focus-reminder-title-wrap">
            <span className="focus-reminder-icon">🎯</span>
            <span className="focus-reminder-title">Mục tiêu đang đợi bạn!</span>
          </div>
          <button
            type="button"
            className="focus-reminder-close-btn"
            onClick={handleDismiss}
            title="Đóng lời nhắc"
            aria-label="Đóng lời nhắc"
          >
            <i className="fa-solid fa-xmark"></i>
          </button>
        </div>

        <p className="focus-reminder-text">
          Bạn còn <strong>{pendingNotesCount} mục tiêu</strong> trong Focus Notes chưa hoàn thành hôm nay. Giữ vững nhịp tiến bước trước khi rời đi nhé!
        </p>

        <div className="focus-reminder-actions">
          <button
            type="button"
            className="focus-reminder-view-btn"
            onClick={handleViewGoals}
          >
            <i className="fa-solid fa-list-check"></i>
            <span>Xem mục tiêu</span>
          </button>

          <button
            type="button"
            className="focus-reminder-mute-btn"
            onClick={handleMuteThisSession}
            title="Không nhắc lại trong phiên duyệt web này"
          >
            Không nhắc lại phiên này
          </button>
        </div>
      </div>
    </div>
  );
};
