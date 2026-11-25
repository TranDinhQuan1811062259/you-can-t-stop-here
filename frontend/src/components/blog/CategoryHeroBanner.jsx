import React, { useEffect, useRef, useCallback, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { playClickSound } from '../../utils/soundEffects';
import { triggerThresholdTick } from '../../utils/haptics';
import {
  getAdjacentTopics,
  peekPendingBannerTransition,
  setPendingBannerTransition,
  clearPendingBannerTransition,
} from '../../utils/category-navigation';

const shouldSkipTargetForDrag = (target) => {
  if (!target || !(target instanceof Element)) return false;
  return Boolean(
    target.closest('input') ||
      target.closest('textarea') ||
      target.closest('select') ||
      target.closest('option') ||
      target.closest('[contenteditable="true"]') ||
      target.closest('[role="slider"]') ||
      target.closest('[data-no-swipe="true"]') ||
      target.closest('.no-swipe')
  );
};

const isEditableOrModalActive = () => {
  if (typeof document === 'undefined') return true;
  const activeEl = document.activeElement;
  if (activeEl) {
    const tag = activeEl.tagName;
    if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || tag === 'OPTION') {
      return true;
    }
    if (
      activeEl.isContentEditable ||
      activeEl.closest?.('[contenteditable="true"], .rich-visual-editor, [role="textbox"], [role="slider"]')
    ) {
      return true;
    }
  }

  return Boolean(
    document.querySelector(
      '.modal-backdrop, .personal-hub-overlay, .cinema-reading-overlay, [role="dialog"][aria-modal="true"]'
    )
  );
};

export const CategoryHeroBanner = ({
  topics = [],
  activeSlug = '',
  variant = 'category', // 'home' | 'category' | 'tag' | 'search'
  swipeEnabled = true,
  badgeContent,
  titleContent,
  subtitle = '',
  actionsContent = null,
  extraContent = null,
  onNavigateTopic = null,
  onTransitionCommitStart = null,
  paddingStyle = undefined,
}) => {
  const navigate = useNavigate();
  const location = useLocation();

  const bannerRef = useRef(null);
  const rafIdRef = useRef(null);
  const commitTimerRef = useRef(null);
  const unlockCommitTimerRef = useRef(null);
  const springTimerRef = useRef(null);
  const enterTimerRef = useRef(null);
  const clickResetTimerRef = useRef(null);
  const wheelTimerRef = useRef(null);
  const wheelCooldownTimerRef = useRef(null);

  const isCommittingRef = useRef(false);
  const wasDraggingRef = useRef(false);
  const wheelAccumRef = useRef(0);
  const wheelCooldownRef = useRef(false);

  const dragStateRef = useRef({
    active: false,
    pointerId: null,
    startX: 0,
    startY: 0,
    isHorizontal: false,
    lastDeltaX: 0,
    hasTriggeredTick: false,
  });

  const { currentIndex, prevTopic, nextTopic } = getAdjacentTopics(topics, activeSlug);

  // Đọc hướng chuyển trang đồng bộ ngay khi activeSlug thay đổi để tránh nháy 1 frame ở route mới
  const prevSlugTrackRef = useRef(activeSlug);
  const [enterAnimationDir, setEnterAnimationDir] = useState(() => {
    const pending = peekPendingBannerTransition(activeSlug);
    if (pending) return pending;
    if (location.state?.targetSlug === activeSlug && location.state?.transitionDirection) {
      return location.state.transitionDirection;
    }
    return null;
  });

  if (prevSlugTrackRef.current !== activeSlug) {
    prevSlugTrackRef.current = activeSlug;
    const pending = peekPendingBannerTransition(activeSlug);
    const stateDir =
      location.state?.targetSlug === activeSlug ? location.state?.transitionDirection : null;
    const resolvedDir = pending || stateDir || null;
    if (resolvedDir !== enterAnimationDir) {
      setEnterAnimationDir(resolvedDir);
    }
  }

  // Dọn dẹp enter animation & pending direction sau khi banner mới trượt vào ổn định
  useEffect(() => {
    clearPendingBannerTransition(activeSlug);
    if (unlockCommitTimerRef.current) {
      clearTimeout(unlockCommitTimerRef.current);
    }
    unlockCommitTimerRef.current = setTimeout(() => {
      isCommittingRef.current = false;
      unlockCommitTimerRef.current = null;
    }, 120);

    if (enterAnimationDir) {
      if (enterTimerRef.current) clearTimeout(enterTimerRef.current);
      enterTimerRef.current = setTimeout(() => {
        setEnterAnimationDir(null);
        enterTimerRef.current = null;
      }, 420);
    }

    return () => {
      if (enterTimerRef.current) {
        clearTimeout(enterTimerRef.current);
        enterTimerRef.current = null;
      }
    };
  }, [activeSlug, enterAnimationDir]);

  const clearTimersForDrag = useCallback(() => {
    if (rafIdRef.current) {
      cancelAnimationFrame(rafIdRef.current);
      rafIdRef.current = null;
    }
    if (springTimerRef.current) {
      clearTimeout(springTimerRef.current);
      springTimerRef.current = null;
    }
  }, []);

  const resetBannerCssVars = useCallback(() => {
    const el = bannerRef.current;
    if (!el) return;
    el.style.setProperty('--drag-x', '0px');
    el.style.setProperty('--drag-progress', '0');
    el.dataset.dragDir = 'none';
    el.classList.remove('is-dragging', 'is-threshold-ready');
  }, []);

  const getDynamicThreshold = useCallback(() => {
    const width = bannerRef.current?.offsetWidth || 380;
    return Math.max(75, Math.min(115, Math.round(width * 0.22)));
  }, []);

  const applyDragToDom = useCallback(
    (effectiveX, hasTarget, threshold) => {
      const el = bannerRef.current;
      if (!el) return;

      const progress = hasTarget ? Math.min(1, Math.abs(effectiveX) / threshold) : 0;
      el.style.setProperty('--drag-x', `${effectiveX.toFixed(1)}px`);
      el.style.setProperty('--drag-progress', progress.toFixed(3));
      el.dataset.dragDir = effectiveX < -4 ? 'left' : effectiveX > 4 ? 'right' : 'none';

      if (hasTarget && Math.abs(effectiveX) >= threshold) {
        if (!dragStateRef.current.hasTriggeredTick) {
          dragStateRef.current.hasTriggeredTick = true;
          triggerThresholdTick();
        }
        el.classList.add('is-threshold-ready');
      } else if (Math.abs(effectiveX) < threshold - 8) {
        dragStateRef.current.hasTriggeredTick = false;
        el.classList.remove('is-threshold-ready');
      }
    },
    []
  );

  const springBackBanner = useCallback(() => {
    clearTimersForDrag();
    const el = bannerRef.current;
    if (!el) return;

    el.classList.remove('is-dragging', 'is-threshold-ready');
    el.classList.add('is-spring-back');
    el.style.setProperty('--drag-x', '0px');
    el.style.setProperty('--drag-progress', '0');
    el.dataset.dragDir = 'none';

    dragStateRef.current.lastDeltaX = 0;
    dragStateRef.current.hasTriggeredTick = false;
    wheelAccumRef.current = 0;

    springTimerRef.current = setTimeout(() => {
      bannerRef.current?.classList.remove('is-spring-back');
      springTimerRef.current = null;
    }, 380);
  }, [clearTimersForDrag]);

  const performDirectNavigation = useCallback(
    (targetTopic, dir) => {
      if (!targetTopic) return;
      if (typeof onNavigateTopic === 'function') {
        onNavigateTopic(targetTopic, dir);
      } else {
        navigate(targetTopic.path, {
          state: {
            transitionDirection: dir,
            targetSlug: targetTopic.slug,
            fromSlug: activeSlug,
          },
        });
      }
    },
    [onNavigateTopic, navigate, activeSlug]
  );

  const commitTransition = useCallback(
    (targetTopic, dir) => {
      if (!targetTopic || isCommittingRef.current) return;
      if (String(targetTopic.slug || '') === String(activeSlug || '')) return;

      isCommittingRef.current = true;
      clearTimersForDrag();

      try {
        playClickSound();
      } catch (_) {}

      const el = bannerRef.current;
      if (el) {
        el.classList.remove('is-dragging', 'is-spring-back', 'is-threshold-ready');
        el.classList.add(dir === 'next' ? 'is-committing-next' : 'is-committing-prev');
      }

      setPendingBannerTransition(dir, targetTopic.slug);
      if (typeof onTransitionCommitStart === 'function') {
        onTransitionCommitStart(targetTopic, dir);
      }

      if (commitTimerRef.current) {
        clearTimeout(commitTimerRef.current);
      }

      commitTimerRef.current = setTimeout(() => {
        commitTimerRef.current = null;
        if (bannerRef.current) {
          bannerRef.current.classList.remove('is-committing-next', 'is-committing-prev');
        }
        resetBannerCssVars();
        dragStateRef.current.lastDeltaX = 0;
        dragStateRef.current.hasTriggeredTick = false;
        wheelAccumRef.current = 0;

        performDirectNavigation(targetTopic, dir);

        if (unlockCommitTimerRef.current) {
          clearTimeout(unlockCommitTimerRef.current);
        }
        unlockCommitTimerRef.current = setTimeout(() => {
          isCommittingRef.current = false;
          unlockCommitTimerRef.current = null;
        }, 220);
      }, 145);
    },
    [
      activeSlug,
      clearTimersForDrag,
      onTransitionCommitStart,
      performDirectNavigation,
      resetBannerCssVars,
    ]
  );

  const finishPointerDrag = useCallback(
    (e) => {
      const state = dragStateRef.current;
      if (!state.active) return;
      if (e?.pointerId !== undefined && state.pointerId !== null && state.pointerId !== e.pointerId) {
        return;
      }

      try {
        if (e?.pointerId !== undefined && bannerRef.current?.hasPointerCapture?.(e.pointerId)) {
          bannerRef.current.releasePointerCapture(e.pointerId);
        }
      } catch (_) {}

      const wasHorizontal = state.isHorizontal;
      const effectiveX = state.lastDeltaX;

      state.active = false;
      state.pointerId = null;
      state.isHorizontal = false;

      if (wasDraggingRef.current) {
        if (clickResetTimerRef.current) clearTimeout(clickResetTimerRef.current);
        clickResetTimerRef.current = setTimeout(() => {
          wasDraggingRef.current = false;
          clickResetTimerRef.current = null;
        }, 80);
      }

      if (!wasHorizontal) {
        resetBannerCssVars();
        return;
      }

      const threshold = getDynamicThreshold();
      if (effectiveX <= -threshold && nextTopic) {
        commitTransition(nextTopic, 'next');
      } else if (effectiveX >= threshold && prevTopic) {
        commitTransition(prevTopic, 'prev');
      } else {
        springBackBanner();
      }
    },
    [commitTransition, getDynamicThreshold, nextTopic, prevTopic, resetBannerCssVars, springBackBanner]
  );

  const handlePointerDown = useCallback(
    (e) => {
      if (!swipeEnabled || isCommittingRef.current) return;
      if (e.pointerType === 'mouse' && e.button !== 0) return;
      if (shouldSkipTargetForDrag(e.target)) return;

      clearTimersForDrag();
      bannerRef.current?.classList.remove('is-spring-back');

      wasDraggingRef.current = false;
      dragStateRef.current = {
        active: true,
        pointerId: e.pointerId,
        startX: e.clientX,
        startY: e.clientY,
        isHorizontal: false,
        lastDeltaX: 0,
        hasTriggeredTick: false,
      };
    },
    [clearTimersForDrag, swipeEnabled]
  );

  const handlePointerMove = useCallback(
    (e) => {
      const state = dragStateRef.current;
      if (!state.active || state.pointerId !== e.pointerId || isCommittingRef.current) return;

      const deltaX = e.clientX - state.startX;
      const deltaY = e.clientY - state.startY;

      if (Math.abs(deltaX) > 6) {
        wasDraggingRef.current = true;
      }

      if (!state.isHorizontal) {
        // Nếu người dùng đang cuộn dọc trang trên màn hình cảm ứng, nhường quyền cuộn dọc
        if (Math.abs(deltaY) > Math.abs(deltaX) && Math.abs(deltaY) > 8) {
          state.active = false;
          state.pointerId = null;
          return;
        }
        if (Math.abs(deltaX) > 10) {
          state.isHorizontal = true;
          bannerRef.current?.classList.add('is-dragging');
          try {
            bannerRef.current?.setPointerCapture?.(e.pointerId);
          } catch (_) {}
        } else {
          return;
        }
      }

      const targetTopic = deltaX < 0 ? nextTopic : prevTopic;
      const hasTarget = Boolean(targetTopic);
      const effectiveX = hasTarget
        ? deltaX
        : (deltaX * 0.24) / (1 + Math.abs(deltaX) / 260);

      state.lastDeltaX = effectiveX;

      if (!rafIdRef.current) {
        rafIdRef.current = requestAnimationFrame(() => {
          rafIdRef.current = null;
          if (!dragStateRef.current.active) return;
          const threshold = getDynamicThreshold();
          const currentTarget = dragStateRef.current.lastDeltaX < 0 ? nextTopic : prevTopic;
          applyDragToDom(dragStateRef.current.lastDeltaX, Boolean(currentTarget), threshold);
        });
      }
    },
    [applyDragToDom, getDynamicThreshold, nextTopic, prevTopic]
  );

  // Trackpad 2-ngón vuốt ngang hỗ trợ Live Parallax & Commit (gắn non-passive listener để chặn Back/Forward của trình duyệt)
  useEffect(() => {
    const el = bannerRef.current;
    if (!el || !swipeEnabled) return undefined;

    const handleNativeWheel = (e) => {
      if (isCommittingRef.current || wheelCooldownRef.current) return;
      if (dragStateRef.current.active) return;
      if (Math.abs(e.deltaX) <= Math.abs(e.deltaY) * 1.35 || Math.abs(e.deltaX) < 3) return;
      if (shouldSkipTargetForDrag(e.target)) return;

      if (Math.abs(e.deltaX) > 5 && e.cancelable) {
        e.preventDefault();
      }

      el.classList.remove('is-spring-back');
      el.classList.add('is-dragging');

      const nextAccum = wheelAccumRef.current - e.deltaX * 0.85;
      const targetTopic = nextAccum < 0 ? nextTopic : prevTopic;
      const hasTarget = Boolean(targetTopic);
      const clampedX = hasTarget
        ? Math.max(-180, Math.min(180, nextAccum))
        : (nextAccum * 0.22) / (1 + Math.abs(nextAccum) / 200);

      wheelAccumRef.current = clampedX;
      const threshold = getDynamicThreshold();

      if (!rafIdRef.current) {
        rafIdRef.current = requestAnimationFrame(() => {
          rafIdRef.current = null;
          const curTarget = wheelAccumRef.current < 0 ? nextTopic : prevTopic;
          applyDragToDom(wheelAccumRef.current, Boolean(curTarget), threshold);
        });
      }

      if (wheelTimerRef.current) clearTimeout(wheelTimerRef.current);

      if (hasTarget && Math.abs(clampedX) >= threshold) {
        wheelCooldownRef.current = true;
        if (wheelCooldownTimerRef.current) clearTimeout(wheelCooldownTimerRef.current);
        wheelCooldownTimerRef.current = setTimeout(() => {
          wheelCooldownRef.current = false;
          wheelCooldownTimerRef.current = null;
        }, 620);
        commitTransition(targetTopic, clampedX < 0 ? 'next' : 'prev');
        return;
      }

      wheelTimerRef.current = setTimeout(() => {
        wheelTimerRef.current = null;
        springBackBanner();
      }, 150);
    };

    el.addEventListener('wheel', handleNativeWheel, { passive: false });
    return () => {
      el.removeEventListener('wheel', handleNativeWheel);
    };
  }, [applyDragToDom, commitTransition, getDynamicThreshold, nextTopic, prevTopic, springBackBanner, swipeEnabled]);

  // Điều hướng bằng phím mũi tên trái / phải (tự động tắt khi focus input/textarea hoặc modal đang mở)
  useEffect(() => {
    if (!swipeEnabled) return;

    const handleKeyDown = (e) => {
      if (e.repeat || isCommittingRef.current) return;
      if (e.altKey || e.ctrlKey || e.metaKey || e.shiftKey) return;
      if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
      if (isEditableOrModalActive()) return;

      if (e.key === 'ArrowLeft' && prevTopic) {
        e.preventDefault();
        commitTransition(prevTopic, 'prev');
      } else if (e.key === 'ArrowRight' && nextTopic) {
        e.preventDefault();
        commitTransition(nextTopic, 'next');
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [swipeEnabled, prevTopic, nextTopic, commitTransition]);

  // Bảo hiểm giải phóng listener nếu cửa sổ mất focus hoặc xoay màn hình
  useEffect(() => {
    const handleSafetyReset = () => {
      if (dragStateRef.current.active) {
        dragStateRef.current.active = false;
        dragStateRef.current.pointerId = null;
        dragStateRef.current.isHorizontal = false;
        wasDraggingRef.current = false;
        springBackBanner();
      }
    };

    window.addEventListener('pointerup', finishPointerDrag);
    window.addEventListener('pointercancel', finishPointerDrag);
    window.addEventListener('blur', handleSafetyReset);
    window.addEventListener('orientationchange', handleSafetyReset);

    return () => {
      window.removeEventListener('pointerup', finishPointerDrag);
      window.removeEventListener('pointercancel', finishPointerDrag);
      window.removeEventListener('blur', handleSafetyReset);
      window.removeEventListener('orientationchange', handleSafetyReset);
    };
  }, [finishPointerDrag, springBackBanner]);

  // Dọn dẹp toàn bộ RAF và Timers khi component unmount (Quy tắc 3 GEMINI.md)
  useEffect(() => {
    return () => {
      clearTimersForDrag();
      if (commitTimerRef.current) clearTimeout(commitTimerRef.current);
      if (unlockCommitTimerRef.current) clearTimeout(unlockCommitTimerRef.current);
      if (enterTimerRef.current) clearTimeout(enterTimerRef.current);
      if (clickResetTimerRef.current) clearTimeout(clickResetTimerRef.current);
      if (wheelTimerRef.current) clearTimeout(wheelTimerRef.current);
      if (wheelCooldownTimerRef.current) clearTimeout(wheelCooldownTimerRef.current);
    };
  }, [clearTimersForDrag]);

  const enterClass =
    enterAnimationDir === 'next'
      ? 'banner-enter-from-right'
      : enterAnimationDir === 'prev'
      ? 'banner-enter-from-left'
      : '';

  return (
    <section
      ref={bannerRef}
      data-no-swipe="true"
      data-drag-dir="none"
      className={`hero-banner category-hero-banner variant-${variant} ${
        swipeEnabled ? 'is-swipe-enabled' : ''
      }`}
      style={paddingStyle}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={finishPointerDrag}
      onPointerCancel={finishPointerDrag}
      onDragStart={(e) => e.preventDefault()}
      onClickCapture={(e) => {
        if (wasDraggingRef.current) {
          e.preventDefault();
          e.stopPropagation();
          wasDraggingRef.current = false;
        }
      }}
    >
      {/* Nút điều hướng nhanh cạnh trái / phải trên Desktop & Tablet */}
      {swipeEnabled && prevTopic && (
        <button
          type="button"
          className="category-banner-edge-btn edge-prev"
          onClick={() => commitTransition(prevTopic, 'prev')}
          title={`Chuyển về: ${prevTopic.name} (Phím ←)`}
          aria-label={`Chủ đề trước: ${prevTopic.name}`}
        >
          <i className="fa-solid fa-chevron-left" aria-hidden="true"></i>
        </button>
      )}

      {swipeEnabled && nextTopic && (
        <button
          type="button"
          className="category-banner-edge-btn edge-next"
          onClick={() => commitTransition(nextTopic, 'next')}
          title={`Chuyển tới: ${nextTopic.name} (Phím →)`}
          aria-label={`Chủ đề kế tiếp: ${nextTopic.name}`}
        >
          <i className="fa-solid fa-chevron-right" aria-hidden="true"></i>
        </button>
      )}

      {/* Dual-Card Peek: Hé lộ chủ đề trước bên trái */}
      {swipeEnabled && (
        <div className="category-peek-card peek-left" aria-hidden="true">
          <div className="peek-card-arrow">←</div>
          <div className="peek-card-meta">
            <span className="peek-card-kicker">
              <span className="kicker-pull">Chủ đề trước</span>
              <span className="kicker-ready">Thả để chuyển!</span>
            </span>
            <div className="peek-card-title">
              <span>{prevTopic ? prevTopic.icon : '🛡️'}</span>
              <span>{prevTopic ? (prevTopic.shortLabel || prevTopic.name) : 'Đầu danh sách'}</span>
            </div>
            {prevTopic && (
              <div className="peek-progress-track">
                <div className="peek-progress-fill" />
              </div>
            )}
          </div>
        </div>
      )}

      {/* Dual-Card Peek: Hé lộ chủ đề tiếp theo bên phải */}
      {swipeEnabled && (
        <div className="category-peek-card peek-right" aria-hidden="true">
          <div className="peek-card-meta">
            <span className="peek-card-kicker">
              <span className="kicker-pull">Kế tiếp</span>
              <span className="kicker-ready">Thả để chuyển!</span>
            </span>
            <div className="peek-card-title">
              <span>{nextTopic ? nextTopic.icon : '✨'}</span>
              <span>{nextTopic ? (nextTopic.shortLabel || nextTopic.name) : 'Cuối danh sách'}</span>
            </div>
            {nextTopic && (
              <div className="peek-progress-track">
                <div className="peek-progress-fill" />
              </div>
            )}
          </div>
          <div className="peek-card-arrow">→</div>
        </div>
      )}

      {/* Nội dung Banner chính — Di chuyển Live Parallax theo CSS Variables GPU 60fps */}
      <div
        key={activeSlug || `__${variant}__`}
        className={`container hero-banner-container category-banner-inner ${enterClass}`}
      >
        {badgeContent && <div className="hero-tag-pill-wrap">{badgeContent}</div>}

        <h1
          className="hero-title"
          style={variant === 'category' ? { textTransform: 'capitalize' } : undefined}
        >
          {titleContent}
        </h1>

        {subtitle && <p className="hero-subtitle">{subtitle}</p>}

        {actionsContent}
        {extraContent}

        {/* Thanh chỉ báo không gian các chủ đề & gợi ý kéo ngang */}
        {swipeEnabled && topics.length > 1 && variant === 'category' && (
          <div className="category-spatial-rail" aria-label="Điều hướng giữa các chủ đề">
            <button
              type="button"
              className="spatial-rail-step"
              disabled={!prevTopic}
              onClick={() => prevTopic && commitTransition(prevTopic, 'prev')}
              title={prevTopic ? `Về: ${prevTopic.name}` : 'Đang ở đầu danh sách'}
            >
              <span>←</span>
              <span className="spatial-step-label">
                {prevTopic ? `${prevTopic.icon} ${prevTopic.shortLabel || prevTopic.name}` : 'Đầu'}
              </span>
            </button>

            <div className="spatial-rail-dots" role="tablist" aria-label="Danh sách chủ đề">
              {topics.map((topic, idx) => {
                const isActive = idx === currentIndex;
                const dir = idx > currentIndex ? 'next' : 'prev';
                return (
                  <button
                    key={topic.slug || '__home__'}
                    type="button"
                    role="tab"
                    aria-selected={isActive}
                    className={`spatial-dot-btn ${isActive ? 'active' : ''}`}
                    onClick={() => !isActive && commitTransition(topic, dir)}
                    title={topic.name}
                    aria-label={topic.name}
                  />
                );
              })}
            </div>

            <button
              type="button"
              className="spatial-rail-step"
              disabled={!nextTopic}
              onClick={() => nextTopic && commitTransition(nextTopic, 'next')}
              title={nextTopic ? `Tới: ${nextTopic.name}` : 'Đang ở cuối danh sách'}
            >
              <span className="spatial-step-label">
                {nextTopic ? `${nextTopic.shortLabel || nextTopic.name} ${nextTopic.icon}` : 'Cuối'}
              </span>
              <span>→</span>
            </button>
          </div>
        )}
      </div>
    </section>
  );
};

export default CategoryHeroBanner;
