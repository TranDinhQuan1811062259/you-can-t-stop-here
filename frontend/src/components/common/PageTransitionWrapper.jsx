import React, { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { playClickSound } from '../../utils/soundEffects';
import { getActiveSeason } from '../../utils/seasonUtils';
import { eventService } from '../../services/eventService';
import { PageTransitionAtmosphereOverlay } from './PageTransitionAtmosphereOverlay';

export const DASHBOARD_ROUTES = [
  { path: '/', label: 'Trang Chủ', icon: '🏠' },
  { path: '/category/ap-luc-kiet-suc-burnout', label: 'Burnout & Kiệt Sức', icon: '🔥' },
  { path: '/category/khung-hoang-nghe-nghiep-career-crisis', label: 'Khủng Hoảng', icon: '⚡' },
  { path: '/category/chuyen-nganh-bat-dau-lai-restart', label: 'Bắt Đầu Lại', icon: '🌱' },
  { path: '/category/nhung-tia-sang-dong-luc-small-wins', label: 'Small Wins', icon: '✨' },
];

export const PageTransitionWrapper = ({ children }) => {
  const location = useLocation();
  const navigate = useNavigate();

  const [transitionDirection, setTransitionDirection] = useState('forward'); // 'forward' | 'backward'
  const [isTransitioning, setIsTransitioning] = useState(false);
  const prevPathRef = useRef(location.pathname);

  // Mùa hiện tại & Sự kiện lễ hội hiện tại để phát hiệu ứng chuyển trang
  const [activeSeason, setActiveSeasonState] = useState(() => getActiveSeason());
  const [activeFestiveEvent, setActiveFestiveEvent] = useState(null);

  useEffect(() => {
    eventService
      .getActiveEvent()
      .then((res) => setActiveFestiveEvent(res?.data || null))
      .catch(() => setActiveFestiveEvent(null));

    const handleSeasonChange = (e) => {
      setActiveSeasonState(e.detail || getActiveSeason());
    };
    const handleEventChange = () => {
      eventService
        .getActiveEvent()
        .then((res) => setActiveFestiveEvent(res?.data || null))
        .catch(() => setActiveFestiveEvent(null));
    };
    const handleShowcaseOpen = (e) => {
      if (e?.detail) setActiveFestiveEvent(e.detail);
    };

    window.addEventListener('freedom_season_changed', handleSeasonChange);
    window.addEventListener('freedom_festive_event_changed', handleEventChange);
    window.addEventListener('freedom_open_festive_showcase', handleShowcaseOpen);
    return () => {
      window.removeEventListener('freedom_season_changed', handleSeasonChange);
      window.removeEventListener('freedom_festive_event_changed', handleEventChange);
      window.removeEventListener('freedom_open_festive_showcase', handleShowcaseOpen);
    };
  }, []);

  // Kéo vuốt cảm ứng (Touch / Mouse Gestures)
  const [dragOffset, setDragOffset] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const dragStartRef = useRef({ x: 0, y: 0, time: 0 });

  // Tìm index của dashboard hiện tại
  const currentDashIndex = DASHBOARD_ROUTES.findIndex((r) => r.path === location.pathname);

  // Xử lý xác định hướng trượt khi đổi Route (qua phải -> trượt từ phải vào; qua trái -> trượt từ trái vào)
  useEffect(() => {
    const prevPath = prevPathRef.current;
    const currentPath = location.pathname;

    if (prevPath !== currentPath) {
      const prevIdx = DASHBOARD_ROUTES.findIndex((r) => r.path === prevPath);
      const currIdx = DASHBOARD_ROUTES.findIndex((r) => r.path === currentPath);

      if (currIdx !== -1 && prevIdx !== -1) {
        // Chuyển giữa các Dashboard: Qua tab bên phải -> màn hình mới trượt vào từ phải sang trái
        setTransitionDirection(currIdx > prevIdx ? 'forward' : 'backward');
      } else if (currIdx !== -1 && prevIdx === -1) {
        setTransitionDirection('backward'); // Từ chi tiết bài viết quay về danh mục
      } else {
        setTransitionDirection('forward'); // Vào trang chi tiết bài viết
      }

      setIsTransitioning(true);
      const timer = setTimeout(() => {
        setIsTransitioning(false);
      }, 850); // Chuyển trang dịu mắt, thư thái cho người cận thị

      prevPathRef.current = currentPath;
      return () => clearTimeout(timer);
    }
  }, [location.pathname]);

  // Lắng nghe sự kiện chuyển trang phân trang (Pagination)
  useEffect(() => {
    const handlePaginationChange = (e) => {
      const { direction } = e.detail || {};
      setTransitionDirection(direction === 'next' ? 'forward' : 'backward');
      setIsTransitioning(true);
      setTimeout(() => setIsTransitioning(false), 850);
    };

    window.addEventListener('freedom_pagination_change', handlePaginationChange);
    return () => window.removeEventListener('freedom_pagination_change', handlePaginationChange);
  }, []);

  // =========================================================================
  // GESTURES: BẤM CHUỘT HOẶC CHẠM TAY VUỐT MÀN HÌNH ĐỂ TRƯỢT GIAO DIỆN
  // =========================================================================

  const shouldIgnoreGesture = (target) => {
    return Boolean(
      target.closest('button') ||
      target.closest('a') ||
      target.closest('input') ||
      target.closest('textarea') ||
      target.closest('select') ||
      target.closest('.modal-backdrop') ||
      target.closest('.modal-box') ||
      target.closest('.interactive-canvas') ||
      target.closest('.rich-visual-editor') ||
      target.closest('.audio-player-wrap')
    );
  };

  // Chuột bắt đầu kéo
  const handleMouseDown = (e) => {
    if (shouldIgnoreGesture(e.target)) return;
    if (currentDashIndex === -1) return;

    dragStartRef.current = {
      x: e.clientX,
      y: e.clientY,
      time: Date.now(),
    };
    setIsDragging(true);
  };

  const handleMouseMove = (e) => {
    if (!isDragging) return;
    const deltaX = e.clientX - dragStartRef.current.x;
    const deltaY = e.clientY - dragStartRef.current.y;

    if (Math.abs(deltaY) > Math.abs(deltaX) && Math.abs(deltaX) < 18) {
      setIsDragging(false);
      setDragOffset(0);
      return;
    }

    // Điện trở đàn hồi khi kéo kịch biên (ở trang đầu hoặc trang cuối)
    let effective = deltaX;
    if ((deltaX > 0 && currentDashIndex === 0) || (deltaX < 0 && currentDashIndex === DASHBOARD_ROUTES.length - 1)) {
      effective = deltaX * 0.28;
    }

    setDragOffset(effective);
  };

  const handleMouseUp = () => {
    if (!isDragging) return;
    setIsDragging(false);

    const threshold = 55; // Kéo hơn 55px là kích hoạt chuyển giao diện
    if (dragOffset < -threshold) {
      // Kéo sang TRÁI -> Chuyển sang giao diện kế tiếp bên phải
      if (currentDashIndex < DASHBOARD_ROUTES.length - 1) {
        playClickSound();
        const nextRoute = DASHBOARD_ROUTES[currentDashIndex + 1];
        navigate(nextRoute.path);
      }
    } else if (dragOffset > threshold) {
      // Kéo sang PHẢI -> Chuyển sang giao diện trước đó bên trái
      if (currentDashIndex > 0) {
        playClickSound();
        const prevRoute = DASHBOARD_ROUTES[currentDashIndex - 1];
        navigate(prevRoute.path);
      }
    }

    setDragOffset(0);
  };

  // Chạm tay trên Màn Hình Cảm Ứng (Touch Screen / Mobile / Tablet)
  const handleTouchStart = (e) => {
    if (shouldIgnoreGesture(e.target)) return;
    if (currentDashIndex === -1) return;

    const touch = e.touches[0];
    if (!touch) return;

    dragStartRef.current = {
      x: touch.clientX,
      y: touch.clientY,
      time: Date.now(),
    };
    setIsDragging(true);
  };

  const handleTouchMove = (e) => {
    if (!isDragging) return;
    const touch = e.touches[0];
    if (!touch) return;

    const deltaX = touch.clientX - dragStartRef.current.x;
    const deltaY = touch.clientY - dragStartRef.current.y;

    if (Math.abs(deltaY) > Math.abs(deltaX) && Math.abs(deltaX) < 18) {
      setIsDragging(false);
      setDragOffset(0);
      return;
    }

    let effective = deltaX;
    if ((deltaX > 0 && currentDashIndex === 0) || (deltaX < 0 && currentDashIndex === DASHBOARD_ROUTES.length - 1)) {
      effective = deltaX * 0.28;
    }

    setDragOffset(effective);
  };

  const handleTouchEnd = () => {
    handleMouseUp();
  };

  const targetNext = currentDashIndex < DASHBOARD_ROUTES.length - 1 ? DASHBOARD_ROUTES[currentDashIndex + 1] : null;
  const targetPrev = currentDashIndex > 0 ? DASHBOARD_ROUTES[currentDashIndex - 1] : null;

  return (
    <div
      className="page-gesture-container"
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      style={{
        position: 'relative',
        width: '100%',
        minHeight: '100%',
        overflowX: 'clip',
        touchAction: 'pan-y',
        userSelect: isDragging ? 'none' : 'auto',
        cursor: isDragging ? 'grabbing' : 'auto',
      }}
    >
      {/* Chỉ báo Kéo vuốt chuyển Dashboard nổi trên màn hình cảm ứng */}
      {isDragging && Math.abs(dragOffset) > 25 && (
        <div
          className="drag-dashboard-indicator"
          style={{
            position: 'fixed',
            top: '45%',
            left: dragOffset < 0 ? 'auto' : '20px',
            right: dragOffset < 0 ? '20px' : 'auto',
            transform: 'translateY(-50%)',
            zIndex: 9999,
            background: 'rgba(15, 23, 42, 0.92)',
            backdropFilter: 'blur(12px)',
            color: '#f8fafc',
            padding: '12px 22px',
            borderRadius: '999px',
            border: '1.5px solid rgba(56, 189, 248, 0.5)',
            boxShadow: '0 14px 35px rgba(0, 0, 0, 0.45)',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            fontSize: '0.88rem',
            fontWeight: 800,
            pointerEvents: 'none',
            animation: 'pulseIndicator 0.5s infinite alternate',
          }}
        >
          {dragOffset < 0 ? (
            <>
              <span>{targetNext ? `Vuốt sang: ${targetNext.label} ${targetNext.icon}` : 'Đã ở tab cuối cùng'}</span>
              <span style={{ fontSize: '1.3rem' }}>&rarr;</span>
            </>
          ) : (
            <>
              <span style={{ fontSize: '1.3rem' }}>&larr;</span>
              <span>{targetPrev ? `Vuốt sang: ${targetPrev.label} ${targetPrev.icon}` : 'Đã ở tab đầu tiên'}</span>
            </>
          )}
        </div>
      )}

      {/* Hiệu ứng hình ảnh & âm thanh đặc trưng chuyển trang theo mùa & sự kiện lễ hội */}
      <PageTransitionAtmosphereOverlay
        isTransitioning={isTransitioning}
        direction={transitionDirection}
        activeSeason={activeSeason}
        activeEvent={activeFestiveEvent}
      />

      {/* Vùng chứa nội dung trang với hiệu ứng trượt màn hình cảm ứng toàn diện */}
      <div
        key={location.pathname}
        className={`page-transition-content-box ${
          transitionDirection === 'forward' ? 'anim-direction-forward' : 'anim-direction-backward'
        } ${isTransitioning ? 'is-animating' : ''}`}
        style={{
          transform: isDragging ? `translate3d(${dragOffset}px, 0, 0)` : undefined,
          transition: isDragging ? 'none' : undefined,
        }}
      >
        {children}
      </div>
    </div>
  );
};

export default PageTransitionWrapper;
