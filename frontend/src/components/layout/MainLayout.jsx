import React, { useEffect, useState, useRef } from 'react';
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
import { PageTransitionWrapper } from '../common/PageTransitionWrapper';
import { PwaInstallPrompt } from '../common/PwaInstallPrompt';
import { IdleWeatherSvgFilters } from '../common/IdleWeatherSvgFilters';
import { DeskCompanionPet } from '../wellness/DeskCompanionPet';
import { initIdleWeatherEngine } from '../../utils/idleWeatherEngine';
import {
  ASMR_PROFILES,
  getAsmrProfile,
  isAsmrKeyboardEnabled,
  setAsmrKeyboardEnabled,
  triggerAsmrKeySound,
} from '../../utils/keyboardSoundEngine';
import {
  getFabPos,
  saveFabPos,
  resolveAntiCollision,
  snapToNearestEdge,
  ensureInBounds,
  MARGIN_LEFT,
  MARGIN_RIGHT,
} from '../../utils/floatingButtonManager';

export const MainLayout = () => {
  const { user, isAuthenticated } = useAuth();
  const location = useLocation();

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isThemeScheduleOpen, setIsThemeScheduleOpen] = useState(false);
  const [currentThemeMode, setCurrentThemeMode] = useState(() => getActiveTheme());
  const [themeSchedule, setThemeSchedule] = useState(() => getThemeSchedule());
  const [soundOn, setSoundOn] = useState(() => isSoundEnabled());
  const [asmrOn, setAsmrOn] = useState(() => isAsmrKeyboardEnabled());
  const [asmrProfile, setAsmrProfileState] = useState(() => getAsmrProfile());
  const [activeSeason, setActiveSeasonState] = useState(() => getActiveSeason());
  const [isAiPlayerActive, setIsAiPlayerActive] = useState(false);
  const [isPrefCollapsed, setIsPrefCollapsed] = useState(() => {
    try {
      return localStorage.getItem('freedom_pref_collapsed') === 'true';
    } catch (e) {
      return false;
    }
  });

  // Toạ độ & kéo thả tự do như nút Chat & Viết tâm sự & Sự kiện
  const [prefPos, setPrefPos] = useState(() => {
    const raw = getFabPos('pref');
    return resolveAntiCollision('pref', raw, true);
  });
  const [isDraggingPref, setIsDraggingPref] = useState(false);
  const dragStartRef = useRef({ mouseX: 0, mouseY: 0, btnX: 0, btnY: 0 });
  const hasMovedRef = useRef(false);
  const activePointerIdRef = useRef(null);

  const handleToggleCollapse = (collapsed) => {
    setIsPrefCollapsed(collapsed);
    try {
      localStorage.setItem('freedom_pref_collapsed', String(collapsed));
    } catch (e) {}
  };

  // Giữ vị trí Cụm tiện ích trong màn hình khi thay đổi kích thước cửa sổ (có chống bão sự kiện Debounce)
  useEffect(() => {
    let resizeTimer = null;
    const handleResize = () => {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(() => {
        setPrefPos((prev) => {
          const bounded = ensureInBounds('pref', prev);
          const resolved = resolveAntiCollision('pref', bounded, true);
          saveFabPos('pref', resolved, false);
          return resolved;
        });
      }, 150);
    };
    window.addEventListener('resize', handleResize);
    return () => {
      clearTimeout(resizeTimer);
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  // Lắng nghe khi nút khác di dời để tự né tránh va chạm
  useEffect(() => {
    const handleRecheckCollision = (e) => {
      if (e?.detail?.type === 'pref') return;
      setPrefPos((curr) => {
        const safe = resolveAntiCollision('pref', curr, true);
        if (safe.x !== curr.x || safe.y !== curr.y) {
          saveFabPos('pref', safe, false);
          return safe;
        }
        return curr;
      });
    };
    window.addEventListener('freedom_fab_pos_changed', handleRecheckCollision);
    return () => window.removeEventListener('freedom_fab_pos_changed', handleRecheckCollision);
  }, []);

  // =========================================================================
  // XỬ LÝ KÉO THẢ QUẢ CẦU TIỆN ÍCH KHI ĐÓNG (POINTER EVENTS CHUẨN XÁC)
  // =========================================================================
  const handlePointerDown = (e) => {
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    e.preventDefault();
    e.stopPropagation();

    try {
      e.currentTarget.setPointerCapture(e.pointerId);
      activePointerIdRef.current = e.pointerId;
    } catch (_) {}

    dragStartRef.current = {
      mouseX: e.clientX,
      mouseY: e.clientY,
      btnX: prefPos.x,
      btnY: prefPos.y,
    };
    hasMovedRef.current = false;
    setIsDraggingPref(true);
  };

  const handlePointerMove = (e) => {
    if (!isDraggingPref) return;
    e.preventDefault();

    const dx = e.clientX - dragStartRef.current.mouseX;
    const dy = e.clientY - dragStartRef.current.mouseY;

    if (Math.hypot(dx, dy) > 4) {
      hasMovedRef.current = true;
    }

    const nextX = dragStartRef.current.btnX + dx;
    const nextY = dragStartRef.current.btnY + dy;
    setPrefPos(ensureInBounds('pref', { x: nextX, y: nextY }));
  };

  const handlePointerUp = (e) => {
    if (!isDraggingPref) return;

    try {
      if (activePointerIdRef.current !== null && e.currentTarget) {
        e.currentTarget.releasePointerCapture(activePointerIdRef.current);
      }
    } catch (_) {}
    activePointerIdRef.current = null;
    setIsDraggingPref(false);

    if (hasMovedRef.current) {
      setPrefPos((current) => {
        const snapped = snapToNearestEdge('pref', current);
        saveFabPos('pref', snapped, true);
        return snapped;
      });
    } else {
      // Bấm trực tiếp không kéo -> Mở rộng thanh tiện ích
      playClickSound();
      handleToggleCollapse(false);
    }
  };

  const handlePointerCancel = (e) => {
    if (isDraggingPref) {
      handlePointerUp(e);
    }
  };

  // Bảo hiểm toàn cục trên window
  useEffect(() => {
    if (!isDraggingPref) return;

    const handleGlobalRelease = () => {
      setIsDraggingPref(false);
      activePointerIdRef.current = null;
      if (hasMovedRef.current) {
        setPrefPos((current) => {
          const snapped = snapToNearestEdge('pref', current);
          saveFabPos('pref', snapped);
          return snapped;
        });
      }
    };

    window.addEventListener('pointerup', handleGlobalRelease);
    window.addEventListener('mouseup', handleGlobalRelease);
    window.addEventListener('touchend', handleGlobalRelease);
    window.addEventListener('pointercancel', handleGlobalRelease);

    return () => {
      window.removeEventListener('pointerup', handleGlobalRelease);
      window.removeEventListener('mouseup', handleGlobalRelease);
      window.removeEventListener('touchend', handleGlobalRelease);
      window.removeEventListener('pointercancel', handleGlobalRelease);
    };
  }, [isDraggingPref]);
  const [isOnline, setIsOnline] = useState(() => (typeof navigator !== 'undefined' ? navigator.onLine : true));
  const [showBackOnline, setShowBackOnline] = useState(false);

  const currentTheme = user?.customLayout?.theme || 'default';
  const customBg = user?.customLayout?.bgGradient || user?.customLayout?.bgColor || '';
  const customBgImage = user?.customLayout?.bgImage || '';

  // Khởi tạo hiệu ứng âm thanh click clik-clak & đồng bộ Theme Ngày / Đêm & Thời Tiết 4 Mùa
  useEffect(() => {
    initGlobalSoundEffects();
    initThemeWatcher();
    const cleanupIdleEngine = initIdleWeatherEngine();

    const handleThemeChange = (e) => {
      setCurrentThemeMode(e.detail || getActiveTheme());
    };
    const handleSeasonChange = (e) => {
      setActiveSeasonState(e.detail || getActiveSeason());
    };
    const handleScheduleChange = (e) => {
      setThemeSchedule(e.detail || getThemeSchedule());
    };
    const handleAsmrChange = (e) => {
      setAsmrOn(e.detail?.enabled ?? isAsmrKeyboardEnabled());
    };
    const handleAsmrProfileChange = (e) => {
      setAsmrProfileState(e.detail?.profile || getAsmrProfile());
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
    window.addEventListener('freedom_asmr_state_changed', handleAsmrChange);
    window.addEventListener('freedom_asmr_profile_changed', handleAsmrProfileChange);
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
      if (cleanupIdleEngine) cleanupIdleEngine();
      window.removeEventListener('freedom_theme_changed', handleThemeChange);
      window.removeEventListener('freedom_season_changed', handleSeasonChange);
      window.removeEventListener('freedom_theme_schedule_changed', handleScheduleChange);
      window.removeEventListener('freedom_asmr_state_changed', handleAsmrChange);
      window.removeEventListener('freedom_asmr_profile_changed', handleAsmrProfileChange);
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

      <main style={{ flexGrow: 1, position: 'relative', zIndex: 1, overflowX: 'clip' }}>
        <PageTransitionWrapper>
          <Outlet />
        </PageTransitionWrapper>
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
        style={
          isPrefCollapsed
            ? {
                position: 'fixed',
                left: `${prefPos.x}px`,
                top: `${prefPos.y}px`,
                bottom: 'auto',
                right: 'auto',
                zIndex: isDraggingPref ? 9999 : 9990,
                touchAction: 'none',
                userSelect: 'none',
                WebkitUserSelect: 'none',
                cursor: isDraggingPref ? 'grabbing' : 'grab',
                transition: isDraggingPref
                  ? 'none'
                  : 'left 0.28s cubic-bezier(0.2, 0.8, 0.2, 1), top 0.28s cubic-bezier(0.2, 0.8, 0.2, 1), transform 0.2s, box-shadow 0.2s',
              }
            : typeof window !== 'undefined' && prefPos.x > window.innerWidth / 2
            ? {
                position: 'fixed',
                right: `${MARGIN_RIGHT}px`,
                left: 'auto',
                bottom: isAiPlayerActive ? '124px' : '24px',
                top: 'auto',
              }
            : {
                position: 'fixed',
                left: `${MARGIN_LEFT}px`,
                right: 'auto',
                bottom: isAiPlayerActive ? '124px' : '24px',
                top: 'auto',
              }
        }
      >
        {isPrefCollapsed ? (
          <button
            type="button"
            className={`quick-pref-collapsed-bubble ${isDraggingPref ? 'is-dragging' : ''}`}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerCancel={handlePointerCancel}
            title={`Kéo thả để di dời khắp màn hình • Bấm để mở rộng Cài đặt Ngày/Đêm & Âm thanh (${currentThemeMode === 'light' ? 'Chế độ Ngày' : 'Chế độ Đêm'})`}
          >
            <span className="bubble-icon">
              <i className={`fa-solid ${currentThemeMode === 'light' ? 'fa-sun' : 'fa-moon'}`}></i>
            </span>
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
              <span className="pref-icon">
                <i
                  className={`fa-solid ${currentThemeMode === 'light' ? 'fa-sun' : 'fa-moon'}`}
                  style={{ color: currentThemeMode === 'light' ? 'var(--pastel-amber)' : 'var(--pastel-rose)' }}
                ></i>
              </span>
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
              <span className="pref-icon">
                <i className="fa-solid fa-clock" style={{ color: 'var(--pastel-amber)' }}></i>
              </span>
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
              <span className="pref-icon">
                <i
                  className={`fa-solid ${soundOn ? 'fa-volume-high' : 'fa-volume-xmark'}`}
                  style={{ color: soundOn ? 'var(--pastel-sage)' : 'var(--text-faint)' }}
                ></i>
              </span>
              <span className="pref-label">{soundOn ? 'Âm Thanh' : 'Tắt Tiếng'}</span>
            </button>

            {/* Nút ASMR Phím Cơ */}
            <button
              type="button"
              className={`quick-pref-btn asmr-mode-toggle ${asmrOn ? 'sound-on' : 'sound-off'}`}
              onClick={() => {
                const next = !asmrOn;
                setAsmrOn(next);
                setAsmrKeyboardEnabled(next);
                if (next) triggerAsmrKeySound({ key: 'Enter' });
              }}
              title={
                asmrOn
                  ? `ASMR: ĐANG BẬT (${ASMR_PROFILES[asmrProfile]?.name || 'Phím cơ'}). Bấm để tắt.`
                  : 'ASMR Bàn phím: ĐANG TẮT. Bấm để bật.'
              }
            >
              <span className="pref-icon">
                <span style={{ fontSize: '0.9rem' }}>{asmrOn ? (ASMR_PROFILES[asmrProfile]?.icon || '⌨️') : '⌨️'}</span>
              </span>
              <span className="pref-label">
                {asmrOn ? (ASMR_PROFILES[asmrProfile]?.name?.replace('Phím Cơ ', '') || 'ASMR Bật') : 'ASMR'}
              </span>
            </button>

            {/* Nút Thu Gọn Tiện Ích */}
            <button
              type="button"
              className="quick-pref-collapse-btn"
              onClick={() => handleToggleCollapse(true)}
              title="Thu nhỏ thanh tiện ích"
              aria-label="Thu nhỏ"
            >
              <i className="fa-solid fa-minus" style={{ fontSize: '0.75rem' }}></i>
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

      {/* PWA App Install Banner & Modal (Cho Smartphone, Tablet, PC, Mac) */}
      <PwaInstallPrompt />

      {/* Bé Thú Cưng Bàn Làm Việc (Desk Companion Pet Therapy 🐱) */}
      <DeskCompanionPet />

      {/* SVG Filters cho hiệu ứng Mùa Hè tan chảy & Mùa Đông băng giá */}
      <IdleWeatherSvgFilters />
    </div>
  );
};

