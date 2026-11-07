import React, { useEffect, useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { Header } from './Header';
import { Footer } from './Footer';
import { useAuth } from '../../context/AuthContext';
import { AssistiveChatWidget } from '../chat/AssistiveChatWidget';
import { AmbientBackground } from '../common/AmbientBackground';
import { CursorAura } from '../common/CursorAura';
import { initGlobalSoundEffects, isSoundEnabled, toggleSound, playClickSound } from '../../utils/soundEffects';
import { getActiveTheme, toggleTheme, applyTheme, getThemeSchedule, initThemeWatcher } from '../../utils/themeUtils';
import { getActiveSeason } from '../../utils/seasonUtils';
import { CreatePostModal } from '../blog/CreatePostModal';
import { DraggableWritePostButton } from '../blog/DraggableWritePostButton';
import { GoogleOneTapPrompt } from '../auth/GoogleOneTapPrompt';
import { FloatingSmsAlert } from '../common/FloatingSmsAlert';
import { SecurityBellNotification } from '../common/SecurityBellNotification';
import { FloatingAiAudioPlayer } from '../blog/FloatingAiAudioPlayer';
import { ThemeScheduleModal } from '../common/ThemeScheduleModal';
import { FloatingFestiveMascot } from '../common/FloatingFestiveMascot';

export const MainLayout = () => {
  const { user, isAuthenticated } = useAuth();
  const location = useLocation();

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isThemeScheduleOpen, setIsThemeScheduleOpen] = useState(false);
  const [currentThemeMode, setCurrentThemeMode] = useState(() => getActiveTheme());
  const [themeSchedule, setThemeSchedule] = useState(() => getThemeSchedule());
  const [soundOn, setSoundOn] = useState(() => isSoundEnabled());
  const [activeSeason, setActiveSeasonState] = useState(() => getActiveSeason());
  const [isAiPlayerActive, setIsAiPlayerActive] = useState(false);
  const [isPrefCollapsed, setIsPrefCollapsed] = useState(false);
  const [isOnline, setIsOnline] = useState(() => (typeof navigator !== 'undefined' ? navigator.onLine : true));
  const [showBackOnline, setShowBackOnline] = useState(false);

  const currentTheme = user?.customLayout?.theme || 'default';
  const customBg = user?.customLayout?.bgGradient || user?.customLayout?.bgColor || '';
  const customBgImage = user?.customLayout?.bgImage || '';

  // Khởi tạo hiệu ứng âm thanh click clik-clak & đồng bộ Theme Ngày / Đêm & Thời Tiết 4 Mùa
  useEffect(() => {
    initGlobalSoundEffects();
    initThemeWatcher();

    const handleThemeChange = (e) => {
      setCurrentThemeMode(e.detail || getActiveTheme());
    };
    const handleSeasonChange = (e) => {
      setActiveSeasonState(e.detail || getActiveSeason());
    };
    const handleScheduleChange = (e) => {
      setThemeSchedule(e.detail || getThemeSchedule());
    };
    const handleAudioState = (e) => {
      const state = e.detail?.state;
      setIsAiPlayerActive(state === 'playing' || state === 'paused');
    };
    const handleAudioVisibility = (e) => {
      setIsAiPlayerActive(Boolean(e.detail?.active));
    };

    window.addEventListener('freedom_theme_changed', handleThemeChange);
    window.addEventListener('freedom_season_changed', handleSeasonChange);
    window.addEventListener('freedom_theme_schedule_changed', handleScheduleChange);
    window.addEventListener('freedom_ai_audio_state_change', handleAudioState);
    window.addEventListener('freedom_ai_player_visibility', handleAudioVisibility);

    const handleOnline = () => {
      setIsOnline(true);
      setShowBackOnline(true);
      setTimeout(() => setShowBackOnline(false), 4000);
    };
    const handleOffline = () => {
      setIsOnline(false);
      setShowBackOnline(false);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('freedom_theme_changed', handleThemeChange);
      window.removeEventListener('freedom_season_changed', handleSeasonChange);
      window.removeEventListener('freedom_theme_schedule_changed', handleScheduleChange);
      window.removeEventListener('freedom_ai_audio_state_change', handleAudioState);
      window.removeEventListener('freedom_ai_player_visibility', handleAudioVisibility);
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Cuộn trang mượt mà lên đầu khi đổi route
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [location.pathname]);

  const handleToggleTheme = () => {
    playClickSound();
    const next = toggleTheme();
    setCurrentThemeMode(next);
  };

  const handleToggleSound = () => {
    playClickSound();
    const next = toggleSound();
    setSoundOn(next);
  };

  return (
    <div
      className={`app-root-layout mode-${currentThemeMode} theme-${currentThemeMode} user-theme-${currentTheme} season-${activeSeason.id}`}
      data-theme={currentThemeMode}
      data-season={activeSeason.id}
      style={{
        display: 'flex',
        flexDirection: 'column',
        minHeight: '100vh',
        background: customBgImage
          ? `linear-gradient(rgba(15, 23, 42, 0.72), rgba(15, 23, 42, 0.86)), url(${customBgImage}) center / cover fixed no-repeat`
          : currentTheme === 'custom' && customBg
          ? customBg
          : undefined,
        position: 'relative',
        transition:
          'background-color 0.65s cubic-bezier(0.22, 1, 0.36, 1), background 0.65s cubic-bezier(0.22, 1, 0.36, 1), color 0.55s cubic-bezier(0.22, 1, 0.36, 1)',
      }}
    >
      {/* Hiệu ứng lia chuột mượt mà (Cursor Glow & Click Ripple) */}
      <CursorAura />

      {/* Hiệu ứng hạt ánh sáng & cực quang động linh hoạt phía sau */}
      <AmbientBackground />

      <Header />

      <main style={{ flexGrow: 1, position: 'relative', zIndex: 1 }}>
        <div key={location.pathname} className="page-transition-wrapper">
          <Outlet />
        </div>
      </main>

      <Footer />

      {/* Nút Viết Tâm Sự Nổi Kéo Thả Di Dời Tự Do (Draggable FAB) - Tự động chống va chạm & Đè nút Tin nhắn */}
      {isAuthenticated && (
        <DraggableWritePostButton onClick={() => setIsCreateOpen(true)} />
      )}

      {/* Cụm Tiện Ích Tùy Chỉnh Nổi To Rõ Ở Góc Màn Hình (Chế độ Ngày/Đêm, Hẹn Giờ & Âm thanh) */}
      <div
        className={`floating-quick-preferences ${isAiPlayerActive ? 'player-active' : ''} ${isPrefCollapsed ? 'is-collapsed' : ''}`}
        role="region"
        aria-label="Tùy chỉnh giao diện & Âm thanh"
      >
        {isPrefCollapsed ? (
          <button
            type="button"
            className="quick-pref-collapsed-bubble"
            onClick={() => setIsPrefCollapsed(false)}
            title={`Bấm để mở rộng Cài đặt Ngày/Đêm & Âm thanh (Hiện tại: ${currentThemeMode === 'light' ? 'Chế độ Ngày' : 'Chế độ Đêm'})`}
          >
            <span className="bubble-icon">{currentThemeMode === 'light' ? '☀️' : '🌙'}</span>
          </button>
        ) : (
          <>
            <button
              type="button"
              className={`quick-pref-btn theme-mode-toggle theme-${currentThemeMode}`}
              onClick={handleToggleTheme}
              title={
                themeSchedule.mode === 'auto'
                  ? `Đang bật Tự động theo giờ (${themeSchedule.dayStart} - ${themeSchedule.nightStart}). Bấm để chuyển sang chế độ đối lập!`
                  : currentThemeMode === 'light'
                  ? 'Đang ở Chế độ Ngày (Ánh vàng ấm). Bấm để chuyển sang Chế độ Đêm 🌙'
                  : 'Đang ở Chế độ Đêm (Màu tối dịu mắt). Bấm để chuyển sang Chế độ Ngày ☀️'
              }
            >
              <span className="pref-icon">{currentThemeMode === 'light' ? '☀️' : '🌙'}</span>
              <span className="pref-label">
                {currentThemeMode === 'light' ? 'Chế Độ Ngày' : 'Chế Độ Đêm'}
              </span>
              <span className="pref-badge">
                {themeSchedule.mode === 'auto' ? 'Theo giờ' : currentThemeMode === 'light' ? 'Đổi sang Đêm' : 'Đổi sang Ngày'}
              </span>
            </button>

            {/* Nút Cài Đặt Khung Giờ Ngày / Đêm */}
            <button
              type="button"
              className={`quick-pref-btn schedule-config-btn ${themeSchedule.mode === 'auto' ? 'is-auto-active' : ''}`}
              onClick={() => setIsThemeScheduleOpen(true)}
              title={`Cài đặt tự động đổi Ngày & Đêm theo khung giờ (Hiện tại: ${
                themeSchedule.mode === 'auto'
                  ? `Tự động: Sáng ${themeSchedule.dayStart} • Tối ${themeSchedule.nightStart}`
                  : 'Đang chỉnh thủ công'
              })`}
            >
              <span className="pref-icon">⏰</span>
              <span className="pref-label">Hẹn Giờ</span>
              {themeSchedule.mode === 'auto' && (
                <span className="pref-badge auto-active">
                  Auto
                </span>
              )}
            </button>

            {/* Nút Âm Thanh */}
            <button
              type="button"
              className={`quick-pref-btn sound-mode-toggle ${soundOn ? 'sound-on' : 'sound-off'}`}
              onClick={handleToggleSound}
              title={soundOn ? 'Âm thanh gõ & tương tác: ĐANG BẬT. Bấm để tắt.' : 'Âm thanh: ĐANG TẮT. Bấm để bật.'}
            >
              <span className="pref-icon">{soundOn ? '🔊' : '🔇'}</span>
              <span className="pref-label">{soundOn ? 'Âm Thanh' : 'Tắt Tiếng'}</span>
            </button>

            {/* Nút Thu Gọn Tiện Ích */}
            <button
              type="button"
              className="quick-pref-collapse-btn"
              onClick={() => setIsPrefCollapsed(true)}
              title="Thu nhỏ thanh tiện ích"
              aria-label="Thu nhỏ"
            >
              ⚊
            </button>
          </>
        )}
      </div>

      {/* Modal Cài Đặt Chuyển Đổi Ngày / Đêm Theo Giờ */}
      <ThemeScheduleModal
        isOpen={isThemeScheduleOpen}
        onClose={() => setIsThemeScheduleOpen(false)}
      />

      {/* Modal Viết Tâm Sự Toàn Cục */}
      <CreatePostModal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        onPostCreated={() => window.location.reload()}
      />

      {/* Google One Tap Sign-In Prompt (Gợi ý đăng nhập 1 chạm khi người dùng truy cập trang) */}
      {!isAuthenticated && <GoogleOneTapPrompt />}

      {/* Thông Báo Trạng Thái Kết Nối Mạng (Offline / Online) */}
      {!isOnline && (
        <div className="network-offline-badge is-offline" role="status" aria-live="polite">
          <span className="network-badge-icon">⚠️</span>
          <span className="network-badge-text">
            Hiện không có kết nối Internet <em>(Đang xem bản lưu ngoại tuyến)</em>
          </span>
        </div>
      )}
      {showBackOnline && (
        <div className="network-offline-badge back-online" role="status" aria-live="polite">
          <span className="network-badge-icon">🟢</span>
          <span className="network-badge-text">Đã khôi phục kết nối Internet!</span>
        </div>
      )}

      {/* Floating SMS Alert (Thông báo tin nhắn SMS xác nhận đăng nhập SĐT chính chủ) */}
      <FloatingSmsAlert />

      {/* Security Bell Notification (Chuông thông báo mã bảo mật 6 số đa nền tảng) */}
      <SecurityBellNotification />

      {/* Floating AI Audio Player (Bản đọc A.I cảm xúc & nhân bản giọng nói chính chủ) */}
      <FloatingAiAudioPlayer />

      {/* Floating Festive Mascot Widget (Lá cờ 30/4 bay dẻo dẻo, 2/9, 8/3 góc màn hình) */}
      <FloatingFestiveMascot
        onOpenShowcase={(ev) =>
          window.dispatchEvent(new CustomEvent('freedom_open_festive_showcase', { detail: ev }))
        }
      />

      {/* AssistiveTouch Floating Chat Widget (Không lấn layout, hiển thị gọn gàng ở góc màn hình) */}
      {isAuthenticated && <AssistiveChatWidget />}
    </div>
  );
};

