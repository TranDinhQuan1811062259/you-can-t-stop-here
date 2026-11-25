import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { playClickSound } from '../../utils/soundEffects';
import { triggerThresholdTick } from '../../utils/haptics';
import { getActiveSeason } from '../../utils/seasonUtils';
import { eventService } from '../../services/eventService';
import { PageTransitionAtmosphereOverlay } from './PageTransitionAtmosphereOverlay';
import {
  HOME_TOPIC,
  CORE_CATEGORIES_FALLBACK,
  useCategoryRegistry,
  getAdjacentTopics,
  setPendingBannerTransition,
  peekPendingBannerTransition,
} from '../../utils/category-navigation';

// Giữ export DASHBOARD_ROUTES để tương thích ngược tuyệt đối (Quy tắc 2 GEMINI.md)
export const DASHBOARD_ROUTES = [
  HOME_TOPIC,
  ...CORE_CATEGORIES_FALLBACK.map((c) => ({
    path: `/category/${c.slug}`,
    label: c.shortLabel || c.name,
    icon: c.icon,
    slug: c.slug,
  })),
];

const isTopicPath = (pathname = '') =>
  pathname === '/' || pathname.startsWith('/category/') || pathname === '/music' || pathname.startsWith('/music/');

const extractSlugFromLocation = (loc) => {
  const pathname = loc?.pathname || '';
  if (pathname === '/') {
    const params = new URLSearchParams(loc?.search || '');
    if (params.get('tag') || params.get('q')) return null;
    return decodeURIComponent(params.get('category') || '');
  }
  if (pathname.startsWith('/category/')) {
    return decodeURIComponent(pathname.replace(/^\/category\//, '').split('/')[0] || '');
  }
  if (pathname === '/music' || pathname.startsWith('/music/')) {
    return '__music__';
  }
  return null;
};

export const PageTransitionWrapper = ({ children }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { carouselTopics: topics } = useCategoryRegistry();

  const [transitionDirection, setTransitionDirection] = useState('forward');
  const [isTransitioning, setIsTransitioning] = useState(false);

  const prevPathRef = useRef(location.pathname);
  const transitionTimerRef = useRef(null);
  const springBackTimerRef = useRef(null);
  const rafRef = useRef(null);
  const isCommittingRef = useRef(false);
  const unlockCommitTimerRef = useRef(null);
  const hasTriggeredTickRef = useRef(false);

  const containerRef = useRef(null);
  const contentBoxRef = useRef(null);
  const indicatorRef = useRef(null);

  const dragStartRef = useRef({
    x: 0,
    y: 0,
    pointerId: null,
    isHorizontalSwipe: false,
  });
  const pendingOffsetRef = useRef(0);

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

  const currentSlug = extractSlugFromLocation(location);
  const { currentIndex, prevTopic, nextTopic } =
    currentSlug !== null
      ? getAdjacentTopics(topics, currentSlug)
      : { currentIndex: -1, prevTopic: null, nextTopic: null };

  // Tính hướng trượt đồng bộ khi route thay đổi
  if (prevPathRef.current !== location.pathname) {
    const prevSlug = extractSlugFromLocation({ pathname: prevPathRef.current, search: '' });
    const pendingDir = currentSlug !== null ? peekPendingBannerTransition(currentSlug) : null;
    const stateDir = location.state?.transitionDirection;
    let nextDir = transitionDirection;

    if (pendingDir) {
      nextDir = pendingDir === 'next' ? 'forward' : 'backward';
    } else if (stateDir === 'next' || stateDir === 'prev') {
      nextDir = stateDir === 'next' ? 'forward' : 'backward';
    } else if (prevSlug !== null && currentSlug !== null) {
      const prevIdx = topics.findIndex((t) => t.slug === prevSlug);
      const currIdx = topics.findIndex((t) => t.slug === currentSlug);
      if (prevIdx !== -1 && currIdx !== -1 && prevIdx !== currIdx) {
        nextDir = currIdx > prevIdx ? 'forward' : 'backward';
      }
    } else if (currentSlug !== null && prevSlug === null) {
      nextDir = 'backward';
    } else {
      nextDir = 'forward';
    }

    if (nextDir !== transitionDirection) {
      setTransitionDirection(nextDir);
    }
  }

  useEffect(() => {
    if (prevPathRef.current !== location.pathname) {
      prevPathRef.current = location.pathname;
      setIsTransitioning(true);
      if (transitionTimerRef.current) clearTimeout(transitionTimerRef.current);
      transitionTimerRef.current = setTimeout(() => {
        setIsTransitioning(false);
        transitionTimerRef.current = null;
      }, 1500);
    }
  }, [location.pathname]);

  // Lắng nghe sự kiện chuyển trang phân trang (Pagination)
  useEffect(() => {
    const handlePaginationChange = (e) => {
      const { direction } = e.detail || {};
      setTransitionDirection(direction === 'next' ? 'forward' : 'backward');
      setIsTransitioning(true);
      if (transitionTimerRef.current) clearTimeout(transitionTimerRef.current);
      transitionTimerRef.current = setTimeout(() => {
        setIsTransitioning(false);
        transitionTimerRef.current = null;
      }, 1500);
    };

    window.addEventListener('freedom_pagination_change', handlePaginationChange);
    return () => window.removeEventListener('freedom_pagination_change', handlePaginationChange);
  }, []);

  const clearDragVisuals = useCallback(() => {
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    pendingOffsetRef.current = 0;
    hasTriggeredTickRef.current = false;

    const container = containerRef.current;
    const box = contentBoxRef.current;
    const indicator = indicatorRef.current;

    if (container) {
      container.classList.remove('is-page-dragging');
    }
    if (box) {
      box.classList.remove('is-page-dragging', 'is-page-springing');
      box.style.setProperty('--page-drag-x', '0px');
    }
    if (indicator) {
      indicator.style.opacity = '0';
      indicator.dataset.active = 'false';
      indicator.classList.remove('is-ready');
    }
  }, []);

  const springBackPage = useCallback(() => {
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    pendingOffsetRef.current = 0;
    hasTriggeredTickRef.current = false;

    const container = containerRef.current;
    const box = contentBoxRef.current;
    const indicator = indicatorRef.current;

    container?.classList.remove('is-page-dragging');
    if (box) {
      box.classList.remove('is-page-dragging');
      box.classList.add('is-page-springing');
      box.style.setProperty('--page-drag-x', '0px');
    }
    if (indicator) {
      indicator.style.opacity = '0';
      indicator.dataset.active = 'false';
      indicator.classList.remove('is-ready');
    }

    if (springBackTimerRef.current) clearTimeout(springBackTimerRef.current);
    springBackTimerRef.current = setTimeout(() => {
      contentBoxRef.current?.classList.remove('is-page-springing');
      springBackTimerRef.current = null;
    }, 340);
  }, []);

  // Dọn dẹp toàn bộ timers & RAF khi unmount (Quy tắc 3 GEMINI.md)
  useEffect(() => {
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      if (transitionTimerRef.current) clearTimeout(transitionTimerRef.current);
      if (springBackTimerRef.current) clearTimeout(springBackTimerRef.current);
      if (unlockCommitTimerRef.current) clearTimeout(unlockCommitTimerRef.current);
    };
  }, []);

  const shouldIgnoreGesture = (target) => {
    if (!target || !(target instanceof Element)) return false;
    return Boolean(
      target.closest('.category-hero-banner') ||
        target.closest('.category-filter-bar') ||
        target.closest('.header-category-pills-track') ||
        target.closest('.story-bar-wrapper') ||
        target.closest('.no-swipe') ||
        target.closest('button') ||
        target.closest('a') ||
        target.closest('input') ||
        target.closest('textarea') ||
        target.closest('select') ||
        target.closest('[role="slider"]') ||
        target.closest('[role="button"]') ||
        target.closest('input[type="range"]') ||
        target.closest('.efforts-card-container') ||
        target.closest('.efforts-progress-wrap') ||
        target.closest('.efforts-seekbar-container') ||
        target.closest('.efforts-volume-suite') ||
        target.closest('.efforts-volume-slider-wrapper') ||
        target.closest('.audio-player-wrap') ||
        target.closest('.custom-audio-player') ||
        target.closest('.header-audio-visualizer') ||
        target.closest('.ambient-sound-drawer') ||
        target.closest('.floating-btn') ||
        target.closest('.dr-write-post-btn') ||
        target.closest('.back-to-top-btn') ||
        target.closest('.modal-backdrop') ||
        target.closest('.modal-box') ||
        target.closest('.interactive-canvas') ||
        target.closest('.rich-visual-editor') ||
        target.closest('[data-no-swipe="true"]')
    );
  };

  const handlePointerDown = useCallback(
    (e) => {
      if (e.pointerType === 'mouse' && e.button !== 0) return;
      if (shouldIgnoreGesture(e.target)) return;
      if (currentIndex === -1 || isCommittingRef.current) return;

      if (springBackTimerRef.current) {
        clearTimeout(springBackTimerRef.current);
        springBackTimerRef.current = null;
      }
      contentBoxRef.current?.classList.remove('is-page-springing');

      dragStartRef.current = {
        x: e.clientX,
        y: e.clientY,
        pointerId: e.pointerId,
        isHorizontalSwipe: false,
      };
      pendingOffsetRef.current = 0;
      hasTriggeredTickRef.current = false;
    },
    [currentIndex]
  );

  const handlePointerMove = useCallback(
    (e) => {
      const state = dragStartRef.current;
      if (state.pointerId !== e.pointerId || isCommittingRef.current) return;

      const deltaX = e.clientX - state.x;
      const deltaY = e.clientY - state.y;

      if (!state.isHorizontalSwipe) {
        if (Math.abs(deltaY) > Math.abs(deltaX) && Math.abs(deltaY) > 8) {
          state.pointerId = null;
          return;
        }
        if (Math.abs(deltaX) > 14) {
          state.isHorizontalSwipe = true;
          try {
            window.getSelection?.()?.removeAllRanges?.();
          } catch (_) {}
          containerRef.current?.classList.add('is-page-dragging');
          contentBoxRef.current?.classList.add('is-page-dragging');
          try {
            e.currentTarget.setPointerCapture?.(e.pointerId);
          } catch (_) {}
        } else {
          return;
        }
      }

      const targetTopic = deltaX < 0 ? nextTopic : prevTopic;
      const effective = targetTopic ? deltaX * 0.65 : deltaX * 0.2;
      pendingOffsetRef.current = effective;

      if (!rafRef.current) {
        rafRef.current = requestAnimationFrame(() => {
          rafRef.current = null;
          const offset = pendingOffsetRef.current;
          const threshold = 72;
          const box = contentBoxRef.current;
          const indicator = indicatorRef.current;

          if (box) {
            box.style.setProperty('--page-drag-x', `${offset.toFixed(1)}px`);
          }

          if (indicator) {
            const absX = Math.abs(offset);
            const curTarget = offset < 0 ? nextTopic : prevTopic;
            if (absX > 24) {
              indicator.dataset.active = 'true';
              indicator.dataset.side = offset < 0 ? 'right' : 'left';
              indicator.style.opacity = String(Math.min(1, (absX - 20) / 55));
              if (curTarget && absX >= threshold) {
                if (!hasTriggeredTickRef.current) {
                  hasTriggeredTickRef.current = true;
                  triggerThresholdTick();
                }
                indicator.classList.add('is-ready');
              } else {
                hasTriggeredTickRef.current = false;
                indicator.classList.remove('is-ready');
              }
            } else {
              indicator.style.opacity = '0';
              indicator.dataset.active = 'false';
            }
          }
        });
      }
    },
    [nextTopic, prevTopic]
  );

  const handlePointerUpOrCancel = useCallback(
    (e) => {
      const state = dragStartRef.current;
      if (state.pointerId !== null && e?.pointerId !== undefined && state.pointerId !== e.pointerId) {
        return;
      }

      try {
        if (e?.pointerId !== undefined && containerRef.current?.hasPointerCapture?.(e.pointerId)) {
          containerRef.current.releasePointerCapture(e.pointerId);
        }
      } catch (_) {}

      const wasHorizontal = state.isHorizontalSwipe;
      const currentOffset = pendingOffsetRef.current;

      state.pointerId = null;
      state.isHorizontalSwipe = false;

      if (!wasHorizontal) return;

      const threshold = 72;

      if (currentOffset <= -threshold && nextTopic && !isCommittingRef.current) {
        isCommittingRef.current = true;
        playClickSound();
        clearDragVisuals();
        setPendingBannerTransition('next', nextTopic.slug);
        navigate(nextTopic.path, {
          state: { transitionDirection: 'next', targetSlug: nextTopic.slug },
        });
        if (unlockCommitTimerRef.current) clearTimeout(unlockCommitTimerRef.current);
        unlockCommitTimerRef.current = setTimeout(() => {
          isCommittingRef.current = false;
          unlockCommitTimerRef.current = null;
        }, 300);
      } else if (currentOffset >= threshold && prevTopic && !isCommittingRef.current) {
        isCommittingRef.current = true;
        playClickSound();
        clearDragVisuals();
        setPendingBannerTransition('prev', prevTopic.slug);
        navigate(prevTopic.path, {
          state: { transitionDirection: 'prev', targetSlug: prevTopic.slug },
        });
        if (unlockCommitTimerRef.current) clearTimeout(unlockCommitTimerRef.current);
        unlockCommitTimerRef.current = setTimeout(() => {
          isCommittingRef.current = false;
          unlockCommitTimerRef.current = null;
        }, 300);
      } else {
        springBackPage();
      }
    },
    [clearDragVisuals, navigate, nextTopic, prevTopic, springBackPage]
  );

  // Bảo hiểm toàn cục giải phóng khi resize/blur/orientationchange
  useEffect(() => {
    const handleReset = () => {
      if (dragStartRef.current.pointerId !== null) {
        dragStartRef.current.pointerId = null;
        dragStartRef.current.isHorizontalSwipe = false;
        springBackPage();
      }
    };

    window.addEventListener('pointerup', handlePointerUpOrCancel);
    window.addEventListener('pointercancel', handlePointerUpOrCancel);
    window.addEventListener('resize', handleReset);
    window.addEventListener('orientationchange', handleReset);
    window.addEventListener('blur', handleReset);
    return () => {
      window.removeEventListener('pointerup', handlePointerUpOrCancel);
      window.removeEventListener('pointercancel', handlePointerUpOrCancel);
      window.removeEventListener('resize', handleReset);
      window.removeEventListener('orientationchange', handleReset);
      window.removeEventListener('blur', handleReset);
    };
  }, [handlePointerUpOrCancel, springBackPage]);

  // Giữ nguyên vỏ trang giữa / và /category/* để Banner tự chạy slide-in 0-flicker, chỉ remount key khi sang trang khác hẳn
  const contentBoxKey = isTopicPath(location.pathname) ? '__topic_shell__' : location.pathname;

  return (
    <div
      ref={containerRef}
      className="page-gesture-container"
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUpOrCancel}
      onPointerCancel={handlePointerUpOrCancel}
    >
      {/* Chỉ báo kéo vuốt ngoài vùng Banner (cập nhật 100% qua ref/CSS, 0 re-render) */}
      <div ref={indicatorRef} className="drag-dashboard-indicator" data-active="false" aria-hidden="true">
        <span className="drag-ind-arrow-left">&larr;</span>
        <span className="drag-ind-label-left">
          {prevTopic ? `${prevTopic.icon} ${prevTopic.shortLabel || prevTopic.name}` : 'Đầu danh sách'}
        </span>
        <span className="drag-ind-label-right">
          {nextTopic ? `${nextTopic.shortLabel || nextTopic.name} ${nextTopic.icon}` : 'Cuối danh sách'}
        </span>
        <span className="drag-ind-arrow-right">&rarr;</span>
      </div>

      {/* Hiệu ứng hình ảnh & âm thanh chuyển trang theo mùa & sự kiện lễ hội */}
      <PageTransitionAtmosphereOverlay
        isTransitioning={isTransitioning}
        direction={transitionDirection}
        activeSeason={activeSeason}
        activeEvent={activeFestiveEvent}
      />

      <div
        ref={contentBoxRef}
        key={contentBoxKey}
        className={`page-transition-content-box ${
          !isTopicPath(location.pathname)
            ? `${transitionDirection === 'forward' ? 'anim-direction-forward' : 'anim-direction-backward'} ${
                isTransitioning ? 'is-animating' : ''
              }`
            : ''
        }`}
      >
        {children}
      </div>
    </div>
  );
};

export default PageTransitionWrapper;
