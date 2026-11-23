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
      }, 1600); // 1.6s chuyển trang dịu mắt, chuyển động thư thái, không bị vèo qua quá nhanh

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
      setTimeout(() => setIsTransitioning(false), 1600);
    };

    window.addEventListener('freedom_pagination_change', handlePaginationChange);
    return () => window.removeEventListener('freedom_pagination_change', handlePaginationChange);
  }, []);

  // =========================================================================
  // GESTURES: BẤM CHUỘT HOẶC CHẠM TAY VUỐT MÀN HÌNH ĐỂ TRƯỢT GIAO DIỆN 1:1
  // =========================================================================

  // Trạng thái kéo và nảy mềm
  const [dragOffset, setDragOffset] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [isSpringingBack, setIsSpringingBack] = useState(false);
  const dragStartRef = useRef({ x: 0, y: 0, time: 0, pointerId: null, isHorizontalSwipe: false });
  const rafRef = useRef(null);
  const pendingOffsetRef = useRef(0);

  useEffect(() => {
    return () => {
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
    };
  }, []);

  const shouldIgnoreGesture = (target) => {
    if (!target || !(target instanceof Element)) return false;
    return Boolean(
      target.closest('.no-swipe') ||
      target.closest('button') ||
      target.closest('a') ||
      target.closest('input') ||
      target.closest('textarea') ||
      target.closest('select') ||
      target.closest('[role="slider"]') ||
      target.closest('[role="button"]') ||
      target.closest('.efforts-card-container') ||
      target.closest('.efforts-progress-wrap') ||
      target.closest('.efforts-seekbar-container') ||
      target.closest('.efforts-volume-suite') ||
      target.closest('.efforts-volume-slider-wrapper') ||
      target.closest('.audio-player-wrap') ||
      target.closest('.modal-backdrop') ||
      target.closest('.modal-box') ||
      target.closest('.interactive-canvas') ||
      target.closest('.rich-visual-editor')
    );
  };

  const handlePointerDown = (e) => {
    // Chỉ xử lý chuột trái hoặc chạm tay
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    if (shouldIgnoreGesture(e.target)) return;
    if (currentDashIndex === -1) return;

    setIsSpringingBack(false);
    dragStartRef.current = {
      x: e.clientX,
      y: e.clientY,
      time: Date.now(),
      pointerId: e.pointerId,
      isHorizontalSwipe: false,
    };
    pendingOffsetRef.current = 0;
  };

  const handlePointerMove = (e) => {
    if (dragStartRef.current.pointerId !== e.pointerId) return;

    const deltaX = e.clientX - dragStartRef.current.x;
    const deltaY = e.clientY - dragStartRef.current.y;

    // Nếu người dùng đang cuộn dọc tự nhiên, hủy ngay nhận diện vuốt ngang
    if (!dragStartRef.current.isHorizontalSwipe) {
      if (Math.abs(deltaY) > Math.abs(deltaX) && Math.abs(deltaY) > 8) {
        dragStartRef.current.pointerId = null;
        if (isDragging) {
          setIsDragging(false);
          setDragOffset(0);
        }
        return;
      }
      if (Math.abs(deltaX) > 12) {
        dragStartRef.current.isHorizontalSwipe = true;
        setIsDragging(true);
        try {
          e.currentTarget.setPointerCapture?.(e.pointerId);
        } catch {
          // Bỏ qua nếu browser không hỗ trợ capture
        }
      } else {
        return;
      }
    }

    // Điện trở đàn hồi mượt mà khi kéo kịch biên (ở tab đầu hoặc tab cuối)
    let effective = deltaX;
    if ((deltaX > 0 && currentDashIndex === 0) || (deltaX < 0 && currentDashIndex === DASHBOARD_ROUTES.length - 1)) {
      effective = deltaX * 0.22;
    }

    pendingOffsetRef.current = effective;
    if (!rafRef.current) {
      rafRef.current = requestAnimationFrame(() => {
        setDragOffset(pendingOffsetRef.current);
        rafRef.current = null;
      });
    }
  };

  const handlePointerUpOrCancel = (e) => {
    if (dragStartRef.current.pointerId !== e.pointerId) return;

    try {
      if (e.currentTarget?.hasPointerCapture?.(e.pointerId)) {
        e.currentTarget.releasePointerCapture(e.pointerId);
      }
    } catch {
      // ignore
    }

    dragStartRef.current.pointerId = null;
    dragStartRef.current.isHorizontalSwipe = false;

    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }

    const currentOffset = pendingOffsetRef.current;
    const threshold = 60; // Ngưỡng 60px kích hoạt chuyển trang

    if (currentOffset < -threshold && currentDashIndex < DASHBOARD_ROUTES.length - 1) {
      // Vuốt sang TRÁI -> Chuyển sang Dashboard kế tiếp
      playClickSound();
      const nextRoute = DASHBOARD_ROUTES[currentDashIndex + 1];
      navigate(nextRoute.path);
      setIsDragging(false);
      setDragOffset(0);
    } else if (currentOffset > threshold && currentDashIndex > 0) {
      // Vuốt sang PHẢI -> Chuyển sang Dashboard trước đó
      playClickSound();
      const prevRoute = DASHBOARD_ROUTES[currentDashIndex - 1];
      navigate(prevRoute.path);
      setIsDragging(false);
      setDragOffset(0);
    } else {
      // Chưa đạt ngưỡng hoặc ở kịch biên -> Nảy mềm (spring back) về 0px
      if (Math.abs(currentOffset) > 0) {
        setIsSpringingBack(true);
        setDragOffset(0);
        setTimeout(() => {
          setIsDragging(false);
          setIsSpringingBack(false);
        }, 320);
      } else {
        setIsDragging(false);
      }
    }
  };

  const targetNext = currentDashIndex < DASHBOARD_ROUTES.length - 1 ? DASHBOARD_ROUTES[currentDashIndex + 1] : null;
  const targetPrev = currentDashIndex > 0 ? DASHBOARD_ROUTES[currentDashIndex - 1] : null;

  return (
    <div
      className="page-gesture-container"
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUpOrCancel}
      onPointerCancel={handlePointerUpOrCancel}
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
            top: '46%',
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

      {/* Vùng chứa nội dung trang với hiệu ứng trượt màn hình cảm ứng 1:1 siêu mượt */}
      <div
        key={location.pathname}
        className={`page-transition-content-box ${
          transitionDirection === 'forward' ? 'anim-direction-forward' : 'anim-direction-backward'
        } ${isTransitioning ? 'is-animating' : ''}`}
        style={{
          transform: isDragging || isSpringingBack ? `translate3d(${dragOffset}px, 0, 0)` : undefined,
          transition: isSpringingBack
            ? 'transform 0.32s cubic-bezier(0.16, 1, 0.3, 1)'
            : isDragging
            ? 'none'
            : undefined,
          willChange: isDragging || isSpringingBack ? 'transform' : 'auto',
        }}
      >
        {children}
      </div>
    </div>
  );
};

export default PageTransitionWrapper;
