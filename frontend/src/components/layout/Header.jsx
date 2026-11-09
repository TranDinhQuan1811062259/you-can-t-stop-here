import React, { useState, useEffect, useRef } from 'react';
import { Link, NavLink, useNavigate, useSearchParams, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { AuthModal } from '../auth/AuthModal';
import { CreatePostModal } from '../blog/CreatePostModal';
import { EditProfileModal } from '../auth/EditProfileModal';
import { AdminModerationModal } from '../admin/AdminModerationModal';
import { FestiveEventManagerModal } from '../admin/FestiveEventManagerModal';
import { FestiveShowcaseModal } from '../common/FestiveShowcaseModal';
import { StressReliefModal } from '../wellness/StressReliefModal';
import { TimeCapsuleModal } from '../wellness/TimeCapsuleModal';
import { LateNightRadioModal } from '../wellness/LateNightRadioModal';
import { GratitudeJarModal } from '../wellness/GratitudeJarModal';
import { StickyNoteWallModal } from '../wellness/StickyNoteWallModal';
import { EmergencyCalmModal } from '../wellness/EmergencyCalmModal';
import { CozyWorkCafeModal } from '../wellness/CozyWorkCafeModal';
import { MoodPixelTrackerModal } from '../wellness/MoodPixelTrackerModal';
import { postService, getCachedPosts, removeVietnameseTones } from '../../services/postService';
import { eventService } from '../../services/eventService';
import { isSoundEnabled, toggleSound, playClickSound, playFestiveEventSound } from '../../utils/soundEffects';
import { getActiveSeason, setActiveSeason, SEASONS } from '../../utils/seasonUtils';
import { formatDate } from '../../utils/formatDate';
import { IdleWeatherText } from '../common/IdleWeatherText';
import {
  startWeatherAmbient,
  stopWeatherAmbient,
  startEventAmbient,
  stopEventAmbient,
  getAmbientState,
  setMelodicSeason,
  MELODIC_SEASONS,
} from '../../utils/ambientSoundEngine';

export const Header = () => {
  const {
    user,
    isAuthenticated,
    logout,
    openLoginModal,
    openRegisterModal,
    isProfileModalOpen,
    openProfileModal,
    closeProfileModal,
  } = useAuth();

  const [isNavOpen, setIsNavOpen] = useState(false);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [soundOn, setSoundOn] = useState(() => isSoundEnabled());
  const [activeSeason, setLocalSeason] = useState(() => getActiveSeason());
  const [isSeasonOpen, setIsSeasonOpen] = useState(false);
  const [isModerationOpen, setIsModerationOpen] = useState(false);
  const [flaggedCount, setFlaggedCount] = useState(0);
  const [isEventManagerOpen, setIsEventManagerOpen] = useState(false);
  const [isShowcaseModalOpen, setIsShowcaseModalOpen] = useState(false);
  const [activeFestiveEvent, setActiveFestiveEvent] = useState(null);
  const [isWellnessOpen, setIsWellnessOpen] = useState(false);
  const [isTimeCapsuleOpen, setIsTimeCapsuleOpen] = useState(false);
  const [isRadioOpen, setIsRadioOpen] = useState(false);
  const [isGratitudeJarOpen, setIsGratitudeJarOpen] = useState(false);
  const [isStickyWallOpen, setIsStickyWallOpen] = useState(false);
  const [isEmergencyCalmOpen, setIsEmergencyCalmOpen] = useState(false);
  const [isCozyCafeOpen, setIsCozyCafeOpen] = useState(false);
  const [isMoodPixelOpen, setIsMoodPixelOpen] = useState(false);
  const [isWellnessDropdownOpen, setIsWellnessDropdownOpen] = useState(false);
  const wellnessDropdownRef = useRef(null);

  // States cho Âm Thanh Môi Trường Duy Trì (Ambient Soundscape Engine)
  const [ambientState, setAmbientState] = useState(() => getAmbientState());
  const [isAmbientMenuOpen, setIsAmbientMenuOpen] = useState(false);
  const ambientMenuRef = useRef(null);

  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const [searchTerm, setSearchTerm] = useState(() => searchParams.get('q') || '');
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [liveResults, setLiveResults] = useState([]);
  const [isSearchingLive, setIsSearchingLive] = useState(false);
  const searchContainerRef = useRef(null);

  useEffect(() => {
    setSearchTerm(searchParams.get('q') || '');
  }, [searchParams]);

  // Gợi ý tìm kiếm trực tiếp ngay khi gõ từ khóa (Live Search Suggestions)
  useEffect(() => {
    const trimmed = searchTerm.trim();
    if (trimmed.length < 2) {
      setLiveResults([]);
      return;
    }

    const timer = setTimeout(() => {
      setIsSearchingLive(true);
      postService
        .getPosts({ q: trimmed, limit: 5 })
        .then((res) => {
          const raw = res.data?.posts || res.data || [];
          setLiveResults(Array.isArray(raw) ? raw.slice(0, 5) : []);
        })
        .catch(() => {
          try {
            const cached = getCachedPosts();
            const cleanQ = removeVietnameseTones(trimmed.toLowerCase());
            const matched = cached.filter((p) => {
              const title = (p.title || '').toLowerCase();
              const summary = (p.summary || '').toLowerCase();
              return (
                title.includes(trimmed.toLowerCase()) ||
                summary.includes(trimmed.toLowerCase()) ||
                removeVietnameseTones(title).includes(cleanQ) ||
                removeVietnameseTones(summary).includes(cleanQ)
              );
            });
            setLiveResults(matched.slice(0, 5));
          } catch (_) {
            setLiveResults([]);
          }
        })
        .finally(() => setIsSearchingLive(false));
    }, 200);

    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Đóng hộp gợi ý tìm kiếm khi click chuột ra ngoài
  useEffect(() => {
    const handleOutsideClick = (e) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(e.target)) {
        setIsSearchFocused(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  const handleSearchSubmit = (e) => {
    e?.preventDefault();
    playClickSound();
    setIsSearchFocused(false);
    if (searchTerm.trim()) {
      navigate(`/?q=${encodeURIComponent(searchTerm.trim())}`);
      setTimeout(() => {
        const postsEl = document.getElementById('posts-section');
        if (postsEl) {
          postsEl.scrollIntoView({ behavior: 'smooth' });
        }
      }, 150);
    } else {
      navigate('/');
    }
  };

  const fetchFestiveEvent = () => {
    eventService
      .getActiveEvent()
      .then((res) => setActiveFestiveEvent(res?.data || null))
      .catch(() => setActiveFestiveEvent(null));
  };

  // Quét số lượng bài viết bị gắn cờ nhạy cảm để báo cho Admin
  const checkFlaggedPosts = () => {
    if (user?.role === 'admin') {
      postService
        .getPosts({ limit: 50 })
        .then((res) => {
          const list = res.data?.posts || res.data || [];
          const count = list.filter((p) => p.isFlagged === true || p.moderationStatus === 'flagged').length;
          setFlaggedCount(count);
        })
        .catch(() => {});
    }
  };

  useEffect(() => {
    checkFlaggedPosts();
    fetchFestiveEvent();

    const handleAuthChange = () => {
      checkFlaggedPosts();
      fetchFestiveEvent();
    };

    window.addEventListener('post_updated', checkFlaggedPosts);
    window.addEventListener('profile_updated', handleAuthChange);
    window.addEventListener('freedom_auth_changed', handleAuthChange);
    window.addEventListener('freedom_festive_event_changed', fetchFestiveEvent);

    const handleOpenMod = () => {
      if (user?.role === 'admin') {
        setIsModerationOpen(true);
      }
    };
    const handleOpenShowcase = (e) => {
      if (e?.detail) setActiveFestiveEvent(e.detail);
      setIsShowcaseModalOpen(true);
    };
    const handleOpenWellness = () => {
      setIsWellnessOpen(true);
    };
    const handleOpenTimeCapsule = () => {
      setIsTimeCapsuleOpen(true);
    };
    const handleOpenRadio = () => {
      setIsRadioOpen(true);
    };
    const handleOpenGratitudeJar = () => {
      setIsGratitudeJarOpen(true);
    };
    const handleOpenStickyWall = () => {
      setIsStickyWallOpen(true);
    };
    const handleOpenEmergencyCalm = () => {
      setIsEmergencyCalmOpen(true);
    };
    const handleOpenCozyCafe = () => {
      setIsCozyCafeOpen(true);
    };
    const handleOpenMoodPixel = () => {
      setIsMoodPixelOpen(true);
    };

    window.addEventListener('freedom_open_moderation', handleOpenMod);
    window.addEventListener('freedom_open_festive_showcase', handleOpenShowcase);
    window.addEventListener('freedom_open_wellness', handleOpenWellness);
    window.addEventListener('freedom_open_time_capsule', handleOpenTimeCapsule);
    window.addEventListener('freedom_open_radio', handleOpenRadio);
    window.addEventListener('freedom_open_gratitude_jar', handleOpenGratitudeJar);
    window.addEventListener('freedom_open_sticky_wall', handleOpenStickyWall);
    window.addEventListener('freedom_open_sos_calm', handleOpenEmergencyCalm);
    window.addEventListener('freedom_open_cozy_cafe', handleOpenCozyCafe);
    window.addEventListener('freedom_open_mood_pixel', handleOpenMoodPixel);

    return () => {
      window.removeEventListener('post_updated', checkFlaggedPosts);
      window.removeEventListener('profile_updated', handleAuthChange);
      window.removeEventListener('freedom_auth_changed', handleAuthChange);
      window.removeEventListener('freedom_festive_event_changed', fetchFestiveEvent);
      window.removeEventListener('freedom_open_moderation', handleOpenMod);
      window.removeEventListener('freedom_open_festive_showcase', handleOpenShowcase);
      window.removeEventListener('freedom_open_wellness', handleOpenWellness);
      window.removeEventListener('freedom_open_time_capsule', handleOpenTimeCapsule);
      window.removeEventListener('freedom_open_radio', handleOpenRadio);
      window.removeEventListener('freedom_open_gratitude_jar', handleOpenGratitudeJar);
      window.removeEventListener('freedom_open_sticky_wall', handleOpenStickyWall);
      window.removeEventListener('freedom_open_sos_calm', handleOpenEmergencyCalm);
      window.removeEventListener('freedom_open_cozy_cafe', handleOpenCozyCafe);
      window.removeEventListener('freedom_open_mood_pixel', handleOpenMoodPixel);
    };
  }, [user]);

  const seasonRef = useRef(null);

  // Lắng nghe toggle sound
  useEffect(() => {
    const handleSoundToggle = (e) => {
      setSoundOn(e.detail?.enabled ?? isSoundEnabled());
    };
    window.addEventListener('freedom_sound_toggled', handleSoundToggle);
    return () => window.removeEventListener('freedom_sound_toggled', handleSoundToggle);
  }, []);

  // Lắng nghe đổi mùa thời tiết
  useEffect(() => {
    const handleSeasonChange = (e) => {
      setLocalSeason(e.detail || getActiveSeason());
    };
    window.addEventListener('freedom_season_changed', handleSeasonChange);
    return () => window.removeEventListener('freedom_season_changed', handleSeasonChange);
  }, []);

  // Lắng nghe thay đổi âm thanh môi trường duy trì
  useEffect(() => {
    const handleAmbientChange = (e) => {
      setAmbientState(e.detail || getAmbientState());
    };
    window.addEventListener('freedom_ambient_sound_changed', handleAmbientChange);
    return () => window.removeEventListener('freedom_ambient_sound_changed', handleAmbientChange);
  }, []);

  // Đóng dropdown mùa, âm thanh môi trường & trạm chữa lành khi click ra ngoài
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (seasonRef.current && !seasonRef.current.contains(e.target)) {
        setIsSeasonOpen(false);
      }
      if (ambientMenuRef.current && !ambientMenuRef.current.contains(e.target)) {
        setIsAmbientMenuOpen(false);
      }
      if (wellnessDropdownRef.current && !wellnessDropdownRef.current.contains(e.target)) {
        setIsWellnessDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Tự động đóng dropdown trạm chữa lành khi chuyển trang
  useEffect(() => {
    setIsWellnessDropdownOpen(false);
  }, [location?.pathname]);

  const toggleNav = () => setIsNavOpen((prev) => !prev);
  const closeNav = () => setIsNavOpen(false);

  const handlePostCreated = (newPost) => {
    navigate(`/post/${newPost.slug}`);
    window.location.reload();
  };

  const handleSeasonSelect = (seasonId) => {
    const nextSeason = setActiveSeason(seasonId);
    setLocalSeason(nextSeason);
    setIsSeasonOpen(false);
    if (ambientState.isWeatherSoundActive) {
      startWeatherAmbient(nextSeason.id);
    }
    // Tự động đồng bộ bài ngân nga theo mùa mới
    setMelodicSeason(nextSeason.id);
  };

  const handleToggleWeatherAmbient = () => {
    playClickSound();
    if (ambientState.isWeatherSoundActive) {
      stopWeatherAmbient();
    } else {
      startWeatherAmbient(activeSeason.id);
    }
  };

  const handleToggleEventAmbient = () => {
    playClickSound();
    if (ambientState.isEventSoundActive) {
      stopEventAmbient();
    } else {
      const targetMelody = ambientState.currentMelodicSeasonId || activeSeason?.id || 'winter';
      startEventAmbient(targetMelody);
    }
  };

  const handleSelectMelodicSeason = (seasonId) => {
    playClickSound();
    setMelodicSeason(seasonId);
    if (!ambientState.isEventSoundActive) {
      startEventAmbient(seasonId);
    }
  };

  const handleSelectFestiveEventMelody = () => {
    playClickSound();
    if (activeFestiveEvent) {
      startEventAmbient(activeFestiveEvent.id || 'festive');
    }
  };

  const isSpecialEventMelodyPlaying =
    ambientState.isEventSoundActive &&
    !['spring', 'summer', 'autumn', 'winter'].includes(ambientState.currentEventId);

  const activeMelodyKey = ambientState.currentMelodicSeasonId || activeSeason?.id || 'winter';
  const currentMelodyMeta = isSpecialEventMelodyPlaying && activeFestiveEvent
    ? {
        id: activeFestiveEvent.id,
        name: activeFestiveEvent.name,
        title: activeFestiveEvent.shortName || activeFestiveEvent.name,
        desc: activeFestiveEvent.bannerDesc || 'Bản hòa tấu sự kiện lễ hội tưng bừng',
        icon: activeFestiveEvent.icon || '🎊',
      }
    : (MELODIC_SEASONS[activeMelodyKey] || MELODIC_SEASONS.winter);

  return (
    <>
      <header className={`site-header season-accent-${activeSeason.id}`}>
        <div className="container header-container">
          {/* Logo & Brand Name + Seasonal Weather Pill */}
          <div className="header-brand-wrap">
            <Link
              to="/"
              className={`logo-link seasonal-logo-wrap season-${activeSeason.id}`}
              onClick={closeNav}
              title={`YOU CAN'T STOP HERE - ${activeSeason.name}: ${activeSeason.quote}`}
            >
              <span className="healing-icon-pill healing-icon-sage" style={{ width: '34px', height: '34px' }}>
                <i className="fa-solid fa-seedling"></i>
              </span>
              <span className={`logo-text seasonal-logo-text season-${activeSeason.id}`}>
                <IdleWeatherText>YOU CAN'T STOP HERE</IdleWeatherText>
              </span>
              <span className={`seasonal-logo-sparkle season-${activeSeason.id}`} aria-hidden="true">
                {activeSeason.titleAccent}
              </span>
            </Link>

            {/* Weather / Season Selector Pill (Thời tiết 4 mùa tự nhiên theo lịch) */}
            <div className="header-season-wrap" ref={seasonRef}>
              <button
                type="button"
                className={`header-season-pill season-${activeSeason.id} ${activeSeason.isCustom ? 'is-custom' : ''}`}
                onClick={() => setIsSeasonOpen((prev) => !prev)}
                title={`Thời tiết hiện tại: ${activeSeason.name} (${activeSeason.weatherDesc}). Bấm để chọn mùa bạn thích.`}
              >
                <span className="season-icon">{activeSeason.icon}</span>
                <span className="season-name">{activeSeason.shortName}</span>
                <span className="season-chevron">
                  <i className={`fa-solid fa-chevron-${isSeasonOpen ? 'up' : 'down'}`} style={{ fontSize: '0.68rem', marginLeft: '2px' }}></i>
                </span>
              </button>

              {isSeasonOpen && (
                <div className="season-popover-dropdown">
                  <div className="season-popover-header">
                    <span className="season-popover-title">🌤️ Giao Diện Thời Tiết 4 Mùa</span>
                    <span className="season-popover-desc">
                      Tự động theo lịch dương hoặc chọn mùa bạn thích:
                    </span>
                  </div>

                  <div className="season-options-group">
                    <button
                      type="button"
                      className={`season-option-row ${!activeSeason.isCustom ? 'selected' : ''}`}
                      onClick={() => handleSeasonSelect('auto')}
                    >
                      <span className="opt-left">
                        <span className="opt-icon">🔄</span>
                        <span className="opt-label">Tự động theo lịch (Mùa Đông ❄️)</span>
                      </span>
                      {!activeSeason.isCustom && <span className="opt-check">✓</span>}
                    </button>

                    {Object.values(SEASONS).map((s) => (
                      <button
                        key={s.id}
                        type="button"
                        className={`season-option-row ${activeSeason.isCustom && activeSeason.id === s.id ? 'selected' : ''}`}
                        onClick={() => handleSeasonSelect(s.id)}
                      >
                        <span className="opt-left">
                          <span className="opt-icon">{s.icon}</span>
                          <span className="opt-label">
                            <strong>{s.name}</strong> • <small>{s.weatherDesc.split('•')[0].trim()}</small>
                          </span>
                        </span>
                        {activeSeason.isCustom && activeSeason.id === s.id && <span className="opt-check">✓</span>}
                      </button>
                    ))}
                  </div>

                  <div className="season-popover-footer">
                    💡 Hiệu ứng hoa đào, tuyết rơi hay lá vàng sẽ tự động bay nhẹ nhàng theo mùa bạn chọn!
                  </div>
                </div>
              )}
            </div>

            {/* Festive Event Pill (Sự kiện lễ hội đặc biệt đang diễn ra - Rút gọn thông minh chống tràn Header) */}
            {activeFestiveEvent && (
              <div
                className="header-festive-event-pill"
                onClick={() => {
                  playClickSound();
                  playFestiveEventSound(activeFestiveEvent);
                  setIsShowcaseModalOpen(true);
                }}
                title={`${activeFestiveEvent.name} • ${activeFestiveEvent.bannerDesc || ''}. Bấm để xem không gian sự kiện đặc biệt!`}
              >
                <span className="festive-pill-icon">{activeFestiveEvent.icon || activeFestiveEvent.themeIcon || '🎊'}</span>
                <span className="festive-pill-name">
                  {activeFestiveEvent.shortName || (activeFestiveEvent.name.includes(':') ? activeFestiveEvent.name.split(':')[0].trim() : activeFestiveEvent.name)}
                </span>
                {user?.role === 'admin' && (
                  <span
                    className="festive-pill-badge"
                    onClick={(e) => {
                      e.stopPropagation();
                      setIsEventManagerOpen(true);
                    }}
                    title="Cài đặt lịch sự kiện (Admin)"
                  >
                    ⚙️
                  </span>
                )}
              </div>
            )}

            {/* Cụm Điều Khiển Âm Thanh Môi Trường Duy Trì (Ambient Soundscape Engine) */}
            <div className="header-ambient-sound-wrap" ref={ambientMenuRef} style={{ position: 'relative' }}>
              <button
                type="button"
                className={`header-ambient-btn ${ambientState.isWeatherSoundActive || ambientState.isEventSoundActive ? 'is-active' : ''}`}
                onClick={() => {
                  playClickSound();
                  setIsAmbientMenuOpen((prev) => !prev);
                }}
                style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '50%',
                  background: ambientState.isWeatherSoundActive || ambientState.isEventSoundActive
                    ? 'linear-gradient(135deg, #0d9488, #059669)'
                    : 'rgba(255, 255, 255, 0.08)',
                  border: ambientState.isWeatherSoundActive || ambientState.isEventSoundActive
                    ? '1.5px solid #2dd4bf'
                    : '1px solid rgba(255, 255, 255, 0.2)',
                  color: '#ffffff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  fontSize: '0.88rem',
                  position: 'relative',
                  transition: 'all 0.2s ease',
                  boxShadow: ambientState.isWeatherSoundActive || ambientState.isEventSoundActive
                    ? '0 2px 10px rgba(13, 148, 136, 0.4)'
                    : 'none',
                }}
                title={
                  ambientState.isCombined
                    ? 'Đang phát Hòa âm Kết hợp (Thời tiết 4 mùa + Sự kiện lễ hội)'
                    : ambientState.isWeatherSoundActive
                    ? `Đang phát Âm thanh Thời tiết ${activeSeason.name}`
                    : ambientState.isEventSoundActive
                    ? 'Đang phát Âm thanh Sự kiện Lễ hội'
                    : 'Cài đặt âm thanh môi trường duy trì (Gió mùa đông, sóng biển, tiếng chim hót...)'
                }
                aria-label="Âm thanh môi trường duy trì"
              >
                <span>
                  {ambientState.isCombined ? '🎶' : ambientState.isWeatherSoundActive ? activeSeason.icon : ambientState.isEventSoundActive ? '🎊' : '🔈'}
                </span>
                {(ambientState.isWeatherSoundActive || ambientState.isEventSoundActive) && (
                  <span
                    style={{
                      position: 'absolute',
                      top: '-1px',
                      right: '-1px',
                      width: '8px',
                      height: '8px',
                      borderRadius: '50%',
                      background: '#4ade80',
                      border: '1.5px solid #ffffff',
                      animation: 'pulseDot 1.2s infinite alternate',
                    }}
                  />
                )}
              </button>

              {/* Popover Tùy Chọn Âm Thanh Môi Trường Duy Trì */}
              {isAmbientMenuOpen && (
                <div className="header-ambient-dropdown">
                  <div className="ambient-dropdown-header">
                    <div className="ambient-dropdown-title-wrap">
                      <span className="ambient-title-icon">🎧</span>
                      <strong className="ambient-title-text">
                        Âm Thanh Môi Trường
                      </strong>
                    </div>
                    {ambientState.isCombined && (
                      <span className="ambient-combined-badge">
                        Hòa Âm Kép
                      </span>
                    )}
                  </div>

                  {/* Mục 1: Âm thanh thời tiết 4 mùa */}
                  <div className={`ambient-card ambient-card-weather ${ambientState.isWeatherSoundActive ? 'is-active' : ''}`}>
                    <div className="ambient-card-info">
                      <div className="ambient-card-title-row">
                        <span>{activeSeason.icon}</span>
                        <strong className="ambient-card-title">
                          {activeSeason.name}
                        </strong>
                      </div>
                      <p className="ambient-card-desc">
                        {activeSeason.id === 'winter'
                          ? 'Gió bấc rít êm & lò sưởi ấm'
                          : activeSeason.id === 'summer'
                          ? 'Sóng biển rì rào & ve sầu'
                          : activeSeason.id === 'spring'
                          ? 'Gió xuân & chim hót líu lo'
                          : 'Lá xào xạc & mưa phùn'}
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={handleToggleWeatherAmbient}
                      className={`ambient-toggle-btn ${ambientState.isWeatherSoundActive ? 'weather-btn-active' : 'is-inactive'}`}
                      title={ambientState.isWeatherSoundActive ? 'Bấm để tắt âm thanh thời tiết' : 'Bấm để bật âm thanh thời tiết'}
                    >
                      {ambientState.isWeatherSoundActive ? 'ĐANG BẬT' : 'BẬT'}
                    </button>
                  </div>

                  {/* Mục 2: Âm hưởng ngân nga 4 Mùa & Lễ hội (Mỗi mùa 1 bài riêng biệt) */}
                  <div className={`ambient-card ambient-card-event ambient-card-melody ${ambientState.isEventSoundActive ? 'is-active' : ''}`}>
                    <div className="ambient-card-melody-top">
                      <div className="ambient-card-info">
                        <div className="ambient-card-title-row">
                          <span>{currentMelodyMeta.icon}</span>
                          <strong className="ambient-card-title" title={currentMelodyMeta.title}>
                            {currentMelodyMeta.title}
                          </strong>
                        </div>
                        <p className="ambient-card-desc" title={currentMelodyMeta.desc}>
                          {currentMelodyMeta.desc}
                        </p>
                      </div>

                      <button
                        type="button"
                        onClick={handleToggleEventAmbient}
                        className={`ambient-toggle-btn ${ambientState.isEventSoundActive ? 'event-btn-active' : 'is-inactive'}`}
                        title={ambientState.isEventSoundActive ? 'Bấm để tắt âm hưởng' : 'Bấm để bật âm hưởng'}
                      >
                        {ambientState.isEventSoundActive ? 'ĐANG BẬT' : 'BẬT'}
                      </button>
                    </div>

                    {/* Hàng nút chuyển bài theo Mùa (4 Mùa + Sự kiện nếu có) */}
                    <div className={`ambient-melody-row ${activeFestiveEvent ? 'has-festive' : ''}`}>
                      {Object.values(MELODIC_SEASONS).map((mSeason) => {
                        const isSelected = !isSpecialEventMelodyPlaying && activeMelodyKey === mSeason.id;
                        return (
                          <button
                            key={mSeason.id}
                            type="button"
                            className={`ambient-melody-pill ${isSelected ? 'is-active' : ''}`}
                            onClick={() => handleSelectMelodicSeason(mSeason.id)}
                            title={`Nghe bài: ${mSeason.title} (${mSeason.name})`}
                          >
                            <span>{mSeason.icon}</span>
                            <span>{mSeason.name.replace('Mùa ', '')}</span>
                          </button>
                        );
                      })}

                      {activeFestiveEvent && (
                        <button
                          type="button"
                          className={`ambient-melody-pill ${isSpecialEventMelodyPlaying ? 'is-active' : ''}`}
                          onClick={handleSelectFestiveEventMelody}
                          title={`Giai điệu sự kiện: ${activeFestiveEvent.name}`}
                        >
                          <span>{activeFestiveEvent.icon || '🎊'}</span>
                          <span>Sự kiện</span>
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Ghi chú Audio Ducking */}
                  <div className="ambient-ducking-tip">
                    💡 <em>Khi bạn mở nhạc cá nhân, âm thanh môi trường sẽ tự động chìm nhẹ để nhường chỗ cho bài hát!</em>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Cụm Giữa Hàng 1: Thanh Tìm Kiếm Thông Minh & Khẩu Hiệu (Lấp đầy khoảng trống trung tâm) */}
          <div className="header-top-center">
            <div ref={searchContainerRef} className="header-search-wrapper">
              <form className="header-search-form" onSubmit={handleSearchSubmit}>
                {/* Nút Tìm Kiếm (Kính lúp tương tác có thể click trực tiếp) */}
                <button
                  type="submit"
                  className="header-search-icon-btn"
                  title="Bấm để tìm kiếm tâm sự"
                  aria-label="Tìm kiếm"
                >
                  <i className="fa-solid fa-magnifying-glass"></i>
                </button>

                <input
                  type="text"
                  placeholder="Tìm kiếm tâm sự, lời khuyên, bài viết..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  onFocus={() => setIsSearchFocused(true)}
                  onKeyDown={(e) => {
                    if (e.key === 'Escape') setIsSearchFocused(false);
                  }}
                  className="header-search-input"
                />

                {searchTerm && (
                  <button
                    type="button"
                    className="header-search-clear"
                    onClick={() => {
                      setSearchTerm('');
                      navigate('/');
                    }}
                    title="Xóa từ khóa"
                    aria-label="Xóa từ khóa"
                  >
                    <i className="fa-solid fa-xmark"></i>
                  </button>
                )}

                {/* Nút Tìm Kiếm Nổi Bật (Primary Action Search Button) */}
                <button
                  type="submit"
                  className={`header-search-submit-btn ${searchTerm.trim() ? 'is-active' : ''}`}
                  title="Tìm kiếm ngay"
                >
                  <span>Tìm</span>
                  <i className="fa-solid fa-arrow-right" style={{ fontSize: '0.65rem' }}></i>
                </button>
              </form>

              {/* Hộp Gợi Ý Tìm Kiếm Trực Tiếp (Live Search Suggestions Dropdown) */}
              {isSearchFocused && searchTerm.trim().length >= 2 && (
                <div className="header-search-dropdown">
                  <div className="header-search-dropdown-header">
                    <span>
                      <i className="fa-solid fa-bolt" style={{ color: '#facc15', marginRight: '6px' }}></i>
                      {isSearchingLive ? 'Đang tìm kiếm bài viết...' : 'Kết quả gợi ý nhanh:'}
                    </span>
                    <span className="search-hint-esc">Esc để đóng</span>
                  </div>

                  {liveResults.length > 0 ? (
                    <div className="header-search-results-list">
                      {liveResults.map((p) => (
                        <div
                          key={p._id || p.slug}
                          className="header-search-result-item"
                          onClick={() => {
                            playClickSound();
                            navigate(`/posts/${p.slug}`);
                            setIsSearchFocused(false);
                          }}
                        >
                          <div className="search-result-icon">
                            <span>{p.category?.icon || '📝'}</span>
                          </div>
                          <div className="search-result-info">
                            <strong className="search-result-title">{p.title}</strong>
                            <div className="search-result-meta">
                              <span className="search-result-cat">{p.category?.name || 'Tâm sự'}</span>
                              <span>•</span>
                              <span>{p.author || 'Tác giả'}</span>
                              {p.views > 0 && (
                                <>
                                  <span>•</span>
                                  <span>{p.views} lượt xem</span>
                                </>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}

                      {/* Nút Xem Tất Cả Kết Quả */}
                      <button
                        type="button"
                        className="header-search-view-all-btn"
                        onClick={handleSearchSubmit}
                      >
                        <i className="fa-solid fa-magnifying-glass" style={{ marginRight: '6px' }}></i>
                        Xem toàn bộ kết quả cho "{searchTerm.trim()}"
                      </button>
                    </div>
                  ) : !isSearchingLive ? (
                    <div className="header-search-empty">
                      <span>Không tìm thấy bài viết nào khớp với "{searchTerm.trim()}"</span>
                      <button
                        type="button"
                        className="header-search-try-all"
                        onClick={handleSearchSubmit}
                      >
                        Tìm kiếm trên toàn bộ hệ thống &rarr;
                      </button>
                    </div>
                  ) : null}
                </div>
              )}
            </div>

            <div className="header-daily-quote-pill" title="Slogan truyền động lực cộng đồng Freedom">
              <span className="quote-sparkle" style={{ color: 'var(--pastel-amber)' }}>
                <i className="fa-solid fa-feather-pointed"></i>
              </span>
              <span className="quote-text">Chậm lại để nghỉ ngơi, đừng dừng lại!</span>
            </div>
          </div>

          {/* User Profile / Admin / Auth actions (Cực kỳ thoáng đãng ở góc phải hàng 1) */}
          <div className="header-user-wrap">
            {(isAuthenticated || !!user) ? (
              <div className="header-user-badge">
                <Link
                  to={`/profile/${user?._id}`}
                  className="header-profile-click"
                  title={`Xem hồ sơ cá nhân: ${user?.name}`}
                >
                  <img
                    src={
                      user?.avatar && !user?.avatar.includes('google_avatar')
                        ? user?.avatar
                        : ((user?.role === 'admin' || user?.email === 'anthonyq012025@gmail.com')
                            ? '/uploads/1793903034671-886587470_122145020103357128_3735488146127846733_n.jpg'
                            : '/images/man.jpg')
                    }
                    alt={user?.name}
                    onError={(e) => {
                      e.target.src = '/uploads/1793903034671-886587470_122145020103357128_3735488146127846733_n.jpg';
                    }}
                    className="header-avatar"
                  />
                  <span className="header-username-text">
                    {user?.name?.split('(')[0]?.trim() || user?.name}
                  </span>
                  {user?.role === 'admin' && (
                    <span className="admin-badge-tag">ADMIN</span>
                  )}
                </Link>

                {/* Nút Tài khoản */}
                <button
                  type="button"
                  className="header-account-btn"
                  onClick={openProfileModal}
                  title="Cài đặt thông tin tài khoản, giao diện & nhạc nền"
                >
                  <span className="btn-icon">
                    <i className="fa-solid fa-sliders"></i>
                  </span>
                  <span>Tài khoản</span>
                </button>

                {/* Nút Quản lý Lễ Hội (Chỉ Admin) */}
                {user?.role === 'admin' && !activeFestiveEvent && (
                  <button
                    type="button"
                    className="header-festive-btn"
                    onClick={() => setIsEventManagerOpen(true)}
                    title="Quản lý sự kiện lễ hội trong năm (30/4, 2/9, 8/3, 1/6, Tết...)"
                    style={{ padding: '5px 8px', minWidth: '32px' }}
                  >
                    <span className="btn-icon">🎊</span>
                  </button>
                )}
              </div>
            ) : (
              <div className="header-guest-btns">
                <button
                  type="button"
                  className="nav-btn-login"
                  onClick={openLoginModal}
                >
                  Đăng Nhập
                </button>
                <button
                  type="button"
                  className="nav-btn-register"
                  onClick={openRegisterModal}
                >
                  Đăng Ký
                </button>
              </div>
            )}
          </div>
        </div>

        {/* ========================================================
            HÀNG 2: DEDICATED DASHBOARD NAVIGATION BAR (THANH DASHBOARD 3D RIÊNG)
            4 Dashboard chính + Trạm xả stress với hiệu ứng bóng mờ & 3D nổi khối
           ======================================================== */}
        <nav className="header-dashboard-bar" aria-label="Dashboard Navigation">
          <div className="dashboard-bar-container">
            <NavLink
              to="/"
              end
              className={({ isActive }) => `dashboard-3d-item tab-home ${isActive ? 'active' : ''}`}
              title="Dashboard: Trang Chủ Tổng Hợp"
            >
              <span className="healing-icon-pill healing-icon-sage" style={{ width: '28px', height: '28px', fontSize: '0.82rem' }}>
                <i className="fa-solid fa-house"></i>
              </span>
              <span className="item-label">Trang Chủ</span>
            </NavLink>

            <NavLink
              to="/category/ap-luc-kiet-suc-burnout"
              className={({ isActive }) => `dashboard-3d-item tab-burnout ${isActive ? 'active' : ''}`}
              title="Dashboard: Áp Lực & Kiệt Sức (Burnout)"
            >
              <span className="healing-icon-pill healing-icon-rose" style={{ width: '28px', height: '28px', fontSize: '0.82rem' }}>
                <i className="fa-solid fa-heart-pulse"></i>
              </span>
              <span className="item-label">Burnout</span>
            </NavLink>

            <NavLink
              to="/category/chuyen-nganh-bat-dau-lai-restart"
              className={({ isActive }) => `dashboard-3d-item tab-restart ${isActive ? 'active' : ''}`}
              title="Dashboard: Chuyển Ngành & Bắt Đầu Lại (Restart)"
            >
              <span className="healing-icon-pill healing-icon-sage" style={{ width: '28px', height: '28px', fontSize: '0.82rem' }}>
                <i className="fa-solid fa-seedling"></i>
              </span>
              <span className="item-label">Bắt Đầu Lại</span>
            </NavLink>

            <NavLink
              to="/category/nhung-tia-sang-dong-luc-small-wins"
              className={({ isActive }) => `dashboard-3d-item tab-wins ${isActive ? 'active' : ''}`}
              title="Dashboard: Những Tia Sáng & Động Lực (Small Wins)"
            >
              <span className="healing-icon-pill healing-icon-amber" style={{ width: '28px', height: '28px', fontSize: '0.82rem' }}>
                <i className="fa-solid fa-sun"></i>
              </span>
              <span className="item-label">Small Wins</span>
            </NavLink>

            {/* Cụm Trạm Chữa Lành Dropdown - Gom gọn 8 công cụ xả áp lực & chăm sóc tâm lý */}
            <div className="header-wellness-dropdown-wrapper" ref={wellnessDropdownRef}>
              <button
                type="button"
                className={`dashboard-3d-item tab-wellness-hub ${isWellnessDropdownOpen || isWellnessOpen || isTimeCapsuleOpen || isRadioOpen || isGratitudeJarOpen || isStickyWallOpen || isEmergencyCalmOpen || isCozyCafeOpen || isMoodPixelOpen ? 'active' : ''}`}
                onClick={() => {
                  playClickSound();
                  setIsWellnessDropdownOpen((prev) => !prev);
                }}
                title="Trạm Chữa Lành & Chăm Sóc Tâm Trí: Bấm để mở bảng 8 công cụ xả áp lực"
                aria-expanded={isWellnessDropdownOpen}
              >
                <span className="healing-icon-pill healing-icon-sage" style={{ width: '28px', height: '28px', fontSize: '0.85rem' }}>
                  🌿
                </span>
                <span className="item-label">Trạm Chữa Lành</span>
                <span className="wellness-hub-badge">8</span>
                <i
                  className={`fa-solid fa-chevron-${isWellnessDropdownOpen ? 'up' : 'down'}`}
                  style={{ fontSize: '0.68rem', opacity: 0.8, marginLeft: '2px', transition: 'transform 0.2s' }}
                ></i>
              </button>

              {/* Bảng Mega-Dropdown Danh Sách Công Cụ Chữa Lành */}
              {isWellnessDropdownOpen && (
                <div className="wellness-hub-mega-dropdown">
                  <div className="wellness-hub-header">
                    <div className="hub-title-row">
                      <span className="hub-header-icon">🌿</span>
                      <div>
                        <h4 className="hub-title">Trạm Chữa Lành & Không Gian Tâm Lý</h4>
                        <p className="hub-subtitle">Các công cụ thả lỏng tâm trí, xả áp lực deadline & nuôi dưỡng cảm xúc</p>
                      </div>
                    </div>
                  </div>

                  <div className="wellness-hub-grid">
                    {/* 1. Xả Stress & Đập Đĩa */}
                    <button
                      type="button"
                      className="wellness-hub-card card-stress"
                      onClick={() => {
                        playClickSound();
                        setIsWellnessDropdownOpen(false);
                        setIsWellnessOpen(true);
                      }}
                      title="Mở Phòng Đập Phá Ảo & Xé Giấy Deadline"
                    >
                      <div className="hub-card-icon-wrap" style={{ background: 'rgba(239, 68, 68, 0.15)', color: '#ef4444' }}>
                        <i className="fa-solid fa-spa"></i>
                      </div>
                      <div className="hub-card-text">
                        <span className="hub-card-title">Xả Áp Lực & Đập Đĩa</span>
                        <span className="hub-card-desc">Phòng đập phá ảo, máy xé giấy & nhịp thở 4-7-8</span>
                      </div>
                      <span className="hub-card-tag hot">Giải tỏa</span>
                    </button>

                    {/* 2. Cứu Trợ Định Tâm 5-4-3-2-1 */}
                    <button
                      type="button"
                      className="wellness-hub-card card-emergency"
                      onClick={() => {
                        playClickSound();
                        setIsWellnessDropdownOpen(false);
                        setIsEmergencyCalmOpen(true);
                      }}
                      title="Mở Bài Tập Định Tâm Khẩn Cấp 5-4-3-2-1"
                    >
                      <div className="hub-card-icon-wrap" style={{ background: 'rgba(220, 38, 38, 0.2)', color: '#dc2626' }}>
                        🆘
                      </div>
                      <div className="hub-card-text">
                        <span className="hub-card-title" style={{ color: '#ef4444' }}>Cứu Trợ Định Tâm (SOS)</span>
                        <span className="hub-card-desc">Bài tập nối đất 5-4-3-2-1 cắt cơn hoảng loạn tức thì</span>
                      </div>
                      <span className="hub-card-tag sos">Khẩn cấp</span>
                    </button>

                    {/* 3. Tiệm Cà Phê Mưa & Pomodoro */}
                    <button
                      type="button"
                      className="wellness-hub-card card-cafe"
                      onClick={() => {
                        playClickSound();
                        setIsWellnessDropdownOpen(false);
                        setIsCozyCafeOpen(true);
                      }}
                      title="Mở Tiệm Cà Phê Mưa & Đồng Hồ Pomodoro"
                    >
                      <div className="hub-card-icon-wrap" style={{ background: 'rgba(217, 119, 6, 0.2)', color: '#d97706' }}>
                        ☕
                      </div>
                      <div className="hub-card-text">
                        <span className="hub-card-title">Tiệm Cà Phê Mưa</span>
                        <span className="hub-card-desc">Pomodoro 25/5 & bản phối mưa rơi, lò sưởi ấm áp</span>
                      </div>
                      <span className="hub-card-tag focus">Tập trung</span>
                    </button>

                    {/* 4. Radio Đêm Muộn 24/7 */}
                    <button
                      type="button"
                      className="wellness-hub-card card-radio"
                      onClick={() => {
                        playClickSound();
                        setIsWellnessDropdownOpen(false);
                        setIsRadioOpen(true);
                      }}
                      title="Mở Trạm Radio Đêm Muộn 24/7"
                    >
                      <div className="hub-card-icon-wrap" style={{ background: 'rgba(244, 63, 94, 0.15)', color: '#f43f5e' }}>
                        <i className="fa-solid fa-radio"></i>
                      </div>
                      <div className="hub-card-text">
                        <span className="hub-card-title">Trạm Radio Đêm Muộn</span>
                        <span className="hub-card-desc">Giai điệu Lo-Fi Jazz & hòm thư thì thầm ẩn danh</span>
                      </div>
                      <span className="hub-card-tag radio">24/7</span>
                    </button>

                    {/* 5. Bảng Giấy Nhớ Yêu Thương */}
                    <button
                      type="button"
                      className="wellness-hub-card card-sticky"
                      onClick={() => {
                        playClickSound();
                        setIsWellnessDropdownOpen(false);
                        setIsStickyWallOpen(true);
                      }}
                      title="Mở Bảng Giấy Nhớ Dặn Dò Ẩn Danh"
                    >
                      <div className="hub-card-icon-wrap" style={{ background: 'rgba(234, 179, 8, 0.2)', color: '#eab308' }}>
                        💌
                      </div>
                      <div className="hub-card-text">
                        <span className="hub-card-title">Bảng Giấy Nhớ Yêu Thương</span>
                        <span className="hub-card-desc">Dán note dặn dò, trao gửi cái ôm ấm áp vô danh</span>
                      </div>
                      <span className="hub-card-tag note">Chia sẻ</span>
                    </button>

                    {/* 6. Chiếc Hộp Thời Gian */}
                    <button
                      type="button"
                      className="wellness-hub-card card-capsule"
                      onClick={() => {
                        playClickSound();
                        setIsWellnessDropdownOpen(false);
                        setIsTimeCapsuleOpen(true);
                      }}
                      title="Mở Hộp Thời Gian: Gửi thư cho tương lai"
                    >
                      <div className="hub-card-icon-wrap" style={{ background: 'rgba(245, 158, 11, 0.18)', color: '#f59e0b' }}>
                        <i className="fa-solid fa-hourglass-half"></i>
                      </div>
                      <div className="hub-card-text">
                        <span className="hub-card-title">Chiếc Hộp Thời Gian</span>
                        <span className="hub-card-desc">Viết thư cho chính mình trong tương lai & hẹn giờ mở</span>
                      </div>
                      <span className="hub-card-tag capsule">Tương lai</span>
                    </button>

                    {/* 7. Lọ Biết Ơn Cuối Ngày */}
                    <button
                      type="button"
                      className="wellness-hub-card card-gratitude"
                      onClick={() => {
                        playClickSound();
                        setIsWellnessDropdownOpen(false);
                        setIsGratitudeJarOpen(true);
                      }}
                      title="Mở Chiếc Lọ Biết Ơn Cuối Ngày"
                    >
                      <div className="hub-card-icon-wrap" style={{ background: 'rgba(234, 179, 8, 0.18)', color: '#eab308' }}>
                        <i className="fa-solid fa-star"></i>
                      </div>
                      <div className="hub-card-text">
                        <span className="hub-card-title">Chiếc Lọ Biết Ơn</span>
                        <span className="hub-card-desc">Gấp sao lưu giữ 3 điều may mắn, dễ thương hôm nay</span>
                      </div>
                      <span className="hub-card-tag star">Tích cực</span>
                    </button>

                    {/* 8. Nhật Ký Cảm Xúc 365 Ngày */}
                    <button
                      type="button"
                      className="wellness-hub-card card-pixel"
                      onClick={() => {
                        playClickSound();
                        setIsWellnessDropdownOpen(false);
                        setIsMoodPixelOpen(true);
                      }}
                      title="Mở Nhật Ký Cảm Xúc Pixel 365 Ngày"
                    >
                      <div className="hub-card-icon-wrap" style={{ background: 'rgba(99, 102, 241, 0.18)', color: '#6366f1' }}>
                        🗓️
                      </div>
                      <div className="hub-card-text">
                        <span className="hub-card-title">Nhật Ký Cảm Xúc 365 Ngày</span>
                        <span className="hub-card-desc">Tô màu từng ô pixel theo biểu đồ tâm trạng cả năm</span>
                      </div>
                      <span className="hub-card-tag mood">Pixel</span>
                    </button>
                  </div>

                  <div className="wellness-hub-footer">
                    <span>💡 <em>Mỗi ngày dành 5 phút chăm sóc sức khỏe tinh thần bạn nhé!</em></span>
                  </div>
                </div>
              )}
            </div>
          </div>
        </nav>
      </header>

      {/* Auth Modal (Login / Register Popup) */}
      <AuthModal />

      {/* Create Post Modal */}
      <CreatePostModal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        onPostCreated={handlePostCreated}
      />

      {/* Edit Profile Modal */}
      <EditProfileModal
        isOpen={isProfileModalOpen}
        onClose={closeProfileModal}
      />

      {/* Admin Moderation Modal (Kiểm duyệt bài viết nhạy cảm Chính Trị) */}
      {user?.role === 'admin' && (
        <AdminModerationModal
          isOpen={isModerationOpen}
          onClose={() => setIsModerationOpen(false)}
        />
      )}

      {/* Festive Showcase Modal (Không gian chào mừng sự kiện 30/4, 2/9, 8/3 với đồ họa bay dẻo dẻo) */}
      <FestiveShowcaseModal
        isOpen={isShowcaseModalOpen}
        onClose={() => setIsShowcaseModalOpen(false)}
        event={activeFestiveEvent}
        onOpenAdminManager={() => setIsEventManagerOpen(true)}
        user={user}
      />

      {/* Admin Festive Event Manager Modal (Quản lý các sự kiện lễ hội 30/4, 2/9, 8/3, 1/6, Tết...) */}
      {user?.role === 'admin' && (
        <FestiveEventManagerModal
          isOpen={isEventManagerOpen}
          onClose={() => setIsEventManagerOpen(false)}
          onEventUpdated={fetchFestiveEvent}
        />
      )}

      {/* Trạm Xả Stress & Máy Xé Giấy Deadline & Bài Tập Thở 4-7-8 */}
      <StressReliefModal
        isOpen={isWellnessOpen}
        onClose={() => setIsWellnessOpen(false)}
      />

      {/* Chiếc Hộp Thời Gian (Capsule of Tomorrow) */}
      <TimeCapsuleModal
        isOpen={isTimeCapsuleOpen}
        onClose={() => setIsTimeCapsuleOpen(false)}
      />

      {/* Trạm Radio Đêm Muộn Lo-Fi 24/7 (Late Night Lo-Fi Room) */}
      <LateNightRadioModal
        isOpen={isRadioOpen}
        onClose={() => setIsRadioOpen(false)}
      />

      {/* Chiếc Lọ Biết Ơn Cuối Ngày (Daily Gratitude Jar) */}
      <GratitudeJarModal
        isOpen={isGratitudeJarOpen}
        onClose={() => setIsGratitudeJarOpen(false)}
      />

      {/* Trạm Gửi Gắm Yêu Thương Ẩn Danh (The Sticky-Note Wall) */}
      <StickyNoteWallModal
        isOpen={isStickyWallOpen}
        onClose={() => setIsStickyWallOpen(false)}
      />

      {/* Nút Cứu Trợ Khẩn Cấp "Cần Bình Tĩnh Ngay" (Grounding 5-4-3-2-1) */}
      <EmergencyCalmModal
        isOpen={isEmergencyCalmOpen}
        onClose={() => setIsEmergencyCalmOpen(false)}
      />

      {/* Tiệm Cà Phê Mưa & Pomodoro Tập Trung (Cozy Cafe & Rainy Desk) */}
      <CozyWorkCafeModal
        isOpen={isCozyCafeOpen}
        onClose={() => setIsCozyCafeOpen(false)}
      />

      {/* Nhật Ký Cảm Xúc 365 Ngày (Emotional Pixel Tracker) */}
      <MoodPixelTrackerModal
        isOpen={isMoodPixelOpen}
        onClose={() => setIsMoodPixelOpen(false)}
      />
    </>
  );
};
