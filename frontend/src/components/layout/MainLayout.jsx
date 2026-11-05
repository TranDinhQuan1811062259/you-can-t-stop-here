import React, { useEffect, useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { Header } from './Header';
import { Footer } from './Footer';
import { useAuth } from '../../context/AuthContext';
import { AssistiveChatWidget } from '../chat/AssistiveChatWidget';
import { AmbientBackground } from '../common/AmbientBackground';
import { CursorAura } from '../common/CursorAura';
import { initGlobalSoundEffects, isSoundEnabled, toggleSound, playClickSound } from '../../utils/soundEffects';
import { getActiveTheme, toggleTheme, applyTheme } from '../../utils/themeUtils';
import { getActiveSeason } from '../../utils/seasonUtils';
import { CreatePostModal } from '../blog/CreatePostModal';
import { DraggableWritePostButton } from '../blog/DraggableWritePostButton';
import { GoogleOneTapPrompt } from '../auth/GoogleOneTapPrompt';
import { FloatingSmsAlert } from '../common/FloatingSmsAlert';
import { SecurityBellNotification } from '../common/SecurityBellNotification';
import { FloatingAiAudioPlayer } from '../blog/FloatingAiAudioPlayer';

export const MainLayout = () => {
  const { user, isAuthenticated } = useAuth();
  const location = useLocation();

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [currentThemeMode, setCurrentThemeMode] = useState(() => getActiveTheme());
  const [soundOn, setSoundOn] = useState(() => isSoundEnabled());
  const [activeSeason, setActiveSeasonState] = useState(() => getActiveSeason());

  const currentTheme = user?.customLayout?.theme || 'default';
  const customBg = user?.customLayout?.bgGradient || user?.customLayout?.bgColor || '';
  const customBgImage = user?.customLayout?.bgImage || '';

  // Khởi tạo hiệu ứng âm thanh click clik-clak & đồng bộ Theme Ngày / Đêm & Thời Tiết 4 Mùa
  useEffect(() => {
    initGlobalSoundEffects();
    applyTheme(currentThemeMode);

    const handleThemeChange = (e) => {
      setCurrentThemeMode(e.detail || getActiveTheme());
    };
    const handleSeasonChange = (e) => {
      setActiveSeasonState(e.detail || getActiveSeason());
    };

    window.addEventListener('freedom_theme_changed', handleThemeChange);
    window.addEventListener('freedom_season_changed', handleSeasonChange);

    return () => {
      window.removeEventListener('freedom_theme_changed', handleThemeChange);
      window.removeEventListener('freedom_season_changed', handleSeasonChange);
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
        transition: 'background 0.4s ease, color 0.4s ease',
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

      {/* Cụm Tiện Ích Tùy Chỉnh Nổi To Rõ Ở Góc Màn Hình (Chế độ Ngày/Đêm & Âm thanh) */}
      <div className="floating-quick-preferences" role="region" aria-label="Tùy chỉnh giao diện & Âm thanh">
        <button
          type="button"
          className={`quick-pref-btn theme-mode-toggle theme-${currentThemeMode}`}
          onClick={handleToggleTheme}
          title={
            currentThemeMode === 'light'
              ? 'Đang ở Chế độ Ngày (Ánh vàng ấm). Bấm để chuyển sang Chế độ Đêm 🌙'
              : 'Đang ở Chế độ Đêm (Màu tối dịu mắt). Bấm để chuyển sang Chế độ Ngày ☀️'
          }
        >
          <span className="pref-icon">{currentThemeMode === 'light' ? '☀️' : '🌙'}</span>
          <span className="pref-label">
            {currentThemeMode === 'light' ? 'Chế Độ Ngày' : 'Chế Độ Đêm'}
          </span>
          <span className="pref-badge">
            {currentThemeMode === 'light' ? 'Đổi sang Đêm' : 'Đổi sang Ngày'}
          </span>
        </button>

        <button
          type="button"
          className={`quick-pref-btn sound-mode-toggle ${soundOn ? 'sound-on' : 'sound-off'}`}
          onClick={handleToggleSound}
          title={soundOn ? 'Âm thanh gõ & tương tác: ĐANG BẬT. Bấm để tắt.' : 'Âm thanh: ĐANG TẮT. Bấm để bật.'}
        >
          <span className="pref-icon">{soundOn ? '🔊' : '🔇'}</span>
          <span className="pref-label">{soundOn ? 'Âm Thanh' : 'Tắt Tiếng'}</span>
        </button>
      </div>

      {/* Modal Viết Tâm Sự Toàn Cục */}
      <CreatePostModal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        onPostCreated={() => window.location.reload()}
      />

      {/* Google One Tap Sign-In Prompt (Gợi ý đăng nhập 1 chạm khi người dùng truy cập trang) */}
      {!isAuthenticated && <GoogleOneTapPrompt />}

      {/* Floating SMS Alert (Thông báo tin nhắn SMS xác nhận đăng nhập SĐT chính chủ) */}
      <FloatingSmsAlert />

      {/* Security Bell Notification (Chuông thông báo mã bảo mật 6 số đa nền tảng) */}
      <SecurityBellNotification />

      {/* Floating AI Audio Player (Bản đọc A.I cảm xúc & nhân bản giọng nói chính chủ) */}
      <FloatingAiAudioPlayer />

      {/* AssistiveTouch Floating Chat Widget (Không lấn layout, hiển thị gọn gàng ở góc màn hình) */}
      {isAuthenticated && <AssistiveChatWidget />}
    </div>
  );
};

