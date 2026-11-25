import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { getPlaylistBySlug, getAllPlaylists } from '../data/playlists';
import { getActiveSeason } from '../utils/seasonUtils';
import { useMusicPlayer } from '../hooks/useMusicPlayer';
import { MusicPlayerCard } from '../components/music/MusicPlayerCard';
import { MusicTrackList } from '../components/music/MusicTrackList';
import { WinterSnowAtmosphere } from '../components/music/WinterSnowAtmosphere';
import { playClickSound } from '../utils/soundEffects';
import { triggerThresholdTick } from '../utils/haptics';
import {
  HOME_TOPIC,
  useCategoryRegistry,
  setPendingBannerTransition,
} from '../utils/category-navigation';

const clearMusicWindowSelection = () => {
  try {
    if (typeof window !== 'undefined' && window.getSelection) {
      const sel = window.getSelection();
      if (sel && sel.rangeCount > 0) {
        sel.removeAllRanges();
      }
    }
  } catch (_) {}
};

const shouldSkipMusicHeroDrag = (target) => {
  if (!target || !(target instanceof Element)) return false;
  return Boolean(
    target.closest('button') ||
      target.closest('a') ||
      target.closest('input') ||
      target.closest('textarea') ||
      target.closest('select') ||
      target.closest('[data-no-swipe="true"]') ||
      target.closest('.no-swipe')
  );
};

/**
 * Trang Không Gian Nhạc & Playlist Đa Chủ Đề (Music Lounge)
 * Khởi đầu với chủ đề Mùa Đông (Winter Chill & Tĩnh Lặng)
 */
export const MusicPage = () => {
  const { themeId } = useParams();
  const navigate = useNavigate();
  const { carouselTopics } = useCategoryRegistry();

  const player = useMusicPlayer();
  const allThemes = player.allThemes || getAllPlaylists();
  const currentTheme = player.currentTheme || getPlaylistBySlug(themeId || 'winter');

  const [isZenMode, setIsZenMode] = useState(false);

  const heroSwipeRef = useRef(null);
  const rafIdRef = useRef(null);
  const springTimerRef = useRef(null);
  const commitTimerRef = useRef(null);
  const isCommittingRef = useRef(false);
  const dragStateRef = useRef({
    active: false,
    pointerId: null,
    startX: 0,
    startY: 0,
    isHorizontal: false,
    lastDeltaX: 0,
    hasTriggeredTick: false,
  });

  const musicIndex = carouselTopics.findIndex((t) => t.slug === '__music__');
  const prevTopic = musicIndex > 0 ? carouselTopics[musicIndex - 1] : null;
  const nextTopic = HOME_TOPIC;

  // Đồng bộ theme theo tham số URL nếu có thay đổi rõ ràng
  useEffect(() => {
    // 🛡️ CHỈ switchTheme khi người dùng chủ động chỉ định themeId trên URL VÀ khác theme đang phát
    // Tránh việc người dùng vào /music (themeId undefined) làm ngắt ngang bài hát đang phát dở (Song1E/Song2E, v.v.)
    if (themeId && themeId !== player.currentTheme?.slug) {
      player.switchTheme(themeId);
    } else if (!player.currentTheme) {
      // Nếu hoàn toàn chưa nạp bất kỳ theme nào trước đó thì mới khởi tạo winter mặc định
      player.switchTheme('winter');
    }
  }, [themeId]);

  // Cập nhật tiêu đề tab trình duyệt
  useEffect(() => {
    const originalTitle = document.title;
    document.title = `${currentTheme.name} Chill • Không Gian Nhạc Freedom`;
    return () => {
      document.title = originalTitle;
    };
  }, [currentTheme]);

  const clearDragTimers = useCallback(() => {
    if (rafIdRef.current) {
      cancelAnimationFrame(rafIdRef.current);
      rafIdRef.current = null;
    }
    if (springTimerRef.current) {
      clearTimeout(springTimerRef.current);
      springTimerRef.current = null;
    }
  }, []);

  const resetHeroDragVars = useCallback(() => {
    const el = heroSwipeRef.current;
    if (!el) return;
    el.style.setProperty('--drag-x', '0px');
    el.style.setProperty('--drag-progress', '0');
    el.dataset.dragDir = 'none';
    el.classList.remove('is-dragging', 'is-threshold-ready', 'is-committing-next', 'is-committing-prev');
  }, []);

  const getDynamicThreshold = useCallback(() => {
    const width = heroSwipeRef.current?.offsetWidth || 380;
    return Math.max(75, Math.min(115, Math.round(width * 0.22)));
  }, []);

  const applyDragToDom = useCallback((effectiveX, threshold) => {
    const el = heroSwipeRef.current;
    if (!el) return;
    const progress = Math.min(1, Math.abs(effectiveX) / threshold);
    el.style.setProperty('--drag-x', `${effectiveX.toFixed(1)}px`);
    el.style.setProperty('--drag-progress', progress.toFixed(3));
    el.dataset.dragDir = effectiveX < -4 ? 'left' : effectiveX > 4 ? 'right' : 'none';

    if (Math.abs(effectiveX) >= threshold) {
      if (!dragStateRef.current.hasTriggeredTick) {
        dragStateRef.current.hasTriggeredTick = true;
        triggerThresholdTick();
      }
      el.classList.add('is-threshold-ready');
    } else if (Math.abs(effectiveX) < threshold - 8) {
      dragStateRef.current.hasTriggeredTick = false;
      el.classList.remove('is-threshold-ready');
    }
  }, []);

  const springBackHero = useCallback(() => {
    clearDragTimers();
    const el = heroSwipeRef.current;
    if (!el) return;
    el.classList.remove('is-dragging', 'is-threshold-ready');
    el.classList.add('is-spring-back');
    el.style.setProperty('--drag-x', '0px');
    el.style.setProperty('--drag-progress', '0');
    el.dataset.dragDir = 'none';
    dragStateRef.current.lastDeltaX = 0;
    dragStateRef.current.hasTriggeredTick = false;

    springTimerRef.current = setTimeout(() => {
      heroSwipeRef.current?.classList.remove('is-spring-back');
      springTimerRef.current = null;
    }, 360);
  }, [clearDragTimers]);

  const commitCarouselNavigate = useCallback(
    (targetTopic, dir) => {
      if (!targetTopic || isCommittingRef.current) return;
      if (targetTopic.slug === '__music__') return;

      isCommittingRef.current = true;
      clearDragTimers();
      try {
        playClickSound();
      } catch (_) {}

      const el = heroSwipeRef.current;
      if (el) {
        el.classList.remove('is-dragging', 'is-spring-back', 'is-threshold-ready');
        el.classList.add(dir === 'next' ? 'is-committing-next' : 'is-committing-prev');
      }

      setPendingBannerTransition(dir, targetTopic.slug);
      if (commitTimerRef.current) clearTimeout(commitTimerRef.current);
      commitTimerRef.current = setTimeout(() => {
        commitTimerRef.current = null;
        isCommittingRef.current = false;
        navigate(targetTopic.path, {
          state: {
            transitionDirection: dir,
            targetSlug: targetTopic.slug,
            fromSlug: '__music__',
          },
        });
      }, 145);
    },
    [clearDragTimers, navigate]
  );

  const finishHeroDrag = useCallback(
    (e) => {
      const state = dragStateRef.current;
      if (!state.active) return;
      if (e?.pointerId !== undefined && state.pointerId !== null && state.pointerId !== e.pointerId) {
        return;
      }

      try {
        if (e?.pointerId !== undefined && heroSwipeRef.current?.hasPointerCapture?.(e.pointerId)) {
          heroSwipeRef.current.releasePointerCapture(e.pointerId);
        }
      } catch (_) {}

      const wasHorizontal = state.isHorizontal;
      const effectiveX = state.lastDeltaX;

      state.active = false;
      state.pointerId = null;
      state.isHorizontal = false;

      if (!wasHorizontal) {
        resetHeroDragVars();
        return;
      }

      const threshold = getDynamicThreshold();
      if (effectiveX <= -threshold && nextTopic) {
        commitCarouselNavigate(nextTopic, 'next');
      } else if (effectiveX >= threshold && prevTopic) {
        commitCarouselNavigate(prevTopic, 'prev');
      } else {
        springBackHero();
      }
    },
    [commitCarouselNavigate, getDynamicThreshold, nextTopic, prevTopic, resetHeroDragVars, springBackHero]
  );

  const handleHeroPointerDown = useCallback(
    (e) => {
      if (isZenMode || isCommittingRef.current) return;
      if (e.pointerType === 'mouse' && e.button !== 0) return;
      if (shouldSkipMusicHeroDrag(e.target)) return;

      clearMusicWindowSelection();
      clearDragTimers();
      heroSwipeRef.current?.classList.remove('is-spring-back');

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
    [clearDragTimers, isZenMode]
  );

  const handleHeroPointerMove = useCallback(
    (e) => {
      const state = dragStateRef.current;
      if (!state.active || state.pointerId !== e.pointerId || isCommittingRef.current) return;

      const deltaX = e.clientX - state.startX;
      const deltaY = e.clientY - state.startY;

      if (!state.isHorizontal) {
        if (Math.abs(deltaY) > Math.abs(deltaX) && Math.abs(deltaY) > 8) {
          state.active = false;
          state.pointerId = null;
          return;
        }
        if (Math.abs(deltaX) > 8) {
          state.isHorizontal = true;
          clearMusicWindowSelection();
          heroSwipeRef.current?.classList.add('is-dragging');
          try {
            heroSwipeRef.current?.setPointerCapture?.(e.pointerId);
          } catch (_) {}
        } else {
          return;
        }
      }

      state.lastDeltaX = deltaX;
      if (!rafIdRef.current) {
        rafIdRef.current = requestAnimationFrame(() => {
          rafIdRef.current = null;
          if (!dragStateRef.current.active) return;
          applyDragToDom(dragStateRef.current.lastDeltaX, getDynamicThreshold());
        });
      }
    },
    [applyDragToDom, getDynamicThreshold]
  );

  useEffect(() => {
    const handleSafetyReset = () => {
      if (dragStateRef.current.active) {
        dragStateRef.current.active = false;
        dragStateRef.current.pointerId = null;
        dragStateRef.current.isHorizontal = false;
        springBackHero();
      }
    };

    window.addEventListener('pointerup', finishHeroDrag);
    window.addEventListener('pointercancel', finishHeroDrag);
    window.addEventListener('blur', handleSafetyReset);
    window.addEventListener('orientationchange', handleSafetyReset);

    return () => {
      window.removeEventListener('pointerup', finishHeroDrag);
      window.removeEventListener('pointercancel', finishHeroDrag);
      window.removeEventListener('blur', handleSafetyReset);
      window.removeEventListener('orientationchange', handleSafetyReset);
      clearDragTimers();
      if (commitTimerRef.current) clearTimeout(commitTimerRef.current);
    };
  }, [clearDragTimers, finishHeroDrag, springBackHero]);

  // Chuyển chủ đề qua URL
  const handleSelectTheme = (slug) => {
    navigate(`/music/${slug}`);
  };

  const handleToggleZenMode = () => {
    setIsZenMode((prev) => !prev);
  };

  return (
    <div className={`music-page-wrapper ${isZenMode ? 'zen-mode-active' : ''}`}>
      {/* Hiệu ứng thời tiết theo chủ đề (Chỉ render cục bộ nếu layout toàn cục chưa kích hoạt mùa đông) */}
      {currentTheme.atmosphere?.type === 'snow' && getActiveSeason()?.id !== 'winter' && (
        <WinterSnowAtmosphere
          density={currentTheme.atmosphere.density || 35}
          speed={currentTheme.atmosphere.speed || 0.6}
        />
      )}

      <div className="music-page-container">
        {/* Header trang với hỗ trợ kéo/vuốt 60fps nối liền mạch Small Wins <-> Góc Nhạc <-> Trang Chủ */}
        {!isZenMode && (
          <section
            ref={heroSwipeRef}
            data-drag-dir="none"
            className="music-hero-swipe-zone"
            onPointerDown={handleHeroPointerDown}
            onPointerMove={handleHeroPointerMove}
            onPointerUp={finishHeroDrag}
            onPointerCancel={finishHeroDrag}
            onDragStart={(e) => e.preventDefault()}
          >
            {/* Dual-Card Peek: Kéo phải về Small Wins */}
            <div className="category-peek-card peek-left" aria-hidden="true">
              <div className="peek-card-arrow">←</div>
              <div className="peek-card-meta">
                <span className="peek-card-kicker">
                  <span className="kicker-pull">Chủ đề trước</span>
                  <span className="kicker-ready">Thả để chuyển!</span>
                </span>
                <div className="peek-card-title">
                  <span>{prevTopic ? prevTopic.icon : '✨'}</span>
                  <span>{prevTopic ? (prevTopic.shortLabel || prevTopic.name) : 'Small Wins'}</span>
                </div>
                <div className="peek-progress-track">
                  <div className="peek-progress-fill" />
                </div>
              </div>
            </div>

            {/* Dual-Card Peek: Kéo trái vòng về Trang Chủ */}
            <div className="category-peek-card peek-right" aria-hidden="true">
              <div className="peek-card-meta">
                <span className="peek-card-kicker">
                  <span className="kicker-pull">Vòng lại</span>
                  <span className="kicker-ready">Thả để chuyển!</span>
                </span>
                <div className="peek-card-title">
                  <span>{nextTopic.icon}</span>
                  <span>{nextTopic.shortLabel || nextTopic.name}</span>
                </div>
                <div className="peek-progress-track">
                  <div className="peek-progress-fill" />
                </div>
              </div>
              <div className="peek-card-arrow">→</div>
            </div>

            <div className="music-hero-swipe-inner">
              <div className="music-page-header">
                <div className="music-title-group">
                  <span className="music-page-tagline">
                    <i className="fa-solid fa-headphones"></i> Không Gian Nhạc &amp; Chữa Lành
                  </span>
                  <h1 className="music-page-title">
                    {currentTheme.name}: {currentTheme.title}
                  </h1>
                  <p className="music-page-desc">
                    {currentTheme.subtitle} • Giai điệu trầm ấm xoa dịu những mệt mỏi
                  </p>
                </div>

                <div className="music-header-actions">
                  <Link
                    to="/"
                    state={{ transitionDirection: 'prev', targetSlug: '', forceScrollTop: true }}
                    onClick={() => setPendingBannerTransition('prev', '')}
                    className="music-back-home-btn"
                    title="Quay về trang chủ"
                  >
                    <i className="fa-solid fa-arrow-left"></i>
                    <span>Trang Chủ</span>
                  </Link>
                </div>
              </div>

              {/* Thanh chỉ báo không gian nối liền mạch Small Wins <-> Góc Nhạc <-> Trang Chủ */}
              {carouselTopics.length > 1 && (
                <div className="music-spatial-rail-wrap">
                  <div className="category-spatial-rail" aria-label="Điều hướng giữa các chủ đề và Góc Nhạc">
                    <button
                      type="button"
                      className="spatial-rail-step"
                      disabled={!prevTopic}
                      onClick={() => prevTopic && commitCarouselNavigate(prevTopic, 'prev')}
                      title={prevTopic ? `Về: ${prevTopic.name}` : ''}
                    >
                      <span>←</span>
                      <span className="spatial-step-label">
                        {prevTopic ? `${prevTopic.icon} ${prevTopic.shortLabel || prevTopic.name}` : 'Trước'}
                      </span>
                    </button>

                    <div className="spatial-rail-dots" role="tablist" aria-label="Danh sách chủ đề">
                      {carouselTopics.map((topic, idx) => {
                        const isActive = topic.slug === '__music__';
                        const dir = idx < musicIndex ? 'prev' : 'next';
                        return (
                          <button
                            key={topic.slug || '__home__'}
                            type="button"
                            role="tab"
                            aria-selected={isActive}
                            className={`spatial-dot-btn ${isActive ? 'active' : ''}`}
                            onClick={() => !isActive && commitCarouselNavigate(topic, dir)}
                            title={topic.name}
                            aria-label={topic.name}
                          />
                        );
                      })}
                    </div>

                    <button
                      type="button"
                      className="spatial-rail-step"
                      onClick={() => commitCarouselNavigate(nextTopic, 'next')}
                      title={`Về: ${nextTopic.name}`}
                    >
                      <span className="spatial-step-label">
                        {nextTopic.shortLabel || nextTopic.name} {nextTopic.icon}
                      </span>
                      <span>→</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </section>
        )}

        {/* Nội dung chính 2 cột */}
        <div className="music-content-grid">
          {/* Cột trái: Trình phát đĩa than, seekbar & volume */}
          <MusicPlayerCard
            theme={currentTheme}
            player={player}
            isZenMode={isZenMode}
            onToggleZenMode={handleToggleZenMode}
          />

          {/* Cột phải: Danh sách bài hát, tabs chủ đề & quote */}
          <MusicTrackList
            theme={currentTheme}
            allThemes={allThemes}
            currentTrackIndex={player.currentTrackIndex}
            isPlaying={player.isPlaying}
            onSelectTrack={player.playTrack}
            onSelectTheme={handleSelectTheme}
          />
        </div>
      </div>
    </div>
  );
};
